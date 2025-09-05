import React from "react";
import { Text, TouchableOpacity } from "react-native";

interface CustomButtonProps {
  onPress?: () => void;
  label?: string;
}

const CustomButton: React.FC<CustomButtonProps> = ({ onPress, label }) => {
  return (
    <TouchableOpacity
      className="bg-red-300 px-6 py-3 rounded-md w-full"
      onPress={onPress}
    >
      <Text
        className="text-white text-center text-lg"
        style={{ fontFamily: "Montserrat-Bold" }}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
};

export default CustomButton;
