import React from 'react';
import {
  FlatList,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  Ionicons,
  MaterialCommunityIcons,
} from 'react-native-vector-icons';

// --- Dummy Data ---
const categories = [
  { id: '1', name: 'Smartphones', icon: 'smartphone' },
  { id: '2', name: 'Headphones', icon: 'headphones' },
  { id: '3', name: 'Tablets', icon: 'tablet' },
  { id: '4', name: 'Laptops', icon: 'laptop' },
];

const tabs = ['All', 'Sell', 'Rent', 'Exchange'];

const products = [
  {
    id: 'p1',
    name: 'iPhone 14 Pro Max 256GB',
    price: '45,000 DA',
    distance: '2.5 km',
    image:
      'https://via.placeholder.com/300/F5F5F5/000000?text=iPhone', // Replace with local image or real URL
    type: 'Sell',
  },
  {
    id: 'p2',
    name: 'Samsung Galaxy S23 Ultra',
    price: '38,000 DA',
    distance: '1.8 km',
    image:
      'https://via.placeholder.com/300/F5F5F5/000000?text=Samsung', // Replace with local image or real URL
    type: 'Sell',
  },
  {
    id: 'p3',
    name: 'Sony WH-1000XM5',
    price: '2,500 DA/day',
    distance: '3.2 km',
    image:
      'https://via.placeholder.com/300/F5F5F5/000000?text=Headphones', // Replace with local image or real URL
    type: 'Rent',
  },
  {
    id: 'p4',
    name: 'iPad Pro 12.9" + Pencil',
    price: '85,000 DA',
    distance: '4.7 km',
    image:
      'https://via.placeholder.com/300/F5F5F5/000000?text=iPad', // Replace with local image or real URL
    type: 'Exchange',
  },
  // Add more products for scrolling if needed
];

// --- Sub Components ---

const Header = () => (
  <View style={styles.headerContainer}>
    <TouchableOpacity style={styles.backButton}>
      <Ionicons name="arrow-back" size={24} color="#000" />
    </TouchableOpacity>
    <View style={styles.searchContainer}>
      <MaterialCommunityIcons
        name="magnify"
        size={20}
        color="#888"
        style={styles.searchIcon}
      />
      <TextInput
        style={styles.searchInput}
        placeholder="Search anything"
        placeholderTextColor="#888"
      />
    </View>
    <TouchableOpacity style={styles.locationContainer}>
      <MaterialCommunityIcons
        name="map-marker-outline"
        size={20}
        color="#4CAF50" // A green color
      />
      <Text style={styles.locationText}>Setif</Text>
    </TouchableOpacity>
  </View>
);

const CategoryItem = ({ name, icon }) => (
  <TouchableOpacity style={styles.categoryItem}>
    <MaterialCommunityIcons name={icon} size={20} color="#000" />
    <Text style={styles.categoryText}>{name}</Text>
  </TouchableOpacity>
);

const TabButton = ({ title, isActive }) => (
  <TouchableOpacity
    style={[
      styles.tabButton,
      isActive ? styles.activeTab : styles.inactiveTab,
    ]}
  >
    <Text
      style={[
        styles.tabText,
        isActive ? styles.activeTabText : styles.inactiveTabText,
      ]}
    >
      {title}
    </Text>
  </TouchableOpacity>
);

const ProductCard = ({ product }) => (
  <View style={styles.cardContainer}>
    <View style={styles.cardHeader}>
      <Image source={{ uri: product.image }} style={styles.productImage} />
      <View style={styles.topIcons}>
        <View style={styles.deliveryIconContainer}>
          <MaterialCommunityIcons
            name="truck-fast"
            size={16}
            color="#FFF"
          />
        </View>
        <TouchableOpacity
          style={[
            styles.heartIconContainer,
            product.type === 'Sell' ? styles.heartSell : styles.heartOther,
          ]}
        >
          <MaterialCommunityIcons
            name="heart"
            size={20}
            color="#FFF"
          />
        </TouchableOpacity>
      </View>
    </View>
    <View style={styles.cardBody}>
      <Text style={styles.productPrice}>{product.price}</Text>
      <Text style={styles.productName} numberOfLines={2}>
        {product.name}
      </Text>
      <View style={styles.distanceContainer}>
        <MaterialCommunityIcons
          name="map-marker"
          size={14}
          color="#4CAF50"
        />
        <Text style={styles.distanceText}>{product.distance}</Text>
      </View>
    </View>
  </View>
);

// --- Main Component ---

const SecondPageClone = () => {
  return (
    <View style={styles.screenContainer}>
      {/* Header */}
      <Header />

      {/* Main Content ScrollView */}
      <ScrollView
        style={styles.contentScrollView}
        showsVerticalScrollIndicator={false}
      >
        {/* Section: Phone & Accessories */}
        <View style={styles.sectionHeader}>
          <MaterialCommunityIcons
            name="cellphone"
            size={20}
            color="#4CAF50"
          />
          <Text style={styles.sectionTitle}>Phone & Accessories</Text>
        </View>

        {/* Categories Horizontal Scroll */}
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={categories}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <CategoryItem name={item.name} icon={item.icon} />
          )}
          contentContainerStyle={styles.categoryList}
        />

        {/* Tabs */}
        <View style={styles.tabsContainer}>
          {tabs.map((tab) => (
            <TabButton key={tab} title={tab} isActive={tab === 'All'} />
          ))}
        </View>

        {/* Product Grid */}
        <FlatList
          data={products}
          keyExtractor={(item) => item.id}
          numColumns={2}
          scrollEnabled={false} // Nested FlatList: keep scrollEnabled false
          columnWrapperStyle={styles.row}
          renderItem={({ item }) => <ProductCard product={item} />}
          contentContainerStyle={styles.productList}
        />

        {/* Load More Button */}
        <TouchableOpacity style={styles.loadMoreButton}>
          <Text style={styles.loadMoreButtonText}>Load More Items</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

// --- Styles ---

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    backgroundColor: '#fff',
    paddingTop: 50, // For a status bar offset
  },
  contentScrollView: {
    flex: 1,
    paddingHorizontal: 15,
  },
  // --- Header Styles ---
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingBottom: 15,
  },
  backButton: {
    padding: 5,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    borderRadius: 20,
    marginHorizontal: 10,
    paddingHorizontal: 10,
    height: 40,
  },
  searchIcon: {
    marginRight: 5,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#000',
    paddingVertical: 0,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationText: {
    marginLeft: 4,
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  // --- Section Header (Phone & Accessories) ---
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginLeft: 8,
    color: '#000',
  },
  // --- Categories Scroll ---
  categoryList: {
    paddingRight: 20,
    marginBottom: 15,
  },
  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 15,
    paddingVertical: 10,
    paddingHorizontal: 15,
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  categoryText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '500',
    color: '#000',
  },
  // --- Tabs ---
  tabsContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    backgroundColor: '#F5F5F5',
    borderRadius: 15,
    padding: 3,
    marginBottom: 15,
  },
  tabButton: {
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 15,
    marginRight: 5, // Spacing between tabs
  },
  activeTab: {
    backgroundColor: '#000',
  },
  inactiveTab: {
    backgroundColor: 'transparent',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
  },
  activeTabText: {
    color: '#fff',
  },
  inactiveTabText: {
    color: '#666',
  },
  // --- Product Grid ---
  productList: {
    paddingBottom: 20,
  },
  row: {
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  cardContainer: {
    width: '48%', // For two columns with some space in between
    backgroundColor: '#fff',
    borderRadius: 15,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#EFEFEF',
  },
  cardHeader: {
    position: 'relative',
    width: '100%',
    aspectRatio: 1, // Square image container
  },
  productImage: {
    width: '100%',
    height: '100%',
  },
  topIcons: {
    position: 'absolute',
    top: 10,
    left: 10,
    right: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  deliveryIconContainer: {
    backgroundColor: '#4CAF50',
    borderRadius: 50,
    padding: 5,
    alignSelf: 'flex-start',
  },
  heartIconContainer: {
    borderRadius: 50,
    padding: 4,
    alignSelf: 'flex-end',
  },
  heartSell: {
    backgroundColor: '#FF0000', // Red for Sell/Heart
  },
  heartOther: {
    backgroundColor: '#777777', // Grey for Rent/Exchange
  },
  cardBody: {
    padding: 10,
  },
  productPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 4,
  },
  productName: {
    fontSize: 14,
    color: '#333',
    minHeight: 36, // Ensure consistent height for 2 lines
  },
  distanceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  distanceText: {
    marginLeft: 5,
    fontSize: 12,
    color: '#4CAF50',
    fontWeight: '500',
  },
  // --- Load More Button ---
  loadMoreButton: {
    backgroundColor: '#000',
    paddingVertical: 15,
    borderRadius: 30,
    alignItems: 'center',
    marginVertical: 20,
  },
  loadMoreButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default SecondPageClone;