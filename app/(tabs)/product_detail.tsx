import { useLocalSearchParams } from "expo-router";
import { useRouter } from "expo-router";
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
const PRODUCT_IMAGE_HEIGHT = width * 1.1;

const COLORS = {
  primary: "#00A78F",
  secondary: "#363636",
  textLight: "#8A8A8E",
  price: "#007AFF",
  background: "#FFFFFF",
  border: "#E8E8E8",
  white: "#FFFFFF",
  overlay: "rgba(0,0,0,0.4)",
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

  useEffect(() => {
    if (!productId || Array.isArray(productId)) {
      setLoading(false);
      setError("Invalid Product ID.");
      return;
    }

    const fetchProductDetail = async () => {
      setLoading(true);
      setError(null);
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
            hasShipping: data.listing_type === "sell",
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
      <View style={[styles.flexCenter]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={{ marginTop: 10, color: COLORS.secondary }}>
          Loading product details...
        </Text>
      </View>
    );
  }

  if (error || !product) {
    return (
      <View style={[styles.flexCenter]}>
        <Ionicons name="alert-circle-outline" size={40} color={COLORS.textLight} />
        <Text style={{ marginTop: 10, fontSize: 16, color: COLORS.textLight }}>
          {error || "Product not found."}
        </Text>
      </View>
    );
  }

  const formatPrice = () => {
    if (product.listing_type === "exchange") return "Exchange";
    if (product.listing_type === "rent") return `${product.price} DA/month`;

    return `${product.price} DA`;
  };

  const allImages = [
    product.image_url,
    ...(product.product_images?.map((img) => img.image_url) || []),
  ].filter(Boolean);
 const router = useRouter();
  return (
    <SafeAreaView style={styles.flexContainer}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* --- IMAGE CAROUSEL --- */}
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

          {/* Pagination Dots */}
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

          {/* --- CUSTOM HEADER --- */}
          <View style={styles.headerOverlay}>
            <TouchableOpacity style={styles.headerBtn}  onPress={() => router.back() }>
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

              <TouchableOpacity
                style={styles.headerBtn}
                onPress={() => setShowMenu(true)}
              >
                <Ionicons name="ellipsis-horizontal" size={22} color={COLORS.white} />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* --- DETAILS --- */}
        <View style={styles.detailsPadding}>
          <Text style={styles.title}>{product.name}</Text>
          <Text style={styles.priceText}>{formatPrice()}</Text>
          {product.hasShipping && (
            <View style={styles.shippingContainer}>
              <MaterialCommunityIcons name="truck-delivery" size={20} color={COLORS.primary} />
              <Text style={styles.shippingText}>Shipping available</Text>
            </View>
          )}
          <Text style={styles.descriptionHeader}>Description</Text>
          <Text style={styles.descriptionText}>{product.description}</Text>
        </View>
      </ScrollView>

      {/* --- BOTTOM MENU MODAL --- */}
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
    backgroundColor: "rgba(0,0,0,0.4)",
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

  detailsPadding: { padding: 20 },
  title: { fontSize: 24, fontWeight: "700", color: COLORS.secondary, marginBottom: 5 },
  priceText: { fontSize: 26, fontWeight: "700", color: COLORS.price, marginBottom: 15 },
  shippingContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0,167,143,0.1)",
    padding: 8,
    borderRadius: 8,
    alignSelf: "flex-start",
    marginBottom: 25,
  },
  shippingText: { marginLeft: 8, color: COLORS.primary, fontWeight: "600" },
  descriptionHeader: { fontSize: 18, fontWeight: "700", color: COLORS.secondary, marginBottom: 10 },
  descriptionText: { fontSize: 16, color: COLORS.secondary },

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
  menuText: {
    fontSize: 16,
    marginLeft: 10,
    color: COLORS.secondary,
  },
});

export default ProductDetailScreen;
