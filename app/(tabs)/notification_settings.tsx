import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
  useColorScheme
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
    const colorScheme = useColorScheme(); // <-- HOOK: Get current theme
    const isDark = colorScheme === 'dark'; // <-- CHECK: Determine if dark mode is active

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

    // --- Dynamic Color Definitions ---
    const colors = {
        background: isDark ? '#000000' : '#F2F2F7', // Main screen background
        headerBackground: isDark ? '#000000' : '#FFFFFF', // Header background
        text: isDark ? '#FFFFFF' : '#000000', // Primary text color
        secondaryText: isDark ? '#AAAAAA' : '#6A6A6A', // Secondary text (titles, descriptions)
        itemBackground: isDark ? '#1C1C1E' : '#FFFFFF', // Setting item background
        itemBorder: isDark ? '#2C2C2E' : '#E5E5EA', // Setting item border
        accent: '#00A78F', // Primary app accent color (Teal/Green)
        switchOff: isDark ? '#3e3e3e' : '#D1D1D6', // Switch track color when false
    };

    // Load user and their settings from database
    useEffect(() => {
        loadUserSettings();
    }, []);

    const loadUserSettings = async () => {
        try {
            // Get current user ID
            const userJson = await AsyncStorage.getItem('user');
            if (!userJson) {
                // Using a fallback console log instead of Alert as per instructions
                console.error('User not logged in.');
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
                // Using console.log instead of Alert
                console.log('Failed to save notification settings.');
            }
        } catch (error) {
            console.error('Error saving settings:', error);
            // Using console.log instead of Alert
            console.log('Failed to save notification settings.');
        }
    };

    const toggleSetting = (key: keyof NotificationSettings) => {
        const newSettings = { ...settings, [key]: !settings[key] };
        setSettings(newSettings);
        saveSettings(newSettings);
    };

    // --- Setting Item Component (using dynamic colors) ---
    const SettingItem = ({
        title,
        description,
        settingKey,
    }: {
        title: string;
        description?: string;
        settingKey: keyof NotificationSettings;
    }) => (
        <View style={[
            localStyles.settingItem,
            {
                backgroundColor: colors.itemBackground,
                borderColor: colors.itemBorder,
            }
        ]}>
            <View style={localStyles.settingTextContainer}>
                <Text style={[localStyles.settingTitle, { color: colors.text }]}>{title}</Text>
                {description && <Text style={[localStyles.settingDescription, { color: colors.secondaryText }]}>{description}</Text>}
            </View>
            <Switch
                value={settings[settingKey]}
                onValueChange={() => toggleSetting(settingKey)}
                trackColor={{ false: colors.switchOff, true: colors.accent }}
                thumbColor={colors.text}
                ios_backgroundColor={colors.switchOff}
            />
        </View>
    );

    if (loading) {
        return (
            <SafeAreaView style={[localStyles.container, localStyles.centered, { backgroundColor: colors.background }]}>
                <ActivityIndicator size="large" color={colors.accent} />
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={[localStyles.container, { backgroundColor: colors.background }]}>
            {/* Set StatusBar style based on current theme */}
            <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

            <View style={[localStyles.header, { backgroundColor: colors.headerBackground }]}>
                <TouchableOpacity onPress={() =>  router.push('/(tabs)/settings')}  style={localStyles.backButton}>
                    <Ionicons name="chevron-back" size={28} color={colors.text} />
                </TouchableOpacity>
                <Text style={[localStyles.headerTitle, { color: colors.text }]}>Notifications</Text>
                <View style={localStyles.placeholder} />
            </View>

            <ScrollView style={localStyles.content} showsVerticalScrollIndicator={false}>
                <View style={localStyles.section}>
                    <Text style={[localStyles.sectionTitle, { color: colors.secondaryText }]}>Social</Text>
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
                    {/* <SettingItem 
                        title="Comments" 
                        description="Get notified when someone comments"
                        settingKey="comments" 
                    />
                    <SettingItem 
                        title="Mentions" 
                        description="Get notified when someone mentions you"
                        settingKey="mentions" 
                    /> */}
                </View>

                {/* <View style={localStyles.section}>
                    <Text style={[localStyles.sectionTitle, { color: colors.secondaryText }]}>Recommendations</Text>
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

                <View style={localStyles.section}>
                    <Text style={[localStyles.sectionTitle, { color: colors.secondaryText }]}>Live Events</Text>
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

                <View style={localStyles.section}>
                    <Text style={[localStyles.sectionTitle, { color: colors.secondaryText }]}>Shopping</Text>
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
                </View> */}
            </ScrollView>
        </SafeAreaView>
    );
};

// Static styles (structural/layout) that don't need to change based on theme
const localStyles = StyleSheet.create({
    container: {
        flex: 1,
        marginBottom: 70,
        // Background color is now set inline
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
        marginTop: 30,
        // Colors are now set inline
    },
    backButton: {
        padding: 8,
        width: 44,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '600',
        // Color is now set inline
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
        // Color is now set inline
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
        borderRadius: 12,
        borderWidth: 1,
        // Colors are now set inline
    },
    settingTextContainer: {
        flex: 1,
        marginRight: 12,
    },
    settingTitle: {
        fontSize: 16,
        fontWeight: '500',
        marginBottom: 2,
        // Color is now set inline
    },
    settingDescription: {
        fontSize: 13,
        marginTop: 2,
        // Color is now set inline
    },
});

export default NotificationSettingsScreen;