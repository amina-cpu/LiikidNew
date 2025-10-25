import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient'; // Assuming this is installed
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import { supabase } from "../../lib/Supabase";

interface ProductImage {
  image_url: string;
  order: number;
}

interface ProductDetail {
  id: number;
  name: string;
  price: number;
  listing_type: "sell" | "rent" | "exchange";
  description: string;
  image_url: string | null;
  location_address: string | null;
  latitude: number | null;
  longitude: number | null;
  created_at: string;
  hasShipping: boolean;
  product_images?: ProductImage[];
  user_id: number;
  condition: string | null;
  also_exchange: boolean;
}

interface UserInfo {
  user_id: number;
  username: string;
  profile_image_url: string | null;
  bio: string | null;
  created_at: string;
}

const { width } = Dimensions.get("window");
const PRODUCT_IMAGE_HEIGHT = width * 1.5;

const COLORS = {
  primary: "#00A78F",
  secondary: "#363636",
  textLight: "#8A8A8E",
  background: "#F5F5F5",
  white: "#FFFFFF",
  sell: "#007AFF", // Blue color for Sell/Price
  rent: "#F59E0B",
  exchange: "#A855F7", // Purple color for Exchange
  exchangeGradientStart: "#E0E7FF", // Light Blue for the start of the background gradient
  exchangeGradientEnd: "#F3E8FF",   // Very Light Purple for the end of the background gradient
};

// Format price helper function
const formatPrice = (price: number): string => {
  if (price >= 1000000) {
    return `${(price / 1000000).toFixed(1)}M`;
  } else if (price >= 10000) {
    return `${(price / 1000).toFixed(0)}K`;
  }
  return price.toLocaleString();
};

const ProductDetailScreen = () => {
  const { id: productId } = useLocalSearchParams();
  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [showMenu, setShowMenu] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [likesCount, setLikesCount] = useState(0);
  const scrollRef = useRef<ScrollView>(null);
  const router = useRouter();

  const isOwner = currentUserId && product && currentUserId === product.user_id;

  useEffect(() => {
    const getCurrentUser = async () => {
      try {
        const userJson = await AsyncStorage.getItem('user');
        if (userJson) {
          const user = JSON.parse(userJson);
          setCurrentUserId(user.user_id);
        }
      } catch (error) {
        console.error('Error getting current user:', error);
      }
    };
    getCurrentUser();
  }, []);

  const fetchLikesCount = async () => {
    if (!productId) return;

    try {
      const { count, error } = await supabase
        .from('likes')
        .select('*', { count: 'exact', head: true })
        .eq('product_id', productId);

      if (error) throw error;
      setLikesCount(count || 0);
    } catch (error) {
      console.error('Error fetching likes count:', error);
    }
  };

  useEffect(() => {
    const checkIfLiked = async () => {
      if (!currentUserId || !productId) return;

      try {
        const { data, error } = await supabase
          .from('likes')
          .select('like_id')
          .eq('user_id', currentUserId)
          .eq('product_id', productId)
          .single();

        if (data) {
          setIsFavorite(true);
        }
      } catch (error) {
        console.log('Product not liked');
      }
    };
    checkIfLiked();
  }, [currentUserId, productId]);

  useEffect(() => {
    if (!productId || Array.isArray(productId)) {
      setLoading(false);
      setError("Invalid Product ID.");
      return;
    }

    const fetchProductDetail = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("products")
          .select(`
            id,
            name,
            price,
            listing_type,
            description,
            image_url,
            location_address,
            latitude,
            longitude,
            created_at,
            user_id,
            condition,
            also_exchange,
            category:categories (delivery),
            product_images (image_url, order)
          `)
          .eq("id", productId)
          .single();

        if (error) throw error;

        if (data) {
          setProduct({
            id: data.id,
            name: data.name,
            price: data.price,
            listing_type: data.listing_type,
            description: data.description || "No description provided.",
            image_url: data.image_url,
            location_address: data.location_address,
            latitude: data.latitude,
            longitude: data.longitude,
            created_at: new Date(data.created_at).toLocaleDateString(),
            hasShipping: data.category?.delivery === true,
            product_images: data.product_images || [],
            user_id: data.user_id,
            condition: data.condition,
            also_exchange: data.also_exchange || false,
          });

          const { data: userData, error: userError } = await supabase
            .from('users')
            .select('user_id, username, profile_image_url, bio, created_at')
            .eq('user_id', data.user_id)
            .single();

          if (userError) throw userError;
          setUserInfo(userData);

          await fetchLikesCount();
        } else {
          setError("Product not found.");
        }
      } catch (e: any) {
        Alert.alert("Error", e.message || "Failed to fetch product details.");
        setError("Failed to load product.");
      } finally {
        setLoading(false);
      }
    };

    fetchProductDetail();
  }, [productId]);

  const handleScroll = (event: any) => {
    const index = Math.round(event.nativeEvent.contentOffset.x / width);
    setActiveIndex(index);
  };

  const toggleFavorite = async () => {
    if (!currentUserId) {
      Alert.alert('Login Required', 'Please login to like products');
      return;
    }

    try {
      if (isFavorite) {
        const { error } = await supabase
          .from('likes')
          .delete()
          .eq('user_id', currentUserId)
          .eq('product_id', productId);

        if (error) throw error;
        setIsFavorite(false);
        setLikesCount(prev => Math.max(0, prev - 1));
      } else {
        const { error } = await supabase
          .from('likes')
          .insert({
            user_id: currentUserId,
            product_id: productId,
            post_id: null
          });

        if (error) throw error;
        setIsFavorite(true);
        setLikesCount(prev => prev + 1);
      }
    } catch (error: any) {
      console.error('Error toggling like:', error);
      Alert.alert('Error', 'Failed to update like status');
    }
  };

  const navigateToSellerProfile = () => {
    if (!userInfo?.user_id) {
      Alert.alert("Error", "Seller information is not available.");
      return;
    }
    
    const sellerId = userInfo.user_id;

    if (currentUserId === sellerId) { 
      router.push("/profile"); 
    } else {
      router.push({
        pathname: "/someonesProfile",
        params: { userId: sellerId },
      });
    }
  };

  const handleEditProduct = () => {
    if (!product) return;
    
    router.push({
      pathname: "/edit_listing",
      params: { productId: product.id }
    });
  };

  const handleDeleteProduct = () => {
    Alert.alert(
      'Delete Product',
      'Are you sure you want to delete this product? This action cannot be undone.',
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('products')
                .delete()
                .eq('id', productId);

              if (error) throw error;

              Alert.alert('Success', 'Product deleted successfully', [
                {
                  text: 'OK',
                  onPress: () => router.back()
                }
              ]);
            } catch (error: any) {
              console.error('Error deleting product:', error);
              Alert.alert('Error', 'Failed to delete product');
            }
          }
        }
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.flexCenter}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading product details...</Text>
      </View>
    );
  }

  if (error || !product) {
    return (
      <View style={styles.flexCenter}>
        <Ionicons name="alert-circle-outline" size={40} color={COLORS.textLight} />
        <Text style={styles.errorText}>{error || "Product not found."}</Text>
      </View>
    );
  }

  const allImages = [
    product.image_url,
    ...(product.product_images?.map((img) => img.image_url) || []),
  ].filter(Boolean);

  const typeColor =
    product.listing_type === "sell"
      ? COLORS.sell
      : product.listing_type === "rent"
      ? COLORS.rent
      : COLORS.exchange;

  const formatPriceDisplay = () => {
    if (product.listing_type === "exchange" && !product.also_exchange) return null;
    
    const formattedPrice = formatPrice(product.price);
    
    if (product.listing_type === "rent") {
      return `${formattedPrice} DA/month`;
    }
    return `${formattedPrice} DA`;
  };
  
  const isExchangeDisplayActive = product.also_exchange || product.listing_type === "exchange";


  const getConditionText = () => {
    if (!product.condition) return "Condition not specified";
    
    return product.condition.charAt(0).toUpperCase() + product.condition.slice(1);
  };

  const getInitials = () => {
    if (userInfo?.username) {
      return userInfo.username.charAt(0).toUpperCase();
    }
    return 'U';
  };

  const getJoinedDate = () => {
    if (userInfo?.created_at) {
      const date = new Date(userInfo.created_at);
      return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    }
    return 'Recently';
  };

  return (
    <SafeAreaView style={styles.flexContainer}>
      <View style={styles.stickyHeader}>
        <TouchableOpacity style={styles.headerBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={COLORS.secondary} />
        </TouchableOpacity>
        <View style={styles.rightIcons}>
          {!isOwner && (
            <TouchableOpacity style={styles.headerBtn} onPress={toggleFavorite}>
              <Ionicons
                name={isFavorite ? "heart" : "heart-outline"}
                size={22}
                color={isFavorite ? "#FF5B5B" : COLORS.secondary}
              />
            </TouchableOpacity>
          )}
          
          {isOwner ? (
            <TouchableOpacity style={styles.headerBtn} onPress={handleEditProduct}>
              <Ionicons name="create-outline" size={22} color={COLORS.secondary} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.headerBtn} onPress={() => setShowMenu(true)}>
              <Ionicons name="ellipsis-horizontal" size={22} color={COLORS.secondary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.imageSection}>
          <ScrollView
            ref={scrollRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={handleScroll}
            scrollEventThrottle={16}
          >
            {allImages.map((img, index) => (
              <Image
                key={index}
                source={{
                  uri: img || "https://placehold.co/600x660/333333/FFFFFF?text=Product+Image",
                }}
                style={styles.productImage}
              />
            ))}
          </ScrollView>

          {allImages.length > 1 && (
            <View style={styles.paginationContainer}>
              {allImages.map((_, index) => (
                <View
                  key={index}
                  style={[
                    styles.dot,
                    { backgroundColor: index === activeIndex ? COLORS.white : "rgba(255,255,255,0.4)" },
                  ]}
                />
              ))}
            </View>
          )}
        </View>

        <View style={styles.detailsCard}>
          <Text style={styles.title}>{product.name}</Text>
          <Text style={styles.condition}>Conditon - {getConditionText()}</Text>

          {/* Enhanced Price Display with Gradient for Exchange */}
          {isExchangeDisplayActive ? (
            <View style={styles.exchangePriceContainer}>
              <LinearGradient
                colors={[COLORS.exchangeGradientStart, COLORS.exchangeGradientEnd]}
                start={{ x: 0, y: 0.5 }}
                end={{ x: 1, y: 0.5 }}
                style={styles.exchangeGradient}
              >
                {/* 1. Price is now styled with COLORS.sell (Blue) */}
                <Text style={styles.exchangePriceTextBlue}> 
                  {formatPrice(product.price)} DA
                </Text>
                <View style={styles.exchangeDivider} />
                 {/* 2. Label is now styled with COLORS.exchange (Purple) */}
                <Text style={styles.exchangeLabelTextPurple}> 
                  Exchange
                </Text>
              </LinearGradient>
            </View>
          ) : (
            <View style={[styles.priceRow, { backgroundColor: `${typeColor}15` }]}>
              <Text style={{ fontSize: 20, fontWeight: "700", color: typeColor }}>
                {formatPriceDisplay()}
              </Text>
            </View>
          )}

          {product.hasShipping && (
            <View style={styles.shippingContainer}>
              <MaterialCommunityIcons name="truck-delivery" size={20} color={COLORS.primary} />
              <Text style={styles.shippingText}>Shipping available</Text>
            </View>
          )}
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionHeader}>Description</Text>
          <Text style={styles.descriptionText}>
            {product.description.length > 150
              ? product.description.substring(0, 150)
              : product.description}
            {product.description.length > 150 && (
              <Text style={styles.seeMore}>... See more</Text>
            )}
          </Text>

          <View style={styles.postedRow}>
            <Text style={styles.postedDate}>Posted on {product.created_at}</Text>
            {likesCount > 0 && (
              <View style={styles.likesContainer}>
                <Ionicons name="heart" size={16} color="#FF3B30" />
                <Text style={styles.likesText}>{likesCount}</Text>
              </View>
            )}
          </View>
        </View>

        {userInfo && (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionHeader}>Posted by</Text>
            
            <TouchableOpacity 
              style={styles.userContainerWrapper}
              onPress={navigateToSellerProfile} 
            >
              <View style={styles.userContainer}>
                {userInfo.profile_image_url ? (
                  <Image 
                    source={{ uri: userInfo.profile_image_url }} 
                    style={styles.userAvatar}
                  />
                ) : (
                  <View style={styles.userAvatarPlaceholder}>
                    <Text style={styles.userAvatarText}>{getInitials()}</Text>
                  </View>
                )}
                <View style={styles.userInfo}>
                  <Text style={styles.userName}>{userInfo.username}</Text>
                  {userInfo.bio && (
                    <Text style={styles.userBio} numberOfLines={2}>{userInfo.bio}</Text>
                  )}
                  <Text style={styles.userMeta}>Joined {getJoinedDate()}</Text>
                </View>
                <Ionicons name="chevron-forward" size={22} color={COLORS.textLight} />
              </View>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.sectionCard}>
          <Image
            source={{ uri: "https://api.mapbox.com/styles/v1/mapbox/dark-v10/static/3.39,36.76,11,0/400x300@2x?access_token=pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpejY4NXVycTA2emYycXBndHRqcmZ3N3gifQ.rJcFIG214AriISLbB6B5aw" }}
            style={styles.mapImage}
          />
          <Text style={styles.mapCaption}>Map is approximate to keep seller's location private.</Text>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {!isOwner && (
        <View style={styles.bottomButtons}>
          <TouchableOpacity style={styles.callButton}>
            <Text style={styles.callButtonText}>Call</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.chatButton}>
            <Text style={styles.chatButtonText}>Chat</Text>
          </TouchableOpacity>
        </View>
      )}

      {isOwner && (
        <View style={styles.bottomButtons}>
          <TouchableOpacity style={styles.deleteButton} onPress={handleDeleteProduct}>
            <Ionicons name="trash-outline" size={20} color="#EF4444" />
            <Text style={styles.deleteButtonText}>Delete</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.editButton} onPress={handleEditProduct}>
            <Ionicons name="create-outline" size={20} color="#fff" />
            <Text style={styles.editButtonText}>Edit Product</Text>
          </TouchableOpacity>
        </View>
      )}

      <Modal
        animationType="slide"
        transparent
        visible={showMenu && !isOwner}
        onRequestClose={() => setShowMenu(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPressOut={() => setShowMenu(false)}
        >
          <View style={styles.bottomSheet}>
            <TouchableOpacity style={styles.menuItem}>
              <Ionicons name="share-social-outline" size={22} color={COLORS.secondary} />
              <Text style={styles.menuText}>Share item</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuItem}>
              <Ionicons name="flag-outline" size={22} color={COLORS.secondary} />
              <Text style={styles.menuText}>Report this item</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuItem}>
              <Ionicons name="link-outline" size={22} color={COLORS.secondary} />
              <Text style={styles.menuText}>Copy link</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
};

// ---
// Style Sheet
// ---

const styles = StyleSheet.create({
  flexContainer: { flex: 1, backgroundColor: COLORS.background },
  flexCenter: { flex: 1, justifyContent: "center", alignItems: "center" },
  container: { flex: 1 },
  loadingText: { marginTop: 10, color: COLORS.secondary },
  errorText: { marginTop: 10, fontSize: 16, color: COLORS.textLight },
  
  stickyHeader: {
    position: 'absolute',
    top: 45,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    zIndex: 1000,
    backgroundColor: 'transparent',
  },
  
  imageSection: { width, height: PRODUCT_IMAGE_HEIGHT },
  productImage: { width, height: "100%" },

  headerBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: COLORS.white,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  rightIcons: { flexDirection: "row", gap: 10 },

  paginationContainer: {
    position: "absolute",
    bottom: 30,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
  },
  dot: { 
    width: 10, 
    height: 10, 
    borderRadius: 5, 
    marginHorizontal: 5 
  },

  detailsCard: {
    backgroundColor: COLORS.white,
    padding: 20,
    marginTop: -20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  
  sectionCard: {
    backgroundColor: COLORS.white,
    padding: 20,
    marginTop: 10,
  },

  title: { 
    fontSize: 20, 
    fontWeight: "700", 
    color: COLORS.secondary, 
    marginBottom: 4 
  },
  
  condition: {
    fontSize: 14,
    color: COLORS.textLight,
    marginBottom: 12,
  },

  priceRow: { 
    flexDirection: "row", 
    alignItems: "center", 
    marginBottom: 12,
    alignSelf: "flex-start",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  
  // New Exchange Price Styles
  exchangePriceContainer: {
    marginBottom: 12,
    alignSelf: "flex-start",
    borderRadius: 12,
    overflow: "hidden", 
  },
  
  exchangeGradient: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 16,
    // LinearGradient handles background
  },
  
  // Custom style for the price text (Blue color)
  exchangePriceTextBlue: {
    fontSize: 20,
    fontWeight: "700",
    color: COLORS.sell, // Use the primary blue color for the price
  },
  
  exchangeDivider: {
    width: 2,
    height: 20,
    backgroundColor: COLORS.exchange,
    marginHorizontal: 12,
    opacity: 0.3,
  },
  
  // Custom style for the label text (Purple color)
  exchangeLabelTextPurple: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.exchange, // Use the exchange purple color for the label
  },
  
  exchangeBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(168, 85, 247, 0.1)",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignSelf: "flex-start",
    marginBottom: 12,
  },
  
  exchangeText: {
    marginLeft: 6,
    color: COLORS.exchange,
    fontWeight: "600",
    fontSize: 14,
  },

  shippingContainer: {
    flexDirection: "row",
    alignItems: "center",
  
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignSelf: "flex-start",
  },
  shippingText: { 
    marginLeft: 8, 
    color: COLORS.primary, 
    fontWeight: "600",
    fontSize: 14,
  },

  sectionHeader: { 
    fontSize: 18, 
    fontWeight: "700", 
    color: COLORS.secondary, 
    marginBottom: 12 
  },
  
  descriptionText: { 
    fontSize: 15, 
    color: COLORS.secondary, 
    lineHeight: 22,
    marginBottom: 12,
  },
  
  seeMore: {
    color: COLORS.primary,
    fontWeight: "600",
  },
  
  postedRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  
  postedDate: { 
    fontSize: 13, 
    color: COLORS.textLight,
  },
  
  likesContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  
  likesText: {
    fontSize: 13,
    color: COLORS.textLight,
    fontWeight: "600",
  },

  userContainerWrapper: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 12,
  },

  userContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  
  userAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },

  userAvatarPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#B695C0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },

  userAvatarText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
  },
  
  userInfo: {
    flex: 1,
  },
  
  userName: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.secondary,
    marginBottom: 2,
  },

  userBio: {
    fontSize: 13,
    color: COLORS.textLight,
    marginBottom: 2,
  },
  
  userMeta: {
    fontSize: 13,
    color: COLORS.textLight,
  },

  mapImage: {
    width: "100%",
    height: 200,
    borderRadius: 12,
    marginBottom: 8,
  },
  
  mapCaption: {
    fontSize: 12,
    color: COLORS.textLight,
    textAlign: "center",
  },

  bottomButtons: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    backgroundColor: COLORS.white,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "#E5E5E5",
    gap: 12,
  },
  
  callButton: {
    flex: 1,
    borderWidth: 2,
    borderColor: COLORS.primary,
    borderRadius: 25,
    paddingVertical: 14,
    alignItems: "center",
  },
  
  callButtonText: {
    color: COLORS.primary,
    fontSize: 16,
    fontWeight: "700",
  },
  
  chatButton: {
    flex: 1,
    backgroundColor: COLORS.primary,
    borderRadius: 25,
    paddingVertical: 14,
    alignItems: "center",
  },
  
  chatButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: "700",
  },

  deleteButton: {
    flex: 1,
    flexDirection: 'row',
    borderWidth: 2,
    borderColor: "#EF4444",
    borderRadius: 25,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  
  deleteButtonText: {
    color: "#EF4444",
    fontSize: 16,
    fontWeight: "700",
  },
  
  editButton: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: COLORS.primary,
    borderRadius: 25,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  
  editButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: "700",
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.3)",
    justifyContent: "flex-end",
  },
  bottomSheet: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingVertical: 10,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 15,
    paddingHorizontal: 20,
  },
  menuText: { fontSize: 16, marginLeft: 10, color: COLORS.secondary },
});

export default ProductDetailScreen;