import { Image } from "expo-image";
import { router } from "expo-router";
import React from "react";
import { Text, View } from "react-native";
import Container from "./components/Container";
import CustomButton from "./components/CustomButton";
import CustomInput from "./components/CustomInput";

const AccountSetup = () => {
  return (
    <Container>
      <View className="flex justify-center items-start px-10">
        <Image
          source={require("../assets/images/finPal-logo.png")}
          style={{ width: "50%", height: 100 }}
          contentFit="contain"
        />

        <Text className="text-2xl" style={{ fontFamily: "Roboto-Bold" }}>
          Welcome,
        </Text>
        <View className="px-6 w-full">
          <Text
            className="text-2xl mt-2"
            style={{
              fontFamily: "Roboto-Bold",
            }}
          >
            What&apos;s your name?
          </Text>
          <Text
            className="text-sm text-left text-slate-700"
            style={{
              fontFamily: "PTSans-Regular",
            }}
          >
            I’d love to call you by your name when sending reminders and
            updates. Enter your name so I can make your experience more
            personal.
          </Text>

          <CustomInput />

          <Text
            className="text-sm text-left text-slate-700 mt-2 mb-10"
            style={{
              fontFamily: "PTSans-Regular",
            }}
          >
            This can be changed later in settings.
          </Text>

          <CustomButton label="Continue" onPress={() => {
            router.push("./(tabs)/dashboard")
          }} />
        </View>
      </View>
    </Container>
  );
};

export default AccountSetup;
