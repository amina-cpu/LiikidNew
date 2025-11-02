// app/followers_list.tsx

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

interface FollowUser {
    user_id: number;
    username: string;
    profile_image_url: string | null;
    isFollowing?: boolean; // Does the logged-in user follow this person?
    isMutual?: boolean; // Is this a mutual follow (friends)?
}

const FollowersList = () => {
    const { userId } = useLocalSearchParams();
    const targetUserId = typeof userId === 'string' ? parseInt(userId) : null;

    const router = useRouter();
    const [followers, setFollowers] = useState<FollowUser[]>([]);
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

    // Check which users the logged-in user follows
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

    const fetchFollowers = useCallback(async (isRefreshing = false) => {
        if (!targetUserId) {
            setLoading(false);
            return;
        }

        const loggedInUserId = await getLoggedInUserId();

        try {
            if (!isRefreshing) setLoading(true);

            // 1. Fetch followers of the target user
            const { data, error } = await supabase
                .from('user_follows')
                .select('follower_id, users:follower_id(user_id, username, profile_image_url)')
                .eq('following_id', targetUserId);

            if (error) throw error;

            const fetchedFollowers: FollowUser[] = (data || [])
                .map(item => item.users)
                .filter(user => user !== null) as FollowUser[];

            let finalFollowers: FollowUser[] = fetchedFollowers;

            // 2. Check follow and mutual status if a user is logged in
            if (loggedInUserId) {
                const followerIds = fetchedFollowers.map(f => f.user_id);
                const followedByCurrentUser = await checkFollowStatus(loggedInUserId, followerIds);
                const followsCurrentUserBack = await checkMutualStatus(loggedInUserId, followerIds);

                finalFollowers = fetchedFollowers.map(follower => ({
                    ...follower,
                    isFollowing: followedByCurrentUser.has(follower.user_id),
                    isMutual: followedByCurrentUser.has(follower.user_id) && followsCurrentUserBack.has(follower.user_id),
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

    const handleFollowToggle = async (userToToggle: FollowUser) => {
        if (!currentUserId) {
            Alert.alert('Login Required', 'Please log in to follow/unfollow users.');
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

                // Update UI
                setFollowers(prev => 
                    prev.map(f => 
                        f.user_id === userToToggle.user_id 
                        ? { ...f, isFollowing: false, isMutual: false } 
                        : f
                    )
                );
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
                setFollowers(prev => 
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
            if (currentUserId && userToToggle.user_id) {
                const { data: followStatus } = await supabase
                    .from('user_follows')
                    .select('follow_id')
                    .eq('follower_id', currentUserId)
                    .eq('following_id', userToToggle.user_id)
                    .maybeSingle();
                
                setFollowers(prev => 
                    prev.map(f => 
                        f.user_id === userToToggle.user_id 
                        ? { ...f, isFollowing: !!followStatus } 
                        : f
                    )
                );
            }
        }
    };

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
            router.push('/(tabs)/profile');
        } else {
            router.push(`/someonesProfile?userId=${id}`);
        }
    };

    const FollowerItem: React.FC<{ user: FollowUser }> = ({ user }) => {
        const isCurrentUser = user.user_id === currentUserId;
        
        // Determine button text and style
        let buttonText = 'Follow';
        let buttonStyle = styles.followButton;
        let textStyle = styles.followButtonText;

        if (user.isMutual) {
            buttonText = 'Friends';
            buttonStyle = styles.friendsButton;
            textStyle = styles.friendsButtonText;
        } else if (user.isFollowing) {
            buttonText = 'Unfollow';
            buttonStyle = styles.unfollowButton;
            textStyle = styles.unfollowButtonText;
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

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => handleProfilePress(targetUserId!)} style={styles.backButton}>
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