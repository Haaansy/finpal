import { format, toDate } from "date-fns";
import { router } from "expo-router";
import { ChevronLeft } from "lucide-react-native";
import React from "react";
import { FlatList, Text, TouchableWithoutFeedback, View } from "react-native";
import Container from "../components/Container";
import ExpenseHistory from "../components/Dashboard/History/ExpenseHistory";
import IncomeHistory from "../components/Dashboard/History/IncomeHistory";
import TransferHistory from "../components/Dashboard/History/TransferHistory";
import Logo from "../components/Logo";
import formatCurrency from "../utils/formatCurrency";

const transactionSamples = [
  {
    date: "2023-10-01",
    transactions: [
      { type: "income", amount: 5000, description: "Salary" },
      { type: "expense", amount: 50, description: "Groceries" },
      {
        type: "transfer",
        amount: 200,
        description: "Transfer from Wallet A to Wallet B",
      },
    ],
  },
  {
    date: "2023-10-02",
    transactions: [
      { type: "expense", amount: 30, description: "Transport" },
      { type: "due", amount: 100, description: "Loan Payment" },
    ],
  },
];

const history = () => {
  return (
    <Container>
      <View className="flex flex-1 px-10">
        <Logo />

        <View className="flex flex-row gap-2 items-center">
          <TouchableWithoutFeedback
            onPress={() => {
              router.back();
            }}
          >
            <ChevronLeft color="#000" />
          </TouchableWithoutFeedback>
          <Text className="text-2xl" style={{ fontFamily: "Roboto-Bold" }}>
            Transaction History
          </Text>
        </View>

        <Text style={{ fontFamily: "PTSans-Regular" }} className="text-md">
          A record of all your income, expenses, and loan payments in one place.
        </Text>

        <FlatList
          data={transactionSamples.flatMap((day) =>
            day.transactions.map((tx) => ({
              ...tx,
              date: day.date,
            }))
          )}
          renderItem={({ item, index }) => {
            const showDateHeader =
              index === 0 ||
              item.date !==
                transactionSamples.flatMap((day) =>
                  day.transactions.map((tx) => ({
                    ...tx,
                    date: day.date,
                  }))
                )[index - 1].date;

            return (
              <View className="mt-4">
                {showDateHeader && (
                  <Text
                    className="text-lg mb-2 "
                    style={{ fontFamily: "Roboto-Bold" }}
                  >
                    {format(toDate(item.date), "MMMM d, yyyy")}
                  </Text>
                )}
                <View className="p-2 ">
                  {item.type === "income" ? (
                    <IncomeHistory
                      description={item.description}
                      amount={formatCurrency(item.amount)}
                    />
                  ) : item.type === "expense" || item.type === "due" ? (
                    <ExpenseHistory
                      description={item.description}
                      amount={formatCurrency(item.amount)}
                    />
                  ) : item.type === "transfer" ? (
                    <TransferHistory
                      description={item.description}
                      amount={formatCurrency(item.amount)}
                    />
                  ) : null}
                </View>
              </View>
            );
          }}
          keyExtractor={(item, idx) =>
            `${item.date}_${item.description}_${idx}`
          }
          contentContainerStyle={{ padding: 20 }}
          style={{ marginTop: 20, width: "100%" }}
          className="w-full h-screen-safe"
        />
      </View>
    </Container>
  );
};

export default history;
