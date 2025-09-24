import Container from "@/components/Container";
import Greetings from "@/components/Greetings";
import Logo from "@/components/Logo";
import React from "react";
import { YStack } from "tamagui";

const dashboard = () => {
  return (
    <Container>
      <YStack p={25} gap={50}>
        <Logo />
        <Greetings subtext="Here’s your financial overview today." />
      </YStack>
    </Container>
  );
};

export default dashboard;
