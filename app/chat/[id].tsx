// app/chat/[id].tsx - COMPLETE FIX with proper read marking
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
  sendMessage,
} from "../../lib/messaging";
import { supabase } from "../../lib/Supabase";
import { useAuth } from "../context/AuthContext";

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
  other_user_full_name: string | null;
  other_user_avatar: string | null;
  other_user_profile_image: string | null;
}

// ✅ FIXED: Function to mark messages as read using last_read_at
const markMessagesAsRead = async (conversationId: number, userId: number) => {
  try {
    console.log('📖 MARKING MESSAGES AS READ');
    console.log('   Conversation ID:', conversationId);
    console.log('   Current User ID:', userId);
    
    // Call the database function to update last_read_at
    const { error } = await supabase.rpc('update_last_read_at', {
      p_conversation_id: conversationId,
      p_user_id: userId
    });

    if (error) {
      console.error('❌ Error updating last_read_at:', error);
      return false;
    }

    console.log('✅ Messages marked as read (last_read_at updated)');
    return true;
  } catch (error) {
    console.error('❌ Exception:', error);
    return false;
  }
};

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
        
        // ✅ Mark messages as read after loading
        if (user?.user_id) {
          setTimeout(() => {
            markMessagesAsRead(conversationId, user.user_id);
          }, 500);
        }
      }
    } catch (error) {
      console.error("Error loading messages:", error);
    } finally {
      setIsLoading(false);
    }
  }, [conversationId, user?.user_id]);

  useEffect(() => {
    loadConversationInfo();
    loadMessages();
  }, [loadConversationInfo, loadMessages]);

  // ✅ Mark messages as read when screen is focused
  useFocusEffect(
    useCallback(() => {
      if (user?.user_id) {
        setTimeout(() => {
          markMessagesAsRead(conversationId, user.user_id);
        }, 500);
      }
    }, [conversationId, user?.user_id])
  );

  // Subscribe to new messages
  useEffect(() => {
    if (!user?.user_id) return;

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
          console.log("📨 New message event:", payload.new);
          
          // Fetch complete message with sender info
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
            console.log('✅ Received message from:', data.sender_id);
            
            setMessages((prev) => {
              // Remove any temporary messages
              const withoutTemp = prev.filter(m => m.message_id > 1000000000000);
              
              // Check if real message already exists
              if (withoutTemp.some(m => m.message_id === data.message_id)) {
                console.log('Message already exists, skipping');
                return prev;
              }
              
              console.log('Adding new message to list');
              return [...withoutTemp, data as Message];
            });
            
            setTimeout(() => {
              flatListRef.current?.scrollToEnd({ animated: true });
            }, 100);

            // ✅ Mark as read if from other user
            if (data.sender_id !== user.user_id) {
              setTimeout(() => {
                markMessagesAsRead(conversationId, user.user_id);
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
          console.log("📝 Message updated (read receipt)");
          setMessages((prev) =>
            prev.map((msg) =>
              msg.message_id === payload.new.message_id
                ? { ...msg, is_read: payload.new.is_read }
                : msg
            )
          );
        }
      )
      .subscribe();

    return () => channel.unsubscribe();
  }, [conversationId, user?.user_id]);

  const handleSend = async () => {
    if (!inputText.trim() || !user?.user_id || isSending) return;

    setIsSending(true);
    const messageText = inputText.trim();
    const tempId = Date.now();
    
    const optimisticMessage: Message = {
      message_id: tempId,
      message_text: messageText,
      created_at: new Date().toISOString(),
      is_read: false,
      sender_id: user.user_id,
      sender: {
        user_id: user.user_id,
        username: user.username || '',
        full_name: user.full_name || null,
        avatar_url: user.avatar_url || null,
        profile_image_url: user.profile_image_url || null,
      },
    };

    setMessages(prev => [...prev, optimisticMessage]);
    setInputText("");
    setInputHeight(40);

    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);

    try {
      const result = await sendMessage(conversationId, user.user_id, messageText);
      
      if (!result) {
        setMessages(prev => prev.filter(m => m.message_id !== tempId));
        setInputText(messageText);
        Alert.alert('Error', 'Failed to send message');
      } else {
        setMessages(prev => 
          prev.map(m => m.message_id === tempId ? { ...result, sender: optimisticMessage.sender } as Message : m)
        );
      }
    } catch (error) {
      console.error("Error sending message:", error);
      setMessages(prev => prev.filter(m => m.message_id !== tempId));
      setInputText(messageText);
      Alert.alert('Error', 'Failed to send message');
    } finally {
      setIsSending(false);
    }
  };

  const formatMessageTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? "PM" : "AM";
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${minutes.toString().padStart(2, "0")} ${ampm}`;
  };

  const getAvatarUrl = (message: Message) => {
    return (
      message.sender?.avatar_url ||
      message.sender?.profile_image_url ||
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
              {isMyMessage && isLastMyMessage && (
                <View style={styles.readStatusContainer}>
                  <Ionicons
                    name={item.is_read ? "checkmark-done" : "checkmark"}
                    size={14}
                    color={item.is_read ? "#34C759" : "rgba(255, 255, 255, 0.7)"}
                  />
                </View>
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
          <TouchableOpacity onPress={() => router.back()}>
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
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={0}
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
              </View>
            </>
          )}
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
          />
        )}

        {/* Input */}
        <View style={styles.inputContainer}>
          <View style={styles.inputRow}>
            <TouchableOpacity style={styles.plusButton}>
              <Ionicons name="add-circle" size={30} color="#007AFF" />
            </TouchableOpacity>
            
            <View style={styles.textInputWrapper}>
              <TextInput
                style={[
                  styles.textInput,
                  { height: Math.max(36, Math.min(inputHeight, 100)) }
                ]}
                placeholder="Message"
                placeholderTextColor="#999"
                value={inputText}
                onChangeText={(text) => {
                  setInputText(text);
                }}
                multiline
                maxLength={1000}
                onContentSizeChange={(e) => {
                  setInputHeight(e.nativeEvent.contentSize.height);
                }}
              />
            </View>

            <TouchableOpacity
              style={[
                styles.sendButton,
                !inputText.trim() && styles.sendButtonDisabled,
              ]}
              onPress={handleSend}
              disabled={!inputText.trim() || isSending}
            >
              {isSending ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Ionicons name="arrow-up" size={22} color="#fff" />
              )}
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
    backgroundColor: "#fff",
    marginBottom:40
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: "#ccc",
    backgroundColor: "#F9F9F9",
    marginTop: 40,
  },
  backButton: { marginRight: 8 },
  headerAvatar: { width: 36, height: 36, borderRadius: 18 },
  headerInfo: { flex: 1, marginLeft: 10 },
  headerName: { fontSize: 17, fontWeight: "600" },

  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  errorText: { fontSize: 18, marginBottom: 20 },
  backButtonText: { color: "#007AFF", fontSize: 16 },

  messagesList: { 
    paddingVertical: 12, 
    paddingHorizontal: 12,
    flexGrow: 1,
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: "600",
    marginTop: 12,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: "#666",
    marginTop: 6,
  },

  messageContainer: { 
    flexDirection: "row", 
    marginBottom: 8,
  },
  myMessageContainer: { justifyContent: "flex-end" },
  theirMessageContainer: { justifyContent: "flex-start" },

  avatarContainer: { marginRight: 6 },
  messageAvatar: { width: 28, height: 28, borderRadius: 14 },
  avatarSpacer: { width: 28 },

  messageBubbleContainer: { maxWidth: "75%" },
  messageBubble: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 18,
  },
  myMessageBubble: { backgroundColor: "#007AFF" },
  theirMessageBubble: { backgroundColor: "#E9E9EB" },

  messageText: { fontSize: 16, lineHeight: 20 },
  myMessageText: { color: "#fff" },
  theirMessageText: { color: "#000" },

  messageFooter: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 2,
    gap: 3,
  },
  messageTime: { fontSize: 11 },
  myMessageTime: { color: "rgba(255, 255, 255, 0.7)" },
  theirMessageTime: { color: "#666" },

  readStatusContainer: {
    marginLeft: 2,
  },

  inputContainer: {
    backgroundColor: "#F9F9F9",
    borderTopWidth: 0.5,
    borderTopColor: "#ccc",
    paddingHorizontal: 8,
    paddingVertical: 6,
    paddingBottom: Platform.OS === "ios" ? 24 : 20,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 6,
  },
  plusButton: {
    paddingBottom: 3,
  },
  textInputWrapper: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#ccc",
    paddingHorizontal: 12,
    paddingVertical: 6,
    minHeight: 36,
    maxHeight: 100,
    justifyContent: "center",
  },
  textInput: {
    fontSize: 16,
    color: "#000",
    padding: 0,
    margin: 0,
  },
  sendButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#007AFF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
  },
  sendButtonDisabled: {
    backgroundColor: "#ccc",
  },
});

export default ChatScreen;