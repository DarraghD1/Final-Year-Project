import { Colors } from "@/constants/theme";
import * as React from "react";
import { StyleSheet, Text, TextProps } from "react-native";

interface LabelProps extends TextProps {
  disabled?: boolean;
}

function Label({ style, disabled, ...props }: LabelProps) {
  return (
    <Text
      style={[
        styles.label,
        disabled && styles.labelDisabled,
        style,
      ]}
      {...props}
    />
  );
}

const styles = StyleSheet.create({
  label: {
    fontSize: 14,
    fontWeight: "500",
    color: Colors.light.text,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  labelDisabled: {
    opacity: 0.5,
  },
});

export { Label };
