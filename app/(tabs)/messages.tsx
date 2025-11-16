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
  markConversationAsRead,
  updateConversationPinStatus
} from "../../lib/messaging";
import { supabase } from "../../lib/Supabase";
import { useAuth } from "../context/AuthContext";
import i18n from '../../lib/i18n';

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
  
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedConversations, setSelectedConversations] = useState<Set<number>>(new Set());
  
  const toggleAnim = useRef(new Animated.Value(0)).current;

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

  const toggleSelection = (conversationId: number) => {
    setSelectedConversations(prev => {
      const newSet = new Set(prev);
      if (newSet.has(conversationId)) {
        newSet.delete(conversationId);
      } else {
        newSet.add(conversationId);
      }
      return newSet;
    });
  };

  const selectAll = () => {
    const allIds = new Set(conversations.map(c => c.conversation_id));
    setSelectedConversations(allIds);
  };

  const deselectAll = () => {
    setSelectedConversations(new Set());
  };

  const deleteSelectedConversations = async () => {
    if (selectedConversations.size === 0) return;

    Alert.alert(
      i18n.t('messages.deleteConversations'),
      i18n.t('messages.deleteConversationsMessage').replace('{{count}}', selectedConversations.size.toString()),
      [
        { text: i18n.t('messages.cancel'), style: 'cancel' },
        {
          text: i18n.t('messages.delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              const idsToDelete = Array.from(selectedConversations);
              
              for (const convId of idsToDelete) {
                await supabase.from('messages').delete().eq('conversation_id', convId);
                await supabase.from('conversation_participants').delete().eq('conversation_id', convId);
                await supabase.from('conversations').delete().eq('conversation_id', convId);
              }

              setConversations(prev => 
                prev.filter(c => !selectedConversations.has(c.conversation_id))
              );
              
              setSelectedConversations(new Set());
              setIsEditMode(false);
            } catch (error) {
              console.error('Error deleting conversations:', error);
              Alert.alert(i18n.t('messages.error'), i18n.t('messages.failedToDelete'));
            }
          }
        }
      ]
    );
  };

  const markSelectedAsRead = async () => {
    if (selectedConversations.size === 0 || !user?.user_id) return;

    try {
      const idsToUpdate = Array.from(selectedConversations);
      
      for (const convId of idsToUpdate) {
        await markConversationAsRead(convId, user.user_id);
      }

      setConversations(prev =>
        prev.map(c => 
          selectedConversations.has(c.conversation_id) 
            ? { ...c, unread_count: 0 } 
            : c
        )
      );
      
      setSelectedConversations(new Set());
      setIsEditMode(false);
    } catch (error) {
      console.error("Error marking as read:", error);
    }
  };

  const deleteConversation = async (conversationId: number) => {
    try {
        Alert.alert(
            i18n.t('messages.deleteConversation'),
            i18n.t('messages.deleteConversationMessage'),
            [
                { text: i18n.t('messages.cancel'), style: "cancel" },
                { 
                    text: i18n.t('messages.delete'), 
                    style: "destructive", 
                    onPress: async () => {
                        try {
                            await supabase.from('messages').delete().eq('conversation_id', conversationId);
                            await supabase.from('conversation_participants').delete().eq('conversation_id', conversationId);
                            await supabase.from('conversations').delete().eq('conversation_id', conversationId);
                            setConversations(prev => prev.filter(c => c.conversation_id !== conversationId));
                        } catch (error) {
                            console.error('Error deleting conversation:', error);
                            Alert.alert(i18n.t('messages.error'), i18n.t('messages.failedToDelete'));
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
        const action = newPinStatus ? i18n.t('messages.pin') : i18n.t('messages.unpin');
        Alert.alert(i18n.t('messages.error'), i18n.t('messages.failedToPin').replace('{{action}}', action.toLowerCase()));
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
      
      console.log('🔄 Loading conversations for user:', user.user_id);
      
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
      console.log('✅ Conversations loaded successfully');
    } catch (error) {
      console.error('❌ Error loading conversations:', error);
      Alert.alert(i18n.t('messages.error'), i18n.t('messages.failedToLoad'));
      setConversations([]);
    } finally {
      setIsLoading(false);
      if (isRefreshing) setRefreshing(false);
    }
  }, [user?.user_id]);

  useFocusEffect(
    useCallback(() => {
      console.log('📱 Messages screen focused - reloading conversations');
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
    if (hours < 1) return i18n.t('messages.justNow');
    if (hours < 24) return i18n.t('messages.hoursAgo').replace('{{count}}', hours.toString());
    return i18n.t('messages.daysAgo').replace('{{count}}', days.toString());
  }; 
  
  const getAvatarUrl = (conversation: Conversation) => { 
    return conversation.other_user_avatar || conversation.other_user_profile_image || "https://via.placeholder.com/56"; 
  };
  
  const getDisplayName = (conversation: Conversation) => { 
    return conversation.other_user_full_name || conversation.other_user_name || "Unknown User"; 
  };
  
  const getLastMessagePreview = (conversation: Conversation) => { 
    return conversation.last_message || i18n.t('messages.noMessagesYet'); 
  };
  
  const isUserOnline = (lastSeen: string | null): boolean => {
    if (!lastSeen) return false;
    const lastSeenDate = new Date(lastSeen);
    const now = new Date();
    const diffMinutes = (now.getTime() - lastSeenDate.getTime()) / (1000 * 60);
    return diffMinutes < 5;
  };
  
  const handleConversationPress = async (conversationId: number) => {
    if (isEditMode) {
      toggleSelection(conversationId);
      return;
    }

    console.log('👆 Conversation pressed:', conversationId);
    
    if (user?.user_id) {
      await markConversationAsRead(conversationId, user.user_id);
    }
    
    router.push(`/chat/${conversationId}`);
  };
  
  const handleNotificationPress = () => { 
    router.push('/(tabs)/notifications'); 
  };

  const handleViewAllPinned = () => {
    router.push('/pinned');
  };

  const groupConversationsByListing = async (): Promise<(GroupedListing | Conversation)[]> => {
    const grouped: { [key: number]: GroupedListing } = {};
    const noListing: Conversation[] = [];
    
    const listingIds = [...new Set(conversations.map(c => c.listing_id).filter(Boolean))] as number[];
    
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
  
  const displayedPinnedConversations = pinnedConversations.slice(0, 3);
  
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
                    <Text style={styles.actionButtonText}>{isPinned ? i18n.t('messages.unpin') : i18n.t('messages.pin')}</Text>
                </Animated.View>
            </TouchableOpacity>

            <TouchableOpacity 
                style={[styles.actionButtonContainer, styles.deleteAction]}
                onPress={() => { row.current[index]?.close(); deleteConversation(item.conversation_id); }}
            >
                <Animated.View style={[styles.actionButton, { transform: [{ scale }] }]}>
                    <Ionicons name="trash-outline" size={24} color="white" />
                    <Text style={styles.actionButtonText}>{i18n.t('messages.delete')}</Text>
                </Animated.View>
            </TouchableOpacity>
        </View>
    );
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <Text style={styles.headerTitle}>{i18n.t('messages.inbox')}</Text>
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
        <Text style={styles.groupByText}>{i18n.t('messages.groupByListing')}</Text>
      </View>
    </View>
  );

  const renderSectionHeader = (title: string, actionText?: string, onActionPress?: () => void) => (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionTitleContainer}>
        {title === i18n.t('messages.pinned') && <Ionicons name="pin" size={16} color="#000" style={styles.pinIcon} />}
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      {actionText && onActionPress && (
        <TouchableOpacity onPress={onActionPress}>
          <Text style={styles.sectionAction}>{actionText}</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const renderEditSortButtons = () => (
    <View style={styles.editSortRow}>
      {!isEditMode ? (
        <>
          <TouchableOpacity 
            style={styles.editButton}
            onPress={() => setIsEditMode(true)}
          >
            <Ionicons name="create-outline" size={20} color="#000" />
            <Text style={styles.editText}>{i18n.t('messages.edit')}</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.sortButton}>
            <Ionicons name="funnel-outline" size={16} color="#00A78F" style={styles.sortIcon} />
            <Text style={styles.sortText}>{i18n.t('messages.sort')}</Text>
          </TouchableOpacity>
        </>
      ) : null}
    </View>
  );

  const renderEditModeBar = () => (
    <View style={styles.editModeBar}>
      <View style={styles.editModeLeft}>
        <TouchableOpacity
          style={styles.selectAllButton}
          onPress={() => {
            if (selectedConversations.size === conversations.length) {
              deselectAll();
            } else {
              selectAll();
            }
          }}
        >
          <View style={[
            styles.checkbox, 
            selectedConversations.size === conversations.length && styles.checkboxSelected
          ]}>
            {selectedConversations.size === conversations.length && (
              <Ionicons name="checkmark" size={18} color="white" />
            )}
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={deleteSelectedConversations}
          disabled={selectedConversations.size === 0}
          style={[styles.actionButton, selectedConversations.size === 0 && styles.actionButtonDisabled]}
        >
          <Text style={[styles.actionButtonText, selectedConversations.size === 0 && styles.actionButtonTextDisabled]}>
            {i18n.t('messages.delete')}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={markSelectedAsRead}
          disabled={selectedConversations.size === 0}
          style={[styles.actionButton, selectedConversations.size === 0 && styles.actionButtonDisabled]}
        >
          <Text style={[styles.actionButtonText, selectedConversations.size === 0 && styles.actionButtonTextDisabled]}>
            {i18n.t('messages.markRead')}
          </Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        onPress={() => {
          setIsEditMode(false);
          setSelectedConversations(new Set());
        }}
      >
        <Text style={styles.doneButton}>{i18n.t('messages.done')}</Text>
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
    const isSelected = selectedConversations.has(item.conversation_id);

    const renderContent = () => (
      <TouchableOpacity 
        style={[
          styles.conversationItem,
          hasUnread && styles.conversationItemUnread,
          isEditMode && isSelected && styles.selected
        ]} 
        onPress={() => handleConversationPress(item.conversation_id)}
      >
        <View style={styles.itemContent}>
          {isEditMode && (
            <View style={styles.checkboxContainer}>
              <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                {isSelected && <Ionicons name="checkmark" size={18} color="white" />}
              </View>
            </View>
          )}

          <View style={styles.avatarContainer}>
            <Image source={{ uri: getAvatarUrl(item) }} style={[styles.avatar, online && styles.avatarOnline]} />
            {item.is_premium && (
              <View style={styles.premiumLabelContainer}>
                <Text style={styles.premiumLabelText}>PREMIUM</Text>
              </View>
            )}
            {hasUnread && !isEditMode && <View style={styles.unreadDot} />}
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
        </View>
      </TouchableOpacity>
    );

    if (isEditMode) {
      return renderContent();
    }

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
        
        {!isGrouped && displayedPinnedConversations.length > 0 && (
            <>
                {renderSectionHeader(i18n.t('messages.pinned'), pinnedConversations.length > 3 ? i18n.t('messages.viewAll') : undefined, handleViewAllPinned)}
                {displayedPinnedConversations.map((item, index) => (
                    <React.Fragment key={`pinned-item-${item.conversation_id}`}>
                        {renderConversationItem({ item, index })}
                        {index < displayedPinnedConversations.length - 1 && <View style={styles.separator} />}
                    </React.Fragment>
                ))}
                <View style={styles.separator} />
            </>
        )}
        
        {!isGrouped && (
          <>
            {renderSectionHeader(i18n.t('messages.all'))}
            {renderEditSortButtons()} 
            {unpinnedConversations.length > 0 && <View style={styles.separator} />}
          </>
        )}

        {isGrouped && (
          <>
            {renderSectionHeader(i18n.t('messages.all'))}
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
        
        {isEditMode && renderEditModeBar()}

        {isLoading && !refreshing ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.loadingText}>{i18n.t('messages.loadingConversations')}</Text>
          </View>
        ) : conversations.length === 0 && !refreshing ? (
          <>
            {renderGroupBy()} 
            <View style={{ flex: 1, backgroundColor: '#fff' }}> 
                <Text style={styles.emptyStateTitle}>{i18n.t('messages.noMessages')}</Text>
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
  editModeBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#F8F8F8',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  editModeLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  selectAllButton: {
    padding: 4,
    marginRight: 12,
  },
  actionButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  actionButtonDisabled: {
    opacity: 0.4,
  },
  actionButtonText: {
    fontSize: 15,
    color: '#000',
    fontWeight: '500',
  },
  actionButtonTextDisabled: {
    color: '#999',
  },
  doneButton: {
    fontSize: 16,
    color: '#00A78F',
    fontWeight: '600',
  },
  checkboxContainer: {
    marginRight: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#ccc',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
  },
  checkboxSelected: {
    backgroundColor: '#00A78F',
    borderColor: '#00A78F',
  },
  selected: {
    backgroundColor: '#E8F5F3',
  },
  itemContent: {
    flexDirection: "row",
    alignItems: "center",
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
    backgroundColor: '#fff', 
    borderRadius: 20, 
    paddingVertical: 6, 
    paddingHorizontal: 12, 
    borderWidth:1,
    borderColor:'#00A78F'
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
    fontSize: 18,
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
  conversationItemUnread: {
    backgroundColor: '#E8F5F3',
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
  conversationSubHeader: {
    flexDirection: "row",
    alignItems: "center",
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
  unreadCountText: {
    fontSize: 13,
    color: '#00A78F',
    fontWeight: '600',
    marginLeft: 6,
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