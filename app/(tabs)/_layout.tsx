// app/(tabs)/_layout.tsx
import { FontAwesome5 } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { useAuth } from "../../context/AuthContext";

/*  tabs layout  */
export default function TabsLayout() {
  const { signOut } = useAuth();

  return (
    <Tabs>
      <Tabs.Screen
        name="record"
        options={{ 
          tabBarIcon: ({ color, size }) => (
          <FontAwesome5 name="running" size={size} color={color} />),
          title: "Run Tracker" }}
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
