import config from "@/config/tamagui.config";
import {
  ThemeProvider,
  useThemeContext,
} from "@/contextProviders/ThemeProvider";
import { UserProvider } from "@/contextProviders/UserProvider";
import { PortalProvider } from "@tamagui/portal";
import { ToastProvider, ToastViewport } from "@tamagui/toast";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { TamaguiProvider } from "tamagui";

function AppContent() {
  const { theme } = useThemeContext();

  return (
    <TamaguiProvider config={config} defaultTheme={theme}>
      <PortalProvider>
        <ToastProvider>
          <UserProvider>
            <ToastViewport position="absolute" bottom={25} l={0} r={0} />
            <Stack>
              <Stack.Screen name="index" options={{ headerShown: false }} />
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            </Stack>
            <StatusBar style={theme === "dark" ? "light" : "dark"} />
          </UserProvider>
        </ToastProvider>
      </PortalProvider>
    </TamaguiProvider>
  );
}

export default function RootLayout() {
  const [loaded, error] = useFonts({
    "Roboto-Bold": require("../assets/fonts/Roboto/static/Roboto-Bold.ttf"),
    "Roboto-Regular": require("../assets/fonts/Roboto/static/Roboto-Regular.ttf"),
    "Roboto-Black": require("../assets/fonts/Roboto/static/Roboto-Black.ttf"),
    "PTSans-Bold": require("../assets/fonts/PTSans/static/PTSans-Bold.ttf"),
    "PTSans-Regular": require("../assets/fonts/PTSans/static/PTSans-Regular.ttf"),
  });

  useEffect(() => {
    if (loaded || error) {
      SplashScreen.hideAsync();
    }
  }, [loaded, error]);

  if (!loaded && !error) {
    return null;
  }

  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}
