import "@/app/styles/app.css";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    "Montserrat-Black": require("../assets/fonts/Montserrat/static/Montserrat-Black.ttf"),
    "Montserrat-Bold": require("../assets/fonts/Montserrat/static/Montserrat-Bold.ttf"),
    "Montserrat-Regular": require("../assets/fonts/Montserrat/static/Montserrat-Regular.ttf"),
    "PlayfairDisplay-Bold": require("../assets/fonts/Playfair_Display/static/PlayfairDisplay-Bold.ttf"),
    "PlayfairDisplay-Regular": require("../assets/fonts/Playfair_Display/static/PlayfairDisplay-Regular.ttf"),
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
    <Stack>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen
        name="account-setup"
        options={{
          animation: "slide_from_bottom", // 👈 slide up transition
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="(tabs)"
        options={{
          animation: "slide_from_bottom", // 👈 slide up transition
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="DashboardLinks"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen name="Settings" options={{ headerShown: false }} />
    </Stack>
  );
}
