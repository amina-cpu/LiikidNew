// In your _layout.tsx - Updated with real unread messages count

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Tabs, useRouter, useSegments } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import i18n from '../../lib/i18n';
import { supabase } from '../../lib/Supabase';
import { useAuth } from '../context/AuthContext';

const ACTIVE_COLOR = '#00C853';
const INACTIVE_COLOR = '#545151ff';
const TEXT_COLOR = '#000000';
const TAB_BAR_HEIGHT = Platform.OS === 'ios' ? 100 : 90;

const TwoChatsIcon = ({ color, size }: { color: string; size: number }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M18 3C19.66 3 21 4.34 21 6V12C21 13.66 19.66 15 18 15H16V17L14 15H12"
      stroke={color}
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
    <Path
      d="M3 8C3 6.34 4.34 5 6 5H12C13.66 5 15 6.34 15 8V14C15 15.66 13.66 17 12 17H8L6 19V17H6C4.34 17 3 15.66 3 14V8Z"
      fill={color}
    />
    <Circle cx="6.5" cy="11" r="1" fill="white" />
    <Circle cx="9" cy="11" r="1" fill="white" />
    <Circle cx="11.5" cy="11" r="1" fill="white" />
  </Svg>
);

const HomeTabButton = ({ children, onPress }: { children: React.ReactNode; onPress: () => void }) => (
  <TouchableOpacity onPress={onPress} style={styles.homeButton} activeOpacity={0.9}>
    {children}
  </TouchableOpacity>
);

export default function TabLayout() {
  const router = useRouter();
  const segments = useSegments();
  const currentRoute = segments.join('/');
  const isHome = currentRoute === '' || currentRoute === 'index';
  const { user } = useAuth();

  const tabBarTranslateY = useRef(new Animated.Value(0)).current;
  const [isTabBarVisible, setIsTabBarVisible] = useState(true);
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);

  const handleHomePress = () => router.push('/');

  // Fetch unread messages count
  const fetchUnreadMessagesCount = async () => {
    if (!user?.user_id) {
      setUnreadMessagesCount(0);
      return;
    }
    
    try {
      const { data, error } = await supabase
        .from('conversation_list_view')
        .select('unread_count')
        .eq('user_id', user.user_id);

      if (error) {
        console.error('Error fetching unread messages:', error);
        return;
      }

      // Sum up all unread counts from all conversations
      const totalUnread = data?.reduce((sum, conv) => sum + (conv.unread_count || 0), 0) || 0;
      console.log('📬 Total unread messages:', totalUnread);
      setUnreadMessagesCount(totalUnread);
    } catch (error) {
      console.error('Exception fetching unread messages:', error);
    }
  };

  // Fetch unread count on mount and when user changes
  useEffect(() => {
    fetchUnreadMessagesCount();
  }, [user?.user_id]);

  // Refresh unread count when returning to messages tab
  useEffect(() => {
    if (currentRoute === 'messages') {
      fetchUnreadMessagesCount();
    }
  }, [currentRoute]);

  // Poll for updates every 30 seconds
  useEffect(() => {
    if (!user?.user_id) return;
    
    const interval = setInterval(() => {
      fetchUnreadMessagesCount();
    }, 30000);

    return () => clearInterval(interval);
  }, [user?.user_id]);

  // ✅ FIX: Reset tab bar visibility when route changes
  useEffect(() => {
    // If not on home screen, always show tab bar
    if (!isHome) {
      AsyncStorage.setItem('tabBarVisible', 'true');
      setIsTabBarVisible(true);
      Animated.spring(tabBarTranslateY, {
        toValue: 0,
        useNativeDriver: true,
        tension: 80,
        friction: 10,
      }).start();
    }
  }, [currentRoute, isHome]);

  // Listen to visibility changes from AsyncStorage
  useEffect(() => {
    const checkVisibility = setInterval(async () => {
      try {
        const visibleStr = await AsyncStorage.getItem('tabBarVisible');
        const visible = visibleStr !== 'false';
        
        if (visible !== isTabBarVisible) {
          setIsTabBarVisible(visible);
          
          Animated.spring(tabBarTranslateY, {
            toValue: visible ? 0 : TAB_BAR_HEIGHT,
            useNativeDriver: true,
            tension: 80,
            friction: 10,
          }).start();
        }
      } catch (error) {
        console.error('Error reading tab bar visibility:', error);
      }
    }, 100);

    return () => clearInterval(checkVisibility);
  }, [isTabBarVisible]);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: 'white',
          borderTopWidth: 1,
          borderTopColor: '#E5E5E5',
          height: TAB_BAR_HEIGHT,
          paddingBottom: Platform.OS === 'ios' ? 30 : 15,
          paddingTop: 10,
          elevation: 8,
          shadowColor: '#000',
          shadowOpacity: 0.1,
          shadowRadius: 4,
          shadowOffset: { width: 0, height: -2 },
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          transform: [{ translateY: tabBarTranslateY }],
        },
      }}
    >
      {/* HOME */}
      <Tabs.Screen
        name="index"
        options={{
          tabBarButton: () => (
            <HomeTabButton onPress={handleHomePress}>
              <View style={styles.tabItem}>
                <Icon
                  name="home-variant"
                  size={26}
                  color={isHome ? ACTIVE_COLOR : INACTIVE_COLOR}
                />
                <Text
                  style={[
                    styles.tabLabel,
                    { color: isHome ? ACTIVE_COLOR : TEXT_COLOR },
                  ]}
                >
                  {i18n.t('tabs.home')}
                </Text>
              </View>
            </HomeTabButton>
          ),
        }}
      />

      {/* MAP */}
      <Tabs.Screen
        name="map"
        options={{
          tabBarIcon: ({ focused }) => (
            <Icon name="map" size={26} color={focused ? ACTIVE_COLOR : INACTIVE_COLOR} />
          ),
          tabBarLabel: ({ focused }) => (
            <Text
              style={[
                styles.tabLabel,
                { color: focused ? ACTIVE_COLOR : TEXT_COLOR },
              ]}
            >
              {i18n.t('tabs.map')}
            </Text>
          ),
        }}
      />

      {/* ADD */}
      <Tabs.Screen
        name="add"
        options={{
          tabBarIcon: ({ focused }) => (
            <Icon name="plus" size={26} color={focused ? ACTIVE_COLOR : INACTIVE_COLOR} />
          ),
          tabBarLabel: ({ focused }) => (
            <Text
              style={[
                styles.tabLabel,
                { color: focused ? ACTIVE_COLOR : TEXT_COLOR },
              ]}
            >
              {i18n.t('tabs.add')}
            </Text>
          ),
        }}
      />

      {/* MESSAGES */}
      <Tabs.Screen
        name="messages"
        options={{
          tabBarIcon: ({ focused }) => (
            <View>
              <TwoChatsIcon color={focused ? ACTIVE_COLOR : INACTIVE_COLOR} size={26} />
              {unreadMessagesCount > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>
                    {unreadMessagesCount > 9 ? '9+' : unreadMessagesCount}
                  </Text>
                </View>
              )}
            </View>
          ),
          tabBarLabel: ({ focused }) => (
            <Text
              style={[
                styles.tabLabel,
                { color: focused ? ACTIVE_COLOR : TEXT_COLOR },
              ]}
            >
              {i18n.t('tabs.messages')}
            </Text>
          ),
        }}
      />

      {/* PROFILE */}
      <Tabs.Screen
        name="profile"
        options={{
          tabBarIcon: ({ focused }) => (
            <Icon name="account" size={26} color={focused ? ACTIVE_COLOR : INACTIVE_COLOR} />
          ),
          tabBarLabel: ({ focused }) => (
            <Text
              style={[
                styles.tabLabel,
                { color: focused ? ACTIVE_COLOR : TEXT_COLOR },
              ]}
            >
              {i18n.t('tabs.profile')}
            </Text>
          ),
        }}
      />

      {/* Hidden Screens */}
      <Tabs.Screen name="editprofile" options={{ headerShown: false, href: null }} />
      <Tabs.Screen name="someonesProfile" options={{ headerShown: false, href: null }} />
      <Tabs.Screen name="settings" options={{ headerShown: false, href: null }} />
      <Tabs.Screen name="filters" options={{ headerShown: false, href: null }} />
      <Tabs.Screen name="search" options={{ headerShown: false, href: null }} />
      <Tabs.Screen name="product_detail" options={{ href: null }} />
      <Tabs.Screen name="category" options={{ href: null }} />
      <Tabs.Screen name="edit_listing" options={{ headerShown: false, href: null }} />
      <Tabs.Screen name="notifications" options={{ headerShown: false, href: null }} />
      <Tabs.Screen name="followers_list" options={{ headerShown: false, href: null }} />
      <Tabs.Screen name="following_list" options={{ headerShown: false, href: null }} />
      <Tabs.Screen name="notification_settings" options={{ headerShown: false, href: null }} />
      <Tabs.Screen name="tenten" options={{ headerShown: false, href: null }} />
      <Tabs.Screen 
        name="conversations" 
        options={{ 
          headerShown: false, 
          href: null 
        }} 
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  homeButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
  },
  tabLabel: {
    fontSize: 12,
    fontWeight: '700',
    marginTop: 3,
    color: TEXT_COLOR,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    opacity: 1,
  },
  badge: {
    position: 'absolute',
    right: -6,
    top: -4,
    backgroundColor: '#FF3B30',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
});