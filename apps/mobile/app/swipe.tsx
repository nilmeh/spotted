import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, Dimensions, Alert, TouchableOpacity, ImageBackground, Image } from 'react-native';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { fetchRecommendations, swipeEvent, getDefaultUserId } from '../src/api';
import { BottomTabs } from '../components/BottomTabs';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const SWIPE_THRESHOLD = 120;

export default function SwipeScreen() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [events, setEvents] = useState<any[]>([]);
  const userId = getDefaultUserId();
  const router = useRouter();

  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);
  // Full-screen flash overlays for pass/save feedback
  const redOpacity = useSharedValue(0);
  const greenOpacity = useSharedValue(0);

  const currentEvent = events[currentIndex];

  useEffect(() => {
    (async () => {
      try {
        const recs = await fetchRecommendations(userId, 30);
        // Map to display shape
        const mapped = recs.map((r) => ({
          id: r.id,
          title: r.title,
          location: r.community || "Nearby",
          date: r.event_time
            ? new Date(r.event_time).toLocaleDateString()
            : "TBD",
          time: r.event_time
            ? new Date(r.event_time).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })
            : "",
          description: r.description || "",
          image: require("../assets/splash-icon.jpeg"), // placeholder
        }));
        setEvents(mapped);
      } catch (e: any) {
        Alert.alert('Failed to load', e?.message || 'Could not load recommendations');
      }
    })();
  }, []);

  const advance = async () => {
    if (currentIndex < events.length - 1) {
      setCurrentIndex(currentIndex + 1);
      // Reset animation values
      translateX.value = 0;
      translateY.value = 0;
      scale.value = 1;
      opacity.value = 1;
    }
  };

  const handleSwipeAPI = async (direction: 'left' | 'right') => {
    if (direction === 'right') {
      try {
        await swipeEvent({ userId, eventId: currentEvent.id, action: 'save' });
      } catch {}
    } else {
      try {
        await swipeEvent({ userId, eventId: currentEvent.id, action: 'pass' });
      } catch {}
    }
  };

  const startFlashAndAdvance = (direction: 'left' | 'right') => {
    handleSwipeAPI(direction); // fire API call

    if (direction === 'right') {
      // green flash for save
      greenOpacity.value = withTiming(0.9, { duration: 50 }, () => {
        greenOpacity.value = withTiming(0, { duration: 120 }, () => {
          runOnJS(advance)();
        });
      });
    } else {
      // red flash for pass
      redOpacity.value = withTiming(0.9, { duration: 50 }, () => {
        redOpacity.value = withTiming(0, { duration: 120 }, () => {
          runOnJS(advance)();
        });
      });
    }
  };

  const panGesture = Gesture.Pan()
    .onUpdate((e) => {
      translateX.value = e.translationX;
      translateY.value = e.translationY;
      
      // Scale down slightly when dragging
      const distance = Math.sqrt(e.translationX ** 2 + e.translationY ** 2);
      scale.value = 1 - distance / 1000;
    })
    .onEnd((e) => {
      const absX = Math.abs(e.translationX);
      const absY = Math.abs(e.translationY);

      // Swipe right (accept)
      if (e.translationX > SWIPE_THRESHOLD && absX > absY) {
        translateX.value = withSpring(SCREEN_WIDTH * 1.5, {}, () => {
          runOnJS(startFlashAndAdvance)('right');
        });
      }
      // Swipe left (reject)
      else if (e.translationX < -SWIPE_THRESHOLD && absX > absY) {
        translateX.value = withSpring(-SCREEN_WIDTH * 1.5, {}, () => {
          runOnJS(startFlashAndAdvance)('left');
        });
      }
      // Swipe up (details)
      else if (e.translationY < -SWIPE_THRESHOLD && absY > absX) {
        Alert.alert('Event Details', currentEvent.description);
        translateX.value = withSpring(0);
        translateY.value = withSpring(0);
        scale.value = withSpring(1);
      }
      // Reset if not enough swipe
      else {
        translateX.value = withSpring(0);
        translateY.value = withSpring(0);
        scale.value = withSpring(1);
      }
    });

  // Long press to RSVP (hold)
  const longPress = Gesture.LongPress()
    .minDuration(400)
    .onEnd(() => {
      runOnJS(async () => {
        try {
          await swipeEvent({ userId, eventId: currentEvent.id, action: 'rsvp' });
          Alert.alert("RSVP’d", `You’re going: ${currentEvent.title}`);
        } catch {};
      })();
    });

  const animatedCardStyle = useAnimatedStyle(() => {
    const rotation = (translateX.value / SCREEN_WIDTH) * 20;
    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { scale: scale.value },
        { rotateZ: `${rotation}deg` },
      ],
      opacity: opacity.value,
    };
  });

  const leftOverlayStyle = useAnimatedStyle(() => {
    const opacity = translateX.value < -50 ? Math.min(Math.abs(translateX.value) / 100, 1) : 0;
    return { opacity };
  });

  const rightOverlayStyle = useAnimatedStyle(() => {
    const opacity = translateX.value > 50 ? Math.min(translateX.value / 100, 1) : 0;
    return { opacity };
  });

  const redOverlayStyle = useAnimatedStyle(() => ({
    opacity: redOpacity.value,
  }));

  const greenOverlayStyle = useAnimatedStyle(() => ({
    opacity: greenOpacity.value,
  }));

  if (!currentEvent) {
    return (
      <View style={styles.container}>
        <View style={styles.topBar}>
          <TouchableOpacity style={styles.mapButton} onPress={() => router.push('/map')}>
            <Text style={styles.mapButtonText}>Map</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.emptyText}>No more events!</Text>
        <Text style={styles.emptySubtext}>Check back later for more events.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.imgContainer}>
          <Image source={require('../assets/Spotted.png')} style={styles.appTitle} />
        </View>
      </View>

      {/* Card Container */}
      <GestureDetector gesture={Gesture.Simultaneous(panGesture, longPress)}>
        <Animated.View style={[styles.cardContainer, animatedCardStyle]}>
          {/* Background Image */}
          <ImageBackground
            source={currentEvent.image}
            style={styles.cardBackground}
            imageStyle={styles.backgroundImage}
          >
            {/* Dark Overlay */}
            <View style={styles.darkOverlay} />

            {/* Left overlay (Pass) */}
            <Animated.View style={[styles.swipeOverlay, styles.passOverlay, leftOverlayStyle]}>
              <Text style={styles.swipeText}>✕</Text>
            </Animated.View>

            {/* Right overlay (Save) */}
            <Animated.View style={[styles.swipeOverlay, styles.saveOverlay, rightOverlayStyle]}>
              <Text style={styles.swipeText}>✓</Text>
            </Animated.View>

            {/* Content Container */}
            <View style={styles.contentContainer}>
              {/* Top badges */}
              <View style={styles.badgesContainer}>
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{currentEvent.date}</Text>
                </View>
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{currentEvent.time}</Text>
                </View>
              </View>

              {/* Spacer */}
              <View style={{ flex: 1 }} />

              {/* Bottom content */}
              <View style={styles.bottomContent}>
                <Text style={styles.eventTitle}>{currentEvent.title}</Text>
                <Text style={styles.eventLocation}>📍 {currentEvent.location}</Text>
                <Text style={styles.eventDescription} numberOfLines={3}>
                  {currentEvent.description}
                </Text>
              </View>
            </View>
          </ImageBackground>

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.actionButton, styles.passButton]}
              onPress={() => {
                  // animate card offscreen then flash red and advance
                  translateX.value = withSpring(-SCREEN_WIDTH * 1.5, {}, () => {
                    runOnJS(startFlashAndAdvance)('left');
                  });
                }}
            >
              <Text style={styles.passButtonText}>✕</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, styles.detailsButton]}
              onPress={() => {
                // animate card upward offscreen
                translateY.value = withSpring(-SCREEN_HEIGHT * 1.5, {}, () => {
                  runOnJS(advance)();
                });
              }}
            >
              <Text style={styles.detailsButtonText}>○</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, styles.saveButton]}
              onPress={() => {
                // animate card offscreen then flash green and advance
                translateX.value = withSpring(SCREEN_WIDTH * 1.5, {}, () => {
                  runOnJS(startFlashAndAdvance)('right');
                });
              }}
            >
              <Text style={styles.saveButtonText}>✓</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </GestureDetector>

      {/* Full-screen flash overlays (pointerEvents none so touches pass through) - rendered last so they appear on top */}
      <Animated.View pointerEvents="none" style={[styles.fullOverlay, styles.redFull, redOverlayStyle]} />
      <Animated.View pointerEvents="none" style={[styles.fullOverlay, styles.greenFull, greenOverlayStyle]} />

      {/* Bottom tabs (global nav) */}
      <BottomTabs />
    </View>
  );
}

const styles = StyleSheet.create({
  imgContainer: {
    top: 25,
    left: 0,
  },
  topBar: {
    position: 'absolute',
    top: 40,
    right: 20,
    zIndex: 20,
  },
  mapButton: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 18,
    backgroundColor: '#000000aa',
  },
  mapButtonText: {
    color: '#ffffff',
    fontSize: 13,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  container: {
    flex: 1,
    backgroundColor: '#fcfcfcff',
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  header: {
    justifyContent: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 32,
    marginTop: 10,
  },
  appTitle: {
    width: 150,
    height: 50,
  },
  cardContainer: {
    width: '100%',
    height: SCREEN_HEIGHT - 230,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  cardBackground: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  backgroundImage: {
    resizeMode: 'cover',
  },
  darkOverlay: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  contentContainer: {
    flex: 1,
    padding: 20,
    justifyContent: 'space-between',
  },
  badgesContainer: {
    flexDirection: 'row',
    gap: 10,
  },
  badge: {
    backgroundColor: '#000000dd',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  badgeText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  swipeOverlay: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    top: '30%',
  },
  passOverlay: {
    left: 20,
    borderColor: '#FF3B30',
    backgroundColor: 'rgba(255, 59, 48, 0.15)',
  },
  saveOverlay: {
    right: 20,
    borderColor: '#34C759',
    backgroundColor: 'rgba(52, 199, 89, 0.15)',
  },
  swipeText: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#000',
  },
  bottomContent: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 16,
    padding: 16,
  },
  eventTitle: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 8,
  },
  eventLocation: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  eventDescription: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 20,
    backgroundColor: '#f9f9f9',
  },
  actionButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  passButton: {
    backgroundColor: '#D05552',
  },
  detailsButton: {
    backgroundColor: '#000',
  },
  saveButton: {
    backgroundColor: '#7AAD77',
  },
  passButtonText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
  },
  detailsButtonText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
  },
  saveButtonText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
  },
  fullOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
    elevation: 1000,
  },
  redFull: {
    backgroundColor: 'rgba(255,59,48,0.9)'
  },
  greenFull: {
    backgroundColor: 'rgba(52,199,89,0.9)'
  },
  emptyText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#666',
    marginBottom: 10,
  },
  emptySubtext: {
    fontSize: 16,
    color: '#999',
  },
});
