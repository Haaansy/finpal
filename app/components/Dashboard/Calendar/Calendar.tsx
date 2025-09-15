import {
  BottomSheetModal,
  BottomSheetModalProvider,
  BottomSheetView,
} from "@gorhom/bottom-sheet";
import React, { useCallback, useRef, useState } from "react";
import { Calendar as RNCalendar } from "react-native-calendars";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import BottomSheetContext from "./BottomSheetContext";

const Calendar = () => {
  const [selected, setSelected] = useState("");

  const vacation = { key: "vacation", color: "red", selectedDotColor: "blue" };
  const massage = { key: "massage", color: "blue", selectedDotColor: "blue" };
  const workout = { key: "workout", color: "green" };

  const bottomSheetModalRef = useRef<BottomSheetModal>(null);

  // callbacks
  const handlePresentModalPress = useCallback((day: string) => {
    setSelected(day);
    bottomSheetModalRef.current?.present();
  }, []);

  return (
    <GestureHandlerRootView>
      <RNCalendar
        onDayPress={(day) => {
          handlePresentModalPress(day.dateString);
        }}
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

      <BottomSheetModalProvider>
        <BottomSheetModal ref={bottomSheetModalRef}>
          <BottomSheetView>
            <BottomSheetContext day={selected} />
          </BottomSheetView>
        </BottomSheetModal>
      </BottomSheetModalProvider>
    </GestureHandlerRootView>
  );
};

export default Calendar;
