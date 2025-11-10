import { AntDesign, FontAwesome5, Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
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
import i18n from '../../lib/i18n'; // ASSUMED IMPORT PATH
import { supabase } from '../../lib/Supabase';
import { useAuth } from '../context/AuthContext';

const SettingsScreen = () => {
    const router = useRouter();
    const { user, signOut } = useAuth();
    const [unreadCount, setUnreadCount] = useState(0);

    const handleLogout = async () => {
        Alert.alert(
            i18n.t('profile.logout'), // Use i18n key
            i18n.t('settingsScreen.areYouSureLogout'), // Use i18n key
            [
                { text: i18n.t('settingsScreen.cancel'), style: 'cancel' }, // Use i18n key
                {
                    text: i18n.t('profile.logout'), // Use i18n key
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            console.log('🚪 Starting logout process...');
                            
                            // Sign out from Supabase first
                            await supabase.auth.signOut();
                            console.log('✅ Signed out from Supabase');
                            
                            // Sign out from context (clears AsyncStorage)
                            await signOut();
                            console.log('✅ Cleared AsyncStorage and user data');
                            
                            // Navigate to login screen
                            setTimeout(() => {
                                console.log('🚀 Navigating to login screen');
                                router.replace('/(auth)/signup');
                            }, 100);
                            
                        } catch (error) {
                            console.error('❌ Logout error:', error);
                            Alert.alert(i18n.t('settingsScreen.error'), i18n.t('settingsScreen.logoutFailed')); // Use i18n keys
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
                <TouchableOpacity onPress={() => router.push('/(tabs)/profile')} style={styles.backButton}>
                    <Ionicons name="chevron-back" size={28} color="#000" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{i18n.t('settingsScreen.title')}</Text> {/* Use i18n key */}
                <View style={styles.placeholder} />
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>{i18n.t('settingsScreen.general')}</Text>

                    <SettingItem
                        IconComponent={Ionicons}
                        iconName="notifications-outline"
                        title={i18n.t('settingsScreen.notifications')}
                        showBadge={true}
                        badgeCount={unreadCount}
                        onPress={() => {
                            router.push('/notification_settings');
                        }}
                    />
                    <SettingItem
                        IconComponent={Ionicons}
                        iconName="language-outline"
                        title={i18n.t('language')} // New i18n key
                        onPress={() => {
                            router.push('/tenten/language');
                        }}
                    />
                    <SettingItem
                        IconComponent={MaterialIcons}
                        iconName="block"
                        title={i18n.t('settingsScreen.blockedUsers')}
                        onPress={() => {
                            router.push('/tenten/blocked');
                        }}
                    />
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>{i18n.t('settingsScreen.connect')}</Text>

                    <SettingItem
                        IconComponent={FontAwesome5}
                        iconName="facebook"
                        title={i18n.t('settingsScreen.followFacebook')}
                        onPress={() => {}}
                    />
                    <SettingItem
                        IconComponent={AntDesign}
                        iconName="twitter"
                        title={i18n.t('settingsScreen.followTwitter')}
                        onPress={() => {}}
                    />
                    <SettingItem
                        IconComponent={FontAwesome5}
                        iconName="tiktok"
                        title={i18n.t('settingsScreen.followTiktok')}
                        onPress={() => {}}
                    />
                    <SettingItem
                        IconComponent={AntDesign}
                        iconName="instagram"
                        title={i18n.t('settingsScreen.followInstagram')}
                        onPress={() => {}}
                    />
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>{i18n.t('settingsScreen.contact')}</Text>

                    <SettingItem
                        IconComponent={AntDesign}
                        iconName="star"
                        title={i18n.t('settingsScreen.rateUs')}
                        onPress={() => { router.push('/tenten/faq'); }}
                    />
                    <SettingItem
                        IconComponent={Ionicons}
                        iconName="help-circle-outline"
                        iconSize={24}
                        title={i18n.t('settingsScreen.help')}
                        onPress={() => { router.push('/tenten/help'); }}
                    />
                </View>

                <View style={styles.logoutContainer}>
                    <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                        <Ionicons name="log-out-outline" size={20} color="#666" />
                        <Text style={styles.logoutButtonText}>{i18n.t('profile.logout')}</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.versionContainer}>
                    <Text style={styles.versionText}>{i18n.t('settingsScreen.version')} 1.0.0</Text>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
        marginBottom:30
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 8,
        paddingVertical: 12,
        marginTop: 30,
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
        backgroundColor: '#fff',
        paddingVertical: 14,
        paddingHorizontal: 20,
        borderRadius: 10,
        borderWidth: 1.5,
        borderColor: '#e0e0e0',
        gap: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    logoutButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#666',
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