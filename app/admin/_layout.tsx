import React from 'react';
import { Stack } from 'expo-router';
import { useColorScheme } from 'react-native';

const AdminLayout = () => {
  const colorScheme = useColorScheme();
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: {
          backgroundColor: colorScheme === 'dark' ? '#18181b' : '#fff',
        },
      }}
    />
  );
};

export default AdminLayout;
