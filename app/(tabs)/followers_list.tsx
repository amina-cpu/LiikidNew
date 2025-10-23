// app/followers_list.tsx

import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
    ActivityIndicator,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    View,
    TouchableOpacity,
    Alert,
    Image,
    RefreshControl,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../../lib/Supabase';

interface FollowUser {
    user_id: number;
    username: string;
    profile_image_url: string | null;
    isFollowing?: boolean; // NEW: Track if the logged-in user follows this person
}

const FollowersList = () => {
    const { userId } = useLocalSearchParams();
    const targetUserId = typeof userId === 'string' ? parseInt(userId) : null;

    const router = useRouter();
    const [followers, setFollowers] = useState<FollowUser[]>([]);
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

    // --- NEW: Function to check follow status for a list of users ---
    const checkFollowStatus = async (loggedInUserId: number, userIds: number[]): Promise<Set<number>> => {
        if (userIds.length === 0) return new Set();

        const { data, error } = await supabase
            .from('user_follows')
            .select('following_id')
            .eq('follower_id', loggedInUserId)
            .in('following_id', userIds);

        if (error) {
            console.error('Error checking follow status:', error);
            return new Set();
        }

        return new Set(data?.map(item => item.following_id) || []);
    };
    // ----------------------------------------------------------------

    const fetchFollowers = useCallback(async (isRefreshing = false) => {
        if (!targetUserId) {
            setLoading(false);
            return;
        }

        const loggedInUserId = await getLoggedInUserId();

        try {
            if (!isRefreshing) setLoading(true);

            // 1. Fetch followers
            const { data, error } = await supabase
                .from('user_follows')
                .select('follower_id, users:follower_id(user_id, username, profile_image_url)')
                .eq('following_id', targetUserId);

            if (error) throw error;

            const fetchedFollowers: FollowUser[] = (data || [])
                .map(item => item.users)
                .filter(user => user !== null) as FollowUser[];

            let finalFollowers: FollowUser[] = fetchedFollowers;

            // 2. Check follow status only if a user is logged in
            if (loggedInUserId) {
                const followerIds = fetchedFollowers.map(f => f.user_id);
                const followedByCurrentUser = await checkFollowStatus(loggedInUserId, followerIds);

                finalFollowers = fetchedFollowers.map(follower => ({
                    ...follower,
                    isFollowing: followedByCurrentUser.has(follower.user_id),
                }));
            }

            setFollowers(finalFollowers);

        } catch (error: any) {
            console.error('Error fetching followers:', error);
            Alert.alert('Error', 'Failed to load followers list.');
        } finally {
            setLoading(false);
            if (isRefreshing) setRefreshing(false);
        }
    }, [targetUserId]);

    // --- NEW: Follow/Unfollow handler ---
    const handleFollowToggle = async (userToToggle: FollowUser) => {
        if (!currentUserId) {
            Alert.alert('Login Required', 'Please log in to follow/unfollow users.');
            return;
        }

        // Optimistic UI update
        const isCurrentlyFollowing = userToToggle.isFollowing;
        setFollowers(prev => 
            prev.map(f => 
                f.user_id === userToToggle.user_id 
                ? { ...f, isFollowing: !isCurrentlyFollowing } 
                : f
            )
        );

        try {
            if (isCurrentlyFollowing) {
                // Unfollow (Remove)
                const { error } = await supabase
                    .from('user_follows')
                    .delete()
                    .eq('follower_id', currentUserId)
                    .eq('following_id', userToToggle.user_id);

                if (error) throw error;
            } else {
                // Follow
                const { error } = await supabase
                    .from('user_follows')
                    .insert({ follower_id: currentUserId, following_id: userToToggle.user_id });

                if (error) throw error;
            }
        } catch (error) {
            console.error('Follow/Unfollow failed:', error);
            Alert.alert('Error', `Failed to ${isCurrentlyFollowing ? 'unfollow' : 'follow'}.`);
            // Rollback optimistic update on failure
            setFollowers(prev => 
                prev.map(f => 
                    f.user_id === userToToggle.user_id 
                    ? { ...f, isFollowing: isCurrentlyFollowing } 
                    : f
                )
            );
        }
    };
    // ------------------------------------

    useFocusEffect(
        useCallback(() => {
            fetchFollowers();
        }, [fetchFollowers])
    );

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        fetchFollowers(true);
    }, [fetchFollowers]);

    const handleProfilePress = (id: number) => {
        if (id === currentUserId) {
            // Navigate to the main tab-based profile screen
            router.push('/(tabs)/profile');
        } else {
            // Navigate to another user's profile screen
            router.push(`/someonesProfile?userId=${id}`);
        }
    };

    const FollowerItem: React.FC<{ user: FollowUser }> = ({ user }) => {
        const isCurrentUser = user.user_id === currentUserId;
        const buttonText = user.isFollowing ? 'Remove' : 'Follow';
        const buttonStyle = user.isFollowing ? styles.removeButton : styles.followButton;
        const textStyle = user.isFollowing ? styles.removeButtonText : styles.followButtonText;

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
                    {!isCurrentUser && (
                        <>
                            <TouchableOpacity style={styles.friendsButton} onPress={() => Alert.alert('Friends Feature', 'This is a placeholder for the Friends feature.')}>
                                <Text style={styles.friendsButtonText}>Friends</Text>
                            </TouchableOpacity>
                            <TouchableOpacity 
                                style={buttonStyle}
                                onPress={() => handleFollowToggle(user)}
                            >
                                <Text style={textStyle}>{buttonText}</Text>
                            </TouchableOpacity>
                        </>
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

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#000" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Followers ({followers.length})</Text>
            </View>

            <ScrollView
                contentContainerStyle={followers.length === 0 ? styles.centerContent : styles.scrollContent}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#16A085" />
                }
            >
                {followers.length === 0 ? (
                    <View style={styles.emptyContainer}>
                        <Ionicons name="people-outline" size={60} color="#888" />
                        <Text style={styles.emptyText}>No followers yet.</Text>
                    </View>
                ) : (
                    followers.map((user) => (
                        <FollowerItem key={user.user_id} user={user} />
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
        marginRight: 10, // Added margin to separate name from buttons
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

export default FollowersList;