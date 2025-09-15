import React from "react";
import { Text, View } from "react-native";

interface IncomeLabelProps {
  title: string;
  amount: string;
  dateRecieved: string;
  category: string;
}

const IncomeLabel: React.FC<IncomeLabelProps> = ({
  title,
  amount,
  dateRecieved,
  category,
}) => {
  return (
    <View className="px-4 py-3 border-green-300 border-2 rounded-lg w-full mt-2">
      <View className="justify-between flex-row items-center">
        <Text className="text-md" style={{ fontFamily: "Roboto-Bold" }}>
          {title}
        </Text>
        <Text className="text-md" style={{ fontFamily: "Roboto-Bold" }}>
          {amount}
        </Text>
      </View>
      <View className="bg-green-300 p-2 rounded-lg mt-2 items-center w-1/3">
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

export default IncomeLabel;
