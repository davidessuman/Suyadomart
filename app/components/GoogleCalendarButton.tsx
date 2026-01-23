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
    // Helper to format date for Google Calendar
    const formatDate = (date: Date) => {
      // Google Calendar expects: YYYYMMDDTHHmmssZ (UTC)
      return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
    };
    // Build event details for Google Calendar
    const params = event ? [
      `text=${encodeURIComponent(event.title)}`,
      event.description ? `details=${encodeURIComponent(event.description)}` : '',
      event.location ? `location=${encodeURIComponent(event.location)}` : '',
      event.start && event.end
        ? `dates=${formatDate(event.start)}/${formatDate(event.end)}`
        : '',
    ].filter(Boolean).join('&') : '';
    const webUrl = `https://calendar.google.com/calendar/r/eventedit${params ? '?' + params : ''}`;

    if (Platform.OS === 'web') {
      // Open Google Calendar event creation page with event details
      window.open(webUrl, '_blank');
      return;
    }
    if (Platform.OS === 'android') {
      if (installed && event) {
        // Open Google Calendar app with event details using intent
        const intentUrl =
          `intent://com.google.android.calendar/` +
          `?action=android.intent.action.INSERT` +
          `&title=${encodeURIComponent(event.title)}` +
          (event.description ? `&description=${encodeURIComponent(event.description)}` : '') +
          (event.location ? `&eventLocation=${encodeURIComponent(event.location)}` : '') +
          (event.start ? `&beginTime=${event.start.getTime()}` : '') +
          (event.end ? `&endTime=${event.end.getTime()}` : '') +
          `#Intent;scheme=content;package=com.google.android.calendar;end`;
        Linking.openURL(intentUrl);
      } else if (!installed) {
        // Open Play Store to download Google Calendar
        Linking.openURL('https://play.google.com/store/apps/details?id=com.google.android.calendar');
      } else {
        // Fallback: open web calendar
        Linking.openURL(webUrl);
      }
    } else if (Platform.OS === 'ios') {
      if (installed) {
        // No official URL scheme for event creation, fallback to web
        Linking.openURL(webUrl);
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
