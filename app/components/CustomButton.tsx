import React from "react";
import { Text, TouchableOpacity, View } from "react-native";

interface CustomButtonProps {
  onPress?: () => void;
  label?: string;
  startIcon?: React.ReactNode;
}

const CustomButton: React.FC<CustomButtonProps> = ({ onPress, label, startIcon }) => {
  return (
    <TouchableOpacity
      className="bg-red-300 px-6 py-3 rounded-md w-full flex-row justify-center items-center"
      onPress={onPress}
    >
      { startIcon && <View className="mr-2">{startIcon}</View> }
      <Text
        className="text-white text-center"
        style={{ fontFamily: "Montserrat-Bold" }}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
};

export default CustomButton;
