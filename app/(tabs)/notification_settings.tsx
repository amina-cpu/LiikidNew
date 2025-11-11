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
import i18n from '../../lib/i18n';

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
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';

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

    const colors = {
        background: isDark ? '#000000' : '#F2F2F7',
        headerBackground: isDark ? '#000000' : '#FFFFFF',
        text: isDark ? '#FFFFFF' : '#000000',
        secondaryText: isDark ? '#AAAAAA' : '#6A6A6A',
        itemBackground: isDark ? '#1C1C1E' : '#FFFFFF',
        itemBorder: isDark ? '#2C2C2E' : '#E5E5EA',
        accent: '#00A78F',
        switchOff: isDark ? '#3e3e3e' : '#D1D1D6',
    };

    useEffect(() => {
        loadUserSettings();
    }, []);

    const loadUserSettings = async () => {
        try {
            const userJson = await AsyncStorage.getItem('user');
            if (!userJson) {
                console.error('User not logged in.');
                router.back();
                return;
            }

            const user = JSON.parse(userJson);
            setUserId(user.user_id);

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
                console.log('Failed to save notification settings.');
            }
        } catch (error) {
            console.error('Error saving settings:', error);
            console.log('Failed to save notification settings.');
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
            <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

            <View style={[localStyles.header, { backgroundColor: colors.headerBackground }]}>
                <TouchableOpacity onPress={() => router.push('/(tabs)/settings')} style={localStyles.backButton}>
                    <Ionicons name="chevron-back" size={28} color={colors.text} />
                </TouchableOpacity>
                <Text style={[localStyles.headerTitle, { color: colors.text }]}>
                    {i18n.t('notificationsSettings.title')}
                </Text>
                <View style={localStyles.placeholder} />
            </View>

            <ScrollView style={localStyles.content} showsVerticalScrollIndicator={false}>
                <View style={localStyles.section}>
                    <Text style={[localStyles.sectionTitle, { color: colors.secondaryText }]}>
                        {i18n.t('notificationsSettings.social')}
                    </Text>
                    <SettingItem 
                        title={i18n.t('notificationsSettings.newFollowersTitle')}
                        description={i18n.t('notificationsSettings.newFollowersDescription')}
                        settingKey="newFollowers" 
                    />
                    <SettingItem 
                        title={i18n.t('notificationsSettings.likesTitle')}
                        description={i18n.t('notificationsSettings.likesDescription')}
                        settingKey="likes" 
                    />
                </View>
            </ScrollView>
        </SafeAreaView>
    );
};

const localStyles = StyleSheet.create({
    container: {
        flex: 1,
        marginBottom: 70,
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
    },
    backButton: {
        padding: 8,
        width: 44,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '600',
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
    },
    settingTextContainer: {
        flex: 1,
        marginRight: 12,
    },
    settingTitle: {
        fontSize: 16,
        fontWeight: '500',
        marginBottom: 2,
    },
    settingDescription: {
        fontSize: 13,
        marginTop: 2,
    },
});

export default NotificationSettingsScreen;