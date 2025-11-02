// app/index.tsx

import { useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useAuth } from './context/AuthContext';

export default function WelcomeScreen() {
  const router = useRouter();
  const { user, isLoading } = useAuth();

  useEffect(() => {
    // Only redirect once loading is complete
    if (!isLoading) {
      if (user) {
        // User is logged in, go to home
        console.log('✅ User already logged in, redirecting to home');
        router.replace('/(tabs)');
      } else {
        // User not logged in, go to signup
        console.log('ℹ️ No user, redirecting to signup');
        router.replace('/(auth)/signup');
      }
    }
  }, [user, isLoading, router]);

  // Show loading while checking
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#4285F4" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
});