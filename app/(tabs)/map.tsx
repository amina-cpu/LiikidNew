import AsyncStorage from '@react-native-async-storage/async-storage';
import { decode } from 'base64-arraybuffer';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useAuth } from '../context/AuthContext';
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
    FlatList,
} from 'react-native';
import { Ionicons, MaterialIcons, Feather } from '@expo/vector-icons';
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
    const [activeTab, setActiveTab] = useState('Post');
    const [userData, setUserData] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [followingCount, setFollowingCount] = useState(0);
    const [followersCount, setFollowersCount] = useState(0);
    const [postsCount, setPostsCount] = useState(11);
    const [uploadingPhoto, setUploadingPhoto] = useState(false);
    const { signOut } = useAuth();

    // Mock posts data
    const mockPosts = Array(6).fill(null).map((_, i) => ({ id: i }));

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

            if (uploadError) {
                throw uploadError;
            }

            const { data: urlData } = supabase.storage
                .from('user_profiles')
                .getPublicUrl(filePath);

            const publicUrl = urlData.publicUrl;

            const { error: updateError } = await supabase
                .from('users')
                .update({ profile_image_url: publicUrl })
                .eq('user_id', userData?.user_id);

            if (updateError) {
                throw updateError;
            }

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

    const handleLogout = async () => {
        Alert.alert(
            'Logout',
            'Are you sure you want to logout?',
            [
                {
                    text: 'Cancel',
                    style: 'cancel',
                },
                {
                    text: 'Logout',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await signOut(); 
                            router.replace('/(auth)/login'); 
                        } catch (error) {
                            console.error('Error logging out:', error);
                            Alert.alert('Error', 'Failed to logout. Please try again.');
                        }
                    },
                },
            ]
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
                <TouchableOpacity style={styles.loginButton} onPress={() => router.replace('/(auth)/login')}>
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

    const renderPostCard = ({ item }: any) => (
        <View style={styles.postCard}>
            <View style={styles.postImageContainer}>
                <Ionicons name="image-outline" size={50} color="#6B9B97" />
                <View style={styles.postUserBadge} />
            </View>
            <View style={styles.postInfoSection}>
                <View style={styles.postTitleBar} />
                <View style={styles.postSubBar} />
            </View>
        </View>
    );

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" />
            
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Profile</Text>
                <View style={styles.headerRight}>
                    <TouchableOpacity style={styles.headerButton}>
                        <Ionicons name="notifications-outline" size={24} color="#000" />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.headerButton}>
                        <Feather name="share-2" size={22} color="#000" />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.headerButton} onPress={() => router.push('/settings')}>
                        <Ionicons name="settings-outline" size={24} color="#000" />
                    </TouchableOpacity>
                </View>
            </View>

            <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {/* Profile Card */}
                <View style={styles.profileCard}>
                    <View style={styles.avatarWrapper}>
                        {uploadingPhoto ? (
                            <View style={styles.avatarCircle}>
                                <ActivityIndicator size="large" color="#fff" />
                            </View>
                        ) : userData.profile_image_url ? (
                            <Image source={{ uri: userData.profile_image_url }} style={styles.avatarCircle} />
                        ) : (
                            <View style={styles.avatarCircle}>
                                <Text style={styles.avatarInitial}>{getInitials()}</Text>
                            </View>
                        )}
                        <TouchableOpacity 
                            style={styles.editBadge}
                            onPress={uploadProfilePhoto}
                            disabled={uploadingPhoto}
                        >
                            <Feather name="edit-2" size={14} color="#000" />
                        </TouchableOpacity>
                    </View>

                    <Text style={styles.displayName}>{userData.username}</Text>

                    <View style={styles.statsRow}>
                        <View style={styles.statBox}>
                            <Text style={styles.statValue}>{postsCount}</Text>
                            <Text style={styles.statName}>Posts</Text>
                        </View>
                        <View style={styles.statBox}>
                            <Text style={styles.statValue}>{followingCount}</Text>
                            <Text style={styles.statName}>Following</Text>
                        </View>
                        <View style={styles.statBox}>
                            <Text style={styles.statValue}>{followersCount}</Text>
                            <Text style={styles.statName}>Followers</Text>
                        </View>
                    </View>
                </View>

                {/* Bio Section */}
                {userData.bio && (
                    <View style={styles.bioSection}>
                        <Text style={styles.bioText}>{userData.bio}</Text>
                        <Text style={styles.bioLink}>https://www.facebook.com/RingShop</Text>
                    </View>
                )}

                {/* Tabs */}
                <View style={styles.tabBar}>
                    <TouchableOpacity
                        style={styles.tabButton}
                        onPress={() => setActiveTab('Post')}
                    >
                        <View style={styles.tabInner}>
                            <MaterialIcons name="grid-on" size={18} color={activeTab === 'Post' ? '#000' : '#888'} />
                            <Text style={[styles.tabLabel, activeTab === 'Post' && styles.tabLabelActive]}>
                                Post
                            </Text>
                        </View>
                        {activeTab === 'Post' && <View style={styles.activeTabLine} />}
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                        style={styles.tabButton}
                        onPress={() => setActiveTab('Liked')}
                    >
                        <View style={styles.tabInner}>
                            <Ionicons name="heart-outline" size={18} color={activeTab === 'Liked' ? '#000' : '#888'} />
                            <Text style={[styles.tabLabel, activeTab === 'Liked' && styles.tabLabelActive]}>
                                Liked
                            </Text>
                        </View>
                        {activeTab === 'Liked' && <View style={styles.activeTabLine} />}
                    </TouchableOpacity>
                </View>

                {/* Posts Grid */}
                <View style={styles.gridContainer}>
                    <FlatList
                        data={mockPosts}
                        renderItem={renderPostCard}
                        keyExtractor={(item) => item.id.toString()}
                        numColumns={2}
                        scrollEnabled={false}
                        columnWrapperStyle={styles.gridRowStyle}
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
    centerContent: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    errorText: {
        fontSize: 16,
        color: '#666',
        marginBottom: 20,
    },
    loginButton: {
        backgroundColor: '#C8E853',
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 12,
    },
    loginButtonText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#000',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop:35,
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderBottomWidth: 0.5,
        borderBottomColor: '#e5e5e5',
    },
    headerTitle: {
        fontSize: 22,
        fontWeight: '700',
        color: '#000',
    },
    headerRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    headerButton: {
        padding: 2,
    },
    scrollContent: {
        flex: 1,
    },
    profileCard: {
        backgroundColor: '#f8f8f8',
        marginHorizontal: 14,
        marginTop: 16,
        borderRadius: 20,
        paddingVertical: 28,
        paddingHorizontal: 20,
        alignItems: 'center',
    },
    avatarWrapper: {
        position: 'relative',
        marginBottom: 10,
    },
    avatarCircle: {
        width: 85,
        height: 85,
        borderRadius: 42.5,
        backgroundColor: '#D8A7C7',
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarInitial: {
        fontSize: 38,
        fontWeight: '600',
        color: '#fff',
    },
    editBadge: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        backgroundColor: '#fff',
        borderRadius: 10,
        width: 28,
        height: 28,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.15,
        shadowRadius: 3,
        elevation: 2,
    },
    displayName: {
        fontSize: 17,
        fontWeight: '600',
        color: '#000',
        marginBottom: 18,
    },
    statsRow: {
        flexDirection: 'row',
        gap: 36,
    },
    statBox: {
        alignItems: 'center',
    },
    statValue: {
        fontSize: 22,
        fontWeight: '700',
        color: '#000',
        marginBottom: 2,
    },
    statName: {
        fontSize: 12,
        color: '#666',
    },
    bioSection: {
        paddingHorizontal: 18,
        marginTop: 16,
    },
    bioText: {
        fontSize: 13,
        lineHeight: 19,
        color: '#2d2d2d',
        marginBottom: 2,
    },
    bioLink: {
        fontSize: 13,
        color: '#1a73e8',
    },
    tabBar: {
        flexDirection: 'row',
        marginTop: 20,
        borderBottomWidth: 0.5,
        borderBottomColor: '#ddd',
    },
    tabButton: {
        flex: 1,
        alignItems: 'center',
        paddingBottom: 10,
        position: 'relative',
    },
    tabInner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    tabLabel: {
        fontSize: 14,
        color: '#888',
        fontWeight: '500',
    },
    tabLabelActive: {
        fontWeight: '700',
        color: '#000',
    },
    activeTabLine: {
        position: 'absolute',
        bottom: -0.5,
        height: 2.5,
        width: '100%',
        backgroundColor: '#000',
    },
    gridContainer: {
        paddingHorizontal: 14,
        paddingTop: 14,
        paddingBottom: 30,
    },
    gridRowStyle: {
        justifyContent: 'space-between',
        marginBottom: 10,
    },
    postCard: {
        width: '48.5%',
        backgroundColor: '#fff',
        borderRadius: 14,
        overflow: 'hidden',
        borderWidth: 0.5,
        borderColor: '#ddd',
    },
    postImageContainer: {
        height: 130,
        backgroundColor: '#a8ccc8',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
    },
    postUserBadge: {
        position: 'absolute',
        top: 10,
        right: 10,
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: '#2d7a73',
    },
    postInfoSection: {
        padding: 10,
    },
    postTitleBar: {
        height: 10,
        backgroundColor: '#1a1a1a',
        borderRadius: 3,
        marginBottom: 6,
    },
    postSubBar: {
        height: 10,
        backgroundColor: '#a8a8a8',
        borderRadius: 3,
        width: '60%',
    },
});

export default ProfileScreen;