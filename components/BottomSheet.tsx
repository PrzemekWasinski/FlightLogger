import React, { useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, PanResponder, StyleSheet, Text, View } from 'react-native';
import { getAllFlights, Flight } from '../data/db';

const { height: SCREEN_H } = Dimensions.get('window');

const HANDLE_H    = 40;
const PEEK_H      = 235; //visible height at bottom snap
const SNAP_TOP    = 0;
const SNAP_BOTTOM = SCREEN_H - PEEK_H;
const SNAPS       = [SNAP_TOP, SNAP_BOTTOM];

function nearestSnap(y: number): number {
  return SNAPS.reduce((best, s) => (Math.abs(s - y) < Math.abs(best - y) ? s : best));
}

function resolveSnap(y: number, vy: number): number {
  if (vy < -0.3) {
    const above = SNAPS.filter(s => s < y);
    return above.length ? above[above.length - 1] : SNAP_TOP;
  }
  if (vy > 0.3) {
    const below = SNAPS.find(s => s > y);
    return below !== undefined ? below : SNAP_BOTTOM;
  }
  return nearestSnap(y);
}

function topByCount(flights: Flight[], getValue: (f: Flight) => string | undefined): string {
  const counts = new Map<string, number>();
  for (const f of flights) {
    const v = getValue(f);
    if (v) counts.set(v, (counts.get(v) ?? 0) + 1);
  }
  let best = '—';
  let bestCount = 0;
  counts.forEach((c, k) => { if (c > bestCount) { bestCount = c; best = k; } });
  return best;
}

function topAirport(flights: Flight[]): string {
  const counts = new Map<string, number>();
  for (const f of flights) {
    counts.set(f.from, (counts.get(f.from) ?? 0) + 1);
    counts.set(f.to,   (counts.get(f.to)   ?? 0) + 1);
  }
  let best = '—';
  let bestCount = 0;
  counts.forEach((c, k) => { if (c > bestCount) { bestCount = c; best = k; } });
  return best;
}

function computeStats() {
  const flights = getAllFlights();
  return {
    aircraft: topByCount(flights, f => f.aircraft),
    airport:  topAirport(flights),
    airline:  topByCount(flights, f => f.airline),
  };
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <View style={card.container}>
      <Text style={card.label}>{label}</Text>
      <View style={card.imagePlaceholder} />
      <Text style={card.value} numberOfLines={2}>{value}</Text>
    </View>
  );
}

interface BottomSheetProps {
  hidden?: boolean;
}

export function BottomSheet({ hidden = false }: BottomSheetProps) {
  const translateY = useRef(new Animated.Value(SNAP_BOTTOM)).current;
  const liveY      = useRef(SNAP_BOTTOM);
  const startY     = useRef(SNAP_BOTTOM);
  const [stats, setStats] = useState(computeStats);

  useEffect(() => {
    const id = translateY.addListener(({ value }) => { liveY.current = value; });
    return () => translateY.removeListener(id);
  }, []);

  useEffect(() => {
    Animated.spring(translateY, {
      toValue: hidden ? SCREEN_H : SNAP_BOTTOM,
      useNativeDriver: false,
      damping: 22,
      stiffness: 350,
      mass: 0.7,
    }).start();
    //refresh stats whenever the sheet comes back into view
    if (!hidden) setStats(computeStats());
  }, [hidden]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, { dy }) => Math.abs(dy) > 3,

      onPanResponderGrant: () => {
        translateY.stopAnimation();
        startY.current = liveY.current;
      },

      onPanResponderMove: (_, { dy }) => {
        translateY.setValue(
          Math.max(SNAP_TOP, Math.min(SNAP_BOTTOM, startY.current + dy)),
        );
      },

      onPanResponderRelease: (_, { dy, vy }) => {
        const pos    = Math.max(SNAP_TOP, Math.min(SNAP_BOTTOM, startY.current + dy));
        const target = resolveSnap(pos, vy);
        Animated.spring(translateY, {
          toValue: target,
          useNativeDriver: false,
          damping: 22,
          stiffness: 350,
          mass: 0.7,
        }).start();
      },
    }),
  ).current;

  return (
    <Animated.View
      style={[styles.sheet, { transform: [{ translateY }] }]}
      {...panResponder.panHandlers}
    >
      <View style={styles.handleBar}>
        <View style={styles.pill} />
      </View>

      <View style={styles.statsRow}>
        <StatCard label="Top Aircraft" value={stats.aircraft} />
        <StatCard label="Top Airport"  value={stats.airport} />
        <StatCard label="Top Airline"  value={stats.airline} />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    //extra height ensures no transparent gap when sheet is fully open
    height: SCREEN_H + 200,
    backgroundColor: '#111827',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.55,
    shadowRadius: 14,
    elevation: 18,
  },
  handleBar: {
    width: '100%',
    height: HANDLE_H,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pill: {
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#4b5563',
  },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    gap: 8,
  },
});

const card = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a2535',
    borderRadius: 12,
    padding: 10,
    alignItems: 'center',
    gap: 8,
  },
  label: {
    width: '100%',
    color: '#f3f4f6',
    fontSize: 11,
    textAlign: 'center',
  },
  imagePlaceholder: {
    width: '100%',
    height: 135,
    backgroundColor: '#243147',
    borderRadius: 6,
  },
  value: {
    color: '#f3f4f6',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
});
