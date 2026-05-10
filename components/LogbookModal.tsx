import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { getAllFlights, deleteFlight, updateFlight, Flight } from '../data/db';

const SCREEN_H   = Dimensions.get('window').height;
const HEADER_TOP = Platform.OS === 'ios' ? 55 : 35;

interface Props {
  visible: boolean;
  onClose: () => void;
}

// ─── flight row ────────────────────────────────────────────────────────────────

interface RowProps {
  item:     Flight;
  onEdit:   () => void;
  onDelete: () => void;
}

function FlightRow({ item, onEdit, onDelete }: RowProps) {
  return (
    <View style={s.card}>
      <View style={s.routeRow}>
        <Text style={s.iata}>{item.from}</Text>
        <View style={s.routeMid}>
          <View style={s.routeLine} />
          <Text style={s.planeTxt}>✈</Text>
          <View style={s.routeLine} />
        </View>
        <Text style={s.iata}>{item.to}</Text>
      </View>

      {item.aircraft ? <Text style={s.infoLine}>{item.aircraft}</Text> : null}
      {item.airline  ? <Text style={s.infoLine}>{item.airline}</Text>  : null}

      <View style={s.cardBottom}>
        <Text style={s.date}>{item.date ?? '—'}</Text>
        <View style={s.actions}>
          <TouchableOpacity onPress={onEdit} style={s.actionBtn}>
            <Text style={s.editTxt}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onDelete} style={s.actionBtn}>
            <Text style={s.deleteTxt}>Delete</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

function RowGap() { return <View style={{ height: 8 }} />; }

// ─── logbook modal ─────────────────────────────────────────────────────────────

export function LogbookModal({ visible, onClose }: Props) {
  const translateY = useRef(new Animated.Value(SCREEN_H)).current;

  const [flights,       setFlights]       = useState<Flight[]>([]);
  const [editingFlight, setEditingFlight] = useState<Flight | null>(null);
  const [editFrom,      setEditFrom]      = useState('');
  const [editTo,        setEditTo]        = useState('');
  const [editAircraft,  setEditAircraft]  = useState('');
  const [editAirline,   setEditAirline]   = useState('');

  useEffect(() => {
    Animated.spring(translateY, {
      toValue: visible ? 0 : SCREEN_H,
      useNativeDriver: true,
      damping: 22,
      stiffness: 350,
      mass: 0.7,
    }).start();
    if (visible) refresh();
    //clear any open edit panel when the logbook closes
    if (!visible) setEditingFlight(null);
  }, [visible]);

  function refresh() { setFlights(getAllFlights()); }

  function openEdit(flight: Flight) {
    setEditFrom(flight.from);
    setEditTo(flight.to);
    setEditAircraft(flight.aircraft ?? '');
    setEditAirline(flight.airline  ?? '');
    setEditingFlight(flight);
  }

  function cancelEdit() {
    Keyboard.dismiss();
    setEditingFlight(null);
  }

  function saveEdit() {
    if (!editingFlight || !editFrom.trim() || !editTo.trim()) return;
    updateFlight(
      editingFlight.id,
      editFrom.trim().toUpperCase(),
      editTo.trim().toUpperCase(),
      editAirline.trim()  || undefined,
      editAircraft.trim() || undefined,
    );
    Keyboard.dismiss();
    setEditingFlight(null);
    refresh();
  }

  function handleDelete(id: number) {
    deleteFlight(id);
    refresh();
  }

  return (
    <Animated.View
      style={[s.overlay, { transform: [{ translateY }] }]}
      pointerEvents={visible ? 'auto' : 'none'}
    >
      {/*header*/}
      <View style={s.header}>
        <Text style={s.title}>Logbook</Text>
        <TouchableOpacity onPress={onClose} style={s.closeBtn}>
          <Text style={s.closeTxt}>✕</Text>
        </TouchableOpacity>
      </View>

      {/*flight list*/}
      <FlatList
        data={flights}
        keyExtractor={item => String(item.id)}
        renderItem={({ item }) => (
          <FlightRow
            item={item}
            onEdit={() => openEdit(item)}
            onDelete={() => handleDelete(item.id)}
          />
        )}
        ItemSeparatorComponent={RowGap}
        contentContainerStyle={s.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={<Text style={s.empty}>no flights logged yet</Text>}
      />

      {/*edit panel — absolute so it overlays the list*/}
      {editingFlight && (
        <View style={s.editOverlay}>
          <TouchableOpacity style={s.editBackdrop} onPress={cancelEdit} activeOpacity={1} />
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <View style={s.editSheet}>
              <View style={s.editHeader}>
                <Text style={s.editTitle}>Edit Flight</Text>
                <TouchableOpacity onPress={cancelEdit} style={s.closeBtn}>
                  <Text style={s.closeTxt}>✕</Text>
                </TouchableOpacity>
              </View>

              {/*route inputs*/}
              <View style={s.routeCard}>
                <View style={s.routeSide}>
                  <Text style={s.routeTag}>FROM</Text>
                  <TextInput
                    style={s.iataInput}
                    value={editFrom}
                    onChangeText={setEditFrom}
                    placeholder="LHR"
                    placeholderTextColor="#253548"
                    autoCapitalize="characters"
                    maxLength={4}
                  />
                </View>
                <View style={s.routeMidEdit}>
                  <View style={s.routeLineEdit} />
                  <Text style={s.planeTxtEdit}>✈</Text>
                  <View style={s.routeLineEdit} />
                </View>
                <View style={[s.routeSide, s.routeSideRight]}>
                  <Text style={[s.routeTag, s.routeTagRight]}>TO</Text>
                  <TextInput
                    style={[s.iataInput, s.iataInputRight]}
                    value={editTo}
                    onChangeText={setEditTo}
                    placeholder="JFK"
                    placeholderTextColor="#253548"
                    autoCapitalize="characters"
                    maxLength={4}
                    textAlign="right"
                  />
                </View>
              </View>

              {/*detail inputs*/}
              <View style={s.detailCard}>
                <View style={s.detailRow}>
                  <Text style={s.detailTag}>AIRCRAFT</Text>
                  <TextInput
                    style={s.detailInput}
                    value={editAircraft}
                    onChangeText={setEditAircraft}
                    placeholder="Boeing 737-800"
                    placeholderTextColor="#253548"
                  />
                </View>
                <View style={s.detailRule} />
                <View style={s.detailRow}>
                  <Text style={s.detailTag}>AIRLINE</Text>
                  <TextInput
                    style={s.detailInput}
                    value={editAirline}
                    onChangeText={setEditAirline}
                    placeholder="British Airways"
                    placeholderTextColor="#253548"
                  />
                </View>
              </View>

              <TouchableOpacity style={s.saveBtn} onPress={saveEdit}>
                <Text style={s.saveTxt}>Save Changes</Text>
                <Text style={s.saveIcon}>✈</Text>
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </View>
      )}
    </Animated.View>
  );
}

// ─── styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: '#050a18',
  },

  //header
  header: {
    paddingTop: HEADER_TOP,
    paddingHorizontal: 20,
    paddingBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#111827',
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

  //list
  listContent: {
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 40,
  },
  empty: {
    color: '#374151',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 60,
  },

  //flight card
  card: {
    backgroundColor: '#111827',
    borderRadius: 12,
    padding: 14,
  },
  routeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iata: {
    color: '#f3f4f6',
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: 1,
    minWidth: 52,
  },
  routeMid: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  routeLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#1e2d3d',
  },
  planeTxt: {
    color: '#374151',
    fontSize: 13,
    paddingHorizontal: 4,
  },
  infoLine: {
    color: '#f3f4f6',
    fontSize: 15,
    lineHeight: 22,
    marginTop: 2,
  },
  cardBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  date: {
    color: '#f3f4f6',
    fontSize: 12,
  },
  actions: {
    flexDirection: 'row',
    gap: 6,
  },
  actionBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#1a2535',
  },
  editTxt: {
    color: '#60a5fa',
    fontSize: 12,
    fontWeight: '600',
  },
  deleteTxt: {
    color: '#ef4444',
    fontSize: 12,
    fontWeight: '600',
  },

  //edit panel
  editOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    justifyContent: 'flex-end',
  },
  editBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(5,10,24,0.7)',
  },
  editSheet: {
    backgroundColor: '#111827',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: 18,
    paddingTop: 22,
    paddingBottom: 44,
  },
  editHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  editTitle: {
    color: '#f3f4f6',
    fontSize: 18,
    fontWeight: '700',
  },

  //route card (edit)
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
  routeMidEdit: {
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingTop: 14,
    gap: 4,
  },
  routeLineEdit: {
    width: 22,
    height: 1,
    backgroundColor: '#2d3f52',
  },
  planeTxtEdit: { color: '#4b5563', fontSize: 16 },

  //detail card (edit)
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
  detailRule: {
    height: 1,
    backgroundColor: '#111827',
  },

  //save button
  saveBtn: {
    backgroundColor: '#0f1e30',
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#1e3f60',
  },
  saveTxt: {
    color: '#60a5fa',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  saveIcon: {
    color: '#60a5fa',
    fontSize: 17,
  },
});
