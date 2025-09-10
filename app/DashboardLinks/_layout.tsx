import { Stack } from "expo-router";
import React from "react";

export default function DashboardLinksLayout() {
  return (
    <Stack>
      <Stack.Screen name="transfer" options={{ headerShown: false }} />
    </Stack>
  );
};
