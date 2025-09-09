import { Image } from "expo-image";
import { ArrowLeftRight, Calendar, Send } from "lucide-react-native";
import React from "react";
import { ScrollView, Text, View } from "react-native";
import Container from "../components/Container";
import CustomButton from "../components/CustomButton";
import CardCarousel from "../components/Dashboard/Account/CardCarousel";
import DueDateLabel from "../components/Dashboard/Labels/DueDateLabel";

const dashboard = () => {
  return (
    <Container>
      <ScrollView contentContainerClassName="flex justify-center items-start px-10 mb-10">
        <Image
          source={require("@/assets/images/finPal-logo.png")}
          style={{ width: "30%", height: 100 }}
          contentFit="contain"
        />

        <Text className="text-3xl" style={{ fontFamily: "Roboto-Bold" }}>
          Welcome, User!👋
        </Text>

        <Text className="text-lg" style={{ fontFamily: "PTSans-Regular" }}>
          Here&apos;s your financial overview for today.
        </Text>

        <View className="flex-row justify-between items-start w-full mt-10 gap-5">
          <View className="w-1/2">
            <Text className="text-lg" style={{ fontFamily: "Roboto-Bold" }}>
              My Wallets
            </Text>
            <Text className="text-xs" style={{ fontFamily: "PTSans-Regular" }}>
              Track all your money sources separately — cash, banks, and cards.
            </Text>
          </View>

          <View className="w-1/2">
            <CustomButton
              label="Transfer"
              startIcon={<Send color={"#FFF"} />}
            />
          </View>
        </View>

        <CardCarousel />

        <View className="flex-row justify-between items-start w-full mt-20 gap-5">
          <View className="w-1/2">
            <Text className="text-lg" style={{ fontFamily: "Roboto-Bold" }}>
              Upcoming Due Dates
            </Text>
            <Text className="text-xs" style={{ fontFamily: "PTSans-Regular" }}>
              Stay on top of your loans and avoid late fees.
            </Text>
          </View>

          <View className="w-1/2">
            <CustomButton
              label="Calendar"
              startIcon={<Calendar color={"#FFF"} />}
            />
          </View>
        </View>

        <View className="w-full">
          <DueDateLabel />
          <DueDateLabel />
        </View>

        <View className="flex-row justify-between items-start w-full mt-20 gap-5">
          <View className="w-1/2">
            <Text className="text-lg" style={{ fontFamily: "Roboto-Bold" }}>
              Spending Summary
            </Text>
            <Text className="text-xs" style={{ fontFamily: "PTSans-Regular" }}>
              See where your money is going this month.
            </Text>
          </View>

          <View className="w-1/2">
            <CustomButton
              label="Transaction History"
              startIcon={<ArrowLeftRight color={"#FFF"} />}
            />
          </View>
        </View>
        
      </ScrollView>
    </Container>
  );
};

export default dashboard;
