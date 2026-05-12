import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  PanResponder,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { AIRPORTS } from '../data/airports';
import { getAllFlights, Flight } from '../data/db';

const { height: SCREEN_H } = Dimensions.get('window');

const PEEK_H      = 305;
const SNAP_TOP    = 0;
const SNAP_BOTTOM = SCREEN_H - PEEK_H;
const SNAPS       = [SNAP_TOP, SNAP_BOTTOM];

// ─── snap helpers ──────────────────────────────────────────────────────────────

function nearestSnap(y: number): number {
  return SNAPS.reduce((best, s) => (Math.abs(s - y) < Math.abs(best - y) ? s : best));
}

function resolveSnap(y: number, vy: number): number {
  if (vy < -0.3) { const above = SNAPS.filter(s => s < y); return above.length ? above[above.length - 1] : SNAP_TOP; }
  if (vy >  0.3) { const below = SNAPS.find(s => s > y);   return below !== undefined ? below : SNAP_BOTTOM; }
  return nearestSnap(y);
}

// ─── stats computation ─────────────────────────────────────────────────────────

function topN(map: Map<string, number>, n: number): { label: string; value: number }[] {
  return Array.from(map.entries()).sort((a, b) => b[1] - a[1]).slice(0, n).map(([label, value]) => ({ label, value }));
}

function computeStats() {
  const flights = getAllFlights();

  let totalKm = 0;
  let longestFlight: Flight | null = null;

  const countrySet    = new Set<string>();
  const continentSet  = new Set<string>();
  const aircraftSet   = new Set<string>();
  const airlineSet    = new Set<string>();
  const airportSet    = new Set<string>();

  const airportCount      = new Map<string, number>();
  const airlineCount      = new Map<string, number>();
  const aircraftCount     = new Map<string, number>();
  const routeCount        = new Map<string, number>();
  const manufacturerCount = new Map<string, number>();
  const yearCount         = new Map<string, number>();
  const monthCount        = new Map<string, number>();
  const weekdayCount      = new Map<number, number>();

  for (const f of flights) {
    totalKm += f.distance_km ?? 0;
    if (!longestFlight || (f.distance_km ?? 0) > (longestFlight.distance_km ?? 0)) longestFlight = f;

    const fromAp = AIRPORTS[f.from];
    const toAp   = AIRPORTS[f.to];

    airportSet.add(f.from);
    airportSet.add(f.to);
    airportCount.set(f.from, (airportCount.get(f.from) ?? 0) + 1);
    airportCount.set(f.to,   (airportCount.get(f.to)   ?? 0) + 1);

    if (fromAp?.country)   countrySet.add(fromAp.country);
    if (toAp?.country)     countrySet.add(toAp.country);
    if (fromAp?.continent) continentSet.add(fromAp.continent);
    if (toAp?.continent)   continentSet.add(toAp.continent);

    if (f.airline) {
      airlineSet.add(f.airline);
      airlineCount.set(f.airline, (airlineCount.get(f.airline) ?? 0) + 1);
    }

    if (f.aircraft) {
      aircraftSet.add(f.aircraft);
      aircraftCount.set(f.aircraft, (aircraftCount.get(f.aircraft) ?? 0) + 1);
      const mfr = f.aircraft.trim().split(/\s+/)[0];
      if (mfr) manufacturerCount.set(mfr, (manufacturerCount.get(mfr) ?? 0) + 1);
    }

    const routeKey = `${f.from}–${f.to}`;
    routeCount.set(routeKey, (routeCount.get(routeKey) ?? 0) + 1);

    if (f.date) {
      const d = new Date(f.date);
      if (!isNaN(d.getTime())) {
        const yr = String(d.getFullYear());
        const mk = `${yr}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        yearCount.set(yr, (yearCount.get(yr) ?? 0) + 1);
        monthCount.set(mk, (monthCount.get(mk) ?? 0) + 1);
        weekdayCount.set(d.getDay(), (weekdayCount.get(d.getDay()) ?? 0) + 1);
      }
    }
  }

  const now     = new Date();
  const curYear = now.getFullYear();

  const flightsPerYear = Array.from({ length: 5 }, (_, i) => {
    const y = String(curYear - 4 + i);
    return { label: y, value: yearCount.get(y) ?? 0 };
  });

  const flightsPerMonth: { label: string; value: number }[] = [];
  for (let i = 11; i >= 0; i--) {
    const d   = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    flightsPerMonth.push({ label: d.toLocaleDateString('en', { month: 'short' }), value: monthCount.get(key) ?? 0 });
  }

  const flightsPerWeekday = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((label, i) => ({
    label,
    value: weekdayCount.get(i) ?? 0,
  }));

  const topRouteEntry = topN(routeCount, 1)[0];
  const topManufEntry = topN(manufacturerCount, 1)[0];
  const longestKm     = longestFlight?.distance_km ? Math.round(longestFlight.distance_km).toLocaleString() : null;

  const kmTotal = Math.round(totalKm);
  const kmStr   = kmTotal >= 1000 ? (kmTotal / 1000).toFixed(1) + 'k' : String(kmTotal);

  return {
    flightCount:     flights.length,
    kmStr,
    countries:       countrySet.size,
    continents:      continentSet.size,
    uniqueAircraft:  aircraftSet.size,
    uniqueAirlines:  airlineSet.size,
    uniqueAirports:  airportSet.size,
    uniqueRoutes:    routeCount.size,

    topAircraft:     topN(aircraftCount, 1)[0]?.label ?? '—',
    topAirport:      topN(airportCount,  1)[0]?.label ?? '—',
    topAirline:      topN(airlineCount,  1)[0]?.label ?? '—',
    topRoute:        topRouteEntry ? `${topRouteEntry.label}\n×${topRouteEntry.value}` : '—',
    topManufacturer: topManufEntry?.label ?? '—',
    longestFlight:   longestFlight
      ? `${longestFlight.from} → ${longestFlight.to}${longestKm ? '\n' + longestKm + ' km' : ''}`
      : '—',

    topAirports:     topN(airportCount,  5),
    topAirlines:     topN(airlineCount,  5),
    topAircraftList:      topN(aircraftCount,      5),
    topManufacturerList:  topN(manufacturerCount,  5),

    flightsPerYear,
    flightsPerMonth,
    flightsPerWeekday,
  };
}

// ─── sub-components ────────────────────────────────────────────────────────────

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <View style={card.container}>
      <Text style={card.label}>{label}</Text>
      <View style={card.placeholder} />
      <Text style={card.value} numberOfLines={2}>{value}</Text>
    </View>
  );
}

function CounterCard({ label, value }: { label: string; value: number }) {
  return (
    <View style={counter.card}>
      <Text style={counter.num}>{value}</Text>
      <Text style={counter.label}>{label}</Text>
    </View>
  );
}

function SectionHeader({ title }: { title: string }) {
  return <Text style={sec.title}>{title}</Text>;
}

function HBarChart({ data, color }: { data: { label: string; value: number }[]; color: string }) {
  if (!data.length) return <Text style={chart.empty}>no data</Text>;
  const max = Math.max(...data.map(d => d.value), 1);
  return (
    <View>
      {data.map(({ label, value }) => (
        <View key={label} style={chart.hRow}>
          <Text style={chart.hLabel} numberOfLines={1}>{label}</Text>
          <View style={chart.hTrack}>
            <View style={[chart.hBar, { width: `${(value / max) * 100}%` as any, backgroundColor: color }]} />
          </View>
          <Text style={chart.hCount}>{value}</Text>
        </View>
      ))}
    </View>
  );
}

function VBarChart({ data, color }: { data: { label: string; value: number }[]; color: string }) {
  const max = Math.max(...data.map(d => d.value), 1);
  return (
    <View style={chart.vContainer}>
      {data.map(({ label, value }) => (
        <View key={label} style={chart.vCol}>
          <Text style={chart.vCount}>{value > 0 ? value : ''}</Text>
          <View style={chart.vBarBg}>
            <View style={[
              chart.vBar,
              { height: `${Math.max(2, (value / max) * 100)}%` as any, backgroundColor: value > 0 ? color : 'transparent' },
            ]} />
          </View>
          <Text style={chart.vLabel} numberOfLines={1}>{label}</Text>
        </View>
      ))}
    </View>
  );
}

// ─── main component ────────────────────────────────────────────────────────────

interface BottomSheetProps { hidden?: boolean; }

export function BottomSheet({ hidden = false }: BottomSheetProps) {
  const translateY = useRef(new Animated.Value(SNAP_BOTTOM)).current;
  const liveY      = useRef(SNAP_BOTTOM);
  const startY     = useRef(SNAP_BOTTOM);
  const [stats, setStats] = useState(computeStats);

  //handle grows taller when expanded so the pill lands below android's notification zone
  const handleH   = translateY.interpolate({ inputRange: [SNAP_TOP, SNAP_BOTTOM], outputRange: [80, 40], extrapolate: 'clamp' });
  const pillPadTop = translateY.interpolate({ inputRange: [SNAP_TOP, SNAP_BOTTOM], outputRange: [36, 17], extrapolate: 'clamp' });

  function snapTo(target: number) {
    Animated.spring(translateY, { toValue: target, useNativeDriver: false, damping: 22, stiffness: 350, mass: 0.7 }).start();
  }

  useEffect(() => {
    const id = translateY.addListener(({ value }) => { liveY.current = value; });
    return () => translateY.removeListener(id);
  }, []);

  useEffect(() => {
    Animated.spring(translateY, {
      toValue: hidden ? SCREEN_H : SNAP_BOTTOM,
      useNativeDriver: false,
      damping: 22, stiffness: 350, mass: 0.7,
    }).start();
    //refresh stats whenever the sheet comes back into view
    if (!hidden) setStats(computeStats());
  }, [hidden]);

  //pan responder lives only on the handle bar so the scrollview scrolls freely
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, { dy }) => Math.abs(dy) > 3,
      onPanResponderGrant: () => { translateY.stopAnimation(); startY.current = liveY.current; },
      onPanResponderMove: (_, { dy }) => {
        translateY.setValue(Math.max(SNAP_TOP, Math.min(SNAP_BOTTOM, startY.current + dy)));
      },
      onPanResponderRelease: (_, { dy, vy }) => {
        const pos    = Math.max(SNAP_TOP, Math.min(SNAP_BOTTOM, startY.current + dy));
        const target = resolveSnap(pos, vy);
        Animated.spring(translateY, {
          toValue: target, useNativeDriver: false,
          damping: 22, stiffness: 350, mass: 0.7,
        }).start();
      },
    }),
  ).current;

  return (
    <Animated.View style={[styles.sheet, { transform: [{ translateY }] }]}>
      {/*handle — grows taller when expanded so pill stays below android notification zone*/}
      <Animated.View style={[styles.handleBar, { height: handleH }]} {...panResponder.panHandlers}>
        <Animated.View style={{ paddingTop: pillPadTop, alignItems: 'center' }}>
          <View style={styles.pill} />
        </Animated.View>
      </Animated.View>

      {/*bounces false + onScrollEndDrag lets user drag-down from top to collapse*/}
      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        bounces={false}
        onScrollEndDrag={(e) => {
          if (e.nativeEvent.contentOffset.y <= 0 && liveY.current < SNAP_BOTTOM / 2) {
            snapTo(SNAP_BOTTOM);
          }
        }}
      >
        {/*summary row*/}
        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryNum}>{stats.flightCount}</Text>
            <Text style={styles.summaryLabel}>FLIGHTS</Text>
          </View>
          <View style={styles.summarySep} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryNum}>{stats.kmStr}</Text>
            <Text style={styles.summaryLabel}>KM FLOWN</Text>
          </View>
          <View style={styles.summarySep} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryNum}>{stats.countries}</Text>
            <Text style={styles.summaryLabel}>COUNTRIES</Text>
          </View>
        </View>

        {/*stat cards row 1 — top aircraft, airport, airline*/}
        <View style={styles.cardRow}>
          <StatCard label="Top Aircraft" value={stats.topAircraft} />
          <StatCard label="Top Airport"  value={stats.topAirport} />
          <StatCard label="Top Airline"  value={stats.topAirline} />
        </View>

        {/*stat cards row 2 — top route, manufacturer, longest flight*/}
        <View style={[styles.cardRow, { marginTop: 20 }]}>
          <StatCard label="Top Route"        value={stats.topRoute} />
          <StatCard label="Top Manufacturer" value={stats.topManufacturer} />
          <StatCard label="Longest Flight"   value={stats.longestFlight} />
        </View>

        {/*counter grid — unique totals*/}
        <View style={[styles.counterGrid, { marginTop: 20 }]}>
          <CounterCard label="Aircraft"   value={stats.uniqueAircraft} />
          <CounterCard label="Airlines"   value={stats.uniqueAirlines} />
          <CounterCard label="Airports"   value={stats.uniqueAirports} />
          <CounterCard label="Routes"     value={stats.uniqueRoutes} />
          <CounterCard label="Countries"  value={stats.countries} />
          <CounterCard label="Continents" value={stats.continents} />
        </View>

        {/*charts*/}
        <SectionHeader title="Top 5 Airports" />
        <View style={styles.chartCard}>
          <HBarChart data={stats.topAirports} color="#34d399" />
        </View>

        <SectionHeader title="Top 5 Airlines" />
        <View style={styles.chartCard}>
          <HBarChart data={stats.topAirlines} color="#34d399" />
        </View>

        <SectionHeader title="Top 5 Manufacturers" />
        <View style={styles.chartCard}>
          <HBarChart data={stats.topManufacturerList} color="#34d399" />
        </View>

        <SectionHeader title="Flights per Year" />
        <View style={styles.chartCard}>
          <VBarChart data={stats.flightsPerYear} color="#34d399" />
        </View>

        <SectionHeader title="Flights per Month" />
        <View style={styles.chartCard}>
          <VBarChart data={stats.flightsPerMonth} color="#34d399" />
        </View>

        <SectionHeader title="Flights per Weekday" />
        <View style={[styles.chartCard, { marginBottom: 40 }]}>
          <VBarChart data={stats.flightsPerWeekday} color="#34d399" />
        </View>
      </ScrollView>
    </Animated.View>
  );
}

// ─── styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  sheet: {
    position: 'absolute',
    left: 0, right: 0, top: 0, bottom: 0,
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
    alignItems: 'center',
  },
  pill: {
    width: 44, height: 5,
    borderRadius: 3,
    backgroundColor: '#4b5563',
  },

  //summary row
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  summaryItem: { flex: 1, alignItems: 'center' },
  summaryNum: { color: '#f3f4f6', fontSize: 24, fontWeight: '700' },
  summaryLabel: { color: '#4b5563', fontSize: 10, fontWeight: '700', letterSpacing: 1.5, marginTop: 2 },
  summarySep: { width: 1, height: 36, backgroundColor: '#1e2d3d' },

  //stat card rows
  cardRow: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    gap: 8,
    marginBottom: 8,
  },

  //counter grid
  counterGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    gap: 8,
    marginBottom: 8,
  },

  //chart sections
  chartCard: {
    marginHorizontal: 12,
    backgroundColor: '#1a2535',
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
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
  label: { width: '100%', color: '#f3f4f6', fontSize: 11, textAlign: 'center' },
  placeholder: { width: '100%', height: 135, backgroundColor: '#243147', borderRadius: 6 },
  value: { color: '#f3f4f6', fontSize: 12, fontWeight: '600', textAlign: 'center' },
});

const counter = StyleSheet.create({
  card: {
    width: '30%',
    flexGrow: 1,
    backgroundColor: '#1a2535',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
    gap: 4,
  },
  num:   { color: '#f3f4f6', fontSize: 22, fontWeight: '700' },
  label: { color: '#4b5563', fontSize: 10, fontWeight: '700', letterSpacing: 1, textAlign: 'center' },
});

const sec = StyleSheet.create({
  title: {
    color: '#f3f4f6',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.5,
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 6,
  },
});

const chart = StyleSheet.create({
  empty: { color: '#374151', fontSize: 13, textAlign: 'center', paddingVertical: 12 },

  //horizontal bar chart
  hRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 8 },
  hLabel: { color: '#f3f4f6', fontSize: 12, fontWeight: '600', width: 70 },
  hTrack: { flex: 1, height: 8, backgroundColor: '#243147', borderRadius: 4, overflow: 'hidden' },
  hBar:   { height: '100%', borderRadius: 4 },
  hCount: { color: '#4b5563', fontSize: 11, width: 28, textAlign: 'right' },

  //vertical bar chart
  vContainer: { flexDirection: 'row', alignItems: 'flex-end', height: 110, gap: 4 },
  vCol:    { flex: 1, alignItems: 'center', height: '100%', justifyContent: 'flex-end' },
  vCount:  { color: '#4b5563', fontSize: 9, marginBottom: 2 },
  vBarBg:  { width: '70%', flex: 1, justifyContent: 'flex-end' },
  vBar:    { width: '100%', borderRadius: 3 },
  vLabel:  { color: '#f3f4f6', fontSize: 9, marginTop: 4, textAlign: 'center', width: '100%' },
});
