import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, Dimensions, Alert, TouchableOpacity } from 'react-native';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { fetchRecommendations, swipeEvent, getDefaultUserId } from '../src/api';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
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

  const currentEvent = events[currentIndex];

  useEffect(() => {
    (async () => {
      try {
        const recs = await fetchRecommendations(userId, 30);
        // Map to display shape
        const mapped = recs.map((r) => ({
          id: r.id,
          title: r.title,
          location: r.community || 'Nearby',
          date: r.event_time ? new Date(r.event_time).toLocaleString() : 'Anytime',
          description: r.description || '',
        }));
        setEvents(mapped);
      } catch (e: any) {
        Alert.alert('Failed to load', e?.message || 'Could not load recommendations');
      }
    })();
  }, []);

  const handleSwipe = async (direction: 'left' | 'right') => {
    if (direction === 'right') {
      // Accept/Save event
      try {
        await swipeEvent({ userId, eventId: currentEvent.id, action: 'save' });
      } catch {}
    } else {
      // Reject/Pass event
      try {
        await swipeEvent({ userId, eventId: currentEvent.id, action: 'pass' });
      } catch {}
    }

    // Move to next event
    if (currentIndex < events.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      Alert.alert('All Done!', 'You\'ve seen all events. Check back later for more!');
    }

    // Reset animation values
    translateX.value = 0;
    translateY.value = 0;
    scale.value = 1;
    opacity.value = 1;
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
          runOnJS(handleSwipe)('right');
        });
      }
      // Swipe left (reject)
      else if (e.translationX < -SWIPE_THRESHOLD && absX > absY) {
        translateX.value = withSpring(-SCREEN_WIDTH * 1.5, {}, () => {
          runOnJS(handleSwipe)('left');
        });
      }
      // Swipe up (details) - just reset for now
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
          Alert.alert('RSVP’d', `You’re going: ${currentEvent.title}`);
        } catch {}
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
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.mapButton} onPress={() => router.push('/map')}>
          <Text style={styles.mapButtonText}>Map</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.cardContainer}>
        {/* Left overlay (Reject) */}
        <Animated.View style={[styles.overlay, styles.leftOverlay, leftOverlayStyle]}>
          <Text style={styles.overlayText}>PASS</Text>
        </Animated.View>

        {/* Right overlay (Accept) */}
        <Animated.View style={[styles.overlay, styles.rightOverlay, rightOverlayStyle]}>
          <Text style={styles.overlayText}>SAVE</Text>
        </Animated.View>

        {/* Event Card */}
        <GestureDetector gesture={Gesture.Simultaneous(panGesture, longPress)}>
          <Animated.View style={[styles.card, animatedCardStyle]}>
            <View style={styles.cardContent}>
              <Text style={styles.eventTitle}>{currentEvent.title}</Text>
              <Text style={styles.eventLocation}>📍 {currentEvent.location}</Text>
              <Text style={styles.eventDate}>📅 {currentEvent.date}</Text>
              <Text style={styles.eventDescription}>{currentEvent.description}</Text>
            </View>
          </Animated.View>
        </GestureDetector>
      </View>

      {/* Instructions */}
      <View style={styles.instructions}>
        <Text style={styles.instructionText}>← Swipe left to pass</Text>
        <Text style={styles.instructionText}>→ Swipe right to save</Text>
        <Text style={styles.instructionText}>↑ Swipe up for details</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
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
  cardContainer: {
    width: SCREEN_WIDTH - 40,
    height: 500,
    alignItems: 'center',
    justifyContent: 'center',
  },
  overlay: {
    position: 'absolute',
    top: 50,
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    zIndex: 10,
  },
  leftOverlay: {
    left: 20,
    borderColor: '#FF3B30',
    backgroundColor: 'rgba(255, 59, 48, 0.1)',
  },
  rightOverlay: {
    right: 20,
    borderColor: '#34C759',
    backgroundColor: 'rgba(52, 199, 89, 0.1)',
  },
  overlayText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
  },
  card: {
    width: '100%',
    height: '100%',
    backgroundColor: '#fff',
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  cardContent: {
    flex: 1,
    padding: 30,
    justifyContent: 'center',
  },
  eventTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#000',
  },
  eventLocation: {
    fontSize: 18,
    color: '#666',
    marginBottom: 10,
  },
  eventDate: {
    fontSize: 18,
    color: '#666',
    marginBottom: 20,
  },
  eventDescription: {
    fontSize: 16,
    color: '#333',
    lineHeight: 24,
  },
  instructions: {
    marginTop: 40,
    alignItems: 'center',
  },
  instructionText: {
    fontSize: 14,
    color: '#999',
    marginVertical: 4,
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

