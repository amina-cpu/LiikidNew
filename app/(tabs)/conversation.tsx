import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Animated,
    FlatList,
    Image,
    SafeAreaView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import {
    GestureHandlerRootView,
    Swipeable,
} from "react-native-gesture-handler";
import { updateConversationPinStatus } from "../../lib/messaging";
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
  is_premium: boolean;
  other_user_last_seen: string | null;
}

const GroupedConversationsScreen = () => {
  const router = useRouter();
  const { user } = useAuth();
  const { listingId, listingImage } = useLocalSearchParams();
  
  const row = useRef<Array<Swipeable | null>>([]);
  
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [productInfo, setProductInfo] = useState<{ name: string; price: number } | null>(null);

  useEffect(() => {
    loadConversations();
    loadProductInfo();
  }, [listingId]);

  const loadProductInfo = async () => {
    if (!listingId) return;
    
    try {
      const { data, error } = await supabase
        .from('products')
        .select('name, price')
        .eq('id', listingId)
        .single();
      
      if (!error && data) {
        setProductInfo(data);
      }
    } catch (error) {
      console.error('Error loading product info:', error);
    }
  };

  const loadConversations = async () => {
    if (!user?.user_id || !listingId) return;

    try {
      setIsLoading(true);

      // Get all conversations for this listing
      const { data: convos, error: convosError } = await supabase
        .from('conversations')
        .select('conversation_id')
        .eq('listing_id', listingId);

      if (convosError) throw convosError;

      if (!convos || convos.length === 0) {
        setConversations([]);
        setIsLoading(false);
        return;
      }

      const conversationIds = convos.map(c => c.conversation_id);

      // Get conversation details from view
      const { data: conversationsData, error: viewError } = await supabase
        .from('conversation_list_view')
        .select('*')
        .eq('user_id', user.user_id)
        .in('conversation_id', conversationIds)
        .order('last_message_time', { ascending: false, nullsFirst: false });

      if (viewError) throw viewError;

      // Fetch last_seen for each user
      const conversationsWithLastSeen = await Promise.all(
        (conversationsData || []).map(async (convo) => {
          let otherUserLastSeen = null;

          if (convo.other_user_id) {
            const { data: userData } = await supabase
              .from('users')
              .select('last_seen')
              .eq('user_id', convo.other_user_id)
              .single();

            otherUserLastSeen = userData?.last_seen || null;
          }

          return {
            ...convo,
            other_user_last_seen: otherUserLastSeen,
          };
        })
      );

      setConversations(conversationsWithLastSeen as Conversation[]);
    } catch (error) {
      console.error('Error loading conversations:', error);
      Alert.alert('Error', 'Failed to load conversations.');
    } finally {
      setIsLoading(false);
    }
  };

  const deleteConversation = async (conversationId: number) => {
    Alert.alert(
      "Delete Conversation",
      "Are you sure you want to delete this conversation?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await supabase.from('messages').delete().eq('conversation_id', conversationId);
              await supabase.from('conversation_participants').delete().eq('conversation_id', conversationId);
              await supabase.from('conversations').delete().eq('conversation_id', conversationId);

              setConversations(prev => prev.filter(c => c.conversation_id !== conversationId));
            } catch (error) {
              console.error('Error deleting conversation:', error);
              Alert.alert('Error', 'Failed to delete conversation.');
            }
          }
        }
      ]
    );
  };

  const pinConversation = async (conversationId: number, currentPinStatus: boolean) => {
    if (!user?.user_id) return;

    const newPinStatus = !currentPinStatus;

    setConversations(prev =>
      prev.map(c =>
        c.conversation_id === conversationId ? { ...c, is_pinned: newPinStatus } : c
      )
    );

    const success = await updateConversationPinStatus(conversationId, user.user_id, newPinStatus);

    if (!success) {
      Alert.alert('Error', `Failed to ${newPinStatus ? 'pin' : 'unpin'} conversation.`);
      setConversations(prev =>
        prev.map(c =>
          c.conversation_id === conversationId ? { ...c, is_pinned: currentPinStatus } : c
        )
      );
    }
  };

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

  const handleConversationPress = (conversationId: number) => {
    if (user?.user_id) {
      setConversations(prev =>
        prev.map(c =>
          c.conversation_id === conversationId ? { ...c, unread_count: 0 } : c
        )
      );
    }
    router.push(`/chat/${conversationId}`);
  };

  const renderRightActions = (
    progress: Animated.AnimatedInterpolation<number>,
    dragX: Animated.AnimatedInterpolation<number>,
    item: Conversation,
    index: number,
  ) => {
    const isPinned = item.is_pinned;

    const scale = dragX.interpolate({
      inputRange: [-160, -80, 0],
      outputRange: [1, 1, 0],
      extrapolate: 'clamp',
    });

    return (
      <View style={styles.swipeActionsContainer}>
        <TouchableOpacity
          style={[styles.actionButtonContainer, styles.pinAction]}
          onPress={() => {
            row.current[index]?.close();
            pinConversation(item.conversation_id, isPinned);
          }}
        >
          <Animated.View style={[styles.actionButton, { transform: [{ scale }] }]}>
            <Ionicons name={isPinned ? "bookmark-outline" : "pin-outline"} size={24} color="white" />
            <Text style={styles.actionButtonText}>{isPinned ? "Unpin" : "Pin"}</Text>
          </Animated.View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButtonContainer, styles.deleteAction]}
          onPress={() => {
            row.current[index]?.close();
            deleteConversation(item.conversation_id);
          }}
        >
          <Animated.View style={[styles.actionButton, { transform: [{ scale }] }]}>
            <Ionicons name="trash-outline" size={24} color="white" />
            <Text style={styles.actionButtonText}>Delete</Text>
          </Animated.View>
        </TouchableOpacity>
      </View>
    );
  };

  const renderConversationItem = ({ item, index }: { item: Conversation; index: number }) => {
    const hasUnread = item.unread_count > 0 && item.last_message_sender_id !== user?.user_id;
    const online = isUserOnline(item.other_user_last_seen);

    const renderContent = () => (
      <TouchableOpacity
        style={styles.conversationItem}
        onPress={() => handleConversationPress(item.conversation_id)}
      >
        <View style={styles.avatarContainer}>
          <Image
            source={{ uri: getAvatarUrl(item) }}
            style={[styles.avatar, online && styles.avatarOnline]}
          />
          {item.is_premium && (
            <View style={styles.premiumLabelContainer}>
              <Text style={styles.premiumLabelText}>PREMIUM</Text>
            </View>
          )}
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

          <Text
            style={[styles.messagePreview, hasUnread && styles.messagePreviewUnread]}
            numberOfLines={1}
          >
            {getLastMessagePreview(item)}
          </Text>
        </View>
      </TouchableOpacity>
    );

    return (
      <Swipeable
        ref={(ref) => (row.current[index] = ref)}
        friction={2}
        rightThreshold={40}
        renderRightActions={(progress, dragX) => renderRightActions(progress, dragX, item, index)}
        onSwipeableOpen={(direction) => {
          if (direction === 'right') {
            row.current.forEach((ref, i) => {
              if (i !== index && ref) {
                ref.close();
              }
            });
          }
        }}
        overshootRight={false}
      >
        {renderContent()}
      </Swipeable>
    );
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            {listingImage && (
              <Image source={{ uri: listingImage as string }} style={styles.headerProductImage} />
            )}
            <View style={styles.headerTextContainer}>
              <Text style={styles.headerTitle}>
                {productInfo?.name || `Product #${listingId}`}
              </Text>
              <Text style={styles.headerSubtitle}>
                {conversations.length} conversation{conversations.length !== 1 ? 's' : ''}
              </Text>
            </View>
          </View>
        </View>

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#00A78F" />
            <Text style={styles.loadingText}>Loading conversations...</Text>
          </View>
        ) : conversations.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No conversations for this product</Text>
          </View>
        ) : (
          <FlatList
            data={conversations}
            renderItem={renderConversationItem}
            keyExtractor={(item) => item.conversation_id.toString()}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
          />
        )}
      </SafeAreaView>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
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
  headerContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerProductImage: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: '#E5E5EA',
    marginRight: 12,
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
  },
  conversationItem: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: "#fff",
    alignItems: 'center',
  },
  separator: {
    height: 1,
    backgroundColor: "#E5E5E5",
    marginLeft: 84,
    marginRight: 16,
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
  premiumLabelContainer: {
    position: 'absolute',
    bottom: -4,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderColor: "#00A78F",
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 4,
    paddingVertical: 1,
    alignSelf: 'center',
    alignItems: 'center',
  },
  premiumLabelText: {
    fontSize: 8,
    fontWeight: '700',
    color: '#7B4DFF',
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
  swipeActionsContainer: {
    flexDirection: 'row',
    width: 160,
    backgroundColor: '#F5F5F5',
  },
  actionButtonContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
    height: '100%',
  },
  actionButton: {
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 10,
  },
  actionButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 12,
    marginTop: 2,
  },
  pinAction: {
    backgroundColor: '#4A4A4A',
  },
  deleteAction: {
    backgroundColor: '#E53E3E',
  },
});

export default GroupedConversationsScreen;