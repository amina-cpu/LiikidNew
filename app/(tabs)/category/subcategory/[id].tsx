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
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import { supabase } from "../../../../lib/Supabase";

const PRIMARY_TEAL = "#00C897";
const LIGHT_GRAY = "#F5F5F5";
const DARK_GRAY = "#333333";
const ACCENT_RED = "#FF5B5B";
const ORANGE = "#FF6B35";
const BLUE = "#4A90E2";
const CARD_WIDTH = Dimensions.get("window").width / 2 - 24;

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
}

interface Category {
  id: number;
  name: string;
}

interface Subcategory {
  id: number;
  category_id: number;
  name: string;
}

const FILTER_TABS = ["All", "Sell", "Rent", "Exchange"];

// Helper for distance
const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
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
  const [liked, setLiked] = useState(false);
  const toggleLike = () => setLiked(!liked);

  let distance = "N/A";
  if (userLat && userLon && product.latitude && product.longitude) {
    const dist = calculateDistance(userLat, userLon, product.latitude, product.longitude);
    distance = dist < 1 ? `${(dist * 1000).toFixed(0)} m` : `${dist.toFixed(1)} km`;
  }

  const formatPrice = () => {
    if (product.listing_type === "exchange") return "Exchange";
    if (product.listing_type === "rent") return `${product.price.toLocaleString()} DA/month`;
    return `${product.price.toLocaleString()} DA`;
  };

  const getPriceColor = () => {
    if (product.listing_type === "exchange") return "#9B59B6";
    if (product.listing_type === "rent") return ORANGE;
    return BLUE;
  };

  const hasDelivery = product.listing_type === "sell";

  return (
    <View style={styles.cardContainer}>
      <TouchableOpacity style={styles.cardTouchable}>
        <View style={styles.imageWrapper}>
          <Image
            source={{
              uri:
                product.image_url ||
                "https://placehold.co/180x180/E0E0E0/333333?text=No+Image",
            }}
            style={styles.cardImage}
          />
          {hasDelivery && (
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

export default function SubcategoryScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const subcategoryId = params.id ? Number(params.id) : null;

  const [subSubcategories, setSubSubcategories] = useState<SubSubcategory[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [selectedBrand, setSelectedBrand] = useState<number | null>(null);
  const [selectedFilter, setSelectedFilter] = useState("All");
  const [userLat, setUserLat] = useState<number | null>(null);
  const [userLon, setUserLon] = useState<number | null>(null);
  const [location, setLocation] = useState<string>("Loading...");
  const [loading, setLoading] = useState(true);
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
      fetchData();
    }
  }, [subcategoryId]);

  const fetchData = async () => {
    try {
      setLoading(true);

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

      // Fetch products
      const { data: productData, error: productError } = await supabase
        .from("products")
        .select("*")
        .eq("subcategory_id", subcategoryId)
        .order("created_at", { ascending: false });

      if (productError) throw productError;
      setProducts(productData || []);
      setFilteredProducts(productData || []);
    } catch (e: any) {
      Alert.alert("Error", e.message);
    } finally {
      setLoading(false);
    }
  };

  // Filter products
  useEffect(() => {
    let filtered = products;

    // Filter by brand
    if (selectedBrand) {
      filtered = filtered.filter(p => p.sub_subcategory_id === selectedBrand);
    }

    // Filter by listing type
    if (selectedFilter !== "All") {
      filtered = filtered.filter(
        p => p.listing_type.toLowerCase() === selectedFilter.toLowerCase()
      );
    }

    // Filter by search query
    if (searchQuery.trim()) {
      filtered = filtered.filter(p =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredProducts(filtered);
  }, [selectedBrand, selectedFilter, searchQuery, products]);

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
      <ScrollView contentContainerStyle={{ paddingBottom: 20 }}>
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
              placeholder="Search smartphones"
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

        {/* Breadcrumb */}
        <View style={styles.breadcrumbContainer}>
          <Text style={styles.breadcrumbText}>
            {category?.name || "Category"}
          </Text>
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

        {/* Filter Tabs */}
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
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { 
    flex: 1, 
    backgroundColor: "white", 
    paddingTop: 40 
  },
  loadingContainer: { 
    justifyContent: "center", 
    alignItems: "center" 
  },
  loadingText: { 
    marginTop: 10, 
    fontSize: 16, 
    color: DARK_GRAY 
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
    marginBottom: 16 
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
    color: DARK_GRAY
  },
  brandTextActive: {
    color: "white",
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
    overflow: "hidden" 
  },
  imageWrapper: {
    width: "100%",
    aspectRatio: 1,
    backgroundColor: "#F7F7F7",
  },
  cardImage: { 
    width: "100%", 
    height: "100%", 
    resizeMode: "cover" 
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
    padding: 5 
  },
  cardDetails: { 
    padding: 12 
  },
  cardPrice: { 
    fontSize: 16, 
    fontWeight: "700", 
    marginBottom: 4 
  },
  cardTitle: { 
    fontSize: 14, 
    fontWeight: "500", 
    color: DARK_GRAY, 
    minHeight: 36 
  },
  distanceContainer: { 
    flexDirection: "row", 
    alignItems: "center", 
    marginTop: 4 
  },
  cardDistance: { 
    marginLeft: 4, 
    fontSize: 12, 
    color: "#666" 
  },
  emptyText: { 
    textAlign: "center", 
    fontSize: 16, 
    color: "#999", 
    marginVertical: 20 
  },
});