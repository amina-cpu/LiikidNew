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

interface Follower {
    user_id: number;
    username: string;
    bio: string | null;
    profile_image_url: string | null;
    currentUserFollowsThis: boolean; // Does the logged-in user follow this person?
    isFollowingProfileOwnerBack: boolean; // Does this follower follow the profile owner back?
}

const FollowersListScreen = () => {
    const { userId } = useLocalSearchParams();
    const profileOwnerId = typeof userId === 'string' ? parseInt(userId) : null;
    
    const router = useRouter();
    const [currentUserId, setCurrentUserId] = useState<number | null>(null);
    const [followers, setFollowers] = useState<Follower[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [followersCount, setFollowersCount] = useState(0);

    useEffect(() => {
        loadCurrentUser();
    }, []);

    const loadCurrentUser = async () => {
        try {
            const userJson = await AsyncStorage.getItem('user');
            if (userJson) {
                const user = JSON.parse(userJson);
                setCurrentUserId(user.user_id);
            }
        } catch (error) {
            console.error('Error loading current user:', error);
        } finally {
            loadFollowers();
        }
    };

    const loadFollowers = async (isRefreshing = false) => {
        if (!profileOwnerId) return;

        try {
            if (!isRefreshing) {
                setLoading(true);
            }

            // Get who follows the PROFILE OWNER
            const { data: followData, error: followError } = await supabase
                .from('user_follows')
                .select('follower_id')
                .eq('following_id', profileOwnerId);

            if (followError) throw followError;

            if (!followData || followData.length === 0) {
                setFollowers([]);
                setFollowersCount(0);
                return;
            }

            const followerIds = followData.map(f => f.follower_id);
            setFollowersCount(followerIds.length);

            // Get follower user details
            const { data: usersData, error: usersError } = await supabase
                .from('users')
                .select('user_id, username, bio, profile_image_url')
                .in('user_id', followerIds);

            if (usersError) throw usersError;

            // Check which of these followers the CURRENT USER is following
            let currentUserFollowingIds: number[] = [];
            if (currentUserId) {
                const { data: currentUserFollowing, error: followingError } = await supabase
                    .from('user_follows')
                    .select('following_id')
                    .eq('follower_id', currentUserId);

                if (followingError) throw followingError;
                currentUserFollowingIds = currentUserFollowing?.map(f => f.following_id) || [];
            }

            // Check which followers the PROFILE OWNER follows back (mutual with profile owner)
            const { data: mutualData, error: mutualError } = await supabase
                .from('user_follows')
                .select('following_id')
                .eq('follower_id', profileOwnerId)
                .in('following_id', followerIds);

            if (mutualError) throw mutualError;
            
            const profileOwnerFollowingBackIds = mutualData?.map(f => f.following_id) || [];

            // Map followers with following status
            const followersWithStatus: Follower[] = usersData?.map(user => ({
                ...user,
                currentUserFollowsThis: currentUserFollowingIds.includes(user.user_id),
                isFollowingProfileOwnerBack: profileOwnerFollowingBackIds.includes(user.user_id)
            })) || [];

            setFollowers(followersWithStatus);
        } catch (error: any) {
            console.error('Error loading followers:', error);
            Alert.alert('Error', 'Failed to load followers');
        } finally {
            setLoading(false);
            if (isRefreshing) {
                setRefreshing(false);
            }
        }
    };

    const handleFollowToggle = async (followerUserId: number, isCurrentlyFollowing: boolean) => {
        if (!currentUserId) {
            Alert.alert('Login Required', 'You must be logged in to follow users.');
            return;
        }

        if (currentUserId === followerUserId) return;

        try {
            // Optimistic update
            setFollowers(prev => 
                prev.map(follower => 
                    follower.user_id === followerUserId 
                        ? { ...follower, currentUserFollowsThis: !isCurrentlyFollowing }
                        : follower
                )
            );

            if (isCurrentlyFollowing) {
                const { error } = await supabase
                    .from('user_follows')
                    .delete()
                    .eq('follower_id', currentUserId)
                    .eq('following_id', followerUserId);
                
                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from('user_follows')
                    .insert({ follower_id: currentUserId, following_id: followerUserId });

                if (error) throw error;
            }
        } catch (error: any) {
            console.error('Error toggling follow:', error);
            Alert.alert('Error', 'Failed to update follow status');
            
            // Revert on error
            setFollowers(prev => 
                prev.map(follower => 
                    follower.user_id === followerUserId 
                        ? { ...follower, currentUserFollowsThis: isCurrentlyFollowing }
                        : follower
                )
            );
        }
    };

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        loadFollowers(true);
    }, []);

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

    const renderFollower = ({ item }: { item: Follower }) => {
        const isCurrentUser = item.user_id === currentUserId;

        return (
            <TouchableOpacity 
                style={styles.followerItem}
                onPress={() => navigateToProfile(item.user_id)}
                activeOpacity={0.7}
            >
                <View style={styles.followerLeft}>
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
                    <View style={styles.followerInfo}>
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

                {!isCurrentUser && (
                    <TouchableOpacity
                        style={[
                            styles.followButton,
                            item.currentUserFollowsThis && styles.followingButton
                        ]}
                        onPress={() => handleFollowToggle(item.user_id, item.currentUserFollowsThis)}
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
                    <Text style={styles.headerTitle}>Followers</Text>
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
                <Text style={styles.headerTitle}>{followersCount} Followers</Text>
                <View style={{ width: 24 }} />
            </View>

            <FlatList
                data={followers}
                renderItem={renderFollower}
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
                        <Text style={styles.emptyText}>No followers yet</Text>
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
    followerItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 12,
        paddingHorizontal: 16,
        backgroundColor: '#fff',
        marginBottom: 1,
    },
    followerLeft: {
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
    followerInfo: {
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
    followButtonText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#000',
    },
    followingButtonText: {
        color: '#16A085',
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

export default FollowersListScreen;