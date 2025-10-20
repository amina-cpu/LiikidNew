import React from 'react';
import {
    SafeAreaView,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    Alert,
} from 'react-native';
import { Ionicons, FontAwesome5, MaterialIcons, AntDesign } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '../context/AuthContext'; // 👈 same context as ProfileScreen

const SettingsScreen = () => {
    const router = useRouter();
    const { signOut } = useAuth();

    // ✅ Same logout logic as ProfileScreen
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
                            console.error('Error logging out:', error);
                            Alert.alert('Error', 'Failed to logout. Please try again.');
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
        onPress,
    }: {
        IconComponent: any;
        iconName: string;
        iconSize?: number;
        title: string;
        onPress?: () => void;
    }) => (
        <TouchableOpacity style={styles.settingItem} onPress={onPress}>
            <View style={styles.settingLeft}>
                <View style={styles.iconContainer}>
                    <IconComponent name={iconName} size={iconSize} color="#000" />
                </View>
                <Text style={styles.settingTitle}>{title}</Text>
            </View>
            <Ionicons name="chevron-forward" size={22} color="#999" />
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="chevron-back" size={28} color="#000" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Settings</Text>
                <View style={styles.placeholder} />
            </View>

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                {/* General Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>General</Text>

                    <SettingItem
                        IconComponent={Ionicons}
                        iconName="notifications-outline"
                        title="Notifications"
                        onPress={() => {}}
                    />
                    <SettingItem
                        IconComponent={Ionicons}
                        iconName="language-outline"
                        title="Language"
                        onPress={() => {}}
                    />
                    <SettingItem
                        IconComponent={MaterialIcons}
                        iconName="block"
                        title="Blocked users"
                        onPress={() => {}}
                    />
                </View>

                {/* Connect Section */}
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

                {/* Contact Section */}
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

                {/* 🔴 Logout Button at Bottom */}
                <View style={styles.logoutContainer}>
                    <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                        <Ionicons name="log-out-outline" size={22} color="#fff" style={{ marginRight: 8 }} />
                        <Text style={styles.logoutButtonText}>Logout</Text>
                    </TouchableOpacity>
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
    content: {
        flex: 1,
    },
    section: {
        marginTop: 28,
        paddingHorizontal: 16,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#000',
        marginBottom: 12,
    },
    settingItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
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
    logoutContainer: {
        marginTop: 40,
        marginBottom: 40,
        paddingHorizontal: 20,
    },
    logoutButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#FF3B30',
        paddingVertical: 16,
        borderRadius: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    logoutButtonText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#fff',
    },
});

export default SettingsScreen;
