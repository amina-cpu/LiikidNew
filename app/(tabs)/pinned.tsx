import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
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
import { supabase } from "../../lib/Supabase";
import { markConversationAsRead } from "../../lib/messaging";
import { useAuth } from "./../context/AuthContext";

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
  listing_image_url: string | null;
  listing_id: number | null;
  other_user_last_seen: string | null;
}

const PinnedConversationsScreen = () => {
  const router = useRouter();
  const { user } = useAuth();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadPinnedConversations = useCallback(async (isRefreshing = false) => {
    if (!user?.user_id) {
      setIsLoading(false);
      return;
    }

    try {
      if (!isRefreshing) setIsLoading(true);

      const { data: conversationsData, error: conversationsError } = await supabase
        .from('conversation_list_view')
        .select('*')
        .eq('user_id', user.user_id)
        .eq('is_pinned', true)
        .order('last_message_time', { ascending: false, nullsFirst: false });

      if (conversationsError) throw conversationsError;

      const conversationsWithImages = await Promise.all(
        (conversationsData || []).map(async (convo) => {
          let listingImageUrl = null;
          let otherUserLastSeen = null;

          if (convo.listing_id) {
            const { data: productData } = await supabase
              .from('products')
              .select('image_url')
              .eq('id', convo.listing_id)
              .single();
            listingImageUrl = productData?.image_url || null;
          }

          if (convo.other_user_id) {
            const { data: userData } = await supabase
              .from('users')
              .select('last_seen')
              .eq('user_id', convo.other_user_id)
              .single();
            otherUserLastSeen = userData?.last_seen || null;
          }

          return { ...convo, listing_image_url: listingImageUrl, other_user_last_seen: otherUserLastSeen };
        })
      );

      setConversations(conversationsWithImages as Conversation[]);
    } catch (error) {
      console.error('Error loading pinned conversations:', error);
      setConversations([]);
    } finally {
      setIsLoading(false);
      if (isRefreshing) setRefreshing(false);
    }
  }, [user?.user_id]);

  useEffect(() => {
    loadPinnedConversations();
  }, [loadPinnedConversations]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadPinnedConversations(true);
  }, [loadPinnedConversations]);

  const formatTime = (timestamp: string | null) => {
    if (!timestamp) return '';
    const diff = new Date().getTime() - new Date(timestamp).getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    if (hours < 1) return 'Just now';
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  const getAvatarUrl = (conversation: Conversation) => {
    return conversation.other_user_avatar || conversation.other_user_profile_image || "https://via.placeholder.com/56";
  };

  const getDisplayName = (conversation: Conversation) => {
    return conversation.other_user_full_name || conversation.other_user_name || "Unknown User";
  };

  const getLastMessagePreview = (conversation: Conversation) => {
    return conversation.last_message || "No messages yet";
  };

  const isUserOnline = (lastSeen: string | null): boolean => {
    if (!lastSeen) return false;
    const lastSeenDate = new Date(lastSeen);
    const now = new Date();
    const diffMinutes = (now.getTime() - lastSeenDate.getTime()) / (1000 * 60);
    return diffMinutes < 5;
  };

  const handleConversationPress = async (conversationId: number) => {
    if (user?.user_id) {
      await markConversationAsRead(conversationId, user.user_id);
    }
    router.push(`/chat/${conversationId}`);
  };

  const renderConversationItem = ({ item }: { item: Conversation }) => {
    const hasUnread = item.unread_count > 0 && item.last_message_sender_id !== user?.user_id;
    const online = isUserOnline(item.other_user_last_seen);

    return (
      <TouchableOpacity
        style={[
          styles.conversationItem,
          hasUnread && styles.conversationItemUnread
        ]}
        onPress={() => handleConversationPress(item.conversation_id)}
      >
        <View style={styles.avatarContainer}>
          <Image source={{ uri: getAvatarUrl(item) }} style={[styles.avatar, online && styles.avatarOnline]} />
          {hasUnread && <View style={styles.unreadDot} />}
          {online && <View style={styles.onlineIndicator} />}
        </View>

        <View style={styles.conversationInfo}>
          <View style={styles.conversationHeader}>
            <Text style={[styles.userName, hasUnread && styles.userNameUnread]} numberOfLines={1}>
              {getDisplayName(item)}
            </Text>
            <Text style={styles.messageTime}>{formatTime(item.last_message_time)}</Text>
          </View>

          <Text style={[styles.messagePreview, hasUnread && styles.messagePreviewUnread]} numberOfLines={1}>
            {getLastMessagePreview(item)}
          </Text>
        </View>

        {item.listing_image_url && <Image source={{ uri: item.listing_image_url }} style={styles.messageThumbnail} />}
      </TouchableOpacity>
    );
  };

  if (isLoading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={28} color="#000" />
        </TouchableOpacity>
        <Text style={styles.title}>Pinned Conversations</Text>
        <View style={styles.headerRight} />
      </View>

      <FlatList
        data={conversations}
        renderItem={renderConversationItem}
        keyExtractor={(item) => item.conversation_id.toString()}
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#007AFF"
            colors={["#007AFF"]}
          />
        }
        ListEmptyComponent={() => (
          <View style={styles.emptyContainer}>
            <Ionicons name="pin-outline" size={64} color="#ccc" />
            <Text style={styles.emptyText}>No pinned conversations</Text>
            <Text style={styles.emptySubtext}>
              Pin important conversations to keep them at the top
            </Text>
          </View>
        )}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F5F5",
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 8,
    paddingVertical: 12,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    marginTop: 40,
  },
  backButton: {
    padding: 8,
    width: 44,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: "#000",
    flex: 1,
    textAlign: 'center',
  },
  headerRight: {
    width: 44,
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  conversationItem: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#fff",
    borderRadius: 12,
    marginBottom: 10,
    alignItems: 'center',
  },
  conversationItemUnread: {
    backgroundColor: '#E8F5F3',
  },
  separator: {
    height: 1,
    backgroundColor: "#E5E5E5",
    marginLeft: 84,
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
  avatarOnline: {
    borderWidth: 3,
    borderColor: '#00A78F',
  },
  unreadDot: {
    position: 'absolute',
    top: 4,
    left: 4,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#00A86B',
    borderWidth: 1,
    borderColor: '#fff',
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#00A78F',
    borderWidth: 2,
    borderColor: '#fff',
  },
  conversationInfo: {
    flex: 1,
    justifyContent: "center",
  },
  conversationHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 2,
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
  messagePreview: {
    fontSize: 15,
    color: "#8E8E93",
  },
  messagePreviewUnread: {
    fontWeight: "500",
    color: "#000",
  },
  messageThumbnail: {
    width: 56,
    height: 56,
    borderRadius: 8,
    marginLeft: 10,
    backgroundColor: '#E5E5EA',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 100,
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default PinnedConversationsScreen;