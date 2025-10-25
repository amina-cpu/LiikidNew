import { AntDesign, FontAwesome5, Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
    Alert,
    SafeAreaView,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { supabase } from '../../lib/Supabase';
import { useAuth } from '../context/AuthContext';

const SettingsScreen = () => {
    const router = useRouter();
    const { user, signOut } = useAuth();
    const [unreadCount, setUnreadCount] = useState(0);

    const loadUnreadCount = useCallback(async () => {
        if (!user?.user_id) return;

        try {
            const { count, error } = await supabase
                .from("notifications")
                .select("*", { count: 'exact', head: true })
                .eq("receiver_id", user.user_id)
                .eq("is_read", false);

            if (!error) {
                setUnreadCount(count || 0);
            }
        } catch (error) {
            console.error('Error loading unread count:', error);
        }
    }, [user?.user_id]);

    // Load on screen focus
    useFocusEffect(
        useCallback(() => {
            loadUnreadCount();
        }, [loadUnreadCount])
    );

    // Real-time subscription
    useEffect(() => {
        if (!user?.user_id) return;

        const channel = supabase
            .channel('settings-notifications')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'notifications',
                    filter: `receiver_id=eq.${user.user_id}`
                },
                (payload) => {
                    console.log('Notification change in settings:', payload);
                    loadUnreadCount();
                }
            )
            .subscribe();

        return () => {
            channel.unsubscribe();
        };
    }, [user?.user_id, loadUnreadCount]);

    const handleLogout = async () => {
        Alert.alert(
            'Logout',
            'Are you sure you want to logout?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Logout',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await signOut();
                            router.replace('/(auth)/login');
                        } catch (error) {
                            Alert.alert('Error', 'Failed to logout.');
                        }
                    },
                },
            ]
        );
    };

    const SettingItem = ({
        IconComponent,
        iconName,
        iconSize = 22,
        title,
        showBadge = false,
        badgeCount = 0,
        onPress,
    }: {
        IconComponent: any;
        iconName: string;
        iconSize?: number;
        title: string;
        showBadge?: boolean;
        badgeCount?: number;
        onPress?: () => void;
    }) => (
        <TouchableOpacity style={styles.settingItem} onPress={onPress}>
            <View style={styles.settingLeft}>
                <View style={styles.iconContainer}>
                    <IconComponent name={iconName} size={iconSize} color="#000" />
                </View>
                <Text style={styles.settingTitle}>{title}</Text>
            </View>

            <View style={styles.rightSide}>
                {showBadge && badgeCount > 0 && (
                    <View style={styles.badge}>
                        <Text style={styles.badgeText}>
                            {badgeCount > 99 ? "99+" : badgeCount}
                        </Text>
                    </View>
                )}
                <Ionicons name="chevron-forward" size={22} color="#999" />
            </View>
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" />

            <View style={styles.header}>
                <TouchableOpacity onPress={() =>  router.push('/(tabs)/profile')} style={styles.backButton}>
                    <Ionicons name="chevron-back" size={28} color="#000" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Settings</Text>
                <View style={styles.placeholder} />
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>General</Text>

                    <SettingItem
                        IconComponent={Ionicons}
                        iconName="notifications-outline"
                        title="Notifications"
                        showBadge={true}
                        badgeCount={unreadCount}
                        onPress={() => {
                            router.push('/notifications');
                        }}
                    />
                    <SettingItem
                        IconComponent={Ionicons}
                        iconName="language-outline"
                        title="Language"
                        onPress={() => {
                            Alert.alert('Coming Soon', 'Language settings will be available soon');
                        }}
                    />
                    <SettingItem
                        IconComponent={MaterialIcons}
                        iconName="block"
                        title="Blocked users"
                        onPress={() => {
                            Alert.alert('Coming Soon', 'Blocked users list will be available soon');
                        }}
                    />
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Connect</Text>

                    <SettingItem
                        IconComponent={FontAwesome5}
                        iconName="facebook"
                        title="Follow us on Facebook"
                        onPress={() => {}}
                    />
                    <SettingItem
                        IconComponent={AntDesign}
                        iconName="twitter"
                        title="Follow us on X"
                        onPress={() => {}}
                    />
                    <SettingItem
                        IconComponent={FontAwesome5}
                        iconName="tiktok"
                        title="Follow us on Tiktok"
                        onPress={() => {}}
                    />
                    <SettingItem
                        IconComponent={AntDesign}
                        iconName="instagram"
                        title="Follow us on Instagram"
                        onPress={() => {}}
                    />
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Contact</Text>

                    <SettingItem
                        IconComponent={AntDesign}
                        iconName="star"
                        title="Rate us on Google Play"
                        onPress={() => {}}
                    />
                    <SettingItem
                        IconComponent={Ionicons}
                        iconName="help-circle-outline"
                        iconSize={24}
                        title="Help and Support"
                        onPress={() => {}}
                    />
                </View>

                <View style={styles.logoutContainer}>
                    <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                        <Ionicons name="log-out-outline" size={22} color="#fff" style={{ marginRight: 8 }} />
                        <Text style={styles.logoutButtonText}>Logout</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.versionContainer}>
                    <Text style={styles.versionText}>Version 1.0.0</Text>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 8,
        paddingVertical: 12,
        marginTop:30,
        borderBottomWidth: 0.5,
        borderBottomColor: '#e5e5e5',
    },
    backButton: {
        padding: 8,
        width: 44,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '600',
        color: '#000',
    },
    placeholder: {
        width: 44,
    },
    section: {
        marginTop: 28,
        paddingHorizontal: 16,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        marginBottom: 12,
        color: '#000',
    },
    settingItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 14,
        borderBottomWidth: 0.5,
        borderBottomColor: '#f0f0f0',
    },
    settingLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
    },
    iconContainer: {
        width: 28,
        alignItems: 'center',
    },
    settingTitle: {
        fontSize: 16,
        color: '#000',
    },
    rightSide: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    badge: {
        minWidth: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: '#FF3B30',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 6,
    },
    badgeText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#fff',
    },
    logoutContainer: {
        marginTop: 40,
        marginBottom: 20,
        paddingHorizontal: 20,
    },
    logoutButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#FF3B30',
        paddingVertical: 16,
        borderRadius: 12,
    },
    logoutButtonText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#fff',
    },
    versionContainer: {
        alignItems: 'center',
        paddingVertical: 20,
    },
    versionText: {
        fontSize: 13,
        color: '#999',
    },
});

export default SettingsScreen;