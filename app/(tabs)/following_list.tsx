// app/following_list.tsx

import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    RefreshControl,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { supabase } from '../../lib/Supabase';

interface FollowingUser {
    user_id: number;
    username: string;
    profile_image_url: string | null;
    isFollowing?: boolean; // Always true for this list, but maintained for consistency/toggling
}

const FollowingList = () => {
    const { userId } = useLocalSearchParams();
    const targetUserId = typeof userId === 'string' ? parseInt(userId) : null;

    const router = useRouter();
    const [following, setFollowing] = useState<FollowingUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [currentUserId, setCurrentUserId] = useState<number | null>(null);

    // --- Utility to get current user ID from storage ---
    const getLoggedInUserId = async () => {
        try {
            const userJson = await AsyncStorage.getItem('user');
            if (userJson) {
                const user = JSON.parse(userJson);
                setCurrentUserId(user.user_id);
                return user.user_id;
            }
        } catch (e) {
            console.error('Failed to load current user ID:', e);
            setCurrentUserId(null);
            return null;
        }
    };
    // ----------------------------------------------------

    const fetchFollowing = useCallback(async (isRefreshing = false) => {
        if (!targetUserId) {
            setLoading(false);
            return;
        }

        await getLoggedInUserId();

        try {
            if (!isRefreshing) setLoading(true);

            // Fetch following list
            const { data, error } = await supabase
                .from('user_follows')
                .select('following_id, users:following_id(user_id, username, profile_image_url)')
                .eq('follower_id', targetUserId);

            if (error) throw error;

            // Map the results. Since this is the FOLLOWING list, all users are currently followed
            const followingUsers: FollowingUser[] = (data || [])
                .map(item => item.users)
                .filter(user => user !== null)
                .map(user => ({ ...user, isFollowing: true })) as FollowingUser[];

            setFollowing(followingUsers);

        } catch (error: any) {
            console.error('Error fetching following list:', error);
            Alert.alert('Error', 'Failed to load following list.');
        } finally {
            setLoading(false);
            if (isRefreshing) setRefreshing(false);
        }
    }, [targetUserId]);

    // --- NEW: Follow/Unfollow handler ---
    const handleFollowToggle = async (userToToggle: FollowingUser) => {
        if (!currentUserId) {
            Alert.alert('Login Required', 'Please log in to manage your follow list.');
            return;
        }
        
        // This button will always be 'Remove' on the following page, 
        // but we use the isFollowing flag to guide the logic.
        const isCurrentlyFollowing = userToToggle.isFollowing; 
        
        // Optimistic UI update: Remove the user from the list on unfollow
        if (isCurrentlyFollowing) {
            setFollowing(prev => prev.filter(f => f.user_id !== userToToggle.user_id));
        }

        try {
            if (isCurrentlyFollowing) {
                // Unfollow (Remove)
                const { error } = await supabase
                    .from('user_follows')
                    .delete()
                    .eq('follower_id', currentUserId)
                    .eq('following_id', userToToggle.user_id);

                if (error) throw error;
                Alert.alert('Unfollowed', `You have unfollowed ${userToToggle.username}.`);
            }
            // Note: We don't need a 'Follow' action on the Following list itself.

        } catch (error) {
            console.error('Unfollow failed:', error);
            Alert.alert('Error', 'Failed to unfollow.');
            // Rollback optimistic update on failure (requires a full re-fetch to restore the list)
            fetchFollowing(true);
        }
    };
    // ------------------------------------

    useFocusEffect(
        useCallback(() => {
            fetchFollowing();
        }, [fetchFollowing])
    );

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        fetchFollowing(true);
    }, [fetchFollowing]);

    const handleProfilePress = (id: number) => {
        if (id === currentUserId) {
            // Navigate to the main tab-based profile screen
            router.push('/(tabs)/profile');
        } else {
            // Navigate to another user's profile screen
            router.push(`/someonesProfile?userId=${id}`);
        }
    };

    const FollowingItem: React.FC<{ user: FollowingUser }> = ({ user }) => {
        const isCurrentUser = user.user_id === currentUserId;

        return (
            <TouchableOpacity
                style={styles.listItem}
                onPress={() => handleProfilePress(user.user_id)}
            >
                {user.profile_image_url ? (
                    <Image source={{ uri: user.profile_image_url }} style={styles.avatar} />
                ) : (
                    <View style={styles.avatarPlaceholder}>
                        <Text style={styles.avatarInitial}>{user.username.charAt(0).toUpperCase()}</Text>
                    </View>
                )}
                <Text style={styles.username} numberOfLines={1}>{user.username}</Text>

             <View style={styles.buttonContainer}>
    {/* The logged-in user's own following list (show REMOVE + FRIENDS) */}
    {!isCurrentUser && targetUserId === currentUserId && (
        <View style={{ flexDirection: 'row' }}>
            <TouchableOpacity
                style={styles.friendsButton}
                onPress={() =>
                    Alert.alert('Friends Feature', 'This is a placeholder for the Friends feature.')
                }>
                <Text style={styles.friendsButtonText}>Friends</Text>
            </TouchableOpacity>

            <TouchableOpacity
                style={styles.removeButton}
                onPress={() => handleFollowToggle(user)}>
                <Text style={styles.removeButtonText}>Remove</Text>
            </TouchableOpacity>
        </View>
    )}

    {/* Viewing someone else's following list (show FOLLOW + FRIENDS) */}
    {!isCurrentUser && targetUserId !== currentUserId && (
        <View style={{ flexDirection: 'row' }}>
            <TouchableOpacity
                style={styles.friendsButton}
                onPress={() =>
                    Alert.alert('Friends Feature', 'This is a placeholder for the Friends feature.')
                }>
                <Text style={styles.friendsButtonText}>Friends</Text>
            </TouchableOpacity>

            <TouchableOpacity
                style={styles.followButton}
                onPress={() =>
                    Alert.alert('Action', 'Implement follow/unfollow logic relative to the current user.')
                }>
                <Text style={styles.followButtonText}>Follow</Text>
            </TouchableOpacity>
        </View>
    )}
</View>

            </TouchableOpacity>
        );
    };

    if (loading) {
        return (
            <SafeAreaView style={[styles.container, styles.center]}>
                <ActivityIndicator size="large" color="#16A085" />
            </SafeAreaView>
        );
    }

    if (!targetUserId) {
        return (
            <SafeAreaView style={[styles.container, styles.center]}>
                <Text style={styles.emptyText}>Invalid user profile link.</Text>
            </SafeAreaView>
        );
    }

    // Determine the title based on whose list it is
    const isCurrentUserList = targetUserId === currentUserId;
    const listTitle = isCurrentUserList ? `Following (${following.length})` : `User is Following (${following.length})`;

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity   onPress={() => handleProfilePress(targetUserId!)}  style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#000" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{listTitle}</Text>
            </View>

            <ScrollView
                contentContainerStyle={following.length === 0 ? styles.centerContent : styles.scrollContent}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#16A085" />
                }
            >
                {following.length === 0 ? (
                    <View style={styles.emptyContainer}>
                        <Ionicons name="people-outline" size={60} color="#888" />
                        <Text style={styles.emptyText}>This user isn't following anyone yet.</Text>
                    </View>
                ) : (
                    following.map((user) => (
                        <FollowingItem key={user.user_id} user={user} />
                    ))
                )}
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F5F5F5',
    },
    center: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 14,
        marginTop: 35,
        backgroundColor: '#fff',
        borderBottomWidth: 0.5,
        borderBottomColor: '#e5e5e5',
    },
    backButton: {
        marginRight: 10,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#000',
    },
    scrollContent: {
        paddingHorizontal: 16,
        paddingVertical: 10,
    },
    centerContent: {
        flexGrow: 1,
        justifyContent: 'center',
        alignItems: 'center'
    },
    listItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        padding: 12,
        borderRadius: 8,
        marginBottom: 8,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    avatar: {
        width: 45,
        height: 45,
        borderRadius: 22.5,
        marginRight: 12,
    },
    avatarPlaceholder: {
        width: 45,
        height: 45,
        borderRadius: 22.5,
        backgroundColor: '#B695C0',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    avatarInitial: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#fff',
    },
    username: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
        flex: 1,
        marginRight: 10,
    },
    buttonContainer: {
        flexDirection: 'row',
        gap: 8,
        minWidth: 140, // Ensure buttons don't shrink too much
        justifyContent: 'flex-end',
    },
    friendsButton: {
        backgroundColor: '#E0E0E0',
        paddingVertical: 6,
        paddingHorizontal: 10,
        borderRadius: 6,
        minWidth: 55,
        alignItems: 'center',
    },
    friendsButtonText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#333',
    },
    followButton: {
        backgroundColor: '#16A085', // Green for Follow
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 6,
        minWidth: 65,
        alignItems: 'center',
    },
    followButtonText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#fff',
    },
    removeButton: {
        backgroundColor: '#E9E9E9', // Light gray for Remove
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 6,
        minWidth: 65,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#C8C8C8',
    },
    removeButtonText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#333',
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 50,
    },
    emptyText: {
        marginTop: 10,
        fontSize: 16,
        color: '#666',
    },
});

export default FollowingList;