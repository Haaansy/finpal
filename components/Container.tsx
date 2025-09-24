import React from "react";
import {
  useSafeAreaInsets
} from "react-native-safe-area-context";
import { View } from "tamagui";

interface ContainerProps {
  children?: React.ReactNode;
}

const Container: React.FC<ContainerProps> = ({ children }) => {
  const { top, bottom } = useSafeAreaInsets();

  return (
    <View
      bg={"$background"}
      height={"100%"}
      width={"100%"}
      flex={1}
    >
      <View b={bottom} t={top} flex={1}>
        {children}
      </View>
    </View>
  );
};

export default Container;
