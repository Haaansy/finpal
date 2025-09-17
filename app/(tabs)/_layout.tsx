import { Tabs } from "expo-router";
import CustomTabBar from "../components/CustomTabBar";


export default function TabsLayout() {

  function handleCentralButtonPress() {
    console.log("Central button pressed!");
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
      }}
      tabBar={(props) => <CustomTabBar {...props} onPressCentralButton={handleCentralButtonPress}/>}
    >
      <Tabs.Screen name="dashboard" />
    </Tabs>
  );
}
