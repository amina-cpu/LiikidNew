import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    Image,
    Modal,
    RefreshControl,
    SafeAreaView,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View,
} from 'react-native';
import { supabase } from '../../lib/Supabase'; // Ensure this path is correct

const CARD_WIDTH = Dimensions.get("window").width / 2 - 12;

// --- Interface Declarations ---
interface UserProfile {
    user_id: number;
    username: string;
    bio: string | null;
    profile_image_url: string | null;
    location: string | null;
    created_at?: string;
}

interface Product {
    id: number;
    name: string;
    price: number;
    listing_type: "sell" | "rent" | "exchange";
    image_url: string | null;
    latitude: number | null;
    longitude: number | null;
    location_address: string | null;
    created_at: string;
    category_id: number;
}

interface Category {
    id: number;
    name: string;
    description: string | null;
    delivery: boolean;
}

// --- ProductCard Component (Unchanged) ---
const ProductCard: React.FC<{
    product: Product;
    categories: Category[];
}> = ({ product, categories }) => {
    const router = useRouter();
    const category = categories.find((c) => c.id === product.category_id);
    const categoryAcceptsDelivery = category?.delivery || false;

    const getTagColor = () => {
        switch (product.listing_type) {
            case "rent":
                return { bg: "#FFEDD5", text: "#C2410C" };
            case "exchange":
                return { bg: "#F3E8FF", text: "#7E22CE" };
            default:
                return { bg: "#DBEAFE", text: "#1D4ED8" };
        }
    };

    const getPriceLabel = (price: number, type: "sell" | "rent" | "exchange") => {
        if (type === "exchange") return "Exchange";
        const suffix = type === "rent" ? "/mo" : "";
        if (price >= 10000) {
            const millions = price / 10000;
            let formattedMillions;
            if (millions % 1 === 0) {
                formattedMillions = millions.toString();
            } else if (millions >= 10) {
                formattedMillions = Math.round(millions).toString();
            } else {
                formattedMillions = millions.toFixed(1);
            }
            return `${formattedMillions} million DA${suffix}`;
        }
        return `${price.toLocaleString()} DA${suffix}`;
    };

    const tagColors = getTagColor();

    return (
        <View style={styles.cardContainer}>
            <TouchableOpacity
                onPress={() => router.push(`/product_detail?id=${product.id}`)}
                style={styles.cardTouchable}
            >
                <View style={styles.imageWrapper}>
                    <Image
                        source={{
                            uri: product.image_url || "https://placehold.co/180x180/E0E0E0/333333?text=No+Image",
                        }}
                        style={styles.cardImage}
                    />
                    {categoryAcceptsDelivery && (
                        <View style={styles.deliveryBadgeNew}>
                            <MaterialCommunityIcons
                                name="truck-delivery-outline"
                                size={16}
                                color="#008E74"
                            />
                        </View>
                    )}
                    <TouchableOpacity style={styles.threeDotsMenu}>
                        <Ionicons name="ellipsis-vertical" size={20} color="#fff" />
                    </TouchableOpacity>
                </View>
                <View style={styles.cardDetails}>
                    <View style={[styles.priceTag, { backgroundColor: tagColors.bg }]}>
                        <Text style={[styles.priceText, { color: tagColors.text }]}>
                            {getPriceLabel(product.price, product.listing_type)}
                        </Text>
                    </View>
                    <Text style={styles.cardTitle} numberOfLines={2}>
                        {product.name}
                    </Text>
                </View>
            </TouchableOpacity>
        </View>
    );
};

// --- ActionSheetModal Component (Unchanged) ---
const ActionSheetModal: React.FC<{
    isVisible: boolean;
    onClose: () => void;
    onBlock: () => void;
    onReport: () => void;
}> = ({ isVisible, onClose, onBlock, onReport }) => {
    if (!isVisible) return null;

    return (
        <Modal
            animationType="fade"
            transparent={true}
            visible={isVisible}
            onRequestClose={onClose}
        >
            <TouchableWithoutFeedback onPress={onClose}>
                <View style={modalStyles.modalOverlay}>
                    <TouchableWithoutFeedback>
                        <View style={modalStyles.actionSheetContainer}>
                            <View style={modalStyles.actionButtonsWrapper}>
                                <TouchableOpacity style={modalStyles.actionButton} onPress={onBlock}>
                                    <MaterialCommunityIcons name="block-helper" size={20} color="#FF3B30" />
                                    <Text style={[modalStyles.actionText, modalStyles.blockText]}>Block</Text>
                                </TouchableOpacity>
                                <View style={modalStyles.separator} />
                                <TouchableOpacity style={modalStyles.actionButton} onPress={onReport}>
                                    <MaterialCommunityIcons name="flag" size={20} color="#FF3B30" />
                                    <Text style={[modalStyles.actionText, modalStyles.reportText]}>Report</Text>
                                </TouchableOpacity>
                            </View>
                            <TouchableOpacity style={modalStyles.cancelButton} onPress={onClose}>
                                <Text style={modalStyles.cancelText}>Cancel</Text>
                            </TouchableOpacity>
                        </View>
                    </TouchableWithoutFeedback>
                </View>
            </TouchableWithoutFeedback>
        </Modal>
    );
};

// --- Someone's Profile Screen ---
const SomeonesProfileScreen = () => {
    const { userId } = useLocalSearchParams();
    const targetUserId = typeof userId === 'string' ? parseInt(userId) : null;
    
    const router = useRouter();
    const [profileData, setProfileData] = useState<UserProfile | null>(null);
    const [currentUserId, setCurrentUserId] = useState<number | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    
    const [isFollowing, setIsFollowing] = useState(false);
    const [isMutualFollow, setIsMutualFollow] = useState(false);
    const [followingCount, setFollowingCount] = useState(0);
    const [followersCount, setFollowersCount] = useState(0);

    // ⭐ NEW STATE: Block status
    const [isBlocking, setIsBlocking] = useState(false); // True if current user is blocking targetUserId

    const [products, setProducts] = useState<Product[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [loadingProducts, setLoadingProducts] = useState(false);

    const [showActionSheet, setShowActionSheet] = useState(false);

    // --- Core Functions ---

    // ⭐ NEW FUNCTION: Database cleanup on block
    const removeFollowsOnBlock = async (blockerId: number, blockedId: number) => {
        console.log(`Removing follow relationships between ${blockerId} and ${blockedId}`);

        try {
            // 1. Remove the current user's 'Following' relationship (blocker unfollows blocked)
            await supabase
                .from('user_follows')
                .delete()
                .eq('follower_id', blockerId)
                .eq('following_id', blockedId);

            // 2. Remove the blocked user's 'Follower' relationship (blocked unfollows blocker)
            await supabase
                .from('user_follows')
                .delete()
                .eq('follower_id', blockedId)
                .eq('following_id', blockerId);

            console.log('Follow relationships successfully removed.');

        } catch (error) {
            console.error('Error during follow removal on block:', error);
            // Non-critical, just log the error
        }
    };

    // Fetches products (Only called if NOT blocked)
    const fetchUserProducts = useCallback(async (userId: number) => {
        try {
            setLoadingProducts(true);
            const { data, error } = await supabase
                .from('products')
                .select('id, name, price, listing_type, image_url, latitude, longitude, location_address, created_at, category_id')
                .eq('user_id', userId)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setProducts(data || []);
        } catch (error: any) {
            console.error('Error fetching user products:', error);
        } finally {
            setLoadingProducts(false);
        }
    }, []);

    // ⭐ MODIFIED: Check block status, then proceed with other data fetching
    const loadProfileData = useCallback(async (isRefreshing = false) => {
        if (!targetUserId) return;

        try {
            if (!isRefreshing) {
                setLoading(true);
            }

            // Get current user ID from storage
            const userJson = await AsyncStorage.getItem('user');
            const loggedInUserId = userJson ? JSON.parse(userJson).user_id : null;
            setCurrentUserId(loggedInUserId);
            
            if (!loggedInUserId) {
                 // User isn't logged in, continue to load public data (but skip follow checks)
            }

            // 1. Fetch target user's profile
            const { data: profile, error: profileError } = await supabase
                .from('users')
                .select('user_id, username, bio, profile_image_url, location, created_at')
                .eq('user_id', targetUserId)
                .single();

            if (profileError) throw profileError;
            setProfileData(profile);

            // 2. Check BLOCK STATUS
            if (loggedInUserId) {
                const { data: blockStatus } = await supabase
                    .from('block')
                    .select('blocker_id')
                    .eq('blocker_id', loggedInUserId)
                    .eq('blocked_id', targetUserId)
                    .maybeSingle();
                
                const isUserBlocking = !!blockStatus;
                setIsBlocking(isUserBlocking);

                // If blocked, stop further data loading (products, follows)
                if (isUserBlocking) {
                    setProducts([]); // Clear any old products immediately
                    setIsFollowing(false);
                    setIsMutualFollow(false);
                    setFollowingCount(0);
                    setFollowersCount(0);
                    setLoading(false);
                    if (isRefreshing) setRefreshing(false);
                    return; // EXIT EARLY IF BLOCKED
                }
            }


            // If NOT blocked (or not logged in), continue loading follow/product data:

            // 3. Fetch categories
            const { data: categoriesData, error: categoriesError } = await supabase
                .from('categories')
                .select('id, name, description, delivery');

            if (categoriesError) throw categoriesError;
            setCategories(categoriesData || []);

            // 4. Fetch target user's follower/following counts
            const { count: targetFollowingCount } = await supabase
                .from('user_follows')
                .select('*', { count: 'exact', head: true })
                .eq('follower_id', targetUserId);

            const { count: targetFollowersCount } = await supabase
                .from('user_follows')
                .select('*', { count: 'exact', head: true })
                .eq('following_id', targetUserId);
            
            setFollowingCount(targetFollowingCount || 0);
            setFollowersCount(targetFollowersCount || 0);

            // 5. Check follow relationship with current user
            if (loggedInUserId) {
                // Does current user follow target user?
                const { data: followStatus } = await supabase
                    .from('user_follows')
                    .select('follow_id')
                    .eq('follower_id', loggedInUserId)
                    .eq('following_id', targetUserId)
                    .maybeSingle();
                
                const userFollowsTarget = !!followStatus;
                setIsFollowing(userFollowsTarget);

                // Does target user follow current user back?
                const { data: followBackStatus } = await supabase
                    .from('user_follows')
                    .select('follow_id')
                    .eq('follower_id', targetUserId)
                    .eq('following_id', loggedInUserId)
                    .maybeSingle();
                
                const targetFollowsUser = !!followBackStatus;
                setIsMutualFollow(userFollowsTarget && targetFollowsUser);
            } else {
                 // Not logged in, so all follow states are false/zero
                 setIsFollowing(false);
                 setIsMutualFollow(false);
            }

            // 6. Fetch user's products
            await fetchUserProducts(targetUserId);

        } catch (error: any) {
            console.error('Error loading profile data:', error);
            Alert.alert('Error', error.message || 'Failed to load user profile.');
        } finally {
            setLoading(false);
            if (isRefreshing) {
                setRefreshing(false);
            }
        }
    }, [targetUserId, fetchUserProducts]);

    // Handle Follow/Unfollow
    const handleFollowToggle = useCallback(async () => {
        // (Implementation remains the same as before, only callable if isBlocking is false)
        if (!currentUserId) {
            Alert.alert('Login Required', 'You must be logged in to follow users.');
            return;
        }
        if (currentUserId === targetUserId) return;

        let wasFollowing = isFollowing;

        try {
            // Optimistic update
            setIsFollowing(prev => !prev);
            setFollowersCount(prev => wasFollowing ? Math.max(0, prev - 1) : prev + 1);

            if (wasFollowing) {
                // Unfollow - delete the follow relationship
                await supabase
                    .from('user_follows')
                    .delete()
                    .eq('follower_id', currentUserId)
                    .eq('following_id', targetUserId);
                
                setIsMutualFollow(false);
            } else {
                // Follow - insert the follow relationship
                await supabase
                    .from('user_follows')
                    .upsert(
                        { follower_id: currentUserId, following_id: targetUserId },
                        { onConflict: 'follower_id,following_id', ignoreDuplicates: false }
                    );

                // Re-check for mutual follow
                const { data: followBackStatus } = await supabase
                    .from('user_follows')
                    .select('follow_id')
                    .eq('follower_id', targetUserId)
                    .eq('following_id', currentUserId)
                    .maybeSingle();
                
                setIsMutualFollow(!!followBackStatus);
            }
        } catch (error: any) {
            console.error('Error toggling follow:', error);
            Alert.alert('Error', 'Failed to update follow status.');
            // Revert state if necessary (or simply call loadProfileData to sync)
            loadProfileData(true);
        }
    }, [currentUserId, targetUserId, isFollowing, loadProfileData]);


    // ⭐ MODIFIED: Handle Block User
    const handleBlockUser = async () => {
        setShowActionSheet(false);

        if (!currentUserId || !targetUserId) {
            Alert.alert("Error", "You must be logged in to block a user.");
            return;
        }

        Alert.alert(
            'Block User',
            `Are you sure you want to block ${profileData?.username}? This will also remove all follow relationships.`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Block',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            // 1. Remove all follow relationships first
                            await removeFollowsOnBlock(currentUserId, targetUserId);

                            // 2. Insert the block relationship into the 'block' table
                            const { error } = await supabase.from('block').insert({
                                blocker_id: currentUserId,
                                blocked_id: targetUserId,
                            });

                            if (error && error.code !== '23505') { // Ignore unique constraint error
                                throw error;
                            }

                            // 3. Update local UI to reflect blocked state
                            setIsBlocking(true);
                            setProducts([]); 
                            setFollowingCount(0); 
                            setFollowersCount(0);
                            setIsFollowing(false);
                            setIsMutualFollow(false);
                            
                            Alert.alert('Blocked!', `${profileData?.username} has been blocked.`);

                        } catch (error: any) {
                            console.error('Error blocking user:', error.message);
                            Alert.alert('Error', 'Failed to block user. Please try again.');
                        }
                    }
                },
            ]
        );
    };

    // ⭐ NEW FUNCTION: Handle Unblock User
    const handleUnblockUser = async () => {
        if (!currentUserId || !targetUserId) {
            Alert.alert("Error", "Cannot unblock user without IDs.");
            return;
        }

        Alert.alert(
            'Unblock User',
            `Are you sure you want to unblock ${profileData?.username}?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Unblock',
                    onPress: async () => {
                        try {
                            // 1. Delete the block relationship
                            const { error } = await supabase
                                .from('block')
                                .delete()
                                .eq('blocker_id', currentUserId)
                                .eq('blocked_id', targetUserId);

                            if (error) throw error;

                            // 2. Update local UI and refresh data
                            setIsBlocking(false);
                            Alert.alert('Unblocked!', `${profileData?.username} has been unblocked.`);
                            // Re-fetch all data to show products, follower counts, etc.
                            loadProfileData(true);

                        } catch (error: any) {
                            console.error('Error unblocking user:', error.message);
                            Alert.alert('Error', 'Failed to unblock user. Please try again.');
                        }
                    }
                },
            ]
        );
    };

    const handleReportUser = () => {
        setShowActionSheet(false);
        Alert.alert('Report User', `You are reporting ${profileData?.username} for inappropriate content or behavior.`);
    };

    // --- Effects & Helpers ---
    useEffect(() => {
        const fetchAndCheckUser = async () => {
            if (!targetUserId) {
                setLoading(false);
                Alert.alert("Error", "Invalid user ID provided.");
                return;
            }

            try {
                const userJson = await AsyncStorage.getItem('user');
                if (userJson) {
                    const user = JSON.parse(userJson);
                    const loggedInUserId = user.user_id;
                    setCurrentUserId(loggedInUserId);

                    if (loggedInUserId === targetUserId) {
                        router.replace('/profile'); 
                        return;
                    }
                }
            } catch (error) {
                console.error('Error fetching current user ID:', error);
            }

            loadProfileData();
        };

        fetchAndCheckUser();
    }, [targetUserId]);
    
    const onRefresh = useCallback(() => {
        setRefreshing(true);
        loadProfileData(true);
    }, [loadProfileData]);
    
    const getInitials = () => {
        return profileData?.username?.charAt(0).toUpperCase() || 'U';
    };

    const CustomEmptyIcon = () => (
        <View style={styles.customIconContainer}>
            <Ionicons name="copy-outline" size={55} color="#888" style={styles.iconMain} />
        </View>
    );

    // --- Render Logic ---
    if (loading) {
        return (
            <View style={[styles.container, styles.centerContent]}>
                <ActivityIndicator size="large" color="#16A085" />
            </View>
        );
    }

    if (!profileData) {
        return (
            <View style={[styles.container, styles.centerContent]}>
                <Text style={styles.errorText}>Profile not found.</Text>
            </View>
        );
    }

    const getFollowButtonText = () => {
        if (isMutualFollow) return 'Friends';
        if (isFollowing) return 'Unfollow';
        return 'Follow';
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" />
            
            <View style={styles.header}>
                <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={24} color="#000" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{profileData.username}'s Profile</Text>
                <View style={styles.headerRight}>
                    {/* Share Button is always available */}
                    <TouchableOpacity style={styles.headerButton}>
                        <Ionicons name="share-outline" size={24} color="#000" />
                    </TouchableOpacity>
                    {/* Action Sheet (Report/Block) is always available if not blocked */}
                    {!isBlocking && (
                         <TouchableOpacity 
                            style={styles.headerButton}
                            onPress={() => setShowActionSheet(true)}
                        >
                            <Ionicons name="ellipsis-vertical" size={24} color="#000" />
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            <ScrollView 
                style={styles.scrollContent} 
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        tintColor="#16A085"
                        colors={["#16A085", "#C8E853"]}
                        progressBackgroundColor="#fff"
                    />
                }
            >
                <View style={styles.profileCardContainer}>
                    <View style={styles.profileCard}>
                        <View style={styles.avatarWrapper}>
                            {profileData.profile_image_url ? (
                                <Image source={{ uri: profileData.profile_image_url }} style={styles.avatarCircle} />
                            ) : (
                                <View style={styles.avatarCircle}>
                                    <Text style={styles.avatarInitial}>{getInitials()}</Text>
                                </View>
                            )}
                        </View>

                        <Text style={styles.displayName}>{profileData.username}</Text>

                        {/* ⭐ MODIFIED: Hide stats if blocked */}
                        {!isBlocking ? (
                            <View style={styles.statsRow}>
                                <View style={styles.statBox}>
                                    <Text style={styles.statValue}>{products.length}</Text>
                                    <Text style={styles.statName}>Posts</Text>
                                </View>
                                
                                <TouchableOpacity 
                                    style={styles.statBox}
                                    onPress={() => router.push(`/following_list?userId=${targetUserId}`)}
                                >
                                    <Text style={styles.statValue}>{followingCount}</Text>
                                    <Text style={styles.statName}>Following</Text>
                                </TouchableOpacity>
                                
                                <TouchableOpacity 
                                    style={styles.statBox}
                                    onPress={() => router.push(`/followers_list?userId=${targetUserId}`)}
                                >
                                    <Text style={styles.statValue}>{followersCount}</Text>
                                    <Text style={styles.statName}>Followers</Text>
                                </TouchableOpacity>
                            </View>
                        ) : (
                            <View style={styles.blockedMessage}>
                                <Ionicons name="eye-off-outline" size={24} color="#FF5B5B" />
                                <Text style={styles.blockedText}>You have blocked this user.</Text>
                            </View>
                        )}
                        
                        {/* ⭐ MODIFIED: Show Unblock button OR Follow/Chat buttons */}
                        <View style={styles.actionButtonsRow}>
                            {isBlocking ? (
                                <TouchableOpacity 
                                    style={styles.unblockButton} 
                                    onPress={handleUnblockUser}
                                >
                                    <Text style={styles.unblockButtonText}>Unblock</Text>
                                </TouchableOpacity>
                            ) : (
                                <>
                                    <TouchableOpacity 
                                        style={[
                                            styles.followButton,
                                            isFollowing && !isMutualFollow && styles.unfollowButton,
                                            isMutualFollow && styles.friendsButton
                                        ]}
                                        onPress={handleFollowToggle}
                                    >
                                        <Text style={[
                                            styles.followButtonText,
                                            isFollowing && !isMutualFollow && styles.unfollowButtonText,
                                            isMutualFollow && styles.friendsButtonText
                                        ]}>
                                            {getFollowButtonText()}
                                        </Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity 
                                        style={styles.chatButton} 
                                        onPress={() => Alert.alert("Chat", `Starting chat with ${profileData.username}`)}
                                    >
                                        <Text style={styles.chatButtonText}>Chat</Text>
                                    </TouchableOpacity>
                                </>
                            )}
                        </View>

                    </View>
                </View>
                
                {/* ⭐ MODIFIED: Show bio only if NOT blocked */}
                {profileData.bio && !isBlocking && (
                    <View style={styles.bioSection}>
                        <Text style={styles.bioText}>{profileData.bio}</Text>
                    </View>
                )}

                <View style={styles.tabBarSingle}>
                    <View style={styles.activeTabSingle}>
                        <Text style={styles.tabTextActive}>
                            {isBlocking ? 'Posted Items (0)' : `Posted Items (${products.length})`}
                        </Text>
                    </View>
                </View>

                <View style={styles.productsBackground}>
                    {isBlocking ? (
                         <View style={styles.emptyContainer}>
                            <Ionicons name="lock-closed-outline" size={60} color="#FF5B5B" />
                            <Text style={styles.emptyTextCustom}>
                                You cannot view this user's content while they are blocked.
                            </Text>
                        </View>
                    ) : loadingProducts ? (
                        <View style={styles.loadingContainer}>
                            <ActivityIndicator size="large" color="#16A085" />
                        </View>
                    ) : products.length === 0 ? (
                        <View style={styles.emptyContainer}>
                            <CustomEmptyIcon />
                            <Text style={styles.emptyTextCustom}>
                                This user hasn't posted any items yet.
                            </Text>
                        </View>
                    ) : (
                        <View style={styles.productGrid}>
                            {products.map((product) => (
                                <ProductCard
                                    key={product.id}
                                    product={product}
                                    categories={categories}
                                />
                            ))}
                        </View>
                    )}
                </View>

                <View style={{ height: 30 }} />
            </ScrollView>

            <ActionSheetModal 
                isVisible={showActionSheet}
                onClose={() => setShowActionSheet(false)}
                onBlock={handleBlockUser}
                onReport={handleReportUser}
            />
        </SafeAreaView>
    );
};

// --- Action Sheet Styles (Unchanged) ---
const modalStyles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
        justifyContent: 'flex-end',
    },
    actionSheetContainer: {
        backgroundColor: 'transparent',
        paddingHorizontal: 8,
        paddingBottom: 35,
    },
    actionButtonsWrapper: {
        backgroundColor: 'white',
        borderRadius: 14,
        overflow: 'hidden',
        marginBottom: 8,
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        gap: 8,
    },
    separator: {
        height: 1,
        backgroundColor: '#E5E5E5',
        marginHorizontal: 16,
    },
    actionText: {
        fontSize: 18,
        fontWeight: '600',
    },
    blockText: {
        color: '#FF3B30',
    },
    reportText: {
        color: '#FF3B30',
    },
    cancelButton: {
        backgroundColor: 'white',
        borderRadius: 14,
        paddingVertical: 18,
        alignItems: 'center',
    },
    cancelText: {
        fontSize: 18,
        fontWeight: '700',
        color: '#007AFF',
    },
});

// --- Styles (Added Blocked-specific styles) ---
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
    errorText: {
        fontSize: 16,
        color: '#666',
        marginBottom: 20,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 35,
        paddingHorizontal: 16,
        paddingVertical: 14,
        backgroundColor: '#fff',
        borderBottomWidth: 0.5,
        borderBottomColor: '#e5e5e5',
    },
    backButton: {
        paddingRight: 10,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#000',
        flex: 1,
        textAlign: 'center',
        marginLeft: -24,
    },
    headerRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    headerButton: {
        padding: 2,
    },
    scrollContent: {
        flex: 1,
    },
    profileCardContainer: {
        position: 'relative',
        marginHorizontal: 14,
        marginTop: 16,
        marginBottom: 16,
    },
    profileCard: {
        backgroundColor: '#fff',
        borderRadius: 16,
        paddingVertical: 24,
        paddingHorizontal: 20,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    avatarWrapper: {
        marginBottom: 12,
    },
    avatarCircle: {
        width: 85,
        height: 85,
        borderRadius: 42.5,
        backgroundColor: '#B695C0',
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarInitial: {
        fontSize: 38,
        fontWeight: '600',
        color: '#fff',
    },
    displayName: {
        fontSize: 18,
        fontWeight: '600',
        color: '#000',
        marginBottom: 16,
    },
    statsRow: {
        flexDirection: 'row',
        gap: 40,
        marginBottom: 20,
    },
    statBox: {
        alignItems: 'center',
    },
    statValue: {
        fontSize: 20,
        fontWeight: '700',
        color: '#000',
        marginBottom: 2,
    },
    statName: {
        fontSize: 13,
        color: '#666',
    },
    // ⭐ NEW STYLE: Block message area
    blockedMessage: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFEEEE',
        borderRadius: 10,
        paddingHorizontal: 15,
        paddingVertical: 8,
        marginBottom: 20,
        gap: 8,
    },
    // ⭐ NEW STYLE: Blocked text
    blockedText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#FF5B5B',
    },
    actionButtonsRow: {
        flexDirection: 'row',
        marginTop: 10,
        gap: 12,
    },
    followButton: {
        backgroundColor: '#16A085',
        paddingHorizontal: 25,
        paddingVertical: 10,
        borderRadius: 25,
        minWidth: 120,
        alignItems: 'center',
    },
    followButtonText: {
        color: '#fff',
        fontWeight: '700',
        fontSize: 15,
    },
    unfollowButton: {
        backgroundColor: '#fff',
        borderWidth: 2,
        borderColor: '#16A085',
    },
    unfollowButtonText: {
        color: '#16A085',
    },
    friendsButton: {
        backgroundColor: '#fff',
        borderWidth: 2,
        borderColor: '#C8E853',
    },
    friendsButtonText: {
        color: '#000',
    },
    chatButton: {
        backgroundColor: '#fff',
        paddingHorizontal: 25,
        paddingVertical: 10,
        borderRadius: 25,
        minWidth: 120,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#ccc',
    },
    chatButtonText: {
        color: '#000',
        fontWeight: '600',
        fontSize: 15,
    },
    // ⭐ NEW STYLE: Unblock button
    unblockButton: {
        backgroundColor: '#FF5B5B',
        paddingHorizontal: 25,
        paddingVertical: 10,
        borderRadius: 25,
        minWidth: 200, // Make it span the width
        alignItems: 'center',
    },
    // ⭐ NEW STYLE: Unblock button text
    unblockButtonText: {
        color: '#fff',
        fontWeight: '700',
        fontSize: 15,
    },
    bioSection: {
        paddingHorizontal: 18,
        marginBottom: 16,
    },
    bioText: {
        fontSize: 14,
        lineHeight: 20,
        color: '#262626',
        textAlign: 'center',
    },
    tabBarSingle: {
        marginHorizontal: 14,
        marginBottom: 10,
        backgroundColor: '#F7F7F7',
        borderRadius: 12,
        padding: 4,
    },
    activeTabSingle: {
        alignItems: 'center',
        paddingVertical: 10,
        borderRadius: 10,
        backgroundColor: '#FFFFFF',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 3,
        elevation: 2,
    },
    tabTextActive: {
        fontSize: 14,
        fontWeight: '600',
        color: '#000',
    },
    productsBackground: {
        flex: 1,
        paddingHorizontal: 10,
    },
    productGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        paddingHorizontal: 0,
    },
    cardContainer: {
        width: CARD_WIDTH,
        marginBottom: 16,
        borderRadius: 12,
        backgroundColor: '#fff',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
        elevation: 2,
    },
    cardTouchable: {
        borderRadius: 12,
        overflow: 'hidden',
    },
    imageWrapper: {
        position: 'relative',
    },
    cardImage: {
        width: '100%',
        height: CARD_WIDTH,
        backgroundColor: '#E0E0E0',
    },
    deliveryBadgeNew: {
        position: 'absolute',
        bottom: 8,
        left: 8,
        backgroundColor: '#D1FAE5',
        borderRadius: 10,
        paddingHorizontal: 6,
        paddingVertical: 4,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 2,
    },
    threeDotsMenu: {
        position: 'absolute',
        top: 8,
        right: 8,
        backgroundColor: 'rgba(0,0,0,0.4)',
        borderRadius: 15,
        width: 30,
        height: 30,
        alignItems: 'center',
        justifyContent: 'center',
    },
    cardDetails: {
        padding: 8,
    },
    priceTag: {
        alignSelf: 'flex-start',
        borderRadius: 6,
        paddingHorizontal: 8,
        paddingVertical: 4,
        marginBottom: 4,
    },
    priceText: {
        fontSize: 12,
        fontWeight: '600',
    },
    cardTitle: {
        fontSize: 14,
        fontWeight: '500',
        color: '#333',
        height: 40,
        lineHeight: 20,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 50,
    },
    emptyContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 80,
        paddingHorizontal: 20,
    },
    customIconContainer: {
        position: 'relative',
        marginBottom: 20,
    },
    iconMain: {
        opacity: 0.7,
    },
    emptyTextCustom: {
        fontSize: 16,
        color: '#888',
        textAlign: 'center',
        marginTop: 10,
        lineHeight: 24,
    },
});

export default SomeonesProfileScreen;