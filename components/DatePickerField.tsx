import DateTimePicker from '@react-native-community/datetimepicker';
import React, { useState } from 'react';
import {
  Modal,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

interface Props {
  value:       string;
  onChange:    (date: string) => void;
  rowStyle?:   object;
  tagStyle?:   object;
  inputStyle?: object;
}

function parseDate(s: string): Date {
  const d = new Date(s);
  return isNaN(d.getTime()) ? new Date() : d;
}

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
  if (!ymd) return '';
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(ymd);
  if (!m) return ymd;
  const month = Number(m[2]);
  if (month < 1 || month > 12) return ymd;
  return `${ordinal(Number(m[3]))} ${MONTHS[month - 1]} ${Number(m[1])}`;
}

function toYMD(d: Date): string {
  return d.toISOString().split('T')[0];
}

export function DatePickerField({ value, onChange, rowStyle, tagStyle, inputStyle }: Props) {
  const [show,    setShow]    = useState(false);
  const [picking, setPicking] = useState(new Date());

  function open() {
    setPicking(value ? parseDate(value) : new Date());
    setShow(true);
  }

  function confirm() {
    onChange(toYMD(picking));
    setShow(false);
  }

  return (
    <>
      <TouchableOpacity style={rowStyle} onPress={open} activeOpacity={0.7}>
        <Text style={tagStyle}>DATE</Text>
        <Text
          style={[inputStyle, s.value, !value && s.placeholder]}
          allowFontScaling={false}
        >
          {value ? formatDate(value) : 'select a date'}
        </Text>
      </TouchableOpacity>

      {/*ios — bottom sheet with inline calendar*/}
      {Platform.OS === 'ios' && (
        <Modal visible={show} transparent animationType="slide">
          <View style={s.backdrop}>
            <View style={s.sheet}>
              <View style={s.header}>
                <TouchableOpacity onPress={() => setShow(false)}>
                  <Text style={s.cancelTxt}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={confirm}>
                  <Text style={s.doneTxt}>Done</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={picking}
                mode="date"
                display="inline"
                themeVariant="dark"
                onChange={(_, d) => { if (d) setPicking(d); }}
                style={s.picker}
              />
            </View>
          </View>
        </Modal>
      )}

      {/*android — native dialog, no wrapper needed*/}
      {show && Platform.OS === 'android' && (
        <DateTimePicker
          value={picking}
          mode="date"
          display="default"
          onChange={(_, d) => {
            setShow(false);
            if (d) onChange(toYMD(d));
          }}
        />
      )}
    </>
  );
}

const s = StyleSheet.create({
  placeholder: { color: '#6f6f6f' },
  value: { flexShrink: 1, flexGrow: 1 },
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(5,5,5,0.78)',
  },
  sheet: {
    backgroundColor: '#0b0b0c',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 22,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#242426',
  },
  cancelTxt: {
    color: '#6f6f6f',
    fontSize: 16,
  },
  doneTxt: {
    color: '#ff8a3d',
    fontSize: 16,
    fontWeight: '700',
  },
  picker: {
    backgroundColor: '#0b0b0c',
  },
});
