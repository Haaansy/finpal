import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Tabs } from 'expo-router';
import React, { useMemo } from 'react';
import { View } from 'react-native';
import { MD3DarkTheme, MD3LightTheme, PaperProvider } from 'react-native-paper';

import { AddTransactionFab } from '@/components/AddTransactionFab';
import { useFinpalTheme } from '@/context/FinpalThemeContext';

function TabBarIcon(props: {
  name: React.ComponentProps<typeof FontAwesome>['name'];
  color: string;
}) {
  return <FontAwesome size={24} style={{ marginBottom: -2 }} {...props} />;
}

function TabsWithFab() {
  const { colors, isDark } = useFinpalTheme();

  const paperTheme = useMemo(
    () => ({
      ...(isDark ? MD3DarkTheme : MD3LightTheme),
      colors: {
        ...(isDark ? MD3DarkTheme.colors : MD3LightTheme.colors),
        primary: colors.primary,
        primaryContainer: isDark ? '#4A1942' : colors.surfaceSecondary,
        surface: colors.surface,
        background: colors.background,
        onPrimary: '#FFFFFF',
        onSurface: colors.text,
        onSurfaceVariant: colors.textMuted,
      },
    }),
    [colors, isDark]
  );

  return (
    <PaperProvider theme={paperTheme}>
      <View style={{ flex: 1 }}>
        <Tabs
          screenOptions={{
            headerShown: false,
            tabBarActiveTintColor: colors.primary,
            tabBarInactiveTintColor: colors.textMuted,
            tabBarStyle: {
              backgroundColor: colors.tabBar,
              borderTopColor: colors.border,
            },
          }}>
          <Tabs.Screen
            name="index"
            options={{
              title: 'Home',
              tabBarIcon: ({ color }) => <TabBarIcon name="home" color={color} />,
            }}
          />
          <Tabs.Screen
            name="entry"
            options={{
              href: null,
            }}
          />
          <Tabs.Screen
            name="loan-entry"
            options={{
              href: null,
            }}
          />
          <Tabs.Screen
            name="due-checklist"
            options={{
              href: null,
            }}
          />
          <Tabs.Screen
            name="past-overview"
            options={{
              href: null,
            }}
          />
          <Tabs.Screen
            name="transactions"
            options={{
              title: 'Transactions',
              tabBarIcon: ({ color }) => <TabBarIcon name="list" color={color} />,
            }}
          />
          <Tabs.Screen
            name="calendar"
            options={{
              title: 'Calendar',
              tabBarIcon: ({ color }) => <TabBarIcon name="calendar" color={color} />,
            }}
          />
          <Tabs.Screen
            name="loans"
            options={{
              href: null,
            }}
          />
          <Tabs.Screen
            name="settings"
            options={{
              title: 'Settings',
              tabBarIcon: ({ color }) => <TabBarIcon name="cog" color={color} />,
            }}
          />
        </Tabs>
        <AddTransactionFab />
      </View>
    </PaperProvider>
  );
}

export default function TabLayout() {
  return <TabsWithFab />;
}
