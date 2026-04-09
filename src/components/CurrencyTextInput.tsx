import React from 'react';
import { StyleSheet, Text, TextInput, View, type TextInputProps, type ViewStyle } from 'react-native';

import type { FinpalColors } from '@/theme/colors';
import { formatCurrencyAsTyped } from '@/utils/currencyInput';

type Props = Omit<TextInputProps, 'value' | 'onChangeText' | 'keyboardType'> & {
  value: string;
  onChangeText: (value: string) => void;
  colors: FinpalColors;
  containerStyle?: ViewStyle;
};

export function CurrencyTextInput({ value, onChangeText, colors, style, containerStyle, ...rest }: Props) {
  return (
    <View
      style={[
        styles.row,
        { borderColor: colors.border, backgroundColor: colors.surface },
        containerStyle,
      ]}>
      <Text style={[styles.prefix, { color: colors.textMuted }]}>₱</Text>
      <TextInput
        {...rest}
        value={value}
        onChangeText={(t) => onChangeText(formatCurrencyAsTyped(t))}
        keyboardType="decimal-pad"
        style={[styles.input, { color: colors.text }, style]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    minHeight: 48,
  },
  prefix: {
    fontSize: 16,
    fontWeight: '700',
    paddingLeft: 14,
    paddingRight: 4,
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    paddingRight: 14,
    fontSize: 16,
  },
});
