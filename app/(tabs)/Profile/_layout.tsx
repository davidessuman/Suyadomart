// app/(tabs)/Profile/_layout.tsx
import { Stack } from 'expo-router';

export default function ProfileLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="seller" options={{ title: 'Seller Dashboard' }} />
    </Stack>
  );
}