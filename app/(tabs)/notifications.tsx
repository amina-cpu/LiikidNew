import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
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
} from 'react-native';
import { supabase } from '../../lib/Supabase';
import { useAuth } from '../context/AuthContext';

// Interface for the notification item (Sender/Product details are nested)
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

// Interface for the Notification Settings (matching the DB structure)
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

    const [notifications, setNotifications] = useState<NotificationItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchNotifications = async (isRefreshing = false) => {
        if (!user?.user_id) return;

        if (!isRefreshing) setLoading(true);

        try {
            // 1. Fetch the receiver's notification settings from the 'users' table
            const { data: userProfile, error: profileError } = await supabase
                .from('users')
                .select('notification_settings')
                .eq('user_id', user.user_id)
                .single();

            let currentSettings: NotificationSettings = { // Use default settings for safety
                newFollowers: true, likes: true, comments: true, mentions: true, 
                recommendedForYou: true, collectibleUpdates: true, liveBookmarked: true, 
                liveMightBeInterested: true, marketplace: true, orders: true 
            };
            
            if (profileError) {
                console.error("Fetch profile error:", profileError);
                // Continue with default settings (all enabled) on error
            } else if (userProfile?.notification_settings) {
                // Merge fetched settings with defaults to ensure all keys exist
                currentSettings = { ...currentSettings, ...userProfile.notification_settings };
            }

            // 2. Fetch ALL notifications for the user
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

            // 3. Filter the notifications based on the user's settings (THE FIX)
            const filteredNotifications = notifData.filter(notif => {
                switch (notif.type) {
                    case 'follow':
                        return currentSettings.newFollowers; // Only show if newFollowers is true
                    case 'like':
                        return currentSettings.likes; // Only show if likes is true
                    case 'comment':
                        return currentSettings.comments; // Only show if comments is true
                    case 'mention':
                        return currentSettings.mentions; // Only show if mentions is true
                    // You would add other notification types here
                    default:
                        return true; // Show all other types by default (e.g., recommendedForYou, orders)
                }
            });

            // 4. Get all product IDs from the filtered list that are not null
            const productIds = filteredNotifications
                .filter(n => n.product_id !== null)
                .map(n => n.product_id) as number[];

            let productsMap: { [key: number]: any } = {};

            // 5. Fetch product details if there are any
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

            // 6. Combine filtered notifications with product data
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

        // Subscribe to real-time changes
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
                // Trigger a full re-fetch to get new notification and re-apply filters
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

    // ... rest of your functions (markAsRead, handleNotificationPress, getNotificationText, etc.)
    // ... all other functions and styles are unchanged from your original file ...

    // The component structure (return statement) is also unchanged
    
    // NOTE: The `getNotificationText` function assumes your notification types are 'like', 'follow', and 'comment'.
    const getNotificationText = (item: NotificationItem) => {
        switch (item.type) {
            case 'like':
                return item.product?.name  
                    ? `liked your product "${item.product.name}" ❤️`
                    : 'liked your product ❤️';
            case 'follow':
                return 'started following you 👤';
            case 'comment':
                return 'commented on your post 💬';
            case 'mention':
                return 'mentioned you in a post 📣';
            default:
                return item.type;
        }
    };

    const getTimeAgo = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

        if (seconds < 60) return 'just now';
        if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
        if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
        if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
        return `${Math.floor(seconds / 604800)}w ago`;
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
        // Mark as read
        if (!item.is_read) {
            await markAsRead(item.notification_id);
        }

        // Navigate based on notification type
        if (item.type === 'like' && item.product_id) {
            router.push(`/product_detail?id=${item.product_id}`);
        } else if (item.type === 'follow') {
            router.push(`/someonesProfile?userId=${item.sender.user_id}`);
        } else {
            // Default: go to sender's profile
            router.push(`/someonesProfile?userId=${item.sender.user_id}`);
        }
    };

    const renderItem = ({ item }: { item: NotificationItem }) => (
        <TouchableOpacity
            style={[styles.item, !item.is_read && styles.unread]}
            onPress={() => handleNotificationPress(item)}
            activeOpacity={0.7}
        >
            <View style={styles.itemContent}>
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
                    {!item.is_read && <View style={styles.unreadDot} />}
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

    if (loading) {
        return (
            <View style={[styles.container, styles.centered]}>
                <ActivityIndicator size="large" color="#00A78F" />
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() =>  router.push('/(tabs)/messages')} style={styles.backButton}>
                    <Ionicons name="chevron-back" size={28} color="#000" />
                </TouchableOpacity>
                <Text style={styles.title}>Notifications</Text>
                <View style={styles.headerRight}>
                    {notifications.some(n => !n.is_read) && (
                        <TouchableOpacity
                            onPress={async () => {
                                const unreadIds = notifications
                                    .filter(n => !n.is_read)
                                    .map(n => n.notification_id);

                                if (unreadIds.length > 0) {
                                    await supabase
                                        .from('notifications')
                                        .update({ is_read: true })
                                        .in('notification_id', unreadIds);

                                    setNotifications(prev =>
                                        prev.map(n => ({ ...n, is_read: true }))
                                    );
                                }
                            }}
                        >
                            <Text style={styles.markAllRead}>Mark all read</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </View>

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
                        <Text style={styles.emptyText}>No notifications yet</Text>
                        <Text style={styles.emptySubtext}>
                            When someone likes your products or follows you, you'll see it here
                        </Text>
                    </View>
                )}
            />
        </SafeAreaView>
    );
};

// ... Styles (unchanged) ...
const styles = StyleSheet.create({
    container: {
        flex: 1,
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
        marginTop:30,
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
    markAllRead: {
        fontSize: 14,
        color: "#00A78F",
        fontWeight: '600',
    },
    listContent: {
        padding: 16,
        paddingBottom: 32,
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