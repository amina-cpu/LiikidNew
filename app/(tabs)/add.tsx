import { Ionicons } from "@expo/vector-icons";
import { decode } from 'base64-arraybuffer';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from "expo-router";
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
// 💡 Import i18n
import i18n from '../../lib/i18n';

interface Category {
  id: number;
  name: string;
  description: string | null;
  delivery?: boolean;
  also_exchange?: boolean;
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

const PRIMARY_TEAL = "#10B981"; // Green
const FOCUS_GREEN = "#10B981"; // Green for focus state

// 💡 Helper function to translate category names
const getCategoryTranslation = (catName: string): string => {
  const key = catName.replace(/[^a-zA-Z]/g, '');
  const translationKey = `categories.${key}`;
  const translated = i18n.t(translationKey);
  return translated === translationKey ? catName : translated;
};

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
  const [focusedField, setFocusedField] = useState<string | null>(null);

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
        i18n.t('addListing.uploadInProgress'),
        i18n.t('addListing.uploadInProgressMessage')
      );
      return;
    }

    const hasChanges = photos.length > 0 || title.trim() !== '' || description.trim() !== '' || 
                       price.trim() !== '' || selectedCategory !== null;

    if (hasChanges) {
      Alert.alert(
        i18n.t('addListing.discardChanges'),
        i18n.t('addListing.discardChangesMessage'),
        [
          { text: i18n.t('addListing.cancel'), style: 'cancel' },
          { 
            text: i18n.t('addListing.discard'), 
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

  useEffect(() => {
    if (dealType === 'exchange') {
      setAlsoExchange(false);
    }
  }, [dealType]);

  const fetchCategories = async () => {
    try {
      setLoadingCategories(true);
      const { data, error } = await supabase
        .from('categories')
        .select('id, name, description, delivery, also_exchange')
        .order('name');

      if (error) throw error;
      setCategories(data || []);
    } catch (error: any) {
      console.error('Error fetching categories:', error);
      Alert.alert(i18n.t('addListing.error'), i18n.t('addListing.unableToLoadCategories') + error.message);
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
      Alert.alert(i18n.t('addListing.error'), i18n.t('addListing.unableToLoadSubcategories'));
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
      Alert.alert(i18n.t('addListing.error'), i18n.t('addListing.unableToLoadSubSubcategories'));
    }
  };

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert(i18n.t('addListing.permissionRequired'), i18n.t('addListing.permissionRequiredMessage'));
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
          Alert.alert(i18n.t('addListing.imageTooLarge'), i18n.t('addListing.imageTooLargeMessage'));
          return;
        }

        setPhotos([...photos, asset.uri]);
      }
    } catch (error: any) {
      console.error('Error picking image:', error);
      Alert.alert(i18n.t('addListing.error'), i18n.t('addListing.unableToSelectImage'));
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
        throw new Error(i18n.t('addListing.imageTooLargeMessage'));
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
      Alert.alert(i18n.t('addListing.uploadError'), err.message || i18n.t('addListing.failedToUploadImage'));
      return null;
    }
  };

  const validateForm = () => {
    const newErrors: any = {};
    
    if (!user) {
      Alert.alert(i18n.t('addListing.error'), i18n.t('addListing.mustBeLoggedIn'));
      return false;
    }
    
    if (photos.length === 0) newErrors.photos = i18n.t('addListing.errorAtLeastOnePhoto');
    if (!title.trim()) newErrors.title = i18n.t('addListing.errorEnterTitle');
    if (!description.trim()) newErrors.description = i18n.t('addListing.errorAddDescription');
    if (dealType !== 'exchange' && !price.trim()) newErrors.price = i18n.t('addListing.errorEnterPrice');
    if (!selectedSubSubcategory && !selectedSubcategory && !selectedCategory) {
      newErrors.category = i18n.t('addListing.errorSelectCategory');
    }
    
    if (selectedCategory?.delivery !== false && !deliveryMethod) {
      newErrors.delivery = i18n.t('addListing.errorSelectDelivery');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handlePublish = async () => {
    if (uploading) return;

    if (!validateForm()) {
      Alert.alert(i18n.t('addListing.error'), i18n.t('addListing.fillAllFields'));
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
        Alert.alert(i18n.t('addListing.imageUploadFailed'), i18n.t('addListing.allImageUploadsFailed'), [
          { text: i18n.t('addListing.cancel'), style: 'cancel', onPress: () => setUploading(false) },
          { text: i18n.t('addListing.continue'), onPress: () => insertProduct([]) }
        ]);
        return;
      }

      const mainUrl = uploadedUrls[mainPhotoIndex];
      const otherUrls = uploadedUrls.filter((_, idx) => idx !== mainPhotoIndex);
      const orderedUrls = [mainUrl, ...otherUrls];

      await insertProduct(orderedUrls);

    } catch (error: any) {
      console.error('Error in handlePublish:', error);
      Alert.alert(i18n.t('addListing.error'), i18n.t('addListing.errorOccurred') + (error.message || i18n.t('addListing.unknownError')));
      setUploading(false);
    }
  };

  const insertProduct = async (imageUrls: string[]) => {
    try {
      if (!user || !user.user_id) {
        throw new Error(i18n.t('addListing.userNotAuthenticated'));
      }

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
        condition: condition,
        also_exchange: alsoExchange,
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

      Alert.alert('✅ ' + i18n.t('addListing.success'), i18n.t('addListing.listingPublished'), [
        {
          text: i18n.t('addListing.ok'),
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
            router.push('/(tabs)');
          }
        }
      ]);

    } catch (error: any) {
      console.error('Error in insertProduct:', error);
      
      let errorMessage = i18n.t('addListing.unableToAddProduct');
      if (error.code === '23503') errorMessage = i18n.t('addListing.invalidCategory');
      else if (error.code === '42501') errorMessage = i18n.t('addListing.noPermission');
      else if (error.code === '23505') errorMessage = i18n.t('addListing.productExists');
      else if (error.message) errorMessage = error.message;
      
      Alert.alert(i18n.t('addListing.error'), errorMessage);
    } finally {
      setUploading(false);
    }
  };

  const renderCategoryModal = () => (
    <Modal visible={showCategoryModal} animationType="slide" transparent={true} onRequestClose={() => setShowCategoryModal(false)}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>
            {categoryStep === 1 ? i18n.t('addListing.selectCategory') : 
             categoryStep === 2 ? i18n.t('addListing.selectSubcategory') : 
             i18n.t('addListing.selectSubSubcategory')}
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
                  if (!cat.also_exchange) {
                    setAlsoExchange(false);
                  }
                  if (subcategories.length > 0 || cat.id !== selectedCategory?.id) {
                    setCategoryStep(2);
                  } else {
                    setShowCategoryModal(false);
                    setCategoryStep(1);
                  }
                }}
              >
                <Text style={styles.modalOptionText}>{getCategoryTranslation(cat.name)}</Text>
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
            <Text style={styles.modalCloseText}>{i18n.t('addListing.close')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  const renderDeliveryModal = () => (
    <Modal visible={showDeliveryModal} animationType="slide" transparent={true} onRequestClose={() => setShowDeliveryModal(false)}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>{i18n.t('addListing.selectDeliveryMethod')}</Text>
          
          <TouchableOpacity style={styles.modalOption} onPress={() => { setDeliveryMethod('In-person'); setShowDeliveryModal(false); }}>
            <Text style={styles.modalOptionText}>{i18n.t('addListing.inPersonMeeting')}</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.modalOption} onPress={() => { setDeliveryMethod('Delivery'); setShowDeliveryModal(false); }}>
            <Text style={styles.modalOptionText}>{i18n.t('addListing.delivery')}</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.modalOption} onPress={() => { setDeliveryMethod('Both'); setShowDeliveryModal(false); }}>
            <Text style={styles.modalOptionText}>{i18n.t('addListing.both')}</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.modalClose} onPress={() => setShowDeliveryModal(false)}>
            <Text style={styles.modalCloseText}>{i18n.t('addListing.close')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  if (loadingCategories) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={PRIMARY_TEAL} />
        <Text style={styles.loadingText}>{i18n.t('addListing.loadingCategories')}</Text>
      </View>
    );
  }

  if (!user) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorTextMain}>{i18n.t('addListing.pleaseLogin')}</Text>
      </View>
    );
  }

  const categoryAllowsDelivery = selectedCategory?.delivery !== false;
  const categoryAllowsExchange = selectedCategory?.also_exchange === true;

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.backCircle} onPress={handleBackPress}>
          <Ionicons name="arrow-back" size={24} color={PRIMARY_TEAL} />
        </TouchableOpacity>

        <Text style={styles.topBarTitle}>{i18n.t('addListing.addListing')}</Text>
        <View style={{ width: 32 }} /> 
      </View>

      <ScrollView ref={scrollViewRef} style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{i18n.t('addListing.photos')}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photosScroll}>
            <TouchableOpacity style={styles.addPhotoBox} onPress={pickImage} disabled={uploading}>
              <Text style={styles.addPhotoPlus}>+</Text>
              <Text style={styles.addPhotoText}>{i18n.t('addListing.addPhoto')}</Text>
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
          <Text style={styles.sectionTitle}>{i18n.t('addListing.title')}</Text>
          <View
            style={[
              styles.inputContainer,
              errors.title && styles.inputError,
              focusedField === 'title' && styles.inputFocused,
            ]}
          >
            <TextInput
              style={styles.input}
              placeholder={i18n.t('addListing.titlePlaceholder')}
              placeholderTextColor="#677080ff"
              value={title}
              onChangeText={setTitle}
              onFocus={() => setFocusedField('title')}
              onBlur={() => setFocusedField(null)}
              maxLength={200}
              editable={!uploading}
            />
          </View>
          {errors.title && <Text style={styles.errorText}>{errors.title}</Text>}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{i18n.t('addListing.description')}</Text>
          <View
            style={[
              styles.inputContainer,
              errors.description && styles.inputError,
              focusedField === 'description' && styles.inputFocused,
            ]}
          >
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder={i18n.t('addListing.descriptionPlaceholder')}
              value={description}
              placeholderTextColor="#677080ff"
              onChangeText={setDescription}
              onFocus={() => setFocusedField('description')}
              onBlur={() => setFocusedField(null)}
              multiline
              numberOfLines={4}
              maxLength={2000}
              editable={!uploading}
            />
          </View>
          {errors.description && <Text style={styles.errorText}>{errors.description}</Text>}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{i18n.t('addListing.category')}</Text>
          <TouchableOpacity
            style={[
              styles.selectContainer, 
              errors.category && styles.inputError,
              focusedField === 'category' && styles.inputFocused
            ]}
            onPress={() => {
              setShowCategoryModal(true);
              setFocusedField('category');
            }}
            onPressOut={() => setFocusedField(null)}
            disabled={uploading}
          >
            <Text style={[styles.selectText, !selectedSubSubcategory && !selectedSubcategory && !selectedCategory && styles.placeholderText]}>
              {selectedSubSubcategory?.name || selectedSubcategory?.name || 
               (selectedCategory ? getCategoryTranslation(selectedCategory.name) : i18n.t('addListing.selectCategoryPlaceholder'))}
            </Text>
            <Text style={styles.selectArrow}>›</Text>
          </TouchableOpacity>
          {errors.category && <Text style={styles.errorText}>{errors.category}</Text>}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{i18n.t('addListing.dealType')}</Text>
          <View style={styles.dealTypeContainer}>
            <TouchableOpacity
              style={[styles.dealTypeButton, dealType === 'sell' && styles.dealTypeSell]}
              onPress={() => setDealType('sell')}
              disabled={uploading}
            >
              <Text style={[styles.dealTypeText, dealType === 'sell' && styles.dealTypeTextActive]}>
                {i18n.t('filters.Sell')}
              </Text>
            </TouchableOpacity>
            
            {categoryAllowsExchange && (
              <>
                <TouchableOpacity
                  style={[styles.dealTypeButton, dealType === 'rent' && styles.dealTypeRent]}
                  onPress={() => setDealType('rent')}
                  disabled={uploading}
                >
                  <Text style={[styles.dealTypeText, dealType === 'rent' && styles.dealTypeTextActive]}>
                    {i18n.t('filters.Rent')}
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[styles.dealTypeButton, dealType === 'exchange' && styles.dealTypeExchange]}
                  onPress={() => setDealType('exchange')}
                  disabled={uploading}
                >
                  <Text style={[styles.dealTypeText, dealType === 'exchange' && styles.dealTypeTextActive]}>
                    {i18n.t('filters.Exchange')}
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </View>
          
          {categoryAllowsExchange && dealType !== 'exchange' && (
            <View style={styles.switchContainer}>
              <Text style={styles.switchLabel}>{i18n.t('addListing.alsoExchange')}</Text>
              <Switch
                value={alsoExchange}
                onValueChange={setAlsoExchange}
                trackColor={{ false: '#E5E7EB', true: PRIMARY_TEAL }}
                thumbColor="#fff"
                disabled={uploading}
              />
            </View>
          )}
        </View>

        {dealType !== 'exchange' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{i18n.t('addListing.price')}</Text>
            <View style={styles.priceRow}>
              <View style={[
                styles.priceInputContainer, 
                errors.price && styles.inputError,
                focusedField === 'price' && styles.inputFocused
              ]}>
                <TextInput
                  style={styles.input}
                  placeholder={i18n.t('addListing.pricePlaceholder')}
                  placeholderTextColor="#677080ff"
                  value={price}
                  onChangeText={setPrice}
                  keyboardType="numeric"
                  onFocus={() => setFocusedField('price')}
                  onBlur={() => setFocusedField(null)}
                  editable={!uploading}
                />
              </View>
              <View style={styles.currencyContainer}>
                <Text style={styles.currencyText}>DA</Text>
              </View>
            </View>
            {errors.price && <Text style={styles.errorText}>{errors.price}</Text>}
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{i18n.t('addListing.phoneNumber')}</Text>
          <View style={[
            styles.inputContainer,
            focusedField === 'phone' && styles.inputFocused
          ]}>
            <TextInput
              style={styles.input}
              placeholder={i18n.t('addListing.phoneNumberPlaceholder')}
              placeholderTextColor="#677080ff"
              value={phoneNumber}
              onFocus={() => setFocusedField('phone')}
              onBlur={() => setFocusedField(null)}
              onChangeText={setPhoneNumber}
              keyboardType="phone-pad"
              editable={!uploading}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{i18n.t('addListing.condition')}</Text>
          <View style={styles.conditionContainer}>
            <TouchableOpacity
              style={[styles.conditionButton, condition === 'new' && styles.conditionActive]}
              onPress={() => setCondition('new')}
              disabled={uploading}
            >
              <Text style={[styles.conditionText, condition === 'new' && styles.conditionTextActive]}>
                {i18n.t('addListing.new')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.conditionButton, condition === 'used' && styles.conditionActive]}
              onPress={() => setCondition('used')}
              disabled={uploading}
            >
              <Text style={[styles.conditionText, condition === 'used' && styles.conditionTextActive]}>
                {i18n.t('addListing.used')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {categoryAllowsDelivery && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{i18n.t('addListing.deliveryMethod')}</Text>
            <TouchableOpacity
              style={[
                styles.selectContainer, 
                errors.delivery && styles.inputError,
                focusedField === 'delivery' && styles.inputFocused
              ]}
              onPress={() => {
                setShowDeliveryModal(true);
                setFocusedField('delivery');
              }}
              onPressOut={() => setFocusedField(null)}
              disabled={uploading}
            >
              <Text style={[styles.selectText, !deliveryMethod && styles.placeholderText]}>
                {deliveryMethod || i18n.t('addListing.selectDeliveryPlaceholder')}
              </Text>
              <Text style={styles.selectArrow}>›</Text>
            </TouchableOpacity>
            {errors.delivery && <Text style={styles.errorText}>{errors.delivery}</Text>}
          </View>
        )}

        <TouchableOpacity 
          style={[styles.publishButton, uploading && styles.publishButtonDisabled]} 
          onPress={handlePublish}
          disabled={uploading}
        >
          {uploading ? (
            <View style={styles.uploadingRow}>
              <ActivityIndicator color="#fff" />
              <Text style={styles.uploadingText}>
                {i18n.t('addListing.uploading')} {photos.length} {photos.length > 1 ? i18n.t('addListing.photos') : i18n.t('addListing.photo')}...
              </Text>
            </View>
          ) : (
            <Text style={styles.publishButtonText}>{i18n.t('addListing.publishListing')}</Text>
          )}
        </TouchableOpacity>
      </ScrollView>

      {renderCategoryModal()}
      {renderDeliveryModal()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1,marginBottom:80, backgroundColor: '#fff' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 10, fontSize: 16, color: '#666' },
  errorTextMain: { fontSize: 16, color: '#EF4444' },
  scrollView: { flex: 1 },
  section: { padding: 16, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  sectionTitle: { fontSize: 15, fontWeight: '600', color: '#111', marginBottom: 10 },
  photosScroll: { flexDirection: 'row' },
  addPhotoBox: { 
    width: 90, 
    height: 90, 
    borderWidth: 2, 
    borderColor: '#b0b4bdff', 
    borderStyle: 'dashed', 
    borderRadius: 8, 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginRight: 12 
  },
  addPhotoPlus: { fontSize: 32, color: '#6B7280', marginBottom: 4 },
  addPhotoText: { fontSize: 12, color: '#6B7280' },
  photoItem: { width: 90, height: 90, marginRight: 12, position: 'relative' },
  photoImage: { width: '100%', height: '100%', borderRadius: 8 },
  photoDelete: { 
    position: 'absolute', 
    top: 4, 
    right: 4, 
    width: 24, 
    height: 24, 
    backgroundColor: 'rgba(0,0,0,0.6)', 
    borderRadius: 12, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  photoDeleteText: { color: '#fff', fontSize: 18, fontWeight: '600' },
  photoStar: { 
    position: 'absolute', 
    bottom: 4, 
    right: 4, 
    width: 24, 
    height: 24, 
    backgroundColor: 'rgba(0,0,0,0.6)', 
    borderRadius: 12, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  photoStarText: { color: '#FBBF24', fontSize: 16 },
  inputContainer: { 
    borderWidth: 1.5, 
    borderColor: '#b0b4bdff', 
    borderRadius: 8, 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#fff' 
  },
  input: { flex: 1, padding: 12, fontSize: 15, color: '#111' },
  textArea: { minHeight: 100, textAlignVertical: 'top', paddingTop: 12 },
  inputError: { borderColor: '#EF4444', borderWidth: 1.5 },
  inputFocused: { borderColor: FOCUS_GREEN, borderWidth: 2 },
  errorIconContainer: { paddingRight: 12, justifyContent: 'center', alignItems: 'center' },
  errorIcon: { color: '#EF4444', fontSize: 16, fontWeight: 'bold' },
  errorText: { color: '#EF4444', fontSize: 13, marginTop: 6, marginLeft: 2 },
  placeholderText: { color: '#6B7280' },
  selectContainer: { 
    borderWidth: 1.5, 
    borderColor: '#9CA3AF', 
    borderRadius: 8, 
    padding: 14, 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    backgroundColor: '#fff' 
  },
  selectText: { fontSize: 15, color: '#111' },
  selectArrow: { fontSize: 24, color: '#9CA3AF', fontWeight: '300' },
  dealTypeContainer: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  dealTypeButton: { 
    flex: 1, 
    paddingVertical: 10, 
    paddingHorizontal: 16, 
    borderRadius: 20, 
    backgroundColor: '#F3F4F6', 
    alignItems: 'center' 
  },
  dealTypeSell: { backgroundColor: '#1D4ED8' },
  dealTypeRent: { backgroundColor: '#C2410C' },
  dealTypeExchange: { backgroundColor: '#7E22CE' },
  dealTypeText: { fontSize: 14, fontWeight: '600', color: '#6B7280' },
  dealTypeTextActive: { color: '#fff' },
  switchContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  switchLabel: { fontSize: 14, color: '#111' },
  priceRow: { flexDirection: 'row', gap: 8 },
  priceInputContainer: { 
    flex: 1, 
    borderWidth: 1.5, 
    borderColor: '#9CA3AF', 
    borderRadius: 8, 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#fff' 
  },
  currencyContainer: { 
    width: 60, 
    borderWidth: 1.5, 
    borderColor: '#9CA3AF', 
    borderRadius: 8, 
    justifyContent: 'center', 
    alignItems: 'center', 
    backgroundColor: '#F9FAFB' 
  },
  currencyText: { fontSize: 14, color: '#111', fontWeight: '500' },
  conditionContainer: { flexDirection: 'row', gap: 8 },
  conditionButton: { 
    paddingVertical: 10, 
    paddingHorizontal: 24, 
    borderRadius: 20, 
    backgroundColor: '#F3F4F6' 
  },
  conditionActive: { backgroundColor: '#111' },
  conditionText: { fontSize: 14, fontWeight: '600', color: '#6B7280' },
  conditionTextActive: { color: '#fff' },
  publishButton: { 
    margin: 16, 
    backgroundColor: PRIMARY_TEAL, 
    padding: 16, 
    borderRadius: 50, 
    alignItems: 'center' 
  },
  publishButtonDisabled: { opacity: 0.6 },
  publishButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  uploadingRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  uploadingText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  modalOverlay: { 
    flex: 1, 
    backgroundColor: 'rgba(0,0,0,0.5)', 
    justifyContent: 'flex-end' 
  },
  modalContent: { 
    backgroundColor: '#fff', 
    borderTopLeftRadius: 20, 
    borderTopRightRadius: 20, 
    padding: 20, 
    maxHeight: '70%',
    marginBottom: 20
  },
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
    marginTop: 30,
  },
  backCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F4F4F4",
    alignItems: "center",
    justifyContent: "center",
  },
  topBarTitle: { 
    fontSize: 20,
    fontWeight: '600',
    color: "#000",
    textAlign: "center",
    flex: 1,
  },
  modalClose: { 
    marginTop: 16, 
    padding: 16, 
    backgroundColor: '#F3F4F6', 
    borderRadius: 8, 
    alignItems: 'center' 
  },
  modalCloseText: { fontSize: 16, fontWeight: '600', color: '#111' },
});

export default AddListingForm;