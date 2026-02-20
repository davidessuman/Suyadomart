import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';

const AdminDashboard = () => {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    // sessionStorage is cleared when the browser tab is closed,
    // so every new tab/session requires a fresh admin login.
    const flag = sessionStorage.getItem('admin_authenticated');
    if (flag === 'true') {
      setAuthorized(true);
    } else {
      router.replace('/admin');
    }
    setChecking(false);
  }, []);

  if (checking) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!authorized) return null;

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text style={{ fontSize: 28, fontWeight: 'bold' }}>Welcome, Admin!</Text>
      <Text style={{ fontSize: 18, marginTop: 16 }}>This is your admin dashboard.</Text>
      {/* Add your admin controls and features here */}
    </View>
  );
};

export default AdminDashboard;