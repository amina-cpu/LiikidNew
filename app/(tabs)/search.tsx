import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { supabase } from '../../lib/Supabase';

const PRIMARY_TEAL = "#16A085";

interface Category {
  id: number;
  name: string;
}

const SearchScreen = () => {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [selectedCategoryName, setSelectedCategoryName] = useState('All Categories');
  const [categories, setCategories] = useState<Category[]>([]);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([
    'TACTILE',
    'CAMERA',
    'iPhone 14 Pro',
    'Apartment for Rent',
  ]);
  const [loading, setLoading] = useState(false);

  // Reset search when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      // Reset search state when user navigates back to search
      setSearch('');
      setSelectedCategoryId(null);
      setSelectedCategoryName('All Categories');
      setShowCategoryPicker(false);
    }, [])
  );

  useEffect(() => {
    fetchCategories();
    loadRecentSearches();
  }, []);

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('id, name')
        .order('name');
      
      if (error) throw error;
      setCategories(data || []);
    } catch (error: any) {
      console.error('Error fetching categories:', error);
    }
  };

  const loadRecentSearches = async () => {
    // TODO: Load from AsyncStorage or user preferences
    // For now, using default values
  };

  const saveRecentSearch = (query: string) => {
    if (query.trim() && !recentSearches.includes(query)) {
      const updated = [query, ...recentSearches].slice(0, 10);
      setRecentSearches(updated);
      // TODO: Save to AsyncStorage
    }
  };

  const handleSearch = async () => {
    if (!search.trim()) {
      Alert.alert('Empty Search', 'Please enter a search term');
      return;
    }

    saveRecentSearch(search.trim());
    setLoading(true);

    try {
      if (selectedCategoryId) {
        // Search within a specific category - go directly to category page
        router.push({
          pathname: '/category',
          params: {
            id: selectedCategoryId.toString(),
            searchQuery: search.trim(),
            searchMode: 'true',
            categoryName: selectedCategoryName,
          },
        });
      } else {
        // Search across all categories - check how many categories have results
        const { data: productsData, error } = await supabase
          .from('products')
          .select('category_id')
          .ilike('name', `%${search.trim()}%`);

        if (error) throw error;

        if (productsData && productsData.length > 0) {
          // Get unique category IDs
          const categoryIds = [...new Set(productsData.map(p => p.category_id))];

          if (categoryIds.length === 1) {
            // Only one category has results - redirect directly to that category
            router.push({
              pathname: '/category',
              params: {
                id: categoryIds[0].toString(),
                searchQuery: search.trim(),
                searchMode: 'true',
              },
            });
          } else {
            // Multiple categories have results - go to homepage
            router.push({
              pathname: '/',
              params: {
                query: search.trim(),
              },
            });
          }
        } else {
          // No results found
          Alert.alert('No Results', 'No products found matching your search');
        }
      }
    } catch (error: any) {
      Alert.alert('Error', 'Failed to perform search: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRecentSearchTap = (query: string) => {
    setSearch(query);
  };

  const removeRecent = (item: string) => {
    const updated = recentSearches.filter(i => i !== item);
    setRecentSearches(updated);
    // TODO: Update AsyncStorage
  };

  const selectCategory = (cat: Category | null) => {
    if (cat) {
      setSelectedCategoryId(cat.id);
      setSelectedCategoryName(cat.name);
    } else {
      setSelectedCategoryId(null);
      setSelectedCategoryName('All Categories');
    }
    setShowCategoryPicker(false);
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Search</Text>
        <TouchableOpacity style={styles.closeBtn} onPress={() => router.back()}>
          <Ionicons name="close" size={22} color="#000" />
        </TouchableOpacity>
      </View>

      {/* Search Input Section */}
      <Text style={styles.sectionLabel}>Search in Local Marketplace</Text>

      <View style={styles.searchBox}>
        <Ionicons name="search" size={18} color="#999" />
        <TextInput
          placeholder="Your search"
          placeholderTextColor="#999"
          style={styles.input}
          value={search}
          onChangeText={setSearch}
          onSubmitEditing={handleSearch}
          returnKeyType="search"
        />
      </View>

      {/* Category Dropdown */}
      <TouchableOpacity 
        style={styles.categoryBox}
        onPress={() => setShowCategoryPicker(!showCategoryPicker)}
      >
        <Text style={styles.categoryText}>{selectedCategoryName}</Text>
        <MaterialIcons 
          name={showCategoryPicker ? "keyboard-arrow-up" : "keyboard-arrow-down"} 
          size={22} 
          color="#444" 
        />
      </TouchableOpacity>

      {/* Category Picker - Absolute positioned */}
      {showCategoryPicker && (
        <ScrollView style={styles.categoryPicker} nestedScrollEnabled>
          <TouchableOpacity 
            style={styles.categoryOption}
            onPress={() => selectCategory(null)}
          >
            <Text style={[
              styles.categoryOptionText,
              !selectedCategoryId && styles.categoryOptionTextActive
            ]}>
              All Categories
            </Text>
            {!selectedCategoryId && (
              <Ionicons name="checkmark" size={20} color={PRIMARY_TEAL} />
            )}
          </TouchableOpacity>
          {categories.map((cat) => (
            <TouchableOpacity 
              key={cat.id}
              style={styles.categoryOption}
              onPress={() => selectCategory(cat)}
            >
              <Text style={[
                styles.categoryOptionText,
                selectedCategoryId === cat.id && styles.categoryOptionTextActive
              ]}>
                {cat.name}
              </Text>
              {selectedCategoryId === cat.id && (
                <Ionicons name="checkmark" size={20} color={PRIMARY_TEAL} />
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Search Button */}
      <TouchableOpacity 
        style={styles.searchBtn} 
        onPress={handleSearch}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <>
            <Ionicons name="search" size={18} color="#fff" />
            <Text style={styles.searchBtnText}>SEARCH</Text>
          </>
        )}
      </TouchableOpacity>

      {/* Recent Searches */}
      <Text style={styles.recentLabel}>Recent Searches</Text>

      <FlatList
        data={recentSearches}
        keyExtractor={(item, index) => `${item}-${index}`}
        contentContainerStyle={styles.recentList}
        numColumns={2}
        renderItem={({ item }) => (
          <TouchableOpacity 
            style={styles.recentItem}
            onPress={() => handleRecentSearchTap(item)}
          >
            <Text style={styles.recentText}>{item}</Text>
            <TouchableOpacity onPress={() => removeRecent(item)}>
              <Ionicons name="close" size={14} color="#777" />
            </TouchableOpacity>
          </TouchableOpacity>
        )}
      />
    </View>
  );
};

export default SearchScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 16,
    marginTop: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000',
  },
  closeBtn: {
    padding: 4,
  },
  sectionLabel: {
    fontSize: 13,
    color: '#333',
    marginTop: 20,
    marginBottom: 8,
    fontWeight: '500',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderColor: '#ddd',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: '#fdfdfd',
  },
  input: {
    flex: 1,
    marginLeft: 8,
    color: '#000',
  },
  categoryBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderColor: '#ddd',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 12,
    marginTop: 10,
  },
  categoryText: {
    color: '#444',
    fontSize: 15,
  },
  categoryPicker: {
    position: 'absolute',
    top: 165,
    left: 16,
    right: 16,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    maxHeight: 250,
    zIndex: 1000,
    elevation: 5,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },
  categoryOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  categoryOptionText: {
    fontSize: 15,
    color: '#444',
  },
  categoryOptionTextActive: {
    color: PRIMARY_TEAL,
    fontWeight: '600',
  },
  searchBtn: {
    flexDirection: 'row',
    backgroundColor: '#009670',
    paddingVertical: 12,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 14,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  searchBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
    marginLeft: 6,
  },
  recentLabel: {
    fontSize: 13,
    fontWeight: '500',
    marginTop: 18,
    color: '#222',
  },
  recentList: {
    marginTop: 10,
    flexWrap: 'wrap',
    gap: 8,
  },
  recentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f2f2f2',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginRight: 8,
    marginBottom: 8,
  },
  recentText: {
    fontSize: 13,
    color: '#333',
    marginRight: 4,
  },
});