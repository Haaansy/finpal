import { useUserContext } from "@/contextProviders/UserProvider";
import React from "react";
import { H5, Paragraph, YStack } from "tamagui";

interface GreetingsProps {
  subtext?: string;
}

const Greetings: React.FC<GreetingsProps> = ({ subtext }) => {
  const { user } = useUserContext();
  return (
    <YStack>
      <H5 style={{ fontFamily: "Roboto-Bold" }}>Welcome, {user} 👋</H5>
      {subtext && (
        <Paragraph style={{ fontFamily: "PTSans-Regular" }}>
          {subtext}
        </Paragraph>
      )}
    </YStack>
  );
};

export default Greetings;
