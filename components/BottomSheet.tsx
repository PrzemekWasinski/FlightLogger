import React, { useEffect, useRef } from 'react';
import { Animated, Dimensions, PanResponder, StyleSheet, View } from 'react-native';

const { height: SCREEN_H } = Dimensions.get('window');

const HANDLE_H    = 68;
const PEEK_H      = 160; //visible height at bottom snap
const SNAP_TOP    = 0;
const SNAP_MIDDLE = Math.round(SCREEN_H * 0.5);
const SNAP_BOTTOM = SCREEN_H - PEEK_H;

const SNAPS = [SNAP_TOP, SNAP_MIDDLE, SNAP_BOTTOM];

function nearestSnap(y: number): number {
  return SNAPS.reduce((best, s) => (Math.abs(s - y) < Math.abs(best - y) ? s : best));
}

function resolveSnap(y: number, vy: number): number {
  if (vy < -0.3) {
    const above = SNAPS.filter(s => s < y);
    return above.length ? above[above.length - 1] : SNAP_TOP;
  }
  if (vy > 0.3) {
    const below = SNAPS.find(s => s > y);
    return below !== undefined ? below : SNAP_BOTTOM;
  }
  return nearestSnap(y);
}

export function BottomSheet() {
  const translateY = useRef(new Animated.Value(SNAP_BOTTOM)).current;
  const liveY      = useRef(SNAP_BOTTOM);
  const startY     = useRef(SNAP_BOTTOM);

  useEffect(() => {
    const id = translateY.addListener(({ value }) => { liveY.current = value; });
    return () => translateY.removeListener(id);
  }, []);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, { dy }) => Math.abs(dy) > 3,

      onPanResponderGrant: () => {
        translateY.stopAnimation();
        startY.current = liveY.current;
      },

      onPanResponderMove: (_, { dy }) => {
        translateY.setValue(
          Math.max(SNAP_TOP, Math.min(SNAP_BOTTOM, startY.current + dy)),
        );
      },

      onPanResponderRelease: (_, { dy, vy }) => {
        const pos = Math.max(SNAP_TOP, Math.min(SNAP_BOTTOM, startY.current + dy));
        const target = resolveSnap(pos, vy);
        Animated.spring(translateY, {
          toValue: target,
          useNativeDriver: false,
          damping: 22,
          stiffness: 350,
          mass: 0.7,
        }).start();
      },
    }),
  ).current;

  return (
    <Animated.View
      style={[styles.sheet, { transform: [{ translateY }] }]}
      {...panResponder.panHandlers}
    >
      <View style={styles.handleBar}>
        <View style={styles.pill} />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: SCREEN_H,
    backgroundColor: '#111827',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.55,
    shadowRadius: 14,
    elevation: 18,
  },
  handleBar: {
    width: '100%',
    height: HANDLE_H,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pill: {
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#4b5563',
  },
});
