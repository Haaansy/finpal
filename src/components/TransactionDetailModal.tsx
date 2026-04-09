import React, { useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';

import { PriorityBadge } from '@/components/PriorityBadge';
import { PrimaryButton } from '@/components/PrimaryButton';
import type { TransactionRow } from '@/db/types';
import { useFinpalTheme } from '@/context/FinpalThemeContext';
import { isExpenseSettled } from '@/utils/calculations';
import { formatPhpLedger } from '@/utils/currency';
import { formatIsoDateEnPh } from '@/utils/dates';

type Props = {
  visible: boolean;
  transaction: TransactionRow | null;
  onClose: () => void;
  onEdit: (t: TransactionRow) => void;
  onDelete: (t: TransactionRow) => void;
};

export function TransactionDetailModal({ visible, transaction, onClose, onEdit, onDelete }: Props) {
  const { colors, isDark } = useFinpalTheme();
  const dangerLabel = isDark ? colors.background : '#fff';
  const { height } = useWindowDimensions();
  const [phase, setPhase] = useState<'view' | 'confirmDelete'>('view');

  React.useEffect(() => {
    if (!visible) setPhase('view');
  }, [visible]);

  if (!transaction) return null;

  const settled = transaction.type === 'income' || isExpenseSettled(transaction);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={[styles.backdrop, { minHeight: height }]} onPress={onClose}>
        <Pressable
          style={[styles.sheet, { backgroundColor: colors.surface, borderColor: colors.border }]}
          onPress={(e) => e.stopPropagation()}>
          <View style={styles.sheetHeader}>
            <Text style={[styles.title, { color: colors.text }]}>Transaction</Text>
            <Pressable
              onPress={onClose}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel="Close">
              <FontAwesome name="times" size={22} color={colors.textMuted} />
            </Pressable>
          </View>

          <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
            {phase === 'view' ? (
              <>
                <Text style={[styles.amount, { color: colors.text }]}>
                  {formatPhpLedger(transaction.amount, transaction.type)}
                </Text>
                <View style={styles.badgeRow}>
                  <View
                    style={[
                      styles.typePill,
                      {
                        backgroundColor:
                          transaction.type === 'income' ? `${colors.success}22` : colors.surfaceSecondary,
                        borderColor: transaction.type === 'income' ? colors.success : colors.border,
                      },
                    ]}>
                    <Text
                      style={[
                        styles.typePillText,
                        { color: transaction.type === 'income' ? colors.success : colors.text },
                      ]}>
                      {transaction.type === 'income' ? 'Income' : 'Expense'}
                    </Text>
                  </View>
                  {transaction.type === 'expense' && transaction.priority ? (
                    <PriorityBadge priority={transaction.priority} colors={colors} />
                  ) : null}
                </View>

                <Row label="Description" value={transaction.description?.trim() || '—'} colors={colors} />
                <Row label="Category" value={transaction.category?.trim() || '—'} colors={colors} />
                <Row label="Date" value={formatIsoDateEnPh(transaction.date)} colors={colors} />
                {transaction.type === 'expense' && transaction.due_date ? (
                  <Row label="Due date" value={formatIsoDateEnPh(transaction.due_date)} colors={colors} />
                ) : null}
                <Row
                  label="Status"
                  value={settled ? 'Settled' : 'Awaiting payment'}
                  colors={colors}
                  muted={!settled}
                />
              </>
            ) : (
              <View style={styles.confirmBlock}>
                <Text style={[styles.confirmTitle, { color: colors.text }]}>Delete this transaction?</Text>
                <Text style={[styles.confirmBody, { color: colors.textMuted }]}>
                  This cannot be undone. Balances will be recomputed.
                </Text>
              </View>
            )}
          </ScrollView>

          {phase === 'view' ? (
            <View style={styles.actions}>
              <PrimaryButton title="Edit" onPress={() => onEdit(transaction)} style={styles.btn} />
              <PrimaryButton
                title="Delete"
                onPress={() => setPhase('confirmDelete')}
                variant="outline"
                style={styles.btn}
                textStyle={{ color: colors.danger }}
              />
            </View>
          ) : (
            <View style={styles.actions}>
              <PrimaryButton title="Cancel" onPress={() => setPhase('view')} variant="outline" style={styles.btn} />
              <Pressable
                onPress={() => onDelete(transaction)}
                style={({ pressed }) => [
                  styles.dangerBtn,
                  { backgroundColor: colors.danger, opacity: pressed ? 0.9 : 1 },
                ]}
                accessibilityRole="button"
                accessibilityLabel="Delete permanently">
                <Text style={[styles.dangerBtnText, { color: dangerLabel }]}>Delete permanently</Text>
              </Pressable>
            </View>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function Row({
  label,
  value,
  colors,
  muted,
}: {
  label: string;
  value: string;
  colors: { text: string; textMuted: string };
  muted?: boolean;
}) {
  return (
    <View style={styles.row}>
      <Text style={[styles.rowLabel, { color: colors.textMuted }]}>{label}</Text>
      <Text style={[styles.rowValue, { color: muted ? colors.textMuted : colors.text }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
    paddingBottom: 28,
  },
  sheet: {
    borderRadius: 22,
    borderWidth: 1,
    maxHeight: '88%',
    paddingBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 16,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 8,
  },
  title: { fontSize: 18, fontWeight: '800' },
  scroll: { maxHeight: 360, paddingHorizontal: 20 },
  amount: { fontSize: 28, fontWeight: '800', marginBottom: 12 },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  typePill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  typePillText: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.4 },
  row: { marginBottom: 12 },
  rowLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  rowValue: { fontSize: 15, lineHeight: 22 },
  confirmBlock: { paddingVertical: 8 },
  confirmTitle: { fontSize: 17, fontWeight: '800', marginBottom: 8 },
  confirmBody: { fontSize: 14, lineHeight: 20 },
  actions: { paddingHorizontal: 20, paddingTop: 8, gap: 4 },
  btn: { marginTop: 8 },
  dangerBtn: {
    marginTop: 8,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  dangerBtnText: { fontSize: 16, fontWeight: '600' },
});
