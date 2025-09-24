import AccountSetup from "@/components/AccountSetup";
import Container from "@/components/Container";
import { useThemeContext } from "@/contextProviders/ThemeProvider";
import { useUserContext } from "@/contextProviders/UserProvider";
import { ChevronsUp } from "@tamagui/lucide-icons";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { H2, H4, Image, Paragraph, Sheet, View, YStack } from "tamagui";

export default function App() {
  const [disableDrag, setDisableDrag] = useState(false);
  const [dragText, setDragText] = useState("Swipe up \n to continue!");
  const { theme } = useThemeContext();
  const { user } = useUserContext();

  useEffect(() => {
    if(user != null) {
      router.replace("/(tabs)/dashboard")
    }
  }, [user])

  return (
    <Container>
      <YStack flex={1} justify="center" p={50}>
        <H2 style={{ fontFamily: "Roboto-Bold" }}>Hello,</H2>
        <H4 style={{ fontFamily: "Roboto-Bold" }}>I&apos;m</H4>
        <Image source={require("../assets/images/finPal-logo.png")} />
        <Paragraph style={{ fontFamily: "Roboto-Bold" }}>
          Your Smart Finance Buddy.
        </Paragraph>
      </YStack>

      <Sheet
        open={true}
        snapPoints={[100, 15]}
        onPositionChange={(position: number) => {
          if (position === 0) {
            setDisableDrag(true);
            setDragText(`Welcome aboard!`);
          }
        }}
        position={1}
        disableDrag={disableDrag}
      >
        <Sheet.Handle items={"center"}>
          <View
            position="absolute"
            t={10}
            l={0}
            r={0}
            items={"center"}
            bg={"transparent"}
          >
            {disableDrag ? null : <ChevronsUp color={theme === "light" ? "black" : "white"} />}
            <Paragraph style={{ fontFamily: "PTSans-Bold" }} text={"center"}>
              {dragText}
            </Paragraph>
          </View>
        </Sheet.Handle>
        <Sheet.Frame>{disableDrag ? <AccountSetup /> : null}</Sheet.Frame>
      </Sheet>
    </Container>
  );
}
