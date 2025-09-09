import { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { usePathname, useRouter } from "expo-router";
import { House, Plus, Settings } from "lucide-react-native";
import { TouchableOpacity, View } from "react-native";

export default function CustomTabBar(props: BottomTabBarProps) {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <View className="w-full items-center justify-center absolute bottom-10">
      <View className="flex-row justify-between items-center border border-red-300 rounded-xl h-20 bg-white w-1/2 px-8">

        {/* Dashboard */}
        <TouchableOpacity onPress={() => router.push("/(tabs)/dashboard")}>
          <House color={pathname.includes("dashboard") ? "red" : "gray"} />
        </TouchableOpacity>

        {/* Settings */}
        <TouchableOpacity onPress={() => router.push("/(tabs)/settings")}>
          <Settings color={pathname.includes("settings") ? "red" : "gray"} />
        </TouchableOpacity>
      </View>

      {/* Floating Center Button */}
      <TouchableOpacity
        onPress={() => {}}
        className="absolute -top-10 left-1/2 -translate-x-10 w-20 h-20 rounded-full bg-red-300 justify-center items-center shadow-lg"
      >
        <Plus size={32} color="white" />
      </TouchableOpacity>
    </View>
  );
}
