import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

export default function FAQScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={28} />
        </TouchableOpacity>
        <Text style={styles.title}>FAQ</Text>
        <View style={{ width: 28 }} />
      </View>

      <Text style={styles.text}>Frequently Asked Questions Coming Soon...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: "#fff" },
  header: { flexDirection: "row", alignItems: "center", gap: 16, marginTop: 25 },
  title: { fontSize: 20, fontWeight: "600" },
  text: { marginTop: 40, fontSize: 16 }
});
