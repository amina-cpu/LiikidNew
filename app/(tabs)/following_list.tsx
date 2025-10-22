import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Image,
    RefreshControl,
    SafeAreaView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { supabase } from '../../lib/Supabase';

interface Following {
    user_id: number;
    username: string;
    bio: string | null;
    profile_image_url: string | null;
    currentUserFollowsThis: boolean;
    isFollowingProfileOwnerBack: boolean;
}

const FollowingListScreen = () => {
    const { userId } = useLocalSearchParams();
    const profileOwnerId = typeof userId === 'string' ? parseInt(userId) : null;
    
    const router = useRouter();
    const [currentUserId, setCurrentUserId] = useState<number | null>(null);
    const [following, setFollowing] = useState<Following[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [followingCount, setFollowingCount] = useState(0);
    const [isOwnProfile, setIsOwnProfile] = useState(false);

    useEffect(() => {
        loadCurrentUser();
    }, []);

    const loadCurrentUser = async () => {
        try {
            const userJson = await AsyncStorage.getItem('user');
            if (userJson) {
                const user = JSON.parse(userJson);
                setCurrentUserId(user.user_id);
                setIsOwnProfile(user.user_id === profileOwnerId);
            }
        } catch (error) {
            console.error('Error loading current user:', error);
        } finally {
            loadFollowing();
        }
    };

    const loadFollowing = async (isRefreshing = false) => {
        if (!profileOwnerId) return;

        try {
            if (!isRefreshing) {
                setLoading(true);
            }

            // Get who the PROFILE OWNER is following
            const { data: followData, error: followError } = await supabase
                .from('user_follows')
                .select('following_id')
                .eq('follower_id', profileOwnerId);

            if (followError) throw followError;

            if (!followData || followData.length === 0) {
                setFollowing([]);
                setFollowingCount(0);
                return;
            }

            const followingIds = followData.map(f => f.following_id);
            setFollowingCount(followingIds.length);

            // Get following user details
            const { data: usersData, error: usersError } = await supabase
                .from('users')
                .select('user_id, username, bio, profile_image_url')
                .in('user_id', followingIds);

            if (usersError) throw usersError;

            // Check which of these people the CURRENT USER is following
            let currentUserFollowingIds: number[] = [];
            if (currentUserId) {
                const { data: currentUserFollowing, error: followingError } = await supabase
                    .from('user_follows')
                    .select('following_id')
                    .eq('follower_id', currentUserId);

                if (followingError) throw followingError;
                currentUserFollowingIds = currentUserFollowing?.map(f => f.following_id) || [];
            }

            // Check which of the people the profile owner follows are following them back (mutual)
            const { data: mutualData, error: mutualError } = await supabase
                .from('user_follows')
                .select('follower_id')
                .in('follower_id', followingIds)
                .eq('following_id', profileOwnerId);

            if (mutualError) throw mutualError;
            
            const followingBackIds = mutualData?.map(f => f.follower_id) || [];

            // Map following with status
            const followingWithStatus: Following[] = usersData?.map(user => ({
                ...user,
                currentUserFollowsThis: currentUserFollowingIds.includes(user.user_id),
                isFollowingProfileOwnerBack: followingBackIds.includes(user.user_id)
            })) || [];

            setFollowing(followingWithStatus);
        } catch (error: any) {
            console.error('Error loading following:', error);
            Alert.alert('Error', 'Failed to load following');
        } finally {
            setLoading(false);
            if (isRefreshing) {
                setRefreshing(false);
            }
        }
    };

    const handleFollowToggle = async (followingUserId: number, isCurrentlyFollowing: boolean) => {
        if (!currentUserId) {
            Alert.alert('Login Required', 'You must be logged in to follow users.');
            return;
        }

        if (currentUserId === followingUserId) return;

        try {
            // Optimistic update
            setFollowing(prev => 
                prev.map(user => 
                    user.user_id === followingUserId 
                        ? { ...user, currentUserFollowsThis: !isCurrentlyFollowing }
                        : user
                )
            );

            if (isCurrentlyFollowing) {
                const { error } = await supabase
                    .from('user_follows')
                    .delete()
                    .eq('follower_id', currentUserId)
                    .eq('following_id', followingUserId);
                
                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from('user_follows')
                    .insert({ follower_id: currentUserId, following_id: followingUserId });

                if (error) throw error;
            }
        } catch (error: any) {
            console.error('Error toggling follow:', error);
            Alert.alert('Error', 'Failed to update follow status');
            
            // Revert on error
            setFollowing(prev => 
                prev.map(user => 
                    user.user_id === followingUserId 
                        ? { ...user, currentUserFollowsThis: isCurrentlyFollowing }
                        : user
                )
            );
        }
    };

    const handleUnfollow = async (followingUserId: number) => {
        if (!currentUserId || !isOwnProfile) return;

        Alert.alert(
            'Unfollow',
            'Are you sure you want to unfollow this user?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Unfollow',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            // Optimistically remove from list
                            setFollowing(prev => prev.filter(user => user.user_id !== followingUserId));
                            setFollowingCount(prev => prev - 1);

                            const { error } = await supabase
                                .from('user_follows')
                                .delete()
                                .eq('follower_id', currentUserId)
                                .eq('following_id', followingUserId);
                            
                            if (error) throw error;
                        } catch (error: any) {
                            console.error('Error unfollowing:', error);
                            Alert.alert('Error', 'Failed to unfollow user');
                            loadFollowing();
                        }
                    }
                }
            ]
        );
    };

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        loadFollowing(true);
    }, []);

    // Navigate to user's profile - takes you to their profile page
    const navigateToProfile = (userId: number) => {
        if (userId === currentUserId) {
            router.push('/profile');
        } else {
            router.push(`/someonesProfile?userId=${userId}`);
        }
    };

    const getInitials = (username: string) => {
        return username?.charAt(0).toUpperCase() || 'U';
    };

    const renderFollowing = ({ item }: { item: Following }) => {
        const isCurrentUser = item.user_id === currentUserId;
        const showUnfollowButton = isOwnProfile && !isCurrentUser;
        const showFollowButton = !isOwnProfile && !isCurrentUser;

        return (
            <TouchableOpacity 
                style={styles.followingItem}
                onPress={() => navigateToProfile(item.user_id)}
                activeOpacity={0.7}
            >
                <View style={styles.followingLeft}>
                    {item.profile_image_url ? (
                        <Image 
                            source={{ uri: item.profile_image_url }} 
                            style={styles.avatar}
                        />
                    ) : (
                        <View style={styles.avatar}>
                            <Text style={styles.avatarText}>{getInitials(item.username)}</Text>
                        </View>
                    )}
                    <View style={styles.followingInfo}>
                        <Text style={styles.username}>{item.username}</Text>
                        {item.isFollowingProfileOwnerBack && (
                            <Text style={styles.mutualText}>Friends with profile owner</Text>
                        )}
                        {item.bio && (
                            <Text style={styles.bio} numberOfLines={2}>
                                {item.bio}
                            </Text>
                        )}
                    </View>
                </View>

                {showUnfollowButton && (
                    <TouchableOpacity
                        style={[
                            styles.followButton,
                            item.isFollowingProfileOwnerBack && styles.friendsButton
                        ]}
                        onPress={(e) => {
                            e.stopPropagation();
                            handleUnfollow(item.user_id);
                        }}
                    >
                        <Text style={[
                            styles.followButtonText,
                            item.isFollowingProfileOwnerBack && styles.friendsButtonText
                        ]}>
                            {item.isFollowingProfileOwnerBack ? 'Friends' : 'Following'}
                        </Text>
                    </TouchableOpacity>
                )}

                {showFollowButton && (
                    <TouchableOpacity
                        style={[
                            styles.followButton,
                            item.currentUserFollowsThis && styles.followingButton
                        ]}
                        onPress={(e) => {
                            e.stopPropagation();
                            handleFollowToggle(item.user_id, item.currentUserFollowsThis);
                        }}
                    >
                        <Text style={[
                            styles.followButtonText,
                            item.currentUserFollowsThis && styles.followingButtonText
                        ]}>
                            {item.currentUserFollowsThis ? 'Following' : '+ Follow'}
                        </Text>
                    </TouchableOpacity>
                )}
            </TouchableOpacity>
        );
    };

    if (loading) {
        return (
            <SafeAreaView style={styles.container}>
                <StatusBar barStyle="dark-content" />
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()}>
                        <Ionicons name="arrow-back" size={24} color="#000" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Following</Text>
                    <View style={{ width: 24 }} />
                </View>
                <View style={styles.centerContent}>
                    <ActivityIndicator size="large" color="#16A085" />
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" />
            
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={24} color="#000" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{followingCount} Following</Text>
                <View style={{ width: 24 }} />
            </View>

            <FlatList
                data={following}
                renderItem={renderFollowing}
                keyExtractor={(item) => item.user_id.toString()}
                contentContainerStyle={styles.listContent}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        tintColor="#16A085"
                        colors={["#16A085"]}
                    />
                }
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Ionicons name="people-outline" size={64} color="#ccc" />
                        <Text style={styles.emptyText}>Not following anyone yet</Text>
                    </View>
                }
            />
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F5F5F5',
    },
    centerContent: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 14,
        backgroundColor: '#fff',
        borderBottomWidth: 0.5,
        borderBottomColor: '#e5e5e5',
        marginTop: 35,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#000',
    },
    listContent: {
        paddingTop: 8,
        flexGrow: 1,
    },
    followingItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 12,
        paddingHorizontal: 16,
        backgroundColor: '#fff',
        marginBottom: 1,
    },
    followingLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        marginRight: 12,
    },
    avatar: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: '#B695C0',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    avatarText: {
        fontSize: 20,
        fontWeight: '600',
        color: '#fff',
    },
    followingInfo: {
        flex: 1,
    },
    username: {
        fontSize: 15,
        fontWeight: '600',
        color: '#000',
        marginBottom: 2,
    },
    mutualText: {
        fontSize: 12,
        color: '#16A085',
        fontWeight: '600',
        marginBottom: 2,
    },
    bio: {
        fontSize: 13,
        color: '#666',
        lineHeight: 18,
    },
    followButton: {
        backgroundColor: '#C8E853',
        paddingHorizontal: 20,
        paddingVertical: 8,
        borderRadius: 20,
        minWidth: 100,
        alignItems: 'center',
    },
    followingButton: {
        backgroundColor: '#fff',
        borderWidth: 1.5,
        borderColor: '#16A085',
    },
    friendsButton: {
        backgroundColor: '#fff',
        borderWidth: 1.5,
        borderColor: '#C8E853',
    },
    followButtonText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#000',
    },
    followingButtonText: {
        color: '#16A085',
    },
    friendsButtonText: {
        color: '#000',
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingTop: 100,
    },
    emptyText: {
        fontSize: 16,
        color: '#999',
        marginTop: 16,
    },
});

export default FollowingListScreen;