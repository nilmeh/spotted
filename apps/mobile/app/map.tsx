import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Dimensions, ActivityIndicator, Text } from 'react-native';
import MapView, { Heatmap, Marker, PROVIDER_GOOGLE, Region, Callout } from 'react-native-maps';
import Constants from 'expo-constants';
import { LinearGradient } from 'expo-linear-gradient';

type MapEventPoint = {
  id: number;
  title: string;
  lat: number;
  lng: number;
  weight: number;
};

const { width, height } = Dimensions.get('window');

const LATITUDE_DELTA = 0.02;
const LONGITUDE_DELTA = LATITUDE_DELTA * (width / height);

const cfg = Constants.expoConfig?.extra as any;
const API_BASE_URL: string = (cfg?.apiBaseUrl as string) || 'http://localhost:8000';

export default function MapScreen() {
  const [region, setRegion] = useState<Region>({
    latitude: 34.0689,
    longitude: -118.4452,
    latitudeDelta: LATITUDE_DELTA,
    longitudeDelta: LONGITUDE_DELTA,
  });
  const [points, setPoints] = useState<MapEventPoint[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPoints = async (r: Region) => {
    try {
      const url = `${API_BASE_URL}/map/events?lat=${encodeURIComponent(
        r.latitude,
      )}&lng=${encodeURIComponent(r.longitude)}&radius_km=5`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('map events failed');
      const data: MapEventPoint[] = await res.json();
      setPoints(data);
    } catch {
      // keep old points on failure
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPoints(region);
  }, []);

  const onRegionChangeComplete = (r: Region) => {
    setRegion(r);
    fetchPoints(r);
  };

  const heatPoints =
    points?.map((p) => ({
      latitude: p.lat,
      longitude: p.lng,
      weight: p.weight,
    })) ?? [];

  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        initialRegion={region}
        onRegionChangeComplete={onRegionChangeComplete}
        customMapStyle={darkMapStyle}
      >
        {heatPoints.length > 0 && (
          <Heatmap
            points={heatPoints}
            radius={55}
            opacity={0.85}
            gradient={{
              colors: ['#182848', '#2254b3', '#4fd1c5', '#f5d76e', '#ff4b5c'],
              startPoints: [0.02, 0.25, 0.5, 0.75, 1],
              colorMapSize: 256,
            }}
          />
        )}
        {points.map((p) => (
          <Marker
            key={p.id}
            coordinate={{ latitude: p.lat, longitude: p.lng }}
          >
            <Callout tooltip>
              <View style={styles.calloutShadow}>
                <LinearGradient
                  colors={['rgba(12,12,18,0.95)', 'rgba(28,28,40,0.96)']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.calloutContainer}
                >
                  <View style={styles.calloutPillRow}>
                    <View style={styles.calloutDot} />
                    <Text style={styles.calloutPillText}>
                      {p.weight > 4 ? 'hot tonight' : p.weight > 2 ? 'getting warm' : 'low-key spot'}
                    </Text>
                  </View>
                  <Text style={styles.calloutTitle} numberOfLines={2}>
                    {p.title}
                  </Text>
                  <Text style={styles.calloutMeta}>
                    tap card to swipe & details
                  </Text>
                </LinearGradient>
              </View>
            </Callout>
          </Marker>
        ))}
      </MapView>
      <View style={styles.legend}>
        <View style={styles.legendRow}>
          <View style={[styles.legendDot, { backgroundColor: '#2a8bdc' }]} />
          <Text style={styles.legendText}>active</Text>
        </View>
        <View style={styles.legendRow}>
          <View style={[styles.legendDot, { backgroundColor: '#e74c3c' }]} />
          <Text style={styles.legendText}>hotspot</Text>
        </View>
      </View>
      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator color="#fff" />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  calloutShadow: {
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.45,
    shadowRadius: 20,
    elevation: 10,
  },
  calloutContainer: {
    minWidth: 220,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  calloutPillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  calloutDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4fd1c5',
    marginRight: 6,
  },
  calloutPillText: {
    fontSize: 11,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.6)',
  },
  calloutTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#fdfdfd',
    marginBottom: 4,
  },
  calloutMeta: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.55)',
  },
  legend: {
    position: 'absolute',
    bottom: 24,
    left: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 2,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 6,
  },
  legendText: {
    color: '#f5f5f5',
    fontSize: 12,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

// Simple dark style (placeholder)
const darkMapStyle = [
  { elementType: 'geometry', stylers: [{ color: '#1b1b1f' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#b0b0b8' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#1b1b1f' }] },
  {
    featureType: 'road',
    elementType: 'geometry',
    stylers: [{ color: '#27272f' }],
  },
  {
    featureType: 'water',
    elementType: 'geometry',
    stylers: [{ color: '#111118' }],
  },
];


