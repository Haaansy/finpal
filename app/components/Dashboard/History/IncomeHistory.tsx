import { BanknoteArrowUp } from "lucide-react-native";
import React from "react";
import { Text, View } from "react-native";

interface IncomeHistoryProps {
  description: string;
  amount: string;
}

const IncomeHistory: React.FC<IncomeHistoryProps> = ({
  description,
  amount,
}) => {
  return (
    <View className="flex flex-row items-center justify-between">
      <View className="flex flex-row w-1/2 items-center">
        <BanknoteArrowUp size={24} />
        <Text className="text-lg ml-2" style={{ fontFamily: "Roboto-Regular" }}>
          {description}
        </Text>
      </View>

      <View>
        <Text className="text-md" style={{ fontFamily: "Roboto-Bold" }}>
          +{amount}
        </Text>
      </View>
    </View>
  );
};

export default IncomeHistory;
