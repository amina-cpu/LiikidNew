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
import i18n from '../../lib/i18n';
import { supabase } from '../../lib/Supabase';
import { useAuth } from '../context/AuthContext';

const PRIMARY_TEAL = "#16A085";

interface Category {
  id: number;
  name: string;
}

const SearchScreen = () => {
  const router = useRouter();
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [selectedCategoryName, setSelectedCategoryName] = useState(i18n.t('search.allCategories'));
  const [categories, setCategories] = useState<Category[]>([]);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useFocusEffect(
    useCallback(() => {
      setSearch('');
      setSelectedCategoryId(null);
      setSelectedCategoryName(i18n.t('search.allCategories'));
      setShowCategoryPicker(false);
      
      if (user) {
        loadRecentSearches();
      }
    }, [user])
  );

  useEffect(() => {
    fetchCategories();
    if (user) {
      loadRecentSearches();
    }
  }, [user]);

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
    if (!user || !user.user_id) {
      console.log('No user logged in, setting empty search history');
      setRecentSearches([]);
      return;
    }

    try {
      console.log('Loading search history for user:', user.user_id);
      const { data, error } = await supabase
        .from('search_history')
        .select('search_query')
        .eq('user_id', user.user_id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) {
        console.error('Error loading search history:', error);
        throw error;
      }

      console.log('Search history data:', data);

      if (data && data.length > 0) {
        const uniqueQueries = Array.from(
          new Set(data.map(item => item.search_query))
        );
        console.log('Setting recent searches:', uniqueQueries);
        setRecentSearches(uniqueQueries);
      } else {
        console.log('No search history found, setting empty array');
        setRecentSearches([]);
      }
    } catch (error: any) {
      console.error('Error loading search history:', error);
      setRecentSearches([]);
    }
  };

  const saveRecentSearch = async (query: string) => {
    if (!user || !user.user_id || !query.trim()) {
      return;
    }

    try {
      await supabase
        .from('search_history')
        .insert([{
          user_id: user.user_id,
          search_query: query.trim(),
          category_id: selectedCategoryId,
        }]);

      if (!recentSearches.includes(query.trim())) {
        const updated = [query.trim(), ...recentSearches].slice(0, 10);
        setRecentSearches(updated);
      }
    } catch (error: any) {
      console.error('Error saving search history:', error);
    }
  };

  const handleSearch = async () => {
    if (!search.trim()) {
      Alert.alert(i18n.t('search.emptySearchTitle'), i18n.t('search.emptySearchMessage'));
      return;
    }

    await saveRecentSearch(search.trim());
    setLoading(true);

    try {
      if (selectedCategoryId) {
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
        const { data: productsData, error } = await supabase
          .from('products')
          .select('category_id')
          .ilike('name', `%${search.trim()}%`);

        if (error) throw error;

        if (productsData && productsData.length > 0) {
          const categoryIds = [...new Set(productsData.map(p => p.category_id))];

          if (categoryIds.length === 1) {
            router.push({
              pathname: '/category',
              params: {
                id: categoryIds[0].toString(),
                searchQuery: search.trim(),
                searchMode: 'true',
              },
            });
          } else {
            router.push({
              pathname: '/',
              params: {
                query: search.trim(),
              },
            });
          }
        } else {
          Alert.alert(i18n.t('search.noResultsTitle'), i18n.t('search.noResultsMessage'));
        }
      }
    } catch (error: any) {
      Alert.alert(i18n.t('search.errorTitle'), i18n.t('search.errorMessage') + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRecentSearchTap = (query: string) => {
    setSearch(query);
  };

  const removeRecent = async (item: string) => {
    if (!user || !user.user_id) {
      return;
    }

    try {
      await supabase
        .from('search_history')
        .delete()
        .eq('user_id', user.user_id)
        .eq('search_query', item);

      const updated = recentSearches.filter(i => i !== item);
      setRecentSearches(updated);
    } catch (error: any) {
      console.error('Error removing search history:', error);
    }
  };

  const selectCategory = (cat: Category | null) => {
    if (cat) {
      setSelectedCategoryId(cat.id);
      setSelectedCategoryName(cat.name);
    } else {
      setSelectedCategoryId(null);
      setSelectedCategoryName(i18n.t('search.allCategories'));
    }
    setShowCategoryPicker(false);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{i18n.t('search.title')}</Text>
        <TouchableOpacity style={styles.closeBtn} onPress={() => router.back()}>
          <Ionicons name="close" size={22} color="#000" />
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionLabel}>{i18n.t('search.subtitle')}</Text>

      <View style={styles.searchBox}>
        <Ionicons name="search" size={18} color="#999" />
        <TextInput
          placeholder={i18n.t('search.placeholder')}
          placeholderTextColor="#999"
          style={styles.input}
          value={search}
          onChangeText={setSearch}
          onSubmitEditing={handleSearch}
          returnKeyType="search"
        />
      </View>

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
              {i18n.t('search.allCategories')}
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
            <Text style={styles.searchBtnText}>{i18n.t('search.searchButton')}</Text>
          </>
        )}
      </TouchableOpacity>

      <Text style={styles.recentLabel}>{i18n.t('search.recentSearches')}</Text>

      {recentSearches.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="time-outline" size={48} color="#ccc" />
          <Text style={styles.emptyStateText}>{i18n.t('search.noRecentSearches')}</Text>
        </View>
      ) : (
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
              <Text style={styles.recentText} numberOfLines={1}>{item}</Text>
              <TouchableOpacity onPress={() => removeRecent(item)}>
                <Ionicons name="close" size={14} color="#777" />
              </TouchableOpacity>
            </TouchableOpacity>
          )}
        />
      )}
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
    maxWidth: '48%',
  },
  recentText: {
    fontSize: 13,
    color: '#333',
    marginRight: 4,
    flex: 1,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 60,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#999',
    marginTop: 12,
  },
});