// app/_layout.tsx

import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { AuthProvider, useAuth } from './context/AuthContext';

function LayoutStack() { 
    const colorScheme = useColorScheme();
    const { isLoading } = useAuth();

    // Show nothing while checking auth 
    if (isLoading) {
        return null;
    }

    return (
        <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
            <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="index" /> {/* Welcome screen */}
                <Stack.Screen name="(auth)" />
                <Stack.Screen name="(tabs)" />
                <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
            </Stack>
            <StatusBar style="auto" />
        </ThemeProvider>
    );
}

export default function RootLayout() {
    return (
        <AuthProvider>
            <LayoutStack />
        </AuthProvider>
    );
}