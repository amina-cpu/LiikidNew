import React from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Image,
  TouchableOpacity,
  SafeAreaView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface Message {
  id: string;
  name: string;
  message: string;
  time: string;
  avatar: string;
}

const messages: Message[] = [
  {
    id: "1",
    name: "Sophia",
    message: "Hey! Are you free tomorrow?",
    time: "2m ago",
    avatar: "https://randomuser.me/api/portraits/women/12.jpg",
  },
  {
    id: "2",
    name: "Liam",
    message: "Sure, I’ll check it later.",
    time: "10m ago",
    avatar: "https://randomuser.me/api/portraits/men/32.jpg",
  },
  {
    id: "3",
    name: "Amina",
    message: "That’s perfect, thank you!",
    time: "1h ago",
    avatar: "https://randomuser.me/api/portraits/women/45.jpg",
  },
];

const MessagesScreen = () => {
  return (
    <SafeAreaView style={styles.container}>
      {/* 🔹 Top Bar */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Messages</Text>
        <Ionicons name="create-outline" size={22} color="black" />
      </View>

      {/* 🔹 Chat List */}
      <FlatList
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.chatItem}>
            <Image source={{ uri: item.avatar }} style={styles.avatar} />
            <View style={styles.chatInfo}>
              <View style={styles.chatRow}>
                <Text style={styles.name}>{item.name}</Text>
                <Text style={styles.time}>{item.time}</Text>
              </View>
              <Text style={styles.message}>{item.message}</Text>
            </View>
          </TouchableOpacity>
        )}
        contentContainerStyle={{ paddingBottom: 30 }}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: "#ddd",
  },
  headerTitle: { fontSize: 18, fontWeight: "700" },
  chatItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderBottomWidth: 0.5,
    borderBottomColor: "#eee",
  },
  avatar: { width: 50, height: 50, borderRadius: 25 },
  chatInfo: { flex: 1, marginLeft: 12 },
  chatRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  name: { fontWeight: "700", fontSize: 15 },
  time: { color: "#888", fontSize: 12 },
  message: { color: "#555", marginTop: 3, fontSize: 13 },
});

export default MessagesScreen;
