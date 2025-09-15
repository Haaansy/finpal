import React from "react";
import { Text, View } from "react-native";

interface IncomeLabelProps {
  title: string;
  amount: string;
  dateSpent: string;
  category: string;
}

const ExpenseLabel: React.FC<IncomeLabelProps> = ({
  title,
  amount,
  dateSpent,
  category,
}) => {
  return (
    <View className="px-4 py-3 border-yellow-300 border-2 rounded-lg w-full mt-2">
      <View className="justify-between flex-row items-center">
        <Text className="text-md" style={{ fontFamily: "Roboto-Bold" }}>
          {title}
        </Text>
        <Text className="text-md" style={{ fontFamily: "Roboto-Bold" }}>
          {amount}
        </Text>
      </View>
      <View className="bg-yellow-300 p-2 rounded-lg mt-2 items-center w-1/3">
        <Text
          className="text-md text-white"
          style={{ fontFamily: "Roboto-Bold" }}
        >
          {category}
        </Text>
      </View>
    </View>
  );
};

export default ExpenseLabel;
