import React from 'react';
import { Platform, TouchableOpacity, Text, Linking, StyleSheet } from 'react-native';


interface GoogleCalendarButtonProps {
  installed: boolean;
  onPress?: () => void;
  event?: {
    title: string;
    description?: string;
    location?: string;
    start: Date;
    end: Date;
  };
}

export const GoogleCalendarButton: React.FC<GoogleCalendarButtonProps> = ({ installed, onPress, event }) => {
  const handlePress = () => {
    if (onPress) return onPress();
    if (Platform.OS === 'web') {
      // Open Google Calendar event creation page with event details
      if (!event) {
        window.open('https://calendar.google.com/calendar/r/eventedit', '_blank');
        return;
      }
      const formatDate = (date: Date) => {
        // Google Calendar expects: YYYYMMDDTHHmmssZ (UTC)
        return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
      };
      const params = [
        `text=${encodeURIComponent(event.title)}`,
        event.description ? `details=${encodeURIComponent(event.description)}` : '',
        event.location ? `location=${encodeURIComponent(event.location)}` : '',
        event.start && event.end
          ? `dates=${formatDate(event.start)}/${formatDate(event.end)}`
          : '',
      ].filter(Boolean).join('&');
      const url = `https://calendar.google.com/calendar/r/eventedit?${params}`;
      window.open(url, '_blank');
      return;
    }
    if (Platform.OS === 'android') {
      if (installed) {
        // Open Google Calendar app
        Linking.openURL('intent://com.google.android.calendar/#Intent;scheme=package;end');
      } else {
        // Open Play Store to download Google Calendar
        Linking.openURL('https://play.google.com/store/apps/details?id=com.google.android.calendar');
      }
    } else if (Platform.OS === 'ios') {
      if (installed) {
        // Open Google Calendar app
        Linking.openURL('googlecalendar://');
      } else {
        // Open App Store to download Google Calendar
        Linking.openURL('https://apps.apple.com/app/google-calendar/id909319292');
      }
    }
  };

  let buttonText = 'Add to Google Calendar';
  if (Platform.OS === 'android' || Platform.OS === 'ios') {
    buttonText = installed ? 'Use Google Calendar' : 'Get Google Calendar';
  } else if (Platform.OS === 'web') {
    buttonText = 'Add to Google Calendar';
  }

  return (
    <TouchableOpacity style={styles.button} onPress={handlePress}>
      <Text style={styles.text}>{buttonText}</Text>
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
