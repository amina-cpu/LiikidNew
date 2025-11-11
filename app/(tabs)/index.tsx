import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from "expo-location";

import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  Image,
  RefreshControl,
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
import i18n, { translateFilter } from '../../lib/i18n';

const PRIMARY_TEAL = "#16A085";
const LIGHT_GRAY = "#F5F5F5";
const DARK_GRAY = "#333333";
const ACCENT_RED = "#FF5B5B";
const ORANGE = "#FF6B35";
const BLUE = "#4A90E2";
const CARD_WIDTH = Dimensions.get("window").width / 2 - 12; 

const SAFE_AREA_PADDING = 40;
const TAB_BAR_HEIGHT = 90;

const INITIAL_PRODUCT_LIMIT = 14;
const LOAD_MORE_INCREMENT = 10;

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
  hasResults?: boolean;
  productCount?: number;
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
  user_id: number;
}

const FILTER_TABS = ["All", "Sell", "Rent", "Exchange"];

const getCategoryIcon = (categoryName: string): IconName => {
  const name = categoryName.toLowerCase();
  if (name.includes("real estate") || name.includes("property") || name.includes("immobilier") || name.includes("عقار")) return "home";
  if (name.includes("vehicle") || name.includes("car") || name.includes("voiture") || name.includes("سيارة")) return "car";
  if (name.includes("phone") || name.includes("téléphone") || name.includes("هاتف")) return "mobile";
  if (name.includes("computer") || name.includes("laptop") || name.includes("ordinateur") || name.includes("كمبيوتر")) return "laptop";
  if (name.includes("clothing") || name.includes("fashion") || name.includes("vêtement") || name.includes("ملابس"))
    return "shopping-bag";
  if (name.includes("food") || name.includes("alimentation") || name.includes("طعام")) return "cutlery";
  if (name.includes("sport") || name.includes("رياضة")) return "soccer-ball-o";
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

const getCategoryTranslation = (catName: string): string => {
  const normalized = catName.trim().toLowerCase();

  const categoryMap: { [key: string]: string } = {
  'food': 'Food',
  'animals shop': 'AnimalShop', // ✅ fixed
  'home & furniture': 'HomeandFurniture',
  'computers & accessories': 'ComputersAccessories',
  'real estate': 'RealEstate',
  'electronics & home appliance': 'ElectronicsHomeAppliance',
  'materials & equipment': 'MaterialsEquipment',
  'repair parts': 'RepairParts',
  'cars and vehicles': 'CarsVehicles',
  'sports': 'Sports',
  'phones & accessories': 'PhonesAccessories',
  'travel': 'Travel',
  'computers & laptops': 'ComputersLaptops',
  'hobbies and entertainment': 'HobbiesEntertainment',
  'baby essentials': 'BabyEssentials',
  'clothing & fashion': 'ClothingFashion',
  'health & beauty': 'HealthBeauty',
  'homemade & handcrafted': 'HomemadeHandcrafted',
};

  const mappedKey = categoryMap[normalized];

  if (!mappedKey) return catName;

  const translationKey = `categories.${mappedKey}`;
  const translated = i18n.t(translationKey);
  return translated !== translationKey ? translated : catName;
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
      router.push({
        pathname: `/category`,
        params: {
          id: category.id,
          searchQuery: searchQuery,
          searchMode: 'true',
        },
      });
    } else {
      router.push(`/category?id=${category.id}`);
    }
  };

  return (
  
 <TouchableOpacity
    style={[styles.categoryButton, { backgroundColor: bgColor }]}
    onPress={handlePress}
  >
    {searchMode && category.hasResults && (
      <View style={styles.redDot} />
    )}
    <FontAwesome 
      name={getCategoryIcon(category.name)} 
      size={28} 
      color="white" 
      style={{ zIndex: 2 }}
    />
    <Text style={styles.categoryText}>{getCategoryTranslation(category.name)}</Text>
  </TouchableOpacity>
);};

const ProductCard: React.FC<{
  product: Product;
  userLat: number | null;
  userLon: number | null;
  categories: Category[];
  isLiked: boolean;
  onToggleLike: (productId: number) => void;
  currentUserId: number | null;
}> = ({ product, userLat, userLon, categories, isLiked, onToggleLike, currentUserId }) => {
  const router = useRouter();
  const [isAnimating, setIsAnimating] = useState(false);

  const toggleLike = async () => {
    if (isAnimating) return;
    setIsAnimating(true);
    await onToggleLike(product.id);
    setTimeout(() => setIsAnimating(false), 300);
  };

  const category = categories.find((c) => c.id === product.category_id);
  const categoryAcceptsDelivery = category?.delivery || false;
  const isOwnProduct = currentUserId === product.user_id;

  let distance = "N/A";
  if (userLat && userLon && product.latitude && product.longitude) {
    const dist = calculateDistance(userLat, userLon, product.latitude, product.longitude);
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
    if (product.listing_type === "exchange") return i18n.t('product.exchangeTag');

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
        return `${formattedMillions} million ${i18n.t('product.priceSuffixDAMonth')}`;
      }
      return `${formattedMillions} million ${i18n.t('product.priceSuffixDA')}`;
    }

    if (product.listing_type === "rent") {
      return `${product.price.toLocaleString()} ${i18n.t('product.priceSuffixDAMonth')}`;
    }
    return `${product.price.toLocaleString()} ${i18n.t('product.priceSuffixDA')}`;
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
                `https://placehold.co/250x250/E0E0E0/333333?text=${i18n.t('product.noImage').replace(' ', '+')}`,
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

          {!isOwnProduct && (
            <TouchableOpacity
              onPress={toggleLike}
              style={styles.heartIcon}
              disabled={isAnimating}
            >
              <Ionicons
                name={isLiked ? "heart" : "heart-outline"}
                size={22}
                color={isLiked ? "#FF5B5B" : "white"}
              />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.cardDetails}>
          <View
            style={[
              styles.priceTag,
              { backgroundColor: tagColors.bg },
            ]}
          >
            <Text
              style={[
                styles.priceText,
                { color: tagColors.text },
              ]}
            >
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
          <Text style={styles.loadMoreText}>{i18n.t('home.loadMore')}</Text>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
};

export default function HomeScreen() {
  const [location, setLocation] = useState<string>(i18n.t('home.loading'));
  const [userLat, setUserLat] = useState<number | null>(null);
  const [userLon, setUserLon] = useState<number | null>(null);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [likedProducts, setLikedProducts] = useState<Set<number>>(new Set());
  const [blockedUserIds, setBlockedUserIds] = useState<Set<number>>(new Set()); 
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
  const [refreshing, setRefreshing] = useState(false);
  const [productLimit, setProductLimit] = useState(INITIAL_PRODUCT_LIMIT);
  const [hasMoreProducts, setHasMoreProducts] = useState(true);

  const [filterTabsLayout, setFilterTabsLayout] = useState({ y: 0, height: 0 });

  const [isSticky, setIsSticky] = useState(false);

  // 🆕 Tab bar visibility state

  const scrollTimeout = useRef<NodeJS.Timeout | null>(null);


  const fetchBlockedUsers = useCallback(async (userId: number) => {
    try {
      console.log(`🔍 Fetching users blocked by ${userId}`);
      
      const { data: blockedByMe, error: blockedByMeError } = await supabase
        .from('block')
        .select('blocked_id')
        .eq('blocker_id', userId);

      if (blockedByMeError) throw blockedByMeError;
      
      const blockedIds = new Set(blockedByMe?.map(item => item.blocked_id) || []);
      
      console.log('✅ Blocked users IDs:', Array.from(blockedIds));
      setBlockedUserIds(blockedIds);

    } catch (error) {
      console.error('❌ Error fetching blocked users:', error);
    }
  }, []);

  useEffect(() => {
    const getCurrentUser = async () => {
      try {
        const userJson = await AsyncStorage.getItem('user');
        const userIdString = await AsyncStorage.getItem('userId');

        if (userJson) {
          const user = JSON.parse(userJson);
          const userId = user.user_id || user.id || parseInt(userIdString || '0');

          if (userId && userId > 0) {
            setCurrentUserId(userId);
            return;
          }
        }

        const { data: { session } } = await supabase.auth.getSession();

        if (session?.user?.email) {
          const { data: dbUser, error } = await supabase
            .from('users')
            .select('user_id, email, username')
            .eq('email', session.user.email.toLowerCase())
            .single();

          if (dbUser && !error) {
            setCurrentUserId(dbUser.user_id);
            await AsyncStorage.setItem('user', JSON.stringify(dbUser));
            await AsyncStorage.setItem('userId', String(dbUser.user_id));
            await AsyncStorage.setItem('isLoggedIn', 'true');
          }
        }
      } catch (error) {
        console.error('❌ Error getting current user:', error);
      }
    };

    getCurrentUser();
  }, []);

  useEffect(() => {
    if (currentUserId) {
      fetchUserLikes();
      fetchBlockedUsers(currentUserId);
    } else {
      setBlockedUserIds(new Set());
    }
  }, [currentUserId, fetchBlockedUsers]);

  const fetchUserLikes = async () => {
    if (!currentUserId) return;

    try {
      const { data, error } = await supabase
        .from('likes')
        .select('product_id')
        .eq('user_id', currentUserId)
        .not('product_id', 'is', null);

      if (error) throw error;

      const likedProductIds = new Set(data?.map(like => like.product_id) || []);
      setLikedProducts(likedProductIds);
    } catch (error: any) {
      console.error('Error fetching likes:', error);
    }
  };

  const handleToggleLike = async (productId: number) => {
    if (!currentUserId) {
      Alert.alert(i18n.t('home.loginRequiredTitle'), i18n.t('home.loginRequiredMessage'));
      return;
    }

    const isCurrentlyLiked = likedProducts.has(productId);

    try {
      if (isCurrentlyLiked) {
        await supabase
          .from('likes')
          .delete()
          .eq('user_id', currentUserId)
          .eq('product_id', productId);

        setLikedProducts(prev => {
          const newSet = new Set(prev);
          newSet.delete(productId);
          return newSet;
        });
      } else {
        await supabase.from('likes').insert({
          user_id: currentUserId,
          product_id: productId,
          post_id: null
        });

        setLikedProducts(prev => new Set([...prev, productId]));

        const { data: productData } = await supabase
          .from("products")
          .select("user_id")
          .eq("id", productId)
          .single();

        if (productData && productData.user_id !== currentUserId) {
          await supabase.from("notifications").insert({
            receiver_id: productData.user_id,
            sender_id: currentUserId,
            type: "like",
            product_id: productId,
          });
        }
      }
    } catch (error: any) {
      console.error("Error toggling like:", error);
      Alert.alert(i18n.t('home.error'), i18n.t('home.failedToUpdateLike'));
    }
  };

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setLocation(i18n.t('home.permissionDenied'));
        return;
      }

      let coords = await Location.getCurrentPositionAsync({});
      setUserLat(coords.coords.latitude);
      setUserLon(coords.coords.longitude);

      let reverse = await Location.reverseGeocodeAsync(coords.coords);

      if (reverse.length > 0) {
        let city = reverse[0].city || reverse[0].region || i18n.t('home.unknownLocation');
        setLocation(city);
      }
    })();
  }, []);

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

  const fetchProducts = async (isInitialLoad: boolean) => {
    if (!isInitialLoad && !hasMoreProducts) return;

    if (!isInitialLoad) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }

    try {
      let query = supabase
        .from("products")
        .select(
          "id, name, price, listing_type, image_url, latitude, longitude, location_address, created_at, category_id, user_id",
          { count: "exact" }
        )
        .order("created_at", { ascending: false });

      const blockedIdsArray = Array.from(blockedUserIds);
      if (blockedIdsArray.length > 0) {
        query = query.not('user_id', 'in', `(${blockedIdsArray.join(',')})`);
        console.log(`⚠️ Excluding products from blocked user IDs: ${blockedIdsArray.join(', ')}`);
      }

      if (searchMode && searchQuery) {
        query = query.ilike("name", `%${searchQuery}%`);
      }

      if (!searchMode) {
        const from = isInitialLoad ? 0 : products.length;
        const limit = isInitialLoad ? INITIAL_PRODUCT_LIMIT : LOAD_MORE_INCREMENT;
        query = query.range(from, from + limit - 1);
      }

      const { data: productsData, error: productsError, count } = await query;

      if (productsError) throw productsError;

      const newProducts = isInitialLoad ? productsData || [] : [...products, ...(productsData || [])];
      setProducts(newProducts as Product[]);

      if (searchMode) {
        setHasMoreProducts(false);
      } else {
        setHasMoreProducts((count || 0) > newProducts.length);
      }
    } catch (error: any) {
      console.error("HOME ERROR fetching products:", error);
      Alert.alert(i18n.t('home.error'), i18n.t('home.failedToLoadProducts') + error.message);
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
      const { data: productsData, error } = await supabase
        .from("products")
        .select("category_id")
        .ilike("name", `%${searchQuery}%`);

      if (error) throw error;

      if (productsData) {
        const categoryIds = [...new Set(productsData.map(p => p.category_id))];

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

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      console.log("=== HOME: Starting fetchData ===");

      console.log("HOME: Fetching categories...");
      const { data: categoriesData, error: categoriesError } = await supabase
        .from("categories")
        .select("id, name, description, delivery")
        .order("name");

      if (categoriesError) throw categoriesError;
      setCategories(categoriesData || []);

      await fetchProducts(true);

      if (searchMode && searchQuery) {
        await markCategoriesWithResults();
      }

      console.log("HOME: Fetch complete");
    } catch (error: any) {
      console.error("HOME ERROR:", error);
      Alert.alert(i18n.t('home.error'), i18n.t('home.failedToLoadData') + error.message);
    } finally {
      setLoading(false);
      console.log("=== HOME: Finished fetchData ===");
    }
  }, [searchMode, searchQuery, blockedUserIds]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleLoadMore = () => {
    fetchProducts(false);
  };

  const handleBackToHome = () => {
    router.push('/');
  };
// put these at top of component


const scrollY = useRef(new Animated.Value(0)).current;
const lastScrollY = useRef(0);
const tabBarVisible = useRef(true);
const upGestureCount = useRef(0);
const scrollDirection = useRef<'up' | 'down' | null>(null);
const upDistance = useRef(0);

const MIN_SCROLL_DELTA = 5;       // ignore micro scrolls
const UP_GESTURE_DISTANCE = 100;  // pixels required per “gesture”

const handleScroll = Animated.event(
  [{ nativeEvent: { contentOffset: { y: scrollY } } }],
  {
    useNativeDriver: false,
    listener: (event: any) => {
      const offsetY = event.nativeEvent.contentOffset.y;
      const delta = offsetY - lastScrollY.current;

      let direction: 'up' | 'down' = scrollDirection.current ?? 'down';
      if (delta > MIN_SCROLL_DELTA) direction = 'down';
      else if (delta < -MIN_SCROLL_DELTA) direction = 'up';

      // Update sticky filter tabs
      setIsSticky(offsetY >= filterTabsLayout.y);

      // ALWAYS show tab bar when at the top
      if (offsetY <= 50) {
        if (!tabBarVisible.current) {
          tabBarVisible.current = true;
          AsyncStorage.setItem('tabBarVisible', 'true');
        }
        upGestureCount.current = 0;
        upDistance.current = 0;
        scrollDirection.current = direction;
        lastScrollY.current = offsetY;
        return;
      }

      // --- DOWN: hide immediately (only when scrolled past 50) ---
      if (direction === 'down' && offsetY > 50) {
        if (tabBarVisible.current) {
          tabBarVisible.current = false;
          AsyncStorage.setItem('tabBarVisible', 'false');
        }
        upGestureCount.current = 0;
        upDistance.current = 0;
      }

      // --- UP: accumulate distance ---
      if (!tabBarVisible.current && direction === 'up') {
        upDistance.current += Math.abs(delta);

        // If the user scrolled up enough, count one gesture
        if (upDistance.current >= UP_GESTURE_DISTANCE) {
          upGestureCount.current += 1;
          upDistance.current = 0; // reset for next gesture
        }

        // Show after 2 up gestures
        if (upGestureCount.current >= 2) {
          tabBarVisible.current = true;
          AsyncStorage.setItem('tabBarVisible', 'true');
          upGestureCount.current = 0;
          upDistance.current = 0;
        }
      }

      scrollDirection.current = direction;
      lastScrollY.current = offsetY;
    },
  }
);
useEffect(() => {
  return () => {
    AsyncStorage.setItem('tabBarVisible', 'true');
  };
}, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      setProducts([]);
      setDisplayedProducts([]);
      setHasMoreProducts(true);
      setSelectedFilter("All");

      if (currentUserId) {
        await fetchBlockedUsers(currentUserId);
        await fetchUserLikes();
      }
      await fetchData(); 

    } catch (error) {
      console.error('Error refreshing:', error);
    } finally {
      setRefreshing(false);
    }
  }, [currentUserId, fetchData, fetchBlockedUsers]);

  // 🆕 Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (scrollTimeout.current) {
        clearTimeout(scrollTimeout.current);
      }
      // Show tab bar when leaving screen
      AsyncStorage.setItem('tabBarVisible', 'true');
    };
  }, []);

  if (loading && products.length === 0 && !refreshing) {
    return (
      <View style={[styles.safeArea, styles.loadingContainer]}>
        <ActivityIndicator size="large" color={PRIMARY_TEAL} />
        <Text style={styles.loadingText}>{i18n.t('home.loading')}</Text>
      </View>
    );
  }

  const finalDisplayedProducts = displayedProducts.filter(p =>
    selectedFilter === 'All' || p.listing_type.toLowerCase() === selectedFilter.toLowerCase()
  );

  const displayCategories = searchMode
    ? categories.filter(cat => cat.hasResults)
    : categories;

  return (
    <View style={styles.safeArea}>
      {isSticky && (
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
                  {translateFilter(tab)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      <ScrollView
        contentContainerStyle={styles.contentContainer}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[PRIMARY_TEAL]}
            tintColor={PRIMARY_TEAL}
            title={i18n.t('home.pullToRefresh')}
            titleColor={DARK_GRAY}
          />
        }
      >
        <View style={styles.header}>
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
            <View style={[
              styles.searchBar,
              searchMode && styles.searchBarActive
            ]}>
              <Ionicons
                name="search"
                size={20}
                color="#9CA3AF"
                style={styles.searchIcon}
              />
              <Text style={styles.searchInputPlaceholder}>
                {searchMode ? searchQuery : i18n.t('home.searchPlaceholder')}
              </Text>
            </View>
          </TouchableOpacity>
          <View style={styles.locationContainer}>
            <Ionicons name="location-sharp" size={20} color={PRIMARY_TEAL} />
            <Text style={styles.locationText}>{location}</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>{i18n.t('home.categoriesTitle')}</Text>
        {displayCategories.length === 0 ? (
          <Text style={styles.emptyText}>{i18n.t('home.noCategories')}</Text>
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
                  {translateFilter(tab)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {finalDisplayedProducts.length === 0 ? (
          <Text style={styles.emptyText}>
            {searchMode ? i18n.t('home.noProductsSearch') : i18n.t('home.noProductsFilter')}
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
                isLiked={likedProducts.has(product.id)}
                onToggleLike={handleToggleLike}
                currentUserId={currentUserId}
              />
            ))}
          </View>
        )}

        {!searchMode && selectedFilter === "All" && hasMoreProducts && (
          <LoadMoreButton onPress={handleLoadMore} loading={loadingMore} />
        )}
        {/* {!searchMode && selectedFilter === "All" && !hasMoreProducts && products.length > 0 && (
          <Text style={styles.noMoreText}>{i18n.t('home.noMoreText')}</Text>
        )} */}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "white",
    paddingTop: SAFE_AREA_PADDING,
    marginBottom:40
  },
  
  // 🔍 SEARCH BAR - Enhanced shadow
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

  // 🎨 CATEGORY BUTTON - Natural 3D with soft outer shadow (like iOS)
  categoryButton: {
    width: 95,
    height: 95,
    borderRadius: 24,
    marginRight: 12,
    justifyContent: "center",
    alignItems: "center",
    padding: 10,
    position: 'relative',
    
    // Soft outer shadow for depth
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 6,
  },

  categoryText: {
    color: "white",
    fontSize: 10,
    fontWeight: "700",
    marginTop: 6,
    textAlign: "center",
    textShadowColor: 'rgba(0, 0, 0, 0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
    zIndex: 2,
  },

  // 📦 PRODUCT CARD - Much bigger with minimal spacing
  cardContainer: {
    width: CARD_WIDTH,
    marginBottom: 8,
    borderRadius: 20,
    backgroundColor: "white",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },

  productGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    paddingHorizontal: 8,
  },

  imageWrapper: {
    width: "100%",
    aspectRatio: 0.8,
    backgroundColor: "#F7F7F7",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
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
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
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
    fontSize: 14,
    fontWeight: "500",
    color: "#333",
    minHeight: 34,
    marginBottom: 4,
  },

  distanceContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 2,
  },

  cardDistance: {
    marginLeft: 4,
    marginRight: 4,
    fontSize: 13,
    color: "#666",
  },

  searchBarActive: {
    borderColor: PRIMARY_TEAL,
    borderWidth: 2,
    shadowColor: PRIMARY_TEAL,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
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
    marginTop: 16,
    marginBottom: 8,
    fontWeight: '600'
  },

  contentContainer: {
    paddingBottom: 20,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },

  backButton: {
    marginRight: 10,
  },

  searchBarWrapper: {
    flex: 1,
    marginRight: 10,
  },

  searchBarFocused: {
    borderColor: PRIMARY_TEAL,
    borderWidth: 2,
  },

  searchIcon: {
    marginRight: 8,
  },

  searchInputPlaceholder: {
    flex: 1,
    fontSize: 15,
    color: "#6B7280",
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
    marginBottom: 12,
    marginTop: 10,
  },

  categoryScroll: {
    paddingHorizontal: 16,
    paddingBottom: 12,
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

  cardTouchable: {
    borderRadius: 20,
    overflow: 'hidden',
    flex: 1,
  },

  cardDetails: {
    padding: 12,
  },

  heartIcon: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 20,
    padding: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 5,
  },

  redDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: ACCENT_RED,
    zIndex: 2,
    borderWidth: 2,
    borderColor: 'white',
    shadowColor: ACCENT_RED,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.6,
    shadowRadius: 4,
    elevation: 5,
  },

  loadMoreContainer: {
    paddingHorizontal: 16,
    marginTop: 20,
    marginBottom: 40,
  },

  loadMoreButton: {
    backgroundColor: PRIMARY_TEAL,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: PRIMARY_TEAL,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
  },

  loadMoreText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
  },
});