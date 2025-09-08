import { TabList, Tabs, TabSlot, TabTrigger } from "expo-router/ui";
import { HouseIcon, Plus, Settings } from "lucide-react-native";
import React from "react";
import { TouchableOpacity } from "react-native";

export default function TabLayout() {
  const [selectedTab, setSelectedTab] = React.useState("dashboard");

  return (
    <Tabs className="flex-1 w-full h-screen p-10 justify-center items-center absolute bottom-5">
      <TabSlot />
      <TabList className="border-2 border-red-300 rounded-md h-20">
        {selectedTab === "dashboard" ? (
          <TabTrigger
            name="dashboard"
            href="/(tabs)/dashboard"
            className="bg-red-300 p-6"
            onPress={() => setSelectedTab("dashboard")}
          >
            <HouseIcon />
          </TabTrigger>
        ) : (
          <TabTrigger
            name="dashboard"
            href="/(tabs)/dashboard"
            className="p-6"
            onPress={() => setSelectedTab("dashboard")}
          >
            <HouseIcon />
          </TabTrigger>
        )}
        <TouchableOpacity className="bg-red-300 p-6 rounded-full absolute -top-4">
          <Plus />
        </TouchableOpacity>
        {selectedTab === "settings" ? (
          <TabTrigger
            name="settings"
            href="/(tabs)/settings"
            className="bg-red-300 p-6"
            onPress={() => setSelectedTab("settings")}
          >
            <Settings />
          </TabTrigger>
        ) : (
          <TabTrigger
            name="settings"
            href="/(tabs)/settings"
            className="p-6"
            onPress={() => setSelectedTab("settings")}
          >
            <Settings />
          </TabTrigger>
        )}
      </TabList>
    </Tabs>
  );
}
