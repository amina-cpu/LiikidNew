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
} from "react-native";
import { supabase } from "../../../lib/Supabase";
import i18n from "../../../lib/i18n"; // ADDED

// Constants
const PRIMARY_TEAL = "#16A085";
const DARK_GRAY = "#333333";

// Interface for a blockedUsers user entry
interface blockedUsersUser {
    id: number;          // ID from the 'block' table
    blockedUsers_id: number;  // The ID of the blockedUsers user
    username: string;
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

    // Function to fetch the list of blockedUsers users
    const fetchblockedUsers = useCallback(async (userId: number) => {
        setLoading(true);
        try {
            // Fetch the 'block' table data, joining it with the 'users' table
            const { data, error } = await supabase
                .from('block')
                .select(`
                    id, 
                    blockedUsers_id, 
                    blockedUsers_user:blockedUsers_id (username)
                `)
                .eq('blocker_id', userId)
                .order('created_at', { ascending: false });

            if (error) throw error;

            // Transform the data into the desired format
            const list: blockedUsersUser[] = (data || []).map(item => ({
                id: item.id,
                blockedUsers_id: item.blockedUsers_id,
                username: item.blockedUsers_user?.username || i18n.t('blockedUsers.unknownUser'), // UPDATED
            }));
            
            setblockedUsers(list);

        } catch (error: any) {
            console.error('Error fetching blockedUsers users:', error.message);
            // UPDATED
            Alert.alert(i18n.t('blockedUsers.errorTitle'), i18n.t('blockedUsers.failedToLoad')); 
        } finally {
            setLoading(false);
        }
    }, []);

    // Function to handle the unblock action
    const handleUnblockUser = async (userToUnblockId: number) => {
        if (!currentUserId) {
            // UPDATED
            Alert.alert(i18n.t('blockedUsers.errorTitle'), i18n.t('blockedUsers.loginRequired')); 
            return;
        }

        // UPDATED
        Alert.alert(
            i18n.t('blockedUsers.unblockAlertTitle'),
            i18n.t('blockedUsers.unblockAlertMessage'),
            [
                {
                    text: i18n.t('blockedUsers.cancel'), // UPDATED
                    style: "cancel",
                },
                {
                    text: i18n.t('blockedUsers.unblockButton'), // UPDATED
                    style: "destructive",
                    onPress: async () => {
                        try {
                            // Delete the entry from the 'block' table
                            const { error } = await supabase.from('block')
                                .delete()
                                .eq('blocker_id', currentUserId)
                                .eq('blockedUsers_id', userToUnblockId);

                            if (error) throw error;

                            // UPDATED
                            Alert.alert(i18n.t('blockedUsers.successTitle'), i18n.t('blockedUsers.unblockSuccess')); 
                            
                            // Remove the user from the local state and refresh home feed implicitly
                            setblockedUsers(prev => prev.filter(u => u.blockedUsers_id !== userToUnblockId));
                            
                            // 🔥 Signal to the home page to reload data (e.g., via event, or simply rely on navigation)
                            // For a robust app, a global state update or event emitter would be ideal here.

                        } catch (error: any) {
                            console.error("Error unblocking user:", error.message);
                            // UPDATED
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
        // Re-fetch on screen focus (if using a router that supports it)
        // You would typically use a listener here, but for simplicity, we rely on initial load.
    }, [fetchblockedUsers]);

    // Render Item for FlatList
    const renderItem = ({ item }: { item: blockedUsersUser }) => (
        <View style={styles.userRow}>
            <Text style={styles.usernameText}>{item.username}</Text>
            <TouchableOpacity 
                style={styles.unblockButton} 
                onPress={() => handleUnblockUser(item.blockedUsers_id)}
            >
                <Text style={styles.unblockText}>{i18n.t('blockedUsers.unblockButton')}</Text> {/* UPDATED */}
            </TouchableOpacity>
        </View>
    );

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()}>
                    <Ionicons name="chevron-back" size={28} color={DARK_GRAY} />
                </TouchableOpacity>
                <Text style={styles.title}>{i18n.t('blockedUsers.title')}</Text> {/* UPDATED */}
                <View style={{ width: 28 }} />
            </View>

            {loading ? (
                <ActivityIndicator size="large" color={PRIMARY_TEAL} style={styles.loading} />
            ) : blockedUsers.length === 0 ? (
                <View style={styles.emptyContainer}>
                    <Ionicons name="people-circle-outline" size={80} color="#ccc" />
                    {/* UPDATED */}
                    <Text style={styles.emptyText}>{i18n.t('blockedUsers.emptyMessage')}</Text> 
                    <Text style={styles.emptySubText}>
                        {i18n.t('blockedUsers.emptySubtext')}
                    </Text>
                </View>
            ) : (
                <FlatList
                    data={blockedUsers}
                    keyExtractor={(item) => String(item.blockedUsers_id)}
                    renderItem={renderItem}
                    contentContainerStyle={styles.listContent}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    // ... (Your styles remain the same)
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
    usernameText: {
        fontSize: 16,
        color: DARK_GRAY,
        fontWeight: '500',
        flex: 1,
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