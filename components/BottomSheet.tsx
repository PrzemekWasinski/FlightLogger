import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Image,
  PanResponder,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
  StatusBar as RNStatusBar,
} from 'react-native';

const COLORS = {
  bg: '#050505',
  sheet: 'rgba(8, 8, 9, 0.90)',
  surface: 'rgba(20, 20, 22, 0.78)',
  surface2: 'rgba(30, 30, 33, 0.74)',
  line: 'rgba(255, 255, 255, 0.14)',
  text: '#f5f5f5',
  muted: '#a8a8a8',
  dim: '#6f6f6f',
  amber: '#ff8a3d',
  teal: '#ff8a3d',
  coral: '#ff4f7b',
  blue: '#ff8a3d',
  purple: '#b35cff',
  redAccent: '#ff375f',
  ink: '#050505',
  whiteLine: 'rgba(255,255,255,0.10)',
  amberWash: 'rgba(255, 138, 61, 0.12)',
  tealWash: 'rgba(255, 138, 61, 0.12)',
  blueWash: 'rgba(255, 138, 61, 0.12)',
  coralWash: 'rgba(255, 79, 123, 0.12)',
};
const ACCENT = COLORS.amber;
import { AIRPORTS } from '../data/airports';
import { AIRLINES } from '../data/airlines';
import AIRLINE_LOGOS from '../assets/airlineLogos';
import { getAllFlights, Flight } from '../data/db';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const COMPACT_W = SCREEN_W < 380;

const AIRCRAFT_IMAGE_MAP: [string, any][] = [
  ['737',  require('../assets/aircraft/737.png')],
  ['747',  require('../assets/aircraft/747.png')],
  ['757',  require('../assets/aircraft/757.png')],
  ['767',  require('../assets/aircraft/767.png')],
  ['777',  require('../assets/aircraft/777.png')],
  ['787',  require('../assets/aircraft/787.png')],
  ['a319', require('../assets/aircraft/A320.png')],
  ['a320', require('../assets/aircraft/A320.png')],
  ['a321', require('../assets/aircraft/A320.png')],
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

const PEEK_H   = Math.min(330, Math.max(250, SCREEN_H * 0.42));
const SNAP_TOP = Platform.OS === 'android' ? (RNStatusBar.currentHeight ?? 24) + 12 : 54;

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

function hasSpecialLivery(value?: string): boolean {
  const normalized = value?.trim().toLowerCase();
  return !!normalized && normalized !== 'none';
}

function computeStats() {
  const flights = getAllFlights();

  let totalKm = 0;
  let specialAircraft = 0;
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
  const classCount        = new Map<string, number>();
  const yearCount         = new Map<string, number>();
  const monthCount        = new Map<string, number>();
  const weekdayCount      = new Map<number, number>();

  for (const f of flights) {
    totalKm += f.distance_km ?? 0;
    if (hasSpecialLivery(f.special)) specialAircraft += 1;
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

    if (f.cabin_class) {
      const cabinClass = f.cabin_class.trim();
      if (cabinClass) classCount.set(cabinClass, (classCount.get(cabinClass) ?? 0) + 1);
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
    specialAircraft,
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
    cabinClassList:       topN(classCount,          5),

    flightsPerYear,
    flightsPerMonth,
    flightsPerWeekday,
  };
}

// ─── sub-components ────────────────────────────────────────────────────────────

function StatCard({ label, value, imageSource, noImage, borderedImage, codeLabel }: { label: string; value: string; imageSource?: any; noImage?: boolean; borderedImage?: boolean; codeLabel?: string }) {
  const routeMatch = label === 'Longest Flight' || label === 'Top Route'
    ? /^([A-Z0-9]{3,4})\s*[–→-]\s*([A-Z0-9]{3,4})(?:\n(.+))?$/.exec(value)
    : null;
  return (
    <View style={card.container}>
      <Text style={card.label} allowFontScaling={false} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.68}>{label}</Text>
      {codeLabel
        ? <View style={card.codeBox}><Text style={card.codeText} allowFontScaling={false} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.68}>{codeLabel}</Text></View>
        : !noImage && (imageSource
          ? borderedImage
            ? <View style={card.imageBorder}><Image source={imageSource} style={card.image} resizeMode="contain" /></View>
            : <Image source={imageSource} style={card.image} resizeMode="contain" />
          : <View style={card.placeholder} />
        )
      }
      {routeMatch
        ? <View style={card.longestWrap}>
            <View style={card.routeInline}>
              <Text style={card.routeCode} allowFontScaling={false}>{routeMatch[1]}</Text>
              <Text style={card.routeArrow} allowFontScaling={false}>→</Text>
              <Text style={card.routeCode} allowFontScaling={false}>{routeMatch[2]}</Text>
            </View>
            {routeMatch[3] ? <Text style={card.value} allowFontScaling={false} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.68}>{routeMatch[3]}</Text> : null}
          </View>
        : value.includes('\n')
        ? <View style={card.valueLines}>
            {value.split('\n').map((line, i) => (
              <Text key={i} style={card.value} allowFontScaling={false} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.68}>{line}</Text>
            ))}
          </View>
        : <Text
            style={[card.value, codeLabel && card.airportValue]}
            allowFontScaling={false}
            numberOfLines={codeLabel ? 3 : 1}
            adjustsFontSizeToFit={!codeLabel}
            minimumFontScale={0.68}
          >
            {value}
          </Text>
      }
    </View>
  );
}

function CounterCard({ label, value }: { label: string; value: number }) {
  return (
    <View style={counter.card}>
      <Text style={counter.num} allowFontScaling={false} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>{value}</Text>
      <Text style={counter.label} allowFontScaling={false} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.62}>{label}</Text>
    </View>
  );
}

function SectionHeader({ title }: { title: string; color?: string }) {
  return (
    <View style={sec.row}>
      <View style={sec.accent} />
      <Text style={sec.title} allowFontScaling={false} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.72}>{title}</Text>
    </View>
  );
}

function EmptyChart() {
  return <Text style={chart.empty} allowFontScaling={false}>no data yet</Text>;
}

function airportChartLabel(code: string): string {
  const name = AIRPORTS[code]?.name;
  return name ? `${code}|${name}` : code;
}

function topPercent(value: number, max: number): `${number}%` {
  return `${Math.max(8, Math.min(100, (value / Math.max(max, 1)) * 100))}%` as `${number}%`;
}

function RankedRunwayChart({ data, color, wash }: { data: { label: string; value: number }[]; color: string; wash: string }) {
  if (!data.length) return <EmptyChart />;
  const max = Math.max(...data.map(d => d.value), 1);
  return (
    <View style={chart.rankWrap}>
      {data.map(({ label, value }) => (
        <View key={label} style={[chart.rankRow, { backgroundColor: wash }]}>
          <View style={chart.rankBody}>
            <View style={chart.rankMeta}>
              {label.includes('|')
                ? <View style={chart.rankAirportLabel}>
                    <Text style={[chart.rankAirportCode, { color }]} numberOfLines={1} allowFontScaling={false} adjustsFontSizeToFit minimumFontScale={0.72}>{label.split('|')[0]}</Text>
                    <Text style={chart.rankAirportName} numberOfLines={1} allowFontScaling={false} adjustsFontSizeToFit minimumFontScale={0.72}>{label.split('|')[1]}</Text>
                  </View>
                : <Text style={chart.rankLabel} numberOfLines={1} allowFontScaling={false} adjustsFontSizeToFit minimumFontScale={0.7}>{label}</Text>
              }
              <Text style={[chart.rankValue, { color }]} numberOfLines={1} allowFontScaling={false} adjustsFontSizeToFit minimumFontScale={0.72}>{value}</Text>
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
  if (!data.length) return <Text style={chart.empty} allowFontScaling={false}>no data</Text>;
  const max = Math.max(...data.map(d => d.value), 1);
  return (
    <View style={chart.fleetGrid}>
      {data.map(({ label, value }) => (
        <View key={label} style={chart.fleetTile}>
          <View style={chart.fleetTop}>
            <Text style={chart.fleetCount} numberOfLines={1} allowFontScaling={false} adjustsFontSizeToFit minimumFontScale={0.72}>{value} {value === 1 ? 'Flight' : 'Flights'}</Text>
          </View>
          <Image source={getAircraftImage(label)} style={chart.fleetImage} resizeMode="contain" />
          <Text style={chart.fleetLabel} numberOfLines={2} allowFontScaling={false} adjustsFontSizeToFit minimumFontScale={0.72}>{label}</Text>
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
  const palette = [COLORS.amber, COLORS.coral, COLORS.purple, COLORS.redAccent, '#ffb15f'];
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
            <Text style={chart.shareLabel} numberOfLines={1} allowFontScaling={false} adjustsFontSizeToFit minimumFontScale={0.7}>{item.label}</Text>
            <Text style={chart.shareValue} numberOfLines={1} allowFontScaling={false} adjustsFontSizeToFit minimumFontScale={0.78}>{Math.round((item.value / total) * 100)}%</Text>
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
          <Text style={[chart.towerCount, value > 0 ? { color } : null]} numberOfLines={1} allowFontScaling={false} adjustsFontSizeToFit minimumFontScale={0.72}>{value || ''}</Text>
          <View style={chart.towerLane}>
            <View style={[chart.towerFill, {
              height: topPercent(value, max),
              backgroundColor: value > 0 ? color : 'transparent',
            }]} />
            <View style={chart.towerMarker} />
          </View>
          <Text style={chart.towerLabel} numberOfLines={1} allowFontScaling={false} adjustsFontSizeToFit minimumFontScale={0.7}>{label}</Text>
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
                  backgroundColor: active ? COLORS.amber : 'rgba(255, 255, 255, 0.10)',
                  transform: [{ scaleY: active ? 0.72 + level * 0.28 : 0.72 }],
                },
              ]}>
                <Text style={[chart.ribbonValue, active && { color: COLORS.ink }]} numberOfLines={1} allowFontScaling={false} adjustsFontSizeToFit minimumFontScale={0.72}>
                  {active ? value : ''}
                </Text>
              </View>
              <Text style={chart.ribbonLabel} numberOfLines={1} allowFontScaling={false} adjustsFontSizeToFit minimumFontScale={0.65}>{label}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

function WeekdayDialChart({ data }: { data: { label: string; value: number }[] }) {
  const max = Math.max(...data.map(d => d.value), 1);
  function weekdayColor(value: number): string {
    if (value <= 0) return COLORS.dim;
    const level = value / max;
    const r = Math.round(74 + (255 - 74) * level);
    const g = Math.round(36 + (138 - 36) * level);
    const b = Math.round(18 + (61 - 18) * level);
    return `rgb(${r}, ${g}, ${b})`;
  }
  return (
    <View style={chart.dialGrid}>
      {data.map(({ label, value }) => {
        const color = weekdayColor(value);
        return (
          <View key={label} style={chart.dialCard}>
            <View style={[chart.dialRing, { borderColor: color, opacity: value > 0 ? 1 : 0.42 }]}>
              <View style={[chart.dialCore, { backgroundColor: value > 0 ? color : 'transparent' }]}>
                <Text style={[chart.dialValue, value > 0 && { color: COLORS.ink }]} numberOfLines={1} allowFontScaling={false} adjustsFontSizeToFit minimumFontScale={0.72}>{value}</Text>
              </View>
            </View>
            <Text style={chart.dialLabel} numberOfLines={1} allowFontScaling={false} adjustsFontSizeToFit minimumFontScale={0.78}>{label}</Text>
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
  //than relying only on Dimensions.get('window'), which can vary by Android device.
  const snapBottomRef = useRef(SCREEN_H - PEEK_H);
  const firstLayout   = useRef(true);

  const translateY = useRef(new Animated.Value(snapBottomRef.current)).current;
  const liveY      = useRef(snapBottomRef.current);
  const startY     = useRef(snapBottomRef.current);
  const [stats, setStats] = useState(computeStats);
  const [scrollBottomPad, setScrollBottomPad] = useState(snapBottomRef.current + 72);

  //inputRange uses the Dimensions-based initial value; extrapolate:'clamp' keeps
  //the output correct even if translateY goes slightly beyond it after onLayout correction
  const handleH    = translateY.interpolate({ inputRange: [SNAP_TOP, snapBottomRef.current], outputRange: [80, 40], extrapolate: 'clamp' });
  const pillPadTop = translateY.interpolate({ inputRange: [SNAP_TOP, snapBottomRef.current], outputRange: [36, 17], extrapolate: 'clamp' });

  function snapTo(target: number) {
    Animated.spring(translateY, { toValue: target, useNativeDriver: false, damping: 22, stiffness: 350, mass: 0.7 }).start();
  }

  function toggleSheet() {
    translateY.stopAnimation((value) => {
      const midpoint = snapBottomRef.current / 2;
      snapTo(value < midpoint ? snapBottomRef.current : SNAP_TOP);
    });
  }

  useEffect(() => {
    const id = translateY.addListener(({ value }) => {
      liveY.current = value;
      const nextPad = Math.round(Math.max(72, Math.min(snapBottomRef.current + 72, value + 72)));
      setScrollBottomPad(current => Math.abs(current - nextPad) > 10 ? nextPad : current);
    });
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
      setScrollBottomPad(newSnapBottom + 72);
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
            <Text style={styles.summaryNum} allowFontScaling={false} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>{stats.flightCount}</Text>
            <Text style={styles.summaryLabel} allowFontScaling={false} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.68}>Flights</Text>
          </View>
          <View style={styles.summarySep} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryNum} allowFontScaling={false} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>{stats.kmStr}</Text>
            <Text style={styles.summaryLabel} allowFontScaling={false} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.68}>Km flown</Text>
          </View>
          <View style={styles.summarySep} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryNum} allowFontScaling={false} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>{stats.countries}</Text>
            <Text style={styles.summaryLabel} allowFontScaling={false} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.68}>Countries</Text>
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
          <CounterCard label="Special Aircraft" value={stats.specialAircraft} />
        </View>

        {/*charts*/}
        <SectionHeader title="Top 5 Airports" color={COLORS.amber} />
        <View style={styles.unframedChart}>
          <RankedRunwayChart data={stats.topAirports.map(item => ({ ...item, label: airportChartLabel(item.label) }))} color={COLORS.amber} wash={COLORS.amberWash} />
        </View>

        <SectionHeader title="Top 5 Airlines" color={COLORS.amber} />
        <View style={styles.unframedChart}>
          <RankedRunwayChart data={stats.topAirlines} color={COLORS.amber} wash={COLORS.amberWash} />
        </View>

        <SectionHeader title="Top 5 Aircraft Types" color={COLORS.amber} />
        <View style={styles.unframedChart}>
          <FleetTilesChart data={stats.topAircraftList} />
        </View>

        <SectionHeader title="Top 5 Manufacturers" color={COLORS.coral} />
        <View style={styles.chartCard}>
          <ShareStackChart data={stats.topManufacturerList} />
        </View>

        <SectionHeader title="Class Breakdown" color={COLORS.purple} />
        <View style={styles.chartCard}>
          <ShareStackChart data={stats.cabinClassList} />
        </View>

        <SectionHeader title="Flights per Year" color={COLORS.amber} />
        <View style={styles.chartCard}>
          <TowerChart data={stats.flightsPerYear} color={COLORS.amber} />
        </View>

        <SectionHeader title="Flights per Month" color={COLORS.amber} />
        <View style={styles.chartCard}>
          <ActivityRibbonChart data={stats.flightsPerMonth} />
        </View>

        <SectionHeader title="Flights per Weekday" color={COLORS.amber} />
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
    borderColor: 'rgba(255, 255, 255, 0.12)',
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
  unframedChart: {
    marginHorizontal: 12,
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
  placeholder: { width: '100%', height: COMPACT_W ? 104 : 135, backgroundColor: COLORS.surface2, borderRadius: 6 },
  image: { width: '100%', height: COMPACT_W ? 104 : 135 },
  imageBorder: { width: '100%', borderRadius: 8, overflow: 'hidden' },
  codeBox:  { width: '100%', height: COMPACT_W ? 104 : 135, borderRadius: 6, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  codeText: { color: COLORS.amber, fontSize: COMPACT_W ? 30 : 36, fontWeight: '900', letterSpacing: 1, width: '100%', textAlign: 'center' },
  value: { width: '100%', color: COLORS.text, fontSize: 13, fontWeight: '800', textAlign: 'center' },
  airportValue: { lineHeight: 16 },
  valueLines: { width: '100%', gap: 8, alignItems: 'center' },
  longestWrap: { width: '100%', gap: 8, alignItems: 'center' },
  routeInline: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  routeCode: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '800',
  },
  routeArrow: {
    color: COLORS.amber,
    fontSize: 14,
    fontWeight: '900',
    lineHeight: 14,
    marginTop: -4,
  },
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
  rankBody: { flex: 1 },
  rankMeta: { flexDirection: 'row', alignItems: 'center', marginBottom: 7 },
  rankLabel: { color: COLORS.text, fontSize: 13, fontWeight: '700', flex: 1, marginRight: 10 },
  rankAirportLabel: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', marginRight: 10, gap: 8 },
  rankAirportCode: { fontSize: 13, fontWeight: '900', minWidth: 34 },
  rankAirportName: { color: COLORS.text, fontSize: 12, fontWeight: '700', flex: 1 },
  rankValue: { fontSize: 13, fontWeight: '800', minWidth: 28, textAlign: 'right' },
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
    minHeight: 164,
    flexGrow: 1,
    borderRadius: 8,
    padding: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: COLORS.whiteLine,
  },
  fleetTop: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center' },
  fleetCount: { color: COLORS.blue, fontSize: 16, fontWeight: '900', width: '100%' },
  fleetImage: { width: '118%', alignSelf: 'center', height: COMPACT_W ? 88 : 100, marginTop: -1 },
  fleetLabel: { color: COLORS.text, fontSize: 12, fontWeight: '800', textAlign: 'center', marginTop: 2 },
  fleetTrack: {
    height: 4,
    backgroundColor: 'rgba(7, 17, 31, 0.56)',
    borderRadius: 3,
    overflow: 'hidden',
    marginTop: 7,
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
  shareLabel: { color: COLORS.text, fontSize: 13, fontWeight: '700', flex: 1, minWidth: 0 },
  shareValue: { color: COLORS.muted, fontSize: 12, fontWeight: '800', minWidth: 34, textAlign: 'right' },

  towerWrap: {
    height: 166,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 9,
  },
  towerCol: { flex: 1, height: '100%', alignItems: 'center', justifyContent: 'flex-end' },
  towerCount: { color: COLORS.dim, fontSize: 10, fontWeight: '800', marginBottom: 5, minWidth: 18, textAlign: 'center' },
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
  ribbonValue: { color: COLORS.dim, fontSize: 10, fontWeight: '900', minWidth: 16, textAlign: 'center' },
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
    borderRadius: 999,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  dialCore: {
    width: 32,
    height: 32,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  dialValue: { color: COLORS.dim, fontSize: 12, fontWeight: '900', minWidth: 18, textAlign: 'center' },
  dialLabel: {
    color: COLORS.muted,
    fontSize: 10,
    fontWeight: '800',
    marginTop: 7,
    minWidth: 28,
    textAlign: 'center',
  },
});
