import React from 'react';
import { View, Text } from 'react-native';

const AdminDashboard = () => {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text style={{ fontSize: 28, fontWeight: 'bold' }}>Welcome, Admin!</Text>
      <Text style={{ fontSize: 18, marginTop: 16 }}>This is your admin dashboard.</Text>
      {/* Add your admin controls and features here */}
    </View>
  );
};

export default AdminDashboard;
