import { StatusBar } from 'expo-status-bar';
import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { AddFlightModal } from './components/AddFlightModal';
import { BottomSheet } from './components/BottomSheet';
import { ErrorLogsModal } from './components/ErrorLogsModal';
import { Globe } from './components/Globe';
import { LogbookModal } from './components/LogbookModal';
import { initDb } from './data/db';

initDb();

const THEME = {
  bg: '#07111f',
  surfaceGlass: 'rgba(7, 17, 31, 0.82)',
  surface: 'rgba(20, 32, 51, 0.94)',
  border: 'rgba(219, 190, 129, 0.24)',
  whiteLine: 'rgba(255,255,255,0.07)',
  text: '#d8e8ef',
  amber: '#f0b35a',
  amberLight: '#ffd08a',
  teal: '#65d0c2',
};

const ACTIONS = {
  add: { label: 'Add', glyph: '+' },
  logbook: { label: 'Logbook', glyph: '≡' },
  logs: { label: 'Logs', glyph: '>_' },
};

export default function App() {
  const [addOpen,      setAddOpen]      = useState(false);
  const [logbookOpen,  setLogbookOpen]  = useState(false);
  const [logsOpen,     setLogsOpen]     = useState(false);
  const [refreshKey,   setRefreshKey]   = useState(0);

  function bumpRefresh() { setRefreshKey(k => k + 1); }

  return (
    <View style={styles.root}>
      <Globe refreshKey={refreshKey} />
      <BottomSheet hidden={addOpen || logbookOpen || logsOpen} />

      {!addOpen && !logbookOpen && !logsOpen && (
        <View style={styles.actionRail}>
          <TouchableOpacity style={[styles.actionBtn, styles.primaryAction]} onPress={() => setAddOpen(true)} activeOpacity={0.82}>
            <Text style={styles.primaryGlyph} allowFontScaling={false}>{ACTIONS.add.glyph}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionBtn} onPress={() => setLogbookOpen(true)} activeOpacity={0.82}>
            <View style={styles.logGlyph}>
              <View style={styles.logLine} />
              <View style={styles.logLine} />
              <View style={[styles.logLine, styles.logLineShort]} />
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionBtn} onPress={() => setLogsOpen(true)} activeOpacity={0.82}>
            <Text style={styles.terminalGlyph} allowFontScaling={false}>{ACTIONS.logs.glyph}</Text>
          </TouchableOpacity>
        </View>
      )}

      <AddFlightModal  visible={addOpen}     onClose={() => setAddOpen(false)}     onFlightChange={bumpRefresh} />
      <LogbookModal    visible={logbookOpen} onClose={() => setLogbookOpen(false)} onFlightChange={bumpRefresh} />
      <ErrorLogsModal  visible={logsOpen}    onClose={() => setLogsOpen(false)} />
      <StatusBar style="light" />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: THEME.bg,
  },
  actionRail: {
    position: 'absolute',
    top: 54,
    right: 16,
    width: 58,
    padding: 5,
    borderRadius: 29,
    backgroundColor: THEME.surfaceGlass,
    borderWidth: 1,
    borderColor: THEME.border,
    gap: 7,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.32,
    shadowRadius: 18,
    elevation: 12,
  },
  actionBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: THEME.surface,
    borderWidth: 1,
    borderColor: THEME.whiteLine,
  },
  primaryAction: {
    backgroundColor: THEME.amber,
    borderColor: THEME.amberLight,
  },
  primaryGlyph: {
    color: THEME.bg,
    fontSize: 30,
    lineHeight: 32,
    fontWeight: '500',
  },
  logGlyph: {
    width: 22,
    gap: 5,
    alignItems: 'flex-start',
  },
  logLine: {
    width: 22,
    height: 2,
    backgroundColor: THEME.text,
    borderRadius: 1,
  },
  logLineShort: {
    width: 13,
  },
  terminalGlyph: {
    color: THEME.teal,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0,
    fontFamily: 'monospace',
  },
});
