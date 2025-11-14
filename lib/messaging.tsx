// lib/messaging.ts - Fixed to prevent duplicate conversations

import { supabase } from './Supabase';

/**
 * Get or create a conversation between two users
 * If productId is provided, update the conversation's listing_id
 */
export const getOrCreateConversation = async (
  userId1: number,
  userId2: number,
  productId?: number | null
): Promise<number | null> => {
  console.log('🔍 Getting/creating conversation:', { userId1, userId2, productId });

  try {
    // Step 1: Get all conversations for user1
    const { data: user1Convos, error: user1Error } = await supabase
      .from('conversation_participants')
      .select('conversation_id')
      .eq('user_id', userId1);

    if (user1Error) throw user1Error;

    if (!user1Convos || user1Convos.length === 0) {
      // User has no conversations, create new one
      console.log('📝 No existing conversations, creating new one');
      return await createNewConversation(userId1, userId2, productId);
    }

    // Step 2: Check if user2 is in any of these conversations
    const conversationIds = user1Convos.map(c => c.conversation_id);
    
    const { data: user2Convos, error: user2Error } = await supabase
      .from('conversation_participants')
      .select('conversation_id')
      .eq('user_id', userId2)
      .in('conversation_id', conversationIds);

    if (user2Error) throw user2Error;

    // Step 3: If conversation exists between these users, use it
    if (user2Convos && user2Convos.length > 0) {
      const existingConvoId = user2Convos[0].conversation_id;
      console.log('✅ Found existing conversation:', existingConvoId);
      
      // Update the listing_id if productId is provided
      if (productId) {
        console.log('📝 Updating conversation with new product:', productId);
        await supabase
          .from('conversations')
          .update({ listing_id: productId })
          .eq('conversation_id', existingConvoId);
      }
      
      return existingConvoId;
    }

    // Step 4: No conversation exists, create new one
    console.log('📝 No conversation found, creating new one');
    return await createNewConversation(userId1, userId2, productId);
    
  } catch (error) {
    console.error('❌ Error in getOrCreateConversation:', error);
    return null;
  }
};

/**
 * Helper function to create a new conversation with participants
 */
async function createNewConversation(
  userId1: number, 
  userId2: number, 
  productId?: number | null
): Promise<number | null> {
  console.log('📝 Creating new conversation with product:', productId);

  try {
    // Create conversation
    const { data: newConvo, error: convoError } = await supabase
      .from('conversations')
      .insert({ listing_id: productId || null })
      .select('conversation_id')
      .single();

    if (convoError) throw convoError;
    if (!newConvo) {
      console.error('❌ Failed to create conversation');
      return null;
    }

    const conversationId = newConvo.conversation_id;
    console.log('✅ Created conversation:', conversationId);

    // Add participants
    const { error: participantsError } = await supabase
      .from('conversation_participants')
      .insert([
        { conversation_id: conversationId, user_id: userId1, is_pinned: false },
        { conversation_id: conversationId, user_id: userId2, is_pinned: false },
      ]);

    if (participantsError) throw participantsError;

    return conversationId;
  } catch (error) {
    console.error('❌ Error creating conversation:', error);
    return null;
  }
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
 * Mark messages as read
 */
export const markConversationAsRead = async (
  conversationId: number,
  currentUserId: number
) => {
  try {
    console.log('📖 Marking messages as read via database function');
    console.log('📖 Conversation:', conversationId, 'User:', currentUserId);

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

/**
 * Update conversation pin status
 */
export const updateConversationPinStatus = async (
  conversationId: number,
  userId: number,
  isPinned: boolean
): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('conversation_participants')
      .update({ is_pinned: isPinned })
      .match({ 
        conversation_id: conversationId, 
        user_id: userId 
      });

    if (error) {
      console.error('❌ Error updating pin status:', error);
      return false;
    }

    console.log(`✅ Conversation ${conversationId} ${isPinned ? 'pinned' : 'unpinned'} for user ${userId}.`);
    return true;
  } catch (error) {
    console.error('❌ Exception updating pin status:', error);
    return false;
  }
};