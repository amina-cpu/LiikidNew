import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
    FlatList,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';


const SearchScreen = () => {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All Categories');
  const [recentSearches, setRecentSearches] = useState([
    'TACTILE',
    'CAMERA',
    'iPhone 14 Pro',
    'Apartment for Rent',
  ]);

  const handleSearch = () => {
    if (search.trim() && !recentSearches.includes(search)) {
      setRecentSearches([search, ...recentSearches]);
    }
    setSearch('');
  };

  const removeRecent = (item: string) => {
    setRecentSearches(recentSearches.filter(i => i !== item));
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Search</Text>
        <TouchableOpacity style={styles.closeBtn}>
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
        />
      </View>

      {/* Category Dropdown (mocked static view) */}
      <TouchableOpacity style={styles.categoryBox}>
        <Text style={styles.categoryText}>{category}</Text>
        <MaterialIcons name="keyboard-arrow-down" size={22} color="#444" />
      </TouchableOpacity>

      {/* Search Button */}
      <TouchableOpacity style={styles.searchBtn} onPress={handleSearch}>
        <Ionicons name="search" size={18} color="#fff" />
        <Text style={styles.searchBtnText}>SEARCH</Text>
      </TouchableOpacity>

      {/* Recent Searches */}
      <Text style={styles.recentLabel}>Recent Searches</Text>

      <FlatList
        data={recentSearches}
        keyExtractor={(item) => item}
        contentContainerStyle={styles.recentList}
        numColumns={2}
        renderItem={({ item }) => (
          <View style={styles.recentItem}>
            <Text style={styles.recentText}>{item}</Text>
            <TouchableOpacity onPress={() => removeRecent(item)}>
              <Ionicons name="close" size={14} color="#777" />
            </TouchableOpacity>
          </View>
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
