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

const COLORS = {
  bg: '#07111f',
  sheet: 'rgba(12, 24, 38, 0.86)',
  surface: 'rgba(20, 32, 51, 0.78)',
  surface2: 'rgba(24, 40, 61, 0.74)',
  line: 'rgba(117, 146, 170, 0.24)',
  text: '#edf4f7',
  muted: '#8392a5',
  dim: '#536377',
  amber: '#f0b35a',
  teal: '#65d0c2',
  coral: '#ff7f6e',
  blue: '#8bb7ff',
  ink: '#07111f',
  whiteLine: 'rgba(255,255,255,0.07)',
  amberWash: 'rgba(240, 179, 90, 0.12)',
  tealWash: 'rgba(101, 208, 194, 0.12)',
  blueWash: 'rgba(139, 183, 255, 0.12)',
  coralWash: 'rgba(255, 127, 110, 0.12)',
};
const ACCENT = COLORS.amber;
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

function EmptyChart() {
  return <Text style={chart.empty}>no data yet</Text>;
}

function topPercent(value: number, max: number): `${number}%` {
  return `${Math.max(8, Math.min(100, (value / Math.max(max, 1)) * 100))}%` as `${number}%`;
}

function RankedRunwayChart({ data, color, wash }: { data: { label: string; value: number }[]; color: string; wash: string }) {
  if (!data.length) return <EmptyChart />;
  const max = Math.max(...data.map(d => d.value), 1);
  return (
    <View style={chart.rankWrap}>
      {data.map(({ label, value }, i) => (
        <View key={label} style={[chart.rankRow, { backgroundColor: wash }]}>
          <View style={[chart.rankBadge, { borderColor: color }]}>
            <Text style={[chart.rankBadgeText, { color }]} allowFontScaling={false}>{i + 1}</Text>
          </View>
          <View style={chart.rankBody}>
            <View style={chart.rankMeta}>
              <Text style={chart.rankLabel} numberOfLines={1}>{label}</Text>
              <Text style={[chart.rankValue, { color }]} allowFontScaling={false}>{value}</Text>
            </View>
            <View style={chart.runway}>
              <View style={[chart.runwayFill, { width: topPercent(value, max), backgroundColor: color }]} />
              <View style={chart.runwayDash} />
            </View>
          </View>
        </View>
      ))}
    </View>
  );
}

function FleetTilesChart({ data }: { data: { label: string; value: number }[] }) {
  if (!data.length) return <Text style={chart.empty}>no data</Text>;
  const max = Math.max(...data.map(d => d.value), 1);
  return (
    <View style={chart.fleetGrid}>
      {data.map(({ label, value }, i) => (
        <View key={label} style={chart.fleetTile}>
          <View style={chart.fleetTop}>
            <Text style={chart.fleetRank} allowFontScaling={false}>0{i + 1}</Text>
            <Text style={chart.fleetCount} allowFontScaling={false}>{value}</Text>
          </View>
          <Image source={getAircraftImage(label)} style={chart.fleetImage} resizeMode="contain" />
          <Text style={chart.fleetLabel} numberOfLines={1} adjustsFontSizeToFit>{label}</Text>
          <View style={chart.fleetTrack}>
            <View style={[chart.fleetFill, { width: topPercent(value, max) }]} />
          </View>
        </View>
      ))}
    </View>
  );
}

function ShareStackChart({ data }: { data: { label: string; value: number }[] }) {
  if (!data.length) return <EmptyChart />;
  const total = Math.max(data.reduce((sum, item) => sum + item.value, 0), 1);
  const palette = [COLORS.amber, COLORS.teal, COLORS.blue, COLORS.coral, COLORS.muted];
  return (
    <View>
      <View style={chart.shareTrack}>
        {data.map((item, i) => (
          <View
            key={item.label}
            style={[
              chart.shareSegment,
              {
                flex: Math.max(item.value, total * 0.06),
                backgroundColor: palette[i % palette.length],
              },
            ]}
          />
        ))}
      </View>
      <View style={chart.shareLegend}>
        {data.map((item, i) => (
          <View key={item.label} style={chart.shareItem}>
            <View style={[chart.shareDot, { backgroundColor: palette[i % palette.length] }]} />
            <Text style={chart.shareLabel} numberOfLines={1}>{item.label}</Text>
            <Text style={chart.shareValue} allowFontScaling={false}>{Math.round((item.value / total) * 100)}%</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function TowerChart({ data, color }: { data: { label: string; value: number }[]; color: string }) {
  const max = Math.max(...data.map(d => d.value), 1);
  return (
    <View style={chart.towerWrap}>
      {data.map(({ label, value }) => (
        <View key={label} style={chart.towerCol}>
          <Text style={[chart.towerCount, value > 0 ? { color } : null]} allowFontScaling={false}>{value || ''}</Text>
          <View style={chart.towerLane}>
            <View style={[chart.towerFill, {
              height: topPercent(value, max),
              backgroundColor: value > 0 ? color : 'transparent',
            }]} />
            <View style={chart.towerMarker} />
          </View>
          <Text style={chart.towerLabel} numberOfLines={1}>{label}</Text>
        </View>
      ))}
    </View>
  );
}

function ActivityRibbonChart({ data }: { data: { label: string; value: number }[] }) {
  const max = Math.max(...data.map(d => d.value), 1);
  return (
    <View style={chart.ribbonWrap}>
      <View style={chart.ribbonGrid}>
        {data.map(({ label, value }, i) => {
          const active = value > 0;
          const level = Math.max(0.16, value / max);
          return (
            <View key={`${label}-${i}`} style={chart.ribbonCellWrap}>
              <View style={[
                chart.ribbonCell,
                {
                  opacity: active ? 0.45 + level * 0.55 : 0.32,
                  backgroundColor: active ? COLORS.teal : 'rgba(83, 99, 119, 0.22)',
                  transform: [{ scaleY: active ? 0.72 + level * 0.28 : 0.72 }],
                },
              ]}>
                <Text style={[chart.ribbonValue, active && { color: COLORS.ink }]} allowFontScaling={false}>
                  {active ? value : ''}
                </Text>
              </View>
              <Text style={chart.ribbonLabel} numberOfLines={1}>{label}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

function WeekdayDialChart({ data }: { data: { label: string; value: number }[] }) {
  const max = Math.max(...data.map(d => d.value), 1);
  return (
    <View style={chart.dialGrid}>
      {data.map(({ label, value }) => {
        const pct = value / max;
        const color = value > 0 ? (pct > 0.66 ? COLORS.amber : pct > 0.33 ? COLORS.teal : COLORS.blue) : COLORS.dim;
        return (
          <View key={label} style={chart.dialCard}>
            <View style={[chart.dialRing, { borderColor: color, opacity: value > 0 ? 1 : 0.42 }]}>
              <View style={[chart.dialCore, { backgroundColor: value > 0 ? color : 'transparent' }]}>
                <Text style={[chart.dialValue, value > 0 && { color: COLORS.ink }]} allowFontScaling={false}>{value}</Text>
              </View>
            </View>
            <Text style={chart.dialLabel}>{label}</Text>
          </View>
        );
      })}
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
  const [scrollBottomPad, setScrollBottomPad] = useState(snapBottomRef.current + 48);

  //inputRange uses the Dimensions-based initial value; extrapolate:'clamp' keeps
  //the output correct even if translateY goes slightly beyond it after onLayout correction
  const handleH    = translateY.interpolate({ inputRange: [SNAP_TOP, snapBottomRef.current], outputRange: [80, 40], extrapolate: 'clamp' });
  const pillPadTop = translateY.interpolate({ inputRange: [SNAP_TOP, snapBottomRef.current], outputRange: [36, 17], extrapolate: 'clamp' });

  function snapTo(target: number) {
    Animated.spring(translateY, { toValue: target, useNativeDriver: false, damping: 22, stiffness: 350, mass: 0.7 }).start();
  }

  function toggleSheet() {
    const midpoint = snapBottomRef.current / 2;
    snapTo(liveY.current > midpoint ? SNAP_TOP : snapBottomRef.current);
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
        if (Math.abs(dy) < 6 && Math.abs(vy) < 0.15) {
          toggleSheet();
          return;
        }
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
      setScrollBottomPad(newSnapBottom + 48);
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
        contentContainerStyle={[styles.scrollContent, { paddingBottom: scrollBottomPad }]}
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
            <Text style={styles.summaryLabel} allowFontScaling={false} numberOfLines={1} adjustsFontSizeToFit>Flights</Text>
          </View>
          <View style={styles.summarySep} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryNum} allowFontScaling={false} numberOfLines={1} adjustsFontSizeToFit>{stats.kmStr}</Text>
            <Text style={styles.summaryLabel} allowFontScaling={false} numberOfLines={1} adjustsFontSizeToFit>Km flown</Text>
          </View>
          <View style={styles.summarySep} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryNum} allowFontScaling={false} numberOfLines={1} adjustsFontSizeToFit>{stats.countries}</Text>
            <Text style={styles.summaryLabel} allowFontScaling={false} numberOfLines={1} adjustsFontSizeToFit>Countries</Text>
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
          <RankedRunwayChart data={stats.topAirports} color={COLORS.amber} wash={COLORS.amberWash} />
        </View>

        <SectionHeader title="Top 5 Airlines" />
        <View style={styles.chartCard}>
          <RankedRunwayChart data={stats.topAirlines} color={COLORS.teal} wash={COLORS.tealWash} />
        </View>

        <SectionHeader title="Top 5 Aircraft Types" />
        <View style={styles.chartCard}>
          <FleetTilesChart data={stats.topAircraftList} />
        </View>

        <SectionHeader title="Top 5 Manufacturers" />
        <View style={styles.chartCard}>
          <ShareStackChart data={stats.topManufacturerList} />
        </View>

        <SectionHeader title="Flights per Year" />
        <View style={styles.chartCard}>
          <TowerChart data={stats.flightsPerYear} color={COLORS.amber} />
        </View>

        <SectionHeader title="Flights per Month" />
        <View style={styles.chartCard}>
          <ActivityRibbonChart data={stats.flightsPerMonth} />
        </View>

        <SectionHeader title="Flights per Weekday" />
        <View style={[styles.chartCard, { marginBottom: 40 }]}>
          <WeekdayDialChart data={stats.flightsPerWeekday} />
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
    backgroundColor: COLORS.sheet,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(219, 190, 129, 0.16)',
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
    width: 42, height: 5,
    borderRadius: 3,
    backgroundColor: COLORS.amber,
  },
  scrollContent: {
    paddingTop: 2,
  },

  //summary row
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 12,
    marginBottom: 12,
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(20, 32, 51, 0.68)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  summaryItem: { flex: 1, alignItems: 'center' },
  summaryNum: { color: COLORS.text, fontSize: 25, fontWeight: '800', width: '100%', textAlign: 'center' },
  summaryLabel: { color: COLORS.muted, fontSize: 10, fontWeight: '700', letterSpacing: 0, marginTop: 3, width: '100%', textAlign: 'center' },
  summarySep: { width: 1, height: 38, backgroundColor: COLORS.line },

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
    backgroundColor: 'rgba(20, 32, 51, 0.66)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    padding: 14,
    marginBottom: 8,
  },
});

const card = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(20, 32, 51, 0.68)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    padding: 10,
    alignItems: 'center',
    gap: 8,
  },
  label: { width: '100%', color: COLORS.muted, fontSize: 11, textAlign: 'center', fontWeight: '700' },
  placeholder: { width: '100%', height: 135, backgroundColor: COLORS.surface2, borderRadius: 6 },
  image: { width: '100%', height: 135 },
  imageBorder: { width: '100%', borderRadius: 8, overflow: 'hidden' },
  codeBox:  { width: '100%', height: 135, borderRadius: 6, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  codeText: { color: COLORS.amber, fontSize: 20, fontWeight: '800', letterSpacing: 0, width: '100%', textAlign: 'center' },
  value: { width: '100%', color: COLORS.text, fontSize: 12, fontWeight: '700', textAlign: 'center' },
  valueLines: { width: '100%', gap: 8, alignItems: 'center' },
});

const counter = StyleSheet.create({
  card: {
    width: '30%',
    flexGrow: 1,
    backgroundColor: 'rgba(20, 32, 51, 0.68)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
    gap: 4,
  },
  num:   { color: COLORS.teal, fontSize: 22, fontWeight: '800', width: '100%', textAlign: 'center' },
  label: { color: COLORS.muted, fontSize: 9, fontWeight: '700', letterSpacing: 0, textAlign: 'center', width: '100%' },
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
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.5,
    flex: 1,
  },
});

const chart = StyleSheet.create({
  empty: { color: COLORS.dim, fontSize: 13, textAlign: 'center', paddingVertical: 12 },

  rankWrap: { gap: 9 },
  rankRow: {
    minHeight: 54,
    borderRadius: 8,
    padding: 9,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.whiteLine,
  },
  rankBadge: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  rankBadgeText: { fontSize: 12, fontWeight: '800' },
  rankBody: { flex: 1 },
  rankMeta: { flexDirection: 'row', alignItems: 'center', marginBottom: 7 },
  rankLabel: { color: COLORS.text, fontSize: 13, fontWeight: '700', flex: 1, marginRight: 10 },
  rankValue: { fontSize: 13, fontWeight: '800' },
  runway: {
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(7, 17, 31, 0.56)',
    overflow: 'hidden',
  },
  runwayFill: { height: '100%', borderRadius: 4 },
  runwayDash: {
    position: 'absolute',
    left: 10,
    right: 10,
    top: 3,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.28)',
  },

  fleetGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  fleetTile: {
    width: '48%',
    minHeight: 142,
    flexGrow: 1,
    borderRadius: 8,
    padding: 10,
    backgroundColor: COLORS.blueWash,
    borderWidth: 1,
    borderColor: COLORS.whiteLine,
  },
  fleetTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  fleetRank: { color: COLORS.dim, fontSize: 10, fontWeight: '800' },
  fleetCount: { color: COLORS.blue, fontSize: 16, fontWeight: '900' },
  fleetImage: { width: '100%', height: 62, marginTop: 4 },
  fleetLabel: { color: COLORS.text, fontSize: 12, fontWeight: '800', textAlign: 'center', marginTop: 4 },
  fleetTrack: {
    height: 4,
    backgroundColor: 'rgba(7, 17, 31, 0.56)',
    borderRadius: 3,
    overflow: 'hidden',
    marginTop: 9,
  },
  fleetFill: { height: '100%', backgroundColor: COLORS.blue, borderRadius: 3 },

  shareTrack: {
    height: 24,
    flexDirection: 'row',
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: 'rgba(7, 17, 31, 0.5)',
    borderWidth: 1,
    borderColor: COLORS.whiteLine,
  },
  shareSegment: { height: '100%' },
  shareLegend: { marginTop: 12, gap: 8 },
  shareItem: { flexDirection: 'row', alignItems: 'center' },
  shareDot: { width: 9, height: 9, borderRadius: 5, marginRight: 8 },
  shareLabel: { color: COLORS.text, fontSize: 13, fontWeight: '700', flex: 1 },
  shareValue: { color: COLORS.muted, fontSize: 12, fontWeight: '800' },

  towerWrap: {
    height: 166,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 9,
  },
  towerCol: { flex: 1, height: '100%', alignItems: 'center', justifyContent: 'flex-end' },
  towerCount: { color: COLORS.dim, fontSize: 10, fontWeight: '800', marginBottom: 5 },
  towerLane: {
    width: '82%',
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(7, 17, 31, 0.5)',
    borderRadius: 7,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.whiteLine,
  },
  towerFill: { width: '100%', borderTopLeftRadius: 7, borderTopRightRadius: 7 },
  towerMarker: {
    position: 'absolute',
    left: 4,
    right: 4,
    bottom: 7,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.26)',
  },
  towerLabel: { color: COLORS.muted, fontSize: 9, fontWeight: '700', marginTop: 7, width: '100%', textAlign: 'center' },

  ribbonWrap: { paddingVertical: 2 },
  ribbonGrid: { flexDirection: 'row', alignItems: 'flex-end', gap: 4 },
  ribbonCellWrap: { flex: 1, alignItems: 'center' },
  ribbonCell: {
    width: '100%',
    height: 74,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.whiteLine,
  },
  ribbonValue: { color: COLORS.dim, fontSize: 10, fontWeight: '900' },
  ribbonLabel: { color: COLORS.muted, fontSize: 8, fontWeight: '800', marginTop: 7, width: '100%', textAlign: 'center' },

  dialGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
  dialCard: {
    width: 74,
    height: 86,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: 'rgba(7, 17, 31, 0.34)',
    borderWidth: 1,
    borderColor: COLORS.whiteLine,
  },
  dialRing: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dialCore: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dialValue: { color: COLORS.dim, fontSize: 12, fontWeight: '900' },
  dialLabel: { color: COLORS.muted, fontSize: 10, fontWeight: '800', marginTop: 7 },
});
