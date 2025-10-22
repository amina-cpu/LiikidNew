import { decode } from 'base64-arraybuffer';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { supabase } from '../../lib/Supabase';
import { useAuth } from '../context/AuthContext';
import { useLocalSearchParams, useRouter } from "expo-router";
interface Category {
  id: number;
  name: string;
  description: string | null;
  delivery?: boolean;
}

 
interface Subcategory {
  id: number;
  category_id: number;
  name: string;
  description: string | null;
}

interface SubSubcategory {
  id: number;
  subcategory_id: number;
  name: string;
  description: string | null;
}
const PRIMARY_TEAL = "#000000ff";
const AddListingForm = () => {
  const { user } = useAuth();
  const router = useRouter();
  const [photos, setPhotos] = useState<string[]>([]);
  const [mainPhotoIndex, setMainPhotoIndex] = useState(0);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dealType, setDealType] = useState<'sell' | 'rent' | 'exchange'>('sell');
  const [alsoExchange, setAlsoExchange] = useState(false);
  const [price, setPrice] = useState('');
  const [currency, setCurrency] = useState('DA');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [condition, setCondition] = useState<'new' | 'used'>('new');
  const [deliveryMethod, setDeliveryMethod] = useState<string | null>(null);
  const [locationAddress, setLocationAddress] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [subSubcategories, setSubSubcategories] = useState<SubSubcategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [selectedSubcategory, setSelectedSubcategory] = useState<Subcategory | null>(null);
  const [selectedSubSubcategory, setSelectedSubSubcategory] = useState<SubSubcategory | null>(null);
  
  const [errors, setErrors] = useState<any>({});
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showDeliveryModal, setShowDeliveryModal] = useState(false);
  const [categoryStep, setCategoryStep] = useState(1);
  const [uploading, setUploading] = useState(false);
  const [loadingCategories, setLoadingCategories] = useState(true);

  const scrollViewRef = useRef<ScrollView>(null);
const handleBackPress = () => {
    if (uploading) {
      Alert.alert(
        'Upload in Progress',
        'Please wait for the upload to complete before going back.'
      );
      return;
    }

    // Check if user has made any changes
    const hasChanges = photos.length > 0 || title.trim() !== '' || description.trim() !== '' || 
                       price.trim() !== '' || selectedCategory !== null;

    if (hasChanges) {
      Alert.alert(
        'Discard Changes?',
        'You have unsaved changes. Are you sure you want to go back?',
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Discard', 
            style: 'destructive',
            onPress: () => router.back()
          }
        ]
      );
    } else {
      router.back();
    }
  };
  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    if (user && user.phone_number) {
      setPhoneNumber(user.phone_number);
    }
  }, [user]);

  useEffect(() => {
    if (selectedCategory) {
      fetchSubcategories(selectedCategory.id);
    } else {
      setSubcategories([]);
      setSelectedSubcategory(null);
      setSubSubcategories([]);
      setSelectedSubSubcategory(null);
    }
  }, [selectedCategory]);

  useEffect(() => {
    if (selectedSubcategory) {
      fetchSubSubcategories(selectedSubcategory.id);
    } else {
      setSubSubcategories([]);
      setSelectedSubSubcategory(null);
    }
  }, [selectedSubcategory]);

  const fetchCategories = async () => {
    try {
      setLoadingCategories(true);
      const { data, error } = await supabase
        .from('categories')
        .select('id, name, description, delivery')
        .order('name');

      if (error) throw error;
      setCategories(data || []);
    } catch (error: any) {
      console.error('Error fetching categories:', error);
      Alert.alert('Error', 'Unable to load categories: ' + error.message);
    } finally {
      setLoadingCategories(false);
    }
  };

  const fetchSubcategories = async (categoryId: number) => {
    try {
      const { data, error } = await supabase
        .from('subcategories')
        .select('id, category_id, name, description')
        .eq('category_id', categoryId)
        .order('name');

      if (error) throw error;
      setSubcategories(data || []);
    } catch (error: any) {
      console.error('Error fetching subcategories:', error);
      Alert.alert('Error', 'Unable to load subcategories');
    }
  };

  const fetchSubSubcategories = async (subcategoryId: number) => {
    try {
      const { data, error } = await supabase
        .from('sub_subcategories')
        .select('id, subcategory_id, name, description')
        .eq('subcategory_id', subcategoryId)
        .order('name');

      if (error) throw error;
      setSubSubcategories(data || []);
    } catch (error: any) {
      console.error('Error fetching sub-subcategories:', error);
      Alert.alert('Error', 'Unable to load sub-subcategories');
    }
  };

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'We need access to your photos to upload an image.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.3,
        allowsMultipleSelection: false,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const asset = result.assets[0];
        
        if (asset.fileSize && asset.fileSize > 3 * 1024 * 1024) {
          Alert.alert('Image Too Large', 'The image is too large. Please choose a smaller image.');
          return;
        }

        setPhotos([...photos, asset.uri]);
      }
    } catch (error: any) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Unable to select image');
    }
  };

  const removePhoto = (index: number) => {
    const newPhotos = photos.filter((_, i) => i !== index);
    setPhotos(newPhotos);
    if (mainPhotoIndex === index) {
      setMainPhotoIndex(0);
    } else if (mainPhotoIndex > index) {
      setMainPhotoIndex(mainPhotoIndex - 1);
    }
  };

  const uploadImage = async (uri: string): Promise<string | null> => {
    try {
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      if (base64.length > 7000000) {
        throw new Error('Image is too large. Please choose a smaller image.');
      }

      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.jpg`;
      const arrayBuffer = decode(base64);

      const { data, error } = await supabase.storage
        .from('product-images')
        .upload(fileName, arrayBuffer, {
          contentType: 'image/jpeg',
          upsert: false,
        });

      if (error) throw error;

      const { data: publicUrlData } = supabase.storage
        .from('product-images')
        .getPublicUrl(fileName);

      return publicUrlData.publicUrl;
    } catch (err: any) {
      console.error('Upload error:', err);
      Alert.alert('Upload Error', err.message || 'Failed to upload image');
      return null;
    }
  };

  const validateForm = () => {
    const newErrors: any = {};
    
    if (!user) {
      Alert.alert('Error', 'You must be logged in to create a listing.');
      return false;
    }
    
    if (photos.length === 0) newErrors.photos = 'Please add at least one photo.';
    if (!title.trim()) newErrors.title = 'Please enter a title.';
    if (!description.trim()) newErrors.description = 'Please add a description.';
    if (dealType !== 'exchange' && !price.trim()) newErrors.price = 'Please enter a price.';
    if (!selectedSubSubcategory && !selectedSubcategory && !selectedCategory) {
      newErrors.category = 'Please select a category.';
    }
    
    if (selectedCategory?.delivery !== false && !deliveryMethod) {
      newErrors.delivery = 'Please select a delivery method.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handlePublish = async () => {
    if (uploading) return;

    if (!validateForm()) {
      Alert.alert('Error', 'Please fill in all required fields.');
      return;
    }

    try {
      setUploading(true);

      const uploadedUrls: string[] = [];
      
      for (let i = 0; i < photos.length; i++) {
        const imageUrl = await uploadImage(photos[i]);
        if (imageUrl) uploadedUrls.push(imageUrl);
      }

      if (uploadedUrls.length === 0) {
        Alert.alert('Image Upload Failed', 'All image uploads failed.', [
          { text: 'Cancel', style: 'cancel', onPress: () => setUploading(false) },
          { text: 'Continue', onPress: () => insertProduct([]) }
        ]);
        return;
      }

      const mainUrl = uploadedUrls[mainPhotoIndex];
      const otherUrls = uploadedUrls.filter((_, idx) => idx !== mainPhotoIndex);
      const orderedUrls = [mainUrl, ...otherUrls];

      await insertProduct(orderedUrls);

    } catch (error: any) {
      console.error('Error in handlePublish:', error);
      Alert.alert('Error', 'An error occurred: ' + (error.message || 'Unknown error'));
      setUploading(false);
    }
  };

  const insertProduct = async (imageUrls: string[]) => {
    try {
      if (!user || !user.user_id) {
        throw new Error('User not authenticated');
      }
const router = useRouter();
const handleBackPress = () => {
  if (uploading) {
    Alert.alert(
      'Upload in Progress',
      'Please wait for the upload to complete before going back.'
    );
    return;
  }

  // Check if user has made any changes
  const hasChanges = photos.length > 0 || title.trim() !== '' || description.trim() !== '' || 
                     price.trim() !== '' || selectedCategory !== null;

  if (hasChanges) {
    Alert.alert(
      'Discard Changes?',
      'You have unsaved changes. Are you sure you want to go back?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Discard', 
          style: 'destructive',
          onPress: () => router.back()
        }
      ]
    );
  } else {
    router.back();
  }
};
      const productData: any = {
        name: title.trim(),
        description: description.trim() || null,
        price: dealType !== 'exchange' ? parseFloat(price) : 0,
        listing_type: dealType,
        category_id: selectedCategory?.id || null,
        image_url: imageUrls.length > 0 ? imageUrls[0] : null,
        delivery: deliveryMethod === 'Delivery' || deliveryMethod === 'Both',
        user_id: user.user_id,
        state: 'active',
      };

      if (selectedSubcategory) productData.subcategory_id = selectedSubcategory.id;
      if (selectedSubSubcategory) productData.sub_subcategory_id = selectedSubSubcategory.id;
      if (locationAddress.trim()) productData.location_address = locationAddress.trim();
      if (latitude && !isNaN(parseFloat(latitude))) productData.latitude = parseFloat(latitude);
      if (longitude && !isNaN(parseFloat(longitude))) productData.longitude = parseFloat(longitude);

      const { data, error } = await supabase
        .from('products')
        .insert([productData])
        .select();

      if (error) throw error;

      const productId = data[0]?.id;

      if (imageUrls.length > 1 && productId) {
        const imageRecords = imageUrls.slice(1).map((url, index) => ({
          product_id: productId,
          image_url: url,
          order: index + 2,
        }));

        await supabase.from('product_images').insert(imageRecords);
      }

      Alert.alert('✅ Success', 'Listing published successfully!', [
        {
          text: 'OK',
          onPress: () => {
            setPhotos([]);
            setMainPhotoIndex(0);
            setTitle('');
            setDescription('');
            setPrice('');
            setDealType('sell');
            setAlsoExchange(false);
            setCondition('new');
            setDeliveryMethod(null);
            setLocationAddress('');
            setLatitude('');
            setLongitude('');
            setSelectedCategory(null);
            setSelectedSubcategory(null);
            setSelectedSubSubcategory(null);
            setErrors({});
          }
        }
      ]);

    } catch (error: any) {
      console.error('Error in insertProduct:', error);
      
      let errorMessage = 'Unable to add product';
      if (error.code === '23503') errorMessage = 'Invalid category or user reference.';
      else if (error.code === '42501') errorMessage = 'You do not have permission to add products';
      else if (error.code === '23505') errorMessage = 'This product already exists';
      else if (error.message) errorMessage = error.message;
      
      Alert.alert('Error', errorMessage);
    } finally {
      setUploading(false);
    }
  };

  const renderCategoryModal = () => (
    <Modal visible={showCategoryModal} animationType="slide" transparent={true} onRequestClose={() => setShowCategoryModal(false)}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>
            {categoryStep === 1 ? 'Select Category' : categoryStep === 2 ? 'Select Subcategory' : 'Select Sub-subcategory'}
          </Text>
          
          <ScrollView style={styles.modalScroll}>
            {categoryStep === 1 && categories.map(cat => (
              <TouchableOpacity
                key={cat.id}
                style={styles.modalOption}
                onPress={() => {
                  setSelectedCategory(cat);
                  setSelectedSubcategory(null);
                  setSelectedSubSubcategory(null);
                  if (cat.delivery === false) setDeliveryMethod(null);
                  if (subcategories.length > 0 || cat.id !== selectedCategory?.id) {
                    setCategoryStep(2);
                  } else {
                    setShowCategoryModal(false);
                    setCategoryStep(1);
                  }
                }}
              >
                <Text style={styles.modalOptionText}>{cat.name}</Text>
              </TouchableOpacity>
            ))}
            
            {categoryStep === 2 && subcategories.map(sub => (
              <TouchableOpacity
                key={sub.id}
                style={styles.modalOption}
                onPress={() => {
                  setSelectedSubcategory(sub);
                  setSelectedSubSubcategory(null);
                  if (subSubcategories.length > 0 || sub.id !== selectedSubcategory?.id) {
                    setCategoryStep(3);
                  } else {
                    setShowCategoryModal(false);
                    setCategoryStep(1);
                  }
                }}
              >
                <Text style={styles.modalOptionText}>{sub.name}</Text>
              </TouchableOpacity>
            ))}
            
            {categoryStep === 3 && subSubcategories.map(subsub => (
              <TouchableOpacity
                key={subsub.id}
                style={styles.modalOption}
                onPress={() => {
                  setSelectedSubSubcategory(subsub);
                  setShowCategoryModal(false);
                  setCategoryStep(1);
                }}
              >
                <Text style={styles.modalOptionText}>{subsub.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          
          <TouchableOpacity style={styles.modalClose} onPress={() => { setShowCategoryModal(false); setCategoryStep(1); }}>
            <Text style={styles.modalCloseText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  const renderDeliveryModal = () => (
    <Modal visible={showDeliveryModal} animationType="slide" transparent={true} onRequestClose={() => setShowDeliveryModal(false)}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Select Delivery Method</Text>
          
          <TouchableOpacity style={styles.modalOption} onPress={() => { setDeliveryMethod('In-person'); setShowDeliveryModal(false); }}>
            <Text style={styles.modalOptionText}>In-person Meeting</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.modalOption} onPress={() => { setDeliveryMethod('Delivery'); setShowDeliveryModal(false); }}>
            <Text style={styles.modalOptionText}>Delivery</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.modalOption} onPress={() => { setDeliveryMethod('Both'); setShowDeliveryModal(false); }}>
            <Text style={styles.modalOptionText}>Both</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.modalClose} onPress={() => setShowDeliveryModal(false)}>
            <Text style={styles.modalCloseText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  if (loadingCategories) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#10B981" />
        <Text style={styles.loadingText}>Loading categories...</Text>
      </View>
    );
  }

  if (!user) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>Please log in to create a listing</Text>
      </View>
    );
  }

  const categoryAllowsDelivery = selectedCategory?.delivery !== false;

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
  <TouchableOpacity style={styles.backCircle} onPress={handleBackPress}>
          <Ionicons name="arrow-back" size={24} color={PRIMARY_TEAL} />
        </TouchableOpacity>

  <Text style={styles.topBarTitle}>Add Listing</Text>
  <View style={{ width: 32 }} /> 
</View>


      <ScrollView ref={scrollViewRef} style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* <View style={styles.userInfoSection}>
          <Text style={styles.userInfoText}>Posting as: {user.username}</Text>
        </View> */}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Photos</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photosScroll}>
            <TouchableOpacity style={styles.addPhotoBox} onPress={pickImage} disabled={uploading}>
              <Text style={styles.addPhotoPlus}>+</Text>
              <Text style={styles.addPhotoText}>Add Photo</Text>
            </TouchableOpacity>
            
            {photos.map((photo, index) => (
              <View key={index} style={styles.photoItem}>
                <Image source={{ uri: photo }} style={styles.photoImage} />
                <TouchableOpacity style={styles.photoDelete} onPress={() => removePhoto(index)} disabled={uploading}>
                  <Text style={styles.photoDeleteText}>×</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.photoStar} onPress={() => setMainPhotoIndex(index)} disabled={uploading}>
                  <Text style={styles.photoStarText}>{mainPhotoIndex === index ? '★' : '☆'}</Text>
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>
          {errors.photos && <Text style={styles.errorText}>{errors.photos}</Text>}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Title</Text>
          <View style={[styles.inputContainer, errors.title && styles.inputError]}>
            <TextInput
              style={styles.input}
              placeholder="What are you selling?"
              placeholderTextColor="#9CA3AF"
              value={title}
              onChangeText={setTitle}
              maxLength={200}
              editable={!uploading}
            />
            {errors.title && (
              <View style={styles.errorIconContainer}>
                <Text style={styles.errorIcon}>▲</Text>
              </View>
            )}
          </View>
          {errors.title && <Text style={styles.errorText}>{errors.title}</Text>}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Description</Text>
          <View style={[styles.inputContainer, errors.description && styles.inputError]}>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Describe your item in detail..."
              placeholderTextColor="#9CA3AF"
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={4}
              maxLength={2000}
              editable={!uploading}
            />
            {errors.description && (
              <View style={styles.errorIconContainerTextArea}>
                <Text style={styles.errorIcon}>▲</Text>
              </View>
            )}
          </View>
          {errors.description && <Text style={styles.errorText}>{errors.description}</Text>}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Category</Text>
          <TouchableOpacity
            style={[styles.selectContainer, errors.category && styles.inputError]}
            onPress={() => setShowCategoryModal(true)}
            disabled={uploading}
          >
            <Text style={[styles.selectText, !selectedSubSubcategory && !selectedSubcategory && !selectedCategory && styles.placeholderText]}>
              {selectedSubSubcategory?.name || selectedSubcategory?.name || selectedCategory?.name || 'Select category'}
            </Text>
            <Text style={styles.selectArrow}>›</Text>
          </TouchableOpacity>
          {errors.category && <Text style={styles.errorText}>{errors.category}</Text>}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Deal Type</Text>
          <View style={styles.dealTypeContainer}>
            <TouchableOpacity
              style={[styles.dealTypeButton, dealType === 'sell' && styles.dealTypeSell]}
              onPress={() => setDealType('sell')}
              disabled={uploading}
            >
              <Text style={[styles.dealTypeText, dealType === 'sell' && styles.dealTypeTextActive]}>Sell</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.dealTypeButton, dealType === 'rent' && styles.dealTypeRent]}
              onPress={() => setDealType('rent')}
              disabled={uploading}
            >
              <Text style={[styles.dealTypeText, dealType === 'rent' && styles.dealTypeTextActive]}>Rent</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.dealTypeButton, dealType === 'exchange' && styles.dealTypeExchange]}
              onPress={() => setDealType('exchange')}
              disabled={uploading}
            >
              <Text style={[styles.dealTypeText, dealType === 'exchange' && styles.dealTypeTextActive]}>Exchange</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.switchContainer}>
            <Text style={styles.switchLabel}>Also available for exchange</Text>
            <Switch
              value={alsoExchange}
              onValueChange={setAlsoExchange}
              trackColor={{ false: '#E5E7EB', true: '#10B981' }}
              thumbColor="#fff"
              disabled={uploading}
            />
          </View>
        </View>

        {dealType !== 'exchange' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Price</Text>
            <View style={styles.priceRow}>
              <View style={[styles.priceInputContainer, errors.price && styles.inputError]}>
                <TextInput
                  style={styles.input}
                  placeholder="Price"
                  placeholderTextColor="#9CA3AF"
                  value={price}
                  onChangeText={setPrice}
                  keyboardType="numeric"
                  editable={!uploading}
                />
                {errors.price && (
                  <View style={styles.errorIconContainer}>
                    <Text style={styles.errorIcon}>▲</Text>
                  </View>
                )}
              </View>
              <View style={styles.currencyContainer}>
                <Text style={styles.currencyText}>DA</Text>
              </View>
            </View>
            {errors.price && <Text style={styles.errorText}>{errors.price}</Text>}
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Phone Number (Optional)</Text>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="e.g. 0777770707"
              placeholderTextColor="#9CA3AF"
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              keyboardType="phone-pad"
              editable={!uploading}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Condition</Text>
          <View style={styles.conditionContainer}>
            <TouchableOpacity
              style={[styles.conditionButton, condition === 'new' && styles.conditionActive]}
              onPress={() => setCondition('new')}
              disabled={uploading}
            >
              <Text style={[styles.conditionText, condition === 'new' && styles.conditionTextActive]}>New</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.conditionButton, condition === 'used' && styles.conditionActive]}
              onPress={() => setCondition('used')}
              disabled={uploading}
            >
              <Text style={[styles.conditionText, condition === 'used' && styles.conditionTextActive]}>Used</Text>
            </TouchableOpacity>
          </View>
        </View>

        {categoryAllowsDelivery && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Delivery Method</Text>
            <TouchableOpacity
              style={[styles.selectContainer, errors.delivery && styles.inputError]}
              onPress={() => setShowDeliveryModal(true)}
              disabled={uploading}
            >
              <Text style={[styles.selectText, !deliveryMethod && styles.placeholderText]}>
                {deliveryMethod || 'Select delivery method'}
              </Text>
              <Text style={styles.selectArrow}>›</Text>
            </TouchableOpacity>
            {errors.delivery && <Text style={styles.errorText}>{errors.delivery}</Text>}
          </View>
        )}

        {/* <View style={styles.section}>
          <Text style={styles.sectionTitle}>Location</Text>
          <TextInput
            style={styles.input}
            placeholder="Address (optional)"
            placeholderTextColor="#9CA3AF"
            value={locationAddress}
            onChangeText={setLocationAddress}
            editable={!uploading}
          />
          <View style={styles.mapContainer}>
            <View style={styles.mapPlaceholder}>
              <View style={styles.mapPin}>
                <Text style={styles.mapPinText}>📍</Text>
              </View>
            </View>
            <Text style={styles.mapLabel}>Tap to set location</Text>
          </View>
        </View> */}

        <TouchableOpacity 
          style={[styles.publishButton, uploading && styles.publishButtonDisabled]} 
          onPress={handlePublish}
          disabled={uploading}
        >
          {uploading ? (
            <View style={styles.uploadingRow}>
              <ActivityIndicator color="#fff" />
              <Text style={styles.uploadingText}>Uploading {photos.length} photo{photos.length > 1 ? 's' : ''}...</Text>
            </View>
          ) : (
            <Text style={styles.publishButtonText}>Publish Listing</Text>
          )}
        </TouchableOpacity>
      </ScrollView>

      {renderCategoryModal()}
      {renderDeliveryModal()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 10, fontSize: 16, color: '#666' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#E5E7EB', backgroundColor: '#fff' },
  
  headerTitle: { fontSize: 20, fontWeight: '600', color: '#111' },
  scrollView: { flex: 1 },
  userInfoSection: { padding: 16, backgroundColor: '#F0FDF4', borderBottomWidth: 1, borderBottomColor: '#D1FAE5' },
  userInfoText: { fontSize: 14, color: '#059669', fontWeight: '500' },
  section: { padding: 16, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  sectionTitle: { fontSize: 15, fontWeight: '600', color: '#111', marginBottom: 10 },
  photosScroll: { flexDirection: 'row' },
  addPhotoBox: { width: 90, height: 90, borderWidth: 2, borderColor: '#D1D5DB', borderStyle: 'dashed', borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  addPhotoPlus: { fontSize: 32, color: '#9CA3AF', marginBottom: 4 },
  addPhotoText: { fontSize: 12, color: '#6B7280' },
  photoItem: { width: 90, height: 90, marginRight: 12, position: 'relative' },
  photoImage: { width: '100%', height: '100%', borderRadius: 8 },
  photoDelete: { position: 'absolute', top: 4, right: 4, width: 24, height: 24, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  photoDeleteText: { color: '#fff', fontSize: 18, fontWeight: '600' },
  photoStar: { position: 'absolute', bottom: 4, right: 4, width: 24, height: 24, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  photoStarText: { color: '#FBBF24', fontSize: 16 },
  inputContainer: { borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff' },
  input: { flex: 1, padding: 12, fontSize: 15, color: '#111' },
  textArea: { minHeight: 100, textAlignVertical: 'top', paddingTop: 12 },
  inputError: { borderColor: '#EF4444', borderWidth: 1.5 },
  errorIconContainer: { paddingRight: 12, justifyContent: 'center', alignItems: 'center' },
  errorIconContainerTextArea: { position: 'absolute', right: 12, top: 12 },
  errorIcon: { color: '#EF4444', fontSize: 16, fontWeight: 'bold' },
  errorText: { color: '#EF4444', fontSize: 13, marginTop: 6, marginLeft: 2 },
  placeholderText: { color: '#9CA3AF' },
  selectContainer: { borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, padding: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff' },
  selectText: { fontSize: 15, color: '#111' },
  selectArrow: { fontSize: 24, color: '#9CA3AF', fontWeight: '300' },
  dealTypeContainer: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  dealTypeButton: { flex: 1, paddingVertical: 10, paddingHorizontal: 16, borderRadius: 20, backgroundColor: '#F3F4F6', alignItems: 'center' },
  dealTypeSell: { backgroundColor: '#1D4ED8' },
  dealTypeRent: { backgroundColor: '#C2410C' },
  dealTypeExchange: { backgroundColor: '#7E22CE' },
  dealTypeText: { fontSize: 14, fontWeight: '600', color: '#6B7280' },
  dealTypeTextActive: { color: '#fff' },
  switchContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  switchLabel: { fontSize: 14, color: '#111' },
  priceRow: { flexDirection: 'row', gap: 8 },
  priceInputContainer: { flex: 1, borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff' },
  currencyContainer: { width: 60, borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F9FAFB' },
  currencyText: { fontSize: 14, color: '#111', fontWeight: '500' },
  conditionContainer: { flexDirection: 'row', gap: 8 },
  conditionButton: { paddingVertical: 10, paddingHorizontal: 24, borderRadius: 20, backgroundColor: '#F3F4F6' },
  conditionActive: { backgroundColor: '#111' },
  conditionText: { fontSize: 14, fontWeight: '600', color: '#6B7280' },
  conditionTextActive: { color: '#fff' },
  mapContainer: { alignItems: 'center' },
  mapPlaceholder: { width: '100%', height: 150, backgroundColor: '#D1FAE5', borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginBottom: 8, marginTop: 12 },
  mapPin: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#10B981', justifyContent: 'center', alignItems: 'center' },
  mapPinText: { fontSize: 20 },
  mapLabel: { fontSize: 14, color: '#6B7280' },
  publishButton: { margin: 16, backgroundColor: '#10B981', padding: 16, borderRadius: 50, alignItems: 'center' },
  publishButtonDisabled: { opacity: 0.6 },
  publishButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  uploadingRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  uploadingText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '70%' },
  modalTitle: { fontSize: 18, fontWeight: '600', marginBottom: 16, textAlign: 'center' },
  modalScroll: { maxHeight: 400 },
  modalOption: { padding: 16, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  modalOptionText: { fontSize: 16, color: '#111' },
 topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#fff",
    borderBottomWidth: 0.5,
    borderBottomColor: "#eee",
    marginTop:30,
  },
  backCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F4F4F4",
    alignItems: "center",
    justifyContent: "center",
  },
  topBarTitle:{ 
    fontSize: 20,
   fontWeight: '600',
    color: "#000",
    textAlign: "center",
    flex: 1,},
  title: {
    fontSize: 18,
   fontWeight: 'bold',
    color: "#000",
    textAlign: "center",
    flex: 1,
  },

  modalClose: { marginTop: 16, padding: 16, backgroundColor: '#F3F4F6', borderRadius: 8, alignItems: 'center' },
  modalCloseText: { fontSize: 16, fontWeight: '600', color: '#111' },
});

export default AddListingForm;