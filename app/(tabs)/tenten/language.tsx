import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Alert,
  I18nManager,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import i18n, { loadLocale, setLocale } from "../../../lib/i18n";

const PRIMARY_TEAL = "#00C897";

export default function LanguageScreen() {
  const router = useRouter();
  const [selectedLang, setSelectedLang] = useState<string>("en");
  const [_, setRefresh] = useState(false); // used to re-render UI texts after changing language

  useEffect(() => {
    (async () => {
      await loadLocale();
      setSelectedLang(i18n.locale);
    })();
  }, []);

  const handleLanguageChange = async (lang: string) => {
    await setLocale(lang);
    setSelectedLang(lang);

    // Force RTL for Arabic
    if (lang === "ar") {
      I18nManager.allowRTL(true);
      I18nManager.forceRTL(true);
    } else {
      I18nManager.allowRTL(false);
      I18nManager.forceRTL(false);
    }

    // Refresh UI so texts update instantly
    setRefresh((r) => !r);

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
  };

  const languages = [
    { code: "en", label: "English" },
    { code: "ar", label: "العربية" },
    { code: "fr", label: "Français" },
  ];

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
