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
import { insertFlight } from '../data/db';

const SCREEN_H = Dimensions.get('window').height;

interface Props {
  visible: boolean;
  onClose: () => void;
}

export function AddFlightModal({ visible, onClose }: Props) {
  const translateY = useRef(new Animated.Value(SCREEN_H)).current;

  const [aircraft,  setAircraft]  = useState('');
  const [departure, setDeparture] = useState('');
  const [arrival,   setArrival]   = useState('');
  const [airline,   setAirline]   = useState('');

  useEffect(() => {
    Animated.spring(translateY, {
      toValue: visible ? 0 : SCREEN_H,
      useNativeDriver: true,
      damping: 22,
      stiffness: 350,
      mass: 0.7,
    }).start();
  }, [visible]);

  function handleClose() {
    Keyboard.dismiss();
    onClose();
  }

  function handleSave() {
    if (!departure.trim() || !arrival.trim()) return;
    insertFlight(
      departure.trim().toUpperCase(),
      arrival.trim().toUpperCase(),
      airline.trim()  || undefined,
      aircraft.trim() || undefined,
    );
    setAircraft('');
    setDeparture('');
    setArrival('');
    setAirline('');
    handleClose();
  }

  return (
    <Animated.View
      style={[s.overlay, { transform: [{ translateY }] }]}
      //box-none lets globe touches pass through the transparent area above the sheet
      pointerEvents={visible ? 'box-none' : 'none'}
    >
      <View style={s.root} pointerEvents="box-none">
        {/*ios only — padding nudges sheet above keyboard without layout thrash*/}
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={s.sheet}>
            <View style={s.titleRow}>
              <Text style={s.title}>New Flight</Text>
              <TouchableOpacity onPress={handleClose} style={s.closeBtn}>
                <Text style={s.closeTxt}>✕</Text>
              </TouchableOpacity>
            </View>

            {/*route card — big iata codes mimic boarding pass style*/}
            <View style={s.routeCard}>
              <View style={s.routeSide}>
                <Text style={s.routeTag}>FROM</Text>
                <TextInput
                  style={s.iataInput}
                  value={departure}
                  onChangeText={setDeparture}
                  placeholder="LHR"
                  placeholderTextColor="#253548"
                  autoCapitalize="characters"
                  maxLength={4}
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
                  style={[s.iataInput, s.iataInputRight]}
                  value={arrival}
                  onChangeText={setArrival}
                  placeholder="JFK"
                  placeholderTextColor="#253548"
                  autoCapitalize="characters"
                  maxLength={4}
                  textAlign="right"
                />
              </View>
            </View>

            {/*detail card — aircraft and airline share one container with a rule between*/}
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
              <View style={s.detailRow}>
                <Text style={s.detailTag}>AIRLINE</Text>
                <TextInput
                  style={s.detailInput}
                  value={airline}
                  onChangeText={setAirline}
                  placeholder="British Airways"
                  placeholderTextColor="#253548"
                />
              </View>
            </View>

            <TouchableOpacity style={s.logBtn} onPress={handleSave}>
              <Text style={s.logTxt}>Log Flight</Text>
              <Text style={s.logIcon}>✈</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  root: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#111827',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: 18,
    paddingTop: 22,
    paddingBottom: 44,
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
  routeCard: {
    backgroundColor: '#1a2535',
    borderRadius: 16,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  routeSide: {
    flex: 1,
  },
  routeSideRight: {
    alignItems: 'flex-end',
  },
  routeTag: {
    color: '#4b5563',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 2,
    marginBottom: 6,
  },
  routeTagRight: {
    textAlign: 'right',
  },
  iataInput: {
    color: '#f3f4f6',
    fontSize: 34,
    fontWeight: '700',
    letterSpacing: 2,
    padding: 0,
    minWidth: 80,
  },
  iataInputRight: {
    textAlign: 'right',
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
  planeTxt: {
    color: '#4b5563',
    fontSize: 16,
  },
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
  rule: {
    height: 1,
    backgroundColor: '#111827',
  },
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
    borderColor: '#1e3f60',
  },
  logTxt: {
    color: '#60a5fa',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  logIcon: {
    color: '#60a5fa',
    fontSize: 17,
  },
});
