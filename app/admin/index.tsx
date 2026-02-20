import React, { useState } from 'react';
import { View, Text, Modal, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ADMIN_CREDENTIALS = {
  username: 'admin',
  password: 'admin123', // Change this to your real admin password or use env/secure storage
};

const AdminPage = () => {
  const [authVisible, setAuthVisible] = useState(true);
  const [adminUsername, setAdminUsername] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const router = useRouter();

  const handleAdminLogin = () => {
    setAuthLoading(true);
    setTimeout(async () => {
      if (
        adminUsername === ADMIN_CREDENTIALS.username &&
        adminPassword === ADMIN_CREDENTIALS.password
      ) {
        await AsyncStorage.setItem('admin_authenticated', 'true');
        setIsAdmin(true);
        setAuthVisible(false);
        setAuthError('');
        // Navigate to dashboard after login
        setTimeout(() => {
          router.replace('/admin/dashboard');
        }, 300);
      } else {
        await AsyncStorage.removeItem('admin_authenticated');
        setAuthError('Access Denied: Invalid admin credentials');
        setTimeout(() => {
          router.replace('/onboarding');
        }, 1200);
      }
      setAuthLoading(false);
    }, 800);
  };

  if (!isAdmin) {
    return (
      <Modal visible={authVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.title}>Admin Login</Text>
            <TextInput
              style={styles.input}
              placeholder="Admin Username"
              value={adminUsername}
              onChangeText={setAdminUsername}
              autoCapitalize="none"
              editable={!authLoading}
            />
            <TextInput
              style={styles.input}
              placeholder="Admin Password"
              value={adminPassword}
              onChangeText={setAdminPassword}
              secureTextEntry
              editable={!authLoading}
            />
            {authError ? <Text style={styles.error}>{authError}</Text> : null}
            <TouchableOpacity
              style={styles.button}
              onPress={handleAdminLogin}
              disabled={authLoading}
            >
              {authLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Login</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.replace('/(tabs)')} style={styles.cancelBtn}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text style={{ fontSize: 24, fontWeight: 'bold' }}>Admin Control Panel</Text>
      <Text style={{ fontSize: 16, marginTop: 12 }}>Login to access the dashboard.</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: 320,
    alignItems: 'center',
    elevation: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  input: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    fontSize: 16,
  },
  button: {
    backgroundColor: '#ef4444',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 32,
    marginTop: 8,
    width: '100%',
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  error: {
    color: 'red',
    marginBottom: 8,
  },
  cancelBtn: {
    marginTop: 16,
  },
  cancelText: {
    color: '#888',
    fontSize: 15,
  },
});

export default AdminPage;
