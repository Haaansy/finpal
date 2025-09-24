import React from "react";
import { Image } from "tamagui";

const Logo = () => {
  return (
    <Image
      source={require("../assets/images/finPal-logo.png")}
      width={150}
      height={50}
      objectFit="contain"
    />
  );
};

export default Logo;
