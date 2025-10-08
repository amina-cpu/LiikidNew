import { Tabs } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const PRIMARY_COLOR = '#000000';
const INACTIVE_COLOR = '#999999';

const TwoChatsIcon: React.FC<{ color: string; size: number }> = ({ color, size }) => (
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

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: PRIMARY_COLOR,
        tabBarInactiveTintColor: INACTIVE_COLOR,
        headerShown: false,
        tabBarStyle: {
          backgroundColor: 'white',
          height: 120,
          borderTopWidth: 1,
          borderTopColor: '#E5E5E5',
          paddingBottom: 25,
          paddingTop: 10,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '500',
          marginTop: 2,
        },
      }}>

      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <Icon name="home-variant" size={24} color={color} />,
        }}
      />
      

      <Tabs.Screen
        name="map"
        options={{
          title: 'Map',
          tabBarIcon: ({ color }) => <Icon name="map" size={24} color={color} />,
        }}
      />

      <Tabs.Screen
        name="add"
        options={{
          title: 'Add',
          tabBarIcon: ({ color }) => <Icon name="plus" size={24} color={color} />,
        }}
      />

      <Tabs.Screen
        name="messages"
        options={{
          title: 'Messages',
          tabBarIcon: ({ color }) => (
            <View>
              <TwoChatsIcon color={color} size={24} />
              <View style={styles.badge}>
                <Text style={styles.badgeText}>3</Text>
              </View>
            </View>
          ),
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => <Icon name="account" size={24} color={color} />,
        }}
      />
       <Tabs.Screen
  name="filters"
  options={{
    headerShown: false,  // Move this inside options
    href: null, // This hides it from the tab bar
  }}
/>
<Tabs.Screen
  name="search"
  options={{
    headerShown: false,  // Move this inside options
    href: null, // This hides it from the tab bar
  }}
/>
 <Tabs.Screen
        name="product_detail"
        options={{
          href: null, // This hides it from the tab bar
        }}
      />
      {/* Hide category from tab bar */}
      <Tabs.Screen
        name="category"
        options={{
          href: null, // This hides it from the tab bar
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
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