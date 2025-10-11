import * as Location from "expo-location";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import FontAwesome from "react-native-vector-icons/FontAwesome";
import Ionicons from "react-native-vector-icons/Ionicons";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import { supabase } from "../../lib/Supabase";

const PRIMARY_TEAL = "#16A085";
const LIGHT_GRAY = "#F5F5F5";
const DARK_GRAY = "#333333";
const ACCENT_RED = "#FF5B5B";
const ORANGE = "#FF6B35";
const BLUE = "#4A90E2";
const CARD_WIDTH = Dimensions.get("window").width / 2 - 24;
const SAFE_AREA_PADDING = 40;
const TAB_BAR_HEIGHT = 90;

// Pagination constants
const INITIAL_PRODUCT_LIMIT = 8;
const LOAD_MORE_INCREMENT = 6;

type IconName =
  | "home"
  | "car"
  | "cog"
  | "wrench"
  | "mobile"
  | "laptop"
  | "shopping-bag"
  | "cutlery"
  | "soccer-ball-o"
  | "camera";

interface Category {
  id: number;
  name: string;
  description: string | null;
  delivery: boolean;
  hasResults?: boolean; // For search mode
  productCount?: number; // For search mode
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

const FILTER_TABS = ["All", "Sell", "Rent", "Exchange"];

// Map category names to icons and colors
const getCategoryIcon = (categoryName: string): IconName => {
  const name = categoryName.toLowerCase();
  if (name.includes("real estate") || name.includes("property")) return "home";
  if (name.includes("vehicle") || name.includes("car")) return "car";
  if (name.includes("phone")) return "mobile";
  if (name.includes("computer") || name.includes("laptop")) return "laptop";
  if (name.includes("clothing") || name.includes("fashion"))
    return "shopping-bag";
  if (name.includes("food")) return "cutlery";
  if (name.includes("sport")) return "soccer-ball-o";
  if (name.includes("camera") || name.includes("photo")) return "camera";
  return "cog";
};

const CATEGORY_COLORS = [
  ORANGE,
  BLUE,
  DARK_GRAY,
  "#8E44AD",
  "#E91E63",
  "#16A085",
  "#F39C12",
  "#16A085",
];

const getCategoryColor = (index: number): string => {
  return CATEGORY_COLORS[index % CATEGORY_COLORS.length];
};

// Calculate distance between two coordinates using Haversine formula
const calculateDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const CategoryButton: React.FC<{ 
  category: Category; 
  index: number;
  searchMode: boolean;
  searchQuery: string;
}> = ({
  category,
  index,
  searchMode,
  searchQuery,
}) => {
  const router = useRouter();
  const bgColor = getCategoryColor(index);

  const handlePress = () => {
    if (searchMode) {
      // Navigate to category with search query
      router.push({
        pathname: `/category`,
        params: {
          id: category.id,
          searchQuery: searchQuery,
          searchMode: 'true',
        },
      });
    } else {
      // Normal navigation
      router.push(`/category?id=${category.id}`);
    }
  };

  return (
    <TouchableOpacity
      style={[styles.categoryButton, { backgroundColor: bgColor }]}
      onPress={handlePress}
    >
      {/* Red dot indicator for categories with search results */}
      {searchMode && category.hasResults && (
        <View style={styles.redDot} />
      )}
      <FontAwesome name={getCategoryIcon(category.name)} size={28} color="white" />
      <Text style={styles.categoryText}>{category.name}</Text>
    </TouchableOpacity>
  );
};

const ProductCard: React.FC<{
  product: Product;
  userLat: number | null;
  userLon: number | null;
  categories: Category[];
}> = ({ product, userLat, userLon, categories }) => {
  const router = useRouter();
  const [liked, setLiked] = useState(false);
  const toggleLike = () => setLiked(!liked);

  // Check if product's category accepts delivery
  const category = categories.find((c) => c.id === product.category_id);
  const categoryAcceptsDelivery = category?.delivery || false;

  // Calculate distance
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

  // Format price
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
        onPress={() => router.push(`/product_detail?id=${product.id}`)}
        style={styles.cardTouchable}
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
          {/* Show delivery badge only if category accepts delivery */}
          {categoryAcceptsDelivery && (
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

// Load More Button using the inspirational style
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
        disabled={loading}
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

export default function HomeScreen() {
  const [location, setLocation] = useState<string>("Loading...");
  const [userLat, setUserLat] = useState<number | null>(null);
  const [userLon, setUserLon] = useState<number | null>(null);
  const router = useRouter();
  const params = useLocalSearchParams();
  const searchQuery = params.query as string || '';
  const searchMode = !!searchQuery;

  const [selectedFilter, setSelectedFilter] = useState("All");
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [displayedProducts, setDisplayedProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [productLimit, setProductLimit] = useState(INITIAL_PRODUCT_LIMIT);
  const [hasMoreProducts, setHasMoreProducts] = useState(true);

  // Fetch user location
  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setLocation("Permission denied");
        return;
      }

      let coords = await Location.getCurrentPositionAsync({});
      setUserLat(coords.coords.latitude);
      setUserLon(coords.coords.longitude);

      let reverse = await Location.reverseGeocodeAsync(coords.coords);

      if (reverse.length > 0) {
        let city = reverse[0].city || reverse[0].region || "Unknown";
        setLocation(city);
      }
    })();
  }, []);

  // Filter products when filter or products array changes
  useEffect(() => {
    let filtered: Product[];
    if (selectedFilter === "All") {
      filtered = products;
    } else {
      filtered = products.filter(
        (p) => p.listing_type.toLowerCase() === selectedFilter.toLowerCase()
      );
    }
    setDisplayedProducts(filtered);
  }, [selectedFilter, products]);

  // Combined fetch function for initial load and load more
  const fetchProducts = async (isInitialLoad: boolean) => {
    if (!isInitialLoad) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }

    try {
      let query = supabase
        .from("products")
        .select(
          "id, name, price, listing_type, image_url, latitude, longitude, location_address, created_at, category_id",
          { count: "exact" }
        )
        .order("created_at", { ascending: false });

      // Apply search filter if in search mode
      if (searchMode && searchQuery) {
        query = query.ilike("name", `%${searchQuery}%`);
      }

      // Only apply pagination when NOT in search mode
      if (!searchMode) {
        const from = isInitialLoad ? 0 : products.length;
        const limit = isInitialLoad ? INITIAL_PRODUCT_LIMIT : LOAD_MORE_INCREMENT;
        query = query.range(from, from + limit - 1);
      }

      const { data: productsData, error: productsError, count } = await query;

      if (productsError) throw productsError;

      const newProducts = isInitialLoad ? productsData || [] : [...products, ...(productsData || [])];
      setProducts(newProducts);
      
      // In search mode, we load all products at once
      if (searchMode) {
        setHasMoreProducts(false);
      } else {
        setHasMoreProducts((count || 0) > newProducts.length);
      }
    } catch (error: any) {
      console.error("HOME ERROR fetching products:", error);
      Alert.alert("Error", "Failed to load products: " + error.message);
    } finally {
      if (!isInitialLoad) {
        setLoadingMore(false);
      } else {
        setLoading(false);
      }
    }
  };

  const markCategoriesWithResults = async () => {
    if (!searchMode || !searchQuery) return;

    try {
      // Get products matching search query
      const { data: productsData, error } = await supabase
        .from("products")
        .select("category_id")
        .ilike("name", `%${searchQuery}%`);

      if (error) throw error;

      if (productsData) {
        const categoryIds = [...new Set(productsData.map(p => p.category_id))];
        
        // Count products per category
        const categoryCounts = productsData.reduce((acc, p) => {
          acc[p.category_id] = (acc[p.category_id] || 0) + 1;
          return acc;
        }, {} as Record<number, number>);

        setCategories(prevCats => 
          prevCats.map(cat => ({
            ...cat,
            hasResults: categoryIds.includes(cat.id),
            productCount: categoryCounts[cat.id] || 0,
          }))
        );
      }
    } catch (error: any) {
      console.error("Error marking categories:", error);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      console.log("=== HOME: Starting fetchData ===");

      // Fetch categories first
      console.log("HOME: Fetching categories...");
      const { data: categoriesData, error: categoriesError } = await supabase
        .from("categories")
        .select("id, name, description, delivery")
        .order("name");

      if (categoriesError) throw categoriesError;
      setCategories(categoriesData || []);

      // Fetch initial products
      await fetchProducts(true);

      // Mark categories with results if in search mode
      if (searchMode && searchQuery) {
        await markCategoriesWithResults();
      }

      console.log("HOME: Fetch complete");
    } catch (error: any) {
      console.error("HOME ERROR:", error);
      Alert.alert("Error", "Failed to load data: " + error.message);
    } finally {
      setLoading(false);
      console.log("=== HOME: Finished fetchData ===");
    }
  };

  // Initial data fetch - re-fetch when search query changes
  useEffect(() => {
    fetchData();
  }, [searchQuery]);

  const handleLoadMore = () => {
    fetchProducts(false);
  };

  const handleBackToHome = () => {
    // Navigate to homepage without search query
    router.push('/');
  };

  if (loading && products.length === 0) {
    return (
      <View style={[styles.safeArea, styles.loadingContainer]}>
        <ActivityIndicator size="large" color={PRIMARY_TEAL} />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  const finalDisplayedProducts = displayedProducts.filter(p => 
    selectedFilter === 'All' || p.listing_type.toLowerCase() === selectedFilter.toLowerCase()
  );

  // Filter categories to show only those with results in search mode
  const displayCategories = searchMode 
    ? categories.filter(cat => cat.hasResults) 
    : categories;

  return (
    <View style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.contentContainer}>
        {/* Header */}
        <View style={styles.header}>
          {/* Back arrow - only show in search mode */}
          {searchMode && (
            <TouchableOpacity onPress={handleBackToHome} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color={PRIMARY_TEAL} />
            </TouchableOpacity>
          )}
          
          <TouchableOpacity
            style={styles.searchBarWrapper}
            onPress={() => {
              router.push("/search");
            }}
            activeOpacity={0.7}
          >
            <View style={styles.searchBar}>
              <Ionicons
                name="search"
                size={20}
                color="#999"
                style={styles.searchIcon}
              />
              <Text style={styles.searchInputPlaceholder}>
                {searchMode ? searchQuery : "Search anything"}
              </Text>
            </View>
          </TouchableOpacity>
          <View style={styles.locationContainer}>
            <Ionicons name="location-sharp" size={20} color={PRIMARY_TEAL} />
            <Text style={styles.locationText}>{location}</Text>
          </View>
        </View>

        {/* Categories */}
        <Text style={styles.sectionTitle}>Categories</Text>
        {displayCategories.length === 0 ? (
          <Text style={styles.emptyText}>No categories available</Text>
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryScroll}
          >
            {displayCategories.map((cat, index) => (
              <CategoryButton 
                key={cat.id} 
                category={cat} 
                index={index}
                searchMode={searchMode}
                searchQuery={searchQuery}
              />
            ))}
          </ScrollView>
        )}

        {/* Filters */}
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

        {/* Products */}
        {finalDisplayedProducts.length === 0 ? (
          <Text style={styles.emptyText}>
            {searchMode ? "No products found matching your search" : "No products available for this filter."}
          </Text>
        ) : (
          <View style={styles.productGrid}>
            {finalDisplayedProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                userLat={userLat}
                userLon={userLon}
                categories={categories}
              />
            ))}
          </View>
        )}

        {/* Load More Button - Only in normal mode */}
        {!searchMode && selectedFilter === "All" && hasMoreProducts && (
          <LoadMoreButton onPress={handleLoadMore} loading={loadingMore} />
        )}
        {!searchMode && selectedFilter === "All" && !hasMoreProducts && products.length > 0 && (
          <Text style={styles.noMoreText}></Text>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "white",
    paddingTop: SAFE_AREA_PADDING,
  },
  loadingContainer: {
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: DARK_GRAY,
  },
  emptyText: {
    textAlign: "center",
    fontSize: 16,
    color: "#999",
    marginVertical: 20,
    paddingHorizontal: 16,
  },
  noMoreText: {
    textAlign: "center",
    fontSize: 14,
    color: PRIMARY_TEAL,
    marginVertical: 20,
    fontWeight: '600'
  },
  contentContainer: {
    paddingBottom: TAB_BAR_HEIGHT + 20,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  backButton: {
    marginRight: 10,
  },
  searchBarWrapper: {
    flex: 1,
    marginRight: 10,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    height: 48,
    backgroundColor: "white",
    borderRadius: 24,
    paddingHorizontal: 15,
    borderWidth: 1,
    borderColor: LIGHT_GRAY,
  },
  searchBarFocused: {
    borderColor: PRIMARY_TEAL,
    borderWidth: 2,
  },
  searchIcon: {
    marginRight: 8,
    color: "#999",
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: "#999",
    paddingVertical: 0,
    backgroundColor: "transparent",
  },
  searchInputPlaceholder: {
    flex: 1,
    fontSize: 16,
    color: "#999",
  },
  locationContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  locationText: {
    marginLeft: 4,
    fontSize: 14,
    fontWeight: "600",
    color: DARK_GRAY,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: DARK_GRAY,
    paddingHorizontal: 16,
    marginTop: 10,
    marginBottom: 10,
  },
  categoryScroll: {
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  categoryButton: {
    position: "relative",
    width: 90,
    height: 90,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  redDot: {
    position: "absolute",
    top: -6,
    right: -6,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: ACCENT_RED,
    borderWidth: 2.5,
    borderColor: "white",
    zIndex: 10,
    shadowColor: ACCENT_RED,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 5,
  },
  categoryText: {
    marginTop: 8,
    fontSize: 11,
    fontWeight: "600",
    color: "white",
    textAlign: "center",
  },
  filterTabsWrapper: {
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  filterTabs: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: LIGHT_GRAY,
    borderRadius: 12,
    padding: 4,
  },
  filterButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
  },
  filterButtonActive: {
    backgroundColor: DARK_GRAY,
  },
  filterText: {
    fontWeight: "600",
    fontSize: 14,
    color: "#666",
  },
  filterTextActive: {
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
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
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
  loadMoreContainer: {
    marginHorizontal: 16,
    marginTop: 20,
    marginBottom: 10,
    shadowColor: PRIMARY_TEAL,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  loadMoreButton: {
    paddingVertical: 16,
    backgroundColor: PRIMARY_TEAL,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
  },
  loadMoreText: {
    fontSize: 16,
    fontWeight: "700",
    color: "white",
  },
});