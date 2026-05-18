import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Image,
  PanResponder,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

const ACCENT = 'rgb(0, 255, 175)';
import { AIRPORTS } from '../data/airports';
import { AIRLINES } from '../data/airlines';
import AIRLINE_LOGOS from '../assets/airlineLogos';
import { getAllFlights, Flight } from '../data/db';

const { height: SCREEN_H } = Dimensions.get('window');

const AIRCRAFT_IMAGE_MAP: [string, any][] = [
  ['737',  require('../assets/aircraft/737.png')],
  ['747',  require('../assets/aircraft/747.png')],
  ['757',  require('../assets/aircraft/757.png')],
  ['767',  require('../assets/aircraft/767.png')],
  ['777',  require('../assets/aircraft/777.png')],
  ['787',  require('../assets/aircraft/787.png')],
  ['a320', require('../assets/aircraft/A320.png')],
  ['a330', require('../assets/aircraft/A330.png')],
  ['a340', require('../assets/aircraft/A340.png')],
  ['a350', require('../assets/aircraft/A350.png')],
  ['a380', require('../assets/aircraft/A380.png')],
  ['atr',  require('../assets/aircraft/ATR.png')],
];

function getAircraftImage(name: string): any {
  if (!name || name === '—') return null;
  const stripped = name.toLowerCase().replace(/[^a-z0-9]/g, '');
  for (const [pattern, src] of AIRCRAFT_IMAGE_MAP) {
    if (stripped.includes(pattern)) return src;
  }
  return require('../assets/aircraft/A320.png');
}

function getAirlineImage(name: string): any {
  if (!name || name === '—') return null;
  const nameLower = name.toLowerCase();
  const airline = AIRLINES.find(a => a.name.toLowerCase() === nameLower);
  if (!airline) return null;
  return AIRLINE_LOGOS[airline.icao] ?? null;
}

const PEEK_H   = 330;
const SNAP_TOP = 0;

// ─── snap helpers ──────────────────────────────────────────────────────────────

function nearestSnap(y: number, snapBottom: number): number {
  const snaps = [SNAP_TOP, snapBottom];
  return snaps.reduce((best, s) => (Math.abs(s - y) < Math.abs(best - y) ? s : best));
}

function resolveSnap(y: number, vy: number, snapBottom: number): number {
  const snaps = [SNAP_TOP, snapBottom];
  if (vy < -0.3) { const above = snaps.filter(s => s < y); return above.length ? above[above.length - 1] : SNAP_TOP; }
  if (vy >  0.3) { const below = snaps.find(s => s > y);   return below !== undefined ? below : snapBottom; }
  return nearestSnap(y, snapBottom);
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

  const topRouteEntry    = topN(routeCount,       1)[0];
  const topManufEntry    = topN(manufacturerCount, 1)[0];
  const topAircraftEntry = topN(aircraftCount,     1)[0];
  const topAirportEntry  = topN(airportCount,      1)[0];
  const topAirlineEntry  = topN(airlineCount,      1)[0];
  const longestKm        = longestFlight?.distance_km ? Math.round(longestFlight.distance_km).toLocaleString() : null;

  const kmTotal = Math.round(totalKm);
  const kmStr   = kmTotal >= 1000 ? (kmTotal / 1000).toFixed(1) + 'K' : String(kmTotal);

  const topAirportCode = topAirportEntry?.label ?? '—';
  const topAirportFullName = topAirportEntry
    ? (AIRPORTS[topAirportEntry.label]?.name ?? topAirportEntry.label)
    : '—';

  return {
    flightCount:     flights.length,
    kmStr,
    countries:       countrySet.size,
    continents:      continentSet.size,
    uniqueAircraft:  aircraftSet.size,
    uniqueAirlines:  airlineSet.size,
    uniqueAirports:  airportSet.size,
    uniqueRoutes:    routeCount.size,

    topAircraft:     topAircraftEntry?.label ?? '—',
    topAirportCode,
    topAirport:      topAirportEntry  ? topAirportFullName : '—',
    topAirlineRaw:   topAirlineEntry?.label ?? '—',
    topAirline:      topAirlineEntry?.label ?? '—',
    topRoute:        topRouteEntry    ? `${topRouteEntry.label}\n×${topRouteEntry.value}`          : '—',
    topManufacturer: topManufEntry    ? `${topManufEntry.label}\n×${topManufEntry.value}`          : '—',
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

function StatCard({ label, value, imageSource, noImage, borderedImage, codeLabel }: { label: string; value: string; imageSource?: any; noImage?: boolean; borderedImage?: boolean; codeLabel?: string }) {
  return (
    <View style={card.container}>
      <Text style={card.label} allowFontScaling={false} numberOfLines={1} adjustsFontSizeToFit>{label}</Text>
      {codeLabel
        ? <View style={card.codeBox}><Text style={card.codeText} allowFontScaling={false} numberOfLines={1} adjustsFontSizeToFit>{codeLabel}</Text></View>
        : !noImage && (imageSource
          ? borderedImage
            ? <View style={card.imageBorder}><Image source={imageSource} style={card.image} resizeMode="contain" /></View>
            : <Image source={imageSource} style={card.image} resizeMode="contain" />
          : <View style={card.placeholder} />
        )
      }
      {value.includes('\n')
        ? <View style={card.valueLines}>
            {value.split('\n').map((line, i) => (
              <Text key={i} style={card.value} allowFontScaling={false} numberOfLines={1} adjustsFontSizeToFit>{line}</Text>
            ))}
          </View>
        : <Text style={card.value} allowFontScaling={false} numberOfLines={1} adjustsFontSizeToFit>{value}</Text>
      }
    </View>
  );
}

function CounterCard({ label, value }: { label: string; value: number }) {
  return (
    <View style={counter.card}>
      <Text style={counter.num} allowFontScaling={false} numberOfLines={1} adjustsFontSizeToFit>{value}</Text>
      <Text style={counter.label} allowFontScaling={false} numberOfLines={1} adjustsFontSizeToFit>{label}</Text>
    </View>
  );
}

function SectionHeader({ title }: { title: string }) {
  return (
    <View style={sec.row}>
      <View style={sec.accent} />
      <Text style={sec.title}>{title}</Text>
    </View>
  );
}

function HBarChart({ data, color }: { data: { label: string; value: number }[]; color: string }) {
  if (!data.length) return <Text style={chart.empty}>no data</Text>;
  const max = Math.max(...data.map(d => d.value), 1);
  return (
    <View>
      {data.map(({ label, value }, i) => (
        <View key={label} style={[chart.hItem, i > 0 && { marginTop: 16 }]}>
          <View style={chart.hMeta}>
            <Text style={chart.hLabel}>{label}</Text>
            <Text style={[chart.hCount, { color }]}>{value}</Text>
          </View>
          <View style={chart.hTrack}>
            <View style={[chart.hBar, { width: `${(value / max) * 100}%` as any, backgroundColor: color }]} />
          </View>
        </View>
      ))}
    </View>
  );
}

function VBarChart({ data, color }: { data: { label: string; value: number }[]; color: string }) {
  const max = Math.max(...data.map(d => d.value), 1);
  return (
    <View>
      <View style={chart.vContainer}>
        {data.map(({ label, value }) => (
          <View key={label} style={chart.vCol}>
            <Text style={[chart.vCount, value > 0 ? { color } : null]}>{value > 0 ? value : ''}</Text>
            <View style={chart.vBarBg}>
              <View style={[chart.vBar, {
                height: `${Math.max(3, (value / max) * 100)}%` as any,
                backgroundColor: value > 0 ? color : 'transparent',
              }]} />
            </View>
            <Text style={chart.vLabel}>{label}</Text>
          </View>
        ))}
      </View>
      <View style={chart.vBaseline} />
    </View>
  );
}

// ─── main component ────────────────────────────────────────────────────────────

interface BottomSheetProps { hidden?: boolean; }

export function BottomSheet({ hidden = false }: BottomSheetProps) {
  //snapBottomRef is set from onLayout so it uses the real container height rather
  //than Dimensions.get('window') which differs between Expo Go and a production
  //edge-to-edge APK (edgeToEdgeEnabled:true makes the window include the nav-bar area)
  const snapBottomRef = useRef(SCREEN_H - PEEK_H);
  const firstLayout   = useRef(true);

  const translateY = useRef(new Animated.Value(snapBottomRef.current)).current;
  const liveY      = useRef(snapBottomRef.current);
  const startY     = useRef(snapBottomRef.current);
  const [stats, setStats] = useState(computeStats);

  //inputRange uses the Dimensions-based initial value; extrapolate:'clamp' keeps
  //the output correct even if translateY goes slightly beyond it after onLayout correction
  const handleH    = translateY.interpolate({ inputRange: [SNAP_TOP, snapBottomRef.current], outputRange: [80, 40], extrapolate: 'clamp' });
  const pillPadTop = translateY.interpolate({ inputRange: [SNAP_TOP, snapBottomRef.current], outputRange: [36, 17], extrapolate: 'clamp' });

  function snapTo(target: number) {
    Animated.spring(translateY, { toValue: target, useNativeDriver: false, damping: 22, stiffness: 350, mass: 0.7 }).start();
  }

  useEffect(() => {
    const id = translateY.addListener(({ value }) => { liveY.current = value; });
    return () => translateY.removeListener(id);
  }, []);

  useEffect(() => {
    Animated.spring(translateY, {
      toValue: hidden ? snapBottomRef.current + PEEK_H : snapBottomRef.current,
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
        translateY.setValue(Math.max(SNAP_TOP, Math.min(snapBottomRef.current, startY.current + dy)));
      },
      onPanResponderRelease: (_, { dy, vy }) => {
        const pos    = Math.max(SNAP_TOP, Math.min(snapBottomRef.current, startY.current + dy));
        const target = resolveSnap(pos, vy, snapBottomRef.current);
        Animated.spring(translateY, {
          toValue: target, useNativeDriver: false,
          damping: 22, stiffness: 350, mass: 0.7,
        }).start();
      },
    }),
  ).current;

  //capture the true container height on first layout and correct the initial position
  function onSheetLayout(e: any) {
    const h = e.nativeEvent.layout.height;
    if (h > 0 && firstLayout.current) {
      firstLayout.current = false;
      const newSnapBottom = h - PEEK_H;
      snapBottomRef.current = newSnapBottom;
      if (!hidden) {
        translateY.setValue(newSnapBottom);
        liveY.current  = newSnapBottom;
        startY.current = newSnapBottom;
      }
    }
  }

  return (
    <Animated.View style={[styles.sheet, { transform: [{ translateY }] }]} onLayout={onSheetLayout}>
      {/*handle — collapsable:false ensures the native view exists for touch events
          in the New Architecture on Android*/}
      <Animated.View style={[styles.handleBar, { height: handleH }]} {...panResponder.panHandlers} collapsable={false}>
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
          if (e.nativeEvent.contentOffset.y <= 0 && liveY.current < snapBottomRef.current / 2) {
            snapTo(snapBottomRef.current);
          }
        }}
      >
        {/*summary row*/}
        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryNum} allowFontScaling={false} numberOfLines={1} adjustsFontSizeToFit>{stats.flightCount}</Text>
            <Text style={styles.summaryLabel} allowFontScaling={false} numberOfLines={1} adjustsFontSizeToFit>FLIGHTS</Text>
          </View>
          <View style={styles.summarySep} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryNum} allowFontScaling={false} numberOfLines={1} adjustsFontSizeToFit>{stats.kmStr}</Text>
            <Text style={styles.summaryLabel} allowFontScaling={false} numberOfLines={1} adjustsFontSizeToFit>KM FLOWN</Text>
          </View>
          <View style={styles.summarySep} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryNum} allowFontScaling={false} numberOfLines={1} adjustsFontSizeToFit>{stats.countries}</Text>
            <Text style={styles.summaryLabel} allowFontScaling={false} numberOfLines={1} adjustsFontSizeToFit>COUNTRIES</Text>
          </View>
        </View>

        {/*stat cards row 1 — top aircraft, airport, airline*/}
        <View style={styles.cardRow}>
          <StatCard label="Top Aircraft" value={stats.topAircraft} imageSource={getAircraftImage(stats.topAircraft)} />
          <StatCard label="Top Airport"  value={stats.topAirport}  codeLabel={stats.topAirportCode} />
          <StatCard label="Top Airline"  value={stats.topAirline}  imageSource={getAirlineImage(stats.topAirlineRaw)} borderedImage />
        </View>

        {/*stat cards row 2 — top route, manufacturer, longest flight*/}
        <View style={[styles.cardRow, { marginTop: 20 }]}>
          <StatCard label="Top Route"        value={stats.topRoute}        noImage />
          <StatCard label="Top Manufacturer" value={stats.topManufacturer} noImage />
          <StatCard label="Longest Flight"   value={stats.longestFlight}   noImage />
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
          <HBarChart data={stats.topAirports} color={ACCENT} />
        </View>

        <SectionHeader title="Top 5 Airlines" />
        <View style={styles.chartCard}>
          <HBarChart data={stats.topAirlines} color={ACCENT} />
        </View>

        <SectionHeader title="Top 5 Aircraft Types" />
        <View style={styles.chartCard}>
          <HBarChart data={stats.topAircraftList} color={ACCENT} />
        </View>

        <SectionHeader title="Top 5 Manufacturers" />
        <View style={styles.chartCard}>
          <HBarChart data={stats.topManufacturerList} color={ACCENT} />
        </View>

        <SectionHeader title="Flights per Year" />
        <View style={styles.chartCard}>
          <VBarChart data={stats.flightsPerYear} color={ACCENT} />
        </View>

        <SectionHeader title="Flights per Month" />
        <View style={styles.chartCard}>
          <VBarChart data={stats.flightsPerMonth} color={ACCENT} />
        </View>

        <SectionHeader title="Flights per Weekday" />
        <View style={[styles.chartCard, { marginBottom: 40 }]}>
          <VBarChart data={stats.flightsPerWeekday} color={ACCENT} />
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
  summaryNum: { color: '#f3f4f6', fontSize: 24, fontWeight: '700', width: '100%', textAlign: 'center' },
  summaryLabel: { color: '#4b5563', fontSize: 9, fontWeight: '700', letterSpacing: 0, marginTop: 2, width: '100%', textAlign: 'center' },
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
  label: { width: '100%', color: '#4b5563', fontSize: 11, textAlign: 'center' },
  placeholder: { width: '100%', height: 135, backgroundColor: '#243147', borderRadius: 6 },
  image: { width: '100%', height: 135 },
  imageBorder: { width: '100%', borderRadius: 8, overflow: 'hidden' },
  codeBox:  { width: '100%', height: 135, borderRadius: 6, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  codeText: { color: '#f3f4f6', fontSize: 18, fontWeight: '700', letterSpacing: 0, width: '100%', textAlign: 'center' },
  value: { width: '100%', color: '#f3f4f6', fontSize: 12, fontWeight: '600', textAlign: 'center' },
  valueLines: { width: '100%', gap: 8, alignItems: 'center' },
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
  num:   { color: ACCENT, fontSize: 22, fontWeight: '700', width: '100%', textAlign: 'center' },
  label: { color: '#4b5563', fontSize: 9, fontWeight: '700', letterSpacing: 0, textAlign: 'center', width: '100%' },
});

const sec = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 6,
  },
  accent: {
    width: 3,
    height: 14,
    backgroundColor: ACCENT,
    borderRadius: 2,
    marginRight: 8,
  },
  title: {
    color: '#f3f4f6',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.5,
    flex: 1,
  },
});

const chart = StyleSheet.create({
  empty: { color: '#374151', fontSize: 13, textAlign: 'center', paddingVertical: 12 },

  //horizontal bar chart — label + count on top row, bar below
  hItem:  {},
  hMeta:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 7 },
  hLabel: { color: '#d1d5db', fontSize: 13, fontWeight: '500', flex: 1, marginRight: 10 },
  hCount: { fontSize: 13, fontWeight: '700' },
  hTrack: { height: 4, backgroundColor: '#1e2d3d', borderRadius: 2, overflow: 'hidden' },
  hBar:   { height: '100%', borderRadius: 2 },

  //vertical bar chart
  vContainer: { flexDirection: 'row', alignItems: 'flex-end', height: 130, gap: 3 },
  vCol:       { flex: 1, alignItems: 'center', height: '100%', justifyContent: 'flex-end' },
  vCount:     { color: '#4b5563', fontSize: 9, marginBottom: 3 },
  vBarBg:     { width: '80%', flex: 1, justifyContent: 'flex-end' },
  vBar:       { width: '100%', borderRadius: 3 },
  vLabel:     { color: '#6b7280', fontSize: 9, marginTop: 5, textAlign: 'center', width: '100%' },
  vBaseline:  { height: 1, backgroundColor: '#1e2d3d', marginTop: 0 },
});
