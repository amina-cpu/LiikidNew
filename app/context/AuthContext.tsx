// app/context/AuthContext.tsx

import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter, useSegments } from 'expo-router';
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { I18nManager } from 'react-native';
import { setLocale } from '../../lib/i18n';
import { supabase } from '../../lib/Supabase';

interface UserProfile {
    user_id: number;
    username: string;
    email: string;
    full_name: string;
    bio: string | null;
    profile_image_url: string | null;
    location: string | null;
    avatar_url?: string | null;
    auth_provider?: string | null;
    auth_provider_id?: string | null;
}

interface AuthContextType {
    user: UserProfile | null;
    isLoading: boolean;
    signOut: () => Promise<void>;
    updateUser: (user: UserProfile) => Promise<void>; 
}

const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}

function useProtectedRoute(user: UserProfile | null, isLoading: boolean) {
    const segments = useSegments();
    const router = useRouter();

    useEffect(() => {
        if (isLoading) {
            console.log('⏳ Auth is loading...');
            return;
        }

        const isAuthenticated = !!user;
        const inAuthGroup = segments[0] === '(auth)';
        const inTabsGroup = segments[0] === '(tabs)';
        const onWelcomeScreen = segments.length === 0 || segments[0] === 'index';
        
        console.log('🔐 Auth Check:', { 
            isAuthenticated, 
            inAuthGroup,
            inTabsGroup,
            onWelcomeScreen,
            segments: segments.join('/'),
            userEmail: user?.email 
        });

        // ONLY protect tabs - let index page handle its own routing
        if (!isAuthenticated && inTabsGroup) {
            console.log("❌ Redirecting unauthenticated user to signup");
            router.replace('/(auth)/signup');
        }
    }, [user, isLoading, segments, router]);
}

// Helper function to load and apply user settings
async function loadAndApplyUserSettings(userId: number): Promise<void> {
    try {
        console.log('⚙️ Loading user settings for user:', userId);
        
        const { data, error } = await supabase
            .from('user_settings')
            .select('language_code, theme')
            .eq('user_id', userId)
            .single();

        if (error && error.code !== 'PGRST116') {
            console.error('❌ Error loading user settings:', error);
            return;
        }

        if (data) {
            console.log('✅ User settings loaded:', data);
            
            // Apply saved language
            await setLocale(data.language_code);
            console.log('✅ Language applied:', data.language_code);

            // Apply RTL for Arabic
            if (data.language_code === 'ar') {
                I18nManager.allowRTL(true);
                I18nManager.forceRTL(true);
                console.log('✅ RTL enabled for Arabic');
            } else {
                I18nManager.allowRTL(false);
                I18nManager.forceRTL(false);
                console.log('✅ LTR enabled');
            }
        } else {
            // Create default settings if none exist
            console.log('ℹ️ No settings found, creating defaults...');
            await createDefaultUserSettings(userId);
        }
    } catch (error) {
        console.error('❌ Error in loadAndApplyUserSettings:', error);
    }
}

// Helper function to create default user settings
async function createDefaultUserSettings(userId: number): Promise<void> {
    try {
        const { error } = await supabase
            .from('user_settings')
            .insert({
                user_id: userId,
                theme: 'light',
                language_code: 'en',
                data_saver_mode: false,
                two_factor_enabled: false,
                activity_status_visibility: 'public',
            });

        if (error) {
            console.error('❌ Error creating default settings:', error);
        } else {
            console.log('✅ Default settings created for user:', userId);
        }
    } catch (error) {
        console.error('❌ Error in createDefaultUserSettings:', error);
    }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<UserProfile | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const loadUser = async () => {
            try {
                console.log('🔄 Loading user from AsyncStorage...');
                const userJson = await AsyncStorage.getItem('user');
                const isLoggedIn = await AsyncStorage.getItem('isLoggedIn');
                
                if (isLoggedIn === 'true' && userJson) {
                    const loadedUser = JSON.parse(userJson) as UserProfile;
                    console.log('✅ User loaded from storage:', loadedUser.email);
                    console.log('✅ User ID loaded:', loadedUser.user_id);
                    setUser(loadedUser);
                    
                    // Load and apply user settings
                    await loadAndApplyUserSettings(loadedUser.user_id);
                } else {
                    console.log('ℹ️ No user in storage');
                }
            } catch (e) {
                console.error("❌ Failed to load auth state:", e);
            } finally {
                setIsLoading(false);
            }
        };
        loadUser();
    }, []);

    const updateUser = async (newUser: UserProfile) => {
        try {
            console.log('💾 Storing user in AsyncStorage:', newUser.email);
            console.log('💾 User ID being stored:', newUser.user_id);
            console.log('💾 Full user object:', JSON.stringify(newUser, null, 2));
            
            await AsyncStorage.setItem('user', JSON.stringify(newUser));
            await AsyncStorage.setItem('isLoggedIn', 'true');
            await AsyncStorage.setItem('userId', newUser.user_id.toString());
            
            setUser(newUser);
            console.log('✅ User updated in context');
            console.log('✅ Stored userId:', newUser.user_id.toString());
            
            // Load and apply user settings when user is updated
            await loadAndApplyUserSettings(newUser.user_id);
        } catch (error) {
            console.error('❌ Error updating user:', error);
            throw error;
        }
    };

    const signOut = async () => {
        try {
            console.log('👋 Signing out...');
            await AsyncStorage.multiRemove(['user', 'isLoggedIn', 'userId']);
            setUser(null);
            
            // Reset to default language and LTR on logout
            await setLocale('en');
            I18nManager.allowRTL(false);
            I18nManager.forceRTL(false);
            console.log('✅ Settings reset to defaults');
            
            console.log('✅ User signed out');
        } catch (error) {
            console.error('❌ Error signing out:', error);
        }
    };

    useProtectedRoute(user, isLoading);

    const contextValue = useMemo(() => ({
        user,
        isLoading,
        signOut,
        updateUser,
    }), [user, isLoading]);

    return (
        <AuthContext.Provider value={contextValue}>
            {children}
        </AuthContext.Provider>
    );
}