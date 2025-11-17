// app/index.tsx
import { Redirect } from 'expo-router';

export default function Index() {
  // Send the user to your tabs when the app starts
  return <Redirect href="/(tabs)/home" />; // or "(tabs)/record"
}
