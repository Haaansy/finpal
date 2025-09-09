import { Image } from "expo-image";
import React from "react";
import { Text, View } from "react-native";

const Card = () => {
  return (
    <View className="flex-1 bg-red-300 rounded-xl p-5 shadow-red-200/50 shadow-lg mx-2 justify-between">
      <View>
        <View className="flex-row justify-between items-center">
          <Text
            className="text-white text-2xl"
            style={{ fontFamily: "Roboto-Bold" }}
          >
            Wallet Summary
          </Text>
          <Text
            className="text-white text-2xl"
            style={{ fontFamily: "Roboto-Bold" }}
          >
            P 12,000.00
          </Text>
        </View>
        <Text
          className="text-white text-xs"
          style={{ fontFamily: "PTSans-Regular" }}
        >
          Here’s the big picture across all your wallets.
        </Text>
      </View>

      <View className="w-full">
        <Text className="text-white text-lg" style={{ fontFamily: "Roboto-Bold" }}>
          **** **** **** 1234
        </Text>
        <View className="flex-row justify-between items-center">
          <Text className="text-white text-lg" style={{ fontFamily: "Roboto-Bold" }}>
            ***
          </Text>
          <Text className="text-white text-lg" style={{ fontFamily: "Roboto-Bold" }}>
            **/**
          </Text>
          <Image source={require("@/assets/images/finPal-logo.png")} contentFit="contain" style={{ width: 50, height: 20 }} />
        </View>
      </View>
    </View>
  );
};

export default Card;
