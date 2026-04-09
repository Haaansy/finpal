import { ChevronIcon } from '@/components/ChevronIcon';
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useBudget } from '@/context/BudgetContext';
import { useFinpalTheme } from '@/context/FinpalThemeContext';
import type { CalculationsSnapshot } from '@/hooks/useCalculations';
import { useCalculations } from '@/hooks/useCalculations';
import { savingsOfFundsRate } from '@/utils/budgetRates';
import { formatPhp } from '@/utils/currency';

function Line({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  const { colors } = useFinpalTheme();
  return (
    <View style={styles.lineRow}>
      <Text style={[styles.lineLabel, { color: muted ? colors.textMuted : colors.text }]}>{label}</Text>
      <Text style={[styles.lineValue, { color: muted ? colors.textMuted : colors.text }]}>{value}</Text>
    </View>
  );
}

export function ComputationInfoCollapsible({ metrics }: { metrics?: CalculationsSnapshot }) {
  const { colors } = useFinpalTheme();
  const { settings } = useBudget();
  const [open, setOpen] = useState(false);
  const live = useCalculations();
  const {
    incomeMonth,
    highPriMonth,
    highPriBillsTotal,
    loanPay,
    funds,
    savingsPool,
    disposableBudget,
    bucketTargets,
    lowPriMonth,
    safeToSpend,
    periodRangeFormatted,
    periodRuleText,
  } = metrics ?? live;

  const r = settings.budgetRates;
  const dPct = Math.round(r.disposableOfFunds * 100);
  const sPct = Math.round(savingsOfFundsRate(r) * 100);

  return (
    <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.surface }]}>
      <Pressable
        onPress={() => setOpen((v) => !v)}
        style={({ pressed }) => [styles.header, pressed && { opacity: 0.85 }]}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel="Computation details, tap to expand or collapse">
        <Text style={[styles.headerTitle, { color: colors.text }]}>How numbers are calculated</Text>
        <ChevronIcon direction={open ? 'up' : 'down'} size={16} color={colors.primary} />
      </Pressable>

      {open ? (
        <View style={[styles.body, { borderTopColor: colors.border }]}>
          <Text style={[styles.intro, { color: colors.textMuted }]}>
            Same rules as Remaining Funds, savings buckets, and Safe to spend for this budget period.
          </Text>
          <Line label="Period" value={periodRangeFormatted} muted />
          <Text style={[styles.ruleNote, { color: colors.textMuted }]}>{periodRuleText}</Text>

          <Text style={[styles.subhead, { color: colors.text }]}>This period</Text>
          <Line label="Income (settled)" value={formatPhp(incomeMonth)} />
          <Line
            label="High-priority outflow"
            value={formatPhp(highPriMonth)}
            muted
          />
          <Text style={[styles.indent, { color: colors.textMuted }]}>
            {formatPhp(highPriBillsTotal)} bills + {formatPhp(loanPay)} loan repayments (all loans)
          </Text>
          <Line label="Remaining Funds" value={formatPhp(funds)} />
          <Text style={[styles.indent, { color: colors.textMuted }]}>
            max(0, income − high-priority outflow)
          </Text>

          <Text style={[styles.subhead, { color: colors.text }]}>Split of Remaining Funds</Text>
          <Line
            label={`Disposable slice (${dPct}%)`}
            value={formatPhp(disposableBudget)}
          />
          <Line
            label={`Savings pool (${sPct}%)`}
            value={formatPhp(savingsPool)}
          />
          <Text style={[styles.indent, { color: colors.textMuted }]}>
            Targets this period: Future {formatPhp(bucketTargets.future)} · Emergency{' '}
            {formatPhp(bucketTargets.emergency)} · Travel {formatPhp(bucketTargets.travel)} (
            {Math.round(r.futureOfSavings * 100)}% / {Math.round(r.emergencyOfSavings * 100)}% /{' '}
            {Math.round(r.travelOfSavings * 100)}% of the savings portion)
          </Text>

          <Text style={[styles.subhead, { color: colors.text }]}>Safe to spend</Text>
          <Line label="Low-priority spending" value={formatPhp(lowPriMonth)} />
          <Line label="Safe to spend" value={formatPhp(safeToSpend)} />
          <Text style={[styles.indent, { color: colors.textMuted }]}>
            {dPct}% of Funds minus low-priority spending this period
          </Text>

          <Text style={[styles.footer, { color: colors.textMuted }]}>
            Running savings balances (Future, Emergency, Travel, Disposable) sum the same splits across all past
            periods from your history — see Settings for the full budget rule.
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: 12,
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  headerTitle: { fontSize: 15, fontWeight: '700', flex: 1, paddingRight: 8 },
  body: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
  },
  intro: { fontSize: 12, lineHeight: 17, marginBottom: 12 },
  ruleNote: { fontSize: 11, lineHeight: 15, marginTop: -6, marginBottom: 10 },
  subhead: { fontSize: 13, fontWeight: '800', marginTop: 12, marginBottom: 8 },
  lineRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 6,
  },
  lineLabel: { fontSize: 13, flex: 1, lineHeight: 18 },
  lineValue: { fontSize: 13, fontWeight: '700', textAlign: 'right' },
  indent: { fontSize: 11, lineHeight: 15, marginBottom: 8, marginLeft: 4 },
  footer: { fontSize: 11, lineHeight: 16, marginTop: 14 },
});
