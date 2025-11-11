import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
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
import i18n from '../../lib/i18n';

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
  sell: "#007AFF",
  rent: "#F59E0B",
  exchange: "#A855F7",
  exchangeGradientStart: "#E0E7FF",
  exchangeGradientEnd: "#F3E8FF",
};

/**
 * Price formatting for compact display (e.g., 9.2K, 1.5M). 
 * This is used for the Exchange banner display.
 */
const formatPrice = (price: number): string => {
  if (price >= 1000000) {
    const divided = price / 1000000;
    if (divided % 1 === 0) {
      return `${Math.floor(divided)}M`;
    } else {
      return `${divided.toFixed(1)}M`;
    }
  } else if (price >= 1000) {
    const divided = price / 1000;
    
    if (divided % 1 === 0) {
      return `${Math.floor(divided)}K`;
    } else {
      return `${divided.toFixed(1)}K`;
    }
  }
  return price.toLocaleString();
};

/**
 * FIX: Price formatting function for the main display, now supporting:
 * 1. Price < 1000: Display numerically (e.g., 500)
 * 2. 1000 <= Price < 10000: Display with 'K' suffix (e.g., 9000 -> 9K)
 * 3. Price >= 10000: Display with 'million' text (e.g., 10000 -> 1 million)
 */
const formatPriceMainDisplay = (product: ProductDetail): string | null => {
  // If it's pure exchange, return null (handled by exchange badge logic)
  if (product.listing_type === "exchange" && !product.also_exchange) return null;
  
  const price = product.price;
  const isRent = product.listing_type === "rent";
  const suffix = isRent ? i18n.t('product.priceSuffixDAMonth') : i18n.t('product.priceSuffixDA');
  
  if (price >= 10000) {
    // 3. Price >= 10000: Display with 'million' text
    const millions = price / 10000; 
    let formattedMillions;

    if (millions % 1 === 0) {
      formattedMillions = millions.toString();
    } else if (millions >= 10) {
      formattedMillions = Math.round(millions).toString();
    } else {
      formattedMillions = millions.toFixed(1);
    }
    
    return `${formattedMillions} ${i18n.t('productDetail.million')} ${suffix}`;
    
  } else if (price >= 1000) {
    // 2. 1000 <= Price < 10000: Display with 'K' suffix
    const formattedK = formatPrice(price); // Use the K/M formatter for this range
    
    // Adjust suffix to correctly combine DA and /month if needed
    if (isRent) {
      // Example: 9K DA/month (using priceSuffixDA and perMonth)
      return `${formattedK} ${i18n.t('productDetail.priceSuffixDA')}${i18n.t('productDetail.perMonth')}`;
    }
    // Example: 9K DA
    return `${formattedK} ${i18n.t('productDetail.priceSuffixDA')}`;
    
  } else {
    // 1. Price < 1000: Display numerically
    return `${price.toLocaleString()} ${suffix}`;
  }
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
      // FIX: Ensure both currentUserId and productId are available.
      if (!currentUserId || !productId) {
        setIsFavorite(false); // Default to false if we can't check
        return;
      }

      try {
        const { data, error } = await supabase
          .from('likes')
          .select('like_id')
          .eq('user_id', currentUserId)
          .eq('product_id', productId)
          .single();

        // FIX: Explicitly check for data presence. 
        if (data) {
          setIsFavorite(true);
        } else {
          setIsFavorite(false);
        }

        // Handle actual errors, ignoring the expected 'no rows' error (PGRST116)
        if (error && error.code !== 'PGRST116') {
            throw error;
        }

      } catch (error) {
        // Fallback catch: ensures isFavorite is false if any check fails
        setIsFavorite(false);
        // console.log('Product not liked or error occurred during check:', error); 
      }
    };
    checkIfLiked();
  }, [currentUserId, productId]);

  useEffect(() => {
    if (!productId || Array.isArray(productId)) {
      setLoading(false);
      setError(i18n.t('productDetail.productNotFound'));
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
            description: data.description || i18n.t('productDetail.noDescription'),
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
          setError(i18n.t('productDetail.productNotFound'));
        }
      } catch (e: any) {
        Alert.alert(i18n.t('productDetail.error'), e.message || i18n.t('productDetail.errorMessage'));
        setError(i18n.t('productDetail.errorLoading'));
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
      Alert.alert(i18n.t('productDetail.loginRequired'), i18n.t('productDetail.loginRequiredMessage'));
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
      Alert.alert(i18n.t('productDetail.error'), i18n.t('productDetail.failedToUpdateLike'));
    }
  };

  const navigateToSellerProfile = () => {
    if (!userInfo?.user_id) {
      Alert.alert(i18n.t('productDetail.error'), i18n.t('productDetail.sellerNotAvailable'));
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
      i18n.t('productDetail.deleteTitle'),
      i18n.t('productDetail.deleteMessage'),
      [
        {
          text: i18n.t('productDetail.cancel'),
          style: 'cancel'
        },
        {
          text: i18n.t('productDetail.deleteConfirm'),
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('products')
                .delete()
                .eq('id', productId);

              if (error) throw error;

              Alert.alert(i18n.t('productDetail.deleteSuccess'), i18n.t('productDetail.deleteSuccessMessage'), [
                {
                  text: i18n.t('productDetail.ok'),
                  onPress: () => router.back()
                }
              ]);
            } catch (error: any) {
              console.error('Error deleting product:', error);
              Alert.alert(i18n.t('productDetail.deleteError'), i18n.t('productDetail.deleteErrorMessage'));
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
        <Text style={styles.loadingText}>{i18n.t('productDetail.loadingText')}</Text>
      </View>
    );
  }

  if (error || !product) {
    return (
      <View style={styles.flexCenter}>
        <Ionicons name="alert-circle-outline" size={40} color={COLORS.textLight} />
        <Text style={styles.errorText}>{error || i18n.t('productDetail.productNotFound')}</Text>
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

  // Use the main display formatter for the price badge
  const priceDisplay = formatPriceMainDisplay(product);
  
  const isExchangeDisplayActive = product.also_exchange || product.listing_type === "exchange";

  const getConditionText = () => {
    if (!product.condition) return i18n.t('productDetail.conditionNotSpecified');
    
    if (product.condition === 'new') return i18n.t('productDetail.conditionNew');
    if (product.condition === 'used') return i18n.t('productDetail.conditionUsed');
    
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
    return i18n.t('productDetail.recently');
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
              {/* Correctly renders filled red heart if isFavorite is true, and outlined dark heart otherwise */}
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
          <Text style={styles.condition}>
            {i18n.t('productDetail.condition')} - {getConditionText()}
          </Text>

          {isExchangeDisplayActive ? (
            <View style={styles.exchangePriceContainer}>
              <LinearGradient
                colors={[COLORS.exchangeGradientStart, COLORS.exchangeGradientEnd]}
                start={{ x: 0, y: 0.5 }}
                end={{ x: 1, y: 0.5 }}
                style={styles.exchangeGradient}
              >
                {/* Using the compact K/M formatter for the exchange price here */}
                <Text style={styles.exchangePriceTextBlue}> 
                  {formatPrice(product.price)} DA
                </Text>
                <View style={styles.exchangeDivider} />
                <Text style={styles.exchangeLabelTextPurple}> 
                  {i18n.t('productDetail.exchange')}
                </Text>
              </LinearGradient>
            </View>
          ) : (
            // Using the new 'K/million' formatter for the main price display
            priceDisplay && (
                <View style={[styles.priceRow, { backgroundColor: `${typeColor}15` }]}>
                    <Text style={{ fontSize: 20, fontWeight: "700", color: typeColor }}>
                        {priceDisplay}
                    </Text>
                </View>
            )
          )}

          {product.hasShipping && (
            <View style={styles.shippingContainer}>
              <MaterialCommunityIcons name="truck-delivery" size={20} color={COLORS.primary} />
              <Text style={styles.shippingText}>{i18n.t('productDetail.shippingAvailable')}</Text>
            </View>
          )}
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionHeader}>{i18n.t('productDetail.description')}</Text>
          <Text style={styles.descriptionText}>
            {product.description.length > 150
              ? product.description.substring(0, 150)
              : product.description}
            {product.description.length > 150 && (
              <Text style={styles.seeMore}> {i18n.t('productDetail.seeMore')}</Text>
            )}
          </Text>

          <View style={styles.postedRow}>
            <Text style={styles.postedDate}>
              {i18n.t('productDetail.postedOn')} {product.created_at}
            </Text>
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
            <Text style={styles.sectionHeader}>{i18n.t('productDetail.postedBy')}</Text>
            
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
                  <Text style={styles.userMeta}>
                    {i18n.t('productDetail.joined')} {getJoinedDate()}
                  </Text>
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
          <Text style={styles.mapCaption}>{i18n.t('productDetail.mapCaption')}</Text>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {!isOwner && (
        <View style={styles.bottomButtons}>
          <TouchableOpacity style={styles.callButton}>
            <Text style={styles.callButtonText}>{i18n.t('productDetail.call')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.chatButton}>
            <Text style={styles.chatButtonText}>{i18n.t('productDetail.chat')}</Text>
          </TouchableOpacity>
        </View>
      )}

      {isOwner && (
        <View style={styles.bottomButtons}>
          <TouchableOpacity style={styles.deleteButton} onPress={handleDeleteProduct}>
            <Ionicons name="trash-outline" size={20} color="#EF4444" />
            <Text style={styles.deleteButtonText}>{i18n.t('productDetail.delete')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.editButton} onPress={handleEditProduct}>
            <Ionicons name="create-outline" size={20} color="#fff" />
            <Text style={styles.editButtonText}>{i18n.t('productDetail.editProduct')}</Text>
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
              <Text style={styles.menuText}>{i18n.t('productDetail.shareItem')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuItem}>
              <Ionicons name="flag-outline" size={22} color={COLORS.secondary} />
              <Text style={styles.menuText}>{i18n.t('productDetail.reportItem')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuItem}>
              <Ionicons name="link-outline" size={22} color={COLORS.secondary} />
              <Text style={styles.menuText}>{i18n.t('productDetail.copyLink')}</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  flexContainer: { flex: 1, marginBottom:110,backgroundColor: COLORS.background },
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
  },
  
  exchangePriceTextBlue: {
    fontSize: 20,
    fontWeight: "700",
    color: COLORS.sell,
  },
  
  exchangeDivider: {
    width: 2,
    height: 20,
    backgroundColor: COLORS.exchange,
    marginHorizontal: 12,
    opacity: 0.3,
  },
  
  exchangeLabelTextPurple: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.exchange,
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
    paddingBottom: 16,
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