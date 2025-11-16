import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect, useRouter } from 'expo-router';
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
import { supabase } from '../../lib/Supabase';
import i18n from '../../lib/i18n';
import { useAuth } from '../context/AuthContext';

const CARD_WIDTH = Dimensions.get("window").width / 2 - 12;

interface UserProfile {
    user_id: number;
    username: string;
    email: string;
    full_name: string;
    bio: string | null;
    profile_image_url: string | null;
    location: string | null;
    created_at?: string;
    updated_at?: string;
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

// Add this updated ProductCard component to replace the existing one in your ProfileScreen.tsx

const ProductCard: React.FC<{
    product: Product;
    categories: Category[];
    showMenu?: boolean;
    isLiked?: boolean;
    onUnlike?: (productId: number) => void;
}> = ({ product, categories, showMenu = true, isLiked = false, onUnlike }) => {
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

    const tagColors = getTagColor();

    const formatPrice = () => {
        if (product.listing_type === "exchange") return i18n.t('product.exchangeTag');
        
        if (product.price >= 10000) {
            const millions = product.price / 10000;
            let formattedMillions;
            
            if (millions % 1 === 0) {
                formattedMillions = millions.toString();
            } else if (millions >= 10) {
                formattedMillions = Math.round(millions).toString();
            } else {
                formattedMillions = millions.toFixed(1);
            }
            
            if (product.listing_type === "rent") {
                return `${formattedMillions} million ${i18n.t('product.priceSuffixDAMonth')}`;
            }
            return `${formattedMillions} million ${i18n.t('product.priceSuffixDA')}`;
        }
        
        if (product.listing_type === "rent") {
            return `${product.price.toLocaleString()} ${i18n.t('product.priceSuffixDAMonth')}`;
        }
        return `${product.price.toLocaleString()} ${i18n.t('product.priceSuffixDA')}`;
    };

    const handleUnlike = async (e: any) => {
        e.stopPropagation(); // Prevent navigation to product detail
        if (onUnlike) {
            Alert.alert(
                'Unlike Product',
                'Remove this product from your liked items?',
                [
                    { text: 'Cancel', style: 'cancel' },
                    {
                        text: 'Unlike',
                        style: 'destructive',
                        onPress: async () => {
                            await onUnlike(product.id);
                        }
                    }
                ]
            );
        }
    };

    return (
        <View style={styles.cardContainer}>
            <TouchableOpacity
                onPress={() => router.push(`/product_detail?id=${product.id}`)}
                style={styles.cardTouchable}
            >
                <View style={styles.imageWrapper}>
                    <Image
                        source={{
                            uri: product.image_url || `https://placehold.co/250x250/E0E0E0/333333?text=${i18n.t('product.noImage').replace(' ', '+')}`,
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

                    {/* Unlike button - only shown when isLiked is true */}
                    {isLiked && onUnlike && (
                        <TouchableOpacity 
                            style={styles.heartIconFilled}
                            onPress={handleUnlike}
                        >
                            <Ionicons name="heart" size={20} color="#FF3B30" />
                        </TouchableOpacity>
                    )}
                </View>

                <View style={styles.cardDetails}>
                    <View style={[styles.priceTag, { backgroundColor: tagColors.bg }]}>
                        <Text style={[styles.priceText, { color: tagColors.text }]}>
                            {formatPrice()}
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

const ProfileScreen = () => {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState('Post'); 
    const [userData, setUserData] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [followingCount, setFollowingCount] = useState(0);
    const [followersCount, setFollowersCount] = useState(0);
    const [uploadingPhoto, setUploadingPhoto] = useState(false);
    const [unreadNotifications, setUnreadNotifications] = useState(0);
    const { signOut } = useAuth();
    
    const [products, setProducts] = useState<Product[]>([]);
    const [likedProducts, setLikedProducts] = useState<Product[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [loadingProducts, setLoadingProducts] = useState(false);
    const [loadingLiked, setLoadingLiked] = useState(false);
    
    // ✅ NEW STATE: To store the IDs of users the current user has blocked
    const [blockedUserIds, setBlockedUserIds] = useState<number[]>([]); 

    useFocusEffect(
        useCallback(() => {
            loadUserData();
        }, [])
    );

    useEffect(() => {
        requestPermissions();
    }, []);

    const requestPermissions = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission needed', 'Please allow access to your photos to upload a profile picture');
        }
    };

    // ✅ NEW FUNCTION: Fetch the IDs of users the current user has blocked
    const fetchBlockedUsers = async (userId: number): Promise<number[]> => {
        try {
            const { data, error } = await supabase
                .from('block')
                .select('blocked_id')
                .eq('blocker_id', userId);

            if (error) throw error;

            // Extract the blocked_id values into an array of numbers
            return (data || []).map(item => item.blocked_id);
        } catch (error) {
            console.error('Error fetching blocked users for filtering:', error);
            return []; // Return empty array on failure
        }
    };


    const loadUserData = async (isRefreshing = false) => {
        try {
            if (!isRefreshing) {
                setLoading(true);
            }
            
            const userJson = await AsyncStorage.getItem('user');
            if (userJson) {
                const user = JSON.parse(userJson);
                
                const { data: freshUserData, error: userError } = await supabase
                    .from('users')
                    .select('*')
                    .eq('user_id', user.user_id)
                    .single();

                if (userError) throw userError;
                
                if (freshUserData) {
                    await AsyncStorage.setItem('user', JSON.stringify(freshUserData));
                    setUserData(freshUserData);
                } else {
                    setUserData(user);
                }

                // --- Fetch Counts ---
                const { count: followingCount } = await supabase
                    .from('user_follows')
                    .select('*', { count: 'exact', head: true })
                    .eq('follower_id', user.user_id);
                setFollowingCount(followingCount || 0);

                const { count: followersCount } = await supabase
                    .from('user_follows')
                    .select('*', { count: 'exact', head: true })
                    .eq('following_id', user.user_id);
                setFollowersCount(followersCount || 0);

                // --- Fetch Categories ---
                const { data: categoriesData, error: categoriesError } = await supabase
                    .from('categories')
                    .select('id, name, description, delivery');

                if (categoriesError) throw categoriesError;
                setCategories(categoriesData || []);

                // --- Fetch Blocked Users (NEW STEP) ---
                const blockedIds = await fetchBlockedUsers(user.user_id);
                setBlockedUserIds(blockedIds); // Store for future use

                // --- Fetch Products ---
                await Promise.all([
                    fetchUserProducts(user.user_id),
                    // ✅ UPDATED CALL: Pass the blocked IDs to the liked products function
                    fetchLikedProducts(user.user_id, blockedIds) 
                ]);
            }
        } catch (error) {
            console.error('Error loading user data:', error);
            if (!isRefreshing) {
                Alert.alert('Error', 'Failed to load profile data');
            }
        } finally {
            setLoading(false);
            if (isRefreshing) {
                setRefreshing(false);
            }
        }
    };

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        loadUserData(true);
    }, []);

    const fetchUserProducts = async (userId: number) => {
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
            Alert.alert('Error', 'Failed to load products'); 
        } finally {
            setLoadingProducts(false);
        }
    };

// In ProfileScreen.tsx:
const fetchLikedProducts = async (userId: number, blockedIds: number[]) => {
    try {
        setLoadingLiked(true);
        
        // 1. Get the IDs of products the user has liked
        const { data: likesData, error: likesError } = await supabase
            .from('likes')
            .select('product_id')
            .eq('user_id', userId)
            .not('product_id', 'is', null)
            .order('created_at', { ascending: false });

        if (likesError) throw likesError;

        // CRITICAL HARDENING: Ensure all product IDs are non-null and valid numbers
        const productIds = (likesData || [])
            .map(like => like.product_id)
            .filter((id): id is number => typeof id === 'number' && id !== null); 

        // CRITICAL CHECK 1: If no products are liked, stop immediately.
        if (productIds.length === 0) {
            setLikedProducts([]);
            setLoadingLiked(false);
            return;
        }

        // 2. Filter the blockedIds list again for safety (in case the upstream fetch returns junk)
        const safeBlockedIds = blockedIds.filter((id): id is number => typeof id === 'number' && id !== null);

        // 3. Build the products query
        let query = supabase
            .from('products')
            .select(`
                id, 
                name, 
                price, 
                listing_type, 
                image_url, 
                latitude, 
                longitude, 
                location_address, 
                created_at, 
                category_id,
                user_id!inner(user_id) // Use implicit join via foreign key
            `)
            .in('id', productIds);
            
        // 4. FIX FOR PGRST100: Only apply the 'not.in' filter if the safe array is NOT empty.
       if (safeBlockedIds.length > 0) {
            console.log(`LOG Filtering ${safeBlockedIds.length} blocked users from liked products. (Safe)`);
            
            // ************ THE NEW FIX ************
            if (safeBlockedIds.length === 1) {
                // If there's ONLY one ID, use 'neq' (not equal) for robustness
                // This forces PostgREST to use a simpler, safer filter syntax
                query = query.neq('user_id.user_id', safeBlockedIds[0]);
            } else {
                // Otherwise, use 'not.in' for arrays of two or more
                query = query.not('user_id.user_id', 'in', safeBlockedIds);
            }
            // ************ END OF NEW FIX ************
            
        } else {
             console.log("LOG No blocked users to filter, fetching all liked products.");
        }
        // --- End of Critical Fix ---

        // 5. Execute the query
        const { data: productsData, error: productsError } = await query;

        if (productsError) throw productsError;
        
        setLikedProducts(productsData as Product[] || []); 

    } catch (error: any) {
        console.error('Error fetching liked products:', error);
        Alert.alert('Error', 'Failed to load liked products'); 
    } finally {
        setLoadingLiked(false);
    }
};

    const handleUnlikeProduct = async (productId: number) => {
        if (!userData) return;

        try {
            const { error } = await supabase
                .from('likes')
                .delete()
                .eq('user_id', userData.user_id)
                .eq('product_id', productId);

            if (error) throw error;

            setLikedProducts(prev => prev.filter(p => p.id !== productId));
        } catch (error: any) {
            console.error('Error unliking product:', error);
            Alert.alert('Error', 'Failed to unlike product'); 
        }
    };

    if (loading) {
        return (
            <View style={[styles.container, styles.centerContent]}>
                <ActivityIndicator size="large" color="#C8E853" />
            </View>
        );
    }

    if (!userData) {
        return (
            <View style={[styles.container, styles.centerContent]}>
                <Text style={styles.errorText}>{i18n.t('profileContent.noUserData')}</Text>
                <TouchableOpacity style={styles.loginButton} onPress={() => router.replace('/(auth)/login')}>
                    <Text style={styles.loginButtonText}>{i18n.t('goToLogin')}</Text>
                </TouchableOpacity>
            </View>
        );
    }

    const getInitials = () => {
        if (userData.full_name) {
            return userData.full_name.charAt(0).toUpperCase();
        }
        return userData.username.charAt(0).toUpperCase();
    };

    const currentProducts = activeTab === 'Post' ? products : likedProducts;
    const isCurrentlyLoading = activeTab === 'Post' ? loadingProducts : loadingLiked;

    const CustomEmptyIcon = ({ isPostTab }: { isPostTab: boolean }) => (
        <View style={styles.customIconContainer}>
            {isPostTab ? (
                <>
                    <Ionicons name="copy-outline" size={55} color="#888" style={styles.iconMain} />
                    <Ionicons name="add-circle" size={24} color="#888" style={styles.iconPlus} />
                </>
            ) : (
                <Ionicons name="heart-outline" size={60} color="#888" />
            )}
        </View>
    );

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" />
            
            <View style={styles.header}>
                <Text style={styles.headerTitle}>{i18n.t('tabs.profile')}</Text>
                <View style={styles.headerRight}>
                    <TouchableOpacity style={styles.headerButton} onPress={() => router.push('/help')}>
                        <Ionicons name="headset-outline" size={24} color="#000" />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.headerButton}>
                        <Ionicons name="share-outline" size={24} color="#000" />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.headerButton} onPress={() => router.push('/settings')}>
                        <Ionicons name="settings-outline" size={24} color="#000" />
                        {unreadNotifications > 0 && (
                            <View style={styles.notificationBadge}>
                                <Text style={styles.notificationBadgeText}>
                                    {unreadNotifications > 99 ? '99+' : unreadNotifications}
                                </Text>
                            </View>
                        )}
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
                            {uploadingPhoto ? (
                                <View style={styles.avatarCircle}>
                                    <ActivityIndicator size="large" color="#fff" />
                                </View>
                            ) : userData.profile_image_url ? (
                                <Image source={{ uri: userData.profile_image_url }} style={styles.avatarCircle} />
                            ) : (
                                <View style={styles.avatarCircle}>
                                    <Text style={styles.avatarInitial}>{getInitials()}</Text>
                                </View>
                            )}
                        </View>

                        <Text style={styles.displayName}>{userData.username}</Text>

                        <View style={styles.statsRow}>
                            <View style={styles.statBox}>
                                <Text style={styles.statValue}>{products.length}</Text>
                                <Text style={styles.statName}>{i18n.t('profileContent.posts')}</Text>
                            </View>
                            <TouchableOpacity 
                                style={styles.statBox}
                                onPress={() => router.push(`/following_list?userId=${userData.user_id}`)}
                            >
                                <Text style={styles.statValue}>{followingCount}</Text>
                                <Text style={styles.statName}>{i18n.t('profileContent.following')}</Text> 
                            </TouchableOpacity>

                            <TouchableOpacity 
                                style={styles.statBox}
                                onPress={() => router.push(`/followers_list?userId=${userData.user_id}`)}
                            >
                                <Text style={styles.statValue}>{followersCount}</Text>
                                <Text style={styles.statName}>{i18n.t('profileContent.followers')}</Text> 
                            </TouchableOpacity>
                        </View>
                    </View>

                    <TouchableOpacity 
                        style={styles.editButtonOutside}
                        onPress={() => router.push('/editprofile')}
                        disabled={uploadingPhoto}
                    >
                        <MaterialCommunityIcons name="pencil-outline" size={18} color="#000" />
                    </TouchableOpacity>
                </View>

                {userData.bio && (
                    <View style={styles.bioSection}>
                        <Text style={styles.bioText}>{userData.bio}</Text>
                    </View>
                )}

                <View style={styles.tabBar}>
                    <TouchableOpacity
                        style={[styles.tabButton, activeTab === 'Post' && styles.activeTab]}
                        onPress={() => setActiveTab('Post')}
                    >
                        <Text style={[styles.tabText, activeTab === 'Post' && styles.tabTextActive]}>{i18n.t('profileContent.posts')}</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                        style={[styles.tabButton, activeTab === 'Liked' && styles.activeTab]}
                        onPress={() => setActiveTab('Liked')}
                    >
                        <Text style={[styles.tabText, activeTab === 'Liked' && styles.tabTextActive]}>{i18n.t('profileContent.liked')}</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.productsBackground}>
                    {isCurrentlyLoading ? (
                        <View style={styles.loadingContainer}>
                            <ActivityIndicator size="large" color="#16A085" />
                        </View>
                    ) : currentProducts.length === 0 ? (
                        <View style={styles.emptyContainer}>
                            <CustomEmptyIcon isPostTab={activeTab === 'Post'} />
                            <Text style={styles.emptyTextCustom}>
                                {activeTab === 'Post' 
                                    ? i18n.t('profileContent.emptyPostMsg') 
                                    : i18n.t('profileContent.emptyLikedMsg')
                                }
                            </Text>
                            <TouchableOpacity 
                                style={styles.addButton}
                                onPress={() => router.push(activeTab === 'Post' ? '/add' : '/(tabs)')} 
                            >
                                <Text style={styles.addButtonText}>
                                    {activeTab === 'Post' 
                                        ? i18n.t('profileContent.addToCollection') 
                                        : i18n.t('profileContent.startBrowsing')
                                    }
                                </Text>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <View style={styles.productGrid}>
                            {currentProducts.map((product) => (
                                <ProductCard
                                    key={product.id}
                                    product={product}
                                    categories={categories}
                                    showMenu={activeTab === 'Post'}
                                    isLiked={activeTab === 'Liked'}
                                    onUnlike={activeTab === 'Liked' ? handleUnlikeProduct : undefined}
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

// ... (Your original StyleSheet remains here)
const styles = StyleSheet.create({
    cardContainer: {
        width: CARD_WIDTH,
        marginBottom: 8,
        borderRadius: 20,
        backgroundColor: "white",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 8,
    },
    
    cardTouchable: {
        borderRadius: 20,
        overflow: 'hidden',
        flex: 1,
    },
    
    imageWrapper: {
        width: "100%",
        aspectRatio: 0.8,
        backgroundColor: "#F7F7F7",
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
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
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 4,
    },
    
    threeDotsMenu: {
        position: 'absolute',
        top: 12,
        right: 12,
        backgroundColor: 'rgba(0,0,0,0.5)',
        borderRadius: 20,
        padding: 6,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.4,
        shadowRadius: 4,
        elevation: 5,
    },
    
    heartIcon: {
        position: 'absolute',
        top: 12,
        right: 12,
        backgroundColor: 'rgba(0,0,0,0.5)',
        borderRadius: 20,
        padding: 6,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.4,
        shadowRadius: 4,
        elevation: 5,
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
        fontSize: 14,
        fontWeight: "500",
        color: "#333",
        minHeight: 34,
        marginBottom: 4,
    },
    container: {
        flex: 1,
        paddingBottom:50,
         marginBottom:50,
        // *** CHANGE 1: Main screen background to white (#FFFFFF) ***
        backgroundColor: '#FFFFFF', 
    },
    centerContent: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    errorText: {
        fontSize: 16,
        color: '#666',
        marginBottom: 20,
    },
    loginButton: {
        backgroundColor: '#C8E853',
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 12,
    },
    loginButtonText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#000',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 35,
        paddingHorizontal: 16,
        paddingVertical: 14,
        // *** CHANGE 2: Header background to white (#FFFFFF) ***
        backgroundColor: '#FFFFFF',
        // *** CHANGE 3: Add shadow effect to the header ***
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1, // Adjusted for a subtle shadow
        shadowRadius: 3,
        elevation: 4, // Android shadow
        borderBottomWidth: 0, // Remove original border to rely on shadow
    },
    headerTitle: {
        fontSize: 22,
        fontWeight: '700',
        color: '#000',
    },
    headerRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    headerButton: {
        padding: 2,
        position: 'relative',
    },
    notificationBadge: {
        position: 'absolute',
        top: -4,
        right: -4,
        backgroundColor: '#FF3B30',
        borderRadius: 10,
        minWidth: 18,
        height: 18,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 4,
        borderWidth: 2,
        borderColor: '#fff',
    },
    notificationBadgeText: {
        color: '#fff',
        fontSize: 10,
        fontWeight: '700',
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
        // *** CHANGE 4: Profile card background to white (already was, ensuring it stays) ***
        backgroundColor: '#fff', 
        borderRadius: 16,
        paddingVertical: 24,
        paddingHorizontal: 20,
        alignItems: 'center',
        // *** CHANGE 5: Enhanced shadow effect for the profile card ***
        shadowColor: '#000', 
        shadowOffset: { width: 0, height: 4 }, // Increased height for better visibility
        shadowOpacity: 0.15, // Increased opacity for a clearer shadow
        shadowRadius: 8, // Increased radius for a softer shadow
        elevation: 6, // Android shadow
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
    editButtonOutside: {
        position: 'absolute',
        top: 24,
        right: 16,
        backgroundColor: '#fff',
        borderRadius: 12,
        width: 34,
        height: 34,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#e5e5e5',
        // Optional: Add shadow to the edit button to make it stand out
        shadowColor: '#000', 
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 3,
    },
    displayName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#000',
        marginBottom: 16,
    },
    statsRow: {
        flexDirection: 'row',
        width: '100%',
        justifyContent: 'space-around',
    },
    statBox: {
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 4,
    },
    statValue: {
        fontSize: 20,
        fontWeight: '700',
        color: '#000',
    },
    statName: {
        fontSize: 12,
        fontWeight: '500',
        color: '#666',
        marginTop: 2,
    },
    bioSection: {
        marginHorizontal: 16,
        marginBottom: 20,
    },
    bioText: {
        fontSize: 14,
        color: '#333',
        lineHeight: 20,
    },
    tabBar: {
        flexDirection: 'row',
        marginHorizontal: 14,
        marginBottom: 10,
        backgroundColor: '#F7F7F7',
        borderRadius: 12,
        padding: 4,
    },
    tabButton: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: 10,
        borderRadius: 10,
    },
    activeTab: {
        backgroundColor: '#16A085', // Active tab background white
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 3,
        elevation: 2,
    },
    tabText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#666',
    },
    tabTextActive: {
        color: '#ffffffff',
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
    
    heartIconFilled: {
        position: 'absolute',
        top: 8,
        right: 8,
        backgroundColor: '#fff',
        borderRadius: 15,
        width: 30,
        height: 30,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 2,
        elevation: 3,
    },
    
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 50,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 50,
        paddingHorizontal: 30,
    },
    customIconContainer: {
        position: 'relative',
        marginBottom: 10,
    },
    iconMain: {
        // Simple positioning to simulate the icon pair
    },
    iconPlus: {
        position: 'absolute',
        bottom: 0,
        right: -10,
    },
    emptyTextCustom: {
        fontSize: 16,
        color: '#888',
        fontWeight: '500',
        textAlign: 'center',
        marginTop: 15,
    },
    addButton: {
        marginTop: 20,
        backgroundColor: '#16A085',
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 10,
    },
    addButtonText: {
        color: '#fff',
        fontSize: 15,
        fontWeight: '600',
    }
});

export default ProfileScreen;