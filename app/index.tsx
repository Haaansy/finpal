import { router } from "expo-router";
import { Image, StatusBar, Text, View } from "react-native";
import CustomButton from "./components/CustomButton";
import "./styles/app.css";

export default function App() {
  const handlePress = () => {
    router.push("/account-setup");
  };

  return (
    <View className="flex-1 justify-center items-center  mt-10">
      <View className="items-start justify-center">
        <Text
          className="text-6xl font-bold text-black mb-4"
          style={{ fontFamily: "Montserrat-Bold" }}
        >
          Hello,
        </Text>
        <Text
          className="text-xl font-bold text-black mb-4"
          style={{ fontFamily: "Montserrat-Bold" }}
        >
          I&apos;m
        </Text>
        <Image source={require("../assets/images/finPal-logo.png")} />
        <Text
          className="text-xl font-bold text-black mt-4"
          style={{ fontFamily: "Montserrat-Bold" }}
        >
          Your Smart Finance Buddy.
        </Text>
      </View>

      <View className="absolute bottom-10 items-center justify-center w-full px-10">
        <CustomButton onPress={handlePress} label="Continue" />
      </View>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
    </View>
  );
}
