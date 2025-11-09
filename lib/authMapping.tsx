// lib/authMapping.ts
import { supabase } from './Supabase';

/**
 * Ensure the auth mapping exists for the current user
 * Call this function after login or when the app starts
 */
export const ensureAuthMapping = async (userId: number): Promise<boolean> => {
  try {
    // Get the current auth user
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !authUser) {
      console.error('Error getting auth user:', authError);
      return false;
    }

    console.log('🔐 Ensuring auth mapping for user:', userId, 'auth_uid:', authUser.id);

    // Check if mapping already exists
    const { data: existingMapping, error: checkError } = await supabase
      .from('user_auth_mapping')
      .select('*')
      .eq('auth_uid', authUser.id)
      .maybeSingle();

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('Error checking auth mapping:', checkError);
      return false;
    }

    if (existingMapping) {
      console.log('✅ Auth mapping already exists');
      return true;
    }

    // Create the mapping
    const { error: insertError } = await supabase
      .from('user_auth_mapping')
      .insert({
        auth_uid: authUser.id,
        user_id: userId,
      });

    if (insertError) {
      console.error('❌ Error creating auth mapping:', insertError);
      return false;
    }

    console.log('✅ Auth mapping created successfully');
    return true;
  } catch (error) {
    console.error('❌ Error in ensureAuthMapping:', error);
    return false;
  }
};

/**
 * Get the integer user_id from the current auth session
 */
export const getUserIdFromAuth = async (): Promise<number | null> => {
  try {
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !authUser) {
      console.error('Error getting auth user:', authError);
      return null;
    }

    const { data, error } = await supabase
      .from('user_auth_mapping')
      .select('user_id')
      .eq('auth_uid', authUser.id)
      .single();

    if (error) {
      console.error('Error getting user_id from mapping:', error);
      return null;
    }

    return data?.user_id || null;
  } catch (error) {
    console.error('Error in getUserIdFromAuth:', error);
    return null;
  }
};