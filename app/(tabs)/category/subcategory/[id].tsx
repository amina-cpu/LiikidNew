import * as Location from "expo-location";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Animated,
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import { supabase } from "../../../../lib/Supabase";

const PRIMARY_TEAL = "#16A085";
const LIGHT_GRAY = "#F5F5F5";
const DARK_GRAY = "#333333";
const ACCENT_RED = "#FF5B5B";
const ORANGE = "#FF6B35";
const BLUE = "#4A90E2";
const CARD_WIDTH = Dimensions.get("window").width / 2 - 24;

// Pagination constants
const INITIAL_PRODUCT_LIMIT = 8;
const LOAD_MORE_INCREMENT = 6;

interface SubSubcategory {
  id: number;
  subcategory_id: number;
  name: string;
  description: string | null;
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
  subcategory_id: number | null;
  sub_subcategory_id: number | null;
  created_at: string;
  delivery: boolean; // Added delivery field
}
const FILTER_TABS = ["All", "Sell", "Rent", "Exchange"];
interface Category {
  id: number;
  name: string;
}

interface Subcategory {
  id: number;
  category_id: number;
  name: string;
}

// Helper for distance
const calculateDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const ProductCard: React.FC<{
  product: Product;
  userLat: number | null;
  userLon: number | null;
}> = ({ product, userLat, userLon }) => {
  const router = useRouter();
  const [liked, setLiked] = useState(false);
  const toggleLike = () => setLiked(!liked);

  let distance = "N/A";
  if (userLat && userLon && product.latitude && product.longitude) {
    const dist = calculateDistance(
      userLat,
      userLon,
      product.latitude,
      product.longitude
    );
    distance = dist < 1 ? `${(dist * 1000).toFixed(0)} m` : `${dist.toFixed(1)} km`;
  }

  const formatPrice = () => {
    if (product.listing_type === "exchange") return "Exchange";
    if (product.listing_type === "rent")
      return `${product.price.toLocaleString()} DA/month`;
    return `${product.price.toLocaleString()} DA`;
  };

  const getPriceColor = () => {
    if (product.listing_type === "exchange") return "#9B59B6";
    if (product.listing_type === "rent") return ORANGE;
    return BLUE;
  };

  return (
    <View style={styles.cardContainer}>
      <TouchableOpacity
        style={styles.cardTouchable}
        onPress={() => router.push(`/product_detail?id=${product.id}`)}
      >
        <View style={styles.imageWrapper}>
          <Image
            source={{
              uri:
                product.image_url ||
                "https://placehold.co/180x180/E0E0E0/333333?text=No+Image",
            }}
            style={styles.cardImage}
          />
          {/* Show delivery badge only if delivery is true */}
          {product.delivery && (
            <View style={styles.deliveryBadge}>
              <MaterialCommunityIcons
                name="truck-delivery"
                size={16}
                color={PRIMARY_TEAL}
              />
            </View>
          )}
          <TouchableOpacity onPress={toggleLike} style={styles.heartIcon}>
            <Ionicons
              name={liked ? "heart" : "heart-outline"}
              size={24}
              color={liked ? ACCENT_RED : "white"}
            />
          </TouchableOpacity>
        </View>
        <View style={styles.cardDetails}>
          <Text style={[styles.cardPrice, { color: getPriceColor() }]}>
            {formatPrice()}
          </Text>
          <Text style={styles.cardTitle} numberOfLines={2}>
            {product.name}
          </Text>
          <View style={styles.distanceContainer}>
            <Ionicons name="location-outline" size={14} color={PRIMARY_TEAL} />
            <Text style={styles.cardDistance}>{distance}</Text>
          </View>
        </View>
      </TouchableOpacity>
    </View>
  );
};

// Load More Button with Hover Animation and Loading Indicator
const LoadMoreButton: React.FC<{ onPress: () => void; loading: boolean }> = ({
  onPress,
  loading,
}) => {
  const scaleAnim = new Animated.Value(1);
  const translateYAnim = new Animated.Value(0);

  const handlePressIn = () => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 0.95,
        useNativeDriver: true,
      }),
      Animated.spring(translateYAnim, {
        toValue: -5,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handlePressOut = () => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
      }),
      Animated.spring(translateYAnim, {
        toValue: 0,
        useNativeDriver: true,
      }),
    ]).start();
  };

  return (
    <Animated.View
      style={[
        styles.loadMoreContainer,
        {
          transform: [{ scale: scaleAnim }, { translateY: translateYAnim }],
        },
      ]}
    >
      <TouchableOpacity
        style={styles.loadMoreButton}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={0.9}
        disabled={loading} // Disable button while loading
      >
        {loading ? (
          <ActivityIndicator size="small" color="white" />
        ) : (
          <Text style={styles.loadMoreText}>Load More Items</Text>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
};

export default function SubcategoryScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const subcategoryId = params.id ? Number(params.id) : null;

  const [subSubcategories, setSubSubcategories] = useState<SubSubcategory[]>([]);
  // products holds the current list of products loaded via pagination
  const [products, setProducts] = useState<Product[]>([]);
  // filteredProducts is the view after applying client-side filters (brand, type, search)
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [selectedBrand, setSelectedBrand] = useState<number | null>(null);
  const [userLat, setUserLat] = useState<number | null>(null);
  const [userLon, setUserLon] = useState<number | null>(null);
  const [location, setLocation] = useState<string>("Loading...");
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  // Flag to know if there are more products to fetch from the server
  const [hasMoreProducts, setHasMoreProducts] = useState(true);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // For breadcrumb
  const [category, setCategory] = useState<Category | null>(null);
  const [subcategory, setSubcategory] = useState<Subcategory | null>(null);

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status === "granted") {
        let coords = await Location.getCurrentPositionAsync({});
        setUserLat(coords.coords.latitude);
        setUserLon(coords.coords.longitude);

        let reverse = await Location.reverseGeocodeAsync(coords.coords);
        if (reverse.length > 0) {
          let city = reverse[0].city || reverse[0].region || "Unknown";
          setLocation(city);
        }
      } else {
        setLocation("Location unavailable");
      }
    })();
  }, []);

  useEffect(() => {
    if (subcategoryId) {
      // Pass true for initial load
      fetchData(true);
    }
  }, [subcategoryId]);

  // Filter products whenever products or filter state changes
  useEffect(() => {
    let filtered = products;

    // Filter by brand
    if (selectedBrand) {
      filtered = filtered.filter(p => p.sub_subcategory_id === selectedBrand);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      filtered = filtered.filter(p =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredProducts(filtered);
  }, [selectedBrand, searchQuery, products]);

  const fetchProducts = async (isInitialLoad: boolean) => {
    if (!subcategoryId) return;

    const from = isInitialLoad ? 0 : products.length;
    const limit = isInitialLoad ? INITIAL_PRODUCT_LIMIT : LOAD_MORE_INCREMENT;
    const to = from + limit - 1;

    // Only show the spinner inside the button for non-initial load
    if (!isInitialLoad) {
        setLoadingMore(true);
    }

    try {
        // Fetch products with range for pagination and count for total
        const { data: productData, error: productError, count } = await supabase
          .from("products")
          .select("id, name, price, listing_type, image_url, latitude, longitude, location_address, subcategory_id, sub_subcategory_id, created_at, delivery", { count: "exact" })
          .eq("subcategory_id", subcategoryId)
          .order("created_at", { ascending: false })
          .range(from, to);

        if (productError) throw productError;

        const newProducts = productData || [];

        // Update the main products list
        setProducts(prevProducts =>
            isInitialLoad ? newProducts : [...prevProducts, ...newProducts]
        );

        // Check if the total count is greater than the total number of items currently loaded
        setHasMoreProducts((count || 0) > (isInitialLoad ? newProducts.length : products.length + newProducts.length));

    } catch (e: any) {
        Alert.alert("Error", e.message);
    } finally {
        if (!isInitialLoad) {
          setLoadingMore(false);
        }
    }
  };

  const fetchData = async (isInitialLoad: boolean) => {
    setLoading(true);
    try {
      // Fetch subcategory details
      const { data: subcategoryData, error: subcategoryError } = await supabase
        .from("subcategories")
        .select("id, category_id, name")
        .eq("id", subcategoryId)
        .single();

      if (subcategoryError) throw subcategoryError;
      setSubcategory(subcategoryData);

      // Fetch category details
      if (subcategoryData?.category_id) {
        const { data: categoryData, error: categoryError } = await supabase
          .from("categories")
          .select("id, name")
          .eq("id", subcategoryData.category_id)
          .single();

        if (categoryError) throw categoryError;
        setCategory(categoryData);
      }

      // Fetch sub-subcategories (brands)
      const { data: brands, error: brandError } = await supabase
        .from("sub_subcategories")
        .select("id, subcategory_id, name, description")
        .eq("subcategory_id", subcategoryId)
        .order("name");

      if (brandError) throw brandError;
      setSubSubcategories(brands || []);

      // Fetch initial products
      await fetchProducts(isInitialLoad);

    } catch (e: any) {
      Alert.alert("Error", e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLoadMore = () => {
    // Only allow loading more if no client-side filters are active
    if (selectedBrand === null && !searchQuery.trim()) {
      fetchProducts(false);
    } else {
      Alert.alert(
        "Filter Active",
        "Please clear the Brand and Search filters to load more items from the server."
      );
    }
  };

  const openFilters = () => {
    router.push("/filters");
  };

  if (loading && products.length === 0) {
    return (
      <View style={[styles.safeArea, styles.loadingContainer]}>
        <ActivityIndicator size="large" color={PRIMARY_TEAL} />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.safeArea}>
      <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Header with Search */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={PRIMARY_TEAL} />
          </TouchableOpacity>
          <View
            style={[
              styles.searchBar,
              isSearchFocused && styles.searchBarFocused,
            ]}
          >
            <Ionicons
              name="search"
              size={20}
              color="#999"
              style={styles.searchIcon}
            />
            <TextInput
              style={styles.searchInput}
              placeholder={`Search ${subcategory?.name || "items"}`}
              placeholderTextColor="#999"
              value={searchQuery}
              onChangeText={setSearchQuery}
              onFocus={() => setIsSearchFocused(true)}
              onBlur={() => setIsSearchFocused(false)}
            />
          </View>
          <View style={styles.locationContainer}>
            <Ionicons name="location-sharp" size={20} color={PRIMARY_TEAL} />
            <Text style={styles.locationText} numberOfLines={1}>{location}</Text>
          </View>
        </View>
<View style={styles.filterTabsWrapper}>
          <View style={styles.filterTabs}>
            {FILTER_TABS.map((tab) => (
              <TouchableOpacity
                key={tab}
                style={[
                  styles.filterButton,
                  selectedFilter === tab && styles.filterButtonActive,
                  selectedFilter === tab &&
                    tab === "Sell" && { backgroundColor: BLUE },
                  selectedFilter === tab &&
                    tab === "Rent" && { backgroundColor: ORANGE },
                  selectedFilter === tab &&
                    tab === "Exchange" && { backgroundColor: "#8E44AD" },
                ]}
                onPress={() => setSelectedFilter(tab)}
              >
                <Text
                  style={[
                    styles.filterText,
                    selectedFilter === tab && styles.filterTextActive,
                  ]}
                >
                  {tab}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
        {/* Breadcrumb */}
        <View style={styles.breadcrumbContainer}>
          <TouchableOpacity onPress={() => router.push(`/category/${category?.id}`)}>
            <Text style={styles.breadcrumbText}>
              {category?.name || "Category"}
            </Text>
          </TouchableOpacity>
          <Ionicons name="chevron-forward" size={16} color="#999" style={styles.breadcrumbArrow} />
          <Text style={[styles.breadcrumbText, styles.breadcrumbActive]}>
            {subcategory?.name || "Subcategory"}
          </Text>
        </View>

        {/* Brand Pills (Sub-subcategories) */}
        {subSubcategories.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.brandScroll}
          >
            <TouchableOpacity
              style={[
                styles.brandPill,
                selectedBrand === null && styles.brandPillActive,
              ]}
              onPress={() => setSelectedBrand(null)}
            >
              <Text style={[
                styles.brandText,
                selectedBrand === null && styles.brandTextActive
              ]}>
                All
              </Text>
            </TouchableOpacity>
            {subSubcategories.map((brand) => (
              <TouchableOpacity
                key={brand.id}
                style={[
                  styles.brandPill,
                  selectedBrand === brand.id && styles.brandPillActive,
                ]}
                onPress={() =>
                  setSelectedBrand(selectedBrand === brand.id ? null : brand.id)
                }
              >
                <Text style={[
                  styles.brandText,
                  selectedBrand === brand.id && styles.brandTextActive
                ]}>
                  {brand.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* Product Grid */}
        {filteredProducts.length === 0 ? (
          <Text style={styles.emptyText}>No products found</Text>
        ) : (
          <View style={styles.productGrid}>
            {filteredProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                userLat={userLat}
                userLon={userLon}
              />
            ))}
          </View>
        )}

        {/* Load More Button - Only shows if no filters are active AND there are more products on the server */}
        {selectedBrand === null && !searchQuery.trim() && hasMoreProducts && (
            <LoadMoreButton onPress={handleLoadMore} loading={loadingMore} />
        )}

      </ScrollView>

      {/* Floating Filter Button */}
      <TouchableOpacity style={styles.floatingFilterButton} onPress={openFilters}>
        <View style={styles.filterIconContainer}>
          <Image
            source={require("../../../../assets/icons/floating.png")}
            style={styles.floatingImageIcon}
          />
        </View>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "white",
    paddingTop: 40,
  },
  loadingContainer: {
    justifyContent: "center",
    alignItems: "center",
    flex: 1,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: DARK_GRAY,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  backButton: {
    marginRight: 10,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    height: 44,
    backgroundColor: LIGHT_GRAY,
    borderRadius: 22,
    marginRight: 10,
    paddingHorizontal: 15,
  },
  searchBarFocused: {
    borderWidth: 2,
    borderColor: PRIMARY_TEAL,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: DARK_GRAY,
    paddingVertical: 0,
  },
  locationContainer: {
    flexDirection: "row",
    alignItems: "center",
    maxWidth: 100,
  },
  locationText: {
    marginLeft: 4,
    fontSize: 13,
    fontWeight: "600",
    color: DARK_GRAY,
  },
  breadcrumbContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    marginTop: 8,
    marginBottom: 16,
  },
  breadcrumbText: {
    fontSize: 14,
    color: "#999",
    fontWeight: "500",
  },
  breadcrumbArrow: {
    marginHorizontal: 4,
  },
  breadcrumbActive: {
    color: DARK_GRAY,
    fontWeight: "600",
  },
  brandScroll: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  brandPill: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    marginRight: 10,
    borderRadius: 8,
    backgroundColor: LIGHT_GRAY,
    borderWidth: 0,
  },
  brandPillActive: {
    backgroundColor: PRIMARY_TEAL,
    borderWidth: 0,
  },
  brandText: {
    fontSize: 14,
    fontWeight: "600",
    color: DARK_GRAY,
  },
  brandTextActive: {
    color: "white",
  },
  productGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    paddingHorizontal: 16,
  },
  cardContainer: {
    width: CARD_WIDTH,
    marginBottom: 16,
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
  },
  cardImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  deliveryBadge: {
    position: "absolute",
    top: 10,
    left: 10,
    backgroundColor: "white",
    padding: 6,
    borderRadius: 8,
  },
  heartIcon: {
    position: "absolute",
    top: 10,
    right: 10,
    padding: 5,
  },
  cardDetails: {
    padding: 12,
  },
  cardPrice: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 4,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: "500",
    color: DARK_GRAY,
    minHeight: 36,
  },
  distanceContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  cardDistance: {
    marginLeft: 4,
    fontSize: 12,
    color: "#666",
  },
  emptyText: {
    textAlign: "center",
    fontSize: 16,
    color: "#999",
    marginVertical: 20,
  },
  loadMoreContainer: {
    marginHorizontal: 16,
    marginTop: 20,
    marginBottom: 20,
    shadowColor: PRIMARY_TEAL,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  loadMoreButton: {
    backgroundColor: PRIMARY_TEAL,
    borderRadius: 30,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  loadMoreText: {
    color: "white",
    fontSize: 16,
    fontWeight: "700",
  },
  floatingFilterButton: {
    position: "absolute",
    bottom: 30,
    right: 20,
    backgroundColor: PRIMARY_TEAL,
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  filterIconContainer: {
    position: "relative",
  },
  floatingImageIcon: {
    width: 28,
    height: 28,
    resizeMode: "contain",
    tintColor: "white",
  },
  filterBadge: {
    position: "absolute",
    top: -8,
    right: -8,
    backgroundColor: ACCENT_RED,
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "white",
  },
  filterBadgeText: {
    color: "white",
    fontSize: 11,
    fontWeight: "700",
  },
});