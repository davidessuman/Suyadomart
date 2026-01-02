import { Stack } from 'expo-router';
import { View, Text, StyleSheet } from 'react-native';

export default function NotFoundScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>404: NOT_FOUND</Text>
      <Text style={styles.code}>Code: NOT_FOUND</Text>
      <Text style={styles.id}>Sorry, the page you are looking for does not exist.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    padding: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#FF9900',
  },
  code: {
    fontSize: 18,
    marginBottom: 8,
    color: '#333',
  },
  id: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
});
