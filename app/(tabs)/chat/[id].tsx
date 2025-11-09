// app/chat/[id].tsx - FIXED VERSION
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
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
} from "react-native";
import {
  getConversationMessages,
  markConversationAsRead,
  sendMessage,
} from "../../../lib/messaging";
import { supabase } from "../../../lib/Supabase";
import { useAuth } from "../../context/AuthContext";

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
  isPending?: boolean;
}

interface ConversationInfo {
  other_user_id: number;
  other_user_name: string;
  other_user_full_name: string | null;
  other_user_avatar: string | null;
  other_user_profile_image: string | null;
}

const ChatScreen = () => {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { user } = useAuth();
  const conversationId = parseInt(id as string);

  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [inputText, setInputText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [conversationInfo, setConversationInfo] = useState<ConversationInfo | null>(null);
  const [inputHeight, setInputHeight] = useState(40);
  const flatListRef = useRef<FlatList>(null);

  // Load conversation info
  const loadConversationInfo = useCallback(async () => {
    if (!user?.user_id) return;

    try {
      const { data, error } = await supabase
        .from("conversation_list_view")
        .select("*")
        .eq("conversation_id", conversationId)
        .eq("user_id", user.user_id)
        .single();

      if (error) {
        console.error("Error loading conversation info:", error);
        return;
      }

      setConversationInfo({
        other_user_id: data.other_user_id,
        other_user_name: data.other_user_name,
        other_user_full_name: data.other_user_full_name,
        other_user_avatar: data.other_user_avatar,
        other_user_profile_image: data.other_user_profile_image,
      });
    } catch (error) {
      console.error("Error loading conversation info:", error);
    }
  }, [conversationId, user?.user_id]);

  // Load messages
  const loadMessages = useCallback(async () => {
    try {
      console.log('📥 Loading messages for conversation:', conversationId);
      const data = await getConversationMessages(conversationId);
      if (data) {
        console.log('✅ Loaded', data.length, 'messages');
        setMessages(data as Message[]);
      }
    } catch (error) {
      console.error("Error loading messages:", error);
    } finally {
      setIsLoading(false);
    }
  }, [conversationId]);

  // Initial load
  useEffect(() => {
    loadConversationInfo();
    loadMessages();
  }, [loadConversationInfo, loadMessages]);

  // Mark messages as read when screen is focused
  useFocusEffect(
    useCallback(() => {
      if (user?.user_id) {
        console.log('👁️ Screen focused - marking messages as read');
        // Add a small delay to ensure messages are loaded
        setTimeout(() => {
          markConversationAsRead(conversationId, user.user_id);
        }, 500);
      }
    }, [conversationId, user?.user_id])
  );

  // Subscribe to new messages and updates
  useEffect(() => {
    if (!user?.user_id) return;

    console.log('🔔 Setting up real-time subscriptions');

    const channel = supabase
      .channel(`conversation-${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        async (payload) => {
          console.log("📨 New message INSERT event:", payload.new);
          
          // Fetch the complete message with sender info
          const { data, error } = await supabase
            .from("messages")
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
            .eq("message_id", payload.new.message_id)
            .single();

          if (!error && data) {
            console.log('✅ Fetched complete message:', data);
            
            setMessages((prev) => {
              // Remove any pending messages
              const withoutPending = prev.filter(m => !m.isPending);
              
              // Check if message already exists
              if (withoutPending.some(m => m.message_id === data.message_id)) {
                console.log('⚠️ Message already exists, skipping');
                return withoutPending;
              }
              
              console.log('➕ Adding new message to state');
              return [...withoutPending, data as Message];
            });
            
            // Auto-scroll to bottom
            setTimeout(() => {
              flatListRef.current?.scrollToEnd({ animated: true });
            }, 100);

            // If message is from other user, mark it as read immediately
            if (data.sender_id !== user.user_id) {
              console.log('📖 Message from other user - marking as read');
              setTimeout(() => {
                markConversationAsRead(conversationId, user.user_id);
              }, 500);
            }
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          console.log("📝 Message UPDATE event (read receipt):", payload.new);
          
          setMessages((prev) =>
            prev.map((msg) =>
              msg.message_id === payload.new.message_id
                ? { ...msg, is_read: payload.new.is_read }
                : msg
            )
          );
        }
      )
      .subscribe((status) => {
        console.log('📡 Subscription status:', status);
      });

    return () => {
      console.log('🔌 Unsubscribing from channel');
      channel.unsubscribe();
    };
  }, [conversationId, user?.user_id]);

  const handleSend = async () => {
    if (!inputText.trim() || !user?.user_id || isSending) return;

    setIsSending(true);
    const messageText = inputText.trim();
    setInputText("");
    setInputHeight(40); // Reset height when sending

    // Create optimistic message
    const tempId = Date.now();
    const optimisticMessage: Message = {
      message_id: tempId,
      message_text: messageText,
      created_at: new Date().toISOString(),
      is_read: false,
      sender_id: user.user_id,
      isPending: true,
      sender: {
        user_id: user.user_id,
        username: user.username || '',
        full_name: user.full_name || null,
        avatar_url: user.avatar_url || null,
        profile_image_url: user.profile_image_url || null,
      },
    };

    // Add optimistic message
    setMessages((prev) => [...prev, optimisticMessage]);
    
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);

    try {
      console.log('📤 Sending message...');
      const result = await sendMessage(conversationId, user.user_id, messageText);
      
      if (!result) {
        console.error('❌ Failed to send message');
        setMessages((prev) => prev.filter((m) => m.message_id !== tempId));
        setInputText(messageText);
        Alert.alert('Error', 'Failed to send message. Please try again.');
      } else {
        console.log('✅ Message sent successfully:', result.message_id);
      }
    } catch (error) {
      console.error("❌ Error sending message:", error);
      setMessages((prev) => prev.filter((m) => m.message_id !== tempId));
      setInputText(messageText);
      Alert.alert('Error', 'Failed to send message. Please try again.');
    } finally {
      setIsSending(false);
    }
  };

  const formatMessageTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? "PM" : "AM";
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${minutes.toString().padStart(2, "0")} ${ampm}`;
  };

  const getAvatarUrl = (message: Message) => {
    return (
      message.sender.avatar_url ||
      message.sender.profile_image_url ||
      "https://via.placeholder.com/32"
    );
  };

  const renderMessage = ({ item, index }: { item: Message; index: number }) => {
    const isMyMessage = item.sender_id === user?.user_id;
    const previousMessage = index > 0 ? messages[index - 1] : null;
    const nextMessage = index < messages.length - 1 ? messages[index + 1] : null;
    
    const showAvatar =
      !isMyMessage &&
      (!previousMessage || previousMessage.sender_id !== item.sender_id);

    // Show read status only for the last message sent by current user
    const isLastMyMessage = isMyMessage && 
      (!nextMessage || nextMessage.sender_id !== user?.user_id);

    return (
      <View
        style={[
          styles.messageContainer,
          isMyMessage ? styles.myMessageContainer : styles.theirMessageContainer,
        ]}
      >
        {!isMyMessage && (
          <View style={styles.avatarContainer}>
            {showAvatar ? (
              <Image source={{ uri: getAvatarUrl(item) }} style={styles.messageAvatar} />
            ) : (
              <View style={styles.avatarSpacer} />
            )}
          </View>
        )}
        <View style={styles.messageBubbleContainer}>
          <View
            style={[
              styles.messageBubble,
              isMyMessage ? styles.myMessageBubble : styles.theirMessageBubble,
              item.isPending && styles.pendingMessageBubble,
            ]}
          >
            <Text
              style={[
                styles.messageText,
                isMyMessage ? styles.myMessageText : styles.theirMessageText,
              ]}
            >
              {item.message_text}
            </Text>
            <View style={styles.messageFooter}>
              <Text
                style={[
                  styles.messageTime,
                  isMyMessage ? styles.myMessageTime : styles.theirMessageTime,
                ]}
              >
                {formatMessageTime(item.created_at)}
              </Text>
              {isMyMessage && isLastMyMessage && !item.isPending && (
                <View style={styles.readStatusContainer}>
                  <Ionicons
                    name={item.is_read ? "checkmark-done" : "checkmark"}
                    size={14}
                    color={item.is_read ? "#34C759" : "rgba(255, 255, 255, 0.7)"}
                  />
                  {item.is_read && (
                    <Text style={styles.readText}>Read</Text>
                  )}
                </View>
              )}
              {item.isPending && (
                <ActivityIndicator 
                  size="small" 
                  color="rgba(255, 255, 255, 0.7)" 
                  style={styles.sendingIndicator} 
                />
              )}
            </View>
          </View>
        </View>
      </View>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="chatbubble-outline" size={64} color="#ccc" />
      <Text style={styles.emptyStateText}>No messages yet</Text>
      <Text style={styles.emptyStateSubtext}>Start the conversation!</Text>
    </View>
  );

  if (!conversationInfo && !isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Conversation not found</Text>
          <TouchableOpacity 
            onPress={() => router.back()} 
            style={styles.backButtonError}
          >
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="chevron-back" size={28} color="#007AFF" />
          </TouchableOpacity>
          {conversationInfo && (
            <>
              <Image
                source={{
                  uri:
                    conversationInfo.other_user_avatar ||
                    conversationInfo.other_user_profile_image ||
                    "https://via.placeholder.com/40",
                }}
                style={styles.headerAvatar}
              />
              <View style={styles.headerInfo}>
                <Text style={styles.headerName}>
                  {conversationInfo.other_user_full_name ||
                    conversationInfo.other_user_name}
                </Text>
                <Text style={styles.headerStatus}>Active now</Text>
              </View>
            </>
          )}
          <TouchableOpacity style={styles.moreButton}>
            <Ionicons name="ellipsis-vertical" size={24} color="#000" />
          </TouchableOpacity>
        </View>

        {/* Messages */}
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#007AFF" />
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={renderMessage}
            keyExtractor={(item) => item.message_id.toString()}
            contentContainerStyle={styles.messagesList}
            ListEmptyComponent={renderEmptyState}
            onContentSizeChange={() =>
              flatListRef.current?.scrollToEnd({ animated: false })
            }
            keyboardDismissMode="interactive"
          />
        )}

        {/* Input - FIXED: Better visibility when typing */}
        <View style={styles.inputContainer}>
          <View style={styles.inputWrapper}>
            <TouchableOpacity style={styles.attachButton}>
              <Ionicons name="add-circle-outline" size={28} color="#007AFF" />
            </TouchableOpacity>
            <TextInput
              style={[styles.input, { height: Math.max(40, Math.min(inputHeight, 120)) }]}
              placeholder="Type a message..."
              placeholderTextColor="#999"
              value={inputText}
              onChangeText={setInputText}
              multiline
              maxLength={1000}
              textAlignVertical="top"
              onContentSizeChange={(e) => {
                setInputHeight(e.nativeEvent.contentSize.height);
              }}
            />
            <TouchableOpacity
              style={[
                styles.sendButton,
                (!inputText.trim() || isSending) && styles.sendButtonDisabled,
              ]}
              onPress={handleSend}
              disabled={!inputText.trim() || isSending}
            >
              <Ionicons name="send" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: "#F8F8F8",
    marginBottom:90
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E5EA",
    backgroundColor: "#fff",
    marginTop: 40,
  },
  backButton: { marginRight: 10 },
  headerAvatar: { width: 40, height: 40, borderRadius: 20 },
  headerInfo: { flex: 1, marginLeft: 12 },
  headerName: { fontSize: 16, fontWeight: "600" },
  headerStatus: { fontSize: 12, color: "#666", marginTop: 2 },
  moreButton: { padding: 4 },

  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  errorText: { fontSize: 18, fontWeight: "600", color: "#333", marginBottom: 20 },
  backButtonError: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: "#007AFF",
    borderRadius: 8,
  },
  backButtonText: { color: "#fff", fontSize: 16, fontWeight: "600" },

  messagesList: { 
    paddingVertical: 10, 
    paddingHorizontal: 15,
    flexGrow: 1,
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 100,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginTop: 16,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: "#666",
    marginTop: 8,
  },

  messageContainer: { 
    flexDirection: "row", 
    marginBottom: 12,
  },
  myMessageContainer: { justifyContent: "flex-end" },
  theirMessageContainer: { justifyContent: "flex-start" },

  avatarContainer: { marginRight: 8 },
  messageAvatar: { width: 32, height: 32, borderRadius: 16 },
  avatarSpacer: { width: 32 },

  messageBubbleContainer: { maxWidth: "75%" },
  messageBubble: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  myMessageBubble: { backgroundColor: "#007AFF" },
  theirMessageBubble: { backgroundColor: "#fff" },
  pendingMessageBubble: { opacity: 0.7 },

  messageText: { fontSize: 16, lineHeight: 22 },
  myMessageText: { color: "#fff" },
  theirMessageText: { color: "#000" },

  messageFooter: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
    gap: 4,
  },
  messageTime: { fontSize: 11 },
  myMessageTime: { color: "rgba(255, 255, 255, 0.8)" },
  theirMessageTime: { color: "#999" },

  readStatusContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 4,
  },
  readText: {
    fontSize: 11,
    color: "#34C759",
    marginLeft: 2,
    fontWeight: "500",
  },
  sendingIndicator: {
    marginLeft: 4,
  },

  // FIXED: Better input container styling with dynamic height
  inputContainer: {
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#E5E5EA",
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: Platform.OS === "ios" ? 20 : 8,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
  },
  attachButton: { 
    paddingBottom: 8,
  },
  inputTextContainer: {
    flex: 1,
    maxHeight: 120,
  },
  input: {
    flex: 1,
    backgroundColor: "#F2F2F7",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
    fontSize: 16,
    minHeight: 40,
    maxHeight: 120,
    color: "#000",
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#007AFF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
  },
  sendButtonDisabled: {
    backgroundColor: "#C7C7CC",
  },
});

export default ChatScreen;