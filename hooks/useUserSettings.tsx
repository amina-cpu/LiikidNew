// hooks/useUserSettings.ts
import { useEffect, useState } from "react";
import { I18nManager } from "react-native";
import { useAuth } from "../context/AuthContext";
import { setLocale } from "../lib/i18n";
import { supabase } from "../lib/Supabase";

interface UserSettings {
  theme: string;
  language_code: string;
  data_saver_mode: boolean;
  two_factor_enabled: boolean;
  activity_status_visibility: string;
}

export const useUserSettings = () => {
  const { user } = useAuth();
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.user_id) {
      loadSettings();
    } else {
      setLoading(false);
    }
  }, [user?.user_id]);

  const loadSettings = async () => {
    try {
      if (!user?.user_id) return;

      const { data, error } = await supabase
        .from("user_settings")
        .select("*")
        .eq("user_id", user.user_id)
        .single();

      if (error && error.code !== "PGRST116") {
        console.error("Error loading settings:", error);
        setLoading(false);
        return;
      }

      if (data) {
        setSettings(data);
        
        // Apply language settings
        await setLocale(data.language_code);
        
        // Apply RTL for Arabic
        if (data.language_code === "ar") {
          I18nManager.allowRTL(true);
          I18nManager.forceRTL(true);
        } else {
          I18nManager.allowRTL(false);
          I18nManager.forceRTL(false);
        }
      } else {
        // Create default settings if none exist
        await createDefaultSettings();
      }

      setLoading(false);
    } catch (error) {
      console.error("Error in loadSettings:", error);
      setLoading(false);
    }
  };

  const createDefaultSettings = async () => {
    try {
      if (!user?.user_id) return;

      const defaultSettings = {
        user_id: user.user_id,
        theme: "light",
        language_code: "en",
        data_saver_mode: false,
        two_factor_enabled: false,
        activity_status_visibility: "public",
      };

      const { data, error } = await supabase
        .from("user_settings")
        .insert(defaultSettings)
        .select()
        .single();

      if (error) {
        console.error("Error creating default settings:", error);
        return;
      }

      setSettings(data);
    } catch (error) {
      console.error("Error in createDefaultSettings:", error);
    }
  };

  const updateSetting = async (key: keyof UserSettings, value: any) => {
    try {
      if (!user?.user_id) return false;

      const { error } = await supabase
        .from("user_settings")
        .update({
          [key]: value,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", user.user_id);

      if (error) {
        console.error("Error updating setting:", error);
        return false;
      }

      setSettings((prev) => (prev ? { ...prev, [key]: value } : null));
      return true;
    } catch (error) {
      console.error("Error in updateSetting:", error);
      return false;
    }
  };

  return {
    settings,
    loading,
    updateSetting,
    refreshSettings: loadSettings,
  };
};