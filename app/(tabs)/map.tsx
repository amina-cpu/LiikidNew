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
} from 'react-native';

// Mock data for demonstration
const myProfileData = {
  isOwnProfile: true,
  username: 'Adam_Benhaddad',
  avatar: null,
  initials: 'A',
  following: 2,
  followers: 2,
  bio: "My name is Adam and had that I'm the most collateral and organized or compliant gardener simply https://facebook.com mmmmmmmmmmmm mmmmmmmmmmmm",
  collections: [],
  posts: [],
  liked: [],
};

const otherProfileData = {
  isOwnProfile: false,
  username: 'PlantsAmelia',
  avatar: 'https://i.pravatar.cc/150?img=5',
  rating: 4.8,
  reviews: 11,
  sales: 51,
  following: 33,
  followers: 79,
  bio: "Hey I'm Sierra👋Turning my passion into my dream business one plant at a time! Feel free to reach out🤗🌺🌻 Please read shop guidelines. Amelia Island, FL",
  shopItems: 179,
  hasShop: true,
};

const ProfileScreen = ({ profileData = myProfileData }) => {
  const [activeTab, setActiveTab] = useState('Collection');
  const { isOwnProfile } = profileData;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      {/* Header */}
      <View style={styles.header}>
        {!isOwnProfile && (
          <TouchableOpacity style={styles.backButton}>
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
        )}
        <Text style={styles.headerTitle}>{isOwnProfile ? 'Profile' : ''}</Text>
        <View style={styles.headerIcons}>
          {isOwnProfile ? (
            <>
              <TouchableOpacity style={styles.iconButton}>
                <Text style={styles.icon}>🎧</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.iconButton}>
                <Text style={styles.icon}>↑</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.iconButton}>
                <Text style={styles.icon}>⚙️</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <TouchableOpacity style={styles.iconButton}>
                <Text style={styles.icon}>↑</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.iconButton}>
                <Text style={styles.icon}>⋯</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatarContainer}>
            {profileData.avatar ? (
              <Image source={{ uri: profileData.avatar }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarText}>{profileData.initials}</Text>
              </View>
            )}
            {!isOwnProfile && <View style={styles.verifiedBadge} />}
            {isOwnProfile && (
              <TouchableOpacity style={styles.editButton}>
                <Text style={styles.editIcon}>✏️</Text>
              </TouchableOpacity>
            )}
          </View>

          <Text style={styles.username}>{profileData.username}</Text>

          {/* Stats for Seller Profile */}
          {!isOwnProfile && profileData.hasShop && (
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>
                  {profileData.rating}⭐
                </Text>
                <Text style={styles.statLabel}>Rating</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{profileData.reviews}</Text>
                <Text style={styles.statLabel}>Reviews</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{profileData.sales}</Text>
                <Text style={styles.statLabel}>Sales</Text>
              </View>
            </View>
          )}

          {/* Following/Followers */}
          <View style={styles.followStats}>
            <View style={styles.followItem}>
              <Text style={styles.followCount}>{profileData.following}</Text>
              <Text style={styles.followLabel}>Following</Text>
            </View>
            <View style={styles.followItem}>
              <Text style={styles.followCount}>{profileData.followers}</Text>
              <Text style={styles.followLabel}>Followers</Text>
            </View>
          </View>
        </View>

        {/* Bio */}
        <Text style={styles.bio}>{profileData.bio}</Text>

        {/* Shop Guidelines Link (for seller) */}
        {!isOwnProfile && profileData.hasShop && (
          <TouchableOpacity style={styles.guidelinesButton}>
            <Text style={styles.guidelinesText}>📋 Shop guidelines</Text>
          </TouchableOpacity>
        )}

        {/* Action Buttons */}
        {isOwnProfile ? (
          <TouchableOpacity style={styles.liveButton}>
            <Text style={styles.liveButtonText}>Apply to go LIVE</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.actionButtons}>
            <TouchableOpacity style={styles.followButton}>
              <Text style={styles.followButtonText}>+ Follow</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.messageButton}>
              <Text style={styles.messageButtonText}>Message</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Shop Section (for seller) */}
        {!isOwnProfile && profileData.hasShop && (
          <View style={styles.shopSection}>
            <View style={styles.shopHeader}>
              <Text style={styles.shopTitle}>Shop</Text>
              <Text style={styles.shopArrow}>›</Text>
            </View>
            <Text style={styles.shopAvailable}>{profileData.shopItems} available</Text>
            
            <View style={styles.shopItems}>
              <View style={styles.shopItem}>
                <View style={styles.shopItemImage}>
                  <Text style={styles.shopItemLabel}>Shipping Upgrade</Text>
                  <Text style={styles.upsLogo}>UPS</Text>
                  <View style={styles.freeShippingBadge}>
                    <Text style={styles.freeShippingText}>🚚 Free shipping</Text>
                  </View>
                </View>
                <Text style={styles.shopItemTitle}>UPS 2nd Day Air Shipping Upgra...</Text>
              </View>
              
              <View style={styles.shopItem}>
                <View style={[styles.shopItemImage, styles.plantImage]}>
                  <Text style={styles.plantEmoji}>🌿</Text>
                </View>
                <Text style={styles.shopItemTitle}>Syngonium Aurea Cutting</Text>
              </View>
            </View>
          </View>
        )}

        {/* Tabs (for own profile) */}
        {isOwnProfile && (
          <>
            <View style={styles.tabs}>
              {['Collection', 'Post', 'Liked'].map((tab) => (
                <TouchableOpacity
                  key={tab}
                  style={styles.tab}
                  onPress={() => setActiveTab(tab)}
                >
                  <Text
                    style={[
                      styles.tabText,
                      activeTab === tab && styles.tabTextActive,
                    ]}
                  >
                    {tab}
                  </Text>
                  {activeTab === tab && <View style={styles.tabIndicator} />}
                </TouchableOpacity>
              ))}
            </View>

            {/* Empty State */}
            <View style={styles.emptyState}>
              <View style={styles.emptyIcon}>
                <Text style={styles.emptyIconText}>📁+</Text>
              </View>
              <Text style={styles.emptyText}>
                It looks a bit empty in here! Got a new find? Show it off!
              </Text>
            </View>

            {/* Add Button */}
            <TouchableOpacity style={styles.addButton}>
              <Text style={styles.addButtonText}>+</Text>
            </TouchableOpacity>
          </>
        )}
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
  backButton: {
    padding: 4,
  },
  backIcon: {
    fontSize: 24,
    color: '#000',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    flex: 1,
  },
  headerIcons: {
    flexDirection: 'row',
    gap: 12,
  },
  iconButton: {
    padding: 4,
  },
  icon: {
    fontSize: 22,
  },
  content: {
    flex: 1,
  },
  profileCard: {
    backgroundColor: '#f5f5f5',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 12,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  avatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#E8C4D8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 36,
    fontWeight: '600',
    color: '#fff',
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
  },
  editButton: {
    position: 'absolute',
    bottom: -5,
    right: -5,
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  editIcon: {
    fontSize: 16,
  },
  username: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 32,
    marginBottom: 16,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 13,
    color: '#666',
  },
  followStats: {
    flexDirection: 'row',
    gap: 48,
  },
  followItem: {
    alignItems: 'center',
  },
  followCount: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  followLabel: {
    fontSize: 14,
    color: '#666',
  },
  bio: {
    paddingHorizontal: 20,
    marginTop: 20,
    fontSize: 14,
    lineHeight: 20,
    color: '#333',
  },
  guidelinesButton: {
    paddingHorizontal: 20,
    marginTop: 12,
  },
  guidelinesText: {
    fontSize: 14,
    color: '#4A9EFF',
    fontWeight: '500',
  },
  liveButton: {
    backgroundColor: '#C8E853',
    marginHorizontal: 20,
    marginTop: 20,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  liveButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    marginTop: 20,
  },
  followButton: {
    flex: 1,
    backgroundColor: '#C8E853',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  followButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
  },
  messageButton: {
    flex: 1,
    backgroundColor: '#C8E853',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  messageButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
  },
  shopSection: {
    paddingHorizontal: 20,
    marginTop: 24,
  },
  shopHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  shopTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  shopArrow: {
    fontSize: 24,
    color: '#666',
  },
  shopAvailable: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
    marginBottom: 16,
  },
  shopItems: {
    flexDirection: 'row',
    gap: 12,
  },
  shopItem: {
    flex: 1,
  },
  shopItemImage: {
    aspectRatio: 1,
    borderRadius: 12,
    backgroundColor: '#E8C4B8',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginBottom: 8,
  },
  shopItemLabel: {
    position: 'absolute',
    top: 12,
    left: 12,
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  upsLogo: {
    fontSize: 48,
    fontWeight: '900',
    color: '#4A2800',
  },
  freeShippingBadge: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  freeShippingText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  plantImage: {
    backgroundColor: '#87CEEB',
  },
  plantEmoji: {
    fontSize: 64,
  },
  shopItemTitle: {
    fontSize: 13,
    color: '#333',
  },
  tabs: {
    flexDirection: 'row',
    marginTop: 20,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingBottom: 12,
  },
  tabText: {
    fontSize: 15,
    color: '#666',
  },
  tabTextActive: {
    fontWeight: '600',
    color: '#000',
  },
  tabIndicator: {
    position: 'absolute',
    bottom: -1,
    height: 2,
    width: '100%',
    backgroundColor: '#000',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#CCC',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyIconText: {
    fontSize: 32,
  },
  emptyText: {
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
  },
  addButton: {
    position: 'absolute',
    bottom: 80,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#C8E853',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  addButtonText: {
    fontSize: 28,
    fontWeight: '300',
    color: '#000',
  },
});

export default ProfileScreen;