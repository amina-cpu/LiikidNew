import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { supabase } from '../../lib/Supabase';

export default function AuthRedirect() {
  const router = useRouter();

  useEffect(() => {
    const restoreSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        console.log('✅ Signed in, navigating to tabs');
        router.replace('/(tabs)');
      } else {
        console.log('⚠️ No session, back to login');
        router.replace('/(auth)');
      }
    };
    restoreSession();
  }, []);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator size="large" />
    </View>
  );
}
