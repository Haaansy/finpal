import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import React, { useEffect, useState } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import type { FinpalColors } from '@/theme/colors';
import { formatIsoDateEnPh, isoFromLocalDate, parseIsoToDate } from '@/utils/dates';

type Props = {
  label: string;
  value: string;
  onChange: (iso: string) => void;
  colors: FinpalColors;
  minimumDate?: Date;
  maximumDate?: Date;
  /** Show friendlier empty state and a clear control when a date is set. */
  optional?: boolean;
};

export function DatePickerField({
  label,
  value,
  onChange,
  colors,
  minimumDate,
  maximumDate,
  optional,
}: Props) {
  const [show, setShow] = useState(false);
  const [iosDraft, setIosDraft] = useState(() => parseIsoToDate(value) ?? new Date());

  useEffect(() => {
    if (show && Platform.OS === 'ios') {
      setIosDraft(parseIsoToDate(value) ?? new Date());
    }
  }, [show, value]);

  const hasValue = Boolean(value && parseIsoToDate(value));
  const display = hasValue
    ? formatIsoDateEnPh(value)
    : optional
      ? 'Optional — tap to set'
      : 'Select date';

  if (Platform.OS === 'web') {
    return (
      <View style={{ marginTop: 12 }}>
        <View style={styles.labelRow}>
          <Text style={[styles.label, { color: colors.textMuted, marginBottom: 0 }]}>{label}</Text>
          {optional && hasValue ? (
            <Pressable onPress={() => onChange('')} hitSlop={8}>
              <Text style={{ color: colors.primary, fontSize: 13, fontWeight: '600' }}>Clear</Text>
            </Pressable>
          ) : null}
        </View>
        <TextInput
          value={value}
          onChangeText={onChange}
          placeholder="YYYY-MM-DD"
          placeholderTextColor={colors.textMuted}
          autoCapitalize="none"
          autoCorrect={false}
          style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface }]}
        />
      </View>
    );
  }

  const open = () => setShow(true);

  const onPick = (event: DateTimePickerEvent, date?: Date) => {
    if (Platform.OS === 'android') {
      setShow(false);
    }
    if (event.type === 'dismissed') {
      return;
    }
    if (date) {
      onChange(isoFromLocalDate(date));
    }
  };

  const commitIos = () => {
    onChange(isoFromLocalDate(iosDraft));
    setShow(false);
  };

  return (
    <View style={{ marginTop: 12 }}>
      <View style={styles.labelRow}>
        <Text style={[styles.label, { color: colors.textMuted, marginBottom: 0 }]}>{label}</Text>
        {optional && hasValue ? (
          <Pressable onPress={() => onChange('')} hitSlop={8}>
            <Text style={{ color: colors.primary, fontSize: 13, fontWeight: '600' }}>Clear</Text>
          </Pressable>
        ) : null}
      </View>
      <Pressable
        onPress={open}
        style={[
          styles.field,
          { borderColor: colors.border, backgroundColor: colors.surface },
        ]}
        accessibilityRole="button"
        accessibilityLabel={`${label}, ${hasValue ? display : 'tap to choose date'}`}>
        <Text style={[styles.fieldText, { color: hasValue ? colors.text : colors.textMuted }]}>{display}</Text>
        <FontAwesome name="calendar" size={18} color={colors.primary} />
      </Pressable>

      {Platform.OS === 'android' && show && (
        <DateTimePicker
          value={parseIsoToDate(value) ?? new Date()}
          mode="date"
          display="default"
          onChange={onPick}
          minimumDate={minimumDate}
          maximumDate={maximumDate}
        />
      )}

      {Platform.OS === 'ios' && (
        <Modal visible={show} transparent animationType="slide" onRequestClose={() => setShow(false)}>
          <Pressable style={styles.backdrop} onPress={() => setShow(false)}>
            <Pressable style={[styles.sheet, { backgroundColor: colors.surface }]} onPress={(e) => e.stopPropagation()}>
              <View style={styles.sheetHeader}>
                <Pressable onPress={() => setShow(false)} hitSlop={12}>
                  <Text style={{ color: colors.primary, fontSize: 17 }}>Cancel</Text>
                </Pressable>
                <Text style={[styles.sheetTitle, { color: colors.text }]}>Date</Text>
                <Pressable onPress={commitIos} hitSlop={12}>
                  <Text style={{ color: colors.primary, fontSize: 17, fontWeight: '700' }}>Done</Text>
                </Pressable>
              </View>
              <DateTimePicker
                value={iosDraft}
                mode="date"
                display="spinner"
                onChange={(_, d) => {
                  if (d) setIosDraft(d);
                }}
                minimumDate={minimumDate}
                maximumDate={maximumDate}
                style={styles.iosPicker}
              />
            </Pressable>
          </Pressable>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  label: { fontSize: 13, fontWeight: '600', marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
  },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    minHeight: 48,
  },
  fieldText: { fontSize: 16, flex: 1, marginRight: 8 },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingBottom: 28,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  sheetTitle: { fontSize: 16, fontWeight: '700' },
  iosPicker: { alignSelf: 'center', width: '100%' },
});
