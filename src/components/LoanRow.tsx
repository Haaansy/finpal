import React from 'react';
import { StyleSheet, Text, View, type DimensionValue } from 'react-native';

import type { LoanRow as LoanRowType } from '@/db/types';
import { useFinpalTheme } from '@/context/FinpalThemeContext';
import { loanEstimatedPaidRatio } from '@/utils/calculations';
import { formatPhp } from '@/utils/currency';
import { formatIsoDateEnPh } from '@/utils/dates';

export function LoanRow({ loan }: { loan: LoanRowType }) {
  const { colors } = useFinpalTheme();
  const ratio = loanEstimatedPaidRatio(loan);
  const active = loan.months_left > 0;

  return (
    <View style={[styles.wrap, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.top}>
        <Text style={[styles.name, { color: colors.text }]}>{loan.name}</Text>
        <Text style={[styles.months, { color: active ? colors.primary : colors.textMuted }]}>
          {active
            ? (loan.is_recurring ?? 1) === 0
              ? 'One payment'
              : `${loan.months_left} mo left`
            : 'Paid off'}
        </Text>
      </View>
      <Text style={[styles.meta, { color: colors.textMuted }]}>
        {formatPhp(loan.monthly_repayment)}/mo · Total {formatPhp(loan.total_amount)}
      </Text>
      <View style={styles.tagRow}>
        <View
          style={[
            styles.tag,
            {
              backgroundColor: `${colors.primary}22`,
              borderColor: colors.primary,
            },
          ]}>
          <Text style={[styles.tagText, { color: colors.primary }]}>
            {(loan.is_recurring ?? 1) !== 0 ? 'Recurring' : 'Non-recurring'}
          </Text>
        </View>
        {loan.repayment_date ? (
          <View style={[styles.tag, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}>
            <Text style={[styles.tagText, { color: colors.text }]}>
              Due {formatIsoDateEnPh(loan.repayment_date)}
            </Text>
          </View>
        ) : null}
      </View>
      <View style={[styles.track, { backgroundColor: colors.surfaceSecondary }]}>
        <View
          style={[
            styles.fill,
            { width: `${Math.round(ratio * 100)}%` as DimensionValue, backgroundColor: colors.primary },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
  },
  top: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  name: { fontSize: 16, fontWeight: '700' },
  months: { fontSize: 14, fontWeight: '600' },
  meta: { fontSize: 13, marginTop: 4, marginBottom: 6 },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  tag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  tagText: { fontSize: 11, fontWeight: '700' },
  track: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 4,
  },
});
