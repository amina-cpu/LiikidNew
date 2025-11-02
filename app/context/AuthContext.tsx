// app/context/AuthContext.tsx

import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter, useSegments } from 'expo-router';
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

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