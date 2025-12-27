import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#FF9900', // Brand orange
        tabBarInactiveTintColor: '#888',
        tabBarStyle: {
          backgroundColor: '#000',
          borderTopWidth: 1,
          borderTopColor: '#1a1a1a',
          height: 60,
        },
        headerShown: false,
      }}
    >
      {/* HOME */}
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => (
            <Ionicons name="home" size={24} color={color} />
          ),
        }}
      />

      {/* SEARCH */}
      <Tabs.Screen
        name="search"
        options={{
          title: 'Search',
          tabBarIcon: ({ color }) => (
            <Ionicons name="search" size={24} color={color} />
          ),
        }}
      />

      {/* EVENTS — NEW TAB */}
      <Tabs.Screen
        name="events"
        options={{
          title: 'Events',
          tabBarIcon: ({ color }) => (
            <Ionicons name="calendar" size={24} color={color} />
          ),
        }}
      />

      {/* PROFILE */}
      <Tabs.Screen
        name="Profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => (
            <Ionicons name="person-circle" size={24} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
