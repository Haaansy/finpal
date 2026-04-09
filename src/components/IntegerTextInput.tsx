import React from 'react';
import { StyleSheet, TextInput, type TextInputProps } from 'react-native';

import type { FinpalColors } from '@/theme/colors';
import { formatIntegerAsTyped } from '@/utils/currencyInput';

type Props = Omit<TextInputProps, 'value' | 'onChangeText' | 'keyboardType'> & {
  value: string;
  onChangeText: (value: string) => void;
  colors: FinpalColors;
};

export function IntegerTextInput({ value, onChangeText, colors, style, ...rest }: Props) {
  return (
    <TextInput
      {...rest}
      value={value}
      onChangeText={(t) => onChangeText(formatIntegerAsTyped(t))}
      keyboardType="number-pad"
      style={[
        styles.input,
        { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
  },
});
