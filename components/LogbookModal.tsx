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
import { DatePickerField } from './DatePickerField';
import { getAllFlights, deleteFlight, updateFlight, Flight } from '../data/db';
import { log } from '../utils/logger';

const BUILD_TAG = 'BUILD-MARKER v8 — fixed-width buttons';

const ACCENT = 'rgb(0, 255, 175)';

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
      <View style={s.cardInner}>
        {/*aircraft icon column*/}
        <View style={s.iconCol}>
          {aircraftImg
            ? <Image source={aircraftImg} style={s.aircraftIcon} resizeMode="contain" />
            : <View style={s.aircraftIconPlaceholder} />}
        </View>

        {/*content column*/}
        <View style={s.contentCol}>
          <View style={s.routeRow}>
            <Text style={s.iata}>{item.from}</Text>
            <View style={s.routeMid}>
              <View style={s.routeLine} />
              <Text style={s.planeTxt}>✈</Text>
              <View style={s.routeLine} />
            </View>
            <Text style={s.iata}>{item.to}</Text>
          </View>

          {item.aircraft     ? <Text style={s.aircraftLine}>{item.aircraft}</Text> : null}
          {item.registration ? <Text style={s.regLine}>{item.registration}</Text> : null}
          {item.airline      ? <Text style={s.infoLine}>{item.airline}</Text>  : null}

          <Text style={s.date} allowFontScaling={false}>{formatDate(item.date)}</Text>
          <View style={s.cardBottom}>
            <View style={s.actions}>
              <TouchableOpacity
                onPress={onEdit}
                style={s.actionBtn}
                onLayout={e => log('info', `EDIT btn box w=${e.nativeEvent.layout.width.toFixed(1)}`)}
              >
                <Text
                  style={s.editTxt}
                  allowFontScaling={false}
                  onLayout={e => log('info', `EDIT text w=${e.nativeEvent.layout.width.toFixed(1)} h=${e.nativeEvent.layout.height.toFixed(1)}`)}
                >Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={onDelete}
                style={s.actionBtn}
                onLayout={e => log('info', `DELETE btn box w=${e.nativeEvent.layout.width.toFixed(1)}`)}
              >
                <Text
                  style={s.deleteTxt}
                  allowFontScaling={false}
                  onLayout={e => log('info', `DELETE text w=${e.nativeEvent.layout.width.toFixed(1)} h=${e.nativeEvent.layout.height.toFixed(1)}`)}
                >Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}

function RowGap() { return <View style={{ height: 8 }} />; }

// ─── logbook modal ─────────────────────────────────────────────────────────────

export function LogbookModal({ visible, onClose, onFlightChange }: Props) {
  const translateY = useRef(new Animated.Value(SCREEN_H)).current;

  const [flights,         setFlights]         = useState<Flight[]>([]);
  const [editingFlight,   setEditingFlight]   = useState<Flight | null>(null);
  const [editFrom,        setEditFrom]        = useState('');
  const [editTo,          setEditTo]          = useState('');
  const [editAircraft,    setEditAircraft]    = useState('');
  const [editRegistration, setEditRegistration] = useState('');
  const [editAirline,     setEditAirline]     = useState('');
  const [editDate,        setEditDate]        = useState('');
  const [editActiveSugs,  setEditActiveSugs]  = useState<Suggestion[]>([]);
  const [editActiveField, setEditActiveField] = useState<'from' | 'to' | null>(null);
  const [editRouteH,      setEditRouteH]      = useState(0);

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

  function selectEditSuggestion(code: string) {
    if (editActiveField === 'from') setEditFrom(code);
    else if (editActiveField === 'to') setEditTo(code);
    setEditActiveSugs([]);
    setEditActiveField(null);
  }

  function onEditInputBlur() {
    //delay lets the suggestion tap register before the list disappears
    setTimeout(() => setEditActiveSugs([]), 150);
  }

  function handleDelete(id: number) {
    deleteFlight(id);
    refresh();
    onFlightChange();
  }

  return (
    <Animated.View
      style={[s.overlay, { transform: [{ translateY }] }]}
      pointerEvents={visible ? 'auto' : 'none'}
    >
      {/*header*/}
      <View style={s.header}>
        <Text style={s.title}>Logbook</Text>
        <TouchableOpacity onPress={onClose} style={s.closeBtn}>
          <Text style={s.closeTxt}>✕</Text>
        </TouchableOpacity>
      </View>

      {/*flight list*/}
      <FlatList
        data={flights}
        keyExtractor={item => String(item.id)}
        renderItem={({ item }) => (
          <FlightRow
            item={item}
            onEdit={() => openEdit(item)}
            onDelete={() => handleDelete(item.id)}
          />
        )}
        ItemSeparatorComponent={RowGap}
        contentContainerStyle={s.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={<Text style={s.empty}>no flights logged yet</Text>}
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
                <View style={s.detailRow}>
                  <Text style={s.detailTag}>AIRLINE</Text>
                  <TextInput
                    style={s.detailInput}
                    value={editAirline}
                    onChangeText={setEditAirline}
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
    backgroundColor: '#050a18',
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
    borderBottomColor: '#111827',
  },
  title: {
    color: '#f3f4f6',
    fontSize: 18,
    fontWeight: '700',
    flex: 1,
  },
  closeBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeTxt: {
    color: '#4b5563',
    fontSize: 17,
  },

  //list
  listContent: {
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 40,
  },
  empty: {
    color: '#374151',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 60,
  },

  //flight card
  card: {
    backgroundColor: '#111827',
    borderRadius: 12,
    padding: 14,
  },
  cardInner: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconCol: {
    width: 60,
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  aircraftIcon: {
    width: 60,
    height: 60,
  },
  aircraftIconPlaceholder: {
    width: 60,
    height: 60,
  },
  contentCol: {
    flex: 1,
  },
  routeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iata: {
    color: '#f3f4f6',
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: 1,
    minWidth: 52,
  },
  routeMid: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  routeLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#1e2d3d',
  },
  planeTxt: {
    color: '#374151',
    fontSize: 13,
    paddingHorizontal: 4,
  },
  infoLine: {
    color: '#f3f4f6',
    fontSize: 15,
    lineHeight: 22,
    marginTop: 2,
    width: '100%',
  },
  aircraftLine: {
    color: ACCENT,
    fontSize: 15,
    lineHeight: 22,
    marginTop: 2,
    width: '100%',
  },
  regLine: {
    color: '#9ca3af',
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 1,
    marginTop: 2,
    width: '100%',
  },
  cardBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 10,
  },
    date: {
    color: '#f3f4f6',
    fontSize: 12,
    width: '100%',
    marginTop: 8,
  },
  actions: {
    flexDirection: 'row',
    gap: 6,
    flexShrink: 0,
  },
  actionBtn: {
    width: 96,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: '#1a2535',
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editTxt: {
    color: ACCENT,
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    width: '100%',
  },
  deleteTxt: {
    color: '#ef4444',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    width: '100%',
  },

  //edit panel
  editOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    justifyContent: 'flex-end',
  },
  editBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(5,10,24,0.7)',
  },
  editSheet: {
    backgroundColor: '#111827',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
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
    color: '#f3f4f6',
    fontSize: 18,
    fontWeight: '700',
  },

  //route card (edit) — wrapper lifts suggestions above siblings via zIndex
  routeWrapper: {
    zIndex: 10,
    marginBottom: 10,
  },
  routeCard: {
    backgroundColor: '#1a2535',
    borderRadius: 16,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  routeSide: { flex: 1 },
  routeSideRight: { alignItems: 'flex-end' },
  routeTag: {
    color: '#4b5563',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 2,
    marginBottom: 6,
  },
  routeTagRight: { textAlign: 'right' },
  iataInput: {
    color: '#f3f4f6',
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
    backgroundColor: '#1a2535',
    borderRadius: 12,
    overflow: 'hidden',
  },
  sugItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  sugCode: {
    color: ACCENT,
    fontSize: 13,
    fontWeight: '700',
    width: 36,
  },
  sugName: {
    color: '#f3f4f6',
    fontSize: 13,
    flex: 1,
  },
  sugRule: {
    height: 1,
    backgroundColor: '#111827',
    marginLeft: 16,
  },
  routeMidEdit: {
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingTop: 14,
    gap: 4,
  },
  routeLineEdit: {
    width: 22,
    height: 1,
    backgroundColor: '#2d3f52',
  },
  planeTxtEdit: { color: '#4b5563', fontSize: 16 },

  //detail card (edit)
  detailCard: {
    backgroundColor: '#1a2535',
    borderRadius: 16,
    marginBottom: 10,
    overflow: 'hidden',
  },
  detailRow: {
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  detailTag: {
    color: '#4b5563',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 2,
    marginBottom: 6,
  },
  detailInput: {
    color: '#f3f4f6',
    fontSize: 15,
    padding: 0,
  },
  detailRule: {
    height: 1,
    backgroundColor: '#111827',
  },

  //save button
  saveBtn: {
    backgroundColor: '#0f1e30',
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 175, 0.2)',
  },
  saveTxt: {
    color: ACCENT,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
    flex: 1,
  },
  saveIcon: {
    color: ACCENT,
    fontSize: 17,
  },
});
