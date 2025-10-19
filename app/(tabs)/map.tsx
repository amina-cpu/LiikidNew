import AsyncStorage from '@react-native-async-storage/async-storage';
import { decode } from 'base64-arraybuffer';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { supabase } from '../../lib/Supabase';

interface UserProfile {
  user_id: number;
  username: string;
  email: string;
  full_name: string;
  bio: string | null;
  profile_image_url: string | null;
  location: string | null;
  is_seller: boolean;
  is_verified: boolean;
}

const ProfileScreen = () => {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('Collection');
  const [userData, setUserData] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [followingCount, setFollowingCount] = useState(0);
  const [followersCount, setFollowersCount] = useState(0);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  useEffect(() => {
    loadUserData();
    requestPermissions();
  }, []);

  const requestPermissions = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow access to your photos to upload a profile picture');
    }
  };

  const loadUserData = async () => {
    try {
      const userJson = await AsyncStorage.getItem('user');
      if (userJson) {
        const user = JSON.parse(userJson);
        setUserData(user);

        const { count: followingCount } = await supabase
          .from('user_follows')
          .select('*', { count: 'exact', head: true })
          .eq('follower_id', user.user_id);
        
        setFollowingCount(followingCount || 0);

        const { count: followersCount } = await supabase
          .from('user_follows')
          .select('*', { count: 'exact', head: true })
          .eq('following_id', user.user_id);
        
        setFollowersCount(followersCount || 0);
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const uploadProfilePhoto = async () => {
    try {
      setUploadingPhoto(true);

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (result.canceled) {
        setUploadingPhoto(false);
        return;
      }

      const imageUri = result.assets[0].uri;

      const response = await fetch(imageUri);
      const blob = await response.blob();
      const arrayBuffer = await new Response(blob).arrayBuffer();
      const base64 = btoa(
        new Uint8Array(arrayBuffer).reduce(
          (data, byte) => data + String.fromCharCode(byte),
          ''
        )
      );

      const fileExt = imageUri.split('.').pop();
      const fileName = `${userData?.user_id}_${Date.now()}.${fileExt}`;
      const filePath = `profile_photos/${fileName}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('user_profiles')
        .upload(filePath, decode(base64), {
          contentType: `image/${fileExt}`,
          upsert: true,
        });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('user_profiles')
        .getPublicUrl(filePath);

      const publicUrl = urlData.publicUrl;

      const { error: updateError } = await supabase
        .from('users')
        .update({ profile_image_url: publicUrl })
        .eq('user_id', userData?.user_id);

      if (updateError) throw updateError;

      const updatedUser = { ...userData, profile_image_url: publicUrl };
      setUserData(updatedUser as UserProfile);
      await AsyncStorage.setItem('user', JSON.stringify(updatedUser));

      Alert.alert('Success', 'Profile photo updated successfully!');
    } catch (error: any) {
      console.error('Error uploading photo:', error);
      Alert.alert('Upload Failed', error.message || 'Failed to upload profile photo');
    } finally {
      setUploadingPhoto(false);
    }
  };

  // ✅ Updated logout function with confirmation + proper redirect
const handleLogout = async () => {
  Alert.alert(
    'Log Out',
    'Are you sure you want to log out?',
    [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log Out',
        style: 'destructive',
        onPress: async () => {
          try {
            await AsyncStorage.removeItem('user');
            await AsyncStorage.removeItem('isLoggedIn');
            await AsyncStorage.removeItem('userId');
            
            // 👇 Correct navigation path to your login screen
            router.replace('/(auth)/login');
          } catch (error) {
            console.error('Error logging out:', error);
          }
        },
      },
    ],
    { cancelable: true }
  );
};


  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color="#C8E853" />
      </View>
    );
  }

  if (!userData) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Text style={styles.errorText}>No user data found</Text>
        <TouchableOpacity style={styles.loginButton} onPress={() => router.push('/(auth)/login')}>
          <Text style={styles.loginButtonText}>Go to Login</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const getInitials = () => {
    if (userData.full_name) {
      return userData.full_name.charAt(0).toUpperCase();
    }
    return userData.username.charAt(0).toUpperCase();
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Profile</Text>
        <View style={styles.headerIcons}>
          <TouchableOpacity style={styles.iconButton}>
            <Text style={styles.icon}>🎧</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconButton}>
            <Text style={styles.icon}>↑</Text>
          </TouchableOpacity>
          {/* ⚙️ Logout button */}
          <TouchableOpacity style={styles.iconButton} onPress={handleLogout}>
            <Text style={styles.icon}>⚙️</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatarContainer}>
            {uploadingPhoto ? (
              <View style={styles.avatarPlaceholder}>
                <ActivityIndicator size="large" color="#fff" />
              </View>
            ) : userData.profile_image_url ? (
              <Image source={{ uri: userData.profile_image_url }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarText}>{getInitials()}</Text>
              </View>
            )}
            {userData.is_verified && <View style={styles.verifiedBadge} />}
            <TouchableOpacity 
              style={styles.editButton}
              onPress={uploadProfilePhoto}
              disabled={uploadingPhoto}
            >
              <Text style={styles.editIcon}>✏️</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.username}>{userData.username}</Text>

          {/* Following/Followers */}
          <View style={styles.followStats}>
            <TouchableOpacity style={styles.followItem}>
              <Text style={styles.followCount}>{followingCount}</Text>
              <Text style={styles.followLabel}>Following</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.followItem}>
              <Text style={styles.followCount}>{followersCount}</Text>
              <Text style={styles.followLabel}>Followers</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Bio */}
        {userData.bio && (
          <Text style={styles.bio}>{userData.bio}</Text>
        )}

        {/* Location */}
        {userData.location && (
          <Text style={styles.location}>📍 {userData.location}</Text>
        )}

        {/* Action Button */}
        {userData.is_seller ? (
          <TouchableOpacity style={styles.liveButton}>
            <Text style={styles.liveButtonText}>Manage Shop</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.liveButton}>
            <Text style={styles.liveButtonText}>Apply to go LIVE</Text>
          </TouchableOpacity>
        )}

        {/* Tabs */}
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
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  // (unchanged styles)
  container: { flex: 1, backgroundColor: '#fff' },
  centerContent: { justifyContent: 'center', alignItems: 'center' },
  errorText: { fontSize: 16, color: '#666', marginBottom: 20 },
  loginButton: { backgroundColor: '#C8E853', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  loginButtonText: { fontSize: 16, fontWeight: '700', color: '#000' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  headerTitle: { fontSize: 24, fontWeight: '700', flex: 1 },
  headerIcons: { flexDirection: 'row', gap: 12 },
  iconButton: { padding: 4 },
  icon: { fontSize: 22 },
  content: { flex: 1 },
  profileCard: { backgroundColor: '#f5f5f5', marginHorizontal: 16, marginTop: 16, borderRadius: 20, padding: 24, alignItems: 'center' },
  avatarContainer: { position: 'relative', marginBottom: 12 },
  avatar: { width: 80, height: 80, borderRadius: 40 },
  avatarPlaceholder: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#E8C4D8', alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 36, fontWeight: '600', color: '#fff' },
  verifiedBadge: { position: 'absolute', bottom: 2, right: 2, width: 24, height: 24, borderRadius: 12, backgroundColor: '#00C853', borderWidth: 3, borderColor: '#fff' },
  editButton: { position: 'absolute', bottom: -5, right: -5, backgroundColor: '#fff', borderRadius: 15, padding: 6, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  editIcon: { fontSize: 16 },
  username: { fontSize: 20, fontWeight: '600', marginBottom: 16 },
  followStats: { flexDirection: 'row', gap: 48 },
  followItem: { alignItems: 'center' },
  followCount: { fontSize: 24, fontWeight: '700', marginBottom: 4 },
  followLabel: { fontSize: 14, color: '#666' },
  bio: { paddingHorizontal: 20, marginTop: 20, fontSize: 14, lineHeight: 20, color: '#333' },
  location: { paddingHorizontal: 20, marginTop: 12, fontSize: 14, color: '#666' },
  liveButton: { backgroundColor: '#C8E853', marginHorizontal: 20, marginTop: 20, paddingVertical: 16, borderRadius: 12, alignItems: 'center' },
  liveButtonText: { fontSize: 16, fontWeight: '700', color: '#000' },
  tabs: { flexDirection: 'row', marginTop: 20, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: '#E0E0E0' },
  tab: { flex: 1, alignItems: 'center', paddingBottom: 12 },
  tabText: { fontSize: 15, color: '#666' },
  tabTextActive: { fontWeight: '600', color: '#000' },
  tabIndicator: { position: 'absolute', bottom: -1, height: 2, width: '100%', backgroundColor: '#000' },
  emptyState: { alignItems: 'center', paddingVertical: 60, paddingHorizontal: 40 },
  emptyIcon: { width: 64, height: 64, borderRadius: 8, borderWidth: 2, borderColor: '#CCC', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  emptyIconText: { fontSize: 32 },
  emptyText: { fontSize: 15, color: '#666', textAlign: 'center', lineHeight: 22 },
  addButton: { position: 'absolute', bottom: 80, right: 20, width: 56, height: 56, borderRadius: 28, backgroundColor: '#C8E853', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 8 },
  addButtonText: { fontSize: 28, fontWeight: '300', color: '#000' },
});

export default ProfileScreen;
