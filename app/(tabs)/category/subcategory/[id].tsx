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
import { supabase } from "../../../../lib/Supabase";

const PRIMARY_TEAL = "#16A085";
const SEARCH_GREEN = "#059669";
const LIGHT_GRAY = "#F5F5F5";
const DARK_GRAY = "#333333";
const ACCENT_RED = "#FF5B5B";
const ORANGE = "#FF6B35";
const BLUE = "#4A90E2";
const CARD_WIDTH = Dimensions.get("window").width / 2 - 12;
const SAFE_AREA_PADDING = 40;

const INITIAL_PRODUCT_LIMIT = 8;
const LOAD_MORE_INCREMENT = 6;

interface SubSubcategory {
  id: number;
  subcategory_id: number;
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

interface Category {
  id: number;
  name: string;
}

interface Subcategory {
  id: number;
  category_id: number;
  name: string;
}

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
    if (product.listing_type === "rent")
      return `${product.price.toLocaleString()} DA/month`;
    return `${product.price.toLocaleString()} DA`;
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
          {product.delivery && (
            <View style={styles.deliveryBadgeNew}>
              <MaterialCommunityIcons
                name="truck-delivery-outline"
                size={16}
                color="#008E74"
              />
            </View>
          )}
          <TouchableOpacity onPress={toggleLike} style={styles.heartIcon}>
            <Ionicons
              name={liked ? "heart" : "heart-outline"}
              size={22}
              color={liked ? "#FF5B5B" : "white"}
            />
          </TouchableOpacity>
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
          <View style={styles.distanceContainer}>
            <Ionicons name="location-outline" size={14} color="#008E74" />
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

export default function SubcategoryScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const subcategoryId = params.id ? Number(params.id) : null;
  const searchMode = params.searchMode === 'true';
  const searchQueryParam = params.searchQuery as string || '';
  
  const [selectedFilter, setSelectedFilter] = useState<string>("All");
  const [subSubcategories, setSubSubcategories] = useState<SubSubcategory[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [selectedBrand, setSelectedBrand] = useState<number | null>(null);
  const [userLat, setUserLat] = useState<number | null>(null);
  const [userLon, setUserLon] = useState<number | null>(null);
  const [location, setLocation] = useState<string>("Loading...");
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMoreProducts, setHasMoreProducts] = useState(true);
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [searchQuery, setSearchQuery] = useState(searchQueryParam);
  const searchInputRef = useRef<TextInput>(null);
  const hasNavigatedRef = useRef(false);

  const [category, setCategory] = useState<Category | null>(null);
  const [subcategory, setSubcategory] = useState<Subcategory | null>(null);

  // Sticky header state
  const [filterTabsLayout, setFilterTabsLayout] = useState({ y: 0, height: 0 });
  const scrollY = useRef(new Animated.Value(0)).current;
  const [isSticky, setIsSticky] = useState(false);

  // Clear search state when screen loses focus
  useFocusEffect(
    useCallback(() => {
      hasNavigatedRef.current = false;
      
      // Only set search query if coming from search mode
      if (searchMode && searchQueryParam) {
        setSearchQuery(searchQueryParam);
        setIsSearchActive(false); // Make sure search overlay isn't shown
      } else {
        // Clear search when not in search mode
        setSearchQuery("");
      }
      
      return () => {
        // Only clear if not in search mode
        if (!searchMode) {
          setSelectedFilter("All");
          setSelectedBrand(null);
          setSearchQuery("");
          setIsSearchActive(false);
        }
      };
    }, [searchMode, searchQueryParam])
  );

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
      fetchData(true);
    }
  }, [subcategoryId]);

  // Filter products whenever products or filter state changes
  useEffect(() => {
    let filtered = products;

    if (selectedBrand) {
      filtered = filtered.filter(p => p.sub_subcategory_id === selectedBrand);
    }

    if (selectedFilter !== "All") {
      filtered = filtered.filter(
        p => p.listing_type.toLowerCase() === selectedFilter.toLowerCase()
      );
    }

    if (searchQuery.trim()) {
      filtered = filtered.filter(p =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredProducts(filtered);

    // CRITICAL FIX: Update sub-subcategories with results based on SEARCH ONLY
    // This ensures red dots show correctly when coming from category page
    if (searchQuery.trim()) {
      // Get products that match ONLY the search query (before other filters)
      let searchMatches = products.filter(p =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
      
      const subSubcategoryIds = [...new Set(searchMatches.map(p => p.sub_subcategory_id).filter(Boolean))];
      
      setSubSubcategories(prevSubs => 
        prevSubs.map(sub => ({
          ...sub,
          hasResults: subSubcategoryIds.includes(sub.id)
        }))
      );
    } else {
      setSubSubcategories(prevSubs => 
        prevSubs.map(sub => ({
          ...sub,
          hasResults: false
        }))
      );
    }
  }, [selectedBrand, selectedFilter, searchQuery, products]);

  // Auto-select first brand if only one has results when coming from search
  useEffect(() => {
    const subsWithResults = subSubcategories.filter(sub => sub.hasResults);
    
    if (
      subsWithResults.length === 1 &&
      searchQuery.trim() &&
      !hasNavigatedRef.current &&
      selectedBrand === null
    ) {
      hasNavigatedRef.current = true;
      setSelectedBrand(subsWithResults[0].id);
    }
  }, [subSubcategories, searchQuery, selectedBrand]);

  const fetchProducts = async (isInitialLoad: boolean) => {
    if (!subcategoryId) return;

    const from = isInitialLoad ? 0 : products.length;
    const limit = isInitialLoad ? INITIAL_PRODUCT_LIMIT : LOAD_MORE_INCREMENT;
    const to = from + limit - 1;

    if (!isInitialLoad) {
      setLoadingMore(true);
    }

    try {
      const { data: productData, error: productError, count } = await supabase
        .from("products")
        .select("id, name, price, listing_type, image_url, latitude, longitude, location_address, subcategory_id, sub_subcategory_id, created_at, delivery", { count: "exact" })
        .eq("subcategory_id", subcategoryId)
        .order("created_at", { ascending: false })
        .range(from, to);

      if (productError) throw productError;

      const newProducts = productData || [];

      setProducts(prevProducts =>
        isInitialLoad ? newProducts : [...prevProducts, ...newProducts]
      );

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
      const { data: subcategoryData, error: subcategoryError } = await supabase
        .from("subcategories")
        .select("id, category_id, name")
        .eq("id", subcategoryId)
        .single();

      if (subcategoryError) throw subcategoryError;
      setSubcategory(subcategoryData);

      if (subcategoryData?.category_id) {
        const { data: categoryData, error: categoryError } = await supabase
          .from("categories")
          .select("id, name")
          .eq("id", subcategoryData.category_id)
          .single();

        if (categoryError) throw categoryError;
        setCategory(categoryData);
      }

      const { data: brands, error: brandError } = await supabase
        .from("sub_subcategories")
        .select("id, subcategory_id, name, description")
        .eq("subcategory_id", subcategoryId)
        .order("name");

      if (brandError) throw brandError;
      setSubSubcategories(brands || []);

      // Don't auto-redirect when there's only one sub-subcategory
      // Just show it in the list and let user click if they want
      
      await fetchProducts(isInitialLoad);

    } catch (e: any) {
      Alert.alert("Error", e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLoadMore = () => {
    if (selectedBrand === null && selectedFilter === "All" && !searchQuery.trim()) {
      fetchProducts(false);
    } else {
      Alert.alert(
        "Filter Active",
        "Please clear all filters to load more items from the server."
      );
    }
  };

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
    setSearchQuery("");
    Keyboard.dismiss();
    hasNavigatedRef.current = false;
    
    if (subcategoryId) {
      router.replace(`/category/subcategory/${subcategoryId}`);
    }
  };

  const handleBackPress = () => {
    if (router.canGoBack()) {
      router.back();
    } else if (category?.id) {
      router.replace(`/category?id=${category.id}`);
    } else {
      router.replace('/');
    }
  };

  const handleScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
    {
      useNativeDriver: false,
      listener: (event: any) => {
        const offsetY = event.nativeEvent.contentOffset.y;
        setIsSticky(offsetY >= filterTabsLayout.y);
      },
    }
  );

  const visibleSubSubcategories = searchQuery.trim()
    ? subSubcategories.filter(sub => sub.hasResults)
    : subSubcategories;

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
      {isSearchActive && (
        <View style={styles.searchOverlay}>
          <View style={styles.searchOverlayHeader}>
            <TouchableOpacity onPress={handleCancelSearch} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color={SEARCH_GREEN} />
            </TouchableOpacity>
            <View style={styles.searchBarExpanded}>
              <Ionicons
                name="search"
                size={20}
                color={SEARCH_GREEN}
                style={styles.searchIcon}
              />
              <TextInput
                ref={searchInputRef}
                style={styles.searchPlaceholder}
                placeholder={`Search in ${subcategory?.name || 'this subcategory'}`}
                placeholderTextColor="#999"
                value={searchQuery}
                onChangeText={setSearchQuery}
                returnKeyType="search"
                onSubmitEditing={() => {
                  setIsSearchActive(false);
                  Keyboard.dismiss();
                }}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery("")}>
                  <Ionicons name="close-circle" size={20} color="#999" />
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      )}

      {!isSearchActive && isSticky && (
        <View style={styles.stickyFilterTabsWrapper}>
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
      )}

      {!isSearchActive && (
        <ScrollView 
          contentContainerStyle={{ paddingBottom: 100 }}
          onScroll={handleScroll}
          scrollEventThrottle={16}
        >
          <View style={styles.header}>
            <TouchableOpacity onPress={handleBackPress} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color={PRIMARY_TEAL} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.searchBarWrapper}
              onPress={handleSearchBarPress}
              activeOpacity={0.7}
            >
              <View style={[
                styles.searchBar,
                searchQuery.trim() && styles.searchBarFocused
              ]}>
                <Ionicons
                  name="search"
                  size={20}
                  color={searchQuery.trim() ? SEARCH_GREEN : "#999"}
                  style={styles.searchIcon}
                />
                <Text style={styles.searchInputPlaceholder} numberOfLines={1}>
                  {searchQuery.trim() || `Search in ${subcategory?.name}`}
                </Text>
              </View>
            </TouchableOpacity>
            <View style={styles.locationContainer}>
              <Ionicons name="location-sharp" size={20} color={PRIMARY_TEAL} />
              <Text style={styles.locationText} numberOfLines={1}>{location}</Text>
            </View>
          </View>

          <View style={styles.breadcrumbContainer}>
            <TouchableOpacity onPress={() => router.push(`/category?id=${category?.id}`)}>
              <Text style={styles.breadcrumbText}>
                {category?.name || "Category"}
              </Text>
            </TouchableOpacity>
            <Ionicons name="chevron-forward" size={16} color="#999" style={styles.breadcrumbArrow} />
            <Text style={[styles.breadcrumbText, styles.breadcrumbActive]}>
              {subcategory?.name || "Subcategory"}
            </Text>
          </View>

          {visibleSubSubcategories.length > 0 && (
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
              {visibleSubSubcategories.map((brand) => (
                <TouchableOpacity
                  key={brand.id}
                  style={[
                    styles.brandPill,
                    selectedBrand === brand.id && styles.brandPillActive,
                  ]}
                  onPress={() => {
                    // Just set the selected brand filter, don't navigate away
                    setSelectedBrand(brand.id);
                  }}
                >
                  {brand.hasResults && (
                    <View style={styles.redDot} />
                  )}
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

          <View 
            style={styles.filterTabsWrapper}
            onLayout={(event) => {
              const { y, height } = event.nativeEvent.layout;
              setFilterTabsLayout({ y, height });
            }}
          >
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

          {filteredProducts.length === 0 ? (
            <Text style={styles.emptyText}>
              {searchQuery.trim() ? "No products found matching your search" : "No products found"}
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

          {selectedBrand === null && selectedFilter === "All" && !searchQuery.trim() && hasMoreProducts && (
            <LoadMoreButton onPress={handleLoadMore} loading={loadingMore} />
          )}

        </ScrollView>
      )}

      {!isSearchActive && (
        <TouchableOpacity style={styles.floatingFilterButton} onPress={openFilters}>
          <View style={styles.filterIconContainer}>
            <Image
              source={require("../../../../assets/icons/floating.png")}
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
    marginBottom:110,
    paddingTop: SAFE_AREA_PADDING,
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
  searchBarWrapper: {
    flex: 1,
    marginRight: 10,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    height: 48,
    backgroundColor: "#F3F4F6",
    borderRadius: 24,
    paddingHorizontal: 16,
    borderWidth: 0,
    
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
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
    maxWidth: 100,
  },
  locationText: {
    marginLeft: 4,
    fontSize: 13,
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
    paddingTop: 12,
  },
  brandPill: {
    position: "relative",
    paddingHorizontal: 20,
    paddingVertical: 8,
    marginRight: 10,
    borderRadius: 8,
    backgroundColor: LIGHT_GRAY,
    borderWidth: 0,
    overflow: "visible",
  },
  brandPillActive: {
    backgroundColor: PRIMARY_TEAL,
    borderWidth: 0,
  },
  redDot: {
    position: "absolute",
    top: -10,
    right: -10,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: ACCENT_RED,
    borderWidth: 3,
    borderColor: "white",
    zIndex: 20,
    shadowColor: ACCENT_RED,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
    elevation: 8,
    transform: [{ scale: 1.1 }],
  },
  brandText: {
    fontSize: 14,
    fontWeight: "600",
    color: DARK_GRAY,
  },
  brandTextActive: {
    color: "white",
  },
  filterTabsWrapper: {
    zIndex: 1,
    backgroundColor: 'white',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 0,
  },
  stickyFilterTabsWrapper: {
    position: 'absolute',
    top: SAFE_AREA_PADDING,
    left: 0,
    right: 0,
    zIndex: 20,
    backgroundColor: 'white',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
    borderRadius: 16,
    marginHorizontal: 10,
    marginTop: 10,
  },
  filterTabs: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#F3F4F6',
    borderRadius: 16,
    padding: 5,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  filterButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 2,
  },
  filterButtonActive: {
    backgroundColor: "#16A085",
    shadowColor: "#16A085",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 6,
  },
  filterText: {
    fontSize: 14,
    fontWeight: '600',
    color: "#6B7280",
  },
  filterTextActive: {
    color: 'white',
    fontWeight: '700',
  },
  // 📦 UPDATED PRODUCT GRID - Match homepage spacing
  productGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    paddingHorizontal: 8, // Changed from 16 to 8
  },
  // 📦 UPDATED PRODUCT CARD - Match homepage design
  cardContainer: {
    width: CARD_WIDTH,
    marginBottom: 8, // Changed from 16 to 8
    borderRadius: 20, // Changed from 16 to 20
    backgroundColor: "white",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 }, // Increased shadow
    shadowOpacity: 0.15, // Increased shadow
    shadowRadius: 12, // Increased shadow
    elevation: 8, // Increased elevation
  },
  cardTouchable: {
    borderRadius: 20, // Changed from 16 to 20
    overflow: "hidden",
    flex: 1,
  },
  imageWrapper: {
    width: "100%",
    aspectRatio: 0.8, // Changed from 1 to 0.8 (taller cards)
    backgroundColor: "#F7F7F7",
    borderTopLeftRadius: 20, // Changed from 16 to 20
    borderTopRightRadius: 20, // Changed from 16 to 20
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
    shadowOpacity: 0.2, // Increased shadow
    shadowRadius: 4,
    elevation: 4, // Increased elevation
  },
  heartIcon: {
    position: "absolute",
    top: 12, // Changed from 10 to 12
    right: 12, // Changed from 10 to 12
    backgroundColor: 'rgba(0,0,0,0.5)', // Added background
    borderRadius: 20,
    padding: 6, // Changed from 5 to 6
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
    marginBottom: 6, // Changed from 8 to 6
  },
  priceText: {
    fontSize: 13, // Keep as 13
    fontWeight: "700",
  },
  cardTitle: {
    fontSize: 13, // Keep as 13
    fontWeight: "500", // Changed from 600 to 500
    color: "#333",
    minHeight: 34, // Keep as 34
    marginBottom: 4, // Keep as 4
  },
  distanceContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 2, // Keep as 2
  },
  cardDistance: {
    marginLeft: 4,
    marginRight: 4,
    fontSize: 13,
    color: "#666",
  },
  searchInputPlaceholder: {
    flex: 1,
    fontSize: 15,
    color: "#6B7280",
  },
  emptyText: {
    textAlign: "center",
    fontSize: 16,
    color: "#999",
    marginVertical: 20,
    paddingHorizontal: 16,
  },
  loadMoreContainer: {
    paddingHorizontal: 16,
    marginTop: 20,
    marginBottom: 40, // Increased bottom margin
  },
  loadMoreButton: {
    backgroundColor: PRIMARY_TEAL,
    borderRadius: 14, // Changed from 30 to 14
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: PRIMARY_TEAL,
    shadowOffset: { width: 0, height: 6 }, // Increased shadow
    shadowOpacity: 0.4, // Increased shadow
    shadowRadius: 10, // Increased shadow
    elevation: 8, // Increased elevation
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
});