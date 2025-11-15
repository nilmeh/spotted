import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Dimensions, ActivityIndicator, Text } from 'react-native';
import MapView, { Heatmap, Marker, PROVIDER_GOOGLE, Region } from 'react-native-maps';
import Constants from 'expo-constants';

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
            radius={40}
            opacity={0.7}
            gradient={{
              colors: ['#1a2a6c', '#2a8bdc', '#f5d76e', '#f39c12', '#e74c3c'],
              startPoints: [0.01, 0.25, 0.5, 0.75, 1],
              colorMapSize: 256,
            }}
          />
        )}
        {points.map((p) => (
          <Marker
            key={p.id}
            coordinate={{ latitude: p.lat, longitude: p.lng }}
            title={p.title}
          />
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


