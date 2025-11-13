import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import {
  getConversationMessages,
  markConversationAsRead,
  sendMessage,
} from '../../lib/messaging';
import { supabase } from '../../lib/Supabase';

interface Message {
  message_id: number;
  message_text: string;
  created_at: string;
  is_read: boolean;
  sender_id: number;
  sender: {
    user_id: number;
    username: string;
    full_name: string | null;
    avatar_url: string | null;
    profile_image_url: string | null;
  };
}

interface ConversationInfo {
  other_user_id: number;
  other_user_name: string;
  other_user_avatar: string | null;
  listing_id: number | null;
  listing_name: string | null;
  listing_price: number | null;
  listing_image: string | null;
}

const ChatScreen = () => {
  const { id } = useLocalSearchParams();
  const conversationId = typeof id === 'string' ? parseInt(id) : null;
  const router = useRouter();
  const { user } = useAuth();

  const [messages, setMessages] = useState<Message[]>([]);
  const [conversationInfo, setConversationInfo] = useState<ConversationInfo | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  // Fetch conversation info (other user + listing details)
  const fetchConversationInfo = useCallback(async () => {
    if (!conversationId || !user?.user_id) return;

    try {
      // Get conversation with listing info
      const { data: convoData, error: convoError } = await supabase
        .from('conversations')
        .select('listing_id')
        .eq('conversation_id', conversationId)
        .single();

      if (convoError) throw convoError;

      // Get participants
      const { data: participants, error: participantsError } = await supabase
        .from('conversation_participants')
        .select('user_id')
        .eq('conversation_id', conversationId);

      if (participantsError) throw participantsError;

      const otherUserId = participants?.find(p => p.user_id !== user.user_id)?.user_id;

      if (!otherUserId) return;

      // Get other user info
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('user_id, username, profile_image_url')
        .eq('user_id', otherUserId)
        .single();

      if (userError) throw userError;

      let listingInfo = null;
      if (convoData?.listing_id) {
        const { data: listing, error: listingError } = await supabase
          .from('products')
          .select('id, name, price, image_url')
          .eq('id', convoData.listing_id)
          .single();

        if (!listingError && listing) {
          listingInfo = {
            listing_id: listing.id,
            listing_name: listing.name,
            listing_price: listing.price,
            listing_image: listing.image_url,
          };
        }
      }

      setConversationInfo({
        other_user_id: userData.user_id,
        other_user_name: userData.username,
        other_user_avatar: userData.profile_image_url,
        ...listingInfo,
      });
    } catch (error) {
      console.error('Error fetching conversation info:', error);
    }
  }, [conversationId, user?.user_id]);

  // Load messages
  const loadMessages = useCallback(async () => {
    if (!conversationId || !user?.user_id) return;

    try {
      setIsLoading(true);
      const data = await getConversationMessages(conversationId);
      
      if (data) {
        setMessages(data as Message[]);
        await markConversationAsRead(conversationId, user.user_id);
      }
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      setIsLoading(false);
    }
  }, [conversationId, user?.user_id]);

  useEffect(() => {
    fetchConversationInfo();
    loadMessages();
  }, [fetchConversationInfo, loadMessages]);

  // Real-time subscription
  useEffect(() => {
    if (!conversationId) return;

    const channel = supabase
      .channel(`conversation-${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        async (payload) => {
          const newMsg = payload.new as any;

          const { data: senderData } = await supabase
            .from('users')
            .select('user_id, username, full_name, avatar_url, profile_image_url')
            .eq('user_id', newMsg.sender_id)
            .single();

          const formattedMessage: Message = {
            message_id: newMsg.message_id,
            message_text: newMsg.message_text,
            created_at: newMsg.created_at,
            is_read: newMsg.is_read,
            sender_id: newMsg.sender_id,
            sender: senderData || {
              user_id: newMsg.sender_id,
              username: 'Unknown',
              full_name: null,
              avatar_url: null,
              profile_image_url: null,
            },
          };

          setMessages((prev) => [...prev, formattedMessage]);

          if (newMsg.sender_id !== user?.user_id) {
            await markConversationAsRead(conversationId, user!.user_id);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, user?.user_id]);

  const handleSend = async () => {
    if (!newMessage.trim() || !conversationId || !user?.user_id || isSending) return;

    const messageText = newMessage.trim();
    setNewMessage('');
    setIsSending(true);

    try {
      await sendMessage(conversationId, user.user_id, messageText);
    } catch (error) {
      console.error('Error sending message:', error);
      setNewMessage(messageText);
    } finally {
      setIsSending(false);
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isOwnMessage = item.sender_id === user?.user_id;

    return (
      <View
        style={[
          styles.messageContainer,
          isOwnMessage ? styles.ownMessageContainer : styles.otherMessageContainer,
        ]}
      >
        <View
          style={[
            styles.messageBubble,
            isOwnMessage ? styles.ownMessage : styles.otherMessage,
          ]}
        >
          <Text style={[styles.messageText, isOwnMessage && styles.ownMessageText]}>
            {item.message_text}
          </Text>
          <Text style={[styles.messageTime, isOwnMessage && styles.ownMessageTime]}>
            {formatTime(item.created_at)}
          </Text>
        </View>
      </View>
    );
  };

  const ListHeader = () => {
    if (!conversationInfo?.listing_id) return null;

    return (
      <View style={styles.listingCard}>
        <Image
          source={{ uri: conversationInfo.listing_image || 'https://via.placeholder.com/60' }}
          style={styles.listingImage}
        />
        <View style={styles.listingInfo}>
          <Text style={styles.listingName} numberOfLines={1}>
            {conversationInfo.listing_name}
          </Text>
          <Text style={styles.listingPrice}>
            {conversationInfo.listing_price?.toLocaleString()} DA
          </Text>
        </View>
        <TouchableOpacity
          style={styles.viewListingButton}
          onPress={() => router.push(`/product_detail?id=${conversationInfo.listing_id}`)}
        >
          <Ionicons name="arrow-forward" size={20} color="#00A78F" />
        </TouchableOpacity>
      </View>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#00A78F" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header with user profile */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.userInfoContainer}
          onPress={() => {
            if (conversationInfo?.other_user_id) {
              router.push(`/someonesProfile?userId=${conversationInfo.other_user_id}`);
            }
          }}
        >
          {conversationInfo?.other_user_avatar ? (
            <Image
              source={{ uri: conversationInfo.other_user_avatar }}
              style={styles.headerAvatar}
            />
          ) : (
            <View style={styles.headerAvatarPlaceholder}>
              <Text style={styles.headerAvatarText}>
                {conversationInfo?.other_user_name?.charAt(0).toUpperCase() || 'U'}
              </Text>
            </View>
          )}
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerUsername}>{conversationInfo?.other_user_name || 'User'}</Text>
            <Text style={styles.headerSubtext}>Active recently</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={styles.headerButton}>
          <Ionicons name="call-outline" size={24} color="#000" />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.message_id.toString()}
          contentContainerStyle={styles.messagesList}
          ListHeaderComponent={ListHeader}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          onLayout={() => flatListRef.current?.scrollToEnd({ animated: false })}
        />

        <View style={styles.inputContainer}>
          <TouchableOpacity style={styles.attachButton}>
            <Ionicons name="add-circle-outline" size={28} color="#00A78F" />
          </TouchableOpacity>

          <TextInput
            style={styles.input}
            value={newMessage}
            onChangeText={setNewMessage}
            placeholder="Type a message..."
            placeholderTextColor="#999"
            multiline
            maxLength={1000}
          />

          <TouchableOpacity
            style={[styles.sendButton, (!newMessage.trim() || isSending) && styles.sendButtonDisabled]}
            onPress={handleSend}
            disabled={!newMessage.trim() || isSending}
          >
            <Ionicons name="send" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  flex: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
    marginTop: 40,
  },
  backButton: {
    padding: 4,
    marginRight: 12,
  },
  userInfoContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  headerAvatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#B695C0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  headerAvatarText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  headerTextContainer: {
    flex: 1,
  },
  headerUsername: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  headerSubtext: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 2,
  },
  headerButton: {
    padding: 8,
    marginLeft: 8,
  },
  listingCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  listingImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: '#E5E5EA',
  },
  listingInfo: {
    flex: 1,
    marginLeft: 12,
  },
  listingName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  listingPrice: {
    fontSize: 16,
    fontWeight: '700',
    color: '#00A78F',
  },
  viewListingButton: {
    padding: 8,
  },
  messagesList: {
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  messageContainer: {
    marginBottom: 12,
    maxWidth: '75%',
  },
  ownMessageContainer: {
    alignSelf: 'flex-end',
  },
  otherMessageContainer: {
    alignSelf: 'flex-start',
  },
  messageBubble: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  ownMessage: {
    backgroundColor: '#00A78F',
    borderBottomRightRadius: 4,
  },
  otherMessage: {
    backgroundColor: '#fff',
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 15,
    color: '#000',
    marginBottom: 4,
  },
  ownMessageText: {
    color: '#fff',
  },
  messageTime: {
    fontSize: 11,
    color: '#8E8E93',
    alignSelf: 'flex-end',
  },
  ownMessageTime: {
    color: 'rgba(255,255,255,0.8)',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
  },
  attachButton: {
    marginRight: 8,
    marginBottom: 8,
  },
  input: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    maxHeight: 100,
    marginRight: 8,
  },
  sendButton: {
    backgroundColor: '#00A78F',
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  sendButtonDisabled: {
    backgroundColor: '#B0B0B0',
  },
});

export default ChatScreen;