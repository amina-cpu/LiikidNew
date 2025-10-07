import { useLocalSearchParams } from 'expo-router'; // 👈 Import from expo-router to get the ID
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator, // 👈 New import for loading state
  Alert,
  Dimensions,
  Image,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { Ionicons, MaterialCommunityIcons } from 'react-native-vector-icons';
import { supabase } from '../../lib/Supabase'; // 👈 IMPORTANT: Ensure this path is correct for your Supabase client

// --- Interfaces for fetched data ---
interface ProductDetail {
  id: number;
  name: string;
  price: number;
  listing_type: 'sell' | 'rent' | 'exchange';
  description: string;
  image_url: string | null;
  location_address: string | null;
  latitude: number | null;
  longitude: number | null;
  created_at: string;
  // likes: number; // Assuming you have a 'likes' column or can calculate it
  hasShipping: boolean; // Assuming this can be derived or is a column
}

const { width } = Dimensions.get('window');
const PRODUCT_IMAGE_HEIGHT = width * 1.1;

// --- Design Constants ---
const COLORS = {
  primary: '#00A78F',
  secondary: '#363636',
  textLight: '#8A8A8E',
  price: '#007AFF',
  background: '#FFFFFF',
  border: '#E8E8E8',
  white: '#FFFFFF',
  mapDark: '#333333',
};

const ProductDetailScreen = () => {
  // 1. Get the 'id' parameter from the URL
  const { id: productId } = useLocalSearchParams();
  
  // 2. State for product data and loading
  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // const [isLiked, setIsLiked] = useState(false); // Can be tied to actual likes later

  // 3. Data Fetching Effect
  useEffect(() => {
    // Only proceed if we have a valid product ID
    if (!productId || Array.isArray(productId)) {
      setLoading(false);
      setError('Invalid Product ID.');
      return;
    }

    const fetchProductDetail = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data, error } = await supabase
          .from('products')
          .select('id, name, price, listing_type, description, image_url, location_address, latitude, longitude, created_at') // Make sure these columns exist
          .eq('id', productId)
          .single(); // Use .single() as we expect only one result

        if (error) throw error;

        if (data) {
          // Map fetched data to your local interface, adding derived fields
          const productData: ProductDetail = {
            id: data.id,
            name: data.name,
            price: data.price,
            listing_type: data.listing_type as 'sell' | 'rent' | 'exchange',
            description: data.description || 'No description provided.',
            image_url: data.image_url,
            location_address: data.location_address,
            latitude: data.latitude,
            longitude: data.longitude,
            created_at: new Date(data.created_at).toLocaleDateString(),
            // likes: data.likes || 0, // Default to 0 if null
            hasShipping: data.listing_type === 'sell', // Example logic
          };
          setProduct(productData);
        } else {
            setError('Product not found.');
        }
      } catch (e: any) {
        console.error('Fetch Product Detail Error:', e);
        Alert.alert('Error', e.message || 'Failed to fetch product details.');
        setError('Failed to load product.');
      } finally {
        setLoading(false);
      }
    };

    fetchProductDetail();
  }, [productId]); // Re-run if productId changes (though it shouldn't for this screen)


  // --- Helper Functions and Loading/Error Views ---

  const renderPagination = () => (
    <View style={styles.paginationContainer}>
      {[0, 1, 2, 3].map((_, index) => (
        <View
          key={index}
          style={[
            styles.dot,
            { backgroundColor: index === 0 ? COLORS.white : 'rgba(255, 255, 255, 0.5)' },
          ]}
        />
      ))}
    </View>
  );

  // Loading State
  if (loading) {
    return (
      <View style={[styles.flexContainer, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={{ marginTop: 10, color: COLORS.secondary }}>Loading product details...</Text>
      </View>
    );
  }

  // Error/Not Found State
  if (error || !product) {
    return (
      <View style={[styles.flexContainer, { justifyContent: 'center', alignItems: 'center' }]}>
        <Ionicons name="alert-circle-outline" size={40} color={COLORS.textLight} />
        <Text style={{ marginTop: 10, fontSize: 16, color: COLORS.textLight }}>{error || 'Product not found.'}</Text>
      </View>
    );
  }
  
  // Format price helper
  const formatPrice = () => {
    if (!product) return 'N/A';
    if (product.listing_type === 'exchange') return 'Exchange';
    if (product.listing_type === 'rent') return `${product.price.toLocaleString()} DA/month`;
    return `${product.price.toLocaleString()} DA`;
  };

  // 4. Main Render with Fetched Data
  return (
    <SafeAreaView style={styles.flexContainer}>
      {/* Main Content Area */}
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* 1. Image Carousel Section (Header is overlayed) */}
        <View style={styles.imageSection}>
          <Image
            source={{ uri: product.image_url || 'https://placehold.co/600x660/333333/FFFFFF?text=Product+Image' }}
            style={styles.productImage}
            resizeMode="cover"
          />
          {renderPagination()}

          {/* OVERLAY: Custom Header */}
          <View style={styles.header}>
            <TouchableOpacity style={styles.iconButton} onPress={() => console.log('Go Back')}>
              <Ionicons name="arrow-back" size={24} color={COLORS.white} />
            </TouchableOpacity>
            <View style={styles.headerRight}>
              {/* <TouchableOpacity style={styles.iconButton} onPress={() => setIsLiked(!isLiked)}>
                <Ionicons
                  // name={isLiked ? 'heart' : 'heart-outline'}
                  // size={24}
                  // color={isLiked ? 'red' : COLORS.white}
                /> */}
              {/* </TouchableOpacity> */}
              <TouchableOpacity style={styles.iconButton} onPress={() => console.log('Options')}>
                <Ionicons name="ellipsis-vertical" size={24} color={COLORS.white} />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <View style={styles.detailsPadding}>
          {/* 2. Product Details */}
          <Text style={styles.title}>{product.name}</Text>
          <Text style={styles.conditionText}>
            Used - <Text style={styles.conditionValue}>Good</Text> {/* NOTE: You might need a 'condition' field in your DB */}
          </Text>

          <Text style={styles.priceText}>{formatPrice()}</Text>

          {product.hasShipping && (
            <View style={styles.shippingContainer}>
              <MaterialCommunityIcons name="truck-delivery" size={20} color={COLORS.primary} />
              <Text style={styles.shippingText}>Shipping available</Text>
            </View>
          )}

          {/* 3. Description Section */}
          <View style={styles.descriptionContainer}>
            <Text style={styles.descriptionHeader}>Description</Text>
            <Text style={styles.descriptionText} numberOfLines={4}>
              {product.description}{' '}
              <Text style={styles.seeMore}>See more</Text>
            </Text>

            <View style={styles.descriptionFooter}>
              <Text style={styles.postedText}>
                Posted on {product.created_at}
              </Text>
              <View style={styles.likesContainer}>
                <Ionicons name="heart" size={16} color="red" />
                {/* <Text style={styles.likesCount}>{product.likes}</Text> */}
              </View>
            </View>
          </View>

          {/* 4. Map Section */}
          <View style={styles.mapCard}>
            <View style={styles.mapImageContainer}>
              {/* Placeholder for the stylized map from fichepro2.PNG */}
              <View style={styles.stylizedMap}>
                <View style={styles.settifPin}>
                  <Text style={styles.settifText}>{product.location_address || 'Location'}</Text>
                </View>
              </View>
            </View>
            <Text style={styles.mapDisclaimer}>
              Map is approximate to keep seller's location private.
            </Text>
          </View>
        </View>
        {/* Extra space so content is visible above the fixed footer */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* 5. Sticky Action Buttons (Footer) */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.button, styles.callButton]}
          onPress={() => console.log('Call Action for product:', product.id)}
        >
          <Text style={styles.callButtonText}>Call</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.button, styles.chatButton]}
          onPress={() => console.log('Chat Action for product:', product.id)}
        >
          <Text style={styles.chatButtonText}>Chat</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

// ... (rest of the styles object, it remains the same)
const styles = StyleSheet.create({
  flexContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 20,
  },
  detailsPadding: {
    paddingHorizontal: 20,
    marginTop: 15,
  },

  // --- 1. Image and Header Styles ---
  imageSection: {
    width: width,
    height: PRODUCT_IMAGE_HEIGHT,
    backgroundColor: '#000',
  },
  productImage: {
    width: '100%',
    height: '100%',
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingTop: 10,
  },
  headerRight: {
    flexDirection: 'row',
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
  },
  paginationContainer: {
    position: 'absolute',
    bottom: 20,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4,
  },

  // --- 2. Product Details Styles ---
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.secondary,
    marginBottom: 5,
  },
  conditionText: {
    fontSize: 14,
    color: COLORS.textLight,
    marginBottom: 10,
  },
  conditionValue: {
    fontWeight: '600',
    color: COLORS.textLight,
  },
  priceText: {
    fontSize: 32,
    fontWeight: '700',
    color: COLORS.price,
    marginBottom: 15,
  },
  shippingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 167, 143, 0.1)',
    padding: 8,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginBottom: 25,
  },
  shippingText: {
    marginLeft: 8,
    color: COLORS.primary,
    fontWeight: '600',
    fontSize: 14,
  },

  // --- 3. Description Styles ---
  descriptionContainer: {
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 20,
    marginBottom: 25,
  },
  descriptionHeader: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.secondary,
    marginBottom: 10,
  },
  descriptionText: {
    fontSize: 16,
    lineHeight: 24,
    color: COLORS.secondary,
  },
  seeMore: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  descriptionFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 20,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  postedText: {
    fontSize: 13,
    color: COLORS.textLight,
  },
  likesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  likesCount: {
    marginLeft: 5,
    fontSize: 14,
    color: 'red',
  },

  // --- 4. Map Styles ---
  mapCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
    paddingBottom: 15,
  },
  mapImageContainer: {
    width: '100%',
    height: 180,
    overflow: 'hidden',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  stylizedMap: {
    flex: 1,
    backgroundColor: COLORS.mapDark,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    position: 'relative',
  },
  settifPin: {
    width: 60,
    height: 30,
    borderRadius: 15,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settifText: {
    fontWeight: 'bold',
    color: COLORS.mapDark,
    fontSize: 12,
  },
  mapDisclaimer: {
    textAlign: 'center',
    marginTop: 10,
    fontSize: 13,
    color: COLORS.textLight,
  },

  // --- 5. Footer/Button Styles ---
  footer: {
    flexDirection: 'row',
    padding: 15,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.white,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  button: {
    flex: 1,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 5,
  },
  callButton: {
    backgroundColor: COLORS.white,
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  callButtonText: {
    color: COLORS.primary,
    fontSize: 16,
    fontWeight: '700',
  },
  chatButton: {
    backgroundColor: COLORS.primary,
  },
  chatButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '700',
  },
});

export default ProductDetailScreen;