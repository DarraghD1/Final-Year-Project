// app/(tabs)/_layout.tsx
import { Tabs } from "expo-router";
import { Button } from "react-native";
import { useAuth } from "../../context/AuthContext";

export default function TabsLayout() {
  const { signOut } = useAuth();

  return (
    <Tabs
      screenOptions={{
        headerRight: () => (
          <Button title="Logout" onPress={signOut} />
        ),
      }}
    >
      <Tabs.Screen
        name="record"
        options={{ title: "Record" }}
      />
      <Tabs.Screen
        name="runs"
        options={{ title: "My Runs" }}
      />
    </Tabs>
  );
}
