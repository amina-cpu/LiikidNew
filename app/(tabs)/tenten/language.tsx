import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  I18nManager,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import i18n, { loadLocale, setLocale } from "../../../lib/i18n";
import { supabase } from "../../../lib/Supabase";
import { useAuth } from "../../context/AuthContext";

const PRIMARY_TEAL = "#00C897";

export default function LanguageScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [selectedLang, setSelectedLang] = useState<string>("en");
  const [loading, setLoading] = useState(true);
  const [_, setRefresh] = useState(false);

  useEffect(() => {
    loadUserSettings();
  }, []);

  const loadUserSettings = async () => {
    try {
      if (!user?.user_id) {
        await loadLocale();
        setSelectedLang(i18n.locale);
        setLoading(false);
        return;
      }

      // Fetch user settings from database
      const { data, error } = await supabase
        .from("user_settings")
        .select("language_code")
        .eq("user_id", user.user_id)
        .single();

      if (error && error.code !== "PGRST116") {
        // PGRST116 = no rows returned
        console.error("Error loading user settings:", error);
      }

      const langCode = data?.language_code || "en";
      
      // Apply the language from database
      await setLocale(langCode);
      setSelectedLang(langCode);

      // Apply RTL if Arabic
      if (langCode === "ar") {
        I18nManager.allowRTL(true);
        I18nManager.forceRTL(true);
      } else {
        I18nManager.allowRTL(false);
        I18nManager.forceRTL(false);
      }

      setLoading(false);
    } catch (error) {
      console.error("Error in loadUserSettings:", error);
      setLoading(false);
    }
  };

  const handleLanguageChange = async (lang: string) => {
    try {
      setLoading(true);

      // Update language in local storage
      await setLocale(lang);
      setSelectedLang(lang);

      // Update in database if user is logged in
      if (user?.user_id) {
        const { error } = await supabase
          .from("user_settings")
          .upsert(
            {
              user_id: user.user_id,
              language_code: lang,
              updated_at: new Date().toISOString(),
            },
            {
              onConflict: "user_id",
            }
          );

        if (error) {
          console.error("Error updating language setting:", error);
          Alert.alert("Error", "Failed to save language preference.");
          setLoading(false);
          return;
        }
      }

      // Force RTL for Arabic
      if (lang === "ar") {
        I18nManager.allowRTL(true);
        I18nManager.forceRTL(true);
      } else {
        I18nManager.allowRTL(false);
        I18nManager.forceRTL(false);
      }

      // Refresh UI
      setRefresh((r) => !r);
      setLoading(false);

      Alert.alert(
        i18n.t("language"),
        lang === "en"
          ? "Language changed to English."
          : lang === "fr"
          ? "Langue changée en Français."
          : "تم تغيير اللغة إلى العربية.",
        [
          {
            text: "OK",
            onPress: () => router.back(),
          },
        ]
      );
    } catch (error) {
      console.error("Error changing language:", error);
      setLoading(false);
      Alert.alert("Error", "Failed to change language.");
    }
  };

  const languages = [
    { code: "en", label: "English" },
    { code: "ar", label: "العربية" },
    { code: "fr", label: "Français" },
  ];

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color={PRIMARY_TEAL} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View
        style={[
          styles.header,
          { flexDirection: I18nManager.isRTL ? "row-reverse" : "row" },
        ]}
      >
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons
            name={I18nManager.isRTL ? "chevron-forward" : "chevron-back"}
            size={28}
            color={PRIMARY_TEAL}
          />
        </TouchableOpacity>
        <Text style={styles.title}>{i18n.t("language")}</Text>
        <View style={{ width: 28 }} />
      </View>

      {/* List */}
      <Text style={styles.subtitle}>{i18n.t("selectLanguage")}</Text>

      {languages.map((lang) => (
        <TouchableOpacity
          key={lang.code}
          style={[
            styles.option,
            selectedLang === lang.code && styles.selectedOption,
          ]}
          onPress={() => handleLanguageChange(lang.code)}
          disabled={loading}
        >
          <Text
            style={[
              styles.optionText,
              selectedLang === lang.code && styles.selectedOptionText,
            ]}
          >
            {lang.label}
          </Text>

          {selectedLang === lang.code && (
            <Ionicons name="checkmark-circle" size={22} color={PRIMARY_TEAL} />
          )}
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    padding: 16,
  },
  centerContent: {
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    alignItems: "center",
    gap: 16,
    marginTop: 25,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: "#000",
  },
  subtitle: {
    fontSize: 16,
    marginTop: 30,
    marginBottom: 10,
    fontWeight: "500",
    color: "#333",
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16,
    borderBottomWidth: 0.5,
    borderColor: "#E0E0E0",
  },
  optionText: {
    fontSize: 18,
    color: "#000",
  },
  selectedOption: {
    backgroundColor: "#F6FFFB",
  },
  selectedOptionText: {
    color: PRIMARY_TEAL,
    fontWeight: "700",
  },
});