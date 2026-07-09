import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  FlatList,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  PixelRatio,
  Platform,
  ScrollView,
  StatusBar as RNStatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { AIRPORTS } from '../data/airports';
import { AIRLINES } from '../data/airlines';
import AIRLINE_LOGOS from '../assets/airlineLogos';
import { DatePickerField } from './DatePickerField';
import { getAllFlights, deleteFlight, updateFlight, Flight } from '../data/db';
import { log } from '../utils/logger';

const BUILD_TAG = 'BUILD-MARKER v9 — tabbed-logbook';

const COLORS = {
  bg: '#050505',
  sheet: '#0b0b0c',
  surface: 'rgba(20, 20, 22, 0.82)',
  surface2: 'rgba(30, 30, 33, 0.84)',
  line: 'rgba(255, 255, 255, 0.14)',
  text: '#f5f5f5',
  muted: '#a8a8a8',
  dim: '#6f6f6f',
  amber: '#ff8a3d',
  teal: '#d4d4d4',
  coral: '#ff4f7b',
  red: '#ef4444',
  ink: '#050505',
  whiteLine: 'rgba(255,255,255,0.10)',
};
const ACCENT = COLORS.amber;

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

function ordinal(n: number): string {
  const v = n % 100;
  if (v >= 11 && v <= 13) return n + 'th';
  switch (n % 10) {
    case 1:  return n + 'st';
    case 2:  return n + 'nd';
    case 3:  return n + 'rd';
    default: return n + 'th';
  }
}

// "2026-05-03" -> "3rd May 2026". Parsed from the YMD parts (no Date/UTC shift).
function formatDate(ymd?: string | null): string {
  if (!ymd) return '—';
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(ymd);
  if (!m) return ymd;
  const year  = Number(m[1]);
  const month = Number(m[2]);
  const day   = Number(m[3]);
  if (month < 1 || month > 12) return ymd;
  return `${ordinal(day)} ${MONTHS[month - 1]} ${year}`;
}

//strip non-alphanumeric so "777-300ER" → "777300ER", then check if filename appears in it
const AIRCRAFT_IMAGES: { key: string; src: ReturnType<typeof require> }[] = [
  { key: 'A380', src: require('../assets/aircraft/A380.png') },
  { key: 'A350', src: require('../assets/aircraft/A350.png') },
  { key: 'A340', src: require('../assets/aircraft/A340.png') },
  { key: 'A330', src: require('../assets/aircraft/A330.png') },
  { key: 'A320', src: require('../assets/aircraft/A320.png') },
  { key: '787',  src: require('../assets/aircraft/787.png') },
  { key: '777',  src: require('../assets/aircraft/777.png') },
  { key: '767',  src: require('../assets/aircraft/767.png') },
  { key: '757',  src: require('../assets/aircraft/757.png') },
  { key: '747',  src: require('../assets/aircraft/747.png') },
  { key: '737',  src: require('../assets/aircraft/737.png') },
  { key: 'ATR',  src: require('../assets/aircraft/ATR.png') },
];

function getAircraftImage(aircraft?: string | null) {
  if (!aircraft) return null;
  const stripped = aircraft.toUpperCase().replace(/[^A-Z0-9]/g, '');
  for (const { key, src } of AIRCRAFT_IMAGES) {
    if (stripped.includes(key.toUpperCase())) return src;
  }
  return require('../assets/aircraft/A320.png');
}

interface Suggestion {
  code: string;
  name: string;
}

interface AirlineSuggestion { name: string; icao: string; }

function searchAirports(query: string): Suggestion[] {
  if (query.length < 2) return [];
  const q     = query.toLowerCase();
  const upper = query.toUpperCase();
  const out: Suggestion[] = [];
  for (const [code, ap] of Object.entries(AIRPORTS)) {
    if (code.startsWith(upper) || ap.name.toLowerCase().includes(q)) {
      out.push({ code, name: ap.name });
    }
    if (out.length >= 5) break;
  }
  return out;
}

function searchAirlines(query: string): AirlineSuggestion[] {
  if (query.length < 2) return [];
  const q = query.toLowerCase();
  const out: AirlineSuggestion[] = [];
  for (const a of AIRLINES) {
    if (a.name.toLowerCase().includes(q)) {
      out.push({ name: a.name, icao: a.icao });
      if (out.length >= 5) break;
    }
  }
  return out;
}

function getAirlineImage(name?: string | null) {
  if (!name) return null;
  const airline = AIRLINES.find(a => a.name.toLowerCase() === name.toLowerCase());
  if (!airline) return null;
  return AIRLINE_LOGOS[airline.icao] ?? null;
}

function getAirportName(code?: string | null): string {
  if (!code) return 'Unknown airport';
  return AIRPORTS[code]?.name ?? code;
}

function kmLabel(km?: number): string {
  if (!km) return '—';
  const rounded = Math.round(km);
  return rounded >= 1000 ? `${(rounded / 1000).toFixed(1)}K km` : `${rounded} km`;
}

function formatAltitude(value?: string): string | undefined {
  if (!value) return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  if (/^fl/i.test(trimmed)) return trimmed.toUpperCase();
  if (/^\d+$/.test(trimmed)) return `${Number(trimmed).toLocaleString()} ft`;
  return trimmed;
}

type LogbookTab = 'flights' | 'aircraft' | 'airlines' | 'airports';
type CountItem = { key: string; label: string; sublabel: string; count: number; image?: any; code?: string };

const TABS: { key: LogbookTab; label: string }[] = [
  { key: 'flights',  label: 'Flights' },
  { key: 'aircraft', label: 'Aircraft' },
  { key: 'airlines', label: 'Airlines' },
  { key: 'airports', label: 'Airports' },
];

function makeCountItems(
  flights: Flight[],
  getKeys: (flight: Flight) => string[],
  describe: (key: string, count: number) => CountItem,
): CountItem[] {
  const counts = new Map<string, number>();
  flights.forEach(flight => {
    getKeys(flight).forEach(key => {
      if (!key.trim()) return;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    });
  });
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([key, count]) => describe(key, count));
}

function topPercent(value: number, max: number): `${number}%` {
  return `${Math.max(8, Math.min(100, (value / Math.max(max, 1)) * 100))}%` as `${number}%`;
}

function tabColor(tab: LogbookTab): string {
  if (tab === 'aircraft') return COLORS.amber;
  if (tab === 'airlines') return COLORS.amber;
  return COLORS.amber;
}

function tabWash(tab: LogbookTab): string {
  if (tab === 'aircraft') return 'rgba(255, 255, 255, 0.08)';
  if (tab === 'airlines') return 'rgba(255, 255, 255, 0.08)';
  return 'rgba(255, 255, 255, 0.08)';
}

const SCREEN_W   = Dimensions.get('window').width;
const SCREEN_H   = Dimensions.get('window').height;
const COMPACT_W  = SCREEN_W < 380;
//On Android with edgeToEdgeEnabled the window starts at y=0 (behind the status bar)
const HEADER_TOP = Platform.OS === 'ios' ? 55 : (RNStatusBar.currentHeight ?? 24) + 14;

interface Props {
  visible: boolean;
  onClose: () => void;
  onFlightChange: () => void;
}

// ─── flight row ────────────────────────────────────────────────────────────────

interface RowProps {
  item:     Flight;
  onEdit:   () => void;
  onDelete: () => void;
}

function joinDetails(parts: (string | undefined)[]): string | undefined {
  const clean = parts.filter(Boolean) as string[];
  return clean.length ? clean.join('  /  ') : undefined;
}

function EditGlyph() {
  return (
    <View style={s.editGlyph}>
      <View style={s.editGlyphLine} />
      <View style={s.editGlyphTip} />
    </View>
  );
}

function DeleteGlyph() {
  return (
    <View style={s.deleteGlyph}>
      <View style={s.deleteGlyphLid} />
      <View style={s.deleteGlyphBody}>
        <View style={s.deleteGlyphLine} />
        <View style={s.deleteGlyphLine} />
      </View>
    </View>
  );
}

function FlightRow({ item, onEdit, onDelete }: RowProps) {
  const aircraftImg = getAircraftImage(item.aircraft);
  const cruise = formatAltitude(item.cruise_altitude);
  const identityLine = joinDetails([
    item.registration,
    item.msn ? `MSN ${item.msn}` : undefined,
  ]);
  const runwayLine = item.dep_runway || item.arr_runway
    ? `Runways ${item.dep_runway ?? '—'} to ${item.arr_runway ?? '—'}`
    : undefined;
  const profileLine = joinDetails([
    cruise ? `Cruise ${cruise}` : undefined,
    item.cabin_class,
  ]);
  return (
    <View style={s.card}>
      <View style={s.flightTop}>
        <View style={s.dateChip}>
          <Text style={s.dateChipText} numberOfLines={1} allowFontScaling={false} adjustsFontSizeToFit minimumFontScale={0.7}>{formatDate(item.date)}</Text>
        </View>
        <Text style={s.distanceText} allowFontScaling={false}>{kmLabel(item.distance_km)}</Text>
      </View>

      <View style={s.routeRow}>
        <View style={s.airportBlock}>
          <Text style={s.airportCode} allowFontScaling={false}>{item.from}</Text>
        </View>
        <View style={s.routeMid}>
          <View style={s.routeLine} />
          <Text style={s.planeTxt}>✈</Text>
          <View style={s.routeLine} />
        </View>
        <View style={[s.airportBlock, s.airportBlockRight]}>
          <Text style={[s.airportCode, s.airportCodeRight]} allowFontScaling={false}>{item.to}</Text>
        </View>
      </View>

      <View style={s.airportNameRow}>
        <Text style={s.airportName} numberOfLines={2}>{getAirportName(item.from)}</Text>
        <Text style={[s.airportName, s.airportNameRight]} numberOfLines={2}>{getAirportName(item.to)}</Text>
      </View>

      <View style={s.flightLower}>
        <View style={s.aircraftMedia}>
          {aircraftImg ? <Image source={aircraftImg} style={s.aircraftIcon} resizeMode="contain" /> : <View style={s.aircraftIconPlaceholder} />}
        </View>
        <View style={s.flightLowerBody}>
          <View style={s.flightMeta}>
            <Text style={s.aircraftLine} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.68}>{item.aircraft ?? 'Aircraft not logged'}</Text>
            <Text style={s.infoLine} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.72}>{item.airline ?? 'Airline not logged'}</Text>
            {identityLine ? <Text style={s.identityLine} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.72}>{identityLine}</Text> : null}
            {runwayLine ? <Text style={s.opsLine} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.72}>{runwayLine}</Text> : null}
            {profileLine ? <Text style={s.profileLine} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.72}>{profileLine}</Text> : null}
          </View>

          <View style={s.actions}>
            <TouchableOpacity onPress={onEdit} style={[s.actionBtn, s.editBtn]} accessibilityLabel="Edit flight">
              <EditGlyph />
            </TouchableOpacity>
            <TouchableOpacity onPress={onDelete} style={[s.actionBtn, s.deleteBtn]} accessibilityLabel="Delete flight">
              <DeleteGlyph />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
}

function TabButton({ tab, active, onPress }: { tab: { key: LogbookTab; label: string }; active: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity style={[s.tabBtn, active && s.tabBtnActive]} onPress={onPress} activeOpacity={0.82}>
      <Text style={[s.tabTxt, active && s.tabTxtActive]} allowFontScaling={false} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.68}>{tab.label}</Text>
    </TouchableOpacity>
  );
}

function CountTile({ item, max, kind, color, wash }: { item: CountItem; max: number; kind: 'aircraft' | 'airline' | 'airport'; color: string; wash: string }) {
  return (
    <View style={[s.entityTile, { backgroundColor: wash }]}>
      <View style={s.entityTileTop}>
        <Text style={[s.entityTileCount, { color }]} allowFontScaling={false}>
          {item.count} {kind === 'airport' ? (item.count === 1 ? 'Visit' : 'Visits') : (item.count === 1 ? 'Flight' : 'Flights')}
        </Text>
      </View>
      <View style={s.entityVisual}>
        {kind === 'airport'
          ? <Text style={[s.entityTileCode, { color }]} allowFontScaling={false}>{item.code}</Text>
          : item.image
            ? <Image source={item.image} style={kind === 'airline' ? s.entityTileLogo : s.entityTileAircraft} resizeMode="contain" />
            : <Text style={[s.entityTileCode, { color }]} allowFontScaling={false}>{item.label.slice(0, 3).toUpperCase()}</Text>
        }
      </View>
      <Text style={s.entityTileLabel} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.72}>{item.label}</Text>
      <View style={s.entityTileTrack}>
        <View style={[s.entityTileFill, { width: topPercent(item.count, max), backgroundColor: color }]} />
      </View>
    </View>
  );
}

function RowGap() { return <View style={{ height: 8 }} />; }

// ─── logbook modal ─────────────────────────────────────────────────────────────

export function LogbookModal({ visible, onClose, onFlightChange }: Props) {
  const translateY = useRef(new Animated.Value(SCREEN_H)).current;
  const editTranslateY = useRef(new Animated.Value(SCREEN_H)).current;

  const [flights,         setFlights]         = useState<Flight[]>([]);
  const [activeTab,       setActiveTab]       = useState<LogbookTab>('flights');
  const [editingFlight,   setEditingFlight]   = useState<Flight | null>(null);
  const [editFrom,        setEditFrom]        = useState('');
  const [editTo,          setEditTo]          = useState('');
  const [editAircraft,    setEditAircraft]    = useState('');
  const [editRegistration, setEditRegistration] = useState('');
  const [editAirline,     setEditAirline]     = useState('');
  const [editDate,        setEditDate]        = useState('');
  const [editMsn,         setEditMsn]         = useState('');
  const [editDepRunway,   setEditDepRunway]   = useState('');
  const [editArrRunway,   setEditArrRunway]   = useState('');
  const [editCruiseAltitude, setEditCruiseAltitude] = useState('');
  const [editCabinClass,  setEditCabinClass]  = useState('');
  const [editActiveSugs,  setEditActiveSugs]  = useState<Suggestion[]>([]);
  const [editAirlineSugs, setEditAirlineSugs] = useState<AirlineSuggestion[]>([]);
  const [editActiveField, setEditActiveField] = useState<'from' | 'to' | 'airline' | null>(null);
  const [editRouteH,      setEditRouteH]      = useState(0);
  const [editAirlineSugTop, setEditAirlineSugTop] = useState(0);

  useEffect(() => {
    Animated.spring(translateY, {
      toValue: visible ? 0 : SCREEN_H,
      useNativeDriver: true,
      damping: 22,
      stiffness: 350,
      mass: 0.7,
    }).start();
    if (visible) {
      refresh();
      log('info', `${BUILD_TAG} | fontScale=${PixelRatio.getFontScale()} pxRatio=${PixelRatio.get()} screen=${Math.round(Dimensions.get('window').width)}x${Math.round(Dimensions.get('window').height)}`);
    }
    //clear any open edit panel when the logbook closes
    if (!visible) setEditingFlight(null);
  }, [visible]);

  function refresh() { setFlights(getAllFlights()); }

  function openEdit(flight: Flight) {
    setEditFrom(flight.from);
    setEditTo(flight.to);
    setEditAircraft(flight.aircraft ?? '');
    setEditRegistration(flight.registration ?? '');
    setEditAirline(flight.airline   ?? '');
    setEditDate(flight.date         ?? '');
    setEditMsn(flight.msn           ?? '');
    setEditDepRunway(flight.dep_runway ?? '');
    setEditArrRunway(flight.arr_runway ?? '');
    setEditCruiseAltitude(flight.cruise_altitude ?? '');
    setEditCabinClass(flight.cabin_class ?? '');
    setEditActiveSugs([]);
    setEditAirlineSugs([]);
    setEditActiveField(null);
    editTranslateY.setValue(SCREEN_H);
    setEditingFlight(flight);
    requestAnimationFrame(() => {
      Animated.spring(editTranslateY, {
        toValue: 0,
        useNativeDriver: true,
        damping: 22,
        stiffness: 350,
        mass: 0.7,
      }).start();
    });
  }

  function cancelEdit() {
    Keyboard.dismiss();
    Animated.spring(editTranslateY, {
      toValue: SCREEN_H,
      useNativeDriver: true,
      damping: 24,
      stiffness: 340,
      mass: 0.75,
    }).start(() => setEditingFlight(null));
  }

  function saveEdit() {
    if (!editingFlight || !editFrom.trim() || !editTo.trim()) return;
    updateFlight(
      editingFlight.id,
      editFrom.trim().toUpperCase(),
      editTo.trim().toUpperCase(),
      editAirline.trim()  || undefined,
      editAircraft.trim() || undefined,
      editRegistration.trim().toUpperCase() || undefined,
      editDate.trim()     || undefined,
      editMsn.trim().toUpperCase() || undefined,
      editDepRunway.trim().toUpperCase() || undefined,
      editArrRunway.trim().toUpperCase() || undefined,
      editCruiseAltitude.trim() || undefined,
      editCabinClass.trim() || undefined,
    );
    Keyboard.dismiss();
    Animated.spring(editTranslateY, {
      toValue: SCREEN_H,
      useNativeDriver: true,
      damping: 24,
      stiffness: 340,
      mass: 0.75,
    }).start(() => {
      setEditingFlight(null);
      refresh();
      onFlightChange();
    });
  }

  function onEditFromChange(text: string) {
    setEditFrom(text);
    setEditActiveField('from');
    setEditActiveSugs(searchAirports(text));
  }

  function onEditToChange(text: string) {
    setEditTo(text);
    setEditActiveField('to');
    setEditActiveSugs(searchAirports(text));
  }

  function onEditAirlineChange(text: string) {
    setEditAirline(text);
    setEditActiveField('airline');
    setEditAirlineSugs(searchAirlines(text));
  }

  function selectEditSuggestion(code: string) {
    if (editActiveField === 'from') setEditFrom(code);
    else if (editActiveField === 'to') setEditTo(code);
    setEditActiveSugs([]);
    setEditActiveField(null);
  }

  function selectEditAirline(name: string) {
    setEditAirline(name);
    setEditAirlineSugs([]);
    setEditActiveField(null);
  }

  function onEditInputBlur() {
    //delay lets the suggestion tap register before the list disappears
    setTimeout(() => { setEditActiveSugs([]); setEditAirlineSugs([]); }, 150);
  }

  function handleDelete(id: number) {
    deleteFlight(id);
    refresh();
    onFlightChange();
  }

  const aircraftItems = makeCountItems(
    flights,
    flight => flight.aircraft ? [flight.aircraft] : [],
    (key, count) => ({
      key,
      label: key,
      sublabel: `${count} ${count === 1 ? 'Flight' : 'Flights'} logged`,
      count,
      image: getAircraftImage(key),
    }),
  );

  const airlineItems = makeCountItems(
    flights,
    flight => flight.airline ? [flight.airline] : [],
    (key, count) => ({
      key,
      label: key,
      sublabel: `${count} ${count === 1 ? 'Flight' : 'Flights'}`,
      count,
      image: getAirlineImage(key),
    }),
  );

  const airportItems = makeCountItems(
    flights,
    flight => [flight.from, flight.to],
    (key, count) => ({
      key,
      code: key,
      label: getAirportName(key),
      sublabel: `${count} ${count === 1 ? 'Visit' : 'Visits'}`,
      count,
    }),
  );

  const summary = {
    flights: flights.length,
    aircraft: aircraftItems.length,
    airlines: airlineItems.length,
    airports: airportItems.length,
  };

  const currentData = activeTab === 'flights'
    ? flights
    : activeTab === 'aircraft'
      ? aircraftItems
      : activeTab === 'airlines'
        ? airlineItems
        : airportItems;
  const currentCountMax = activeTab === 'flights'
    ? 1
    : Math.max(...(currentData as CountItem[]).map(item => item.count), 1);

  function renderItem({ item }: { item: Flight | CountItem }) {
    if (activeTab === 'flights') {
      const flight = item as Flight;
      return (
        <FlightRow
          item={flight}
          onEdit={() => openEdit(flight)}
          onDelete={() => handleDelete(flight.id)}
        />
      );
    }
    return (
      <CountTile
        item={item as CountItem}
        max={currentCountMax}
        kind={activeTab === 'aircraft' ? 'aircraft' : activeTab === 'airlines' ? 'airline' : 'airport'}
        color={tabColor(activeTab)}
        wash={tabWash(activeTab)}
      />
    );
  }

  function emptyText(): string {
    if (activeTab === 'flights') return 'no flights logged yet';
    if (activeTab === 'aircraft') return 'no aircraft logged yet';
    if (activeTab === 'airlines') return 'no airlines logged yet';
    return 'no airports logged yet';
  }

  return (
    <Animated.View
      style={[s.overlay, { transform: [{ translateY }] }]}
      pointerEvents={visible ? 'auto' : 'none'}
    >
      {/*header*/}
      <View style={s.header}>
        <View style={s.titleBlock}>
          <Text style={s.title} numberOfLines={1} allowFontScaling={false} adjustsFontSizeToFit minimumFontScale={0.78}>Logbook</Text>
          <Text style={s.subtitle} numberOfLines={1} allowFontScaling={false} adjustsFontSizeToFit minimumFontScale={0.72}>{summary.flights} flights · {summary.airports} airports</Text>
        </View>
        <TouchableOpacity onPress={onClose} style={s.closeBtn}>
          <Text style={s.closeTxt}>✕</Text>
        </TouchableOpacity>
      </View>

      <View style={s.tabs}>
        {TABS.map(tab => (
          <TabButton key={tab.key} tab={tab} active={activeTab === tab.key} onPress={() => setActiveTab(tab.key)} />
        ))}
      </View>

      <FlatList
        key={activeTab === 'flights' ? 'flights' : 'tiles'}
        data={currentData}
        numColumns={activeTab === 'flights' ? 1 : 2}
        columnWrapperStyle={activeTab === 'flights' ? undefined : s.tileRow}
        keyExtractor={item => String(activeTab === 'flights' ? (item as Flight).id : (item as CountItem).key)}
        renderItem={renderItem}
        ItemSeparatorComponent={activeTab === 'flights' ? RowGap : undefined}
        contentContainerStyle={s.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={<Text style={s.empty}>{emptyText()}</Text>}
      />

      {/*edit panel — absolute so it overlays the list*/}
      {editingFlight && (
        <KeyboardAvoidingView style={s.editOverlay} behavior={Platform.OS === 'android' ? 'height' : 'padding'}>
          <TouchableOpacity style={s.editBackdrop} onPress={cancelEdit} activeOpacity={1} />
            <Animated.View style={[s.editSheet, { transform: [{ translateY: editTranslateY }] }]}>
              <View style={s.editHeader}>
                <Text style={s.editTitle}>Edit Flight</Text>
                <TouchableOpacity onPress={cancelEdit} style={s.closeBtn}>
                  <Text style={s.closeTxt}>✕</Text>
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                {/*route inputs — wrapper lifts suggestions above siblings via zIndex*/}
                <View style={s.routeWrapper}>
                  <View style={s.routeCard} onLayout={e => setEditRouteH(e.nativeEvent.layout.height)}>
                    <View style={s.routeSide}>
                      <Text style={s.routeTag}>FROM</Text>
                      <TextInput
                        style={[s.iataInput, editFrom.length > 4 && s.iataInputSearch]}
                        value={editFrom}
                        onChangeText={onEditFromChange}
                        onFocus={() => { setEditActiveField('from'); setEditActiveSugs(searchAirports(editFrom)); }}
                        onBlur={onEditInputBlur}
                        placeholder="LHR"
                        placeholderTextColor="#6f6f6f"
                        autoCapitalize="none"
                        autoCorrect={false}
                      />
                    </View>
                    <View style={s.routeMidEdit}>
                      <View style={s.routeLineEdit} />
                      <Text style={s.planeTxtEdit}>✈</Text>
                      <View style={s.routeLineEdit} />
                    </View>
                    <View style={[s.routeSide, s.routeSideRight]}>
                      <Text style={[s.routeTag, s.routeTagRight]}>TO</Text>
                      <TextInput
                        style={[s.iataInput, s.iataInputRight, editTo.length > 4 && s.iataInputSearch]}
                        value={editTo}
                        onChangeText={onEditToChange}
                        onFocus={() => { setEditActiveField('to'); setEditActiveSugs(searchAirports(editTo)); }}
                        onBlur={onEditInputBlur}
                        placeholder="JFK"
                        placeholderTextColor="#6f6f6f"
                        autoCapitalize="none"
                        autoCorrect={false}
                        textAlign="right"
                      />
                    </View>
                  </View>

                  {/*suggestion dropdown — absolute so it overlays the detail card below*/}
                  {editActiveSugs.length > 0 && (
                    <View style={[s.sugList, { top: editRouteH }]}>
                      {editActiveSugs.map((sug, idx) => (
                        <React.Fragment key={sug.code}>
                          {idx > 0 && <View style={s.sugRule} />}
                          <TouchableOpacity style={s.sugItem} onPress={() => selectEditSuggestion(sug.code)}>
                            <Text style={s.sugCode}>{sug.code}</Text>
                            <Text style={s.sugName} numberOfLines={1}>{sug.name}</Text>
                          </TouchableOpacity>
                        </React.Fragment>
                      ))}
                    </View>
                  )}
                </View>

              {/*detail inputs*/}
              <View style={s.detailWrapper}>
                <View style={s.detailCard}>
                  <View style={s.detailRow}>
                    <Text style={s.detailTag}>AIRCRAFT</Text>
                    <TextInput
                      style={s.detailInput}
                      value={editAircraft}
                      onChangeText={setEditAircraft}
                      placeholder="Boeing 737-800"
                      placeholderTextColor="#6f6f6f"
                    />
                  </View>
                  <View style={s.detailRule} />
                  <View style={s.detailRow}>
                    <Text style={s.detailTag}>MSN</Text>
                    <TextInput
                      style={s.detailInput}
                      value={editMsn}
                      onChangeText={setEditMsn}
                      placeholder="386"
                      placeholderTextColor="#6f6f6f"
                      autoCapitalize="characters"
                      autoCorrect={false}
                    />
                  </View>
                  <View style={s.detailRule} />
                  <View style={s.detailRow}>
                    <Text style={s.detailTag}>REGISTRATION</Text>
                    <TextInput
                      style={s.detailInput}
                      value={editRegistration}
                      onChangeText={setEditRegistration}
                      placeholder="G-XLEA"
                      placeholderTextColor="#6f6f6f"
                      autoCapitalize="characters"
                      autoCorrect={false}
                    />
                  </View>
                  <View style={s.detailRule} />
                  <View
                    style={s.detailRow}
                    onLayout={e => setEditAirlineSugTop(e.nativeEvent.layout.y + e.nativeEvent.layout.height)}
                  >
                    <Text style={s.detailTag}>AIRLINE</Text>
                    <TextInput
                      style={s.detailInput}
                      value={editAirline}
                      onChangeText={onEditAirlineChange}
                      onFocus={() => { setEditActiveField('airline'); setEditAirlineSugs(searchAirlines(editAirline)); }}
                      onBlur={onEditInputBlur}
                      placeholder="British Airways"
                      placeholderTextColor="#6f6f6f"
                    />
                  </View>
                  <View style={s.detailRule} />
                  <View style={s.compactGrid}>
                    <View style={s.compactCell}>
                      <Text style={s.detailTag}>DEP RWY</Text>
                      <TextInput
                        style={s.detailInput}
                        value={editDepRunway}
                        onChangeText={setEditDepRunway}
                        placeholder="27L"
                        placeholderTextColor="#6f6f6f"
                        autoCapitalize="characters"
                        autoCorrect={false}
                      />
                    </View>
                    <View style={s.compactRule} />
                    <View style={s.compactCell}>
                      <Text style={s.detailTag}>ARR RWY</Text>
                      <TextInput
                        style={s.detailInput}
                        value={editArrRunway}
                        onChangeText={setEditArrRunway}
                        placeholder="04R"
                        placeholderTextColor="#6f6f6f"
                        autoCapitalize="characters"
                        autoCorrect={false}
                      />
                    </View>
                  </View>
                  <View style={s.detailRule} />
                  <View style={s.compactGrid}>
                    <View style={s.compactCell}>
                      <Text style={s.detailTag}>CRUISE ALT</Text>
                      <TextInput
                        style={s.detailInput}
                        value={editCruiseAltitude}
                        onChangeText={setEditCruiseAltitude}
                        placeholder="FL380"
                        placeholderTextColor="#6f6f6f"
                        autoCapitalize="characters"
                        autoCorrect={false}
                      />
                    </View>
                    <View style={s.compactRule} />
                    <View style={s.compactCell}>
                      <Text style={s.detailTag}>CLASS</Text>
                      <TextInput
                        style={s.detailInput}
                        value={editCabinClass}
                        onChangeText={setEditCabinClass}
                        placeholder="Economy"
                        placeholderTextColor="#6f6f6f"
                      />
                    </View>
                  </View>
                  <View style={s.detailRule} />
                  <DatePickerField
                    value={editDate}
                    onChange={setEditDate}
                    rowStyle={s.detailRow}
                    tagStyle={s.detailTag}
                    inputStyle={s.detailInput}
                  />
                </View>

                {editAirlineSugs.length > 0 && (
                  <View style={[s.sugList, { top: editAirlineSugTop }]}>
                    {editAirlineSugs.map((sug, idx) => (
                      <React.Fragment key={sug.icao}>
                        {idx > 0 && <View style={s.sugRule} />}
                        <TouchableOpacity style={s.sugItem} onPress={() => selectEditAirline(sug.name)}>
                          <Text style={s.sugCode}>{sug.icao}</Text>
                          <Text style={s.sugName} numberOfLines={1}>{sug.name}</Text>
                        </TouchableOpacity>
                      </React.Fragment>
                    ))}
                  </View>
                )}
              </View>

              <TouchableOpacity style={s.saveBtn} onPress={saveEdit}>
                <Text style={s.saveTxt}>Save Changes</Text>
                <Text style={s.saveIcon}>✈</Text>
              </TouchableOpacity>
              </ScrollView>
            </Animated.View>
        </KeyboardAvoidingView>
      )}
    </Animated.View>
  );
}

// ─── styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: COLORS.bg,
  },

  //header
  header: {
    paddingTop: HEADER_TOP,
    paddingHorizontal: 20,
    paddingBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.line,
  },
  titleBlock: {
    flex: 1,
    minWidth: 0,
    paddingRight: 12,
  },
  title: {
    color: COLORS.text,
    fontSize: 21,
    fontWeight: '800',
  },
  subtitle: {
    color: COLORS.muted,
    fontSize: 11,
    fontWeight: '700',
    marginTop: 3,
    width: '100%',
  },
  closeBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeTxt: {
    color: COLORS.muted,
    fontSize: 17,
  },
  tabs: {
    flexDirection: 'row',
    gap: 7,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 6,
  },
  tabBtn: {
    flex: 1,
    height: 38,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.whiteLine,
    paddingHorizontal: 4,
  },
  tabBtnActive: {
    backgroundColor: COLORS.amber,
    borderColor: '#ffb15f',
  },
  tabTxt: {
    color: COLORS.muted,
    fontSize: 11,
    fontWeight: '800',
  },
  tabTxtActive: {
    color: COLORS.ink,
  },

  //list
  listContent: {
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 40,
  },
  tileRow: {
    gap: 8,
    marginBottom: 8,
  },
  empty: {
    color: COLORS.dim,
    fontSize: 14,
    textAlign: 'center',
    marginTop: 60,
  },

  //flight card
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.whiteLine,
    padding: 12,
  },
  flightTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  dateChip: {
    maxWidth: '70%',
    borderRadius: 999,
    backgroundColor: 'rgba(255, 138, 61, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255, 138, 61, 0.24)',
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  dateChipText: {
    color: COLORS.amber,
    fontSize: 11,
    fontWeight: '800',
  },
  distanceText: {
    color: COLORS.teal,
    fontSize: 12,
    fontWeight: '800',
  },
  aircraftIcon: {
    width: COMPACT_W ? 104 : 122,
    height: COMPACT_W ? 96 : 112,
  },
  aircraftIconPlaceholder: {
    width: COMPACT_W ? 104 : 122,
    height: COMPACT_W ? 96 : 112,
  },
  routeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  airportBlock: {
    width: COMPACT_W ? 66 : 78,
  },
  airportBlockRight: {
    alignItems: 'flex-end',
  },
  airportCode: {
    color: COLORS.text,
    fontSize: COMPACT_W ? 23 : 25,
    fontWeight: '900',
    letterSpacing: 1,
  },
  airportCodeRight: {
    textAlign: 'right',
  },
  airportName: {
    color: COLORS.muted,
    fontSize: 10,
    fontWeight: '700',
    lineHeight: 13,
    flex: 1,
    paddingRight: 8,
  },
  airportNameRight: {
    textAlign: 'right',
    paddingRight: 0,
    paddingLeft: 8,
  },
  airportNameRow: {
    flexDirection: 'row',
    marginTop: 5,
  },
  routeMid: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
    paddingTop: 0,
  },
  routeLine: {
    flex: 1,
    height: 2,
    backgroundColor: 'rgba(255, 79, 123, 0.34)',
    borderRadius: 2,
  },
  planeTxt: {
    color: COLORS.amber,
    fontSize: 20,
    lineHeight: 20,
    paddingHorizontal: 5,
    marginTop: -3,
  },
  flightLower: {
    flexDirection: 'row',
    alignItems: 'stretch',
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.line,
  },
  aircraftMedia: {
    width: COMPACT_W ? 106 : 124,
    minHeight: COMPACT_W ? 102 : 118,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  flightLowerBody: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  flightMeta: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
  },
  infoLine: {
    color: COLORS.text,
    fontSize: 14,
    lineHeight: 20,
    width: '100%',
  },
  aircraftLine: {
    color: COLORS.amber,
    fontSize: COMPACT_W ? 15 : 17,
    lineHeight: COMPACT_W ? 20 : 22,
    fontWeight: '800',
    width: '100%',
  },
  identityLine: {
    color: COLORS.teal,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.7,
    marginTop: 2,
    width: '100%',
  },
  opsLine: {
    color: COLORS.muted,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '700',
    marginTop: 6,
    width: '100%',
  },
  profileLine: {
    color: COLORS.amber,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '800',
    width: '100%',
  },
  actions: {
    width: 38,
    gap: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionBtn: {
    width: 36,
    height: 34,
    borderRadius: 8,
    backgroundColor: COLORS.surface2,
    borderWidth: 1,
    borderColor: COLORS.whiteLine,
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editBtn: {
    borderColor: 'rgba(255, 138, 61, 0.20)',
    backgroundColor: 'rgba(255, 138, 61, 0.06)',
  },
  deleteBtn: {
    borderColor: 'rgba(239, 68, 68, 0.22)',
    backgroundColor: 'rgba(239, 68, 68, 0.06)',
  },
  editGlyph: {
    width: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ rotate: '-35deg' }],
  },
  editGlyphLine: {
    width: 3,
    height: 13,
    borderRadius: 2,
    backgroundColor: COLORS.amber,
  },
  editGlyphTip: {
    width: 0,
    height: 0,
    borderLeftWidth: 2,
    borderRightWidth: 2,
    borderTopWidth: 3,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: COLORS.amber,
    marginTop: 1,
  },
  deleteGlyph: {
    width: 15,
    height: 16,
    alignItems: 'center',
  },
  deleteGlyphLid: {
    width: 13,
    height: 2,
    borderRadius: 2,
    backgroundColor: COLORS.red,
    marginBottom: 2,
  },
  deleteGlyphBody: {
    width: 12,
    height: 11,
    borderWidth: 1.5,
    borderTopWidth: 0,
    borderColor: COLORS.red,
    borderBottomLeftRadius: 2,
    borderBottomRightRadius: 2,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 2,
    paddingTop: 2,
  },
  deleteGlyphLine: {
    width: 1,
    height: 6,
    borderRadius: 1,
    backgroundColor: COLORS.red,
  },
  entityTile: {
    width: '48%',
    minHeight: 162,
    flex: 1,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.whiteLine,
    padding: 8,
  },
  entityTileTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  entityTileCount: { fontSize: 16, fontWeight: '900' },
  entityVisual: {
    height: COMPACT_W ? 92 : 106,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  entityTileAircraft: { width: '122%', height: COMPACT_W ? 92 : 106 },
  entityTileLogo: { width: '112%', height: COMPACT_W ? 76 : 88 },
  entityTileCode: { fontSize: COMPACT_W ? 34 : 40, fontWeight: '900', letterSpacing: 1 },
  entityTileLabel: { color: COLORS.text, fontSize: 12, fontWeight: '800', textAlign: 'center', marginTop: 2 },
  entityTileSub: { color: COLORS.muted, fontSize: 10, fontWeight: '700', textAlign: 'center', marginTop: 2 },
  entityTileTrack: {
    height: 4,
    backgroundColor: 'rgba(7, 17, 31, 0.56)',
    borderRadius: 3,
    overflow: 'hidden',
    marginTop: 7,
  },
  entityTileFill: { height: '100%', borderRadius: 3 },

  //edit panel
  editOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    justifyContent: 'flex-end',
  },
  editBackdrop: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  editSheet: {
    backgroundColor: COLORS.sheet,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    borderWidth: 1,
    borderColor: COLORS.whiteLine,
    paddingHorizontal: 18,
    paddingTop: 22,
    paddingBottom: Platform.OS === 'android' ? 72 : 44,
    maxHeight: SCREEN_H * 0.92,
  },
  editHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  editTitle: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: '800',
  },

  //route card (edit) — wrapper lifts suggestions above siblings via zIndex
  routeWrapper: {
    zIndex: 10,
    marginBottom: 10,
  },
  routeCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.whiteLine,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  routeSide: { flex: 1, minWidth: 0 },
  routeSideRight: { alignItems: 'flex-end' },
  routeTag: {
    color: COLORS.muted,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 2,
    marginBottom: 6,
  },
  routeTagRight: { textAlign: 'right' },
  iataInput: {
    color: COLORS.text,
    fontSize: 34,
    fontWeight: '700',
    letterSpacing: 2,
    padding: 0,
    minWidth: 0,
  },
  iataInputRight: { textAlign: 'right' },
  iataInputSearch: {
    fontSize: 15,
    fontWeight: '500',
    letterSpacing: 0,
  },

  //suggestion dropdown — floats over detail card, no layout impact
  sugList: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 10,
    backgroundColor: COLORS.surface2,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.whiteLine,
  },
  sugItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  sugCode: {
    color: COLORS.amber,
    fontSize: 13,
    fontWeight: '700',
    width: 36,
  },
  sugName: {
    color: COLORS.text,
    fontSize: 13,
    flex: 1,
  },
  sugRule: {
    height: 1,
    backgroundColor: COLORS.line,
    marginLeft: 16,
  },
  routeMidEdit: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
    paddingTop: 22,
  },
  routeLineEdit: {
    flex: 1,
    height: 2,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 79, 123, 0.34)',
  },
  planeTxtEdit: { color: COLORS.amber, fontSize: 20, lineHeight: 20, paddingHorizontal: 5, marginTop: -3 },

  //detail card (edit)
  detailWrapper: {
    zIndex: 6,
    marginBottom: 10,
  },
  detailCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.whiteLine,
    overflow: 'hidden',
  },
  detailRow: {
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  compactGrid: {
    flexDirection: 'row',
  },
  compactCell: {
    flex: 1,
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  compactRule: {
    width: 1,
    backgroundColor: COLORS.line,
  },
  detailTag: {
    color: COLORS.muted,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 2,
    marginBottom: 6,
  },
  detailInput: {
    color: COLORS.text,
    fontSize: 15,
    padding: 0,
  },
  detailRule: {
    height: 1,
    backgroundColor: COLORS.line,
  },

  //save button
  saveBtn: {
    backgroundColor: 'rgba(255, 138, 61, 0.12)',
    borderRadius: 8,
    paddingVertical: 16,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: 'rgba(255, 138, 61, 0.28)',
  },
  saveTxt: {
    color: COLORS.amber,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
    flex: 1,
  },
  saveIcon: {
    color: COLORS.amber,
    fontSize: 17,
  },
});
