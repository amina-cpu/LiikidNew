// app/_layout.tsx

import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

// Import AuthProvider and useAuth
import { AuthProvider, useAuth } from './context/AuthContext'; 
import { useColorScheme } from '@/hooks/use-color-scheme';


export const unstable_settings = {
    anchor: '(tabs)',
};

// Renaming the old RootLayout to LayoutStack
function LayoutStack() { 
    const colorScheme = useColorScheme();
    const { isLoading, user } = useAuth(); // <-- Use state from context

    // Show nothing while checking auth 
    if (isLoading) {
        return null;
    }

    // Note: The navigation logic is now handled inside AuthContext's useProtectedRoute
    // This component just renders the Stack.
    return (
        <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
            <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="(auth)" />
                <Stack.Screen name="(tabs)" />
                <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
                <Stack.Screen name="category" />
            </Stack>
            <StatusBar style="auto" />
        </ThemeProvider>
    );
}

// The new RootLayout component that exports the default and includes the provider
export default function RootLayout() {
    return (
        <AuthProvider>
            <LayoutStack />
        </AuthProvider>
    );
}