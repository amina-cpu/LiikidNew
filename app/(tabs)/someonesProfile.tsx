import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    Image,
    RefreshControl,
    SafeAreaView,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { supabase } from '../../lib/Supabase'; // Ensure this path is correct

// --- Constants ---
const CARD_WIDTH = Dimensions.get("window").width / 2 - 12;

// --- Interfaces ---
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

// ---------------------------------------------------
// ProductCard Component
// ---------------------------------------------------
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

// ---------------------------------------------------
// SomeonesProfileScreen Component (Main Export)
// ---------------------------------------------------
const SomeonesProfileScreen = () => {
    const { userId } = useLocalSearchParams();
    const targetUserId = typeof userId === 'string' ? parseInt(userId) : null;
    
    const router = useRouter();
    const [profileData, setProfileData] = useState<UserProfile | null>(null);
    const [currentUserId, setCurrentUserId] = useState<number | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    
    const [isFollowing, setIsFollowing] = useState(false);
    const [followingCount, setFollowingCount] = useState(0);
    const [followersCount, setFollowersCount] = useState(0);

    const [products, setProducts] = useState<Product[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [loadingProducts, setLoadingProducts] = useState(false);

    // --- Data Fetching Functions ---

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

    const loadProfileData = useCallback(async (isRefreshing = false) => {
        if (!targetUserId) return; 

        try {
            if (!isRefreshing) {
                setLoading(true);
            }

            // 1. Fetch target user's profile data
            const { data: profile, error: profileError } = await supabase
                .from('users')
                .select('user_id, username, bio, profile_image_url, location, created_at')
                .eq('user_id', targetUserId)
                .single();

            if (profileError) throw profileError;
            setProfileData(profile);

            // 2. Fetch categories for product card
            const { data: categoriesData, error: categoriesError } = await supabase
                .from('categories')
                .select('id, name, description, delivery');

            if (categoriesError) throw categoriesError;
            setCategories(categoriesData || []);

            // 3. Fetch counts (Follower/Following)
            const [
                { count: targetFollowingCount },
                { count: targetFollowersCount }
            ] = await Promise.all([
                supabase.from('user_follows').select('*', { count: 'exact', head: true }).eq('follower_id', targetUserId),
                supabase.from('user_follows').select('*', { count: 'exact', head: true }).eq('following_id', targetUserId)
            ]);
            
            setFollowingCount(targetFollowingCount || 0);
            setFollowersCount(targetFollowersCount || 0);

            // 4. Fetch follow status (only if currentUserId is known)
            let isUserFollowing = false;
            if (currentUserId) {
                const { data: followStatus, error: followError } = await supabase
                    .from('user_follows')
                    .select('follow_id')
                    .eq('follower_id', currentUserId)
                    .eq('following_id', targetUserId)
                    .single();
                
                // PGRST116 is the code for "No rows found"
                if (followError && followError.code !== 'PGRST116') { 
                    throw followError;
                }
                isUserFollowing = !!followStatus;
            }
            setIsFollowing(isUserFollowing);

            // 5. Fetch user's posted products
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
    }, [targetUserId, currentUserId, fetchUserProducts]);

    // --- Follow Toggle Logic ---
    const handleFollowToggle = useCallback(async () => {
        if (!currentUserId) {
            Alert.alert('Login Required', 'You must be logged in to follow users.');
            return;
        }
        if (currentUserId === targetUserId) return; // Self-following check

        try {
            // Optimistic UI Update
            setIsFollowing(prev => !prev);
            setFollowersCount(prev => isFollowing ? Math.max(0, prev - 1) : prev + 1);

            if (isFollowing) {
                // UNFOLLOW action: Delete the relationship
                const { error } = await supabase
                    .from('user_follows')
                    .delete()
                    .eq('follower_id', currentUserId)
                    .eq('following_id', targetUserId);
                
                if (error) throw error;
            } else {
                // FOLLOW action: Insert the new relationship
                const { error } = await supabase
                    .from('user_follows')
                    .insert({ follower_id: currentUserId, following_id: targetUserId });

                if (error) throw error;
            }
        } catch (error: any) {
            console.error('Error toggling follow:', error);
            Alert.alert('Error', 'Failed to update follow status.');
            
            // Revert optimistic UI update on error
            setIsFollowing(prev => !prev);
            setFollowersCount(prev => isFollowing ? prev + 1 : Math.max(0, prev - 1));
        }
    }, [currentUserId, targetUserId, isFollowing]);

    // --- Initial Load & Redirect Check ---
    useEffect(() => {
        const fetchAndCheckUser = async () => {
            if (!targetUserId) {
                setLoading(false);
                Alert.alert("Error", "Invalid user ID provided.");
                return;
            }

            let user = null;
            try {
                const userJson = await AsyncStorage.getItem('user');
                if (userJson) {
                    user = JSON.parse(userJson);
                    const loggedInUserId = user.user_id;
                    setCurrentUserId(loggedInUserId);

                    // ** REDIRECT CHECK: If viewing own profile, redirect to main profile screen **
                    if (loggedInUserId === targetUserId) {
                        router.replace('/profile'); 
                        return; // Stop execution
                    }
                }
            } catch (error) {
                console.error('Error fetching current user ID:', error);
            }

            // Load external profile data
            loadProfileData(); 
        };

        fetchAndCheckUser();
    }, [targetUserId, router, loadProfileData]);
    
    // --- Refresh Handler ---
    const onRefresh = useCallback(() => {
        setRefreshing(true);
        loadProfileData(true);
    }, [loadProfileData]);
    
    // --- Helper for UI ---
    const getInitials = () => {
        return profileData?.username?.charAt(0).toUpperCase() || 'U';
    };

    const CustomEmptyIcon = () => (
        <View style={styles.customIconContainer}>
            <Ionicons name="copy-outline" size={55} color="#888" style={styles.iconMain} />
        </View>
    );

    // --- Loading & Error States ---
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
    
    // Check again, should be false due to redirect check above
    const isCurrentUserProfile = currentUserId === targetUserId; 

    // --- Render JSX ---
    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" />
            
            <View style={styles.header}>
                <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={24} color="#000" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{profileData.username}'s Profile</Text>
                <View style={styles.headerRight}>
                    <TouchableOpacity style={styles.headerButton}>
                        <Ionicons name="share-outline" size={24} color="#000" />
                    </TouchableOpacity>
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
                        
                        {/* Action Buttons for external profiles, including FOLLOW */}
                        {!isCurrentUserProfile && (
                            <View style={styles.actionButtonsRow}>
                                <TouchableOpacity 
                                    style={[styles.followButton, isFollowing && styles.unfollowButton]}
                                    onPress={handleFollowToggle}
                                >
                                    <Text style={[styles.followButtonText, isFollowing && styles.unfollowButtonText]}>
                                        {isFollowing ? 'Following' : 'Follow'}
                                    </Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.chatButton} onPress={() => Alert.alert("Chat", `Starting chat with ${profileData.username}`)}>
                                    <Text style={styles.chatButtonText}>Chat</Text>
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>
                </View>

                {profileData.bio && (
                    <View style={styles.bioSection}>
                        <Text style={styles.bioText}>{profileData.bio}</Text>
                    </View>
                )}

                {/* Single Tab for Posted Items */}
                <View style={styles.tabBarSingle}>
                    <View style={styles.activeTabSingle}>
                        <Text style={styles.tabTextActive}>Posted Items ({products.length})</Text>
                    </View>
                </View>

                <View style={styles.productsBackground}>
                    {loadingProducts ? (
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
        </SafeAreaView>
    );
};

// ---------------------------------------------------
// Styles
// ---------------------------------------------------
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
        marginBottom: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#E0E0E0',
    },
    activeTabSingle: {
        paddingVertical: 12,
        borderBottomWidth: 2,
        borderBottomColor: '#000',
        alignSelf: 'flex-start',
        paddingHorizontal: 10,
    },
    tabTextActive: {
        fontSize: 15,
        fontWeight: '700',
        color: '#000',
    },
    productsBackground: {
        minHeight: 300,
        paddingTop: 0,
    },
    loadingContainer: {
        paddingVertical: 40,
        alignItems: 'center',
    },
    emptyContainer: {
        paddingVertical: 60,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 20,
    },
    customIconContainer: {
        position: 'relative',
        width: 60,
        height: 60,
        marginBottom: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    iconMain: {
        position: 'absolute',
        top: 0,
        left: 0,
    },
    emptyTextCustom: {
        fontSize: 15,
        fontWeight: '400',
        color: '#333',
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 30,
    },
    productGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        paddingHorizontal: 8,
        paddingTop: 14,
    },
    // --- ProductCard Styles ---
    cardContainer: {
        width: CARD_WIDTH,
        marginBottom: 8,
        borderRadius: 16,
        backgroundColor: "white",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 3,
    },
    cardTouchable: {
        borderRadius: 16,
        overflow: "hidden",
    },
    imageWrapper: {
        width: "100%",
        aspectRatio: 1,
        backgroundColor: "#F7F7F7",
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
        overflow: "hidden",
    },
    cardImage: {
        width: "100%",
        height: "100%",
        resizeMode: "cover",
    },
    deliveryBadgeNew: {
        position: "absolute",
        bottom: 10,
        left: 10,
        backgroundColor: "white",
        padding: 6,
        borderRadius: 8,
        shadowColor: "#000",
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    threeDotsMenu: {
        position: "absolute",
        top: 10,
        right: 10,
        backgroundColor: 'rgba(0,0,0,0.3)',
        borderRadius: 16,
        width: 32,
        height: 32,
        alignItems: 'center',
        justifyContent: 'center',
    },
    cardDetails: {
        padding: 12,
    },
    priceTag: {
        alignSelf: "flex-start",
        borderRadius: 6,
        paddingVertical: 4,
        paddingHorizontal: 8,
        marginBottom: 6,
    },
    priceText: {
        fontSize: 13,
        fontWeight: "700",
    },
    cardTitle: {
        fontSize: 13,
        fontWeight: "600",
        color: "#333",
        minHeight: 34,
        marginBottom: 4,
    },
});

export default SomeonesProfileScreen;