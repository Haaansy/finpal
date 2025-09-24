import { addUser } from "@/database/userinfo";
import { Toast, useToastController, useToastState } from "@tamagui/toast";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  Button,
  Form,
  H4,
  Input,
  Paragraph,
  Spinner,
  View,
  YStack,
} from "tamagui";
import Logo from "./Logo";

const CurrentToast = () => {
  const currentToast = useToastState();

  if (!currentToast || currentToast.isHandledNatively) return null;

  return (
    <Toast
      animation="200ms"
      key={currentToast.id}
      duration={currentToast.duration}
      enterStyle={{ opacity: 0, transform: [{ translateY: 100 }] }}
      exitStyle={{ opacity: 0, transform: [{ translateY: 100 }] }}
      transform={[{ translateY: 0 }]}
      opacity={1}
      scale={1}
      viewportName={currentToast.viewportName}
      bg={"$accent1"}
      elevation={4}
    >
      <YStack>
        <Toast.Title color={"white"}>{currentToast.title}</Toast.Title>
        {!!currentToast.message && (
          <Toast.Description color={"white"}>
            {currentToast.message}
          </Toast.Description>
        )}
      </YStack>
    </Toast>
  );
};

const AccountSetup = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [name, setName] = useState("");
  const toast = useToastController();

  const HandleContinue = async () => {
    setLoading(true);

    if (name.trim().length === 0) {
      setLoading(false);
      toast.show("Please enter a valid name.", {
        duration: 4000,
        animation: "bouncy",
      });
      return;
    }

    const result = await addUser(name);

    if (typeof result != "number") {
      setLoading(false);
      toast.show("Please enter a valid name.", {
        duration: 4000,
        animation: "bouncy",
      });
      return;
    }

    // Navigate on success
    setLoading(false);
    router.replace("/(tabs)/dashboard");
  };

  return (
    <View p={20}>
      <CurrentToast />
      <View justify={"center"} items={"center"}>
        <Logo />
      </View>
      <YStack p={10} mt={30}>
        <H4 style={{ fontFamily: "Roboto-Bold" }}>What’s your name?</H4>
        <Paragraph style={{ fontFamily: "PTSans-Regular" }}>
          I’d love to call you by your name when sending reminders and updates.
          Enter your name so I can make your experience more personal.
        </Paragraph>

        <Form mt={20} gap={20} onSubmit={HandleContinue}>
          <Paragraph> max 16 characters </Paragraph>
          <Input
            size="$6"
            borderWidth={2}
            focusStyle={{ borderColor: "$accent3" }}
            disabledStyle={{ opacity: 0.5 }}
            borderColor={"$accent2"}
            onChangeText={(val) => {
              setName(val);
            }}
            disabled={loading}
          />
          {error.length > 0 && (
            <Paragraph style={{ fontFamily: "PTSans-Regular", color: "red" }}>
              {error}
            </Paragraph>
          )}
          <Form.Trigger asChild disabled={loading}>
            <Button
              theme={"accent"}
              size={"$5"}
              icon={loading ? () => <Spinner color={"white"} /> : undefined}
            >
              {loading ? "" : "Continue"}
            </Button>
          </Form.Trigger>
        </Form>
      </YStack>
    </View>
  );
};

export default AccountSetup;
