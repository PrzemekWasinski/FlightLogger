import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import { Platform, StatusBar as RNStatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { AddFlightModal } from './components/AddFlightModal';
import { BottomSheet } from './components/BottomSheet';
import { ErrorLogsModal } from './components/ErrorLogsModal';
import { Globe } from './components/Globe';
import { LogbookModal } from './components/LogbookModal';
import { initDb } from './data/db';

const THEME = {
  bg: '#050505',
  surfaceGlass: 'rgba(8, 8, 9, 0.84)',
  surface: 'rgba(18, 18, 20, 0.94)',
  border: 'rgba(255, 255, 255, 0.16)',
  whiteLine: 'rgba(255,255,255,0.10)',
  text: '#f5f5f5',
  amber: '#ff8a3d',
  amberLight: '#ff4f7b',
  teal: '#d6d6d6',
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
  const [ready,        setReady]        = useState(false);
  const [booted,       setBooted]       = useState(false);
  const [globeReady,   setGlobeReady]   = useState(false);
  const [loadPct,      setLoadPct]      = useState(0);

  useEffect(() => {
    initDb();
    setBooted(true);
  }, []);

  useEffect(() => {
    if (ready) return;
    const id = setInterval(() => {
      setLoadPct(prev => {
        const cap = globeReady ? 100 : 94;
        const next = Math.min(cap, prev + 6 + Math.round(Math.random() * 5));
        if (next >= 100) {
          clearInterval(id);
          setTimeout(() => setReady(true), 160);
        }
        return next;
      });
    }, 42);
    return () => clearInterval(id);
  }, [globeReady, ready]);

  function bumpRefresh() { setRefreshKey(k => k + 1); }

  return (
    <View style={styles.root}>
      {booted && <Globe refreshKey={refreshKey} onReady={() => setGlobeReady(true)} />}
      {ready && (
        <>
          <BottomSheet hidden={addOpen || logbookOpen || logsOpen} />

          {!addOpen && !logbookOpen && !logsOpen && (
            <View style={styles.actionRail}>
              <TouchableOpacity style={[styles.actionBtn, styles.primaryAction]} onPress={() => setAddOpen(true)} activeOpacity={0.82}>
                <View style={styles.plusGlyph}>
                  <View style={styles.plusVertical} />
                  <View style={styles.plusHorizontal} />
                </View>
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
        </>
      )}

      {!ready && (
        <View style={styles.loading}>
          <Text style={styles.loadingTitle}>FlightLogger</Text>
          <View style={styles.loadingTrackWrap}>
            <View style={styles.loadingTrack}>
              <View style={[styles.loadingFill, { width: `${loadPct}%` }]} />
            </View>
          </View>
          <Text style={styles.loadingPct}>{loadPct}%</Text>
        </View>
      )}

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
    right: 14,
    width: 62,
    padding: 6,
    borderRadius: 18,
    backgroundColor: THEME.surfaceGlass,
    borderWidth: 1,
    borderColor: THEME.border,
    gap: 8,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.32,
    shadowRadius: 18,
    elevation: 12,
  },
  actionBtn: {
    width: 50,
    height: 50,
    borderRadius: 14,
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
  plusGlyph: {
    width: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  plusVertical: {
    position: 'absolute',
    width: 2,
    height: 20,
    borderRadius: 1,
    backgroundColor: THEME.bg,
  },
  plusHorizontal: {
    position: 'absolute',
    width: 20,
    height: 2,
    borderRadius: 1,
    backgroundColor: THEME.bg,
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
    backgroundColor: 'rgba(255, 138, 61, 0.12)',
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
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 36,
    backgroundColor: THEME.bg,
  },
  loadingTitle: {
    color: THEME.text,
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 18,
  },
  loadingTrackWrap: {
    width: '100%',
    height: 28,
    justifyContent: 'center',
  },
  loadingTrack: {
    width: '100%',
    height: 6,
    borderRadius: 4,
    overflow: 'hidden',
    backgroundColor: THEME.surface,
    borderWidth: 1,
    borderColor: THEME.whiteLine,
  },
  loadingFill: {
    height: '100%',
    borderRadius: 4,
    backgroundColor: THEME.amber,
  },
  loadingPct: {
    color: THEME.teal,
    fontSize: 12,
    fontWeight: '800',
    marginTop: 12,
  },
});
