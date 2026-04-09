import React from 'react';
import { StyleSheet, View, type StyleProp, type ViewProps, type ViewStyle } from 'react-native';

import { useFinpalTheme } from '@/context/FinpalThemeContext';

export function Card({
  children,
  style,
  ...rest
}: ViewProps & { style?: StyleProp<ViewStyle> }) {
  const { colors } = useFinpalTheme();
  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }, style]} {...rest}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
  },
});
