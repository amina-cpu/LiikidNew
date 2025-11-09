// app/(tabs)/messages.tsx - Replace your existing messages.tsx with this
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import {
    ActivityIndicator,
    FlatList,
    Image,
    RefreshControl,
    SafeAreaView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { getUserConversations } from "../../lib/messaging";
import { supabase } from "../../lib/Supabase";
import { useAuth } from "../context/AuthContext";

interface Conversation {
  conversation_id: number;
  other_user_id: number;
  other_user_name: string;
  other_user_full_name: string | null;
  other_user_avatar: string | null;
  other_user_profile_image: string | null;
  last_message: string | null;
  last_message_time: string | null;
  last_message_sender_id: number | null;
  unread_count: number;
  is_pinned: boolean;
}

const MessagesScreen = () => {
  const router = useRouter();
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Load conversations
  const loadConversations = useCallback(async (isRefreshing = false) => {
    if (!user?.user_id) {
      console.log('⚠️ No user ID, cannot load conversations');
      setIsLoading(false);
      return;
    }

    try {
      if (!isRefreshing) {
        setIsLoading(true);
      }
      
      console.log('📬 Loading conversations for user:', user.user_id);
      const data = await getUserConversations(user.user_id);
      
      if (data) {
        console.log('✅ Loaded', data.length, 'conversations');
        setConversations(data as Conversation[]);
      } else {
        console.log('⚠️ No conversations found');
        setConversations([]);
      }
    } catch (error) {
      console.error("❌ Error loading conversations:", error);
    } finally {
      setIsLoading(false);
      if (isRefreshing) {
        setRefreshing(false);
      }
    }
  }, [user?.user_id]);

  // Load on focus
  useFocusEffect(
    useCallback(() => {
      console.log('🔄 Messages screen focused, loading conversations');
      loadConversations();
    }, [loadConversations])
  );

  // Subscribe to real-time message updates
  React.useEffect(() => {
    if (!user?.user_id) return;

    console.log('🔔 Setting up real-time subscription for messages');
    
    const channel = supabase
      .channel("user-messages")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
        },
        (payload) => {
          console.log("🆕 New message event, refreshing conversations");
          loadConversations(true);
        }
      )
      .subscribe((status) => {
        console.log('📡 Messages subscription status:', status);
      });

    return () => {
      console.log('🔌 Unsubscribing from messages');
      channel.unsubscribe();
    };
  }, [user?.user_id, loadConversations]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadConversations(true);
  }, [loadConversations]);

  const formatTime = (timestamp: string | null) => {
    if (!timestamp) return "";

    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}d`;
    
    // Show date for older messages
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getAvatarUrl = (conversation: Conversation) => {
    return (
      conversation.other_user_avatar ||
      conversation.other_user_profile_image ||
      "https://via.placeholder.com/50"
    );
  };

  const getDisplayName = (conversation: Conversation) => {
    return conversation.other_user_full_name || conversation.other_user_name;
  };

  const getLastMessagePreview = (conversation: Conversation) => {
    if (!conversation.last_message) return "No messages yet";
    
    // Show "You: " prefix if the current user sent the last message
    const isMyMessage = conversation.last_message_sender_id === user?.user_id;
    const prefix = isMyMessage ? "You: " : "";
    
    // Truncate long messages
    const maxLength = 50;
    const message = conversation.last_message.length > maxLength 
      ? conversation.last_message.substring(0, maxLength) + "..." 
      : conversation.last_message;
    
    return `${prefix}${message}`;
  };

  const handleConversationPress = (conversationId: number) => {
    console.log('💬 Opening conversation:', conversationId);
    console.log('📍 Current route:', router);
    
    // Validate conversation ID
    if (!conversationId || isNaN(conversationId)) {
      console.error('❌ Invalid conversation ID:', conversationId);
      Alert.alert('Error', 'Invalid conversation ID');
      return;
    }
    
    try {
      // Navigate to chat screen
      const path = `/(tabs)/chat/${conversationId}`;
      console.log('🚀 Navigating to:', path);
      router.push(path);
    } catch (error) {
      console.error('❌ Navigation error:', error);
      Alert.alert('Error', 'Failed to open conversation');
    }
  };

  const renderConversation = ({ item }: { item: Conversation }) => {
    const hasUnread = item.unread_count > 0;

    return (
      <TouchableOpacity
        style={styles.conversationItem}
        onPress={() => handleConversationPress(item.conversation_id)}
        activeOpacity={0.7}
      >
        <View style={styles.avatarContainer}>
          <Image source={{ uri: getAvatarUrl(item) }} style={styles.avatar} />
          {hasUnread && <View style={styles.onlineDot} />}
        </View>

        <View style={styles.conversationInfo}>
          <View style={styles.conversationHeader}>
            <Text style={[styles.userName, hasUnread && styles.userNameUnread]}>
              {getDisplayName(item)}
            </Text>
            <Text style={styles.messageTime}>
              {formatTime(item.last_message_time)}
            </Text>
          </View>

          <View style={styles.messagePreviewContainer}>
            <Text
              style={[
                styles.messagePreview,
                hasUnread && styles.messagePreviewUnread,
              ]}
              numberOfLines={1}
            >
              {getLastMessagePreview(item)}
            </Text>
            {hasUnread && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadCount}>
                  {item.unread_count > 99 ? "99+" : item.unread_count}
                </Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="chatbubbles-outline" size={80} color="#ccc" />
      <Text style={styles.emptyStateTitle}>No conversations yet</Text>
      <Text style={styles.emptyStateText}>
        Start chatting by visiting someone's profile!
      </Text>
    </View>
  );

  const renderHeader = () => (
    <View style={styles.header}>
      <Text style={styles.headerTitle}>Messages</Text>
      <View style={styles.headerButtons}>
        <TouchableOpacity 
          style={styles.headerButton}
          onPress={() => loadConversations()}
        >
          <Ionicons name="refresh-outline" size={24} color="#007AFF" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.headerButton}>
          <Ionicons name="create-outline" size={24} color="#007AFF" />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {renderHeader()}

      {isLoading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading conversations...</Text>
        </View>
      ) : (
        <FlatList
          data={conversations}
          renderItem={renderConversation}
          keyExtractor={(item) => item.conversation_id.toString()}
          contentContainerStyle={
            conversations.length === 0 ? styles.emptyListContainer : styles.listContainer
          }
          ListEmptyComponent={renderEmptyState}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#007AFF"
              colors={["#007AFF"]}
            />
          }
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    marginTop: 40,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "700",
  },
  headerButtons: {
    flexDirection: "row",
    gap: 12,
  },
  headerButton: {
    padding: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: "#666",
  },
  listContainer: {
    paddingVertical: 8,
  },
  emptyListContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyState: {
    alignItems: "center",
    paddingHorizontal: 40,
  },
  emptyStateTitle: {
    fontSize: 22,
    fontWeight: "600",
    color: "#333",
    marginTop: 20,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 15,
    color: "#666",
    textAlign: "center",
    lineHeight: 22,
  },
  conversationItem: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#fff",
  },
  separator: {
    height: 1,
    backgroundColor: "#f0f0f0",
    marginLeft: 76,
  },
  avatarContainer: {
    position: "relative",
    marginRight: 12,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#E5E5EA",
  },
  onlineDot: {
    position: "absolute",
    bottom: 2,
    right: 2,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#34C759",
    borderWidth: 2,
    borderColor: "#fff",
  },
  conversationInfo: {
    flex: 1,
    justifyContent: "center",
  },
  conversationHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  userName: {
    fontSize: 16,
    fontWeight: "400",
    color: "#000",
    flex: 1,
  },
  userNameUnread: {
    fontWeight: "600",
  },
  messageTime: {
    fontSize: 14,
    color: "#8E8E93",
    marginLeft: 8,
  },
  messagePreviewContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  messagePreview: {
    fontSize: 15,
    color: "#8E8E93",
    flex: 1,
  },
  messagePreviewUnread: {
    fontWeight: "500",
    color: "#000",
  },
  unreadBadge: {
    backgroundColor: "#007AFF",
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    paddingHorizontal: 6,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 8,
  },
  unreadCount: {
    fontSize: 12,
    fontWeight: "600",
    color: "#fff",
  },
});

export default MessagesScreen;