// app/context/AuthContext.tsx

import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter, useSegments } from 'expo-router';
import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';

// Use the existing UserProfile interface from your profile.tsx
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

interface AuthContextType {
    user: UserProfile | null;
    isLoading: boolean;
    signOut: () => Promise<void>;
    // Function to call on successful login, provided by the login screen
    updateUser: (user: UserProfile) => Promise<void>; 
}

// Create the context
const AuthContext = createContext<AuthContextType | null>(null);

// Custom hook to consume the context
export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}

// Custom hook for protected routes (the navigation logic)
function useProtectedRoute(user: UserProfile | null, isLoading: boolean) {
    const segments = useSegments();
    const router = useRouter();

    useEffect(() => {
        if (isLoading) return; // Wait until loading is complete

        // isAuthenticated is now just checking if the user object exists
        const isAuthenticated = !!user;
        const inAuthGroup = segments[0] === '(auth)';
        
        if (isAuthenticated && inAuthGroup) {
            // User IS authenticated but is on login/signup, redirect to home
            console.log("-> Redirecting to Home (User is Logged In)");
            router.replace('/(tabs)');
        } else if (!isAuthenticated && !inAuthGroup) {
            // User is NOT authenticated and is on a protected route, redirect to login
            console.log("-> Redirecting to Login (User is Logged Out)");
            // Ensure the path matches your login file location
            router.replace('/(auth)/login');
        }
    }, [user, isLoading, segments]);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<UserProfile | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Initial load from AsyncStorage
    useEffect(() => {
        const loadUser = async () => {
            try {
                const userJson = await AsyncStorage.getItem('user');
                const isLoggedIn = await AsyncStorage.getItem('isLoggedIn');
                
                if (isLoggedIn === 'true' && userJson) {
                    const loadedUser = JSON.parse(userJson) as UserProfile;
                    setUser(loadedUser);
                }
            } catch (e) {
                console.error("Failed to load auth state:", e);
            } finally {
                setIsLoading(false);
            }
        };
        loadUser();
    }, []);

    // Function to handle login (called by login.tsx)
    const updateUser = async (newUser: UserProfile) => {
        await AsyncStorage.setItem('user', JSON.stringify(newUser));
        await AsyncStorage.setItem('isLoggedIn', 'true');
        // 'userId' should also be set if your load logic depends on it
        await AsyncStorage.setItem('userId', newUser.user_id.toString()); 
        setUser(newUser);
    };

    // Function to handle logout (called by profile.tsx)
    const signOut = async () => {
        await AsyncStorage.multiRemove(['user', 'isLoggedIn', 'userId']);
        setUser(null); // Setting state to null is the key!
        setIsLoading(false); // Ensure we don't flash the loading screen
    };

    // Apply the protection logic
    useProtectedRoute(user, isLoading);

    // Memoize the value to prevent unnecessary re-renders
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