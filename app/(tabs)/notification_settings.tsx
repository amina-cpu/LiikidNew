// app/notification-settings.tsx
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    SafeAreaView,
    ScrollView,
    StatusBar,
    StyleSheet,
    Switch,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { supabase } from '../../lib/Supabase';

interface NotificationSettings {
  newFollowers: boolean;
  likes: boolean;
  comments: boolean;
  mentions: boolean;
  recommendedForYou: boolean;
  collectibleUpdates: boolean;
  liveBookmarked: boolean;
  liveMightBeInterested: boolean;
  marketplace: boolean;
  orders: boolean;
}

const NotificationSettingsScreen = () => {
  const router = useRouter();
  const [userId, setUserId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<NotificationSettings>({
    newFollowers: true,
    likes: true,
    comments: true,
    mentions: true,
    recommendedForYou: true,
    collectibleUpdates: true,
    liveBookmarked: true,
    liveMightBeInterested: true,
    marketplace: true,
    orders: true,
  });

  // Load user and their settings from database
  useEffect(() => {
    loadUserSettings();
  }, []);

  const loadUserSettings = async () => {
    try {
      // Get current user ID
      const userJson = await AsyncStorage.getItem('user');
      if (!userJson) {
        Alert.alert('Error', 'Please log in to manage notification settings.');
        router.back();
        return;
      }

      const user = JSON.parse(userJson);
      setUserId(user.user_id);

      // Fetch notification settings from database
      const { data, error } = await supabase
        .from('users')
        .select('notification_settings')
        .eq('user_id', user.user_id)
        .single();

      if (error) {
        console.error('Error loading notification settings:', error);
      } else if (data?.notification_settings) {
        setSettings(data.notification_settings);
      }

    } catch (error) {
      console.error('Error loading user settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async (newSettings: NotificationSettings) => {
    if (!userId) return;

    try {
      const { error } = await supabase
        .from('users')
        .update({ notification_settings: newSettings })
        .eq('user_id', userId);

      if (error) {
        console.error('Error saving notification settings:', error);
        Alert.alert('Error', 'Failed to save notification settings.');
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      Alert.alert('Error', 'Failed to save notification settings.');
    }
  };

  const toggleSetting = (key: keyof NotificationSettings) => {
    const newSettings = { ...settings, [key]: !settings[key] };
    setSettings(newSettings);
    saveSettings(newSettings);
  };

  const SettingItem = ({
    title,
    description,
    settingKey,
  }: {
    title: string;
    description?: string;
    settingKey: keyof NotificationSettings;
  }) => (
    <View style={styles.settingItem}>
      <View style={styles.settingTextContainer}>
        <Text style={styles.settingTitle}>{title}</Text>
        {description && <Text style={styles.settingDescription}>{description}</Text>}
      </View>
      <Switch
        value={settings[settingKey]}
        onValueChange={() => toggleSetting(settingKey)}
        trackColor={{ false: '#767577', true: '#34C759' }}
        thumbColor="#fff"
        ios_backgroundColor="#3e3e3e"
      />
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#34C759" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={28} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Social</Text>
          <SettingItem 
            title="New Followers" 
            description="Get notified when someone follows you"
            settingKey="newFollowers" 
          />
          <SettingItem 
            title="Likes" 
            description="Get notified when someone likes your product"
            settingKey="likes" 
          />
          <SettingItem 
            title="Comments" 
            description="Get notified when someone comments"
            settingKey="comments" 
          />
          <SettingItem 
            title="Mentions" 
            description="Get notified when someone mentions you"
            settingKey="mentions" 
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recommendations</Text>
          <SettingItem 
            title="Recommended For You" 
            description="Get personalized product recommendations"
            settingKey="recommendedForYou" 
          />
          <SettingItem 
            title="Collectible Updates" 
            description="Updates on collectibles you're interested in"
            settingKey="collectibleUpdates" 
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Live Events</Text>
          <SettingItem 
            title="Bookmarked Live Events" 
            description="Reminders for events you bookmarked"
            settingKey="liveBookmarked" 
          />
          <SettingItem 
            title="Suggested Live Events" 
            description="Get notified about live events you might like"
            settingKey="liveMightBeInterested" 
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Shopping</Text>
          <SettingItem 
            title="Marketplace" 
            description="Updates about marketplace items"
            settingKey="marketplace" 
          />
          <SettingItem 
            title="Orders" 
            description="Updates about your orders and purchases"
            settingKey="orders" 
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingVertical: 16,
    backgroundColor: '#000',
    marginTop: 30,
  },
  backButton: {
    padding: 8,
    width: 44,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
  },
  placeholder: {
    width: 44,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#888',
    marginBottom: 12,
    marginLeft: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    marginBottom: 8,
    backgroundColor: '#1C1C1E',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2C2C2E',
  },
  settingTextContainer: {
    flex: 1,
    marginRight: 12,
  },
  settingTitle: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '500',
    marginBottom: 2,
  },
  settingDescription: {
    fontSize: 13,
    color: '#888',
    marginTop: 2,
  },
});

export default NotificationSettingsScreen;