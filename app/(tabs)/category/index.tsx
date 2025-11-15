import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import AsyncStorage from '@react-native-async-storage/async-storage';
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
  View
} from "react-native";

import { supabase } from "../../../lib/Supabase";
import i18n, { translateFilter } from '../../../lib/i18n';

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
  user_id: number;
}

const getCategoryTranslation = (catName: string): string => {
  const normalized = catName.trim().toLowerCase();

  const categoryMap: { [key: string]: string } = {
    'food': 'Food',
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
    'animals shop': 'AnimalShop',
    'home & furniture': 'HomeandFurniture',
  };

  const mappedKey = categoryMap[normalized];

  if (!mappedKey) return catName;

  const translationKey = `categories.${mappedKey}`;
  const translated = i18n.t(translationKey);
  return translated !== translationKey ? translated : catName;
};

const getSubcategoryTranslation = (subName: string): string => {
  if (!subName) return '';
  
  const normalized = subName.trim().toLowerCase();

  const subcategoryMap: { [key: string]: string } = {
    // Food
    'meat & fish': 'MeatAndFish',
    'meat and fish': 'MeatAndFish',
    'milk products': 'MilkProducts',
    'dairy': 'MilkProducts',
    'nuts & seeds': 'NutsAndSeeds',
    'nuts and seeds': 'NutsAndSeeds',
    'oils': 'Oils',
    'oil': 'Oils',
    'pasta': 'Pasta',
    'sauces - spices - condiments': 'SaucesSpicesCondiments',
    'sauces spices condiments': 'SaucesSpicesCondiments',
    'seeds - rice - cereals': 'SeedsRiceCereals',
    'seeds rice cereals': 'SeedsRiceCereals',
    'sugars & sweet products': 'SugarsAndSweetProducts',
    'sugars and sweet products': 'SugarsAndSweetProducts',
    'wheat and flour': 'WheatAndFlour',
    'wheat & flour': 'WheatAndFlour',
    'fruits & vegetables': 'FruitsAndVegetables',
    'fruits and vegetables': 'FruitsAndVegetables',
    'beverages': 'Beverages',
    'drinks': 'Beverages',
    
    // Phones & Accessories
    'phones': 'Phones',
    'phone': 'Phones',
    'phone cases': 'PhoneCases',
    'cases': 'PhoneCases',
    'chargers & cables': 'ChargersAndCables',
    'chargers and cables': 'ChargersAndCables',
    'charger': 'ChargersAndCables',
    'headphones & earphones': 'HeadphonesAndEarphones',
    'headphones and earphones': 'HeadphonesAndEarphones',
    'headphones': 'HeadphonesAndEarphones',
    'screen protectors': 'ScreenProtectors',
    'screen protector': 'ScreenProtectors',
    'power banks': 'PowerBanks',
    'power bank': 'PowerBanks',
    
    // Computers
    'laptops': 'Laptops',
    'laptop': 'Laptops',
    'desktop computers': 'DesktopComputers',
    'desktop': 'DesktopComputers',
    'tablets': 'Tablets',
    'tablet': 'Tablets',
    'monitors': 'Monitors',
    'monitor': 'Monitors',
    'keyboards & mice': 'KeyboardsAndMice',
    'keyboards and mice': 'KeyboardsAndMice',
    'keyboard': 'KeyboardsAndMice',
    'printers & scanners': 'PrintersAndScanners',
    'printers and scanners': 'PrintersAndScanners',
    'printer': 'PrintersAndScanners',
    
    // Vehicles
    'cars': 'Cars',
    'car': 'Cars',
    'motorcycles': 'Motorcycles',
    'motorcycle': 'Motorcycles',
    'trucks & vans': 'TrucksAndVans',
    'trucks and vans': 'TrucksAndVans',
    'truck': 'TrucksAndVans',
    'bicycles': 'Bicycles',
    'bicycle': 'Bicycles',
    
    // Real Estate
    'apartments': 'Apartments',
    'apartment': 'Apartments',
    'houses & villas': 'HousesAndVillas',
    'houses and villas': 'HousesAndVillas',
    'house': 'HousesAndVillas',
    'commercial properties': 'CommercialProperties',
    'commercial property': 'CommercialProperties',
    'land': 'Land',
    
    // Furniture
    'living room': 'LivingRoom',
    'bedroom': 'Bedroom',
    'office furniture': 'OfficeFurniture',
    'office': 'OfficeFurniture',
    'dining room': 'DiningRoom',
    'outdoor furniture': 'OutdoorFurniture',
    'outdoor': 'OutdoorFurniture',
    
    // Appliances
    'refrigerators': 'Refrigerators',
    'refrigerator': 'Refrigerators',
    'fridge': 'Refrigerators',
    'washing machine': 'WashingMachine',
    'washing machines': 'WashingMachine',
    'full pack': 'FullPack',
  };

  const mappedKey = subcategoryMap[normalized];

  if (!mappedKey) {
    if (__DEV__) {
      console.log('⚠️ No mapping found for subcategory:', normalized);
    }
    return subName;
  }

  const translationKey = `subcategories.${mappedKey}`;
  const translated = i18n.t(translationKey);
  
  if (__DEV__) {
    console.log('✅ Translation:', subName, '->', translated);
  }
  
  // Return translated text or original name if translation not found
  return translated !== translationKey ? translated : subName;
};
const FILTER_TABS = ["All", "Sell", "Rent", "Exchange"];

const getCategoryIcon = (name: string, size = 24, color = "#16A085") => {
  if (!name) return <MaterialCommunityIcons name="shape-outline" size={size} color={color} />;

  const lower = name.toLowerCase();

  if (lower.includes("real estate") || lower.includes("apartment") || lower.includes("villa") || lower.includes("house")|| lower.includes("commercial properties")|| lower.includes("land")) {
    return <MaterialCommunityIcons name="home-city-outline" size={size} color={color} />;
  }

  if (lower.includes("car") || lower.includes("vehicle")  || lower.includes("truck")) {
    return <Ionicons name="car-outline" size={size} color={color} />;
  }

  if (lower.includes("bicycles")  || lower.includes("motorcycles") ) {
    return <MaterialCommunityIcons  name="motorbike" size={size} color={color} />;
  }

  if (lower.includes("phone") || lower.includes("electronics") || lower.includes("appliance") || lower.includes("tv")) {
    return <Ionicons name="phone-portrait-outline" size={size} color={color} />;
  }

  if (lower.includes("washing machine") || lower.includes("machine")) {
    return <MaterialCommunityIcons name="washing-machine" size={size} color={color} />;
  }

  if (lower.includes("refrigirator") || lower.includes("fridge")) {
    return <MaterialCommunityIcons name="fridge-outline" size={size} color={color} />;
  }

  if (lower.includes("charger") || lower.includes("cable")) {
    return <MaterialCommunityIcons name="power-plug-outline" size={size} color={color} />;
  }

  if (lower.includes("headphones") || lower.includes("earphone")|| lower.includes("headphones & earphones") || lower.includes("earbud")) {
    return <MaterialCommunityIcons name="headphones" size={size} color={color} />;
  }

  if (lower.includes("computer") || lower.includes("laptop") || lower.includes("accessory")) {
    return <MaterialCommunityIcons name="laptop" size={size} color={color} />;
  }

  if (lower.includes("furniture") || lower.includes("chair") || lower.includes("sofa") || lower.includes("table")) {
    return <MaterialCommunityIcons name="sofa-outline" size={size} color={color} />;
  }

  if (lower.includes("fashion") || lower.includes("clothing") || lower.includes("dress") || lower.includes("shoes")) {
    return <MaterialCommunityIcons name="tshirt-crew-outline" size={size} color={color} />;
  }

  if (lower.includes("job") || lower.includes("career")) {
    return <MaterialCommunityIcons name="briefcase-outline" size={size} color={color} />;
  }

  if (lower.includes("service") || lower.includes("repair")) {
    return <MaterialCommunityIcons name="account-cog-outline" size={size} color={color} />;
  }

  if (lower.includes("book") || lower.includes("study") || lower.includes("education")) {
    return <Ionicons name="book-outline" size={size} color={color} />;
  }

  if (lower.includes("food") || lower.includes("restaurant") || lower.includes("drink")) {
    return <MaterialCommunityIcons name="food-outline" size={size} color={color} />;
  }

  if (lower.includes("sport") || lower.includes("fitness") || lower.includes("gym")) {
    return <MaterialCommunityIcons name="basketball-hoop-outline" size={size} color={color} />;
  }

  if (lower.includes("baby") || lower.includes("kid") || lower.includes("child") || lower.includes("toy")) {
    return <MaterialCommunityIcons name="baby-face-outline" size={size} color={color} />;
  }

  if (lower.includes("health") || lower.includes("beauty") || lower.includes("makeup")) {
    return <MaterialCommunityIcons name="heart-outline" size={size} color={color} />;
  }

  if (lower.includes("handmade") || lower.includes("craft") || lower.includes("art")) {
    return <MaterialCommunityIcons name="hammer-wrench" size={size} color={color} />;
  }

  if (lower.includes("travel") || lower.includes("trip") || lower.includes("flight")) {
    return <MaterialCommunityIcons name="airplane" size={size} color={color} />;
  }

  if (lower.includes("hobby") || lower.includes("entertainment") || lower.includes("music")) {
    return <MaterialCommunityIcons name="guitar-electric" size={size} color={color} />;
  }

  if (lower.includes("tool") || lower.includes("material") || lower.includes("equipment")) {
    return <MaterialCommunityIcons name="tools" size={size} color={color} />;
  }

  return <MaterialCommunityIcons name="shape-outline" size={size} color={color} />;
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

// 🆕 Enhanced 3D Subcategory Card Component with Animation
const SubcategoryCard: React.FC<{
  subcategory: Subcategory;
  isActive: boolean;
  hasResults: boolean;
  onPress: () => void;
}> = ({ subcategory, isActive, hasResults, onPress }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.95,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 3,
      useNativeDriver: true,
    }).start();
  };

  // Get translated name with proper fallback
  const translatedName = getSubcategoryTranslation(subcategory.name);
  
  // Debug log to check translation
  console.log('Subcategory:', subcategory.name, '-> Translated:', translatedName);

  return (
    <Animated.View
      style={[
        styles.subcategoryCard3D,
        {
          transform: [{ scale: scaleAnim }],
        },
      ]}
    >
      <TouchableOpacity
        style={[
          styles.subcategoryPill3D,
          isActive && styles.subcategoryPillActive3D,
        ]}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
      >
        {hasResults && <View style={styles.redDot3D} />}
        
        <View style={[
          styles.iconCircle,
          isActive && styles.iconCircleActive
        ]}>
          {getCategoryIcon(subcategory.name, 20, isActive ? "white" : PRIMARY_TEAL)}
        </View>
        
        <Text style={[
          styles.subcategoryText3D,
          isActive && styles.subcategoryTextActive3D
        ]}>
          {translatedName}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
};

const ProductCard: React.FC<{
  product: Product;
  userLat: number | null;
  userLon: number | null;
  currentUserId: number | null;
  isLiked: boolean;
  onToggleLike: (productId: number) => void;
}> = ({ product, userLat, userLon, currentUserId, isLiked, onToggleLike }) => {
  const router = useRouter();
  const [isAnimating, setIsAnimating] = useState(false);
  const isOwnProduct = currentUserId === product.user_id;

  const toggleLike = async () => {
    if (isAnimating) return;
    setIsAnimating(true);
    await onToggleLike(product.id);
    setTimeout(() => setIsAnimating(false), 300);
  };

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
    
    if (product.listing_type === "rent")
      return `${product.price.toLocaleString()} ${i18n.t('product.priceSuffixDAMonth')}`;
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
                `https://placehold.co/180x180/E0E0E0/333333?text=${i18n.t('product.noImage').replace(' ', '+')}`,
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
          <Text style={styles.loadMoreText}>{i18n.t('home.loadMore')}</Text>
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

  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [likedProducts, setLikedProducts] = useState<Set<number>>(new Set());

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
  const [location, setLocation] = useState<string>(i18n.t('home.loading'));
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

  const [filterTabsLayout, setFilterTabsLayout] = useState({ y: 0, height: 0 });
  const scrollY = useRef(new Animated.Value(0)).current;
  const [isSticky, setIsSticky] = useState(false);
  const headerHeight = useRef(new Animated.Value(1)).current;
  const lastScrollY = useRef(0);
  const scrollTimeout = useRef<NodeJS.Timeout | null>(null);

  const tabBarVisible = useRef(true);
  const upGestureCount = useRef(0);
  const scrollDirection = useRef<'up' | 'down' | null>(null);
  const upDistance = useRef(0);

  const MIN_SCROLL_DELTA = 5;
  const UP_GESTURE_DISTANCE = 100;

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
    }
  }, [currentUserId]);

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
        AsyncStorage.setItem('tabBarVisible', 'true');
      };
    }, [searchMode])
  );

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
    if (categoryId) {
      fetchData();
    }
  }, [categoryId]);

  useEffect(() => {
    if (listingTypeParam && filtersApplied) {
      setSelectedFilter(listingTypeParam);
    }
  }, [listingTypeParam, filtersApplied]);

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

    if (filtersApplied) {
      if (locationParam && locationParam !== "All Locations" && userLat && userLon) {
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
          filtered = filtered.filter(p => {
            if (p.latitude && p.longitude) {
              const distance = calculateDistance(cityCoords.lat, cityCoords.lon, p.latitude, p.longitude);
              return distance <= 50;
            }
            return false;
          });
        }
      }

      if (deliveryParam && deliveryParam !== "All Methods") {
        if (deliveryParam.toLowerCase() === "pickup") {
          filtered = filtered.filter(p => p.delivery === false);
        } else if (deliveryParam.toLowerCase() === "delivery" || deliveryParam.toLowerCase() === "shipping") {
          filtered = filtered.filter(p => p.delivery === true);
        }
      }

      if (minPriceParam !== null) {
        filtered = filtered.filter(p => p.price >= minPriceParam);
      }
      if (maxPriceParam !== null) {
        filtered = filtered.filter(p => p.price <= maxPriceParam);
      }

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

      const { data: productsData, error: productsError } = await supabase
        .from("products")
        .select(
          `id, name, price, listing_type, image_url, latitude, longitude, location_address, subcategory_id, sub_subcategory_id, created_at, delivery, user_id`
        )
        .eq("category_id", categoryId)
        .order("created_at", { ascending: false });

      if (productsError) throw productsError;
      
      setAllProducts(productsData || []);
      setHasMoreProducts(false);
    } catch (error: any) {
      console.error("Error fetching data:", error);
      Alert.alert(i18n.t('home.error'), i18n.t('home.failedToLoadData') + error.message);
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
        const delta = currentScrollY - lastScrollY.current;
        
        setIsSticky(currentScrollY >= filterTabsLayout.y);

        if (currentScrollY <= 50) {
          if (!tabBarVisible.current) {
            tabBarVisible.current = true;
            AsyncStorage.setItem('tabBarVisible', 'true');
          }
          upGestureCount.current = 0;
          upDistance.current = 0;
          scrollDirection.current = null;
          lastScrollY.current = currentScrollY;
          return;
        }

        let direction: 'up' | 'down' = scrollDirection.current ?? 'down';
        if (delta > MIN_SCROLL_DELTA) direction = 'down';
        else if (delta < -MIN_SCROLL_DELTA) direction = 'up';

        if (direction === 'down' && currentScrollY > 50) {
          if (tabBarVisible.current) {
            tabBarVisible.current = false;
            AsyncStorage.setItem('tabBarVisible', 'false');
          }
          upGestureCount.current = 0;
          upDistance.current = 0;

          if (scrollTimeout.current) {
            clearTimeout(scrollTimeout.current);
          }
          Animated.timing(headerHeight, {
            toValue: 0,
            duration: 200,
            useNativeDriver: false,
          }).start();
        }

        if (!tabBarVisible.current && direction === 'up') {
          upDistance.current += Math.abs(delta);

          if (upDistance.current >= UP_GESTURE_DISTANCE) {
            upGestureCount.current += 1;
            upDistance.current = 0;
          }

          if (upGestureCount.current >= 2) {
            tabBarVisible.current = true;
            AsyncStorage.setItem('tabBarVisible', 'true');
            upGestureCount.current = 0;
            upDistance.current = 0;
          }

          if (scrollTimeout.current) {
            clearTimeout(scrollTimeout.current);
          }
          scrollTimeout.current = setTimeout(() => {
            Animated.timing(headerHeight, {
              toValue: 1,
              duration: 200,
              useNativeDriver: false,
            }).start();
          }, 150);
        }

        scrollDirection.current = direction;
        lastScrollY.current = currentScrollY;
      },
    }
  );

  useEffect(() => {
    return () => {
      if (scrollTimeout.current) {
        clearTimeout(scrollTimeout.current);
      }
      AsyncStorage.setItem('tabBarVisible', 'true');
    };
  }, []);

  const openFilters = () => {
    const currentParams: any = {
      categoryId: categoryId,
    };
    
    if (selectedFilter !== "All") {
      currentParams.listingType = selectedFilter;
    }
    
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
    router.back();
  };

  const visibleSubcategories = currentSearchQuery.trim() 
    ? subcategories.filter(sub => sub.hasResults)
    : subcategories;

  if (loading) {
    return (
      <View style={[styles.safeArea, styles.loadingContainer]}>
        <ActivityIndicator size="large" color={PRIMARY_TEAL} />
        <Text style={styles.loadingText}>{i18n.t('home.loading')}</Text>
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
                placeholder={`${i18n.t('home.searchPlaceholder')} ${getCategoryTranslation(category?.name || '')}`}
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
                  {translateFilter(tab)}
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
                <Text style={styles.searchInputPlaceholder} numberOfLines={1}>
                  {currentSearchQuery.trim() ? currentSearchQuery : `${i18n.t('home.searchPlaceholder')} ${getCategoryTranslation(category?.name || '')}`}
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
            {getCategoryIcon(category?.name || "Category", 24, PRIMARY_TEAL)}
            <Text style={styles.categoryTitle}>
              {getCategoryTranslation(category?.name || "Category")}
            </Text>
          </View>

          {visibleSubcategories.length > 0 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.subcategoryScroll}
            >
              {visibleSubcategories.map((sub) => (
                <SubcategoryCard
                  key={sub.id}
                  subcategory={sub}
                  isActive={selectedSubcategory === sub.id}
                  hasResults={sub.hasResults || false}
                  onPress={() => {
                    if (currentSearchQuery.trim()) {
                      router.push(
                        `/category/subcategory/${sub.id}?searchMode=true&searchQuery=${encodeURIComponent(currentSearchQuery)}`
                      );
                    } else {
                      router.push(`/category/subcategory/${sub.id}`);
                    }
                  }}
                />
              ))}
            </ScrollView>
          )}

          {!isSticky && (
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
          )}

          {filteredProducts.length === 0 ? (
            <Text style={styles.emptyText}>
              {currentSearchQuery.trim() ? i18n.t('home.noProductsSearch') : i18n.t('home.noProductsFilter')}
            </Text>
          ) : (
            <View style={styles.productGrid}>
              {filteredProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  userLat={userLat}
                  userLon={userLon}
                  currentUserId={currentUserId}
                  isLiked={likedProducts.has(product.id)}
                  onToggleLike={handleToggleLike}
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
  searchInputPlaceholder: {
    flex: 1,
    fontSize: 15,
    color: "#6B7280",
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
    paddingBottom: 8,
  },
  // 🆕 Enhanced 3D Subcategory Styles
  subcategoryCard3D: {
    marginRight: 12,
    shadowColor: "#16A085",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  subcategoryPill3D: {
    position: "relative",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 16,
    backgroundColor: "white",
    borderWidth: 2,
    borderColor: "#E5E7EB",
    overflow: "visible",
    // 3D effect with inner shadow simulation
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  subcategoryPillActive3D: {
    backgroundColor: PRIMARY_TEAL,
    borderColor: PRIMARY_TEAL,
    borderWidth: 0,
    // Enhanced shadow for active state
    shadowColor: PRIMARY_TEAL,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 12,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#E8F5F3",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
    // Inner depth
    shadowColor: "#16A085",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 2,
  },
  iconCircleActive: {
    backgroundColor: "rgba(255, 255, 255, 0.25)",
    shadowColor: "rgba(255, 255, 255, 0.5)",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.6,
    shadowRadius: 4,
  },
  redDot3D: {
    position: "absolute",
    top: -12,
    right: -12,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: ACCENT_RED,
    borderWidth: 4,
    borderColor: "white",
    zIndex: 20,
    // Pulsing 3D shadow
    shadowColor: ACCENT_RED,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.6,
    shadowRadius: 10,
    elevation: 10,
  },
  subcategoryText3D: {
    fontSize: 14,
    fontWeight: "600",
    color: DARK_GRAY,
    letterSpacing: 0.3,
  },
  subcategoryTextActive3D: {
    color: "white",
    fontWeight: "700",
    textShadowColor: "rgba(0, 0, 0, 0.15)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  floatingImageIcon: {
    width: 28,
    height: 28,
    resizeMode: "contain",
    tintColor: "white",
  },
  filterTabsWrapper: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 0,
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
  productGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    paddingHorizontal: 8,
  },
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
  cardTouchable: {
    borderRadius: 20,
    overflow: "hidden",
    flex: 1,
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
  heartIcon: {
    position: "absolute",
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
  cardDetails: {
    padding: 12,
  },
  priceTag: {
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 6,
  },
  priceText: {
    fontSize: 13,
    fontWeight: "700",
  },
  cardTitle: {
    fontSize: 13,
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
  loadMoreContainer: {
    paddingHorizontal: 16,
    marginTop: 20,
    marginBottom: 40,
  },
  loadMoreButton: {
    backgroundColor: PRIMARY_TEAL,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: PRIMARY_TEAL,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
  },
  loadMoreText: {
    color: "white",
    fontSize: 16,
    fontWeight: "700",
  },
  floatingFilterButton: {
    position: "absolute",
    bottom: 120,
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