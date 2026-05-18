import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { AIRPORTS } from '../data/airports';
import { AIRLINES } from '../data/airlines';
import { insertFlight } from '../data/db';
import { DatePickerField } from './DatePickerField';

const ACCENT = 'rgb(0, 255, 175)';

const SCREEN_H = Dimensions.get('window').height;

interface Props {
  visible: boolean;
  onClose: () => void;
  onFlightChange: () => void;
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

interface AirlineSuggestion { name: string; icao: string; }

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

export function AddFlightModal({ visible, onClose, onFlightChange }: Props) {
  const translateY = useRef(new Animated.Value(SCREEN_H)).current;

  const [fromText,    setFromText]    = useState('');
  const [toText,      setToText]      = useState('');
  const [aircraft,    setAircraft]    = useState('');
  const [airline,     setAirline]     = useState('');
  const [date,        setDate]        = useState('');
  const [activeSugs,    setActiveSugs]    = useState<Suggestion[]>([]);
  const [airlineSugs,   setAirlineSugs]   = useState<AirlineSuggestion[]>([]);
  const [activeField,   setActiveField]   = useState<'from' | 'to' | 'airline' | null>(null);
  const [routeH,        setRouteH]        = useState(0);
  const [airlineSugTop, setAirlineSugTop] = useState(0);

  useEffect(() => {
    Animated.spring(translateY, {
      toValue: visible ? 0 : SCREEN_H,
      useNativeDriver: true,
      damping: 22,
      stiffness: 350,
      mass: 0.7,
    }).start();
    if (!visible) { setActiveSugs([]); setAirlineSugs([]); setActiveField(null); }
  }, [visible]);

  function handleClose() {
    Keyboard.dismiss();
    onClose();
  }

  function onFromChange(text: string) {
    setFromText(text);
    setActiveField('from');
    setActiveSugs(searchAirports(text));
  }

  function onToChange(text: string) {
    setToText(text);
    setActiveField('to');
    setActiveSugs(searchAirports(text));
  }

  function selectSuggestion(code: string) {
    if (activeField === 'from') setFromText(code);
    else if (activeField === 'to') setToText(code);
    setActiveSugs([]);
    setActiveField(null);
  }

  function onInputBlur() {
    setTimeout(() => { setActiveSugs([]); setAirlineSugs([]); }, 150);
  }

  function onAirlineChange(text: string) {
    setAirline(text);
    setActiveField('airline');
    setAirlineSugs(searchAirlines(text));
  }

  function selectAirline(name: string) {
    setAirline(name);
    setAirlineSugs([]);
    setActiveField(null);
  }

  function handleSave() {
    const from = fromText.trim().toUpperCase();
    const to   = toText.trim().toUpperCase();
    if (!from || !to) return;
    insertFlight(
      from,
      to,
      airline.trim()  || undefined,
      aircraft.trim() || undefined,
      date.trim()     || undefined,
    );
    setFromText('');
    setToText('');
    setAircraft('');
    setAirline('');
    setDate('');
    setActiveSugs([]);
    onFlightChange();
    handleClose();
  }

  return (
    <Animated.View
      style={[s.overlay, { transform: [{ translateY }] }]}
      pointerEvents={visible ? 'box-none' : 'none'}
    >
      {/*kav is flex:1 — the spacer above the sheet absorbs the keyboard height*/}
      <KeyboardAvoidingView style={s.kav} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} pointerEvents="box-none">
        <View style={s.spacer} pointerEvents="none" />
        <View style={s.sheet}>
          <View style={s.titleRow}>
            <Text style={s.title}>New Flight</Text>
            <TouchableOpacity onPress={handleClose} style={s.closeBtn}>
              <Text style={s.closeTxt}>✕</Text>
            </TouchableOpacity>
          </View>

            {/*route wrapper — suggestions float absolutely below it so layout is unaffected*/}
            <View style={s.routeWrapper}>
              <View style={s.routeCard} onLayout={e => setRouteH(e.nativeEvent.layout.height)}>
                <View style={s.routeSide}>
                  <Text style={s.routeTag}>FROM</Text>
                  <TextInput
                    style={[s.iataInput, fromText.length > 4 && s.iataInputSearch]}
                    value={fromText}
                    onChangeText={onFromChange}
                    onFocus={() => { setActiveField('from'); setActiveSugs(searchAirports(fromText)); }}
                    onBlur={onInputBlur}
                    placeholder="LHR"
                    placeholderTextColor="#253548"
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>

                <View style={s.routeMid}>
                  <View style={s.routeLine} />
                  <Text style={s.planeTxt}>✈</Text>
                  <View style={s.routeLine} />
                </View>

                <View style={[s.routeSide, s.routeSideRight]}>
                  <Text style={[s.routeTag, s.routeTagRight]}>TO</Text>
                  <TextInput
                    style={[s.iataInput, s.iataInputRight, toText.length > 4 && s.iataInputSearch]}
                    value={toText}
                    onChangeText={onToChange}
                    onFocus={() => { setActiveField('to'); setActiveSugs(searchAirports(toText)); }}
                    onBlur={onInputBlur}
                    placeholder="JFK"
                    placeholderTextColor="#253548"
                    autoCapitalize="none"
                    autoCorrect={false}
                    textAlign="right"
                  />
                </View>
              </View>

              {/*suggestion dropdown — absolute so it overlays the detail card below*/}
              {activeSugs.length > 0 && (
                <View style={[s.sugList, { top: routeH }]}>
                  {activeSugs.map((sug, idx) => (
                    <React.Fragment key={sug.code}>
                      {idx > 0 && <View style={s.sugRule} />}
                      <TouchableOpacity style={s.sugItem} onPress={() => selectSuggestion(sug.code)}>
                        <Text style={s.sugCode}>{sug.code}</Text>
                        <Text style={s.sugName} numberOfLines={1}>{sug.name}</Text>
                      </TouchableOpacity>
                    </React.Fragment>
                  ))}
                </View>
              )}
            </View>

            {/*detail card wrapper — airline suggestions float absolutely over date row / logBtn*/}
            <View style={s.detailOuter}>
              <View style={s.detailCard}>
                <View style={s.detailRow}>
                  <Text style={s.detailTag}>AIRCRAFT</Text>
                  <TextInput
                    style={s.detailInput}
                    value={aircraft}
                    onChangeText={setAircraft}
                    placeholder="Boeing 737-800"
                    placeholderTextColor="#253548"
                  />
                </View>
                <View style={s.rule} />
                <View
                  style={s.detailRow}
                  onLayout={e => setAirlineSugTop(e.nativeEvent.layout.y + e.nativeEvent.layout.height)}
                >
                  <Text style={s.detailTag}>AIRLINE</Text>
                  <TextInput
                    style={s.detailInput}
                    value={airline}
                    onChangeText={onAirlineChange}
                    onFocus={() => { setActiveField('airline'); setAirlineSugs(searchAirlines(airline)); }}
                    onBlur={onInputBlur}
                    placeholder="British Airways"
                    placeholderTextColor="#253548"
                  />
                </View>
                <View style={s.rule} />
                <DatePickerField
                  value={date}
                  onChange={setDate}
                  rowStyle={s.detailRow}
                  tagStyle={s.detailTag}
                  inputStyle={s.detailInput}
                />
              </View>

              {airlineSugs.length > 0 && (
                <View style={[s.sugList, { top: airlineSugTop }]}>
                  {airlineSugs.map((sug, idx) => (
                    <React.Fragment key={sug.icao}>
                      {idx > 0 && <View style={s.sugRule} />}
                      <TouchableOpacity style={s.sugItem} onPress={() => selectAirline(sug.name)}>
                        <Text style={s.sugCode}>{sug.icao}</Text>
                        <Text style={s.sugName} numberOfLines={1}>{sug.name}</Text>
                      </TouchableOpacity>
                    </React.Fragment>
                  ))}
                </View>
              )}
            </View>

            <TouchableOpacity style={s.logBtn} onPress={handleSave}>
              <Text style={s.logTxt}>Log Flight</Text>
              <Text style={s.logIcon}>✈</Text>
            </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
  },
  kav: { flex: 1 },
  spacer: { flex: 1 },
  sheet: {
    backgroundColor: '#111827',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: 18,
    paddingTop: 22,
    paddingBottom: Platform.OS === 'android' ? 88 : 44,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
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

  //route card (wrapper lifts suggestions above sibling views via zIndex)
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
  routeMid: {
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingTop: 14,
    gap: 4,
  },
  routeLine: {
    width: 22,
    height: 1,
    backgroundColor: '#2d3f52',
  },
  planeTxt: { color: '#4b5563', fontSize: 16 },

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

  //detail card
  detailOuter: {
    zIndex: 9,
    marginBottom: 10,
  },
  detailCard: {
    backgroundColor: '#1a2535',
    borderRadius: 16,
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
  rule: {
    height: 1,
    backgroundColor: '#111827',
  },

  //log button
  logBtn: {
    backgroundColor: '#0f1e30',
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 175, 0.2)',
  },
  logTxt: {
    color: ACCENT,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
    flex: 1,
  },
  logIcon: { color: ACCENT, fontSize: 17 },
});
