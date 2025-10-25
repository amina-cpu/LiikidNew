import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { supabase } from '../../lib/Supabase';

export default function CallbackScreen() {
  const router = useRouter();
  const [status, setStatus] = useState('Processing authentication...');

  useEffect(() => {
    handleCallback();
  }, []);

  const handleCallback = async () => {
    try {
      // Get the current session
      const { data: { session }, error } = await supabase.auth.getSession();

      if (error) {
        console.error('Session error:', error);
        setStatus('Authentication failed. Redirecting...');
        setTimeout(() => router.replace('/(auth)/signup'), 2000);
        return;
      }

      if (session) {
        const user = session.user;
        
        // Check if user exists in users table
        const { data: existingUser, error: fetchError } = await supabase
          .from('users')
          .select('*')
          .eq('email', user.email)
          .single();

        // If user doesn't exist, create profile
        if (!existingUser && !fetchError) {
          setStatus('Creating your profile...');
          
          const { error: insertError } = await supabase
            .from('users')
            .insert([
              {
                username: user.email?.split('@')[0] || `user_${user.id.slice(0, 8)}`,
                email: user.email?.toLowerCase(),
                full_name: user.user_metadata?.full_name || user.user_metadata?.name || '',
                avatar_url: user.user_metadata?.avatar_url || user.user_metadata?.picture || null,
                auth_provider: user.app_metadata?.provider || 'google',
                auth_provider_id: user.id,
              },
            ]);

          if (insertError) {
            console.error('Error creating user profile:', insertError);
          }
        }

        setStatus('Success! Redirecting...');
        setTimeout(() => router.replace('/(tabs)/home'), 1000);
      } else {
        setStatus('No session found. Redirecting...');
        setTimeout(() => router.replace('/(auth)/signup'), 2000);
      }
    } catch (error) {
      console.error('Callback error:', error);
      setStatus('An error occurred. Redirecting...');
      setTimeout(() => router.replace('/(auth)/signup'), 2000);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.logoContainer}>
          <Text style={styles.logoEmoji}>🌿</Text>
        </View>
        <ActivityIndicator size="large" color="#C8E853" style={styles.loader} />
        <Text style={styles.statusText}>{status}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  logoContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#C8E853',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  logoEmoji: {
    fontSize: 50,
  },
  loader: {
    marginBottom: 20,
  },
  statusText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
});