import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  FlatList,
  Image,
  RefreshControl,
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
import {
  updateConversationPinStatus
} from "../../lib/messaging";
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
  listing_image_url: string | null;
  listing_id: number | null;
  other_user_last_seen: string | null;
}

interface GroupedListing {
  listing_id: number;
  listing_image: string | null;
  listing_name: string;
  conversations: Conversation[];
  total_unread: number;
  latest_time: string | null;
}

interface NotificationSettings {
    likes: boolean;
}

const MessagesScreen = () => {
  const router = useRouter();
  const { user } = useAuth();
  
  const row = useRef<Array<Swipeable | null>>([]);

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0);
  const [isGrouped, setIsGrouped] = useState(false); 
  
  const toggleAnim = useRef(new Animated.Value(0)).current;

  // Load grouping preference
  useEffect(() => {
    const loadGroupingPreference = async () => {
      try {
        const value = await AsyncStorage.getItem('messages_grouped_by_listing');
        if (value !== null) {
          setIsGrouped(value === 'true');
        }
      } catch (error) {
        console.error('Error loading grouping preference:', error);
      }
    };
    loadGroupingPreference();
  }, []);

  useEffect(() => {
    Animated.timing(toggleAnim, {
      toValue: isGrouped ? 1 : 0,
      duration: 250,
      useNativeDriver: true,
    }).start();
  }, [isGrouped]);

  const handleToggle = async () => {
    const newValue = !isGrouped;
    setIsGrouped(newValue);
    
    // Save preference
    try {
      await AsyncStorage.setItem('messages_grouped_by_listing', newValue.toString());
    } catch (error) {
      console.error('Error saving grouping preference:', error);
    }
  };
  
  const toggleTranslateX = toggleAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [2, 22], 
  });

  const deleteConversation = async (conversationId: number) => {
    try {
        Alert.alert(
            "Delete Conversation",
            "Are you sure you want to delete this conversation? This action cannot be undone.",
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
                            Alert.alert('Error', 'Failed to delete conversation. Please try again.');
                        }
                    }
                }
            ]
        );
    } catch (error) {
      console.error("Exception during conversation deletion:", error);
    }
  };
  
  const pinConversation = async (conversationId: number, currentPinStatus: boolean) => {
      if (!user?.user_id) return;
      
      const newPinStatus = !currentPinStatus;
      setConversations(prev => prev.map(c => c.conversation_id === conversationId ? { ...c, is_pinned: newPinStatus } : c));

      const success = await updateConversationPinStatus(conversationId, user.user_id, newPinStatus);

      if (!success) {
        Alert.alert('Error', `Failed to ${newPinStatus ? 'pin' : 'unpin'} conversation.`);
        setConversations(prev => prev.map(c => c.conversation_id === conversationId ? { ...c, is_pinned: currentPinStatus } : c));
      }
  };

  const fetchUnreadNotificationsCount = useCallback(async () => {
    if (!user?.user_id) return;
    try {
        const { data: userProfile, error: profileError } = await supabase
            .from('users')
            .select('notification_settings')
            .eq('user_id', user.user_id)
            .single();

        let showLikes = true; 
        if (!profileError && userProfile?.notification_settings) {
            const settings = userProfile.notification_settings as NotificationSettings;
            if (settings.likes === false) {
                showLikes = false; 
            }
        }

        let query = supabase
            .from('notifications')
            .select('*', { count: 'exact', head: true })
            .eq('receiver_id', user.user_id)
            .eq('is_read', false);

        if (!showLikes) {
            query = query.not('type', 'eq', 'like');
        }

        const { count, error } = await query;
        if (error) {
            console.error('Error fetching unread count:', error);
            setUnreadNotificationsCount(0);
            return;
        }
        setUnreadNotificationsCount(count || 0); 
    } catch (error) {
      console.error('Exception fetching unread count:', error);
      setUnreadNotificationsCount(0);
    }
  }, [user?.user_id]);

  const loadConversations = useCallback(async (isRefreshing = false) => {
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
      Alert.alert('Error', 'Failed to load messages.');
      setConversations([]);
    } finally {
      setIsLoading(false);
      if (isRefreshing) setRefreshing(false);
    }
  }, [user?.user_id]);

  useFocusEffect(
    useCallback(() => {
      loadConversations();
      fetchUnreadNotificationsCount(); 
    }, [loadConversations, fetchUnreadNotificationsCount])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadConversations(true);
    fetchUnreadNotificationsCount();
  }, [loadConversations, fetchUnreadNotificationsCount]);

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
      setConversations(prev => prev.map(c => c.conversation_id === conversationId ? { ...c, unread_count: 0 } : c));
    }
    router.push(`/chat/${conversationId}`); 
  };
  
  const handleNotificationPress = () => { 
    router.push('/(tabs)/notifications'); 
  };

  const groupConversationsByListing = async (): Promise<(GroupedListing | Conversation)[]> => {
    const grouped: { [key: number]: GroupedListing } = {};
    const noListing: Conversation[] = [];
    
    // Collect all unique listing IDs
    const listingIds = [...new Set(conversations.map(c => c.listing_id).filter(Boolean))] as number[];
    
    // Fetch product names for all listings
    const productNames: { [key: number]: string } = {};
    if (listingIds.length > 0) {
      try {
        const { data: products } = await supabase
          .from('products')
          .select('id, name')
          .in('id', listingIds);
        
        products?.forEach(p => {
          productNames[p.id] = p.name;
        });
      } catch (error) {
        console.error('Error fetching product names:', error);
      }
    }
    
    conversations.forEach(convo => {
      if (convo.listing_id) {
        if (!grouped[convo.listing_id]) {
          grouped[convo.listing_id] = {
            listing_id: convo.listing_id,
            listing_image: convo.listing_image_url,
            listing_name: productNames[convo.listing_id] || `Product #${convo.listing_id}`,
            conversations: [],
            total_unread: 0,
            latest_time: convo.last_message_time,
          };
        }
        grouped[convo.listing_id].conversations.push(convo);
        
        if (convo.unread_count > 0 && convo.last_message_sender_id !== user?.user_id) {
          grouped[convo.listing_id].total_unread += 1;
        }
        
        if (convo.last_message_time && (!grouped[convo.listing_id].latest_time || 
             new Date(convo.last_message_time) > new Date(grouped[convo.listing_id].latest_time!))) {
          grouped[convo.listing_id].latest_time = convo.last_message_time;
        }
      } else {
        noListing.push(convo);
      }
    });
    
    return [...Object.values(grouped), ...noListing];
  };

  const sortedConversations = conversations.sort((a, b) => {
      if (a.is_pinned && !b.is_pinned) return -1;
      if (!a.is_pinned && b.is_pinned) return 1;
      return new Date(b.last_message_time || 0).getTime() - new Date(a.last_message_time || 0).getTime();
  });
  
  const pinnedConversations = sortedConversations.filter(c => c.is_pinned);
  const unpinnedConversations = sortedConversations.filter(c => !c.is_pinned);
  
  const [groupedData, setGroupedData] = useState<(GroupedListing | Conversation)[]>([]);

  useEffect(() => {
    if (isGrouped) {
      groupConversationsByListing().then(setGroupedData);
    }
  }, [isGrouped, conversations]);

  const renderRightActions = (
    progress: Animated.AnimatedInterpolation<number>,
    dragX: Animated.AnimatedInterpolation<number>,
    item: Conversation,
    index: number,
  ) => {
    const isPinned = item.is_pinned;
    const scale = dragX.interpolate({ inputRange: [-160, -80, 0], outputRange: [1, 1, 0], extrapolate: 'clamp' });
    
    return (
        <View style={styles.swipeActionsContainer}>
            <TouchableOpacity 
                style={[styles.actionButtonContainer, styles.pinAction]}
                onPress={() => { row.current[index]?.close(); pinConversation(item.conversation_id, isPinned); }}
            >
                <Animated.View style={[styles.actionButton, { transform: [{ scale }] }]}>
                    <Ionicons name={isPinned ? "bookmark-outline" : "pin-outline"} size={24} color="white" />
                    <Text style={styles.actionButtonText}>{isPinned ? "Unpin" : "Pin"}</Text>
                </Animated.View>
            </TouchableOpacity>

            <TouchableOpacity 
                style={[styles.actionButtonContainer, styles.deleteAction]}
                onPress={() => { row.current[index]?.close(); deleteConversation(item.conversation_id); }}
            >
                <Animated.View style={[styles.actionButton, { transform: [{ scale }] }]}>
                    <Ionicons name="trash-outline" size={24} color="white" />
                    <Text style={styles.actionButtonText}>Delete</Text>
                </Animated.View>
            </TouchableOpacity>
        </View>
    );
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <Text style={styles.headerTitle}>Inbox</Text>
      <TouchableOpacity style={styles.notificationButton} onPress={handleNotificationPress}>
        <Ionicons name="notifications-outline" size={26} color="#000" /> 
        {unreadNotificationsCount > 0 && (
          <View style={styles.notificationBadge}>
            <Text style={styles.badgeText}>{unreadNotificationsCount > 9 ? "9+" : unreadNotificationsCount}</Text>
          </View>
        )}
      </TouchableOpacity>
    </View>
  );

  const renderGroupBy = () => (
    <View style={styles.groupByContainer}>
      <View style={styles.groupByToggleRow}>
        <TouchableOpacity 
            onPress={handleToggle} 
            style={[styles.togglePlaceholder, isGrouped ? styles.toggleActive : styles.toggleInactive]}
            activeOpacity={0.8}
        >
          <Animated.View style={[styles.toggleCircle, { transform: [{ translateX: toggleTranslateX }] }]} />
        </TouchableOpacity>
        <Text style={styles.groupByText}>Group by listing</Text>
      </View>
{/*       
      <View style={styles.premiumRow}>
        <Ionicons name="diamond-outline" size={16} color="#7B4DFF" />
        <Text style={styles.premiumText}>Get faster responses.</Text>
        <TouchableOpacity style={styles.tryFreeButton}>
          <Text style={styles.tryFreeText}>Try for FREE</Text>
        </TouchableOpacity>
      </View> */}
    </View>
  );

  const renderSectionHeader = (title: string, actionText?: string) => (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionTitleContainer}>
        {title === "Pinned" && <Ionicons name="pin" size={16} color="#000" style={styles.pinIcon} />}
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      {actionText && (
        <TouchableOpacity>
          <Text style={styles.sectionAction}>{actionText}</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const renderEditSortButtons = () => (
    <View style={styles.editSortRow}>
      <TouchableOpacity style={styles.editButton}>
        <Ionicons name="create-outline" size={20} color="#000" />
        <Text style={styles.editText}>Edit</Text>
      </TouchableOpacity>
      
      <TouchableOpacity style={styles.sortButton}>
        <Ionicons name="funnel-outline" size={16} color="#00A78F" style={styles.sortIcon} />
        <Text style={styles.sortText}>Sort: Default</Text>
      </TouchableOpacity>
    </View>
  );

  const renderMultipleAvatars = (conversations: Conversation[]) => {
    const maxShow = 3;
    const toShow = conversations.slice(0, maxShow);
    const remaining = conversations.length - maxShow;

    return (
      <View style={styles.multiAvatarContainer}>
        {toShow.map((convo, index) => {
          const online = isUserOnline(convo.other_user_last_seen);
          const hasUnread = convo.unread_count > 0 && convo.last_message_sender_id !== user?.user_id;
          
          return (
            <View 
              key={convo.conversation_id} 
              style={[
                styles.stackedAvatar,
                index === 0 && styles.stackedAvatarFirst,
                index === 1 && styles.stackedAvatarSecond,
                index === 2 && styles.stackedAvatarThird,
              ]}
            >
              <Image source={{ uri: getAvatarUrl(convo) }} style={[styles.smallAvatar, online && styles.avatarOnline]} />
              {hasUnread && <View style={styles.smallUnreadDot} />}
              {online && <View style={styles.smallOnlineIndicator} />}
            </View>
          );
        })}
        {remaining > 0 && (
          <View style={[styles.stackedAvatar, styles.remainingBadge]}>
            <Text style={styles.remainingText}>+{remaining}</Text>
          </View>
        )}
      </View>
    );
  };

  const renderConversationItem = ({ item, index }: { item: Conversation, index: number }) => {
    const hasUnread = item.unread_count > 0 && item.last_message_sender_id !== user?.user_id;
    const online = isUserOnline(item.other_user_last_seen);

    const renderContent = () => (
      <TouchableOpacity style={styles.conversationItem} onPress={() => handleConversationPress(item.conversation_id)}>
        <View style={styles.avatarContainer}>
          <Image source={{ uri: getAvatarUrl(item) }} style={[styles.avatar, online && styles.avatarOnline]} />
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

          <Text style={[styles.messagePreview, hasUnread && styles.messagePreviewUnread]} numberOfLines={1}>
            {getLastMessagePreview(item)}
          </Text>
        </View>
        
        {item.listing_image_url && <Image source={{ uri: item.listing_image_url }} style={styles.messageThumbnail} />}
      </TouchableOpacity>
    );

    return (
      <Swipeable
        ref={(ref) => row.current[index] = ref}
        friction={2}
        rightThreshold={40}
        renderRightActions={(progress, dragX) => renderRightActions(progress, dragX, item, index)}
        onSwipeableOpen={(direction) => {
            if (direction === 'right') {
                row.current.forEach((ref, i) => { if (i !== index && ref) ref.close(); });
            }
        }}
        overshootRight={false}
      >
        {renderContent()}
      </Swipeable>
    );
  };

  const renderGroupedItem = (group: GroupedListing) => {
    const conversationCount = group.conversations.length;

    return (
      <TouchableOpacity
        style={styles.conversationItem}
        onPress={() => {
          router.push({
            pathname: '/conversation',
            params: { listingId: group.listing_id, listingImage: group.listing_image || '' },
          });
        }}
      >
        {renderMultipleAvatars(group.conversations)}

        <View style={styles.conversationInfo}>
          <View style={styles.conversationHeader}>
            <Text style={[styles.userName, group.total_unread > 0 && styles.userNameUnread]} numberOfLines={1}>
              {group.listing_name}
            </Text>
            <Text style={styles.messageTime}>{formatTime(group.latest_time)}</Text>
          </View>

          <View style={styles.conversationSubHeader}>
            <Text style={[styles.messagePreview, group.total_unread > 0 && styles.messagePreviewUnread]}>
              {conversationCount} conversation{conversationCount !== 1 ? 's' : ''}
            </Text>
            {group.total_unread > 0 && (
              <>
                {/* <Text style={styles.unreadSeparator}> • </Text> */}
                <Text style={styles.unreadCountText}>{group.total_unread} unread</Text>
              </>
            )}
          </View>
        </View>
        
        {group.listing_image && <Image source={{ uri: group.listing_image }} style={styles.messageThumbnail} />}
      </TouchableOpacity>
    );
  };

  const renderItem = ({ item, index }: { item: any, index: number }) => {
    if ('conversations' in item) {
      return renderGroupedItem(item as GroupedListing);
    } else {
      return renderConversationItem({ item: item as Conversation, index });
    }
  };
  
  const ListHeader = () => (
    <View style={{ backgroundColor: '#fff' }}>
        {renderGroupBy()}
        
        {!isGrouped && pinnedConversations.length > 0 && (
            <>
                {renderSectionHeader("Pinned", "View all")}
                {pinnedConversations.map((item, index) => (
                    <React.Fragment key={`pinned-item-${item.conversation_id}`}>
                        {renderConversationItem({ item, index })}
                        {index < pinnedConversations.length - 1 && <View style={styles.separator} />}
                    </React.Fragment>
                ))}
                <View style={styles.separator} />
            </>
        )}
        
        {!isGrouped && (
          <>
            {renderSectionHeader("All")}
            {renderEditSortButtons()} 
            {unpinnedConversations.length > 0 && <View style={styles.separator} />}
          </>
        )}

        {isGrouped && (
          <>
            {renderSectionHeader("All")}
            {renderEditSortButtons()} 
            {groupedData.length > 0 && <View style={styles.separator} />}
          </>
        )}
    </View>
  );

  const unpinnedStartIndex = pinnedConversations.length; 

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView style={styles.container}>
        {renderHeader()}

        {isLoading && !refreshing ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.loadingText}>Loading conversations...</Text>
          </View>
        ) : conversations.length === 0 && !refreshing ? (
          <>
            {renderGroupBy()} 
            <View style={{ flex: 1, backgroundColor: '#fff' }}> 
                <Text style={styles.emptyStateTitle}>No messages</Text>
            </View>
          </>
        ) : (
          <FlatList
            data={isGrouped ? groupedData : unpinnedConversations}
            renderItem={isGrouped ? renderItem : ({ item, index }) => renderConversationItem({ item, index: index + unpinnedStartIndex })}
            keyExtractor={(item, index) => 
              isGrouped 
                ? ('conversations' in item ? `group-${item.listing_id}` : `conv-${item.conversation_id}`)
                : `unpinned-${item.conversation_id.toString()}`
            }
            ListHeaderComponent={ListHeader} 
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#007AFF" colors={["#007AFF"]} />}
          />
        )}
      </SafeAreaView>
    </GestureHandlerRootView>
  );
};
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F5F5",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#fff",
    marginTop: 40, 
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: "700",
    color: "#000",
  },
  notificationButton: {
    position: 'relative',
    padding: 4,
  },
  notificationBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#FF3B30', 
    borderRadius: 10,
    minWidth: 18, 
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 2, 
    borderColor: '#fff',
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  groupByContainer: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  groupByToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  groupByText: {
    fontSize: 17,
    color: '#000',
    fontWeight: '400',
    marginLeft: 12, 
  },
  togglePlaceholder: {
    width: 50,
    height: 30,
    borderRadius: 15,
    padding: 2,
    justifyContent: 'center', 
  },
  toggleInactive: {
    backgroundColor: '#E5E5EA', 
  },
  toggleActive: {
    backgroundColor: "#00A78F", 
  },
  toggleCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.5,
    elevation: 2,
    position: 'absolute', 
    left: 2, 
  },
  premiumRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F7F2FF', 
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginTop: 8,
  },
  premiumText: {
    marginLeft: 6,
    fontSize: 14,
    fontWeight: '500',
    color: '#7B4DFF', 
  },
  tryFreeButton: {
    backgroundColor: '#7B4DFF', 
    borderRadius: 16,
    paddingVertical: 4,
    paddingHorizontal: 10,
    marginLeft: 'auto', 
  },
  tryFreeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
  },
  pinIcon: {
    marginRight: 6,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#F5F5F5',
  },
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 18, 
    fontWeight: '700',
    color: '#000',
  },
  sectionAction: {
    fontSize: 16,
    color: '#00A78F', 
    fontWeight: '500',
  },
  editSortRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#F5F5F5', 
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E6F7F5', 
    borderRadius: 20, 
    paddingVertical: 6, 
    paddingHorizontal: 12, 
  },
  sortIcon: {
    marginRight: 6, 
  },
  editText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginLeft: 4,
  },
  sortText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#00A78F', 
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
  messageThumbnail: {
    width: 56,
    height: 56,
    borderRadius: 8,
    marginLeft: 10,
    backgroundColor: '#E5E5EA',
  },
  multiAvatarContainer: {
    width: 56,
    height: 56,
    marginRight: 12,
    position: 'relative',
  },
  stackedAvatar: {
    position: 'absolute',
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: '#fff',
  },
  stackedAvatarFirst: {
    top: 0,
    left: 10,
    zIndex: 3,
  },
  stackedAvatarSecond: {
    top: 10,
    left: 0,
    zIndex: 2,
  },
  stackedAvatarThird: {
    top: 10,
    right: 0,
    zIndex: 1,
  },
  smallAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E5E5EA',
  },
  smallUnreadDot: {
    position: 'absolute',
    top: 2,
    left: 2,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#00A86B',
    borderWidth: 1,
    borderColor: '#fff',
  },
  smallOnlineIndicator: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#00A78F',
    borderWidth: 2,
    borderColor: '#fff',
  },
  remainingBadge: {
    top: 20,
    left: 20,
    backgroundColor: '#666',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 0,
  },
  remainingText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  expandedContainer: {
    backgroundColor: '#F8F9FA',
    paddingLeft: 20,
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
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: '#fff',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: "#666",
  },
  emptyStateTitle: {
    fontSize: 22,
    fontWeight: "600",
    color: "#333",
    marginTop: 20,
    marginBottom: 8,
    textAlign: 'center',
  },
});

export default MessagesScreen;