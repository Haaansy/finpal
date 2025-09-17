import { Send } from "lucide-react-native";
import React from "react";
import { Text, View } from "react-native";

interface TransferHistoryProps {
  description: string;
  amount: string;
}

const TransferHistory: React.FC<TransferHistoryProps> = ({
  description,
  amount,
}) => {
  return (
    <View className="flex flex-row items-center justify-between">
      <View className="flex flex-row w-1/2 items-center">
        <Send size={24} />
        <Text className="text-lg ml-2" style={{ fontFamily: "Roboto-Regular" }}>
          {description}
        </Text>
      </View>

      <View>
        <Text className="text-md" style={{ fontFamily: "Roboto-Bold" }}>
          {amount}
        </Text>
      </View>
    </View>
  );
};

export default TransferHistory;
