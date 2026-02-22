import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import AdminProfile from './AdminProfile';

const AdminDashboard = () => {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    const checkAdminAccess = async () => {
      try {
        // Check sessionStorage authentication flag
        const flag = sessionStorage.getItem('admin_authenticated');
        if (flag !== 'true') {
          router.replace('/admin');
          setChecking(false);
          return;
        }

        // Get current user
        const { data } = await supabase.auth.getUser();
        const user = data?.user;

        if (!user) {
          sessionStorage.removeItem('admin_authenticated');
          router.replace('/admin');
          setChecking(false);
          return;
        }

        // Check if admin is active
        const { data: adminRecord, error } = await supabase
          .from('admins')
          .select('is_active')
          .eq('user_id', user.id)
          .single();

        if (error || !adminRecord) {
          sessionStorage.removeItem('admin_authenticated');
          Alert.alert('Error', 'Admin account not found');
          router.replace('/admin');
          setChecking(false);
          return;
        }

        // Check if admin is active
        if (!adminRecord.is_active) {
          sessionStorage.removeItem('admin_authenticated');
          Alert.alert(
            'Access Denied',
            'Your admin account has been deactivated. Please contact the master admin.'
          );
          router.replace('/admin');
          setChecking(false);
          return;
        }

        // All checks passed
        setAuthorized(true);
        setChecking(false);
      } catch (error) {
        console.error('Error checking admin access:', error);
        sessionStorage.removeItem('admin_authenticated');
        router.replace('/admin');
        setChecking(false);
      }
    };

    checkAdminAccess();
  }, [router]);

  if (checking) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!authorized) return null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Admin Dashboard</Text>
        <AdminProfile />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    width: '100%',
    paddingHorizontal: 20,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#0F172A',
  },
});

export default AdminDashboard;