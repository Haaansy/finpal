import { router } from "expo-router";
import { ChevronLeft } from "lucide-react-native";
import React from "react";
import { Text, TouchableWithoutFeedback, View } from "react-native";
import Container from "../components/Container";
import Calendar from "../components/Dashboard/Calendar/Calendar";
import Logo from "../components/Logo";

const calendar = () => {
  return (
    <Container>
      <View className="flex flex-1 px-10">
        <Logo />

        <View className="flex flex-row gap-2 items-center">
          <TouchableWithoutFeedback
            onPress={() => {
              router.back();
            }}
          >
            <ChevronLeft color="#000" />
          </TouchableWithoutFeedback>
          <Text className="text-2xl" style={{ fontFamily: "Roboto-Bold" }}>
            Your Financial Calendar
          </Text>
        </View>

        <Text style={{ fontFamily: "PTSans-Regular" }} className="text-md">
          See your expenses, income, and loan payments by date. Stay ahead of
          your dues.
        </Text>

        <Calendar />
      </View>
    </Container>
  );
};

export default calendar;
