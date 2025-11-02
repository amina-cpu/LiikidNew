import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ImageBackground,
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

export default function SignUpScreen() {
  const router = useRouter();
  const { updateUser } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      console.log('🚀 Starting Google Sign In...');
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: 'marketplaceapp://',
          skipBrowserRedirect: false,
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

          const { error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (sessionError) throw sessionError;

          console.log('✅ Session set, getting user data...');

          const { data: { user }, error: userError } = await supabase.auth.getUser();
          
          if (userError) throw userError;
          if (!user) throw new Error('No user data received');

          console.log('👤 User:', user.email);

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
            
            if (!newUser) {
              throw new Error('No user data returned after insert');
            }
            
            console.log('✅ User profile created');
            userToStore = newUser;
          } else {
            console.log('✅ Existing user found');
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

          await updateUser(userToStore);
          console.log('✅ User stored and context updated');

          console.log('🚀 Navigating to homepage...');
          setTimeout(() => {
            router.replace('/(tabs)');
          }, 300);
          
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

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      <ImageBackground
        source={require('../../assets/images/view.jpg')}
        style={styles.backgroundImage}
        resizeMode="cover"
      >
        <View style={styles.overlay} />
        
        <View style={styles.content}>
          <View style={styles.topSection} />
          
          <View style={styles.textSection}>
            <Text style={styles.welcomeText}>Welcome to</Text>
            <Text style={styles.brandText}>Liikid</Text>
            <Text style={styles.taglineText}>your Favorite Marketplace</Text>
          </View>
          
          <View style={styles.buttonSection}>
            <TouchableOpacity 
              style={[styles.googleButton, loading && styles.googleButtonDisabled]}
              onPress={handleGoogleSignIn}
              disabled={loading}
            >
              {loading ? (
                <>
                  <ActivityIndicator color="#000" size="small" />
                  <Text style={[styles.googleButtonText, {marginLeft: 12}]}>
                    Signing in...
                  </Text>
                </>
              ) : (
                <>
                  <View style={styles.googleIconContainer}>
                    <Text style={styles.googleIcon}>G</Text>
                  </View>
                  <Text style={styles.googleButtonText}>Sign in with Google</Text>
                </>
              )}
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.continueButton}
              onPress={handleGoogleSignIn}
              disabled={loading}
            >
              <Text style={styles.continueButtonText}>Continue with Email</Text>
            </TouchableOpacity>
            
            <View style={styles.termsSection}>
              <Text style={styles.termsText}>
                You certify that you are 18 years of age or older, you{'\n'}
                agree to the Liikid <Text style={styles.termsLink}>Terms</Text>, and you have read the
              </Text>
            </View>
          </View>
        </View>
      </ImageBackground>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  backgroundImage: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  topSection: {
    flex: 0.3,
  },
  textSection: {
    flex: 0.35,
    justifyContent: 'center',
  },
  welcomeText: {
    fontSize: 32,
    fontWeight: '400',
    color: '#fff',
    marginBottom: 4,
  },
  brandText: {
    fontSize: 42,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 8,
  },
  taglineText: {
    fontSize: 32,
    fontWeight: '400',
    color: '#fff',
    lineHeight: 38,
  },
  buttonSection: {
    flex: 0.35,
    justifyContent: 'flex-end',
    paddingBottom: 40,
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  googleButtonDisabled: {
    opacity: 0.7,
  },
  googleIconContainer: {
    marginRight: 12,
  },
  googleIcon: {
    fontSize: 24,
    fontWeight: '700',
    color: '#4285F4',
  },
  googleButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  continueButton: {
    backgroundColor: '#fff',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  continueButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  termsSection: {
    marginTop: 8,
  },
  termsText: {
    fontSize: 12,
    color: '#fff',
    textAlign: 'center',
    lineHeight: 18,
  },
  termsLink: {
    textDecorationLine: 'underline',
    fontWeight: '600',
  },
});