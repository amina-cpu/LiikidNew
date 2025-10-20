import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
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
// 1. IMPORT THE AUTH HOOK
import { useAuth } from '../context/AuthContext'; 

// Define the UserProfile interface to match your database query
interface UserProfile {
    user_id: number;
    username: string;
    email: string;
    full_name: string;
    profile_image_url: string | null;
    is_seller: boolean;
    is_verified: boolean;
    bio: string | null;
    location: string | null;
}


const hashPassword = async (password: string): Promise<string> => {
    return await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        password
    );
};

export default function LoginScreen() {
    const router = useRouter();
    // 2. GET THE CONTEXT FUNCTION
    const { updateUser } = useAuth();
    
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleLogin = async () => {
        if (!email || !password) {
            Alert.alert('Error', 'Please fill in all fields');
            return;
        }

        setLoading(true);
        try {
            const hashedPassword = await hashPassword(password);

            const { data, error } = await supabase
                .from('users')
                .select('user_id, username, email, full_name, profile_image_url, is_seller, is_verified, bio, location')
                .eq('email', email.trim().toLowerCase())
                .eq('password_hash', hashedPassword)
                .single();

            if (error || !data) {
                Alert.alert('Login Failed', 'Invalid email or password');
                setLoading(false);
                return;
            }
            
            // --- CRITICAL CHANGE START ---
            
            // Cast the fetched data to the UserProfile type
            const userData = data as UserProfile;

            // 3. CALL THE CONTEXT FUNCTION: This is the key fix.
            // It updates the state in AuthContext and AsyncStorage.
            await updateUser(userData); 
            
            console.log('✅ User logged in:', userData);

            // 4. Navigate: The AuthProvider's useProtectedRoute will now see the 
            // user state is NOT null and will automatically redirect to '/(tabs)'.
            // Calling replace here simply makes the transition instant.
            router.replace('/(tabs)');

            // --- CRITICAL CHANGE END ---

            // NOTE: The previous AsyncStorage.multiSet block is now obsolete 
            // because it is handled inside the updateUser function in AuthContext.
            // If you still have that block, remove it to avoid redundancy/bugs.


        } catch (error: any) {
            Alert.alert('Login Failed', error.message || 'An error occurred during login');
            console.error('Login error:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        // ... (rest of the component remains the same)
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" />
            <KeyboardAvoidingView 
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.keyboardView}
            >
                <ScrollView 
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                >
                    <View style={styles.headerSection}>
                        <View style={styles.logoContainer}>
                            <Text style={styles.logoEmoji}>🌿</Text>
                        </View>
                        <Text style={styles.appName}>PlantHub</Text>
                        <Text style={styles.tagline}>Grow your green collection</Text>
                    </View>

                    <View style={styles.formSection}>
                        <Text style={styles.title}>Welcome Back!</Text>
                        <Text style={styles.subtitle}>Login to your account</Text>

                        <View style={styles.inputContainer}>
                            <Text style={styles.label}>Email</Text>
                            <View style={styles.inputWrapper}>
                                <Text style={styles.inputIcon}>📧</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="Enter your email"
                                    placeholderTextColor="#999"
                                    value={email}
                                    onChangeText={setEmail}
                                    keyboardType="email-address"
                                    autoCapitalize="none"
                                    autoComplete="email"
                                    editable={!loading}
                                />
                            </View>
                        </View>

                        <View style={styles.inputContainer}>
                            <Text style={styles.label}>Password</Text>
                            <View style={styles.inputWrapper}>
                                <Text style={styles.inputIcon}>🔒</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="Enter your password"
                                    placeholderTextColor="#999"
                                    value={password}
                                    onChangeText={setPassword}
                                    secureTextEntry={!showPassword}
                                    autoCapitalize="none"
                                    autoComplete="password"
                                    editable={!loading}
                                />
                                <TouchableOpacity 
                                    onPress={() => setShowPassword(!showPassword)}
                                    style={styles.eyeButton}
                                    disabled={loading}
                                >
                                    <Text style={styles.eyeIcon}>{showPassword ? '👁️' : '👁️‍🗨️'}</Text>
                                </TouchableOpacity>
                            </View>
                        </View>

                        <TouchableOpacity style={styles.forgotPassword} disabled={loading}>
                            <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
                        </TouchableOpacity>

                        <TouchableOpacity 
                            style={[styles.loginButton, loading && styles.loginButtonDisabled]} 
                            onPress={handleLogin}
                            disabled={loading}
                        >
                            {loading ? (
                                <ActivityIndicator color="#000" />
                            ) : (
                                <Text style={styles.loginButtonText}>Login</Text>
                            )}
                        </TouchableOpacity>

                        <View style={styles.dividerContainer}>
                            <View style={styles.divider} />
                            <Text style={styles.dividerText}>OR</Text>
                            <View style={styles.divider} />
                        </View>

                        <View style={styles.socialButtons}>
                            <TouchableOpacity style={styles.socialButton} disabled={loading}>
                                <Text style={styles.socialIcon}>📱</Text>
                                <Text style={styles.socialButtonText}>Google</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.socialButton} disabled={loading}>
                                <Text style={styles.socialIcon}>📘</Text>
                                <Text style={styles.socialButtonText}>Facebook</Text>
                            </TouchableOpacity>
                        </View>

                        <View style={styles.footer}>
                            <Text style={styles.footerText}>Don't have an account? </Text>
                            <TouchableOpacity 
                                onPress={() => router.push('/(auth)/signup')}
                                disabled={loading}
                            >
                                <Text style={styles.footerLink}>Sign Up</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    keyboardView: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
        paddingBottom: 30,
    },
    headerSection: {
        alignItems: 'center',
        paddingTop: 60,
        paddingBottom: 40,
    },
    logoContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#C8E853',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 5,
    },
    logoEmoji: {
        fontSize: 40,
    },
    appName: {
        fontSize: 32,
        fontWeight: '700',
        color: '#000',
        marginBottom: 8,
    },
    tagline: {
        fontSize: 16,
        color: '#666',
    },
    formSection: {
        paddingHorizontal: 24,
    },
    title: {
        fontSize: 28,
        fontWeight: '700',
        color: '#000',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 16,
        color: '#666',
        marginBottom: 32,
    },
    inputContainer: {
        marginBottom: 20,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: '#333',
        marginBottom: 8,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F5F5F5',
        borderRadius: 12,
        paddingHorizontal: 16,
        height: 56,
        borderWidth: 1,
        borderColor: '#E0E0E0',
    },
    inputIcon: {
        fontSize: 20,
        marginRight: 12,
    },
    input: {
        flex: 1,
        fontSize: 16,
        color: '#000',
    },
    eyeButton: {
        padding: 4,
    },
    eyeIcon: {
        fontSize: 20,
    },
    forgotPassword: {
        alignSelf: 'flex-end',
        marginBottom: 24,
    },
    forgotPasswordText: {
        fontSize: 14,
        color: '#4A9EFF',
        fontWeight: '600',
    },
    loginButton: {
        backgroundColor: '#C8E853',
        borderRadius: 12,
        height: 56,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 3,
    },
    loginButtonDisabled: {
        opacity: 0.6,
    },
    loginButtonText: {
        fontSize: 18,
        fontWeight: '700',
        color: '#000',
    },
    dividerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 24,
    },
    divider: {
        flex: 1,
        height: 1,
        backgroundColor: '#E0E0E0',
    },
    dividerText: {
        fontSize: 14,
        color: '#999',
        marginHorizontal: 16,
        fontWeight: '600',
    },
    socialButtons: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 32,
    },
    socialButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#F5F5F5',
        borderRadius: 12,
        height: 56,
        borderWidth: 1,
        borderColor: '#E0E0E0',
    },
    socialIcon: {
        fontSize: 20,
        marginRight: 8,
    },
    socialButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
    },
    footerText: {
        fontSize: 15,
        color: '#666',
    },
    footerLink: {
        fontSize: 15,
        color: '#4A9EFF',
        fontWeight: '700',
    },
});