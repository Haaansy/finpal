import { router, usePathname } from 'expo-router';
import React, { useState } from 'react';
import { StyleSheet } from 'react-native';
import { FAB } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useFinpalTheme } from '@/context/FinpalThemeContext';

const TAB_BAR_HEIGHT = 49;

export function AddTransactionFab() {
  const [open, setOpen] = useState(false);
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useFinpalTheme();
  const pathname = usePathname();
  const hideFab =
    pathname === '/entry' ||
    pathname === '/loan-entry' ||
    pathname === '/due-checklist' ||
    pathname === '/calendar' ||
    pathname === '/settings' ||
    pathname === '/past-overview';

  const bottom = TAB_BAR_HEIGHT + insets.bottom + 12;

  if (hideFab) {
    return null;
  }

  return (
    <FAB.Group
      open={open}
      visible
      icon={open ? 'close' : 'plus'}
      fabStyle={{ backgroundColor: colors.primary }}
      color="#FFFFFF"
      backdropColor={isDark ? 'rgba(0,0,0,0.65)' : 'rgba(0,0,0,0.35)'}
      actions={[
        {
          icon: 'trending-up',
          label: 'Income',
          color: '#FFFFFF',
          style: { backgroundColor: '#E91E63' },
          onPress: () => {
            setOpen(false);
            router.push({ pathname: '/entry', params: { mode: 'income' } });
          },
        },
        {
          icon: 'trending-down',
          label: 'Expense',
          color: '#FFFFFF',
          style: { backgroundColor: '#AB47BC' },
          onPress: () => {
            setOpen(false);
            router.push({ pathname: '/entry', params: { mode: 'expense' } });
          },
        },
        {
          icon: 'bank',
          label: 'Loan',
          color: '#FFFFFF',
          style: { backgroundColor: '#7B1FA2' },
          onPress: () => {
            setOpen(false);
            router.push('/loan-entry');
          },
        },
      ]}
      onStateChange={({ open: next }) => setOpen(next)}
      style={[styles.anchor, { bottom }]}
    />
  );
}

const styles = StyleSheet.create({
  anchor: {
    position: 'absolute',
    right: 0,
  },
});
