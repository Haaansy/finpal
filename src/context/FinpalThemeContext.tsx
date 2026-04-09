import React, { createContext, useContext, useMemo, useState } from 'react';
import { Appearance, ColorSchemeName } from 'react-native';

import type { ThemePreference } from '@/db/types';
import { updateThemePreference } from '@/db/db';
import type { FinpalColors } from '@/theme/colors';
import { DarkTheme, LightTheme } from '@/theme/colors';

interface FinpalThemeValue {
  preference: ThemePreference;
  setPreference: (p: ThemePreference) => Promise<void>;
  isDark: boolean;
  colors: FinpalColors;
  navigationScheme: 'light' | 'dark';
}

const FinpalThemeContext = createContext<FinpalThemeValue | null>(null);

function resolveScheme(pref: ThemePreference, system: ColorSchemeName): boolean {
  if (pref === 'dark') return true;
  if (pref === 'light') return false;
  return system === 'dark';
}

export function FinpalThemeProvider({
  initialPreference,
  children,
}: {
  initialPreference: ThemePreference;
  children: React.ReactNode;
}) {
  const [preference, setPrefState] = useState<ThemePreference>(initialPreference);
  const [systemScheme, setSystemScheme] = useState<ColorSchemeName>(
    () => Appearance.getColorScheme() ?? 'light'
  );

  React.useEffect(() => {
    const sub = Appearance.addChangeListener(({ colorScheme }) => {
      setSystemScheme(colorScheme ?? 'light');
    });
    return () => sub.remove();
  }, []);

  const isDark = resolveScheme(preference, systemScheme);

  const value = useMemo<FinpalThemeValue>(
    () => ({
      preference,
      setPreference: async (p) => {
        setPrefState(p);
        await updateThemePreference(p);
      },
      isDark,
      colors: isDark ? DarkTheme : LightTheme,
      navigationScheme: isDark ? 'dark' : 'light',
    }),
    [preference, isDark]
  );

  return <FinpalThemeContext.Provider value={value}>{children}</FinpalThemeContext.Provider>;
}

export function useFinpalTheme(): FinpalThemeValue {
  const ctx = useContext(FinpalThemeContext);
  if (!ctx) throw new Error('useFinpalTheme must be used within FinpalThemeProvider');
  return ctx;
}
