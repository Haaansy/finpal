import BottomSheet, { BottomSheetView } from "@gorhom/bottom-sheet";
import React, { useCallback, useRef, useState } from "react";
import { Text } from "react-native";
import { Calendar as RNCalendar } from "react-native-calendars";
import { GestureHandlerRootView } from "react-native-gesture-handler";

const Calendar = () => {
  const [selected, setSelected] = useState("");

  const vacation = { key: "vacation", color: "red", selectedDotColor: "blue" };
  const massage = { key: "massage", color: "blue", selectedDotColor: "blue" };
  const workout = { key: "workout", color: "green" };

  const bottomSheetRef = useRef<BottomSheet>(null);

  // callbacks
  const handleSheetChanges = useCallback((index: number) => {
    console.log("handleSheetChanges", index);
  }, []);

  return (
    <GestureHandlerRootView>
      <RNCalendar
        markingType={"multi-dot"}
        markedDates={{
          [selected]: {
            selected: true,
            disableTouchEvent: true,
          },
          "2025-09-12": {
            dots: [vacation, massage, workout],
          },
          "2025-09-13": { dots: [massage, workout], disabled: true },
        }}
      />

      <BottomSheet ref={bottomSheetRef} onChange={handleSheetChanges}>
        <BottomSheetView>
          <Text>Awesome 🎉</Text>
        </BottomSheetView>
      </BottomSheet>
    </GestureHandlerRootView>
  );
};

export default Calendar;
