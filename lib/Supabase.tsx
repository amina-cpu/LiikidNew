// lib/supabase.ts (or Supabase.ts)
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const supabaseUrl = 'https://gggopknzksqvzisxylts.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdnZ29wa256a3Nxdnppc3h5bHRzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk1ODg3MjAsImV4cCI6MjA3NTE2NDcyMH0.JD6Lt61P9tDhjjKHtj3n299GJ1DD6-oJTJMu3BNJ-Jg';

const ExpoSecureStoreAdapter = {
  getItem: async (key: string) => {
    if (Platform.OS === 'web') {
      return AsyncStorage.getItem(key);
    } else {
      return SecureStore.getItemAsync(key);
    }
  },
  setItem: async (key: string, value: string) => {
    if (Platform.OS === 'web') {
      return AsyncStorage.setItem(key, value);
    } else {
      return SecureStore.setItemAsync(key, value);
    }
  },
  removeItem: async (key: string) => {
    if (Platform.OS === 'web') {
      return AsyncStorage.removeItem(key);
    } else {
      return SecureStore.deleteItemAsync(key);
    }
  },
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: ExpoSecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false, // CHANGED: false for mobile
    flowType: 'implicit', // CHANGED: implicit instead of pkce
  },
});