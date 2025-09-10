import React from "react";
import { TextStyle } from "react-native";
import DropDown from "react-native-input-select";

interface DropDownProps {
  data: any[];
  value: any;
  setValue: (value: any) => void;
  placeholder: string;
  listHeaderComponent?: React.ReactNode;
  listEmptyComponentStyle?: TextStyle;
}

const CustomDropDown = ({
  data,
  value,
  setValue,
  placeholder,
  listHeaderComponent,
  listEmptyComponentStyle,
}: DropDownProps) => {
  return (
    <DropDown
      placeholder={placeholder}
      options={data}
      selectedValue={value}
      onValueChange={(value) => setValue(value)}
      dropdownContainerStyle={{
        width: "100%",
        backgroundColor: "#EEEEEE",
        padding: 20,
        borderRadius: 5,
        marginTop: 25,
      }}
      dropdownStyle={{
        paddingVertical: 5,
        paddingHorizontal: 5,
        minHeight: 50,
      }}
      dropdownIconStyle={{ top: 25, right: 20 }}
      selectedItemStyle={{ color: "#000", fontFamily: "Roboto-Bold" }}
      listHeaderComponent={listHeaderComponent}
      listComponentStyles={{
        listEmptyComponentStyle: {
          ...listEmptyComponentStyle,
        },
      }}
      checkboxControls={{
        checkboxLabelStyle: { fontSize: 16, fontFamily: "PTSans-Regular"},
      }}
    />
  );
};

export default CustomDropDown;
