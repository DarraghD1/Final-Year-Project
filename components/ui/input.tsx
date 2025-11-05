import { Colors } from "@/constants/theme";
import * as React from "react";
import { Platform, StyleSheet, TextInput, TextInputProps } from "react-native";

interface InputProps extends TextInputProps {
  error?: boolean;
}

const Input = React.forwardRef<TextInput, InputProps>(
  ({ style, error, ...props }, ref) => {
    return (
      <TextInput
        ref={ref}
        placeholderTextColor={Colors.light.icon}
        style={[
          styles.input,
          error && styles.inputError,
          style,
        ]}
        {...props}
      />
    );
  }
);

Input.displayName = "Input";

const styles = StyleSheet.create({
  input: {
    height: 40,
    borderWidth: 1,
    borderColor: Colors.light.icon,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
    backgroundColor: Colors.light.background,
    color: Colors.light.text,
    ...Platform.select({
      ios: {
        shadowColor: Colors.light.text,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  inputError: {
    borderColor: "#ef4444", // Using a standard red color for error
  },
});

export { Input };
