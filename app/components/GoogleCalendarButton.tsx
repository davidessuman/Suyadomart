import React from 'react';
import { Platform, TouchableOpacity, Text, Linking, StyleSheet, View } from 'react-native';

interface GoogleCalendarButtonProps {
  installed: boolean;
  onPress?: () => void;
}

export const GoogleCalendarButton: React.FC<GoogleCalendarButtonProps> = ({ installed, onPress }) => {
  const handlePress = () => {
    if (onPress) return onPress();
    if (installed) {
      // Try to open Google Calendar app
      if (Platform.OS === 'android') {
        Linking.openURL('intent://com.google.android.calendar/#Intent;scheme=package;end');
      } else if (Platform.OS === 'ios') {
        Linking.openURL('googlecalendar://');
      }
    } else {
      // Open store to download Google Calendar
      if (Platform.OS === 'android') {
        Linking.openURL('https://play.google.com/store/apps/details?id=com.google.android.calendar');
      } else if (Platform.OS === 'ios') {
        Linking.openURL('https://apps.apple.com/app/google-calendar/id909319292');
      }
    }
  };

  return (
    <TouchableOpacity style={styles.button} onPress={handlePress}>
      <Text style={styles.text}>{installed ? 'Open Google Calendar' : 'Get Google Calendar'}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    backgroundColor: '#4285F4',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginVertical: 8,
  },
  text: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
});
