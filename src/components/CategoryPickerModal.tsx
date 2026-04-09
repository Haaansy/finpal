import Feather from '@expo/vector-icons/Feather';
import React from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';

import { useFinpalTheme } from '@/context/FinpalThemeContext';

export function CategoryPickerModal({
  visible,
  title,
  value,
  options,
  onSelect,
  onClose,
}: {
  visible: boolean;
  title: string;
  value: string;
  options: readonly string[];
  onSelect: (category: string) => void;
  onClose: () => void;
}) {
  const { colors } = useFinpalTheme();
  const { height } = useWindowDimensions();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={[styles.backdrop, { minHeight: height }]} onPress={onClose}>
        <Pressable
          style={[styles.sheet, { backgroundColor: colors.surface, borderColor: colors.border }]}
          onPress={(e) => e.stopPropagation()}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
            <Pressable onPress={onClose} hitSlop={12} accessibilityRole="button" accessibilityLabel="Close">
              <Feather name="x" size={22} color={colors.textMuted} />
            </Pressable>
          </View>
          <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
            <View style={[styles.list, { borderColor: colors.border, backgroundColor: colors.surfaceSecondary }]}>
              {options.map((opt, i) => {
                const selected = value === opt;
                const last = i === options.length - 1;
                return (
                  <Pressable
                    key={opt}
                    onPress={() => onSelect(opt)}
                    style={({ pressed }) => [
                      styles.row,
                      !last && { borderBottomColor: colors.border },
                      last && styles.rowLast,
                      pressed && { opacity: 0.85 },
                    ]}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}>
                    <Text style={[styles.rowLabel, { color: colors.text }]}>{opt}</Text>
                    <View style={styles.rowTrail}>
                      {selected ? <Feather name="check" size={20} color={colors.primary} /> : null}
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet: {
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    maxHeight: '78%',
    paddingBottom: 18,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 10,
  },
  title: { fontSize: 18, fontWeight: '800' },
  scroll: { paddingHorizontal: 18 },
  list: { borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowLast: { borderBottomWidth: 0 },
  rowLabel: { flex: 1, fontSize: 16, fontWeight: '600' },
  rowTrail: { width: 28, alignItems: 'flex-end', justifyContent: 'center' },
});

