import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    SafeAreaView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { supabase } from '../../lib/Supabase';
import { useAuth } from '../context/AuthContext';

WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen() {
  const router = useRouter();
  const { updateUser, user } = useAuth(); // Also get current user state
  const [loading, setLoading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);

  // Check if user is already logged in
  useEffect(() => {
    checkExistingSession();
    
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔄 Auth state changed:', event);
        if (event === 'SIGNED_IN' && session) {
          console.log('✅ User signed in, redirecting...');
          // Fetch user data and update context
          const { data: userData } = await supabase
            .from('users')
            .select('*')
            .eq('email', session.user.email?.toLowerCase())
            .single();
          
          if (userData) {
            await updateUser(userData);
            router.replace('/(tabs)');
          }
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Also check if user context already has a user
  useEffect(() => {
    if (user && !checkingAuth) {
      console.log('✅ User already in context, redirecting...');
      router.replace('/(tabs)');
    }
  }, [user, checkingAuth]);

  const checkExistingSession = async () => {
    try {
      console.log('🔍 Checking existing session...');
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('Session check error:', error);
      }
      
      if (session) {
        console.log('✅ Active session found');
        // Verify user exists in database
        const { data: userData } = await supabase
          .from('users')
          .select('*')
          .eq('email', session.user.email?.toLowerCase())
          .single();
        
        if (userData) {
          await updateUser(userData);
          console.log('✅ User data loaded, navigating...');
          router.replace('/(tabs)');
        } else {
          console.log('⚠️ Session exists but no user data');
        }
      } else {
        console.log('ℹ️ No active session');
      }
    } catch (error) {
      console.error('Error checking session:', error);
    } finally {
      setCheckingAuth(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      console.log('🚀 Starting Google Sign In...');
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: 'marketplaceapp://',
          skipBrowserRedirect: false,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });

      if (error) throw error;

      if (data?.url) {
        console.log('📱 Opening browser...');
        const result = await WebBrowser.openAuthSessionAsync(
          data.url,
          'marketplaceapp://'
        );

        console.log('🔙 Browser result:', result);

        if (result.type === 'success' && result.url) {
          console.log('✅ OAuth successful, processing tokens...');
          
          // Extract tokens from URL fragment
          const url = result.url;
          const fragment = url.split('#')[1];
          
          if (!fragment) {
            throw new Error('No tokens in callback URL');
          }

          const params = new URLSearchParams(fragment);
          const accessToken = params.get('access_token');
          const refreshToken = params.get('refresh_token');

          if (!accessToken || !refreshToken) {
            throw new Error('Missing authentication tokens');
          }

          console.log('🔑 Tokens extracted, setting session...');

          // Set the session with Supabase
          const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (sessionError) throw sessionError;

          console.log('✅ Session set successfully');

          // Wait a bit for session to propagate
          await new Promise(resolve => setTimeout(resolve, 500));

          // Get user data
          const { data: { user }, error: userError } = await supabase.auth.getUser();
          
          if (userError) throw userError;
          if (!user) throw new Error('No user data received');

          console.log('👤 User:', user.email);

          // Check if user exists in database
          const { data: existingUser, error: fetchError } = await supabase
            .from('users')
            .select('*')
            .eq('email', user.email?.toLowerCase())
            .single();

          if (fetchError && fetchError.code !== 'PGRST116') {
            console.error('Error fetching user:', fetchError);
          }

          let userToStore;

          if (!existingUser) {
            // Create new user
            console.log('📝 Creating new user profile...');
            const { data: newUser, error: insertError } = await supabase
              .from('users')
              .insert([{
                username: user.email?.split('@')[0] || `user_${user.id.slice(0, 8)}`,
                email: user.email?.toLowerCase(),
                full_name: user.user_metadata?.full_name || user.user_metadata?.name || '',
                avatar_url: user.user_metadata?.avatar_url || user.user_metadata?.picture || null,
                profile_image_url: user.user_metadata?.avatar_url || user.user_metadata?.picture || null,
                auth_provider: 'google',
                auth_provider_id: user.id,
                password_hash: '',
              }])
              .select()
              .single();

            if (insertError) {
              console.error('❌ Error creating user:', insertError);
              throw new Error('Failed to create user profile');
            }
            
            console.log('✅ User profile created');
            userToStore = newUser;
          } else {
            console.log('✅ Existing user found');
            // Update existing user with Google info if not already linked
            if (!existingUser.auth_provider || existingUser.auth_provider !== 'google') {
              const { data: updatedUser } = await supabase
                .from('users')
                .update({
                  auth_provider: 'google',
                  auth_provider_id: user.id,
                  avatar_url: user.user_metadata?.avatar_url || user.user_metadata?.picture || existingUser.avatar_url,
                  profile_image_url: user.user_metadata?.avatar_url || user.user_metadata?.picture || existingUser.profile_image_url,
                })
                .eq('email', user.email?.toLowerCase())
                .select()
                .single();
              
              userToStore = updatedUser || existingUser;
            } else {
              userToStore = existingUser;
            }
          }

          // Update auth context
          await updateUser(userToStore);
          console.log('✅ User stored and context updated');

          console.log('🚀 Navigating to home...');
          
          // Give context time to update
          await new Promise(resolve => setTimeout(resolve, 300));
          
          router.replace('/(tabs)');
          
        } else if (result.type === 'cancel') {
          Alert.alert('Cancelled', 'Sign in was cancelled');
          setLoading(false);
        } else if (result.type === 'dismiss') {
          console.log('Browser dismissed');
          setLoading(false);
        }
      }
    } catch (error: any) {
      console.error('❌ Error:', error);
      Alert.alert('Sign In Failed', error.message || 'An error occurred');
      setLoading(false);
    }
  };

  if (checkingAuth) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4285F4" />
        <Text style={styles.loadingText}>Checking authentication...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      <View style={styles.content}>
        <View style={styles.centerContent}>
          <View style={styles.logoContainer}>
            <Text style={styles.logoEmoji}>🌿</Text>
          </View>
          
          <Text style={styles.appName}>Liikid</Text>
          <Text style={styles.welcomeText}>Welcome back to our community</Text>
          
          <Text style={styles.title}>Sign In</Text>
          <Text style={styles.subtitle}>
            Sign in with your Google account to continue
          </Text>

          <TouchableOpacity 
            style={[styles.googleButton, loading && styles.googleButtonDisabled]} 
            onPress={handleGoogleSignIn}
            disabled={loading}
          >
            {loading ? (
              <>
                <ActivityIndicator color="#fff" size="small" />
                <Text style={[styles.googleButtonText, {marginLeft: 12}]}>
                  Signing in...
                </Text>
              </>
            ) : (
              <>
                <View style={styles.googleIconContainer}>
                  <Text style={styles.googleIcon}>G</Text>
                </View>
                <Text style={styles.googleButtonText}>Continue with Google</Text>
              </>
            )}
          </TouchableOpacity>

          <View style={styles.termsContainer}>
            <Text style={styles.termsText}>
              By signing in, you agree to our{' '}
              <Text style={styles.termsLink}>Terms of Service</Text> and{' '}
              <Text style={styles.termsLink}>Privacy Policy</Text>
            </Text>
          </View>
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  content: {
    flex: 1,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  logoContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#C8E853',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  logoEmoji: {
    fontSize: 60,
  },
  appName: {
    fontSize: 42,
    fontWeight: '800',
    color: '#000',
    marginBottom: 8,
    letterSpacing: 1,
  },
  welcomeText: {
    fontSize: 18,
    color: '#666',
    marginBottom: 48,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#000',
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 48,
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 20,
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4285F4',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#4285F4',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  googleButtonDisabled: {
    opacity: 0.7,
  },
  googleIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 4,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  googleIcon: {
    fontSize: 20,
    fontWeight: '700',
    color: '#4285F4',
  },
  googleButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  termsContainer: {
    marginTop: 32,
    paddingHorizontal: 40,
  },
  termsText: {
    fontSize: 13,
    color: '#999',
    textAlign: 'center',
    lineHeight: 20,
  },
  termsLink: {
    color: '#4285F4',
    fontWeight: '600',
  },
  footer: {
    paddingVertical: 24,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  footerText: {
    fontSize: 15,
    color: '#666',
  },
  footerLink: {
    fontSize: 15,
    color: '#4285F4',
    fontWeight: '700',
  },
});