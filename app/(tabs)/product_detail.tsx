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
};

const ProductDetailScreen = () => {
  const { id: productId } = useLocalSearchParams();
  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [showMenu, setShowMenu] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const router = useRouter();

  // Mock data for user
  const mockUser = {
    name: "Andrea Laxir",
    avatar: "https://i.pravatar.cc/150?img=12",
    joinedDate: "December 2025",
    lastActive: "yesterday",
  };

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
          });
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

  const toggleFavorite = () => setIsFavorite((prev) => !prev);

  if (loading) {
    return (
      <View style={styles.flexCenter}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={{ marginTop: 10, color: COLORS.secondary }}>
          Loading product details...
        </Text>
      </View>
    );
  }

  if (error || !product) {
    return (
      <View style={styles.flexCenter}>
        <Ionicons name="alert-circle-outline" size={40} color={COLORS.textLight} />
        <Text style={{ marginTop: 10, fontSize: 16, color: COLORS.textLight }}>
          {error || "Product not found."}
        </Text>
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

  const formatPrice = () => {
    if (product.listing_type === "exchange") return "Exchange";
    if (product.listing_type === "rent") return `${product.price} DA/month`;
    return `${product.price} DA`;
  };

  return (
    <SafeAreaView style={styles.flexContainer}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* --- IMAGE SECTION --- */}
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

          {/* Pagination dots */}
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

          {/* Header buttons */}
          <View style={styles.headerOverlay}>
            <TouchableOpacity style={styles.headerBtn} onPress={() => router.back()}>
              <Ionicons name="arrow-back" size={22} color={COLORS.white} />
            </TouchableOpacity>
            <View style={styles.rightIcons}>
              <TouchableOpacity style={styles.headerBtn} onPress={toggleFavorite}>
                <Ionicons
                  name={isFavorite ? "heart" : "heart-outline"}
                  size={22}
                  color={COLORS.white}
                />
              </TouchableOpacity>
              <TouchableOpacity style={styles.headerBtn} onPress={() => setShowMenu(true)}>
                <Ionicons name="ellipsis-horizontal" size={22} color={COLORS.white} />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* --- DETAILS CARD --- */}
        <View style={styles.detailsCard}>
          <Text style={styles.title}>{product.name}</Text>
          <Text style={styles.condition}>Used - Good</Text>

          <View style={[styles.priceRow, { backgroundColor: `${typeColor}15` }]}>
            <Text style={[styles.priceText, { color: typeColor }]}>
              {product.listing_type === "exchange" ? "Exchange" : `${product.price} DA`}
            </Text>
            <Text style={styles.separator}>–</Text>
            <Text style={[styles.typeText, { color: typeColor }]}>
              {product.listing_type.charAt(0).toUpperCase() + product.listing_type.slice(1)}
            </Text>
          </View>

          {product.hasShipping && (
            <View style={styles.shippingContainer}>
              <MaterialCommunityIcons name="truck-delivery" size={20} color={COLORS.primary} />
              <Text style={styles.shippingText}>Shipping available</Text>
            </View>
          )}
        </View>

        {/* --- DESCRIPTION CARD --- */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionHeader}>Description</Text>
          <Text style={styles.descriptionText}>
            {product.description.length > 150 
              ? `${product.description.substring(0, 150)}... ` 
              : product.description}
            {product.description.length > 150 && (
              <Text style={styles.seeMore}>See more</Text>
            )}
          </Text>
          <View style={styles.postedRow}>
            <Text style={styles.postedDate}>Posted on {product.created_at}</Text>
            <View style={styles.likesContainer}>
              <Ionicons name="heart" size={16} color="#FF3B30" />
              <Text style={styles.likesText}>55</Text>
            </View>
          </View>
        </View>

        {/* --- POSTED BY CARD --- */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionHeader}>Posted by</Text>
          <TouchableOpacity style={styles.userContainer}>
            <Image 
              source={{ uri: mockUser.avatar }} 
              style={styles.userAvatar}
            />
            <View style={styles.userInfo}>
              <Text style={styles.userName}>{mockUser.name}</Text>
              <Text style={styles.userMeta}>Joined {mockUser.joinedDate}</Text>
              <Text style={styles.userMeta}>Last active {mockUser.lastActive}</Text>
            </View>
            <Ionicons name="chevron-forward" size={22} color={COLORS.textLight} />
          </TouchableOpacity>
        </View>

        {/* --- MAP CARD --- */}
        <View style={styles.sectionCard}>
          <Image
            source={{ uri: "https://api.mapbox.com/styles/v1/mapbox/dark-v10/static/3.39,36.76,11,0/400x300@2x?access_token=pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpejY4NXVycTA2emYycXBndHRqcmZ3N3gifQ.rJcFIG214AriISLbB6B5aw" }}
            style={styles.mapImage}
          />
          <Text style={styles.mapCaption}>Map is approximate to keep seller's location private.</Text>
        </View>

        {/* Bottom padding */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* --- FIXED BOTTOM BUTTONS --- */}
      <View style={styles.bottomButtons}>
        <TouchableOpacity style={styles.callButton}>
          <Text style={styles.callButtonText}>Call</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.chatButton}>
          <Text style={styles.chatButtonText}>Chat</Text>
        </TouchableOpacity>
      </View>

      {/* --- BOTTOM SHEET MENU --- */}
      <Modal
        animationType="slide"
        transparent
        visible={showMenu}
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

const styles = StyleSheet.create({
  flexContainer: { flex: 1, backgroundColor: COLORS.background },
  flexCenter: { flex: 1, justifyContent: "center", alignItems: "center" },
  container: { flex: 1 },
  imageSection: { width, height: PRODUCT_IMAGE_HEIGHT },
  productImage: { width, height: "100%" },

  headerOverlay: {
    position: "absolute",
    top: 50,
    left: 15,
    right: 15,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  headerBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(0,0,0,0.25)",
    justifyContent: "center",
    alignItems: "center",
  },
  rightIcons: { flexDirection: "row", gap: 10 },

  paginationContainer: {
    position: "absolute",
    bottom: 20,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
  },
  dot: { width: 8, height: 8, borderRadius: 4, marginHorizontal: 4 },

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
  
  priceText: { 
    fontSize: 20, 
    fontWeight: "700" 
  },
  
  separator: {
    fontSize: 20,
    color: COLORS.textLight,
    marginHorizontal: 8,
  },
  
  typeText: { 
    fontSize: 20, 
    fontWeight: "600" 
  },

  shippingContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0,167,143,0.1)",
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
  
  userInfo: {
    flex: 1,
  },
  
  userName: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.secondary,
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