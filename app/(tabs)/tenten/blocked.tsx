import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    FlatList,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    Image, // ✅ NEW: Imported Image component
} from "react-native";
import { supabase } from "../../../lib/Supabase";
import i18n from "../../../lib/i18n";

// Constants
const PRIMARY_TEAL = "#16A085";
const DARK_GRAY = "#333333";

// Interface for a blocked user entry
// ✅ FIXED: Using 'blocked_id' and added 'profile_image_url'
interface blockedUsersUser {
    id: number;          // ID from the 'block' table
    blocked_id: number;  // The ID of the blocked user (Matches SQL 'blocked_id')
    username: string;
    profile_image_url: string | null; // ✅ New profile image URL
}

// Function to safely get the current user ID
const getCurrentUserId = async (): Promise<number | null> => {
    try {
        const userIdString = await AsyncStorage.getItem('userId');
        const userId = parseInt(userIdString || '0');
        if (userId > 0) return userId;

        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user?.email) {
            const { data: dbUser } = await supabase
                .from('users')
                .select('user_id')
                .eq('email', session.user.email.toLowerCase())
                .single();
            return dbUser?.user_id || null;
        }
        return null;
    } catch (error) {
        console.error('Error getting current user ID:', error);
        return null;
    }
};


export default function blockedUsersScreen() {
    const router = useRouter();
    const [blockedUsers, setblockedUsers] = useState<blockedUsersUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentUserId, setCurrentUserId] = useState<number | null>(null);

    // Function to fetch the list of blocked users
    const fetchblockedUsers = useCallback(async (userId: number) => {
        setLoading(true);
        try {
            // ✅ FINAL QUERY FIX: No comments, uses 'blocked_id', and selects 'profile_image_url'
            const { data, error } = await supabase
                .from('block')
                .select(`
                    id, 
                    blocked_id, 
                    users!blocked_id(username, profile_image_url)
                `)
                .eq('blocker_id', userId)
                .order('created_at', { ascending: false });

            if (error) throw error;

            // Transform the data into the desired format
            const list: blockedUsersUser[] = (data || []).map(item => ({
                id: item.id,
                blocked_id: item.blocked_id, 
                username: item.users?.username || i18n.t('blockedUsers.unknownUser'),
                // ✅ MAPPING: Pull the image URL from the joined 'users' object
                profile_image_url: item.users?.profile_image_url || null,
            }));
            
            setblockedUsers(list);

        } catch (error: any) {
            console.error('Error fetching blocked users:', error.message); 
            Alert.alert(i18n.t('blockedUsers.errorTitle'), i18n.t('blockedUsers.failedToLoad')); 
        } finally {
            setLoading(false);
        }
    }, []);

    // Function to handle the unblock action
    const handleUnblockUser = async (userToUnblockId: number) => {
        if (!currentUserId) {
            Alert.alert(i18n.t('blockedUsers.errorTitle'), i18n.t('blockedUsers.loginRequired')); 
            return;
        }

        Alert.alert(
            i18n.t('blockedUsers.unblockAlertTitle'),
            i18n.t('blockedUsers.unblockAlertMessage'),
            [
                {
                    text: i18n.t('blockedUsers.cancel'),
                    style: "cancel",
                },
                {
                    text: i18n.t('blockedUsers.unblockButton'),
                    style: "destructive",
                    onPress: async () => {
                        try {
                            // Delete logic uses 'blocked_id'
                            const { error } = await supabase.from('block')
                                .delete()
                                .eq('blocker_id', currentUserId)
                                .eq('blocked_id', userToUnblockId); 

                            if (error) throw error;

                            Alert.alert(i18n.t('blockedUsers.successTitle'), i18n.t('blockedUsers.unblockSuccess')); 
                            
                            // Remove the user from the local state 
                            setblockedUsers(prev => prev.filter(u => u.blocked_id !== userToUnblockId));
                            
                        } catch (error: any) {
                            console.error("Error unblocking user:", error.message);
                            Alert.alert(i18n.t('blockedUsers.errorTitle'), i18n.t('blockedUsers.unblockFailed')); 
                        }
                    }
                },
            ]
        );
    };
    
    // Initial load effect
    useEffect(() => {
        const loadUserAndData = async () => {
            const id = await getCurrentUserId();
            setCurrentUserId(id);
            if (id) {
                await fetchblockedUsers(id);
            } else {
                setLoading(false);
            }
        };
        loadUserAndData();
    }, [fetchblockedUsers]);

    // Render Item for FlatList
    const renderItem = ({ item }: { item: blockedUsersUser }) => (
        <View style={styles.userRow}>
            <View style={styles.userInfo}>
                {/* ✅ UI: Profile Picture or Placeholder */}
                {item.profile_image_url ? (
                    <Image 
                        source={{ uri: item.profile_image_url }} 
                        style={styles.profileImage} 
                    />
                ) : (
                    <View style={styles.profileImagePlaceholder}>
                        <Ionicons name="person" size={24} color="#fff" />
                    </View>
                )}
                <Text style={styles.usernameText}>{item.username}</Text>
            </View>
            <TouchableOpacity 
                style={styles.unblockButton} 
                onPress={() => handleUnblockUser(item.blocked_id)}
            >
                <Text style={styles.unblockText}>{i18n.t('blockedUsers.unblockButton')}</Text>
            </TouchableOpacity>
        </View>
    );

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()}>
                    <Ionicons name="chevron-back" size={28} color={DARK_GRAY} />
                </TouchableOpacity>
                <Text style={styles.title}>{i18n.t('blockedUsers.title')}</Text> 
                <View style={{ width: 28 }} />
            </View>

            {loading ? (
                <ActivityIndicator size="large" color={PRIMARY_TEAL} style={styles.loading} />
            ) : blockedUsers.length === 0 ? (
                <View style={styles.emptyContainer}>
                    <Ionicons name="people-circle-outline" size={80} color="#ccc" />
                    <Text style={styles.emptyText}>{i18n.t('blockedUsers.emptyMessage')}</Text> 
                    <Text style={styles.emptySubText}>
                        {i18n.t('blockedUsers.emptySubtext')}
                    </Text>
                </View>
            ) : (
                <FlatList
                    data={blockedUsers}
                    keyExtractor={(item) => String(item.blocked_id)}
                    renderItem={renderItem}
                    contentContainerStyle={styles.listContent}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { 
        flex: 1, 
        backgroundColor: "#fff",
        paddingTop: 16, 
    },
    header: { 
        flexDirection: "row", 
        alignItems: "center", 
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        marginTop: 25,
        marginBottom: 10,
    },
    title: { 
        fontSize: 20, 
        fontWeight: "700",
        color: DARK_GRAY,
    },
    loading: {
        marginTop: 40,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 30,
    },
    emptyText: { 
        marginTop: 15, 
        fontSize: 18, 
        fontWeight: '600',
        color: DARK_GRAY,
        textAlign: 'center',
    },
    emptySubText: {
        marginTop: 10,
        fontSize: 14,
        color: '#999',
        textAlign: 'center',
    },
    listContent: {
        paddingHorizontal: 16,
        paddingTop: 10,
    },
    userRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    // ✅ NEW: Styling for profile image and grouping
    userInfo: { 
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    profileImage: { 
        width: 40,
        height: 40,
        borderRadius: 20,
        marginRight: 12,
        backgroundColor: '#ccc',
    },
    profileImagePlaceholder: { 
        width: 40,
        height: 40,
        borderRadius: 20,
        marginRight: 12,
        backgroundColor: PRIMARY_TEAL,
        justifyContent: 'center',
        alignItems: 'center',
    },
    usernameText: {
        fontSize: 16,
        color: DARK_GRAY,
        fontWeight: '500',
        // Removed flex to allow the image and username to wrap nicely
    },
    unblockButton: {
        backgroundColor: PRIMARY_TEAL,
        paddingHorizontal: 15,
        paddingVertical: 8,
        borderRadius: 20,
    },
    unblockText: {
        color: 'white',
        fontWeight: '600',
        fontSize: 14,
    }
});