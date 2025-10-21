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
        if (product.listing_type === "exchange") return "Exchange";
        
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
                return `${formattedMillions} million DA/mo`;
            }
            return `${formattedMillions} million DA`;
        }
        
        if (product.listing_type === "rent") {
            return `${product.price.toLocaleString()} DA/mo`;
        }
        return `${product.price.toLocaleString()} DA`;
    };

    const handleUnlike = async () => {
        if (onUnlike) {
            await onUnlike(product.id);
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

                    {showMenu ? (
                        <TouchableOpacity style={styles.threeDotsMenu}>
                            <Ionicons name="ellipsis-vertical" size={20} color="#fff" />
                        </TouchableOpacity>
                    ) : (
                        <TouchableOpacity 
                            style={styles.heartIconFilled}
                            onPress={handleUnlike}
                        >
                            <Ionicons name="heart" size={22} color="#FF5B5B" />
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
    const { signOut } = useAuth();
    
    const [products, setProducts] = useState<Product[]>([]);
    const [likedProducts, setLikedProducts] = useState<Product[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [loadingProducts, setLoadingProducts] = useState(false);
    const [loadingLiked, setLoadingLiked] = useState(false);

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

                const { data: categoriesData, error: categoriesError } = await supabase
                    .from('categories')
                    .select('id, name, description, delivery');

                if (categoriesError) throw categoriesError;
                setCategories(categoriesData || []);

                await Promise.all([
                    fetchUserProducts(user.user_id),
                    fetchLikedProducts(user.user_id)
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

    const fetchLikedProducts = async (userId: number) => {
        try {
            setLoadingLiked(true);
            
            const { data: likesData, error: likesError } = await supabase
                .from('likes')
                .select('product_id')
                .eq('user_id', userId)
                .not('product_id', 'is', null)
                .order('created_at', { ascending: false });

            if (likesError) throw likesError;

            if (likesData && likesData.length > 0) {
                const productIds = likesData.map(like => like.product_id);
                
                const { data: productsData, error: productsError } = await supabase
                    .from('products')
                    .select('id, name, price, listing_type, image_url, latitude, longitude, location_address, created_at, category_id')
                    .in('id', productIds);

                if (productsError) throw productsError;
                setLikedProducts(productsData || []);
            } else {
                setLikedProducts([]);
            }
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
                <Text style={styles.errorText}>No user data found</Text>
                <TouchableOpacity style={styles.loginButton} onPress={() => router.replace('/(auth)/login')}>
                    <Text style={styles.loginButtonText}>Go to Login</Text>
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
                <Text style={styles.headerTitle}>Profile</Text>
                <View style={styles.headerRight}>
                    <TouchableOpacity style={styles.headerButton}>
                        <Ionicons name="headset-outline" size={24} color="#000" />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.headerButton}>
                        <Ionicons name="share-outline" size={24} color="#000" />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.headerButton} onPress={() => router.push('/settings')}>
                        <Ionicons name="settings-outline" size={24} color="#000" />
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
                                <Text style={styles.statName}>Posts</Text>
                            </View>
                            <View style={styles.statBox}>
                                <Text style={styles.statValue}>{followingCount}</Text>
                                <Text style={styles.statName}>Following</Text>
                            </View>
                            <View style={styles.statBox}>
                                <Text style={styles.statValue}>{followersCount}</Text>
                                <Text style={styles.statName}>Followers</Text>
                            </View>
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
                        <Text style={[styles.tabText, activeTab === 'Post' && styles.tabTextActive]}>Post</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                        style={[styles.tabButton, activeTab === 'Liked' && styles.activeTab]}
                        onPress={() => setActiveTab('Liked')}
                    >
                        <Text style={[styles.tabText, activeTab === 'Liked' && styles.tabTextActive]}>Liked</Text>
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
                                    ? "It looks a bit empty in here! Got a new find? Show it off!" 
                                    : "Ready to feel the love? Find something you like? Tap that heart!"
                                }
                            </Text>
                            <TouchableOpacity 
                                style={styles.addButton}
                                onPress={() => router.push(activeTab === 'Post' ? '/addproduct' : '/(tabs)/home')} 
                            >
                                <Text style={styles.addButtonText}>
                                    {activeTab === 'Post' 
                                        ? "Add to your collection" 
                                        : "Start browsing products"
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

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F5F5F5',
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
        backgroundColor: '#fff',
        borderBottomWidth: 0.5,
        borderBottomColor: '#e5e5e5',
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
    },
    displayName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#000',
        marginBottom: 16,
    },
    statsRow: {
        flexDirection: 'row',
        gap: 40,
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
    bioSection: {
        paddingHorizontal: 18,
        marginBottom: 16,
    },
    bioText: {
        fontSize: 14,
        lineHeight: 20,
        color: '#262626',
    },
    tabBar: {
        flexDirection: 'row',
        marginHorizontal: 14,
        marginBottom: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#E0E0E0',
    },
    tabButton: {
        flex: 1,
        paddingVertical: 12,
        alignItems: 'center',
        borderBottomWidth: 2,
        borderBottomColor: 'transparent',
    },
    activeTab: {
        borderBottomColor: '#000',
    },
    tabText: {
        fontSize: 15,
        fontWeight: '600',
        color: '#999',
    },
    tabTextActive: {
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
    iconPlus: {
        position: 'absolute',
        top: -5,
        right: -10,
        backgroundColor: '#F5F5F5', 
        borderRadius: 12,
    },
    emptyTextCustom: {
        fontSize: 15,
        fontWeight: '400',
        color: '#333',
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 30,
    },
    addButton: {
        backgroundColor: '#fff', 
        paddingHorizontal: 28,
        paddingVertical: 12,
        borderRadius: 25,
        borderWidth: 1,
        borderColor: '#E0E0E0', 
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 2,
    },
    addButtonText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#000',
    },
    productGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        paddingHorizontal: 8,
        paddingTop: 14,
    },
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
    heartIconFilled: {
        position: "absolute",
        top: 10,
        right: 10,
        padding: 5,
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        borderRadius: 20,
    },
    threeDotsMenu: {
        position: "absolute",
        top: 10,
        right: 10,
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

export default ProfileScreen;