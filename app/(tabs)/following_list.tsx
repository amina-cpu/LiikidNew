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
    isFollowing?: boolean; // Does the logged-in user follow this person?
    isMutual?: boolean; // Is this a mutual follow (friends)?
}

const FollowingList = () => {
    const { userId } = useLocalSearchParams();
    const targetUserId = typeof userId === 'string' ? parseInt(userId) : null;

    const router = useRouter();
    const [following, setFollowing] = useState<FollowingUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [currentUserId, setCurrentUserId] = useState<number | null>(null);

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

    // Check if logged-in user follows these users
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

    // Check which users follow the logged-in user back (for mutual detection)
    const checkMutualStatus = async (loggedInUserId: number, userIds: number[]): Promise<Set<number>> => {
        if (userIds.length === 0) return new Set();

        const { data, error } = await supabase
            .from('user_follows')
            .select('follower_id')
            .eq('following_id', loggedInUserId)
            .in('follower_id', userIds);

        if (error) {
            console.error('Error checking mutual status:', error);
            return new Set();
        }

        return new Set(data?.map(item => item.follower_id) || []);
    };

    const fetchFollowing = useCallback(async (isRefreshing = false) => {
        if (!targetUserId) {
            setLoading(false);
            return;
        }

        const loggedInUserId = await getLoggedInUserId();

        try {
            if (!isRefreshing) setLoading(true);

            // Fetch users that the target user is following
            const { data, error } = await supabase
                .from('user_follows')
                .select('following_id, users:following_id(user_id, username, profile_image_url)')
                .eq('follower_id', targetUserId);

            if (error) throw error;

            const fetchedFollowing: FollowingUser[] = (data || [])
                .map(item => item.users)
                .filter(user => user !== null) as FollowingUser[];

            let finalFollowing: FollowingUser[] = fetchedFollowing;

            // If logged-in user is viewing their own list or someone else's
            if (loggedInUserId) {
                const followingIds = fetchedFollowing.map(f => f.user_id);
                
                if (loggedInUserId === targetUserId) {
                    // Viewing own following list - check who follows back
                    const followsBack = await checkMutualStatus(loggedInUserId, followingIds);

                    finalFollowing = fetchedFollowing.map(user => ({
                        ...user,
                        isFollowing: true, // Always true for own following list
                        isMutual: followsBack.has(user.user_id),
                    }));
                } else {
                    // Viewing someone else's following list - check if logged-in user follows them
                    const followedByCurrentUser = await checkFollowStatus(loggedInUserId, followingIds);
                    const followsCurrentUserBack = await checkMutualStatus(loggedInUserId, followingIds);

                    finalFollowing = fetchedFollowing.map(user => ({
                        ...user,
                        isFollowing: followedByCurrentUser.has(user.user_id),
                        isMutual: followedByCurrentUser.has(user.user_id) && followsCurrentUserBack.has(user.user_id),
                    }));
                }
            }

            setFollowing(finalFollowing);

        } catch (error: any) {
            console.error('Error fetching following list:', error);
            Alert.alert('Error', 'Failed to load following list.');
        } finally {
            setLoading(false);
            if (isRefreshing) setRefreshing(false);
        }
    }, [targetUserId]);

    const handleFollowToggle = async (userToToggle: FollowingUser) => {
        if (!currentUserId) {
            Alert.alert('Login Required', 'Please log in to manage your follow list.');
            return;
        }

        const isCurrentlyFollowing = userToToggle.isFollowing;

        try {
            if (isCurrentlyFollowing) {
                // Unfollow
                const { error } = await supabase
                    .from('user_follows')
                    .delete()
                    .eq('follower_id', currentUserId)
                    .eq('following_id', userToToggle.user_id);

                if (error) throw error;

                // Delete notification
                await supabase
                    .from('notifications')
                    .delete()
                    .eq('sender_id', currentUserId)
                    .eq('receiver_id', userToToggle.user_id)
                    .eq('type', 'follow');

                // If viewing own list, remove from list; otherwise just update status
                if (currentUserId === targetUserId) {
                    setFollowing(prev => prev.filter(f => f.user_id !== userToToggle.user_id));
                } else {
                    setFollowing(prev => 
                        prev.map(f => 
                            f.user_id === userToToggle.user_id 
                            ? { ...f, isFollowing: false, isMutual: false } 
                            : f
                        )
                    );
                }
            } else {
                // Follow - use upsert to handle duplicates
                const { error } = await supabase
                    .from('user_follows')
                    .upsert(
                        { follower_id: currentUserId, following_id: userToToggle.user_id },
                        { onConflict: 'follower_id,following_id', ignoreDuplicates: false }
                    );

                if (error) throw error;

                // Check if they follow back (mutual)
                const { data: followBackData } = await supabase
                    .from('user_follows')
                    .select('follow_id')
                    .eq('follower_id', userToToggle.user_id)
                    .eq('following_id', currentUserId)
                    .maybeSingle();

                const isMutual = !!followBackData;

                // Update UI
                setFollowing(prev => 
                    prev.map(f => 
                        f.user_id === userToToggle.user_id 
                        ? { ...f, isFollowing: true, isMutual } 
                        : f
                    )
                );
            }
        } catch (error: any) {
            console.error('Follow/Unfollow failed:', error);
            Alert.alert('Error', `Failed to ${isCurrentlyFollowing ? 'unfollow' : 'follow'}.`);
            
            // Refresh from database on error
            fetchFollowing(true);
        }
    };

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
            router.push('/(tabs)/profile');
        } else {
            router.push(`/someonesProfile?userId=${id}`);
        }
    };

    const FollowingItem: React.FC<{ user: FollowingUser }> = ({ user }) => {
        const isCurrentUser = user.user_id === currentUserId;
        const isOwnFollowingList = targetUserId === currentUserId;

        // Determine button text and style
        let buttonText = 'Follow';
        let buttonStyle = styles.followButton;
        let textStyle = styles.followButtonText;

        if (isOwnFollowingList) {
            // Own following list - show "Remove" or "Friends"
            if (user.isMutual) {
                buttonText = 'Friends';
                buttonStyle = styles.friendsButton;
                textStyle = styles.friendsButtonText;
            } else {
                buttonText = 'Remove';
                buttonStyle = styles.removeButton;
                textStyle = styles.removeButtonText;
            }
        } else {
            // Someone else's following list
            if (user.isMutual) {
                buttonText = 'Friends';
                buttonStyle = styles.friendsButton;
                textStyle = styles.friendsButtonText;
            } else if (user.isFollowing) {
                buttonText = 'Unfollow';
                buttonStyle = styles.unfollowButton;
                textStyle = styles.unfollowButtonText;
            }
        }

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

                {!isCurrentUser && (
                    <TouchableOpacity 
                        style={buttonStyle}
                        onPress={() => handleFollowToggle(user)}
                    >
                        <Text style={textStyle}>{buttonText}</Text>
                    </TouchableOpacity>
                )}
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

    const isCurrentUserList = targetUserId === currentUserId;
    const listTitle = isCurrentUserList ? `Following (${following.length})` : `Following (${following.length})`;

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => handleProfilePress(targetUserId!)} style={styles.backButton}>
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
                        <Text style={styles.emptyText}>
                            {isCurrentUserList ? "You're not following anyone yet." : "This user isn't following anyone yet."}
                        </Text>
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
    followButton: {
        backgroundColor: '#16A085',
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 20,
        minWidth: 80,
        alignItems: 'center',
    },
    followButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#fff',
    },
    unfollowButton: {
        backgroundColor: '#fff',
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 20,
        minWidth: 80,
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#16A085',
    },
    unfollowButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#16A085',
    },
    friendsButton: {
        backgroundColor: '#fff',
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 20,
        minWidth: 80,
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#C8E853',
    },
    friendsButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#000',
    },
    removeButton: {
        backgroundColor: '#E9E9E9',
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 20,
        minWidth: 80,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#C8C8C8',
    },
    removeButtonText: {
        fontSize: 14,
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