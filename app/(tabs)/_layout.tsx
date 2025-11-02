import { Tabs, useRouter, useSegments } from 'expo-router';
import React from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import i18n from '../../lib/i18n';

const ACTIVE_COLOR = '#00C853'; // green active icon/text
// --- REVERTED/UPDATED: Both are set to pure black for maximum visibility ---
const INACTIVE_COLOR = '#545151ff'; // Darkest possible color for inactive icon (was #9E9E9E)
const TEXT_COLOR = '#000000'; // Darkest possible color for inactive text (was #1C1C1C)

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

  const handleHomePress = () => router.push('/');

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: 'white',
          borderTopWidth: 1,
          borderTopColor: '#E5E5E5',
          height: Platform.OS === 'ios' ? 150 : 100,
          paddingBottom: Platform.OS === 'ios' ? 30 : 20,
          paddingTop: 15,
          elevation: 0,
          shadowColor: '#000',
          shadowOpacity: 0.1,
          shadowRadius: 4,
          shadowOffset: { width: 0, height: -2 },
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
                  color={isHome ? ACTIVE_COLOR : INACTIVE_COLOR} // Uses INACTIVE_COLOR (#000000)
                />
                <Text
                  style={[
                    styles.tabLabel,
                    // *** REVERTED: Now uses TEXT_COLOR (#000000) for consistency, same as INACTIVE_COLOR ***
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
            <Icon name="map" size={26} color={focused ? ACTIVE_COLOR : INACTIVE_COLOR} /> // Uses INACTIVE_COLOR (#000000)
          ),
          tabBarLabel: ({ focused }) => (
            <Text
              style={[
                styles.tabLabel,
                // *** REVERTED: Now uses TEXT_COLOR (#000000) ***
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
            <Icon name="plus" size={26} color={focused ? ACTIVE_COLOR : INACTIVE_COLOR} /> // Uses INACTIVE_COLOR (#000000)
          ),
          tabBarLabel: ({ focused }) => (
            <Text
              style={[
                styles.tabLabel,
                // *** REVERTED: Now uses TEXT_COLOR (#000000) ***
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
              <View style={styles.badge}>
                <Text style={styles.badgeText}>3</Text>
              </View>
            </View>
          ),
          tabBarLabel: ({ focused }) => (
            <Text
              style={[
                styles.tabLabel,
                // *** REVERTED: Now uses TEXT_COLOR (#000000) ***
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
            <Icon name="account" size={26} color={focused ? ACTIVE_COLOR : INACTIVE_COLOR} /> // Uses INACTIVE_COLOR (#000000)
          ),
          tabBarLabel: ({ focused }) => (
            <Text
              style={[
                styles.tabLabel,
                // *** REVERTED: Now uses TEXT_COLOR (#000000) ***
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
      <Tabs.Screen name="tenten" options={{ headerShown: false, href: null }} />
      <Tabs.Screen name="notification_settings" options={{ headerShown: false, href: null }} />
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
    fontWeight: '700', // makes text stronger
    marginTop: 3,
    color: TEXT_COLOR, // This will use the pure black TEXT_COLOR
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    opacity: 1, // Full opacity
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