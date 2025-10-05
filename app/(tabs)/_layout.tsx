import { Tabs } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

// Constants
const PRIMARY_COLOR = '#000000';
const INACTIVE_COLOR = '#999999';

/** 
 * Custom Messages Icon with Two Chat Bubbles (matching the photo)
 */
const TwoChatsIcon: React.FC<{ color: string; size: number }> = ({ color, size }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    {/* Back bubble (top right) */}
    <Path
      d="M18 3C19.66 3 21 4.34 21 6V12C21 13.66 19.66 15 18 15H16V17L14 15H12"
      stroke={color}
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
    {/* Front bubble (bottom left) - filled */}
    <Path
      d="M3 8C3 6.34 4.34 5 6 5H12C13.66 5 15 6.34 15 8V14C15 15.66 13.66 17 12 17H8L6 19V17H6C4.34 17 3 15.66 3 14V8Z"
      fill={color}
    />
    {/* Dots in front bubble */}
    <Circle cx="6.5" cy="11" r="1" fill="white" />
    <Circle cx="9" cy="11" r="1" fill="white" />
    <Circle cx="11.5" cy="11" r="1" fill="white" />
  </Svg>
);

/** 
 * Custom Tab Bar Button for the Central 'Add' Icon
 */
const AddButtonTab: React.FC<any> = ({ onPress }) => (
  <TouchableOpacity
    activeOpacity={0.8}
    onPress={onPress}
    style={styles.addButtonContainer}
  >
    <View style={styles.addIconWrapper}>
      <Icon name="plus" size={24} color={PRIMARY_COLOR} />
    </View>
  </TouchableOpacity>
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
          height: 100,
          borderTopWidth: 1,
          borderTopColor: '#E5E5E5',
          paddingBottom: 25,
          paddingTop: 10,
          elevation: 0,
          shadowOpacity: 0,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '500',
          marginTop: 2,
        },
      }}>

      {/* 1. Home Screen */}
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <Icon name="home-variant" size={24} color={color} />,
        }}
      />

      {/* 2. Map Screen */}
      <Tabs.Screen
        name="map"
        options={{
          title: 'Map',
          tabBarIcon: ({ color }) => <Icon name="map" size={24} color={color} />,
        }}
      />

      {/* 3. Add Screen (Central Button) */}
      <Tabs.Screen
        name="add"
        options={{
          title: 'Add',
          tabBarIcon: ({ color }) => <Icon name="plus" size={24} color={color} />,
        }}
      />

      {/* 4. Messages Screen */}
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

      {/* 5. Profile Screen */}
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => <Icon name="account" size={24} color={color} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  addButtonContainer: {
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingTop: 10,
  },
  addIconWrapper: {
    justifyContent: 'center',
    alignItems: 'center',
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