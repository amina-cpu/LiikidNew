import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
import {
  getConversationMessages,
  markConversationAsRead,
  sendMessage,
  updateConversationPinStatus,
} from '../../lib/messaging';
import { supabase } from '../../lib/Supabase';
import { useAuth } from '../context/AuthContext';
import i18n from '../../lib/i18n';

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
  is_pinned: boolean;
}

const ChatScreen = () => {
  const { id } = useLocalSearchParams();
  const conversationId = typeof id === 'string' ? parseInt(id) : null;
  const router = useRouter();
  const { user } = useAuth();

  const [messages, setMessages] = useState<Message[]>([]);
  const [conversationInfo, setConversationInfo] = useState<ConversationInfo | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [inputHeight, setInputHeight] = useState(40);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  const fetchConversationInfo = useCallback(async () => {
    if (!conversationId || !user?.user_id) return;

    try {
      const { data: convoData, error: convoError } = await supabase
        .from('conversations')
        .select('listing_id')
        .eq('conversation_id', conversationId)
        .single();

      if (convoError) throw convoError;

      const { data: participants, error: participantsError } = await supabase
        .from('conversation_participants')
        .select('user_id, is_pinned')
        .eq('conversation_id', conversationId);

      if (participantsError) throw participantsError;

      const otherUserId = participants?.find((p) => p.user_id !== user.user_id)?.user_id;
      const currentUserParticipant = participants?.find((p) => p.user_id === user.user_id);
      const isPinned = currentUserParticipant?.is_pinned || false;

      if (!otherUserId) return;

      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('user_id, username, profile_image_url')
        .eq('user_id', otherUserId)
        .single();

      if (userError) throw userError;

      let listingInfo = null;
      if (convoData?.listing_id) {
        const { data: listing } = await supabase
          .from('products')
          .select('id, name, price, image_url')
          .eq('id', convoData.listing_id)
          .single();

        if (listing) {
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
        is_pinned: isPinned,
        listing_id: listingInfo?.listing_id || null,
        listing_name: listingInfo?.listing_name || null,
        listing_price: listingInfo?.listing_price || null,
        listing_image: listingInfo?.listing_image || null,
      });
    } catch (error) {
      console.error('Error fetching conversation info:', error);
    }
  }, [conversationId, user?.user_id]);

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

          if (newMsg.sender_id === user?.user_id) {
            return;
          }

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
          
          if (user?.user_id) {
            await markConversationAsRead(conversationId, user.user_id);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const updatedMsg = payload.new as any;
          
          setMessages((prev) =>
            prev.map((msg) =>
              msg.message_id === updatedMsg.message_id
                ? { ...msg, is_read: updatedMsg.is_read }
                : msg
            )
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, user?.user_id]);

  useEffect(() => {
    const markAsReadOnFocus = async () => {
      if (conversationId && user?.user_id) {
        await markConversationAsRead(conversationId, user.user_id);
      }
    };

    markAsReadOnFocus();
  }, [conversationId, user?.user_id]);

  const handleTogglePin = async () => {
    if (!conversationId || !user?.user_id || !conversationInfo) return;

    const newPinStatus = !conversationInfo.is_pinned;
    
    setConversationInfo(prev => prev ? { ...prev, is_pinned: newPinStatus } : null);

    const success = await updateConversationPinStatus(
      conversationId,
      user.user_id,
      newPinStatus
    );

    if (!success) {
      setConversationInfo(prev => prev ? { ...prev, is_pinned: !newPinStatus } : null);
      const action = newPinStatus ? i18n.t('chat.pin') : i18n.t('chat.unpin');
      Alert.alert(i18n.t('chat.error'), i18n.t('chat.failedToPin').replace('{{action}}', action.toLowerCase()));
    }
  };

  const handleSend = async () => {
    if (!newMessage.trim() || !conversationId || !user?.user_id || isSending) return;

    const messageText = newMessage.trim();
    setNewMessage('');
    setInputHeight(40);
    setIsSending(true);

    const tempId = Date.now();
    const optimisticMessage: Message = {
      message_id: tempId,
      message_text: messageText,
      created_at: new Date().toISOString(),
      is_read: false,
      sender_id: user.user_id,
      sender: {
        user_id: user.user_id,
        username: user.username || 'You',
        full_name: user.full_name || null,
        avatar_url: user.avatar_url || null,
        profile_image_url: user.profile_image_url || null,
      },
    };

    setMessages((prev) => [...prev, optimisticMessage]);

    try {
      const sentMessage = await sendMessage(conversationId, user.user_id, messageText);
      
      if (sentMessage) {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.message_id === tempId
              ? {
                  ...msg,
                  message_id: sentMessage.message_id,
                  created_at: sentMessage.created_at,
                }
              : msg
          )
        );
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setMessages((prev) => prev.filter((msg) => msg.message_id !== tempId));
      setNewMessage(messageText);
    } finally {
      setIsSending(false);
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    const displayMinutes = minutes < 10 ? `0${minutes}` : minutes;
    
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = months[date.getMonth()];
    const day = date.getDate();
    
    return `${displayHours}:${displayMinutes} ${ampm} ${month} ${day}`;
  };

  const formatPrice = (price: number): string => {
    if (price >= 10000) {
      const millions = price / 10000;
      let formattedMillions;

      if (millions % 1 === 0) {
        formattedMillions = millions.toString();
      } else if (millions >= 10) {
        formattedMillions = Math.round(millions).toString();
      } else {
        formattedMillions = millions.toFixed(1);
      }
      
      return `${formattedMillions} M `;
    } else if (price >= 1000) {
      const k = price / 1000;
      const formattedK = k % 1 === 0 ? `${k}` : `${k.toFixed(1)}`;
      return `${formattedK}K `;
    }
    return `${price.toLocaleString()} `;
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isOwnMessage = item.sender_id === user?.user_id;
    const showSeen = isOwnMessage && item.is_read;

    return (
      <View style={styles.messageWrapper}>
        <Text style={styles.messageTimestamp}>{formatTime(item.created_at)}</Text>
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
          </View>
        </View>
        {showSeen ? (
          <View style={styles.seenContainer}>
            <Text style={styles.seenText}>{i18n.t('chat.seen')}</Text>
            <Ionicons name="checkmark-done" size={14} color="#00A78F" />
          </View>
        ) : null}
      </View>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#00A78F" />
        <Text style={styles.loadingText}>{i18n.t('chat.loadingMessages')}</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <View style={styles.stickyHeader}>
          <View style={styles.topBar}>
            <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
              <Ionicons name="arrow-back" size={24} color="#00A78F" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>{i18n.t('chat.message')}</Text>
            <View style={styles.headerRight}>
              <TouchableOpacity style={styles.iconButton} onPress={handleTogglePin}>
                <Ionicons 
                  name={conversationInfo?.is_pinned ? "bookmark" : "bookmark-outline"} 
                  size={20} 
                  color="#00A78F" 
                />
              </TouchableOpacity>
              <TouchableOpacity style={styles.iconButton}>
                <Ionicons name="ellipsis-horizontal" size={20} color="#00A78F" />
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            style={styles.userInfoCard}
            onPress={() => {
              if (conversationInfo?.other_user_id) {
                router.push(`/someonesProfile?userId=${conversationInfo.other_user_id}`);
              }
            }}
            activeOpacity={0.8}
          >
            <View style={styles.userInfoLeft}>
              {conversationInfo?.other_user_avatar ? (
                <Image
                  source={{ uri: conversationInfo.other_user_avatar }}
                  style={styles.userAvatar}
                />
              ) : (
                <View style={styles.userAvatarPlaceholder}>
                  <Text style={styles.userAvatarText}>
                    {conversationInfo?.other_user_name ? conversationInfo.other_user_name.charAt(0).toUpperCase() : 'U'}
                  </Text>
                </View>
              )}
              <View style={styles.userDetails}>
                <Text style={styles.userName}>
                  {conversationInfo?.other_user_name || 'User'}
                </Text>
                <Text style={styles.userStatus}>{i18n.t('chat.activeLastDay')}</Text>
                <Text style={styles.userLocation}>Columbia, MD</Text>
              </View>
            </View>

            {conversationInfo?.listing_image ? (
              <View style={styles.productThumbnail}>
                <Image
                  source={{ uri: conversationInfo.listing_image }}
                  style={styles.productImage}
                />
                <View style={styles.productPriceTag}>
                  <Text style={styles.productPrice}>
                    {formatPrice(conversationInfo.listing_price || 0)}
                  </Text>
                </View>
              </View>
            ) : null}
          </TouchableOpacity>
        </View>

        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.message_id.toString()}
          contentContainerStyle={styles.messagesList}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          onLayout={() => flatListRef.current?.scrollToEnd({ animated: false })}
        />

        <View style={styles.inputContainer}>
          <TouchableOpacity style={styles.attachButton}>
            <Ionicons name="location" size={24} color="#00A78F" />
          </TouchableOpacity>

          <TextInput
            style={[styles.input, { height: Math.max(40, Math.min(inputHeight, 120)) }]}
            value={newMessage}
            onChangeText={setNewMessage}
            placeholder={i18n.t('chat.messagePlaceholder')}
            placeholderTextColor="#999"
            multiline
            onContentSizeChange={(e) => {
              const height = e.nativeEvent.contentSize.height;
              setInputHeight(height);
            }}
            maxLength={1000}
          />

          <TouchableOpacity
            style={[styles.sendButton, (!newMessage.trim() || isSending) && styles.sendButtonDisabled]}
            onPress={handleSend}
            disabled={!newMessage.trim() || isSending}
          >
            <Ionicons name="arrow-up" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  flex: { flex: 1 },
  loadingContainer: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
  },
  stickyHeader: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
    paddingTop: 45,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: { padding: 4 },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 16,
  },
  headerRight: { flexDirection: 'row', gap: 8 },
  iconButton: { 
    padding: 6,
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userInfoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#F8F9FA',
  },
  userInfoLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  userAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  userAvatarPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#00A78F',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  userAvatarText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
  },
  userDetails: { flex: 1 },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 2,
  },
  userStatus: {
    fontSize: 12,
    color: '#666',
    marginBottom: 1,
  },
  userLocation: {
    fontSize: 12,
    color: '#666',
  },
  productThumbnail: { position: 'relative' },
  productImage: {
    width: 65,
    height: 65,
    borderRadius: 8,
    backgroundColor: '#E5E5EA',
  },
  productPriceTag: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingVertical: 2,
    paddingHorizontal: 4,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
  },
  productPrice: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
  },
  messagesList: {
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  messageWrapper: { marginBottom: 16 },
  messageTimestamp: {
    fontSize: 11,
    color: '#999',
    textAlign: 'center',
    marginBottom: 8,
  },
  messageContainer: { maxWidth: '75%' },
  ownMessageContainer: { alignSelf: 'flex-end' },
  otherMessageContainer: { alignSelf: 'flex-start' },
  messageBubble: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
  },
  ownMessage: {
    backgroundColor: '#00A78F',
    borderBottomRightRadius: 4,
  },
  otherMessage: {
    backgroundColor: '#E5E5EA',
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 15,
    color: '#000',
    lineHeight: 20,
  },
  ownMessageText: { color: '#fff' },
  seenContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
    marginTop: 4,
  },
  seenText: {
    fontSize: 11,
    color: '#00A78F',
    marginRight: 4,
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
    marginBottom: 6,
  },
  input: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
    fontSize: 15,
    marginRight: 8,
    minHeight: 40,
  },
  sendButton: {
    backgroundColor: '#00A78F',
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  sendButtonDisabled: {
    backgroundColor: '#B0B0B0',
  },
});

export default ChatScreen;