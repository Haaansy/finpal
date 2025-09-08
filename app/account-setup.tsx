import React from "react";
import { Image } from "react-native";
import Container from "./components/Container";

const AccountSetup = () => {
  return (
    <Container>
      <Image source={require("../assets/images/finPal-logo.png")} />
    </Container>
  );
};

export default AccountSetup;
