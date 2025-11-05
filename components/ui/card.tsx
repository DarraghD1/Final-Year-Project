import { Colors } from "@/constants/theme";
import * as React from "react";
import { StyleSheet, Text, TextProps, View, ViewProps } from "react-native";

interface StyledViewProps extends ViewProps {
  children?: React.ReactNode;
}

interface StyledTextProps extends TextProps {
  children?: React.ReactNode;
}

function Card({ style, ...props }: StyledViewProps) {
  return (
    <View
      style={[styles.card, style]}
      {...props}
    />
  );
}

function CardHeader({ style, ...props }: StyledViewProps) {
  return (
    <View
      style={[styles.cardHeader, style]}
      {...props}
    />
  );
}

function CardTitle({ style, ...props }: StyledTextProps) {
  return (
    <Text
      style={[styles.cardTitle, style]}
      {...props}
    />
  );
}

function CardDescription({ style, ...props }: StyledTextProps) {
  return (
    <Text
      style={[styles.cardDescription, style]}
      {...props}
    />
  );
}

function CardAction({ style, ...props }: StyledViewProps) {
  return (
    <View
      style={[styles.cardAction, style]}
      {...props}
    />
  );
}

function CardContent({ style, ...props }: StyledViewProps) {
  return (
    <View
      style={[styles.cardContent, style]}
      {...props}
    />
  );
}

function CardFooter({ style, ...props }: StyledViewProps) {
  return (
    <View
      style={[styles.cardFooter, style]}
      {...props}
    />
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.light.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.light.icon, // Using icon color as a subtle border
    flexDirection: "column",
    gap: 24,
    overflow: "hidden",
  },
  cardHeader: {
    padding: 24,
    gap: 6,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: Colors.light.text,
  },
  cardDescription: {
    fontSize: 14,
    color: Colors.light.icon, // Using icon color for muted text
  },
  cardAction: {
    alignSelf: "flex-start",
  },
  cardContent: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    padding: 24,
  },
});

export {
  Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle
};

