import 'react-native-gesture-handler';
import Feather from '@expo/vector-icons/Feather';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';

import { BudgetProvider } from '@/context/BudgetContext';
import { FinpalDialogProvider } from '@/context/FinpalDialogContext';
import { FinpalThemeProvider, useFinpalTheme } from '@/context/FinpalThemeContext';
import { getAppSettings, getDatabase } from '@/db/db';
import { initNotificationHandler } from '@/notifications/loanDueNotifications';
import type { ThemePreference } from '@/db/types';

export { ErrorBoundary } from 'expo-router';

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

SplashScreen.preventAutoHideAsync();
initNotificationHandler();

function NavigationThemeBridge({ children }: { children: React.ReactNode }) {
  const { colors, navigationScheme } = useFinpalTheme();
  const base = navigationScheme === 'dark' ? DarkTheme : DefaultTheme;
  const merged = {
    ...base,
    colors: {
      ...base.colors,
      primary: colors.primary,
      background: colors.background,
      card: colors.surface,
      text: colors.text,
      border: colors.border,
      notification: colors.primary,
    },
  };
  return <ThemeProvider value={merged}>{children}</ThemeProvider>;
}

function RootStack() {
  return (
    <NavigationThemeBridge>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      </Stack>
    </NavigationThemeBridge>
  );
}

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    ...FontAwesome.font,
    ...Feather.font,
  });

  const [themePref, setThemePref] = useState<ThemePreference | null>(null);

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (!loaded) return;
    getDatabase()
      .then(() => getAppSettings())
      .then((s) => setThemePref(s.themePreference))
      .catch(() => setThemePref('system'));
  }, [loaded]);

  useEffect(() => {
    if (loaded && themePref !== null) {
      SplashScreen.hideAsync();
    }
  }, [loaded, themePref]);

  if (!loaded || themePref === null) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <FinpalThemeProvider initialPreference={themePref}>
        <FinpalDialogProvider>
          <BudgetProvider>
            <RootStack />
          </BudgetProvider>
        </FinpalDialogProvider>
      </FinpalThemeProvider>
    </GestureHandlerRootView>
  );
}
