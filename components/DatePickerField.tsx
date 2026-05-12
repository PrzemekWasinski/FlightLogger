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
        <Text style={[inputStyle, !value && s.placeholder]}>
          {value || 'select a date'}
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
  placeholder: { color: '#253548' },
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(5,10,24,0.75)',
  },
  sheet: {
    backgroundColor: '#111827',
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
    borderBottomColor: '#1e2d3d',
  },
  cancelTxt: {
    color: '#4b5563',
    fontSize: 16,
  },
  doneTxt: {
    color: '#60a5fa',
    fontSize: 16,
    fontWeight: '700',
  },
  picker: {
    backgroundColor: '#111827',
  },
});
