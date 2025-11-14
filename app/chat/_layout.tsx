import { Stack } from "expo-router";
import { View } from "react-native"; // <-- Import View

export default function ChatLayout() {
  return (
    <View style={{ flex: 1, marginBottom: 30, }}> 
      <Stack screenOptions={{ headerShown: false }} />
    </View>
  );
}