import { router } from "expo-router";
import { ChevronLeft } from "lucide-react-native";
import React from "react";
import { Text, TouchableWithoutFeedback, View } from "react-native";
import Container from "../components/Container";
import TransferForm from "../components/Dashboard/Transfer/TransferForm";
import Logo from "../components/Logo";

const transfer = () => {
  return (
    <Container>
      <View className="flex flex-1 px-10">
        <Logo />

        <View className="flex flex-row gap-2 items-center">
          <TouchableWithoutFeedback onPress={() => {
            router.back()
          }}>
            <ChevronLeft color="#000" />
          </TouchableWithoutFeedback>
          <Text className="text-2xl" style={{ fontFamily: "Roboto-Bold" }}>
            Transfer Money
          </Text>
        </View>

        <Text style={{ fontFamily: "PTSans-Regular" }} className="text-md">
          Easily move money across your wallets.
        </Text>

        <View className="mt-5 w-full flex-1">
          <TransferForm />
        </View>
      </View>
    </Container>
  );
};

export default transfer;
