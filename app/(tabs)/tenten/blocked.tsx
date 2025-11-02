import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../../../lib/Supabase";

// Constants
const PRIMARY_TEAL = "#16A085";
const DARK_GRAY = "#333333";

// Interface for a blocked user entry
interface BlockedUser {
  id: number;          // ID from the 'block' table
  blocked_id: number;  // The ID of the blocked user
  username: string;
}

// Function to safely get the current user ID
const getCurrentUserId = async (): Promise<number | null> => {
  try {
    const userIdString = await AsyncStorage.getItem('userId');
    const userId = parseInt(userIdString || '0');
    if (userId > 0) return userId;

    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user?.email) {
      const { data: dbUser } = await supabase
        .from('users')
        .select('user_id')
        .eq('email', session.user.email.toLowerCase())
        .single();
      return dbUser?.user_id || null;
    }
    return null;
  } catch (error) {
    console.error('Error getting current user ID:', error);
    return null;
  }
};


export default function BlockedUsersScreen() {
  const router = useRouter();
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);

  // Function to fetch the list of blocked users
  const fetchBlockedUsers = useCallback(async (userId: number) => {
    setLoading(true);
    try {
      // Fetch the 'block' table data, joining it with the 'users' table
      const { data, error } = await supabase
        .from('block')
        .select(`
          id, 
          blocked_id, 
          blocked_user:blocked_id (username)
        `)
        .eq('blocker_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Transform the data into the desired format
      const list: BlockedUser[] = (data || []).map(item => ({
        id: item.id,
        blocked_id: item.blocked_id,
        username: item.blocked_user?.username || 'Unknown User', // Extract username
      }));
      
      setBlockedUsers(list);

    } catch (error: any) {
      console.error('Error fetching blocked users:', error.message);
      Alert.alert('Error', 'Failed to load blocked users list.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Function to handle the unblock action
  const handleUnblockUser = async (userToUnblockId: number) => {
    if (!currentUserId) {
      Alert.alert("Error", "Please login to unblock users.");
      return;
    }

    Alert.alert(
      "Unblock User",
      "Are you sure you want to unblock this user? Their products may reappear in your feed.",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Unblock",
          style: "destructive",
          onPress: async () => {
            try {
              // Delete the entry from the 'block' table
              const { error } = await supabase.from('block')
                .delete()
                .eq('blocker_id', currentUserId)
                .eq('blocked_id', userToUnblockId);

              if (error) throw error;

              Alert.alert("Success", "User unblocked successfully.");
              
              // Remove the user from the local state and refresh home feed implicitly
              setBlockedUsers(prev => prev.filter(u => u.blocked_id !== userToUnblockId));
              
              // 🔥 Signal to the home page to reload data (e.g., via event, or simply rely on navigation)
              // For a robust app, a global state update or event emitter would be ideal here.

            } catch (error: any) {
              console.error("Error unblocking user:", error.message);
              Alert.alert("Error", "Failed to unblock user.");
            }
          }
        },
      ]
    );
  };
  
  // Initial load effect
  useEffect(() => {
    const loadUserAndData = async () => {
      const id = await getCurrentUserId();
      setCurrentUserId(id);
      if (id) {
        await fetchBlockedUsers(id);
      } else {
        setLoading(false);
      }
    };
    loadUserAndData();
    // Re-fetch on screen focus (if using a router that supports it)
    // You would typically use a listener here, but for simplicity, we rely on initial load.
  }, [fetchBlockedUsers]);

  // Render Item for FlatList
  const renderItem = ({ item }: { item: BlockedUser }) => (
    <View style={styles.userRow}>
      <Text style={styles.usernameText}>{item.username}</Text>
      <TouchableOpacity 
        style={styles.unblockButton} 
        onPress={() => handleUnblockUser(item.blocked_id)}
      >
        <Text style={styles.unblockText}>Unblock</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={28} color={DARK_GRAY} />
        </TouchableOpacity>
        <Text style={styles.title}>Blocked Users</Text>
        <View style={{ width: 28 }} />
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={PRIMARY_TEAL} style={styles.loading} />
      ) : blockedUsers.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="people-circle-outline" size={80} color="#ccc" />
          <Text style={styles.emptyText}>You haven't blocked any users yet.</Text>
          <Text style={styles.emptySubText}>Users you block will not be able to see your products, and you will not see theirs.</Text>
        </View>
      ) : (
        <FlatList
          data={blockedUsers}
          keyExtractor={(item) => String(item.blocked_id)}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: "#fff",
    paddingTop: 16, 
  },
  header: { 
    flexDirection: "row", 
    alignItems: "center", 
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginTop: 25,
    marginBottom: 10,
  },
  title: { 
    fontSize: 20, 
    fontWeight: "700",
    color: DARK_GRAY,
  },
  loading: {
    marginTop: 40,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
  },
  emptyText: { 
    marginTop: 15, 
    fontSize: 18, 
    fontWeight: '600',
    color: DARK_GRAY,
    textAlign: 'center',
  },
  emptySubText: {
    marginTop: 10,
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  userRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  usernameText: {
    fontSize: 16,
    color: DARK_GRAY,
    fontWeight: '500',
    flex: 1,
  },
  unblockButton: {
    backgroundColor: PRIMARY_TEAL,
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
  },
  unblockText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  }
});