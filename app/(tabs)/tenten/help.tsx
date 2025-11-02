import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import { Linking, StyleSheet, Text, TouchableOpacity, View } from "react-native";

export default function HelpSupportScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={28} />
        </TouchableOpacity>
        <Text style={styles.title}>Help & Support</Text>
        <View style={{ width: 28 }} />
      </View>

      <TouchableOpacity onPress={() => Linking.openURL("mailto:support@yourapp.com")}>
        <Text style={styles.text}>📩 Contact Support</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => router.push("/settings/faq")}>
        <Text style={styles.text}>❓ FAQ</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: "#fff" },
  header: { flexDirection: "row", alignItems: "center", gap: 16, marginTop: 25 },
  title: { fontSize: 20, fontWeight: "600" },
  text: { fontSize: 18, marginTop: 20 },
});
