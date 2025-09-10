"use client";

import { ArrowDown } from "lucide-react-native";
import React, { useState } from "react";
import { Text, View } from "react-native";
import { TSelectedItem } from "react-native-input-select/lib/typescript/src/types/index.types";
import CustomButton from "../../CustomButton";
import CustomDropDown from "../../CustomDropDown";
import Card from "../Account/Card";

const TransferForm = () => {
  const [open, setOpen] = useState(false);
  const [fromAccount, setFromAccount] = useState<
    TSelectedItem | TSelectedItem[]
  >();
  const [toAccount, setToAccount] = useState<TSelectedItem | TSelectedItem[]>();
  const [accounts, setAccounts] = useState([
    { label: "Cash", value: 1, balance: 200 },
    { label: "Bank #1", value: 2, balance: 1500 },
    { label: "GoTyme Bank", value: 3, balance: 300 },
  ]);

  return (
    <View className="flex flex-1 items-center">
      <View className="flex-1/2 w-full">
        <Text className="text-2xl" style={{ fontFamily: "Roboto-Bold" }}>
          From Wallet
        </Text>
        <Text style={{ fontFamily: "PTSans-Regular" }}>
          Select the wallet you’re moving money out of.
        </Text>
        <CustomDropDown
          data={accounts}
          value={fromAccount}
          setValue={setFromAccount}
          placeholder={"Select an account..."}
          listHeaderComponent={
            <View className="p-5 border-b border-gray-300">
              <Text className="text-2xl" style={{ fontFamily: "Roboto-Bold" }}>
                From Wallet
              </Text>
              <Text style={{ fontFamily: "PTSans-Regular" }}>
                Select the wallet you’re moving money out of.
              </Text>
            </View>
          }
        />
        {fromAccount && (
          <View className="w-full h-40">
            <Card />
          </View>
        )}
      </View>

      <View className="my-5">
        <ArrowDown color="#E57373" size={40} />
      </View>

      <View className="flex-1/2 w-full">
        <Text className="text-2xl" style={{ fontFamily: "Roboto-Bold" }}>
          To Wallet
        </Text>
        <Text style={{ fontFamily: "PTSans-Regular" }}>
          Choose the wallet you’re transferring money into.
        </Text>
        <CustomDropDown
          data={accounts}
          value={toAccount}
          setValue={setToAccount}
          placeholder={"Select an account..."}
          listHeaderComponent={
            <View className="p-5 border-b border-gray-300">
              <Text className="text-2xl" style={{ fontFamily: "Roboto-Bold" }}>
                To Wallet
              </Text>
              <Text style={{ fontFamily: "PTSans-Regular" }}>
                Choose the wallet you’re transferring money into.
              </Text>
            </View>
          }
        />
        { toAccount && (
          <View className="w-full h-40">
            <Card />
          </View>
        )}
      </View>

      <View className="w-full mt-10">
        <CustomButton label="Transfer Money" />
      </View>
    </View>
  );
};

export default TransferForm;
