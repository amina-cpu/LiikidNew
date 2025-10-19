import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  StatusBar,
  FlatList,
} from 'react-native';

// Mock shop items data
const shopItemsData = [
  {
    id: '1',
    title: 'UPS 2nd Day Air Shipping Upgrade',
    image: 'https://via.placeholder.com/200/E8C4B8/000000?text=UPS',
    price: '$15.99',
    hasShipping: true,
    isShipping: true,
  },
  {
    id: '2',
    title: 'Syngonium Aurea Cutting',
    image: 'https://via.placeholder.com/200/87CEEB/000000?text=Plant',
    price: '$28.50',
    hasShipping: false,
  },
  {
    id: '3',
    title: 'Monstera Deliciosa',
    image: 'https://via.placeholder.com/200/90EE90/000000?text=Plant',
    price: '$45.00',
    hasShipping: false,
  },
  {
    id: '4',
    title: 'Pothos Golden',
    image: 'https://via.placeholder.com/200/FFD700/000000?text=Plant',
    price: '$18.99',
    hasShipping: false,
  },
  {
    id: '5',
    title: 'Snake Plant',
    image: 'https://via.placeholder.com/200/98FB98/000000?text=Plant',
    price: '$32.00',
    hasShipping: false,
  },
  {
    id: '6',
    title: 'Philodendron Pink Princess',
    image: 'https://via.placeholder.com/200/FFB6C1/000000?text=Plant',
    price: '$125.00',
    hasShipping: false,
  },
];

const SellerProfileScreen = ({ navigation }) => {
  const [isFollowing, setIsFollowing] = useState(false);

  const profileData = {
    username: 'PlantsAmelia',
    avatar: 'https://i.pravatar.cc/150?img=5',
    isVerified: true,
    rating: 4.8,
    reviews: 11,
    sales: 51,
    following: 33,
    followers: 79,
    bio: "Hey I'm Sierra👋Turning my passion into my dream business one plant at a time! Feel free to reach out🤗🌺🌻 Please read shop guidelines. Amelia Island, FL",
    location: 'Amelia Island, FL',
    shopItems: 179,
  };

  const handleFollow = () => {
    setIsFollowing(!isFollowing);
  };

  const handleMessage = () => {
    console.log('Open message');
  };

  const handleBack = () => {
    navigation?.goBack();
  };

  const renderShopItem = ({ item }) => (
    <TouchableOpacity style={styles.shopCard}>
      <View style={styles.shopCardImageContainer}>
        {item.isShipping ? (
          <View style={[styles.shopCardImage, styles.shippingCard]}>
            <Text style={styles.shippingLabel}>Shipping Upgrade</Text>
            <View style={styles.upsLogoContainer}>
              <View style={styles.upsShield}>
                <Text style={styles.upsText}>UPS</Text>
              </View>
            </View>
            {item.hasShipping && (
              <View style={styles.freeShippingBadge}>
                <Text style={styles.badgeIcon}>🚚</Text>
                <Text style={styles.freeShippingText}>Free shipping</Text>
              </View>
            )}
          </View>
        ) : (
          <Image source={{ uri: item.image }} style={styles.shopCardImage} />
        )}
      </View>
      <View style={styles.shopCardContent}>
        <Text style={styles.shopCardTitle} numberOfLines={2}>
          {item.title}
        </Text>
        <Text style={styles.shopCardPrice}>{item.price}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerButton} onPress={handleBack}>
          <Text style={styles.headerIcon}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.headerButton}>
            <Text style={styles.headerIcon}>↑</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerButton}>
            <Text style={styles.headerIcon}>⋯</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatarContainer}>
            <Image 
              source={{ uri: profileData.avatar }} 
              style={styles.avatar}
            />
            {profileData.isVerified && (
              <View style={styles.verifiedBadge}>
                <Text style={styles.verifiedIcon}>✓</Text>
              </View>
            )}
          </View>

          <Text style={styles.username}>{profileData.username}</Text>

          {/* Stats Row */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <View style={styles.statValueContainer}>
                <Text style={styles.statValue}>{profileData.rating}</Text>
                <Text style={styles.starIcon}>⭐</Text>
              </View>
              <Text style={styles.statLabel}>Rating</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{profileData.reviews}</Text>
              <Text style={styles.statLabel}>Reviews</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{profileData.sales}</Text>
              <Text style={styles.statLabel}>Sales</Text>
            </View>
          </View>
        </View>

        {/* Following/Followers */}
        <View style={styles.followSection}>
          <TouchableOpacity style={styles.followStat}>
            <Text style={styles.followCount}>{profileData.following}</Text>
            <Text style={styles.followLabel}>Following</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.followStat}>
            <Text style={styles.followCount}>{profileData.followers}</Text>
            <Text style={styles.followLabel}>Followers</Text>
          </TouchableOpacity>
        </View>

        {/* Bio */}
        <Text style={styles.bio}>{profileData.bio}</Text>

        {/* Shop Guidelines */}
        <TouchableOpacity style={styles.guidelinesButton}>
          <Text style={styles.guidelinesIcon}>📋</Text>
          <Text style={styles.guidelinesText}>Shop guidelines</Text>
        </TouchableOpacity>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity 
            style={[
              styles.followButton,
              isFollowing && styles.followingButton
            ]}
            onPress={handleFollow}
          >
            <Text style={[
              styles.followButtonText,
              isFollowing && styles.followingButtonText
            ]}>
              {isFollowing ? '✓ Following' : '+ Follow'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.messageButton}
            onPress={handleMessage}
          >
            <Text style={styles.messageButtonText}>Message</Text>
          </TouchableOpacity>
        </View>

        {/* Shop Section */}
        <View style={styles.shopSection}>
          <View style={styles.shopHeader}>
            <View>
              <View style={styles.shopTitleRow}>
                <Text style={styles.shopTitle}>Shop</Text>
                <Text style={styles.shopArrow}>›</Text>
              </View>
              <Text style={styles.shopAvailable}>
                {profileData.shopItems} available
              </Text>
            </View>
          </View>

          {/* Shop Items Grid */}
          <FlatList
            data={shopItemsData}
            renderItem={renderShopItem}
            keyExtractor={(item) => item.id}
            numColumns={2}
            columnWrapperStyle={styles.shopGrid}
            scrollEnabled={false}
            showsVerticalScrollIndicator={false}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerButton: {
    padding: 8,
  },
  headerIcon: {
    fontSize: 24,
    color: '#000',
  },
  headerRight: {
    flexDirection: 'row',
    gap: 8,
  },
  scrollView: {
    flex: 1,
  },
  profileCard: {
    backgroundColor: '#F5F5F5',
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#00C853',
    borderWidth: 3,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  verifiedIcon: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '700',
  },
  username: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000',
    marginBottom: 20,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
  },
  statItem: {
    alignItems: 'center',
  },
  statValueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000',
  },
  starIcon: {
    fontSize: 16,
    marginLeft: 2,
  },
  statLabel: {
    fontSize: 13,
    color: '#666',
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#D0D0D0',
  },
  followSection: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 48,
    paddingVertical: 20,
  },
  followStat: {
    alignItems: 'center',
  },
  followCount: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
    marginBottom: 4,
  },
  followLabel: {
    fontSize: 14,
    color: '#666',
  },
  bio: {
    paddingHorizontal: 20,
    fontSize: 14,
    lineHeight: 20,
    color: '#333',
    marginBottom: 12,
  },
  guidelinesButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  guidelinesIcon: {
    fontSize: 16,
    marginRight: 6,
  },
  guidelinesText: {
    fontSize: 14,
    color: '#4A9EFF',
    fontWeight: '600',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  followButton: {
    flex: 1,
    backgroundColor: '#C8E853',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  followingButton: {
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  followButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
  },
  followingButtonText: {
    color: '#666',
  },
  messageButton: {
    flex: 1,
    backgroundColor: '#C8E853',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  messageButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
  },
  shopSection: {
    paddingHorizontal: 20,
    paddingBottom: 30,
  },
  shopHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  shopTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  shopTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000',
  },
  shopArrow: {
    fontSize: 28,
    color: '#333',
    marginTop: -4,
  },
  shopAvailable: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  shopGrid: {
    gap: 12,
    marginBottom: 12,
  },
  shopCard: {
    flex: 1,
    backgroundColor: '#fff',
  },
  shopCardImageContainer: {
    width: '100%',
    aspectRatio: 1,
    marginBottom: 8,
  },
  shopCardImage: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
    backgroundColor: '#F0F0F0',
  },
  shippingCard: {
    backgroundColor: '#E8C4B8',
    padding: 16,
    position: 'relative',
  },
  shippingLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
    position: 'absolute',
    top: 12,
    left: 12,
    transform: [{ rotate: '-8deg' }],
  },
  upsLogoContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  upsShield: {
    width: 60,
    height: 60,
    backgroundColor: '#4A2800',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  upsText: {
    fontSize: 20,
    fontWeight: '900',
    color: '#FFB800',
  },
  freeShippingBadge: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    backgroundColor: 'rgba(0,0,0,0.75)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  badgeIcon: {
    fontSize: 12,
  },
  freeShippingText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  shopCardContent: {
    gap: 4,
  },
  shopCardTitle: {
    fontSize: 13,
    color: '#333',
    fontWeight: '500',
    lineHeight: 18,
  },
  shopCardPrice: {
    fontSize: 15,
    fontWeight: '700',
    color: '#000',
  },
});

export default SellerProfileScreen;