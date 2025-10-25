import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
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
  TouchableOpacity,
  View,
} from 'react-native';
import { supabase } from '../../lib/Supabase';

WebBrowser.maybeCompleteAuthSession();

export default function SignUpScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          skipBrowserRedirect: true,
        },
      });

      if (error) throw error;

      if (data?.url) {
        const result = await WebBrowser.openAuthSessionAsync(
          data.url,
          'liikid://'
        );

        if (result.type === 'success') {
          const url = result.url;
          const params = new URLSearchParams(url.split('#')[1] || url.split('?')[1]);
          const accessToken = params.get('access_token');
          const refreshToken = params.get('refresh_token');

          if (accessToken && refreshToken) {
            const { error: sessionError } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });

            if (sessionError) throw sessionError;

            const { data: { user } } = await supabase.auth.getUser();

            if (user) {
              const { data: existingUser } = await supabase
                .from('users')
                .select('*')
                .eq('email', user.email)
                .single();

              if (!existingUser) {
                const { error: insertError } = await supabase
                  .from('users')
                  .insert([
                    {
                      username: user.email?.split('@')[0] || `user_${user.id.slice(0, 8)}`,
                      email: user.email?.toLowerCase(),
                      full_name: user.user_metadata?.full_name || user.user_metadata?.name || '',
                      avatar_url: user.user_metadata?.avatar_url || user.user_metadata?.picture || null,
                      auth_provider: 'google',
                      auth_provider_id: user.id,
                    },
                  ]);

                if (insertError) {
                  console.error('Error creating user profile:', insertError);
                }
              }

              Alert.alert(
                'Success',
                'Signed in successfully!',
                [
                  {
                    text: 'OK',
                    onPress: () => {
                      router.replace('/(tabs)');
                    },
                  },
                ]
              );
            }
          }
        } else if (result.type === 'cancel') {
          Alert.alert('Cancelled', 'Sign in was cancelled');
        }
      }
    } catch (error: any) {
      Alert.alert('Sign In Failed', error.message || 'An error occurred during sign in');
      console.error('Google sign in error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFacebookSignIn = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'facebook',
        options: {
          skipBrowserRedirect: true,
        },
      });

      if (error) throw error;

      if (data?.url) {
        const result = await WebBrowser.openAuthSessionAsync(
          data.url,
          'liikid://'
        );

        if (result.type === 'success') {
          const url = result.url;
          const params = new URLSearchParams(url.split('#')[1] || url.split('?')[1]);
          const accessToken = params.get('access_token');
          const refreshToken = params.get('refresh_token');

          if (accessToken && refreshToken) {
            const { error: sessionError } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });

            if (sessionError) throw sessionError;

            const { data: { user } } = await supabase.auth.getUser();

            if (user) {
              const { data: existingUser } = await supabase
                .from('users')
                .select('*')
                .eq('email', user.email)
                .single();

              if (!existingUser) {
                const { error: insertError } = await supabase
                  .from('users')
                  .insert([
                    {
                      username: user.email?.split('@')[0] || `user_${user.id.slice(0, 8)}`,
                      email: user.email?.toLowerCase(),
                      full_name: user.user_metadata?.full_name || user.user_metadata?.name || '',
                      avatar_url: user.user_metadata?.avatar_url || user.user_metadata?.picture || null,
                      auth_provider: 'facebook',
                      auth_provider_id: user.id,
                    },
                  ]);

                if (insertError) {
                  console.error('Error creating user profile:', insertError);
                }
              }

              Alert.alert(
                'Success',
                'Signed in successfully!',
                [
                  {
                    text: 'OK',
                    onPress: () => {
                      router.replace('/(tabs)/');
                    },
                  },
                ]
              );
            }
          }
        } else if (result.type === 'cancel') {
          Alert.alert('Cancelled', 'Sign in was cancelled');
        }
      }
    } catch (error: any) {
      Alert.alert('Sign In Failed', error.message || 'An error occurred during sign in');
      console.error('Facebook sign in error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
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
          <TouchableOpacity 
            style={styles.backButton} 
            onPress={() => router.back()}
            disabled={loading}
          >
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>

          <View style={styles.headerSection}>
            <View style={styles.logoContainer}>
              <Text style={styles.logoEmoji}>🌿</Text>
            </View>
            <Text style={styles.appName}>Liikid</Text>
            <Text style={styles.welcomeText}>Join our plant community</Text>
          </View>

          <View style={styles.formSection}>
            <Text style={styles.title}>Sign Up</Text>
            <Text style={styles.subtitle}>Choose your preferred sign-up method</Text>

            <View style={styles.socialButtons}>
              <TouchableOpacity 
                style={styles.socialButtonLarge} 
                onPress={handleGoogleSignIn}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#333" />
                ) : (
                  <>
                    <Text style={styles.socialIcon}>🔍</Text>
                    <Text style={styles.socialButtonText}>Continue with Google</Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.socialButtonLarge} 
                onPress={handleFacebookSignIn}
                disabled={loading}
              >
                <Text style={styles.socialIcon}>📘</Text>
                <Text style={styles.socialButtonText}>Continue with Facebook</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.termsContainer}>
              <Text style={styles.termsText}>
                By signing up, you agree to our{' '}
                <Text style={styles.termsLink}>Terms of Service</Text> and{' '}
                <Text style={styles.termsLink}>Privacy Policy</Text>
              </Text>
            </View>

            <View style={styles.footer}>
              <Text style={styles.footerText}>Already have an account? </Text>
              <TouchableOpacity 
                onPress={() => router.push('/(auth)/login')}
                disabled={loading}
              >
                <Text style={styles.footerLink}>Login</Text>
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
  backButton: {
    position: 'absolute',
    top: 10,
    left: 20,
    zIndex: 10,
    padding: 8,
  },
  backIcon: {
    fontSize: 28,
    color: '#000',
  },
  headerSection: {
    alignItems: 'center',
    paddingTop: 80,
    paddingBottom: 40,
  },
  logoContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#C8E853',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  logoEmoji: {
    fontSize: 50,
  },
  appName: {
    fontSize: 36,
    fontWeight: '700',
    color: '#000',
    marginBottom: 8,
  },
  welcomeText: {
    fontSize: 18,
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
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 40,
    textAlign: 'center',
  },
  socialButtons: {
    gap: 16,
    marginBottom: 32,
  },
  socialButtonLarge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    height: 56,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  socialIcon: {
    fontSize: 24,
    marginRight: 12,
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
    marginTop: 20,
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
  termsContainer: {
    marginBottom: 24,
  },
  termsText: {
    fontSize: 13,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
  termsLink: {
    color: '#4A9EFF',
    fontWeight: '600',
  },
});