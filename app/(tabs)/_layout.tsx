// app/(tabs)/_layout.tsx
import { FontAwesome5 } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { Pressable, Text } from "react-native";
import { useAuth } from "../../context/AuthContext";

/*  tabs layout  */
export default function TabsLayout() {
  const { signOut } = useAuth();

  return (
    <Tabs
      screenOptions={{
        headerRight: () => (
          <Pressable
            onPress={signOut}
            style={{
              marginRight: 14,
              backgroundColor: "#0258ecff",
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: 8,
            }}
          >
            <Text
              style={{
                color: "white",
                fontWeight: "600",
              }}
            >
              Logout
            </Text>
          </Pressable>
        ),
      }}
    >
      <Tabs.Screen
        name="record"
        options={{ 
          tabBarIcon: ({ color, size }) => (
          <FontAwesome5 name="running" size={size} color={color} />),
          title: "Record" }}
      />
      <Tabs.Screen
        name="runs"
        options={{ title: "My Runs", 
          tabBarIcon: ({ color, size }) => (
          <FontAwesome5 name="chart-bar" size={size} color={color} />),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: "Profile",
          tabBarIcon: ({ color, size }) => (
          <FontAwesome5 name="user" size={size} color={color} />),
        }}
      />
    </Tabs>
  );
}
