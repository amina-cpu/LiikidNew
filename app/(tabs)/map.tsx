import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

const MapScreen = () => {
  const [search, setSearch] = useState("");

  return (
    <SafeAreaView style={styles.container}>
      {/* 🔹 Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Explore Map</Text>
        <Ionicons name="location-outline" size={22} color="black" />
      </View>

      {/* 🔹 Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={18} color="#777" />
        <TextInput
          placeholder="Search for a place..."
          value={search}
          onChangeText={setSearch}
          style={styles.searchInput}
          placeholderTextColor="#aaa"
        />
      </View>

      {/* 🔹 Fake Map Area */}
      <View style={styles.mapPlaceholder}>
        <Ionicons name="map-outline" size={50} color="#bbb" />
        <Text style={styles.mapText}>Map preview area</Text>
      </View>

      {/* 🔹 Bottom Buttons */}
      <View style={styles.buttonsContainer}>
        <TouchableOpacity style={styles.button}>
          <Ionicons name="navigate" size={18} color="white" />
          <Text style={styles.buttonText}>My Location</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.button, styles.secondaryButton]}>
          <Ionicons name="pin-outline" size={18} color="green" />
          <Text style={[styles.buttonText, { color: "green" }]}>
            Set Destination
          </Text>
        </TouchableOpacity>
      </View>
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
  title: { fontSize: 18, fontWeight: "700" },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f2f2f2",
    borderRadius: 10,
    margin: 15,
    paddingHorizontal: 10,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 8,
    fontSize: 14,
    marginLeft: 6,
  },
  mapPlaceholder: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#eee",
    borderRadius: 10,
    marginHorizontal: 15,
    backgroundColor: "#fafafa",
  },
  mapText: { color: "#999", marginTop: 10, fontSize: 14 },
  buttonsContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: 20,
    borderTopWidth: 0.5,
    borderTopColor: "#eee",
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "green",
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 8,
  },
  secondaryButton: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "green",
  },
  buttonText: {
    color: "white",
    fontWeight: "600",
    marginLeft: 6,
  },
});

export default MapScreen;
