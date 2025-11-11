import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Animated,
    FlatList,
    Image,
    RefreshControl,
    SafeAreaView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    Alert,
} from 'react-native';
import {
    GestureHandlerRootView,
    Swipeable,
} from 'react-native-gesture-handler';
import i18n from '../../lib/i18n';
import { supabase } from '../../lib/Supabase';
import { useAuth } from '../context/AuthContext';

interface NotificationItem {
    notification_id: number;
    type: string;
    is_read: boolean;
    created_at: string;
    product_id: number | null;
    post_id: number | null;
    sender: {
        user_id: number;
        username: string;
        full_name: string | null;
        profile_image_url: string | null;
    };
    product?: {
        id: number;
        name: string;
        image_url: string | null;
    };
}

interface NotificationSettings {
    newFollowers: boolean;
    likes: boolean;
    comments: boolean;
    mentions: boolean;
    recommendedForYou: boolean;
    collectibleUpdates: boolean;
    liveBookmarked: boolean;
    liveMightBeInterested: boolean;
    marketplace: boolean;
    orders: boolean;
}

const NotificationsScreen = () => {
    const router = useRouter();
    const { user } = useAuth();

    const row = useRef<Array<Swipeable | null>>([]);

    const [notifications, setNotifications] = useState<NotificationItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    
    // 🔥 NEW: Edit mode states
    const [isEditMode, setIsEditMode] = useState(false);
    const [selectedNotifications, setSelectedNotifications] = useState<Set<number>>(new Set());

    const deleteNotification = async (notificationId: number) => {
        try {
            const { error } = await supabase
                .from("notifications")
                .delete()
                .eq("notification_id", notificationId);

            if (error) {
                console.error("Error deleting notification:", error);
                return false;
            }

            setNotifications(prev => 
                prev.filter(n => n.notification_id !== notificationId)
            );
            
            console.log(`Notification ${notificationId} deleted successfully.`);
            return true;

        } catch (error) {
            console.error("Exception during notification deletion:", error);
            return false;
        }
    };

    // 🔥 NEW: Delete multiple notifications
    const deleteSelectedNotifications = async () => {
        if (selectedNotifications.size === 0) return;

        Alert.alert(
            'Delete Notifications',
            `Delete ${selectedNotifications.size} notification${selectedNotifications.size > 1 ? 's' : ''}?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            const idsToDelete = Array.from(selectedNotifications);
                            
                            const { error } = await supabase
                                .from("notifications")
                                .delete()
                                .in("notification_id", idsToDelete);

                            if (error) {
                                console.error("Error deleting notifications:", error);
                                return;
                            }

                            setNotifications(prev => 
                                prev.filter(n => !selectedNotifications.has(n.notification_id))
                            );
                            
                            setSelectedNotifications(new Set());
                            setIsEditMode(false);
                        } catch (error) {
                            console.error("Exception during bulk deletion:", error);
                        }
                    }
                }
            ]
        );
    };

    // 🔥 NEW: Mark selected as read
    const markSelectedAsRead = async () => {
        if (selectedNotifications.size === 0) return;

        try {
            const idsToUpdate = Array.from(selectedNotifications);
            
            await supabase
                .from('notifications')
                .update({ is_read: true })
                .in('notification_id', idsToUpdate);

            setNotifications(prev =>
                prev.map(n => 
                    selectedNotifications.has(n.notification_id) 
                        ? { ...n, is_read: true } 
                        : n
                )
            );
            
            setSelectedNotifications(new Set());
            setIsEditMode(false);
        } catch (error) {
            console.error("Error marking as read:", error);
        }
    };

    // 🔥 NEW: Toggle selection
    const toggleSelection = (notificationId: number) => {
        setSelectedNotifications(prev => {
            const newSet = new Set(prev);
            if (newSet.has(notificationId)) {
                newSet.delete(notificationId);
            } else {
                newSet.add(notificationId);
            }
            return newSet;
        });
    };

    // 🔥 NEW: Select all
    const selectAll = () => {
        const allIds = new Set(notifications.map(n => n.notification_id));
        setSelectedNotifications(allIds);
    };

    // 🔥 NEW: Deselect all
    const deselectAll = () => {
        setSelectedNotifications(new Set());
    };

    const fetchNotifications = async (isRefreshing = false) => {
        if (!user?.user_id) return;

        if (!isRefreshing) setLoading(true);

        try {
            const { data: userProfile, error: profileError } = await supabase
                .from('users')
                .select('notification_settings')
                .eq('user_id', user.user_id)
                .single();

            let currentSettings: NotificationSettings = { 
                newFollowers: true, likes: true, comments: true, mentions: true, 
                recommendedForYou: true, collectibleUpdates: true, liveBookmarked: true, 
                liveMightBeInterested: true, marketplace: true, orders: true 
            };
            
            if (!profileError && userProfile?.notification_settings) {
                currentSettings = { ...currentSettings, ...userProfile.notification_settings };
            }

            const { data: notifData, error: notifError } = await supabase
                .from("notifications")
                .select(
                    `notification_id,
                    type,
                    is_read,
                    created_at,
                    product_id,
                    post_id,
                    sender:users!fk_sender_id(
                        user_id,
                        username,
                        full_name,
                        profile_image_url
                    )`
                )
                .eq("receiver_id", user.user_id)
                .order("created_at", { ascending: false });

            if (notifError) {
                console.error("Fetch notifications error:", notifError);
                return;
            }

            if (!notifData || notifData.length === 0) {
                setNotifications([]);
                return;
            }

            const filteredNotifications = notifData.filter(notif => {
                switch (notif.type) {
                    case 'follow':
                        return currentSettings.newFollowers;
                    case 'like':
                        return currentSettings.likes;
                    case 'comment':
                        return currentSettings.comments;
                    case 'mention':
                        return currentSettings.mentions;
                    default:
                        return true;
                }
            });

            const productIds = filteredNotifications
                .filter(n => n.product_id !== null)
                .map(n => n.product_id) as number[];

            let productsMap: { [key: number]: any } = {};

            if (productIds.length > 0) {
                const { data: productsData, error: productsError } = await supabase
                    .from("products")
                    .select("id, name, image_url")
                    .in("id", productIds);

                if (!productsError && productsData) {
                    productsMap = productsData.reduce((acc, product) => {
                        acc[product.id] = product;
                        return acc;
                    }, {} as { [key: number]: any });
                }
            }

            const enrichedNotifications = filteredNotifications.map(notif => ({
                ...notif,
                product: notif.product_id ? productsMap[notif.product_id] : undefined,
            }));

            setNotifications(enrichedNotifications);

        } catch (error) {
            console.error("Error fetching notifications:", error);
        } finally {
            setLoading(false);
            if (isRefreshing) setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchNotifications();

        const channel = supabase
            .channel('notifications-realtime')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'notifications',
                    filter: `receiver_id=eq.${user?.user_id}`
                },
                (payload) => {
                    console.log('Notification change:', payload);
                    fetchNotifications(); 
                }
            )
            .subscribe();

        return () => {
            channel.unsubscribe();
        };
    }, [user]);

    const onRefresh = () => {
        setRefreshing(true);
        fetchNotifications(true);
    };
    
    const getNotificationText = (item: NotificationItem) => {
        switch (item.type) {
            case 'like':
                return item.product?.name  
                    ? i18n.t('notificationsScreen.likedProduct').replace('{{product}}', item.product.name)
                    : i18n.t('notificationsScreen.likedGeneric');
            case 'follow':
                return i18n.t('notificationsScreen.startedFollowing');
            case 'comment':
                return i18n.t('notificationsScreen.commented');
            case 'mention':
                return i18n.t('notificationsScreen.mentioned');
            default:
                return item.type;
        }
    };

    const getTimeAgo = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

        if (seconds < 60) return i18n.t('notificationsScreen.justNow');
        if (seconds < 3600) {
            const minutes = Math.floor(seconds / 60);
            return i18n.t('notificationsScreen.minutesAgo').replace('{{count}}', minutes.toString());
        }
        if (seconds < 86400) {
            const hours = Math.floor(seconds / 3600);
            return i18n.t('notificationsScreen.hoursAgo').replace('{{count}}', hours.toString());
        }
        if (seconds < 604800) {
            const days = Math.floor(seconds / 86400);
            return i18n.t('notificationsScreen.daysAgo').replace('{{count}}', days.toString());
        }
        const weeks = Math.floor(seconds / 604800);
        return i18n.t('notificationsScreen.weeksAgo').replace('{{count}}', weeks.toString());
    };

    const markAsRead = async (notificationId: number) => {
        await supabase
            .from("notifications")
            .update({ is_read: true })
            .eq("notification_id", notificationId);

        setNotifications(prev =>
            prev.map(n => n.notification_id === notificationId ? { ...n, is_read: true } : n)
        );
    };

    const handleNotificationPress = async (item: NotificationItem) => {
        // 🔥 In edit mode, toggle selection instead of navigating
        if (isEditMode) {
            toggleSelection(item.notification_id);
            return;
        }

        if (!item.is_read) {
            await markAsRead(item.notification_id);
        }

        if (item.type === 'like' && item.product_id) {
            router.push(`/product_detail?id=${item.product_id}`);
        } else if (item.type === 'follow') {
            router.push(`/someonesProfile?userId=${item.sender.user_id}`);
        } else {
            router.push(`/someonesProfile?userId=${item.sender.user_id}`);
        }
    };

    const renderRightActions = (
        progress: Animated.AnimatedInterpolation<number>,
        dragX: Animated.AnimatedInterpolation<number>,
        item: NotificationItem
    ) => {
        const scale = dragX.interpolate({
            inputRange: [-80, 0], 
            outputRange: [1, 0],
            extrapolate: 'clamp',
        });
        
        return (
            <TouchableOpacity 
                style={styles.deleteBackground}
                onPress={() => deleteNotification(item.notification_id)}
            >
                <Animated.View style={[styles.deleteButton, { transform: [{ scale }] }]}>
                    <Ionicons name="trash-outline" size={24} color="white" />
                    <Text style={styles.deleteButtonText}>Delete</Text>
                </Animated.View>
            </TouchableOpacity>
        );
    };

    const renderItem = ({ item, index }: { item: NotificationItem, index: number }) => {
        const isSelected = selectedNotifications.has(item.notification_id);

        const renderNotificationContent = () => (
            <TouchableOpacity
                style={[
                    styles.item, 
                    !item.is_read && styles.unread,
                    isEditMode && isSelected && styles.selected
                ]}
                onPress={() => handleNotificationPress(item)}
                activeOpacity={0.7}
            >
                <View style={styles.itemContent}>
                    {/* 🔥 NEW: Checkbox in edit mode */}
                    {isEditMode && (
                        <View style={styles.checkboxContainer}>
                            <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                                {isSelected && <Ionicons name="checkmark" size={18} color="white" />}
                            </View>
                        </View>
                    )}

                    <View style={styles.avatarContainer}>
                        {item.sender?.profile_image_url ? (
                            <Image
                                source={{ uri: item.sender.profile_image_url }}
                                style={styles.avatar}
                            />
                        ) : (
                            <View style={styles.avatarPlaceholder}>
                                <Text style={styles.avatarText}>
                                    {item.sender?.username?.charAt(0).toUpperCase() || 'U'}
                                </Text>
                            </View>
                        )}
                        {!item.is_read && !isEditMode && <View style={styles.unreadDot} />}
                    </View>

                    <View style={styles.textContainer}>
                        <Text style={styles.senderName}>
                            {item.sender?.full_name || item.sender?.username || 'User'}
                        </Text>
                        <Text style={styles.notificationText}>
                            {getNotificationText(item)}
                        </Text>
                        <Text style={styles.timeText}>{getTimeAgo(item.created_at)}</Text>
                    </View>

                    {item.product?.image_url && (
                        <Image
                            source={{ uri: item.product.image_url }}
                            style={styles.productThumbnail}
                        />
                    )}
                </View>
            </TouchableOpacity>
        );

        // 🔥 Disable swipe in edit mode
        if (isEditMode) {
            return renderNotificationContent();
        }

        return (
            <Swipeable
                ref={(ref) => row.current[index] = ref}
                friction={2}
                rightThreshold={40}
                renderRightActions={(progress, dragX) => renderRightActions(progress, dragX, item)}
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
                {renderNotificationContent()}
            </Swipeable>
        );
    };

    if (loading) {
        return (
            <View style={[styles.container, styles.centered]}>
                <ActivityIndicator size="large" color="#00A78F" />
            </View>
        );
    }

    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <SafeAreaView style={styles.container}>
                {/* 🔥 UPDATED HEADER */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.push('/(tabs)/messages')} style={styles.backButton}>
                        <Ionicons name="chevron-back" size={28} color="#000" />
                    </TouchableOpacity>
                    <Text style={styles.title}>{i18n.t('notificationsScreen.title')}</Text>
                    <View style={styles.headerRight}>
                        {!isEditMode && (
                            <TouchableOpacity
                                onPress={() => setIsEditMode(true)}
                                style={styles.editButton}
                            >
                                <Ionicons name="create-outline" size={20} color="#00A78F" />
                                <Text style={styles.editText}>Edit</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </View>

                {/* 🔥 NEW: Edit mode action bar */}
                {isEditMode && (
                    <View style={styles.editModeBar}>
                        <View style={styles.editModeLeft}>
                            <TouchableOpacity
                                style={styles.selectAllButton}
                                onPress={() => {
                                    if (selectedNotifications.size === notifications.length) {
                                        deselectAll();
                                    } else {
                                        selectAll();
                                    }
                                }}
                            >
                                <View style={[
                                    styles.checkbox, 
                                    selectedNotifications.size === notifications.length && styles.checkboxSelected
                                ]}>
                                    {selectedNotifications.size === notifications.length && (
                                        <Ionicons name="checkmark" size={18} color="white" />
                                    )}
                                </View>
                            </TouchableOpacity>

                            <TouchableOpacity
                                onPress={deleteSelectedNotifications}
                                disabled={selectedNotifications.size === 0}
                                style={[styles.actionButton, selectedNotifications.size === 0 && styles.actionButtonDisabled]}
                            >
                                <Text style={[styles.actionButtonText, selectedNotifications.size === 0 && styles.actionButtonTextDisabled]}>
                                    Delete
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                onPress={markSelectedAsRead}
                                disabled={selectedNotifications.size === 0}
                                style={[styles.actionButton, selectedNotifications.size === 0 && styles.actionButtonDisabled]}
                            >
                                <Text style={[styles.actionButtonText, selectedNotifications.size === 0 && styles.actionButtonTextDisabled]}>
                                    Mark unread
                                </Text>
                            </TouchableOpacity>
                        </View>

                        <TouchableOpacity
                            onPress={() => {
                                setIsEditMode(false);
                                setSelectedNotifications(new Set());
                            }}
                        >
                            <Text style={styles.doneButton}>Done</Text>
                        </TouchableOpacity>
                    </View>
                )}

                <FlatList
                    data={notifications}
                    renderItem={renderItem}
                    keyExtractor={(item) => item.notification_id.toString()}
                    contentContainerStyle={styles.listContent}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                            tintColor="#00A78F"
                            colors={["#00A78F"]}
                        />
                    }
                    ListEmptyComponent={() => (
                        <View style={styles.emptyContainer}>
                            <Ionicons name="notifications-off-outline" size={64} color="#ccc" />
                            <Text style={styles.emptyText}>{i18n.t('notificationsScreen.noNotifications')}</Text>
                            <Text style={styles.emptySubtext}>
                                {i18n.t('notificationsScreen.emptySubtext')}
                            </Text>
                        </View>
                    )}
                />
            </SafeAreaView>
        </GestureHandlerRootView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        marginBottom: 70,
        backgroundColor: "#fff",
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
        borderBottomWidth: 1,
        marginTop: 30,
        borderBottomColor: "#eee",
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
        width: 100,
        alignItems: 'flex-end',
    },
    editButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    editText: {
        fontSize: 16,
        color: '#00A78F',
        fontWeight: '600',
    },
    markAllRead: {
        fontSize: 14,
        color: "#00A78F",
        fontWeight: '600',
    },
    // 🔥 NEW: Edit mode bar styles
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
        gap: 12,
    },
    selectAllButton: {
        padding: 4,
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
    // 🔥 NEW: Checkbox styles
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
    listContent: {
        padding: 16,
        paddingBottom: 32,
    },
    deleteBackground: {
        backgroundColor: '#FF3B30',
        justifyContent: 'center',
        alignItems: 'flex-end',
        padding: 14,
        borderRadius: 12,
        marginBottom: 10,
    },
    deleteButton: {
        width: 75,
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
    },
    deleteButtonText: {
        color: 'white',
        fontWeight: '600',
        marginTop: 4,
        fontSize: 12,
    },
    item: {
        padding: 14,
        borderRadius: 12,
        backgroundColor: "#fafafa",
        marginBottom: 10,
    },
    unread: {
        backgroundColor: "#E8F5F3",
        borderLeftWidth: 3,
        borderLeftColor: "#00A78F",
    },
    itemContent: {
        flexDirection: "row",
        alignItems: "center",
    },
    avatarContainer: {
        position: 'relative',
        marginRight: 12,
    },
    avatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: "#ccc",
    },
    avatarPlaceholder: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: "#B695C0",
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarText: {
        fontSize: 20,
        fontWeight: '600',
        color: '#fff',
    },
    unreadDot: {
        position: 'absolute',
        top: 0,
        right: 0,
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: '#00A78F',
        borderWidth: 2,
        borderColor: '#fff',
    },
    textContainer: {
        flex: 1,
    },
    senderName: {
        fontSize: 15,
        fontWeight: "600",
        color: "#000",
        marginBottom: 2,
    },
    notificationText: {
        fontSize: 14,
        color: "#555",
        marginBottom: 4,
    },
    timeText: {
        fontSize: 12,
        color: "#999",
    },
    productThumbnail: {
        width: 50,
        height: 50,
        borderRadius: 8,
        backgroundColor: "#f0f0f0",
        marginLeft: 8,
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

export default NotificationsScreen;