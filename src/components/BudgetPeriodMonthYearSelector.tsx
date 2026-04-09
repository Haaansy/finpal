import { ChevronIcon } from '@/components/ChevronIcon';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { FinpalColors } from '@/theme/colors';
import { formatYearMonthHeading } from '@/utils/dates';

const MIN_YEAR = 2000;
const FUTURE_MONTHS_AHEAD = 24;

function maxCalendarMonthTotal(): number {
  const now = new Date();
  return now.getFullYear() * 12 + now.getMonth() + FUTURE_MONTHS_AHEAD;
}

function clampCalendarMonthTotal(total: number): { y: number; m: number } {
  const min = MIN_YEAR * 12;
  const max = maxCalendarMonthTotal();
  const t = Math.min(Math.max(total, min), max);
  return { y: Math.floor(t / 12), m: t % 12 };
}

function addCalendarMonths(y: number, m: number, delta: number): { y: number; m: number } {
  return clampCalendarMonthTotal(y * 12 + m + delta);
}

export type MonthYear = { y: number; m: number };

type Props = {
  value: MonthYear;
  onChange: (next: MonthYear) => void;
  colors: FinpalColors;
};

export function BudgetPeriodMonthYearSelector({ value, onChange, colors }: Props) {
  const { y, m } = value;
  const atMin = y * 12 + m <= MIN_YEAR * 12;
  const atMax = y * 12 + m >= maxCalendarMonthTotal();
  const monthLabel = formatYearMonthHeading(`${y}-${String(m + 1).padStart(2, '0')}`);

  return (
    <View style={[styles.selectorCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Text style={[styles.selectorLabel, { color: colors.textMuted }]}>Budget period (month & year)</Text>
      <View style={styles.selectorRow}>
        <Pressable
          onPress={() => !atMin && onChange(addCalendarMonths(y, m, -1))}
          disabled={atMin}
          style={({ pressed }) => [
            styles.selectorIconBtn,
            { borderColor: colors.border },
            atMin && styles.selectorIconBtnDisabled,
            pressed && !atMin && { opacity: 0.85 },
          ]}
          accessibilityRole="button"
          accessibilityLabel="Previous month">
          <ChevronIcon direction="left" size={22} color={atMin ? colors.textMuted : colors.primary} />
        </Pressable>
        <Text style={[styles.selectorMonth, { color: colors.text }]}>{monthLabel}</Text>
        <Pressable
          onPress={() => !atMax && onChange(addCalendarMonths(y, m, 1))}
          disabled={atMax}
          style={({ pressed }) => [
            styles.selectorIconBtn,
            { borderColor: colors.border },
            atMax && styles.selectorIconBtnDisabled,
            pressed && !atMax && { opacity: 0.85 },
          ]}
          accessibilityRole="button"
          accessibilityLabel="Next month">
          <ChevronIcon direction="right" size={22} color={atMax ? colors.textMuted : colors.primary} />
        </Pressable>
      </View>
      <View style={[styles.yearRow, { borderTopColor: colors.border }]}>
        <Text style={[styles.yearRowLabel, { color: colors.textMuted }]}>Year</Text>
        <View style={styles.yearStepper}>
          <Pressable
            onPress={() => !atMin && onChange(addCalendarMonths(y, m, -12))}
            disabled={atMin}
            style={({ pressed }) => [
              styles.selectorIconBtn,
              styles.yearStepBtn,
              { borderColor: colors.border },
              atMin && styles.selectorIconBtnDisabled,
              pressed && !atMin && { opacity: 0.85 },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Previous year">
            <ChevronIcon direction="left" size={20} color={atMin ? colors.textMuted : colors.primary} />
          </Pressable>
          <Text style={[styles.yearValue, { color: colors.text }]}>{y}</Text>
          <Pressable
            onPress={() => !atMax && onChange(addCalendarMonths(y, m, 12))}
            disabled={atMax}
            style={({ pressed }) => [
              styles.selectorIconBtn,
              styles.yearStepBtn,
              { borderColor: colors.border },
              atMax && styles.selectorIconBtnDisabled,
              pressed && !atMax && { opacity: 0.85 },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Next year">
            <ChevronIcon direction="right" size={20} color={atMax ? colors.textMuted : colors.primary} />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  selectorLabel: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  selectorCard: {
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 10,
    marginBottom: 14,
    gap: 10,
  },
  selectorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  selectorIconBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 48,
    minHeight: 44,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  selectorIconBtnDisabled: { opacity: 0.45 },
  selectorMonth: {
    flex: 1,
    textAlign: 'center',
    fontSize: 17,
    fontWeight: '800',
  },
  yearRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 10,
    marginTop: 2,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  yearRowLabel: { fontSize: 13, fontWeight: '700' },
  yearStepper: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  yearStepBtn: { minWidth: 44, minHeight: 40 },
  yearValue: {
    fontSize: 18,
    fontWeight: '800',
    minWidth: 52,
    textAlign: 'center',
  },
});
