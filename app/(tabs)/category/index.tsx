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

export default function CategoryScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const categoryId = params.id ? Number(params.id) : null;
  const searchMode = params.searchMode === 'true';
  const searchQuery = params.searchQuery as string || '';

  // Filter params from filters page
  const filtersApplied = params.filtersApplied === "true";
  const listingTypeParam = (params.listingType as string) || null;
  const sortByParam = (params.sortBy as string) || "Best Match";
  const locationParam = (params.location as string) || "";
  const deliveryParam = (params.delivery as string) || "";
  const conditionParam = (params.condition as string) || "";
  const minPriceParam = params.minPrice ? Number(params.minPrice) : null;
  const maxPriceParam = params.maxPrice ? Number(params.maxPrice) : null;

  const [selectedFilter, setSelectedFilter] = useState(listingTypeParam || "All");
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
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMoreProducts, setHasMoreProducts] = useState(true);

  // Sticky header state
  const [filterTabsLayout, setFilterTabsLayout] = useState({ y: 0, height: 0 });
  const scrollY = useRef(new Animated.Value(0)).current;
  const [isSticky, setIsSticky] = useState(false);
  const headerHeight = useRef(new Animated.Value(1)).current;
  const lastScrollY = useRef(0);
  const scrollTimeout = useRef<NodeJS.Timeout | null>(null);

  useFocusEffect(
    useCallback(() => {
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
      fetchData();
    }
  }, [categoryId]);

  // Apply listingType from params when filters are applied
  useEffect(() => {
    if (listingTypeParam && filtersApplied) {
      setSelectedFilter(listingTypeParam);
    }
  }, [listingTypeParam, filtersApplied]);

  // Apply all filters whenever any filter changes
  useEffect(() => {
    applyAllFilters();
  }, [
    allProducts,
    selectedFilter,
    selectedSubcategory,
    currentSearchQuery,
    filtersApplied,
    sortByParam,
    locationParam,
    deliveryParam,
    minPriceParam,
    maxPriceParam,
    userLat,
    userLon
  ]);

  const applyAllFilters = () => {
    let filtered = [...allProducts];

    // 1. Apply subcategory filter (from clicking subcategory pills)
    if (selectedSubcategory) {
      filtered = filtered.filter((p) => p.subcategory_id === selectedSubcategory);
    }

    // 2. Apply listing type filter (All/Sell/Rent/Exchange tabs)
    if (selectedFilter !== "All") {
      filtered = filtered.filter(
        (p) => p.listing_type.toLowerCase() === selectedFilter.toLowerCase()
      );
    }

    // 3. Apply search query filter
    if (currentSearchQuery.trim()) {
      filtered = filtered.filter(p =>
        p.name.toLowerCase().includes(currentSearchQuery.toLowerCase())
      );
    }

    // 4. Apply filters from the filters page (if filtersApplied is true)
    if (filtersApplied) {
      // Location filter - check if product is near the selected city
      if (locationParam && locationParam !== "All Locations" && userLat && userLon) {
        // Define city coordinates (you can expand this)
        const cityCoordinates: { [key: string]: { lat: number; lon: number } } = {
          'Blida': { lat: 36.4706, lon: 2.8277 },
          'Algiers': { lat: 36.7538, lon: 3.0588 },
          'Oran': { lat: 35.6969, lon: -0.6331 },
          'Constantine': { lat: 36.3650, lon: 6.6147 },
          'Setif': { lat: 36.1905, lon: 5.4106 },
          'Annaba': { lat: 36.9000, lon: 7.7667 }
        };

        const cityCoords = cityCoordinates[locationParam];
        if (cityCoords) {
          // Filter products within 50km of the city
          filtered = filtered.filter(p => {
            if (p.latitude && p.longitude) {
              const distance = calculateDistance(cityCoords.lat, cityCoords.lon, p.latitude, p.longitude);
              return distance <= 50; // Within 50km radius
            }
            return false;
          });
        }
      }

      // Delivery filter
      if (deliveryParam && deliveryParam !== "All Methods") {
        if (deliveryParam.toLowerCase() === "pickup") {
          filtered = filtered.filter(p => p.delivery === false);
        } else if (deliveryParam.toLowerCase() === "delivery" || deliveryParam.toLowerCase() === "shipping") {
          filtered = filtered.filter(p => p.delivery === true);
        }
      }

      // Price range filters
      if (minPriceParam !== null) {
        filtered = filtered.filter(p => p.price >= minPriceParam);
      }
      if (maxPriceParam !== null) {
        filtered = filtered.filter(p => p.price <= maxPriceParam);
      }

      // Sorting
      if (sortByParam === "Lowest Price") {
        filtered.sort((a, b) => a.price - b.price);
      } else if (sortByParam === "Highest Price") {
        filtered.sort((a, b) => b.price - a.price);
      } else if (sortByParam === "Most Recent") {
        filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      } else if (sortByParam === "Nearest" && userLat && userLon) {
        filtered.sort((a, b) => {
          const distA = (a.latitude && a.longitude) 
            ? calculateDistance(userLat, userLon, a.latitude, a.longitude)
            : Infinity;
          const distB = (b.latitude && b.longitude)
            ? calculateDistance(userLat, userLon, b.latitude, b.longitude)
            : Infinity;
          return distA - distB;
        });
      }
    }

    setFilteredProducts(filtered);

    // Update subcategories with hasResults for search
    if (currentSearchQuery.trim()) {
      const subcategoryIds = [...new Set(filtered.map(p => p.subcategory_id).filter(Boolean))];
      setSubcategories(prevSubs => 
        prevSubs.map(sub => ({
          ...sub,
          hasResults: subcategoryIds.includes(sub.id)
        }))
      );
    } else {
      setSubcategories(prevSubs => 
        prevSubs.map(sub => ({
          ...sub,
          hasResults: false
        }))
      );
    }
  };

  // Auto-navigate when only one subcategory has results
  useEffect(() => {
    const subsWithResults = subcategories.filter(sub => sub.hasResults);
    
    if (
      subsWithResults.length === 1 &&
      currentSearchQuery.trim() &&
      !hasNavigatedRef.current
    ) {
      hasNavigatedRef.current = true;
      router.replace(
        `/category/subcategory/${subsWithResults[0].id}?searchMode=true&searchQuery=${encodeURIComponent(currentSearchQuery)}`
      );
    }
  }, [subcategories, currentSearchQuery]);

  const fetchData = async () => {
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

      // Fetch ALL products for this category (we'll filter client-side)
      const { data: productsData, error: productsError } = await supabase
        .from("products")
        .select(
          `id, name, price, listing_type, image_url, latitude, longitude, location_address, subcategory_id, sub_subcategory_id, created_at, delivery`
        )
        .eq("category_id", categoryId)
        .order("created_at", { ascending: false });

      if (productsError) throw productsError;
      
      setAllProducts(productsData || []);
      setHasMoreProducts(false); // No pagination since we load all products
    } catch (error: any) {
      console.error("Error fetching data:", error);
      Alert.alert("Error", "Failed to load data: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
    {
      useNativeDriver: false,
      listener: (event: any) => {
        const currentScrollY = event.nativeEvent.contentOffset.y;
        
        // Update sticky state
        setIsSticky(currentScrollY >= filterTabsLayout.y);
        
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
    const currentParams: any = {
      categoryId: categoryId,
    };
    
    // IMPORTANT: Preserve current listing type filter (Sell/Rent/Exchange)
    if (selectedFilter !== "All") {
      currentParams.listingType = selectedFilter;
    }
    
    // Pass existing filter params if they exist
    if (filtersApplied) {
      if (sortByParam) currentParams.sortBy = sortByParam;
      if (locationParam) currentParams.location = locationParam;
      if (deliveryParam) currentParams.delivery = deliveryParam;
      if (conditionParam) currentParams.condition = conditionParam;
      if (minPriceParam) currentParams.minPrice = minPriceParam;
      if (maxPriceParam) currentParams.maxPrice = maxPriceParam;
    }
    
    const queryString = Object.entries(currentParams)
      .map(([key, value]) => `${key}=${encodeURIComponent(value as string)}`)
      .join("&");
    
    router.push(`/filters?${queryString}`);
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

  const handleBackPress = () => {
    // Always go back, don't replace with home
    router.back();
  };

  const visibleSubcategories = currentSearchQuery.trim() 
    ? subcategories.filter(sub => sub.hasResults)
    : subcategories;

  if (loading) {
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
            <TouchableOpacity onPress={handleBackPress} style={styles.backButton}>
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

      {!isSearchActive && (
        <Animated.ScrollView 
          contentContainerStyle={styles.contentContainer}
          onScroll={handleScroll}
          scrollEventThrottle={16}
        >
          <View style={styles.categoryTitleContainer}>
            <Ionicons name="phone-portrait-outline" size={24} color={PRIMARY_TEAL} />
            <Text style={styles.categoryTitle}>{category?.name || "Category"}</Text>
          </View>

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
        </Animated.ScrollView>
      )}

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
    paddingTop: 12,
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
    overflow: "visible",
  },
  subcategoryPillActive: {
    backgroundColor: "white",
    borderColor: DARK_GRAY,
    borderWidth: 1.5,
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
  stickyFilterTabsWrapper: {
    position: "absolute",
    top: SAFE_AREA_PADDING ,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "white",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 5,
    zIndex: 100,
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
    backgroundColor: PRIMARY_TEAL,
  },
  filterText: {
    fontSize: 14,
    fontWeight: "600",
    color: DARK_GRAY,
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
  heartIcon: {
    position: "absolute",
    top: 10,
    right: 10,
    padding: 5,
  },
  cardDetails: {
    padding: 12,
  },
  priceTag: {
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 8,
  },
  priceText: {
    fontSize: 14,
    fontWeight: "700",
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