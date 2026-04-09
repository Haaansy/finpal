import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useBudget } from '@/context/BudgetContext';
import { useFinpalTheme } from '@/context/FinpalThemeContext';
import type { CalculationsSnapshot } from '@/hooks/useCalculations';
import { useCalculations } from '@/hooks/useCalculations';
import { formatPhp } from '@/utils/currency';

function SavingsAmountCard({
  label,
  amount,
  accent,
}: {
  label: string;
  amount: number;
  accent: string;
}) {
  const { colors } = useFinpalTheme();
  return (
    <View style={[styles.bucketCard, { borderColor: colors.border, backgroundColor: colors.surface }]}>
      <View style={[styles.bucketAccent, { backgroundColor: accent }]} />
      <Text style={[styles.bucketLabel, { color: colors.textMuted }]}>{label}</Text>
      <Text style={[styles.bucketAmount, { color: colors.text }]}>{formatPhp(amount)}</Text>
    </View>
  );
}

type PeriodPick = Pick<CalculationsSnapshot, 'periodEndFormatted' | 'periodRangeFormatted' | 'periodRuleText'>;

export function SavingsProgress({ periodFrom }: { periodFrom?: PeriodPick }) {
  const { savings } = useBudget();
  const { colors } = useFinpalTheme();
  const live = useCalculations();
  const { periodEndFormatted, periodRangeFormatted, periodRuleText } = periodFrom ?? live;

  return (
    <View style={styles.wrap}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>Savings</Text>
      <Text style={[styles.sectionSub, { color: colors.textMuted }]}>
        Running balances from your budget history (recomputed from transactions and loans).
      </Text>
      <View style={styles.grid}>
        <SavingsAmountCard label="Future" amount={savings.standard} accent="#9C27B0" />
        <SavingsAmountCard label="Emergency" amount={savings.emergency} accent="#E91E63" />
        <SavingsAmountCard label="Travel" amount={savings.travel} accent="#AB47BC" />
        <SavingsAmountCard label="Disposable pool" amount={savings.disposable} accent={colors.primary} />
      </View>
      <Text style={[styles.rangeNote, { color: colors.textMuted }]}>Period: {periodRangeFormatted}</Text>
      <Text style={[styles.rangeNote, { color: colors.textMuted, marginTop: 2 }]}>{periodRuleText}</Text>
      <Text style={[styles.rangeNote, { color: colors.textMuted, marginTop: 2 }]}>
        Next period end: {periodEndFormatted}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 6,
  },
  sectionSub: {
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 12,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  bucketCard: {
    width: '47%',
    flexGrow: 1,
    minWidth: '42%',
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 12,
    paddingRight: 12,
    paddingLeft: 16,
    overflow: 'hidden',
  },
  bucketAccent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    borderTopLeftRadius: 14,
    borderBottomLeftRadius: 14,
  },
  bucketLabel: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 6,
  },
  bucketAmount: {
    fontSize: 18,
    fontWeight: '800',
  },
  rangeNote: {
    fontSize: 11,
    lineHeight: 15,
    marginTop: 12,
  },
});
