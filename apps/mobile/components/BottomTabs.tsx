import React from 'react';
import { View, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';

export function BottomTabs() {
  const router = useRouter();
  const pathname = usePathname();

  const tabs = [
    { key: 'swipe', icon: 'flame', route: '/swipe' },
    { key: 'map', icon: 'map', route: '/map' },
    { key: 'profile', icon: 'person', route: '/profile' },
  ];

  return (
    <View pointerEvents="box-none" style={styles.wrapper}>
      <BlurView intensity={95} tint="dark" style={styles.container}>
        {tabs.map((tab) => {
          const isActive = pathname === tab.route;
          return (
            <TouchableOpacity
              key={tab.key}
              style={styles.tab}
              onPress={() => {
                if (!isActive) router.push(tab.route as any);
              }}
              activeOpacity={0.7}
            >
              <Ionicons
                name={tab.icon as any}
                size={24}
                color={isActive ? '#ffffff' : 'rgba(255,255,255,0.45)'}
              />
            </TouchableOpacity>
          );
        })}
      </BlurView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingBottom: Platform.OS === 'ios' ? 34 : 16,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  container: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 24,
    paddingHorizontal: 4,
    paddingVertical: 4,
    overflow: 'hidden',
    width: '100%',
    maxWidth: 360,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 20,
  },
  label: {
    fontSize: 15,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.5)',
    letterSpacing: 0.3,
  },
  labelActive: {
    color: '#ffffff',
    fontWeight: '600',
  },
});


