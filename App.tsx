import { StatusBar } from 'expo-status-bar';
import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { AddFlightModal } from './components/AddFlightModal';
import { BottomSheet } from './components/BottomSheet';
import { Globe } from './components/Globe';
import { LogbookModal } from './components/LogbookModal';
import { initDb } from './data/db';

initDb();

export default function App() {
  const [addOpen,     setAddOpen]     = useState(false);
  const [logbookOpen, setLogbookOpen] = useState(false);

  return (
    <View style={styles.root}>
      <Globe />
      <BottomSheet hidden={addOpen || logbookOpen} />

      {/*hide buttons while any overlay is open*/}
      {!addOpen && !logbookOpen && (
        <>
          <TouchableOpacity style={styles.addBtn} onPress={() => setAddOpen(true)}>
            <Text style={styles.addTxt}>+</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.logBtn} onPress={() => setLogbookOpen(true)}>
            <View style={styles.barWrap}>
              <View style={styles.bar} />
              <View style={styles.bar} />
              <View style={[styles.bar, styles.barShort]} />
            </View>
          </TouchableOpacity>
        </>
      )}

      <AddFlightModal  visible={addOpen}     onClose={() => setAddOpen(false)} />
      <LogbookModal    visible={logbookOpen} onClose={() => setLogbookOpen(false)} />
      <StatusBar style="light" />
    </View>
  );
}

const BTN = {
  position: 'absolute' as const,
  right: 20,
  width: 52,
  height: 52,
  backgroundColor: '#111827',
  borderRadius: 14,
  alignItems: 'center' as const,
  justifyContent: 'center' as const,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.4,
  shadowRadius: 8,
  elevation: 8,
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#050a18',
  },
  addBtn: {
    ...BTN,
    top: 55,
  },
  addTxt: {
    color: '#fff',
    fontSize: 30,
    lineHeight: 34,
    fontWeight: '300',
  },
  logBtn: {
    ...BTN,
    top: 117,
  },
  barWrap: {
    gap: 5,
    alignItems: 'flex-start',
    width: 22,
  },
  bar: {
    width: 22,
    height: 2.5,
    backgroundColor: '#fff',
    borderRadius: 1.5,
  },
  barShort: {
    width: 14,
  },
});
