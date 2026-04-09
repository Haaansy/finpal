import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { ExpensePriority } from '@/db/types';
import type { FinpalColors } from '@/theme/colors';

export function PriorityBadge({
  priority,
  colors,
}: {
  priority: ExpensePriority;
  colors: FinpalColors;
}) {
  const high = priority === 'high';
  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: high ? `${colors.danger}18` : `${colors.primary}18`,
          borderColor: high ? colors.danger : colors.primary,
        },
      ]}>
      <Text style={[styles.badgeText, { color: high ? colors.danger : colors.primary }]}>
        {high ? 'High' : 'Low'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  badgeText: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.3 },
});
