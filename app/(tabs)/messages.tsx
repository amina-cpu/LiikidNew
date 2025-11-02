import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  FlatList,
  Image,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../../lib/Supabase";
import { useAuth } from "../context/AuthContext";

// Define the expected structure for notification settings
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

interface Message {
    id: string;
    name: string;
    message: string;
    time: string;
    avatar: string;
    itemImage: string;
}

// ... (pinnedMessages and allMessages arrays are unchanged)
const pinnedMessages: Message[] = [
    {
        id: "1",
        name: "Fashion Product",
        message: "Hey. U still got it",
        time: "2 months ago",
        avatar: "https://randomuser.me/api/portraits/women/15.jpg",
        itemImage:
            "https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/iphone14-pro-max-deeppurple-select?wid=940&hei=1112",
    },
    {
        id: "2",
        name: "Jackie",
        message: "Hello, do you have any mor...",
        time: "2 months ago",
        avatar: "https://randomuser.me/api/portraits/men/11.jpg",
        itemImage:
            "https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/iphone14-pro-max-deeppurple-select?wid=940&hei=1112",
    },
    {
        id: "3",
        name: "MR LEVI 😊",
        message: "Hi, is this still available?",
        time: "2 months ago",
        avatar: "https://randomuser.me/api/portraits/men/25.jpg",
        itemImage:
            "https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/iphone14-pro-max-deeppurple-select?wid=940&hei=1112",
    },
];

const allMessages: Message[] = [
    {
        id: "4",
        name: "Diana",
        message: "Can you send more pictures?",
        time: "1 month ago",
        avatar: "https://randomuser.me/api/portraits/women/44.jpg",
        itemImage:
            "https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/iphone14-pro-max-deeppurple-select?wid=940&hei=1112",
    },
    {
        id: "5",
        name: "Mike",
        message: "Thanks for your time!",
        time: "3 weeks ago",
        avatar: "https://randomuser.me/api/portraits/men/36.jpg",
        itemImage:
            "https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/iphone14-pro-max-deeppurple-select?wid=940&hei=1112",
    },
];


const MessagesScreen = () => {
    const router = useRouter();
    const { user } = useAuth();
    const [unreadCount, setUnreadCount] = useState(0);

    // ⭐ MODIFIED FUNCTION: Fetches settings and filters the count
    const loadUnreadCount = useCallback(async () => {
        if (!user?.user_id) return;

        try {
            // 1. Fetch the user's current notification settings
            const { data: userProfile, error: profileError } = await supabase
                .from('users')
                .select('notification_settings')
                .eq('user_id', user.user_id)
                .single();

            // Use default settings (all true) if fetch fails or data is missing
            const settings: NotificationSettings = { 
                newFollowers: true, likes: true, comments: true, mentions: true, 
                recommendedForYou: true, collectibleUpdates: true, liveBookmarked: true, 
                liveMightBeInterested: true, marketplace: true, orders: true,
                ...(userProfile?.notification_settings || {})
            };

            // 2. Determine which notification types should be counted
            const allowedTypes: string[] = [];
            if (settings.newFollowers) allowedTypes.push('follow');
            if (settings.likes) allowedTypes.push('like');
            if (settings.comments) allowedTypes.push('comment');
            if (settings.mentions) allowedTypes.push('mention');
            // Add other social notification types here if they are in the database

            // If no social notifications are enabled, the count will be 0 for these types
            if (allowedTypes.length === 0) {
                setUnreadCount(0);
                return;
            }

            // 3. Query the database using a filter for only the allowed types
            const { count, error } = await supabase
                .from("notifications")
                .select("*", { count: "exact", head: true })
                .eq("receiver_id", user.user_id)
                .eq("is_read", false)
                .in('type', allowedTypes); // ⭐ NEW FILTER: Only count enabled types

            if (error) {
                console.error("Error loading unread count:", error);
            } else {
                setUnreadCount(count || 0);
            }
        } catch (error) {
            console.error("Error loading unread count:", error);
            // Default to 0 on major error
            setUnreadCount(0); 
        }
    }, [user?.user_id]);

    useFocusEffect(
        useCallback(() => {
            loadUnreadCount();
        }, [loadUnreadCount])
    );

    useEffect(() => {
        if (!user?.user_id) return;

        const channel = supabase
            .channel("messages-notifications")
            .on(
                "postgres_changes",
                {
                    event: "*",
                    schema: "public",
                    table: "notifications",
                    filter: `receiver_id=eq.${user.user_id}`,
                },
                (payload) => {
                    console.log("Notification change in messages:", payload);
                    // Reload count to update the badge immediately
                    loadUnreadCount(); 
                }
            )
            .subscribe();

        return () => {
            channel.unsubscribe();
        };
    }, [user?.user_id, loadUnreadCount]);

    const renderMessage = ({ item }: { item: Message }) => (
        <TouchableOpacity style={styles.messageRow}>
            <View style={styles.leftSection}>
                <Image source={{ uri: item.avatar }} style={styles.avatar} />
                <View style={styles.textSection}>
                    <Text style={styles.name}>{item.name}</Text>
                    <Text style={styles.messageText} numberOfLines={1}>
                        {item.message}
                    </Text>
                </View>
            </View>
            <View style={styles.rightSection}>
                <Text style={styles.time}>{item.time}</Text>
                <Image source={{ uri: item.itemImage }} style={styles.itemImage} />
            </View>
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={styles.container}>
            {/* 🔹 Header */}
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Inbox</Text>
                <TouchableOpacity
                    style={styles.notificationButton}
                    onPress={() => router.push("/notifications")}
                >
                    <Ionicons name="notifications-outline" size={24} color="black" />
                    {/* ⭐ The badge now only appears if the filtered count is > 0 */}
                    {unreadCount > 0 && ( 
                        <View style={styles.badge}>
                            <Text style={styles.badgeText}>
                                {unreadCount > 99 ? "99+" : unreadCount}
                            </Text>
                        </View>
                    )}
                </TouchableOpacity>
            </View>

            {/* 🔹 Top controls */}
            <View style={styles.toggleContainer}>
                <Text style={styles.toggleText}>Group by listing</Text>
                <View style={styles.toggleSwitch}>
                    <View style={styles.toggleCircle} />
                </View>
            </View>

            {/* 🔹 Promo bar */}
            <View style={styles.promoBar}>
                <Text style={styles.promoText}>Get faster responses.</Text>
                <TouchableOpacity style={styles.tryFreeButton}>
                    <Text style={styles.tryFreeText}>Try for FREE</Text>
                </TouchableOpacity>
            </View>

            {/* 🔹 Unified FlatList for Pinned + All */}
            <FlatList
                ListHeaderComponent={
                    <>
                        {/* Pinned Header */}
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionTitle}>Pinned</Text>
                            <TouchableOpacity>
                                <Text style={styles.viewAll}>View all</Text>
                            </TouchableOpacity>
                        </View>
                    </>
                }
                data={[...pinnedMessages, { id: "separator", name: "", message: "", time: "", avatar: "", itemImage: "" }, ...allMessages]}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => {
                    if (item.id === "separator") {
                        return (
                            <>
                                {/* All Header */}
                                <View style={styles.sectionHeader}>
                                    <Text style={styles.sectionTitle}>All</Text>
                                    <TouchableOpacity>
                                        <Text style={styles.editText}>Edit</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity style={styles.sortButton}>
                                        <Ionicons name="funnel-outline" size={14} color="black" />
                                        <Text style={styles.sortText}>Sort: Default</Text>
                                    </TouchableOpacity>
                                </View>
                            </>
                        );
                    }
                    return renderMessage({ item });
                }}
                contentContainerStyle={{ paddingBottom: 30 }}
            />
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#fff" },
    header: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingHorizontal: 15,
        paddingVertical: 12,
        marginTop: 40,
    },
    headerTitle: { fontSize: 22, fontWeight: "700" },
    notificationButton: { position: "relative", padding: 4 },
    badge: {
        position: "absolute",
        top: 0,
        right: 0,
        minWidth: 18,
        height: 18,
        borderRadius: 9,
        backgroundColor: "#FF3B30",
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 4,
        borderWidth: 2,
        borderColor: "#fff",
    },
    badgeText: { fontSize: 10, fontWeight: "700", color: "#fff" },

    toggleContainer: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 15,
        paddingVertical: 6,
    },
    toggleText: { fontSize: 14, color: "#444" },
    toggleSwitch: {
        width: 36,
        height: 20,
        borderRadius: 10,
        backgroundColor: "#ccc",
        justifyContent: "center",
    },
    toggleCircle: {
        width: 16,
        height: 16,
        borderRadius: 8,
        backgroundColor: "#fff",
        marginLeft: 2,
    },

    promoBar: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        backgroundColor: "#EEE8FC",
        marginHorizontal: 15,
        borderRadius: 8,
        padding: 10,
        marginBottom: 10,
    },
    promoText: { color: "#4A148C", fontWeight: "600" },
    tryFreeButton: {
        backgroundColor: "#C8A2FF",
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
    },
    tryFreeText: { color: "#4A148C", fontWeight: "700" },

    sectionHeader: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 15,
        paddingVertical: 8,
    },
    sectionTitle: { fontSize: 16, fontWeight: "700" },
    viewAll: { color: "#007AFF", fontSize: 14 },
    editText: { color: "#007AFF", fontWeight: "600" },
    sortButton: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        borderWidth: 1,
        borderColor: "#ccc",
        borderRadius: 20,
        paddingHorizontal: 10,
        paddingVertical: 4,
    },
    sortText: { fontSize: 13, color: "#000" },

    messageRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingHorizontal: 15,
        paddingVertical: 12,
        borderBottomWidth: 0.5,
        borderBottomColor: "#eee",
    },
    leftSection: { flexDirection: "row", alignItems: "center", flex: 1 },
    avatar: { width: 44, height: 44, borderRadius: 22 },
    textSection: { marginLeft: 10, flex: 1 },
    name: { fontWeight: "600", fontSize: 15 },
    messageText: { color: "#666", fontSize: 13 },
    rightSection: { alignItems: "flex-end" },
    time: { color: "#999", fontSize: 12, marginBottom: 6 },
    itemImage: { width: 40, height: 40, borderRadius: 6 },
});

export default MessagesScreen;