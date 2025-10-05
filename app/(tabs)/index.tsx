import * as Location from "expo-location";
import { useRouter } from "expo-router"; // 👈 important
import React, { useEffect, useState } from "react";
import {
  Dimensions,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import FontAwesome from "react-native-vector-icons/FontAwesome";
import Ionicons from "react-native-vector-icons/Ionicons";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";

const PRIMARY_TEAL = "#00C897";
const LIGHT_GRAY = "#F0F0F0";
const DARK_GRAY = "#333333";
const ACCENT_RED = "#FF5B5B";
const CARD_WIDTH = Dimensions.get("window").width / 2 - 24;
const SAFE_AREA_PADDING = 40;
const TAB_BAR_HEIGHT = 90;

type IconName =
  | "home"
  | "car"
  | "cog"
  | "wrench"
  | "mobile"
  | "laptop"
  | "shopping-bag";

const CATEGORIES: { name: string; icon: IconName }[] = [
  { name: "Real estate", icon: "home" },
  { name: "Cars & Vehicles", icon: "car" },
  { name: "Repair parts", icon: "cog" },
  { name: "Phone & Acc.", icon: "mobile" },
  { name: "Computers & Acc.", icon: "laptop" },
  { name: "Clothing & Fashion", icon: "shopping-bag" },
];

const FILTER_TABS = ["All", "Sell", "Rent", "Exchange"];

const MOCK_PRODUCTS = [
  {
    id: 1,
    title: "iPhone 14 Pro Max 256GB",
    price: "45,000 DA",
    distance: "2.5 km",
    isDelivery: true,
    imageUrl: "https://placehold.co/180x180/E0E0E0/333333?text=iPhone+Mock",
    isLiked: true,
  },
  {
    id: 2,
    title: "2BR Apartment with View",
    price: "25,000 DA/month",
    distance: "1.2 km",
    isDelivery: false,
    imageUrl: "https://placehold.co/180x180/D0E0FF/333333?text=Apt+Mock",
    isLiked: false,
  },
  {
    id: 3,
    title: 'MacBook Pro M2 13"',
    price: "Exchange",
    distance: "4.1 km",
    isDelivery: true,
    imageUrl: "https://placehold.co/180x180/F0F8FF/333333?text=MacBook+Mock",
    isLiked: false,
  },
  {
    id: 4,
    title: "Homemade Couscous",
    price: "800 DA",
    distance: "0.8 km",
    isDelivery: false,
    imageUrl: "https://placehold.co/180x180/FFFACD/333333?text=Food+Mock",
    isLiked: true,
  },
];

const CategoryButton: React.FC<{ name: string; icon: IconName }> = ({
  name,
  icon,
}) => {
  const router = useRouter(); // 👈 use router

  return (
   <TouchableOpacity
  style={styles.categoryButton}
  onPress={() => router.push("/category")}
>
  <FontAwesome name={icon} size={24} color={DARK_GRAY} />
  <Text style={styles.categoryText}>{name}</Text>
</TouchableOpacity>
  );
};

const ProductCard: React.FC<typeof MOCK_PRODUCTS[0]> = ({
  title,
  price,
  distance,
  isDelivery,
  imageUrl,
  isLiked,
}) => {
  const [liked, setLiked] = useState(isLiked);
  const toggleLike = () => setLiked(!liked);

  return (
    <View style={styles.cardContainer}>
      <TouchableOpacity
        onPress={() => console.log("Product Pressed")}
        style={styles.cardTouchable}
      >
        <View style={styles.imageWrapper}>
          <Image source={{ uri: imageUrl }} style={styles.cardImage} />
          {isDelivery && (
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
          <Text style={styles.cardPrice}>{price}</Text>
          <Text style={styles.cardTitle} numberOfLines={2}>
            {title}
          </Text>
          <View style={styles.distanceContainer}>
            <Ionicons name="location-outline" size={14} color={DARK_GRAY} />
            <Text style={styles.cardDistance}>{distance}</Text>
          </View>
        </View>
      </TouchableOpacity>
    </View>
  );
};

export default function HomeScreen() {
  const [selectedFilter, setSelectedFilter] = useState("All");
  const [location, setLocation] = useState<string>("Loading...");
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setLocation("Permission denied");
        return;
      }

      let coords = await Location.getCurrentPositionAsync({});
      let reverse = await Location.reverseGeocodeAsync(coords.coords);

      if (reverse.length > 0) {
        let city = reverse[0].city || reverse[0].region || "Unknown";
        setLocation(city);
      }
    })();
  }, []);

  return (
    <View style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.contentContainer}>
        {/* Header */}
        <View style={styles.header}>
          <View
            style={[
              styles.searchBar,
              isSearchFocused && styles.searchBarFocused,
            ]}
          >
            <Ionicons
              name="search"
              size={20}
              color={DARK_GRAY}
              style={styles.searchIcon}
            />
            <TextInput
              style={styles.searchInput}
              placeholder="Search anything"
              placeholderTextColor="#999"
              onFocus={() => setIsSearchFocused(true)}
              onBlur={() => setIsSearchFocused(false)}
            />
          </View>
          <View style={styles.locationContainer}>
            <Ionicons name="location-sharp" size={24} color={PRIMARY_TEAL} />
            <Text style={styles.locationText}>{location}</Text>
          </View>
        </View>

        {/* Categories */}
        <Text style={styles.sectionTitle}>Categories</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryScroll}
        >
          {CATEGORIES.map((cat, index) => (
            <CategoryButton key={index} name={cat.name} icon={cat.icon} />
          ))}
        </ScrollView>

        {/* Filters */}
        <View style={styles.filterTabs}>
          {FILTER_TABS.map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[
                styles.filterButton,
                selectedFilter === tab && styles.filterButtonActive,
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

        {/* Products */}
        <View style={styles.productGrid}>
          {MOCK_PRODUCTS.map((product) => (
            <ProductCard key={product.id} {...product} />
          ))}
        </View>

        {/* Load More */}
        <TouchableOpacity
          style={styles.loadMoreButton}
          onPress={() => console.log("Load More Pressed")}
        >
          <Text style={styles.loadMoreText}>Load More Items</Text>
        </TouchableOpacity>
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
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    height: 48,
    backgroundColor: LIGHT_GRAY,
    borderRadius: 24,
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
    fontSize: 16,
    color: DARK_GRAY,
    paddingVertical: 0,
  },
  locationContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  locationText: {
    marginLeft: 4,
    fontSize: 16,
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
    width: 100,
    height: 100,
    backgroundColor: LIGHT_GRAY,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  categoryText: {
    marginTop: 8,
    fontSize: 12,
    fontWeight: "500",
    color: DARK_GRAY,
    textAlign: "center",
  },
  filterTabs: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  filterButton: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 10,
    marginHorizontal: 4,
    borderRadius: 20,
    backgroundColor: LIGHT_GRAY,
  },
  filterButtonActive: {
    backgroundColor: PRIMARY_TEAL,
  },
  filterText: {
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
    borderRadius: 12,
    backgroundColor: "white",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  cardTouchable: {
    borderRadius: 12,
    overflow: "hidden",
  },
  imageWrapper: {
    width: "100%",
    aspectRatio: 1,
    backgroundColor: "#F7F7F7",
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
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
    padding: 4,
    borderRadius: 8,
  },
  heartIcon: {
    position: "absolute",
    top: 10,
    right: 10,
    padding: 5,
  },
  cardDetails: {
    padding: 10,
  },
  cardPrice: {
    fontSize: 18,
    fontWeight: "800",
    color: DARK_GRAY,
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
  loadMoreButton: {
    marginHorizontal: 16,
    marginTop: 20,
    paddingVertical: 14,
    backgroundColor: DARK_GRAY,
    borderRadius: 25,
    alignItems: "center",
    justifyContent: "center",
  },
  loadMoreText: {
    fontSize: 16,
    fontWeight: "700",
    color: "white",
  },
});
