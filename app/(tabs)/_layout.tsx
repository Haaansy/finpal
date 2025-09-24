import { Tabs } from "expo-router";
import React from "react";

const TabsLayout = () => {
  return (
    <Tabs>
      <Tabs.Screen
        name="dashboard"
        options={{
          headerShown: false,
          tabBarLabel: "Dashboard",
        }}
      />
    </Tabs>
  );
};

export default TabsLayout;
