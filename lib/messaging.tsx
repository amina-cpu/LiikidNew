// lib/messaging.ts - Complete fix for all messaging issues

import { supabase } from './Supabase';

/**
 * Get or create a conversation between two users
 * EMERGENCY FIX: Simple version with no fancy error handling
 */
export const getOrCreateConversation = async (
  userId1: number,
  userId2: number
): Promise<number | null> => {
  // Step 1: Get user1's conversations
  const { data: user1Convos } = await supabase
    .from('conversation_participants')
    .select('conversation_id')
    .eq('user_id', userId1);

  if (!user1Convos || user1Convos.length === 0) {
    // User has no conversations, create new one
    return await createNewConversation(userId1, userId2);
  }

  // Step 2: Check if user2 is in any of them
  const conversationIds = user1Convos.map(c => c.conversation_id);
  
  const { data: user2Convos } = await supabase
    .from('conversation_participants')
    .select('conversation_id')
    .eq('user_id', userId2)
    .in('conversation_id', conversationIds);

  // Step 3: If found, return it
  if (user2Convos && user2Convos.length > 0) {
    return user2Convos[0].conversation_id;
  }

  // Step 4: Create new conversation
  return await createNewConversation(userId1, userId2);
};

/**
 * Helper function to create a new conversation with participants
 * EMERGENCY FIX: Minimal error handling
 */
async function createNewConversation(userId1: number, userId2: number): Promise<number | null> {
  // Create conversation
  const { data: newConvo } = await supabase
    .from('conversations')
    .insert({ listing_id: null })
    .select('conversation_id')
    .single();

  if (!newConvo) return null;

  const conversationId = newConvo.conversation_id;

  // Add participants
  await supabase
    .from('conversation_participants')
    .insert([
      { conversation_id: conversationId, user_id: userId1, is_pinned: false },
      { conversation_id: conversationId, user_id: userId2, is_pinned: false },
    ]);

  return conversationId;
}

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


export const updateConversationPinStatus = async (
  conversationId: number,
  userId: number, // The user whose status is being updated
  isPinned: boolean
): Promise<boolean> => {
  try {
    // 1. Update the is_pinned status in the conversation_participants table
    const { error } = await supabase
      .from('conversation_participants')
      .update({ is_pinned: isPinned })
      .match({ 
        conversation_id: conversationId, 
        user_id: userId 
      });

    if (error) {
      console.error('❌ Error updating pin status in conversation_participants:', error);
      return false;
    }

    console.log(`✅ Conversation ${conversationId} ${isPinned ? 'pinned' : 'unpinned'} for user ${userId}.`);
    return true;
  } catch (error) {
    console.error('❌ Exception updating pin status:', error);
    return false;
  }
};
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