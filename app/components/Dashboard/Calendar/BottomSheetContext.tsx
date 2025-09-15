import formatCurrency from "@/app/utils/formatCurrency";
import { format, toDate } from "date-fns";
import React from "react";
import { Text, View } from "react-native";
import { FlatList } from "react-native-gesture-handler";
import DueDateLabel from "../Labels/DueDateLabel";
import ExpenseLabel from "../Labels/ExpenseLabel";
import IncomeLabel from "../Labels/IncomeLabel";

interface BottomSheetContextProps {
  day: string;
}

const sampleDues = [
  {
    title: "Electricity Bill",
    amount: 1288,
    dueDate: "2025-09-15",
    category: "Utilities",
  },
];

const sampleIncome = [
  {
    title: "Salary",
    amount: 50000,
    dateReceived: "2025-09-01",
    category: "Job",
  },
];

const sampleExpense = [
  {
    title: "Groceries",
    amount: 1500,
    dateSpent: "2025-09-10",
    category: "Food",
  },
  {
    title: "Movie",
    amount: 300,
    dateSpent: "2025-09-11",
    category: "Entertainment",
  },
];

const BottomSheetContext: React.FC<BottomSheetContextProps> = ({ day }) => {
  return (
    <View className="p-2 mb-20">
      <Text className="text-3xl" style={{ fontFamily: "Roboto-Bold" }}>
        {format(toDate(day), "MMMM d, yyyy")}
      </Text>
      <Text>Expenses, income, and dues for this day are listed below</Text>

      <Text className="text-xl mt-5" style={{ fontFamily: "Roboto-Bold" }}>
        Dues
      </Text>
      <FlatList
        data={sampleDues}
        renderItem={({ item }) => (
          <DueDateLabel
            title={item.title}
            amountDue={formatCurrency(item.amount)}
            dueDate={item.dueDate}
            category={item.category}
          />
        )}
        keyExtractor={(item, index) => index.toString()}
        ListEmptyComponent={() => (
          <Text
            className="text-gray-500"
            style={{ fontFamily: "PTSans-Regular" }}
          >
            No dues for this day.
          </Text>
        )}
      />

      <Text className="text-xl mt-5" style={{ fontFamily: "Roboto-Bold" }}>
        Income
      </Text>
      <FlatList
        data={sampleIncome}
        renderItem={({ item }) => (
          <IncomeLabel
            title={item.title}
            amount={formatCurrency(item.amount)}
            dateRecieved={item.dateReceived}
            category={item.category}
          />
        )}
        keyExtractor={(item, index) => index.toString()}
        ListEmptyComponent={() => (
          <Text
            className="text-gray-500"
            style={{ fontFamily: "PTSans-Regular" }}
          >
            No income for this day.
          </Text>
        )}
      />

      <Text className="text-xl mt-5" style={{ fontFamily: "Roboto-Bold" }}>
        Expenses
      </Text>
      <FlatList
        data={sampleExpense}
        renderItem={({ item }) => (
          <ExpenseLabel
            title={item.title}
            amount={formatCurrency(item.amount)}
            dateSpent={item.dateSpent}
            category={item.category}
          />
        )}
        keyExtractor={(item, index) => index.toString()}
        ListEmptyComponent={() => (
          <Text
            className="text-gray-500"
            style={{ fontFamily: "PTSans-Regular" }}
          >
            No expenses for this day.
          </Text>
        )}
      />
    </View>
  );
};

export default BottomSheetContext;
