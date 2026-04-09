import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useFinpalTheme } from '@/context/FinpalThemeContext';
import { formatPhp } from '@/utils/currency';
import { BRAND } from '@/theme/colors';

export function SafeToSpendCard({
  amount,
  periodHint,
}: {
  amount: number;
  periodHint?: string;
}) {
  const { isDark } = useFinpalTheme();

  const gradientColors = isDark
    ? (['#4A1942', '#2D1B35', '#1A1218'] as const)
    : ([BRAND.primaryLight, BRAND.primary, '#FF85C8'] as const);

  return (
    <View style={styles.shadowWrap}>
      <LinearGradient
        colors={gradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}>
        <Text style={styles.caption}>Safe to spend (this period)</Text>
        <Text style={styles.amount}>{formatPhp(amount)}</Text>
        {periodHint ? (
          <Text style={[styles.period, { color: isDark ? 'rgba(255,255,255,0.88)' : 'rgba(255,255,255,0.95)' }]}>
            {periodHint}
          </Text>
        ) : null}
        <Text style={[styles.hint, { color: isDark ? 'rgba(255,255,255,0.75)' : 'rgba(255,255,255,0.9)' }]}>
          Your 40% low-priority slice of Funds, minus low-priority spending & loan repayments
        </Text>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  shadowWrap: {
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 8,
  },
  gradient: {
    padding: 22,
    borderRadius: 20,
  },
  caption: {
    color: 'rgba(255,255,255,0.92)',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 6,
  },
  amount: {
    color: '#FFFFFF',
    fontSize: 36,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  period: {
    marginTop: 8,
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
  hint: {
    marginTop: 10,
    fontSize: 12,
    lineHeight: 16,
  },
});
