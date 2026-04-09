import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  type PressableProps,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';

import { useFinpalTheme } from '@/context/FinpalThemeContext';

interface PrimaryButtonProps extends Omit<PressableProps, 'style' | 'children'> {
  title: string;
  loading?: boolean;
  variant?: 'primary' | 'outline' | 'ghost';
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}

export function PrimaryButton({
  title,
  loading,
  variant = 'primary',
  disabled,
  style,
  textStyle,
  ...rest
}: PrimaryButtonProps) {
  const { colors, isDark } = useFinpalTheme();
  const isPrimary = variant === 'primary';

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.base,
        isPrimary
          ? { backgroundColor: colors.primary }
          : {
              backgroundColor: 'transparent',
              borderWidth: variant === 'outline' ? 2 : 0,
              borderColor: colors.primary,
            },
        pressed && { opacity: 0.85 },
        (disabled || loading) && { opacity: 0.5 },
        style,
      ]}
      {...rest}>
      {loading ? (
        <ActivityIndicator color={isPrimary ? '#fff' : colors.primary} />
      ) : (
        <Text
          style={[
            styles.label,
            { color: isPrimary ? '#FFFFFF' : colors.primary },
            isDark && !isPrimary && { color: colors.primary },
            textStyle,
          ]}>
          {title}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
  },
});
