import * as Calendar from 'expo-calendar';
import { Platform, Linking } from 'react-native';

export async function requestCalendarPermissions() {
  const { status } = await Calendar.requestCalendarPermissionsAsync();
  return status === 'granted';
}

export async function addEventToCalendar({
  title,
  notes,
  startDate,
  endDate,
  location,
}: {
  title: string;
  notes?: string;
  startDate: Date;
  endDate: Date;
  location?: string;
}): Promise<void> {
  const granted = await requestCalendarPermissions();
  if (!granted) throw new Error('Calendar permission not granted');

  const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
  const defaultCalendar = calendars.find(
    cal => cal.allowsModifications && (Platform.OS === 'ios' ? cal.source && cal.source.name === 'Default' : true)
  ) || calendars[0];

  if (!defaultCalendar) throw new Error('No modifiable calendar found');

  await Calendar.createEventAsync(defaultCalendar.id, {
    title,
    notes,
    startDate,
    endDate,
    location,
    timeZone: undefined,
  });

  // Open the event in the system calendar app if possible
  if (Platform.OS === 'ios') {
    Linking.openURL('calshow:' + new Date(startDate).getTime() / 1000);
  } else if (Platform.OS === 'android') {
    Linking.openURL('content://com.android.calendar/time/' + new Date(startDate).getTime());
  }

}
