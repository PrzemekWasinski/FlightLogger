import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  FlatList,
  Platform,
  StatusBar as RNStatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { getLogs, clearLogs, log, LogEntry } from '../utils/logger';

const ACCENT     = '#ff8a3d';
const SCREEN_H   = Dimensions.get('window').height;
const HEADER_TOP = Platform.OS === 'ios' ? 55 : (RNStatusBar.currentHeight ?? 24) + 14;

interface Props {
  visible: boolean;
  onClose: () => void;
}

function LogRow({ item }: { item: LogEntry }) {
  const prefix = item.level === 'error' ? 'ERR' : item.level === 'warn' ? 'WRN' : 'INF';
  return (
    <Text style={s.row} selectable allowFontScaling={false}>
      <Text style={s.time}>{item.time}  </Text>
      <Text style={s.prefix}>{prefix}  </Text>
      <Text style={s.msg}>{item.message}</Text>
    </Text>
  );
}

export function ErrorLogsModal({ visible, onClose }: Props) {
  const translateY = useRef(new Animated.Value(SCREEN_H)).current;
  const [entries, setEntries] = useState<LogEntry[]>([]);

  useEffect(() => {
    Animated.spring(translateY, {
      toValue: visible ? 0 : SCREEN_H,
      useNativeDriver: true,
      damping: 22, stiffness: 350, mass: 0.7,
    }).start();
    if (visible) setEntries([...getLogs()]);
  }, [visible]);

  function handleClear() {
    clearLogs();
    log('info', 'Logs cleared');
    setEntries([...getLogs()]);
  }

  return (
    <Animated.View
      style={[s.overlay, { transform: [{ translateY }] }]}
      pointerEvents={visible ? 'auto' : 'none'}
    >
      <View style={s.header}>
        <Text style={s.title} numberOfLines={1} allowFontScaling={false} adjustsFontSizeToFit minimumFontScale={0.78}>Logs</Text>
        <View style={s.headerRight}>
          <TouchableOpacity onPress={handleClear} style={s.clearBtn}>
            <Text style={s.clearTxt} numberOfLines={1} allowFontScaling={false} adjustsFontSizeToFit minimumFontScale={0.78}>Clear</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onClose} style={s.closeBtn}>
            <Text style={s.closeTxt} allowFontScaling={false}>✕</Text>
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={entries}
        keyExtractor={item => String(item.id)}
        renderItem={({ item }) => <LogRow item={item} />}
        contentContainerStyle={s.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={<Text style={s.empty} allowFontScaling={false}>No logs</Text>}
      />
    </Animated.View>
  );
}

const s = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: '#050505',
  },
  header: {
    paddingTop: HEADER_TOP,
    paddingHorizontal: 20,
    paddingBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#242426',
  },
  title: { color: '#f5f5f5', fontSize: 18, fontWeight: '700', flex: 1, lineHeight: 32 },
  headerRight: { height: 32, flexDirection: 'row', alignItems: 'center', gap: 12 },
  clearBtn: { minWidth: 48, height: 32, alignItems: 'center', justifyContent: 'center' },
  clearTxt: { color: ACCENT, fontSize: 14, fontWeight: '700', lineHeight: 18 },
  closeBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  closeTxt: { color: '#6f6f6f', fontSize: 17, lineHeight: 20 },

  list: { padding: 16, paddingBottom: 40 },

  row: {
    fontSize: 12,
    lineHeight: 22,
    color: '#a8a8a8',
    fontFamily: Platform.OS === 'android' ? 'monospace' : 'Menlo',
  },
  time: { color: '#6f6f6f' },
  prefix: { color: '#a8a8a8' },
  msg: { color: '#f5f5f5' },

  empty: { color: '#6f6f6f', fontSize: 13, marginTop: 40, textAlign: 'center' },
});
