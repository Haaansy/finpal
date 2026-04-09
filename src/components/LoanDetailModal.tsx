import React, { useState } from 'react';
import type { DimensionValue } from 'react-native';
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

import { PrimaryButton } from '@/components/PrimaryButton';
import type { LoanRow } from '@/db/types';
import { useFinpalTheme } from '@/context/FinpalThemeContext';
import type { FinpalColors } from '@/theme/colors';
import { loanEstimatedPaidRatio } from '@/utils/calculations';
import { formatPhp } from '@/utils/currency';
import { formatIsoDateEnPh } from '@/utils/dates';

type Props = {
  visible: boolean;
  loan: LoanRow | null;
  onClose: () => void;
  onEdit: (loan: LoanRow) => void;
  onDelete: (loan: LoanRow) => void;
};

export function LoanDetailModal({ visible, loan, onClose, onEdit, onDelete }: Props) {
  const { colors, isDark } = useFinpalTheme();
  const dangerLabel = isDark ? colors.background : '#fff';
  const { height } = useWindowDimensions();
  const [phase, setPhase] = useState<'view' | 'confirmDelete'>('view');

  React.useEffect(() => {
    if (!visible) setPhase('view');
  }, [visible]);

  if (!loan) return null;

  const ratio = loanEstimatedPaidRatio(loan);
  const active = loan.months_left > 0;
  const recurring = (loan.is_recurring ?? 1) !== 0;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={[styles.backdrop, { minHeight: height }]} onPress={onClose}>
        <Pressable
          style={[styles.sheet, { backgroundColor: colors.surface, borderColor: colors.border }]}
          onPress={(e) => e.stopPropagation()}>
          <View style={styles.sheetHeader}>
            <Text style={[styles.title, { color: colors.text }]}>Loan</Text>
            <Pressable onPress={onClose} hitSlop={12} accessibilityRole="button" accessibilityLabel="Close">
              <FontAwesome name="times" size={22} color={colors.textMuted} />
            </Pressable>
          </View>

          <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
            {phase === 'view' ? (
              <>
                <Text style={[styles.name, { color: colors.text }]}>{loan.name}</Text>
                <Text style={[styles.amountLine, { color: colors.textMuted }]}>
                  {formatPhp(loan.monthly_repayment)}/mo · Total {formatPhp(loan.total_amount)}
                </Text>
                <Row
                  label="Status"
                  value={active ? (recurring ? `${loan.months_left} months left` : 'One payment') : 'Paid off'}
                  colors={colors}
                />
                <Row label="Type" value={recurring ? 'Recurring monthly' : 'One-off'} colors={colors} />
                {loan.repayment_date ? (
                  <Row label="Next / due date" value={formatIsoDateEnPh(loan.repayment_date)} colors={colors} />
                ) : (
                  <Row label="Next / due date" value="—" colors={colors} />
                )}
                <Text style={[styles.progressLabel, { color: colors.textMuted }]}>Paid down (estimate)</Text>
                <View style={[styles.track, { backgroundColor: colors.surfaceSecondary }]}>
                  <View
                    style={[
                      styles.fill,
                      {
                        width: `${Math.round(ratio * 100)}%` as DimensionValue,
                        backgroundColor: colors.primary,
                      },
                    ]}
                  />
                </View>

                <PrimaryButton title="Edit" onPress={() => onEdit(loan)} variant="outline" style={styles.btn} />
                <Pressable
                  onPress={() => setPhase('confirmDelete')}
                  style={({ pressed }) => [
                    styles.deleteBtn,
                    { borderColor: colors.danger, opacity: pressed ? 0.85 : 1 },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel="Delete loan">
                  <Text style={[styles.deleteBtnText, { color: colors.danger }]}>Delete loan</Text>
                </Pressable>
              </>
            ) : (
              <>
                <Text style={[styles.confirmTitle, { color: colors.text }]}>Delete this loan?</Text>
                <Text style={[styles.confirmBody, { color: colors.textMuted }]}>
                  {loan.name} — this cannot be undone. Budget totals will update.
                </Text>
                <View style={styles.confirmRow}>
                  <Pressable
                    onPress={() => setPhase('view')}
                    style={[styles.halfBtn, { borderColor: colors.border, backgroundColor: colors.surfaceSecondary }]}>
                    <Text style={[styles.halfBtnText, { color: colors.text }]}>Cancel</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => onDelete(loan)}
                    style={[styles.halfBtn, { backgroundColor: colors.danger }]}>
                    <Text style={[styles.halfBtnText, { color: dangerLabel }]}>Delete</Text>
                  </Pressable>
                </View>
              </>
            )}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function Row({ label, value, colors }: { label: string; value: string; colors: FinpalColors }) {
  return (
    <View style={styles.row}>
      <Text style={[styles.rowLabel, { color: colors.textMuted }]}>{label}</Text>
      <Text style={[styles.rowValue, { color: colors.text }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet: {
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    maxHeight: '88%',
    paddingBottom: 24,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 8,
  },
  title: { fontSize: 18, fontWeight: '800' },
  scroll: { paddingHorizontal: 18 },
  name: { fontSize: 22, fontWeight: '800', marginBottom: 6 },
  amountLine: { fontSize: 15, marginBottom: 16 },
  row: { marginBottom: 12 },
  rowLabel: { fontSize: 12, fontWeight: '600', marginBottom: 4 },
  rowValue: { fontSize: 16, fontWeight: '600' },
  progressLabel: { fontSize: 12, fontWeight: '600', marginTop: 8, marginBottom: 6 },
  track: { height: 8, borderRadius: 4, overflow: 'hidden', marginBottom: 20 },
  fill: { height: '100%', borderRadius: 4 },
  btn: { marginBottom: 10 },
  deleteBtn: {
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    marginBottom: 12,
  },
  deleteBtnText: { fontSize: 16, fontWeight: '700' },
  confirmTitle: { fontSize: 18, fontWeight: '800', marginBottom: 10 },
  confirmBody: { fontSize: 14, lineHeight: 20, marginBottom: 20 },
  confirmRow: { flexDirection: 'row', gap: 12 },
  halfBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
  halfBtnText: { fontSize: 16, fontWeight: '700' },
});
