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
  bg: '#07111f',
  sheet: '#0c1826',
  surface: 'rgba(20, 32, 51, 0.82)',
  surface2: 'rgba(24, 40, 61, 0.84)',
  line: 'rgba(117, 146, 170, 0.24)',
  text: '#edf4f7',
  muted: '#8392a5',
  dim: '#536377',
  amber: '#f0b35a',
  teal: '#65d0c2',
  coral: '#ff7f6e',
  red: '#ef4444',
  ink: '#07111f',
  whiteLine: 'rgba(255,255,255,0.07)',
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
  if (tab === 'aircraft') return '#8bb7ff';
  if (tab === 'airlines') return COLORS.teal;
  return COLORS.amber;
}

function tabWash(tab: LogbookTab): string {
  if (tab === 'aircraft') return 'rgba(139, 183, 255, 0.12)';
  if (tab === 'airlines') return 'rgba(101, 208, 194, 0.12)';
  return 'rgba(240, 179, 90, 0.12)';
}

const SCREEN_H   = Dimensions.get('window').height;
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

function FlightRow({ item, onEdit, onDelete }: RowProps) {
  const aircraftImg = getAircraftImage(item.aircraft);
  return (
    <View style={s.card}>
      <View style={s.flightTop}>
        <View style={s.dateChip}>
          <Text style={s.dateChipText} numberOfLines={1} allowFontScaling={false}>{formatDate(item.date)}</Text>
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
            <Text style={s.aircraftLine} numberOfLines={1}>{item.aircraft ?? 'Aircraft not logged'}</Text>
            <Text style={s.infoLine} numberOfLines={1}>{item.airline ?? 'Airline not logged'}</Text>
            {item.registration ? <Text style={s.regLine} numberOfLines={1}>{item.registration}</Text> : null}
          </View>

          <View style={s.actions}>
            <TouchableOpacity onPress={onEdit} style={s.actionBtn}>
              <Text style={s.editTxt} allowFontScaling={false}>Edit</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={onDelete} style={s.actionBtn}>
              <Text style={s.deleteTxt} allowFontScaling={false}>Delete</Text>
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
      <Text style={[s.tabTxt, active && s.tabTxtActive]} allowFontScaling={false} numberOfLines={1}>{tab.label}</Text>
    </TouchableOpacity>
  );
}

function CountTile({ item, index, max, kind, color, wash }: { item: CountItem; index: number; max: number; kind: 'aircraft' | 'airline' | 'airport'; color: string; wash: string }) {
  return (
    <View style={[s.entityTile, { backgroundColor: wash }]}>
      <View style={s.entityTileTop}>
        <Text style={s.entityTileRank} allowFontScaling={false}>0{index + 1}</Text>
        <Text style={[s.entityTileCount, { color }]} allowFontScaling={false}>{item.count}</Text>
      </View>
      <View style={s.entityVisual}>
        {kind === 'airport'
          ? <Text style={[s.entityTileCode, { color }]} allowFontScaling={false}>{item.code}</Text>
          : item.image
            ? <Image source={item.image} style={kind === 'airline' ? s.entityTileLogo : s.entityTileAircraft} resizeMode="contain" />
            : <Text style={[s.entityTileCode, { color }]} allowFontScaling={false}>{item.label.slice(0, 3).toUpperCase()}</Text>
        }
      </View>
      <Text style={s.entityTileLabel} numberOfLines={1} adjustsFontSizeToFit>{item.label}</Text>
      <Text style={s.entityTileSub} numberOfLines={1}>{item.sublabel}</Text>
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

  const [flights,         setFlights]         = useState<Flight[]>([]);
  const [activeTab,       setActiveTab]       = useState<LogbookTab>('flights');
  const [editingFlight,   setEditingFlight]   = useState<Flight | null>(null);
  const [editFrom,        setEditFrom]        = useState('');
  const [editTo,          setEditTo]          = useState('');
  const [editAircraft,    setEditAircraft]    = useState('');
  const [editRegistration, setEditRegistration] = useState('');
  const [editAirline,     setEditAirline]     = useState('');
  const [editDate,        setEditDate]        = useState('');
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
    setEditActiveSugs([]);
    setEditAirlineSugs([]);
    setEditActiveField(null);
    setEditingFlight(flight);
  }

  function cancelEdit() {
    Keyboard.dismiss();
    setEditingFlight(null);
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
    );
    Keyboard.dismiss();
    setEditingFlight(null);
    refresh();
    onFlightChange();
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
      sublabel: `${count} ${count === 1 ? 'flight' : 'flights'} logged`,
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
      sublabel: `${count} ${count === 1 ? 'sector' : 'sectors'}`,
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
      sublabel: `${key} · ${count} ${count === 1 ? 'visit' : 'visits'}`,
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

  function renderItem({ item, index }: { item: Flight | CountItem; index: number }) {
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
        index={index}
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
          <Text style={s.title} numberOfLines={1} allowFontScaling={false}>Logbook</Text>
          <Text style={s.subtitle} numberOfLines={1} allowFontScaling={false}>{summary.flights} flights · {summary.airports} airports</Text>
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
            <View style={s.editSheet}>
              <View style={s.editHeader}>
                <Text style={s.editTitle}>Edit Flight</Text>
                <TouchableOpacity onPress={cancelEdit} style={s.closeBtn}>
                  <Text style={s.closeTxt}>✕</Text>
                </TouchableOpacity>
              </View>

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
                      placeholderTextColor="#253548"
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
                      placeholderTextColor="#253548"
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
                      placeholderTextColor="#253548"
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
                      placeholderTextColor="#253548"
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
                      placeholderTextColor="#253548"
                    />
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
            </View>
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
    borderColor: '#ffd08a',
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
    backgroundColor: 'rgba(240, 179, 90, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(240, 179, 90, 0.24)',
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
    width: 92,
    height: 86,
  },
  aircraftIconPlaceholder: {
    width: 92,
    height: 86,
  },
  routeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  airportBlock: {
    width: 78,
  },
  airportBlockRight: {
    alignItems: 'flex-end',
  },
  airportCode: {
    color: COLORS.text,
    fontSize: 25,
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
    backgroundColor: 'rgba(240, 179, 90, 0.38)',
    borderRadius: 2,
  },
  planeTxt: {
    color: COLORS.amber,
    fontSize: 20,
    lineHeight: 22,
    paddingHorizontal: 5,
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
    width: 98,
    minHeight: 92,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  flightLowerBody: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'space-between',
  },
  flightMeta: {
    flex: 1,
    minWidth: 0,
  },
  infoLine: {
    color: COLORS.text,
    fontSize: 13,
    lineHeight: 19,
    width: '100%',
  },
  aircraftLine: {
    color: COLORS.amber,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '800',
    width: '100%',
  },
  regLine: {
    color: COLORS.teal,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
    marginTop: 1,
    width: '100%',
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'flex-end',
    marginTop: 10,
  },
  actionBtn: {
    minWidth: 86,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor: COLORS.surface2,
    borderWidth: 1,
    borderColor: COLORS.whiteLine,
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editTxt: {
    color: COLORS.amber,
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    width: '100%',
  },
  deleteTxt: {
    color: COLORS.red,
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    width: '100%',
  },
  entityTile: {
    width: '48%',
    minHeight: 150,
    flex: 1,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.whiteLine,
    padding: 10,
  },
  entityTileTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  entityTileRank: { color: COLORS.dim, fontSize: 10, fontWeight: '800' },
  entityTileCount: { fontSize: 16, fontWeight: '900' },
  entityVisual: {
    height: 62,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  entityTileAircraft: { width: '100%', height: 62 },
  entityTileLogo: { width: '100%', height: 54 },
  entityTileCode: { fontSize: 27, fontWeight: '900', letterSpacing: 1 },
  entityTileLabel: { color: COLORS.text, fontSize: 12, fontWeight: '800', textAlign: 'center', marginTop: 4 },
  entityTileSub: { color: COLORS.muted, fontSize: 10, fontWeight: '700', textAlign: 'center', marginTop: 2 },
  entityTileTrack: {
    height: 4,
    backgroundColor: 'rgba(7, 17, 31, 0.56)',
    borderRadius: 3,
    overflow: 'hidden',
    marginTop: 9,
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
    backgroundColor: 'rgba(7,17,31,0.74)',
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
  routeSide: { flex: 1 },
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
    minWidth: 80,
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
    flex: 1.4,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
    paddingTop: 8,
  },
  routeLineEdit: {
    flex: 1,
    height: 2,
    borderRadius: 2,
    backgroundColor: 'rgba(240, 179, 90, 0.38)',
  },
  planeTxtEdit: { color: COLORS.amber, fontSize: 22, lineHeight: 24, paddingHorizontal: 5 },

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
    backgroundColor: 'rgba(240, 179, 90, 0.12)',
    borderRadius: 8,
    paddingVertical: 16,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: 'rgba(240, 179, 90, 0.28)',
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
