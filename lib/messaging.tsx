// lib/messaging.ts - Complete file with fixed markConversationAsRead

import { supabase } from './Supabase';

// ✅ FIXED: This function now properly updates last_read_at
export const markConversationAsRead = async (
  conversationId: number,
  userId: number
): Promise<boolean> => {
  try {
    console.log(`📖 Marking conversation ${conversationId} as read for user ${userId}`);
    
    // ✅ CRITICAL: Update last_read_at to current timestamp
    // The conversation_list_view uses this to calculate unread_count
    const now = new Date().toISOString();
    
    const { error: participantError } = await supabase
      .from('conversation_participants')
      .update({ 
        last_read_at: now  // ✅ This is what makes unread_count become 0
      })
      .eq('conversation_id', conversationId)
      .eq('user_id', userId);

    if (participantError) {
      console.error('❌ Error updating last_read_at:', participantError);
      return false;
    }

    console.log(`✅ Updated last_read_at to: ${now}`);

    // ✅ Also mark all messages as read (for the "Seen" indicator in chat)
    const { error: messagesError } = await supabase
      .from('messages')
      .update({ is_read: true })
      .eq('conversation_id', conversationId)
      .neq('sender_id', userId);

    if (messagesError) {
      console.error('⚠️ Error marking messages as read:', messagesError);
      // Don't return false here - the main update succeeded
    }

    console.log('✅ Successfully marked conversation as read');
    return true;
  } catch (error) {
    console.error('❌ Exception in markConversationAsRead:', error);
    return false;
  }
};

// Get conversation messages - Using correct foreign key
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
        sender:users!messages_sender_id_fkey(
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
    console.error('Error fetching conversation messages:', error);
    return null;
  }
};

// Send a message
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

    // Update conversation's last_message_at
    await supabase
      .from('conversations')
      .update({ last_message_at: new Date().toISOString() })
      .eq('conversation_id', conversationId);

    return data;
  } catch (error) {
    console.error('Error sending message:', error);
    throw error;
  }
};

// Update conversation pin status
export const updateConversationPinStatus = async (
  conversationId: number,
  userId: number,
  isPinned: boolean
): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('conversation_participants')
      .update({ is_pinned: isPinned })
      .eq('conversation_id', conversationId)
      .eq('user_id', userId);

    if (error) {
      console.error('Error updating pin status:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Exception updating pin status:', error);
    return false;
  }
};