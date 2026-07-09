import { StatusBar } from 'expo-status-bar';
import React, { useState } from 'react';
import { Platform, StatusBar as RNStatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
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

(Text as any).defaultProps = (Text as any).defaultProps ?? {};
(Text as any).defaultProps.allowFontScaling = false;
(TextInput as any).defaultProps = (TextInput as any).defaultProps ?? {};
(TextInput as any).defaultProps.allowFontScaling = false;

const ACTIONS = {
  add: { label: 'Add', glyph: '+' },
  logbook: { label: 'Logbook', glyph: '≡' },
  logs: { label: 'Logs', glyph: '>_' },
};

const ACTION_TOP = Platform.OS === 'android' ? (RNStatusBar.currentHeight ?? 24) + 12 : 54;

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
            <View style={styles.logbookGlyph}>
              <View style={styles.logbookSpine} />
              <View style={styles.logbookPage}>
                <View style={styles.logbookLine} />
                <View style={[styles.logbookLine, styles.logbookLineShort]} />
              </View>
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
    top: ACTION_TOP,
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
  logbookGlyph: {
    width: 22,
    height: 24,
    borderWidth: 1.5,
    borderColor: THEME.text,
    borderRadius: 4,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  logbookSpine: {
    width: 5,
    height: '100%',
    borderRightWidth: 1.5,
    borderRightColor: THEME.text,
    backgroundColor: 'rgba(240, 179, 90, 0.12)',
  },
  logbookPage: {
    flex: 1,
    justifyContent: 'center',
    paddingLeft: 4,
    gap: 4,
  },
  logbookLine: {
    width: 9,
    height: 1.5,
    borderRadius: 1,
    backgroundColor: THEME.text,
  },
  logbookLineShort: {
    width: 6,
  },
  terminalGlyph: {
    color: THEME.teal,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0,
    fontFamily: 'monospace',
  },
});
