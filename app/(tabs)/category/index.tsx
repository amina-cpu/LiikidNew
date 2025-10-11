import * as Location from "expo-location";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  Image,
  Keyboard,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import { supabase } from "../../../lib/Supabase";

const PRIMARY_TEAL = "#16A085";
const SEARCH_GREEN = "#059669";
const LIGHT_GRAY = "#F5F5F5";
const DARK_GRAY = "#333333";
const ACCENT_RED = "#FF5B5B";
const ORANGE = "#FF6B35";
const BLUE = "#4A90E2";
const CARD_WIDTH = Dimensions.get("window").width / 2 - 24;
const SAFE_AREA_PADDING = 40;

const INITIAL_PRODUCT_LIMIT = 8;
const LOAD_MORE_INCREMENT = 6;

interface Category {
  id: number;
  name: string;
  description: string | null;
}

interface Subcategory {
  id: number;
  category_id: number;
  name: string;
  description: string | null;
  hasResults?: boolean;
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
  delivery: boolean;
}

const FILTER_TABS = ["All", "Sell", "Rent", "Exchange"];

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
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
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
      return `${product.price.toLocaleString()} DA/day`;
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

export default function CategoryScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const categoryId = params.id ? Number(params.id) : null;
  const searchMode = params.searchMode === 'true';
  const searchQuery = params.searchQuery as string || '';

  const [selectedFilter, setSelectedFilter] = useState("All");
  const [selectedSubcategory, setSelectedSubcategory] = useState<number | null>(null);
  const [location, setLocation] = useState<string>("Loading...");
  const [userLat, setUserLat] = useState<number | null>(null);
  const [userLon, setUserLon] = useState<number | null>(null);
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [currentSearchQuery, setCurrentSearchQuery] = useState(searchQuery);
  const searchInputRef = useRef<TextInput>(null);
  const hasNavigatedRef = useRef(false);

  const [category, setCategory] = useState<Category | null>(null);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMoreProducts, setHasMoreProducts] = useState(true);

  const scrollY = useRef(new Animated.Value(0)).current;
  const headerHeight = useRef(new Animated.Value(1)).current;
  const lastScrollY = useRef(0);
  const scrollTimeout = useRef<NodeJS.Timeout | null>(null);

  // Reset filters when navigating away and coming back
  useFocusEffect(
    useCallback(() => {
      // Reset navigation flag when coming back to this screen
      hasNavigatedRef.current = false;
      
      return () => {
        if (!searchMode) {
          setSelectedFilter("All");
          setSelectedSubcategory(null);
          setCurrentSearchQuery("");
          setIsSearchActive(false);
        }
      };
    }, [searchMode])
  );

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

  useEffect(() => {
    if (categoryId) {
      fetchData(true);
    }
  }, [categoryId]);

  useEffect(() => {
    if (currentSearchQuery.trim()) {
      applyFilters();
    } else {
      applyFilters();
    }
  }, [currentSearchQuery]);

  const applyFilters = () => {
    let filtered: Product[] = products;

    if (selectedSubcategory) {
      filtered = filtered.filter((p) => p.subcategory_id === selectedSubcategory);
    }

    if (selectedFilter !== "All") {
      filtered = filtered.filter(
        (p) => p.listing_type.toLowerCase() === selectedFilter.toLowerCase()
      );
    }

    if (currentSearchQuery.trim()) {
      filtered = filtered.filter(p =>
        p.name.toLowerCase().includes(currentSearchQuery.toLowerCase())
      );
    }

    setFilteredProducts(filtered);

    // Update subcategories with results whenever filters change
    if (currentSearchQuery.trim()) {
      const subcategoryIds = [...new Set(filtered.map(p => p.subcategory_id).filter(Boolean))];
      setSubcategories(prevSubs => {
        const updatedSubs = prevSubs.map(sub => ({
          ...sub,
          hasResults: subcategoryIds.includes(sub.id)
        }));

        // Auto-navigate if only one subcategory has results
        const subsWithResults = updatedSubs.filter(sub => sub.hasResults);
        

        return updatedSubs;
      });
    } else {
      // Reset hasResults when search is cleared
      setSubcategories(prevSubs => 
        prevSubs.map(sub => ({
          ...sub,
          hasResults: false
        }))
      );
    }
  };

  useEffect(() => {
    applyFilters();
  }, [selectedFilter, selectedSubcategory, products]);

  const fetchProducts = async (isInitialLoad: boolean) => {
    if (!categoryId) return;

    if (!isInitialLoad) {
      setLoadingMore(true);
    }

    try {
      let query = supabase
        .from("products")
        .select(
          "id, name, price, listing_type, image_url, latitude, longitude, location_address, subcategory_id, sub_subcategory_id, created_at, delivery",
          { count: "exact" }
        )
        .eq("category_id", categoryId);

      if (searchMode && searchQuery) {
        query = query.ilike("name", `%${searchQuery}%`);
      }

      query = query.order("created_at", { ascending: false });

      if (!searchMode || !searchQuery) {
        const from = isInitialLoad ? 0 : products.length;
        const limit = isInitialLoad ? INITIAL_PRODUCT_LIMIT : LOAD_MORE_INCREMENT;
        const to = from + limit - 1;
        query = query.range(from, to);
      }

      const { data: productsData, error: productsError, count } = await query;

      if (productsError) throw productsError;

      const newProducts = isInitialLoad ? productsData || [] : [...products, ...(productsData || [])];
      setProducts(newProducts);
      
      if (searchMode && searchQuery) {
        setHasMoreProducts(false);
      } else {
        setHasMoreProducts((count || 0) > newProducts.length);
      }

      if (searchMode && isInitialLoad && searchQuery) {
        await markSubcategoriesWithResults(newProducts);
      }
    } catch (error: any) {
      console.error("Error fetching products:", error);
      Alert.alert("Error", "Failed to load products: " + error.message);
    } finally {
      if (!isInitialLoad) {
        setLoadingMore(false);
      }
    }
  };

  const markSubcategoriesWithResults = async (products: Product[]) => {
    const subcategoryIds = [...new Set(products.map(p => p.subcategory_id).filter(Boolean))];
    
    setSubcategories(prevSubs => {
      const updatedSubs = prevSubs.map(sub => ({
        ...sub,
        hasResults: subcategoryIds.includes(sub.id)
      }));

      // Auto-navigate if only one subcategory has results
      const subsWithResults = updatedSubs.filter(sub => sub.hasResults);
      

      return updatedSubs;
    });
  };

  const fetchData = async (isInitialLoad: boolean) => {
    setLoading(true);
    try {
      const { data: categoryData, error: categoryError } = await supabase
        .from("categories")
        .select("id, name, description")
        .eq("id", categoryId)
        .single();

      if (categoryError) throw categoryError;
      setCategory(categoryData);

      const { data: subcategoriesData, error: subcategoriesError } =
        await supabase
          .from("subcategories")
          .select("id, category_id, name, description")
          .eq("category_id", categoryId)
          .order("name");

      if (subcategoriesError) throw subcategoriesError;
      setSubcategories(subcategoriesData || []);

      await fetchProducts(isInitialLoad);
    } catch (error: any) {
      console.error("Error fetching data:", error);
      Alert.alert("Error", "Failed to load data: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLoadMore = () => {
    if (selectedFilter === "All" && !selectedSubcategory && !currentSearchQuery.trim()) {
      fetchProducts(false);
    } else {
      Alert.alert("Info", "Load More is available only when browsing all items without filters.");
    }
  };

  const handleScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
    {
      useNativeDriver: false,
      listener: (event: any) => {
        const currentScrollY = event.nativeEvent.contentOffset.y;
        
        if (scrollTimeout.current) {
          clearTimeout(scrollTimeout.current);
        }

        if (currentScrollY > lastScrollY.current && currentScrollY > 50) {
          Animated.timing(headerHeight, {
            toValue: 0,
            duration: 200,
            useNativeDriver: false,
          }).start();
        } 
        else if (currentScrollY < lastScrollY.current) {
          scrollTimeout.current = setTimeout(() => {
            Animated.timing(headerHeight, {
              toValue: 1,
              duration: 200,
              useNativeDriver: false,
            }).start();
          }, 150);
        }

        lastScrollY.current = currentScrollY;
      },
    }
  );

  const openFilters = () => {
    router.push("/filters");
  };

  const handleSearchBarPress = () => {
    setIsSearchActive(true);
    setTimeout(() => {
      searchInputRef.current?.focus();
    }, 100);
  };

  const handleCancelSearch = () => {
    setIsSearchActive(false);
    setCurrentSearchQuery("");
    Keyboard.dismiss();
  };

useEffect(() => {
  const subsWithResults = subcategories.filter(sub => sub.hasResults);

  if (
    subsWithResults.length === 1 &&
    currentSearchQuery.trim() &&
    !hasNavigatedRef.current
  ) {
    hasNavigatedRef.current = true; // prevent repeated redirects
    router.replace(
      `/category/subcategory/${subsWithResults[0].id}?searchMode=true&searchQuery=${encodeURIComponent(currentSearchQuery)}`
    );
  }
}, [subcategories, currentSearchQuery]);

  // Filter subcategories to show only those with results when searching
  const visibleSubcategories = currentSearchQuery.trim() 
    ? subcategories.filter(sub => sub.hasResults)
    : subcategories;

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
      {/* Fullscreen Search Overlay */}
      {isSearchActive && (
        <View style={styles.searchOverlay}>
          <View style={styles.searchOverlayHeader}>
            <TouchableOpacity onPress={handleCancelSearch} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color="#16A085" />
            </TouchableOpacity>
            <View style={styles.searchBarExpanded}>
              <Ionicons
                name="search"
                size={20}
                color="#999"
                style={styles.searchIcon}
              />
              <TextInput
                ref={searchInputRef}
                style={styles.searchInputExpanded}
                placeholder={`Search in ${category?.name || 'this category'}`}
                placeholderTextColor="#999"
                value={currentSearchQuery}
                onChangeText={setCurrentSearchQuery}
                returnKeyType="search"
                onSubmitEditing={() => {
                  setIsSearchActive(false);
                  Keyboard.dismiss();
                }}
              />
              {currentSearchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setCurrentSearchQuery("")}>
                  <Ionicons name="close-circle" size={20} color="#999" />
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      )}

      {/* Normal Header */}
      {!isSearchActive && (
        <Animated.View
          style={[
            styles.headerContainer,
            {
              height: headerHeight.interpolate({
                inputRange: [0, 1],
                outputRange: [0, 100],
              }),
              opacity: headerHeight,
            },
          ]}
        >
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color={PRIMARY_TEAL} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.searchBarWrapper}
              onPress={handleSearchBarPress}
              activeOpacity={0.7}
            >
              <View
                style={[
                  styles.searchBar,
                  (searchMode || currentSearchQuery.trim()) && styles.searchBarFocused,
                ]}
              >
                <Ionicons
                  name="search"
                  size={20}
                  color={(searchMode || currentSearchQuery.trim()) ? SEARCH_GREEN : "#999"}
                  style={styles.searchIcon}
                />
                <Text style={styles.searchPlaceholder} numberOfLines={1}>
                  {currentSearchQuery.trim() ? currentSearchQuery : `Search in ${category?.name}`}
                </Text>
              </View>
            </TouchableOpacity>
            <View style={styles.locationContainer}>
              <Ionicons name="location-sharp" size={20} color={PRIMARY_TEAL} />
              <Text style={styles.locationText}>{location}</Text>
            </View>
          </View>
        </Animated.View>
      )}

      {/* Main Content */}
      {!isSearchActive && (
        <Animated.ScrollView 
          contentContainerStyle={styles.contentContainer}
          onScroll={handleScroll}
          scrollEventThrottle={16}
        >
          {/* Category Title */}
          <View style={styles.categoryTitleContainer}>
            <Ionicons name="phone-portrait-outline" size={24} color={PRIMARY_TEAL} />
            <Text style={styles.categoryTitle}>{category?.name || "Category"}</Text>
          </View>

          {/* Subcategories */}
          {visibleSubcategories.length > 0 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.subcategoryScroll}
            >
              {visibleSubcategories.map((sub) => (
                <TouchableOpacity
                  key={sub.id}
                  style={[
                    styles.subcategoryPill,
                    selectedSubcategory === sub.id && styles.subcategoryPillActive,
                  ]}
                  onPress={() => router.push(`/category/subcategory/${sub.id}`)}
                >
                  {sub.hasResults && (
                    <View style={styles.redDot} />
                  )}
                  <Ionicons
                    name="phone-portrait-outline"
                    size={20}
                    color={DARK_GRAY}
                    style={styles.subcategoryIcon}
                  />
                  <Text style={styles.subcategoryText}>
                    {sub.name}
                  </Text>
                </TouchableOpacity>
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
          {filteredProducts.length === 0 ? (
            <Text style={styles.emptyText}>
              {currentSearchQuery.trim() ? "No products found matching your search" : "No products available"}
            </Text>
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

          {/* Load More Button */}
          {selectedFilter === "All" && 
           !selectedSubcategory && 
           !currentSearchQuery.trim() && 
           hasMoreProducts && (
            <LoadMoreButton onPress={handleLoadMore} loading={loadingMore} />
          )}
        </Animated.ScrollView>
      )}

      {/* Floating Filter Button */}
      {!isSearchActive && (
        <TouchableOpacity style={styles.floatingFilterButton} onPress={openFilters}>
          <View style={styles.filterIconContainer}>
            <Image
              source={require("../../../assets/icons/floating.png")}
              style={styles.floatingImageIcon}
            />
          </View>
        </TouchableOpacity>
      )}
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
  contentContainer: {
    paddingBottom: 100,
  },
  headerContainer: {
    overflow: "hidden",
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
  searchBarWrapper: {
    flex: 1,
    marginRight: 10,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    height: 48,
    backgroundColor: LIGHT_GRAY,
    borderRadius: 24,
    paddingHorizontal: 15,
    borderWidth: 2,
    borderColor: "transparent",
  },
  searchBarFocused: {
    borderColor: SEARCH_GREEN,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchPlaceholder: {
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
  searchOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "white",
    zIndex: 1000,
    paddingTop: SAFE_AREA_PADDING,
  },
  searchOverlayHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  searchBarExpanded: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    height: 52,
    backgroundColor: "white",
    borderRadius: 26,
    paddingHorizontal: 15,
    borderWidth: 2,
    borderColor: SEARCH_GREEN,
  },
  searchInputExpanded: {
    flex: 1,
    fontSize: 16,
    color: DARK_GRAY,
    paddingVertical: 0,
  },
  categoryTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    marginTop: 10,
    marginBottom: 15,
  },
  categoryTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: DARK_GRAY,
    marginLeft: 8,
  },
  subcategoryScroll: {
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  subcategoryPill: {
    position: "relative",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginRight: 12,
    borderRadius: 8,
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "#D0D0D0",
  },
  subcategoryPillActive: {
    backgroundColor: "white",
    borderColor: DARK_GRAY,
    borderWidth: 1.5,
  },
  redDot: {
    position: "absolute",
    top: -8,
    right: -8,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: ACCENT_RED,
    borderWidth: 3,
    borderColor: "white",
    zIndex: 10,
    shadowColor: ACCENT_RED,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.5,
    shadowRadius: 5,
    elevation: 6,
  },
  subcategoryIcon: {
    marginRight: 6,
  },
  subcategoryText: {
    fontSize: 13,
    fontWeight: "500",
    color: DARK_GRAY,
  },
  floatingImageIcon: {
    width: 28,
    height: 28,
    resizeMode: "contain",
    tintColor: "white",
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
});