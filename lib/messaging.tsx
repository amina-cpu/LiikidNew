// lib/messaging.ts - Complete fix for all messaging issues

import { supabase } from './Supabase';

/**
 * Get or create a conversation between two users
 * FALLBACK VERSION: Works without database function
 */
export const getOrCreateConversation = async (
  userId1: number,
  userId2: number
): Promise<number | null> => {
  try {
    console.log('🔍 === getOrCreateConversation START ===');
    console.log('🔍 User 1:', userId1, 'User 2:', userId2);

    // Method 1: Try using database function first (if it exists)
    try {
      console.log('📞 Attempting to use database function...');
      const { data: funcResult, error: funcError } = await supabase
        .rpc('get_or_create_conversation', {
          p_user1_id: userId1,
          p_user2_id: userId2
        });

      if (!funcError && funcResult) {
        console.log('✅ Database function worked! ID:', funcResult);
        return funcResult;
      }
      
      console.log('⚠️ Database function not available, using fallback method');
    } catch (funcErr) {
      console.log('⚠️ Database function error, using fallback:', funcErr);
    }

    // Method 2: Fallback - Manual query
    console.log('🔄 Using fallback: Manual query method');
    
    // First, search for existing conversation
    console.log('🔍 Searching for existing conversation...');
    const { data: existing, error: searchError } = await supabase
      .from('conversations')
      .select('conversation_id')
      .or(`and(user1_id.eq.${userId1},user2_id.eq.${userId2}),and(user1_id.eq.${userId2},user2_id.eq.${userId1})`)
      .limit(1)
      .maybeSingle();

    console.log('🔍 Search result:', existing);
    console.log('🔍 Search error:', searchError);

    if (searchError && searchError.code !== 'PGRST116') {
      console.error('❌ Search error:', searchError);
      throw searchError;
    }

    // If found, return it
    if (existing?.conversation_id) {
      console.log('✅ Found existing conversation:', existing.conversation_id);
      return existing.conversation_id;
    }

    // If not found, create new one
    console.log('📝 No existing conversation, creating new...');
    const { data: newConvo, error: createError } = await supabase
      .from('conversations')
      .insert({
        user1_id: userId1,
        user2_id: userId2,
      })
      .select('conversation_id')
      .single();

    console.log('📝 Create result:', newConvo);
    console.log('📝 Create error:', createError);

    if (createError) {
      console.error('❌ Create error:', createError);
      throw createError;
    }

    if (!newConvo?.conversation_id) {
      console.error('❌ No conversation_id in response');
      return null;
    }

    console.log('✅ Created new conversation:', newConvo.conversation_id);
    return newConvo.conversation_id;

  } catch (error: any) {
    console.error('❌ === ERROR in getOrCreateConversation ===');
    console.error('❌ Error:', error);
    return null;
  } finally {
    console.log('🏁 === getOrCreateConversation END ===');
  }
};

/**
 * Get all conversations for a user
 */
export const getUserConversations = async (userId: number) => {
  try {
    const { data, error } = await supabase
      .from('conversation_list_view')
      .select('*')
      .eq('user_id', userId)
      .order('last_message_time', { ascending: false, nullsFirst: false });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching conversations:', error);
    return null;
  }
};

/**
 * Get all messages for a conversation
 */
export const getConversationMessages = async (conversationId: number) => {
  try {
    const { data, error } = await supabase
      .from('messages')
      .select(`
        message_id,
        message_text,
        created_at,
        is_read,
        sender_id,
        sender:users!messages_sender_id_fkey (
          user_id,
          username,
          full_name,
          avatar_url,
          profile_image_url
        )
      `)
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching messages:', error);
    return null;
  }
};

/**
 * Send a new message
 */
export const sendMessage = async (
  conversationId: number,
  senderId: number,
  messageText: string
) => {
  try {
    const { data, error } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        sender_id: senderId,
        message_text: messageText,
        is_read: false,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error sending message:', error);
    return null;
  }
};

/**
 * Mark messages as read - FIXED VERSION using database function
 * This marks ALL unread messages in the conversation that were sent by the OTHER user
 */
export const markConversationAsRead = async (
  conversationId: number,
  currentUserId: number
) => {
  try {
    console.log('📖 Marking messages as read via database function');
    console.log('📖 Conversation:', conversationId, 'User:', currentUserId);

    // Use the database function
    const { data, error } = await supabase
      .rpc('mark_messages_as_read', {
        p_conversation_id: conversationId,
        p_user_id: currentUserId
      });

    if (error) {
      console.error('❌ Error calling mark_messages_as_read:', error);
      throw error;
    }

    console.log('✅ Messages marked as read successfully');
    return true;
  } catch (error) {
    console.error('❌ Error in markConversationAsRead:', error);
    return null;
  }
};