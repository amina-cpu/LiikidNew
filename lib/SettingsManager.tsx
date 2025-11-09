// lib/SettingsManager.ts
import { I18nManager } from "react-native";
import { supabase } from "./Supabase";
import { setLocale } from "./i18n";

export interface UserSettings {
  user_id: number;
  theme: "light" | "dark";
  language_code: "en" | "ar" | "fr";
  data_saver_mode: boolean;
  two_factor_enabled: boolean;
  activity_status_visibility: "public" | "friends" | "private";
  created_at?: string;
  updated_at?: string;
}

export class SettingsManager {
  /**
   * Get user settings from database
   */
  static async getUserSettings(userId: number): Promise<UserSettings | null> {
    try {
      const { data, error } = await supabase
        .from("user_settings")
        .select("*")
        .eq("user_id", userId)
        .single();

      if (error) {
        if (error.code === "PGRST116") {
          // No settings found, create default
          return await this.createDefaultSettings(userId);
        }
        console.error("Error fetching user settings:", error);
        return null;
      }

      return data;
    } catch (error) {
      console.error("Error in getUserSettings:", error);
      return null;
    }
  }

  /**
   * Create default settings for a new user
   */
  static async createDefaultSettings(userId: number): Promise<UserSettings | null> {
    try {
      const defaultSettings: Partial<UserSettings> = {
        user_id: userId,
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
        return null;
      }

      return data;
    } catch (error) {
      console.error("Error in createDefaultSettings:", error);
      return null;
    }
  }

  /**
   * Update a specific setting
   */
  static async updateSetting(
    userId: number,
    key: keyof Omit<UserSettings, "user_id" | "created_at" | "updated_at">,
    value: any
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from("user_settings")
        .update({
          [key]: value,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId);

      if (error) {
        console.error("Error updating setting:", error);
        return false;
      }

      return true;
    } catch (error) {
      console.error("Error in updateSetting:", error);
      return false;
    }
  }

  /**
   * Update multiple settings at once
   */
  static async updateSettings(
    userId: number,
    settings: Partial<Omit<UserSettings, "user_id" | "created_at" | "updated_at">>
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from("user_settings")
        .update({
          ...settings,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId);

      if (error) {
        console.error("Error updating settings:", error);
        return false;
      }

      return true;
    } catch (error) {
      console.error("Error in updateSettings:", error);
      return false;
    }
  }

  /**
   * Apply language settings to the app
   */
  static async applyLanguageSettings(languageCode: string): Promise<void> {
    try {
      await setLocale(languageCode);

      if (languageCode === "ar") {
        I18nManager.allowRTL(true);
        I18nManager.forceRTL(true);
      } else {
        I18nManager.allowRTL(false);
        I18nManager.forceRTL(false);
      }
    } catch (error) {
      console.error("Error applying language settings:", error);
    }
  }

  /**
   * Load and apply all user settings
   */
  static async loadAndApplySettings(userId: number): Promise<UserSettings | null> {
    try {
      const settings = await this.getUserSettings(userId);
      
      if (!settings) {
        return null;
      }

      // Apply language settings
      await this.applyLanguageSettings(settings.language_code);

      // You can apply other settings here as needed
      // For example, theme settings, notification preferences, etc.

      return settings;
    } catch (error) {
      console.error("Error in loadAndApplySettings:", error);
      return null;
    }
  }

  /**
   * Reset settings to default
   */
  static async resetToDefault(userId: number): Promise<boolean> {
    try {
      const defaultSettings = {
        theme: "light",
        language_code: "en",
        data_saver_mode: false,
        two_factor_enabled: false,
        activity_status_visibility: "public",
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from("user_settings")
        .update(defaultSettings)
        .eq("user_id", userId);

      if (error) {
        console.error("Error resetting settings:", error);
        return false;
      }

      // Apply default language
      await this.applyLanguageSettings("en");

      return true;
    } catch (error) {
      console.error("Error in resetToDefault:", error);
      return false;
    }
  }
}