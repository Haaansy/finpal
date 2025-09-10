import { Image } from "expo-image";
import React from "react";

const Logo = () => {
  return (
    <Image
      source={require("@/assets/images/finPal-logo.png")}
      style={{ width: "30%", height: 100 }}
      contentFit="contain"
    />
  );
};

export default Logo;
