import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { decode } from 'base64-arraybuffer';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    KeyboardAvoidingView,
    Platform,
    SafeAreaView,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
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
    phone_number: string | null;
    created_at?: string;
    updated_at?: string;
}

const ProfileSettingsScreen = () => {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploadingPhoto, setUploadingPhoto] = useState(false);
    const [userData, setUserData] = useState<UserProfile | null>(null);
    
    // Form fields
    const [fullName, setFullName] = useState('');
    const [bio, setBio] = useState('');
    const [phoneNumber, setPhoneNumber] = useState('');

    useEffect(() => {
        loadUserData();
    }, []);

    const loadUserData = async () => {
        try {
            setLoading(true);
            const userJson = await AsyncStorage.getItem('user');
            if (userJson) {
                const user = JSON.parse(userJson);
                setUserData(user);
                setFullName(user.username || '');
                setBio(user.bio || '');
                setPhoneNumber(user.phone_number || '');
            }
        } catch (error) {
            console.error('Error loading user data:', error);
            Alert.alert('Error', 'Failed to load profile data');
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
        } catch (error: any) {
            console.error('Error uploading photo:', error);
            Alert.alert('Upload Failed', error.message || 'Failed to upload profile photo');
        } finally {
            setUploadingPhoto(false);
        }
    };
const handleSave = async () => {
        try {
            setSaving(true);

            if (!fullName.trim()) {
                Alert.alert('Validation Error', 'Name cannot be empty');
                setSaving(false);
                return;
            }

            const { error } = await supabase
                .from('users')
                .update({
                    username: fullName.trim(),
                    bio: bio.trim() || null,
                    phone_number: phoneNumber.trim() || null,
                })
                .eq('user_id', userData?.user_id);

            if (error) throw error;

            const updatedUser = {
                ...userData,
                username: fullName.trim(),
                bio: bio.trim() || null,
                phone_number: phoneNumber.trim() || null,
            };
            
            setUserData(updatedUser as UserProfile);
            await AsyncStorage.setItem('user', JSON.stringify(updatedUser));

            Alert.alert('Success', 'Profile updated successfully');
            router.push('/(tabs)/profile');
        } catch (error: any) {
            console.error('Error saving profile:', error);
            Alert.alert('Save Failed', error.message || 'Failed to save profile');
        } finally {
            setSaving(false);
        }
    };

    const getInitials = () => {
        if (userData?.full_name) {
            return userData.full_name.charAt(0).toUpperCase();
        }
        return userData?.username?.charAt(0).toUpperCase() || 'U';
    };

    if (loading) {
        return (
            <View style={[styles.container, styles.centerContent]}>
                <ActivityIndicator size="large" color="#16A085" />
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" />
            
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#000" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Profile Settings</Text>
                <TouchableOpacity 
                    onPress={handleSave} 
                    style={styles.saveButton}
                    disabled={saving}
                >
                    {saving ? (
                        <ActivityIndicator size="small" color="#fff" />
                    ) : (
                        <Text style={styles.saveButtonText}>Save</Text>
                    )}
                </TouchableOpacity>
            </View>

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
            >
                <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
                    {/* Profile Photo Section */}
                    <View style={styles.photoSection}>
                        <View style={styles.avatarContainer}>
                            {uploadingPhoto ? (
                                <View style={styles.avatarCircle}>
                                    <ActivityIndicator size="large" color="#fff" />
                                </View>
                            ) : userData?.profile_image_url ? (
                                <Image source={{ uri: userData.profile_image_url }} style={styles.avatarCircle} />
                            ) : (
                                <View style={styles.avatarCircle}>
                                    <Text style={styles.avatarInitial}>{getInitials()}</Text>
                                </View>
                            )}
                            
                            <TouchableOpacity 
                                style={styles.cameraButton}
                                onPress={uploadProfilePhoto}
                                disabled={uploadingPhoto}
                            >
                                <Ionicons name="camera" size={18} color="#fff" />
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Name Field */}
                    <View style={styles.fieldContainer}>
                        <View style={styles.fieldHeader}>
                            <MaterialCommunityIcons name="pencil-outline" size={18} color="#999" />
                            <Text style={styles.fieldLabel}>Name</Text>
                        </View>
                        <View style={styles.inputWrapper}>
                            <TextInput
                                style={styles.input}
                                value={fullName}
                                onChangeText={setFullName}
                                placeholder="Enter your name"
                                placeholderTextColor="#999"
                            />
                        </View>
                    </View>

                    {/* Bio Field */}
                    <View style={styles.fieldContainer}>
                        <View style={styles.fieldHeader}>
                            <MaterialCommunityIcons name="text" size={18} color="#999" />
                            <Text style={styles.fieldLabel}>Bio</Text>
                        </View>
                        <View style={styles.inputWrapper}>
                            <TextInput
                                style={[styles.input, styles.bioInput]}
                                value={bio}
                                onChangeText={setBio}
                                placeholder="Write your bio..."
                                placeholderTextColor="#999"
                                multiline
                                numberOfLines={5}
                                textAlignVertical="top"
                            />
                        </View>
                    </View>

                    {/* Phone Number Field */}
                    <View style={styles.fieldContainer}>
                        <View style={styles.fieldHeader}>
                            <Ionicons name="call-outline" size={18} color="#999" />
                            <Text style={styles.fieldLabel}>Phone Number</Text>
                        </View>
                        <View style={styles.inputWrapper}>
                            <View style={styles.phoneInputContainer}>
                                <View style={styles.flagContainer}>
                                    <Text style={styles.flagEmoji}>🇩🇿</Text>
                                </View>
                                <TextInput
                                    style={[styles.input, styles.phoneInput]}
                                    value={phoneNumber}
                                    onChangeText={setPhoneNumber}
                                    placeholder="0777070070"
                                    placeholderTextColor="#999"
                                    keyboardType="phone-pad"
                                />
                                <TouchableOpacity style={styles.verifyBadge}>
                                    <Ionicons name="shield-checkmark" size={20} color="#16A085" />
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>

                    <View style={{ height: 40 }} />
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F5F5F5',
    },
    centerContent: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 14,
        backgroundColor: '#fff',
        borderBottomWidth: 0.5,
        borderBottomColor: '#e5e5e5',
        marginTop: 35,
    },
    backButton: {
        padding: 4,
        width: 40,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#000',
        flex: 1,
        textAlign: 'center',
    },
    saveButton: {
        backgroundColor: '#16A085',
        paddingHorizontal: 20,
        paddingVertical: 8,
        borderRadius: 20,
        minWidth: 70,
        alignItems: 'center',
    },
    saveButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#fff',
    },
    scrollContent: {
        flex: 1,
    },
    photoSection: {
        alignItems: 'center',
        paddingVertical: 30,
        backgroundColor: '#fff',
        marginBottom: 16,
    },
    avatarContainer: {
        position: 'relative',
    },
    avatarCircle: {
        width: 110,
        height: 110,
        borderRadius: 55,
        backgroundColor: '#16A085',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 4,
        borderColor: '#fff',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
    },
    avatarInitial: {
        fontSize: 48,
        fontWeight: '600',
        color: '#fff',
    },
    cameraButton: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        backgroundColor: '#000',
        borderRadius: 20,
        width: 36,
        height: 36,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 3,
        borderColor: '#fff',
    },
    fieldContainer: {
        backgroundColor: '#fff',
        marginBottom: 16,
        paddingHorizontal: 20,
        paddingVertical: 16,
    },
    fieldHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
        gap: 8,
    },
    fieldLabel: {
        fontSize: 13,
        color: '#999',
        fontWeight: '500',
    },
    inputWrapper: {
        borderRadius: 12,
        backgroundColor: '#F8F8F8',
        overflow: 'hidden',
    },
    input: {
        fontSize: 15,
        color: '#000',
        paddingHorizontal: 16,
        paddingVertical: 14,
        backgroundColor: '#F8F8F8',
    },
    bioInput: {
        minHeight: 120,
        paddingTop: 14,
    },
    phoneInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F8F8F8',
    },
    flagContainer: {
        paddingLeft: 16,
        paddingRight: 8,
    },
    flagEmoji: {
        fontSize: 24,
    },
    phoneInput: {
        flex: 1,
        paddingLeft: 8,
    },
    verifyBadge: {
        paddingRight: 16,
        paddingLeft: 8,
    },
});

export default ProfileSettingsScreen;