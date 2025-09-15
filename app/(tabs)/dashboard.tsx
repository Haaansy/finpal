import { router } from "expo-router";
import { ArrowLeftRight, Calendar, Send } from "lucide-react-native";
import React from "react";
import { ScrollView, Text, View } from "react-native";
import { PieChart } from "react-native-gifted-charts";
import Container from "../components/Container";
import CustomButton from "../components/CustomButton";
import CardCarousel from "../components/Dashboard/Account/CardCarousel";
import DueDateLabel from "../components/Dashboard/Labels/DueDateLabel";
import Logo from "../components/Logo";
import formatCurrency from "../utils/formatCurrency";

const dashboard = () => {
  const pieData = [
    {
      value: 47,
      color: "#009FFF",
      gradientCenterColor: "#006DFF",
      focused: true,
      text: "Food",
    },
    {
      value: 40,
      color: "#93FCF8",
      gradientCenterColor: "#3BE9DE",
      text: "Transport",
    },
    {
      value: 16,
      color: "#BDB2FA",
      gradientCenterColor: "#8F80F3",
      text: "Entertainment",
    },
    {
      value: 3,
      color: "#FFA5BA",
      gradientCenterColor: "#FF7F97",
      text: "Others",
    },
  ];

  const sampleDueDates = [
    {
      title: "Car Loan",
      amountDue: 15000,
      dueDate: "2023-10-15",
      category: "Auto",
    },
    {
      title: "Credit Card",
      amountDue: 5000,
      dueDate: "2023-10-20",
      category: "Card",
    },
  ];

  return (
    <Container>
      <ScrollView contentContainerClassName="flex justify-center items-start px-10 mb-10">
        <Logo />

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
              onPress={() => {
                router.push("/DashboardLinks/transfer");
              }}
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
              onPress={() => {
                router.push("/DashboardLinks/calendar");
              }}
            />
          </View>
        </View>

        <View className="w-full">
          {sampleDueDates.map((item, index) => (
            <DueDateLabel
              key={index}
              title={item.title}
              amountDue={formatCurrency(item.amountDue)}
              dueDate={item.dueDate}
              category={item.category}
            />
          ))}
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

        <View className="mt-5 w-full flex-row justify-center items-center gap-2 mb-60">
          <PieChart
            data={pieData}
            showGradient
            sectionAutoFocus
            radius={90}
            innerRadius={60}
            innerCircleColor={"#232B5D"}
          />

          <View className="flex-1">
            {pieData.map((item, index) => (
              <View
                key={index}
                style={{
                  backgroundColor: item.color,
                  padding: 10,
                  borderRadius: 5,
                  marginVertical: 5,
                }}
                className="flex-row justify-between items-center"
              >
                <Text style={{ color: "white", fontWeight: "bold" }}>
                  {item.text}
                </Text>
                <Text style={{ color: "white" }}>{item.value}%</Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </Container>
  );
};

export default dashboard;
