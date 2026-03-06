import * as ImagePicker from 'expo-image-picker';
import * as IntentLauncher from 'expo-intent-launcher';
import * as Linking from 'expo-linking';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  Dimensions,
  ScrollView,
  StatusBar,
  Modal,
  Image,
  useColorScheme,
  Animated,
  RefreshControl,
  Platform,
} from 'react-native';
import { GoogleCalendarButton } from '@/components/GoogleCalendarButton';
import { supabase } from '@/lib/supabase';
import { ExpoCalendar } from '@/lib/expoCalendar';
import { useRouter } from 'expo-router';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';
import { getSelectedCampus } from '@/lib/campus';
import { DayEditorModal } from './components/DayEditorModal';
import { TimePickerInner } from './components/TimePickerInner';
import { SearchBar } from './components/SearchBar';
import { FilterModal } from './components/FilterModal';
import { NewEventModal } from './components/NewEventModal';
import { UserEventsModal } from './components/UserEventsModal';
import { UserAnnouncementsModal } from './components/UserAnnouncementsModal';
import { ActionMenuModal } from './components/ActionMenuModal';
import { AnnouncementModal } from './components/AnnouncementModal';
import { FullscreenFlyerModal } from './components/FullscreenFlyerModal';
import { AnnouncementDetailsModal } from './components/AnnouncementDetailsModal';
import { EventDetailsModal } from './components/EventDetailsModal';

// Helper to check if a date is more than 24 hours in the past
const isExpired = (dateStr: string) => {
  if (!dateStr) return false;
  const eventDate = new Date(dateStr);
  eventDate.setHours(23, 59, 59, 999); // End of event day
  const now = new Date();
  return now.getTime() > eventDate.getTime() + 24 * 60 * 60 * 1000;
};

// Delete expired events and announcements
const deleteExpiredItems = async () => {
  try {
    // Delete expired events
    const { data: eventsData, error: eventsError } = await supabase
      .from('events')
      .select('id, date');
    if (!eventsError && Array.isArray(eventsData)) {
      const expiredEventIds = eventsData.filter(e => isExpired(e.date)).map(e => e.id);
      if (expiredEventIds.length > 0) {
        await supabase.from('events').delete().in('id', expiredEventIds);
      }
    }

    // Delete expired announcements
    const { data: annData, error: annError } = await supabase
      .from('announcements')
      .select('id, announcement_dates');
    if (!annError && Array.isArray(annData)) {
      const expiredAnnIds = annData.filter(a => {
        if (!a.announcement_dates) return false;
        try {
          const dates = JSON.parse(a.announcement_dates);
          if (!Array.isArray(dates) || dates.length === 0) return false;
          return isExpired(dates[dates.length - 1]);
        } catch {
          return false;
        }
      }).map(a => a.id);
      if (expiredAnnIds.length > 0) {
        await supabase.from('announcements').delete().in('id', expiredAnnIds);
      }
    }
  } catch {
    // Optionally log error
  }
};

/* ---------------- THEME SYSTEM WITH DARK/LIGHT MODE - UNIFIED WITH HOME & SEARCH PAGES ---------------- */
export const LIGHT_COLORS = {
  background: '#FFFFFF',
  surface: '#F8F9FA',
  card: '#FFFFFF',
  text: '#121212',
  textSecondary: '#666666',
  textTertiary: '#999999',
  border: '#E0E0E0',
  primary: '#FF9900',
  primaryLight: '#FFCC80',
  error: '#FF3B30',
  success: '#34C759',
  warning: '#FF9500',
  info: '#007AFF',
  shadow: 'rgba(0,0,0,0.1)',
  overlay: 'rgba(255,255,255,0.9)',
  modalBackground: '#FFFFFF',
  modalOverlay: 'rgba(0,0,0,0.5)',
};

const DARK_COLORS = {
  background: '#121212',
  surface: '#1E1E1E',
  card: '#1E1E1E',
  text: '#FFFFFF',
  textSecondary: '#BBBBBB',
  textTertiary: '#888888',
  border: '#333333',
  primary: '#FF9900',
  primaryLight: '#FFB74D',
  error: '#FF3B30',
  success: '#34C759',
  warning: '#FF9500',
  info: '#007AFF',
  shadow: 'rgba(0,0,0,0.3)',
  overlay: 'rgba(0,0,0,0.7)',
  modalBackground: '#1E1E1E',
  modalOverlay: 'rgba(0,0,0,0.85)',
};

const getThemeColors = (isDarkMode: boolean) => isDarkMode ? DARK_COLORS : LIGHT_COLORS;
export type LightColors = typeof LIGHT_COLORS;

/* ---------------- TYPES ---------------- */
type EventCategory = 'General' | 'Entertainment' | 'Educational' | 'Political' | 'Religious';
type AppearanceType = 'Physical Meeting' | 'Virtual Meeting' | 'Both';
type OnlinePlatform = 'Zoom' | 'Google Meet' | 'Microsoft Teams' | 'YouTube Live' | 'TikTok Live'| 'Facebook Live' | 'Instagram Live';

interface EventItem {
  id: string;
  title: string;
  description: string;
  category: EventCategory;
  appearance: AppearanceType;
  date: string;
  startTime?: string;
  endTime?: string;
  venue?: string;
  platform?: string;
  link?: string;
  organizer: string;
  flyer?: string;
  perDayDescriptions?: Record<string, string>;
  perDayTimes?: Record<string, { startTime: string; endTime: string }>;
  perDayVenues?: Record<string, string>;
  university: string;
}

interface DayDetails {
  startTime: string;
  endTime: string;
  description: string;
  venue?: string;
  platform?: string;
  link?: string;
}

interface AlertButton {
  text: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive';
}

interface AlertState {
  visible: boolean;
  title: string;
  message: string;
  buttons: AlertButton[];
}

export interface SearchSuggestion {
  id: string;
  title: string;
  organizer: string;
  type: 'title' | 'organizer' | 'announcementTitle' | 'announcedFor';
}

const getTodayUTC = () => new Date().toISOString().split('T')[0];
const CATEGORIES: EventCategory[] = ['General', 'Entertainment', 'Educational', 'Political', 'Religious'];

/* --------------- CUSTOM ALERT COMPONENT --------------- */
const CustomAlert: React.FC<{
  visible: boolean;
  title: string;
  message: string;
  buttons: AlertButton[];
  onClose: () => void;
  colors: typeof LIGHT_COLORS;
}> = ({ visible, title, message, buttons, onClose, colors }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  useEffect(() => {
    if (visible) {
      fadeAnim.setValue(0);
      slideAnim.setValue(50);
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 100,
          friction: 10,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, fadeAnim, slideAnim]);

  if (!visible) return null;

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      onRequestClose={onClose}
    >
      <View style={[{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' }]}>
        <Animated.View
          style={[
            {
              backgroundColor: colors.card,
              borderRadius: 15,
              padding: 20,
              width: '85%',
              maxWidth: 400,
              borderWidth: 1,
              borderColor: colors.border,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.25,
              shadowRadius: 3.84,
              elevation: 5,
            },
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <Text style={[{ fontSize: 18, fontWeight: 'bold', marginBottom: 12, color: colors.text, textAlign: 'center' }]}>
            {title}
          </Text>
          <Text style={[{ fontSize: 15, marginBottom: 20, textAlign: 'center', lineHeight: 22, color: colors.textSecondary }]}>
            {message}
          </Text>
          <View style={[{ flexDirection: 'row', justifyContent: 'space-between', gap: 10 }]}>
            {buttons.map((button, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  {
                    flex: 1,
                    padding: 12,
                    borderRadius: 10,
                    alignItems: 'center',
                    backgroundColor: index === 0 ? colors.primary : colors.surface,
                    borderWidth: index === 0 ? 0 : 1,
                    borderColor: index === 0 ? colors.primary : colors.border,
                  },
                ]}
                onPress={() => {
                  button.onPress?.();
                  onClose();
                }}
              >
                <Text
                  style={[{
                    fontSize: 15,
                    fontWeight: '600',
                    color: index === 0 ? '#fff' : colors.text,
                  }]}
                >
                  {button.text}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};
const APPEARANCES: AppearanceType[] = ['Physical Meeting', 'Virtual Meeting', 'Both'];
const PLATFORMS: OnlinePlatform[] = ['Zoom', 'Google Meet', 'Microsoft Teams', 'YouTube Live', 'TikTok Live', 'Facebook Live', 'Instagram Live'];

// Gradient backgrounds for different event categories (unused)
/* const CATEGORY_GRADIENTS = {
  'General': ['#FF6B35', '#FF9E7A'],
  'Entertainment': ['#9F7AEA', '#D6BCFA'],
  'Educational': ['#38B2AC', '#81E6D9'],
  'Political': ['#ED8936', '#FBD38D'],
  'Religious': ['#4299E1', '#90CDF4'],
  'All': ['#b36e06ff', '#df7905ff'],
}; */

/* ---------------- HELPER: Convert 12h to 24h minutes ---------------- */
export const timeToMinutes = (time: string): number => {
  if (!time) return 0;
  const parts = time.split(' ');
  const timePart = parts[0];
  const period = parts[1];
  const [hStr, mStr] = timePart.split(':');
  let h = parseInt(hStr, 10) || 0;
  const m = parseInt(mStr, 10) || 0;

  if (period === 'AM' || period === 'PM') {
    let hours = h % 12;
    if (period === 'PM') hours += 12;
    return hours * 60 + m;
  }

  return (h % 24) * 60 + m;
};

/* ---------------- HELPER: Format date to full date string ---------------- */
export const formatFullDate = (dateStr: string) => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
};

/* ---------------- HELPER: Format date to short string ---------------- */
export const formatShortDate = (dateStr: string) => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric',
    year: 'numeric'
  });
};

/* ---------------- HELPER: Format time display ---------------- */
const formatTimeDisplay = (time: string, is24Hour: boolean = false) => {
  if (!time) return '--:--';
  
  const [timePart, period] = time.split(' ');
  if (!timePart) return '--:--';
  
  const [hours, minutes] = timePart.split(':');
  
  if (is24Hour || !period) {
    return `${hours}:${minutes}`;
  }
  
  return `${hours}:${minutes} ${period}`;
};

/* ---------------- HELPER: Calculate duration between two times ---------------- */
export const calculateDuration = (startTime: string, endTime: string) => {
  if (!startTime || !endTime) return '';
  
  const startMinutes = timeToMinutes(startTime);
  const endMinutes = timeToMinutes(endTime);
  
  if (endMinutes <= startMinutes) {
    const diff = (endMinutes + 24 * 60) - startMinutes;
    const hours = Math.floor(diff / 60);
    const minutes = diff % 60;
    
    if (hours === 0) return `${minutes}m`;
    if (minutes === 0) return `${hours}h`;
    return `${hours}h ${minutes}m`;
  }
  
  const diff = endMinutes - startMinutes;
  const hours = Math.floor(diff / 60);
  const minutes = diff % 60;
  
  if (hours === 0) return `${minutes}m`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
};

export { TimePickerInner };

/* ---------------- FILTER TYPES ---------------- */
type FilterType = 
  | 'All' 
  | 'Today' 
  | 'Tomorrow' 
  | 'This Week' 
  | 'This Month' 
  | 'Next Month'
  | `Specific Day: ${string}`
  | `Selected Days: ${string}`;

type PublishKind = 'event' | 'announcement';
type PublishOverlayState = {
  visible: boolean;
  kind: PublishKind;
  phase: 'processing' | 'success';
  message: string;
};

type UploadKind = 'eventFlyer' | 'announcementFlyer';
type UploadOverlayState = {
  visible: boolean;
  kind: UploadKind;
  phase: 'processing' | 'success';
  message: string;
};

/* ---------------- MAIN COMPONENT ---------------- */
export default function EventsScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === 'dark';
  const colors = getThemeColors(isDarkMode);

  // Screen dimensions for responsive design
  const [screenDimensions, setScreenDimensions] = useState(Dimensions.get('window'));
  const screenWidth = screenDimensions.width;
  
  // Responsive breakpoints
  const isMobile = screenWidth < 768;
  const isTablet = screenWidth >= 768 && screenWidth < 1024;


  // Alert state
  const [alertState, setAlertState] = useState<AlertState>({
    visible: false,
    title: '',
    message: '',
    buttons: [{ text: 'OK' }],
  });
  const styles = createStyles(colors);

  const [events, setEvents] = useState<EventItem[]>([]);
  const [userUniversity, setUserUniversity] = useState<string>('');
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [feedView, setFeedView] = useState<'events' | 'announcements'>('announcements');
  const [allAnnouncements, setAllAnnouncements] = useState<any[]>([]);

  // Search state
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchSuggestions, setSearchSuggestions] = useState<SearchSuggestion[]>([]);
  const [searchedEvents, setSearchedEvents] = useState<EventItem[]>([]);
  const [isSearchActive, setIsSearchActive] = useState<boolean>(false);

  // Filter state
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterType>('All');
  const [filterTimeRange] = useState<{ startTime: string; endTime: string } | null>(null);
  const [, setFilterSpecificDate] = useState<string | null>(null);
  const [filterSelectedDays] = useState<string[]>([]);

  const [activeCategory, setActiveCategory] = useState<EventCategory | 'All'>('All');
  const [showActionMenu, setShowActionMenu] = useState(false);
  const [showUserEvents, setShowUserEvents] = useState(false);
  const [showUserAnnouncements, setShowUserAnnouncements] = useState(false);
  const [showEventDetails, setShowEventDetails] = useState(false);
  // State for fullscreen event description modal
  const [showDescriptionModal, setShowDescriptionModal] = useState(false);
  // State for fullscreen general description modal
  const [showGeneralDescriptionModal, setShowGeneralDescriptionModal] = useState(false);
  const [showAnnouncementDetails, setShowAnnouncementDetails] = useState(false);
  const [viewingAnnouncementFromMyList, setViewingAnnouncementFromMyList] = useState(false);
  const [showFullScreenImage, setShowFullScreenImage] = useState(false);
  const [fullScreenImageUrl, setFullScreenImageUrl] = useState<string>('');
  const [isViewingOwnEvent, setIsViewingOwnEvent] = useState(false);
  const [userEvents, setUserEvents] = useState<EventItem[]>([]);
  const [userAnnouncements, setUserAnnouncements] = useState<any[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<EventItem | null>(null);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<any>(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isEditingEvent, setIsEditingEvent] = useState(false);
  const [isAnnouncementModalVisible, setIsAnnouncementModalVisible] = useState(false);
  const [showAnnouncementDatePicker, setShowAnnouncementDatePicker] = useState(false);
  const [showAnnouncementCalendar, setShowAnnouncementCalendar] = useState(false);
  const [selectedAnnouncementDates, setSelectedAnnouncementDates] = useState<string[]>([getTodayUTC()]);
  const [announcementDayDetails, setAnnouncementDayDetails] = useState<Record<string, { fromTime?: string; toTime?: string }>>({});
  const [showAnnouncementDayEditor, setShowAnnouncementDayEditor] = useState(false);
  const [editingAnnouncementDayIndex, setEditingAnnouncementDayIndex] = useState(0);
  const [editingAnnouncementDayDate, setEditingAnnouncementDayDate] = useState('');
  const [showFlyerFullView, setShowFlyerFullView] = useState(false);
  const [bannerIndex, setBannerIndex] = useState(0);
  const [showCalendar, setShowCalendar] = useState(false);
  const [showFullScreenMessageEditor, setShowFullScreenMessageEditor] = useState(false);
  const [selectedDates, setSelectedDates] = useState<string[]>([getTodayUTC()]);
  const [dayDetails, setDayDetails] = useState<Record<string, DayDetails>>({});
  const [showDayEditor, setShowDayEditor] = useState(false);
  const [editingDayIndex, setEditingDayIndex] = useState(0);
  const [editingDayDate, setEditingDayDate] = useState('');
  const [publishOverlay, setPublishOverlay] = useState<PublishOverlayState>({
    visible: false,
    kind: 'event',
    phase: 'processing',
    message: '',
  });
  const [uploadOverlay, setUploadOverlay] = useState<UploadOverlayState>({
    visible: false,
    kind: 'eventFlyer',
    phase: 'processing',
    message: '',
  });

  // Animated values for loading screen
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const dotsAnim1 = useRef(new Animated.Value(0)).current;
  const dotsAnim2 = useRef(new Animated.Value(0)).current;
  const dotsAnim3 = useRef(new Animated.Value(0)).current;
  const publishOverlayTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const publishOverlayStartedAtRef = useRef<number>(0);
  const uploadOverlayTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearPublishOverlayTimer = useCallback(() => {
    if (publishOverlayTimerRef.current) {
      clearTimeout(publishOverlayTimerRef.current);
      publishOverlayTimerRef.current = null;
    }
  }, []);

  const clearUploadOverlayTimer = useCallback(() => {
    if (uploadOverlayTimerRef.current) {
      clearTimeout(uploadOverlayTimerRef.current);
      uploadOverlayTimerRef.current = null;
    }
  }, []);

  const startPublishFlow = useCallback((kind: PublishKind) => {
    clearPublishOverlayTimer();
    publishOverlayStartedAtRef.current = Date.now();
    setPublishOverlay({
      visible: true,
      kind,
      phase: 'processing',
      message: kind === 'event' ? 'Publishing your event...' : 'Posting your announcement...',
    });
  }, [clearPublishOverlayTimer]);

  const completePublishFlow = useCallback((kind: PublishKind) => {
    clearPublishOverlayTimer();
    const elapsed = Date.now() - publishOverlayStartedAtRef.current;
    const remaining = Math.max(0, 5000 - elapsed);

    const showSuccess = () => {
      setPublishOverlay({
        visible: true,
        kind,
        phase: 'success',
        message: kind === 'event' ? 'Event published successfully.' : 'Announcement posted successfully.',
      });
      publishOverlayTimerRef.current = null;
    };

    if (remaining > 0) {
      publishOverlayTimerRef.current = setTimeout(showSuccess, remaining);
      return;
    }

    showSuccess();
  }, [clearPublishOverlayTimer]);

  const stopPublishFlow = useCallback(() => {
    clearPublishOverlayTimer();
    setPublishOverlay(prev => ({ ...prev, visible: false }));
  }, [clearPublishOverlayTimer]);

  const acknowledgePublishSuccess = useCallback(() => {
    clearPublishOverlayTimer();
    setPublishOverlay(prev => ({ ...prev, visible: false }));
  }, [clearPublishOverlayTimer]);

  const startUploadFlow = useCallback((kind: UploadKind) => {
    clearUploadOverlayTimer();
    setUploadOverlay({
      visible: true,
      kind,
      phase: 'processing',
      message: kind === 'eventFlyer' ? 'Uploading event flyer...' : 'Uploading announcement flyer...',
    });
  }, [clearUploadOverlayTimer]);

  const completeUploadFlow = useCallback((kind: UploadKind) => {
    clearUploadOverlayTimer();
    setUploadOverlay({
      visible: true,
      kind,
      phase: 'success',
      message: kind === 'eventFlyer' ? 'Event flyer uploaded.' : 'Announcement flyer uploaded.',
    });
    uploadOverlayTimerRef.current = setTimeout(() => {
      setUploadOverlay(prev => ({ ...prev, visible: false }));
      uploadOverlayTimerRef.current = null;
    }, 900);
  }, [clearUploadOverlayTimer]);

  const stopUploadFlow = useCallback(() => {
    clearUploadOverlayTimer();
    setUploadOverlay(prev => ({ ...prev, visible: false }));
  }, [clearUploadOverlayTimer]);

  useEffect(() => {
    return () => {
      clearPublishOverlayTimer();
      clearUploadOverlayTimer();
    };
  }, [clearPublishOverlayTimer, clearUploadOverlayTimer]);

  // Add reminder to device calendar using Expo Calendar
  const [showGoogleCalendarOption, setShowGoogleCalendarOption] = useState(false);
  const [, setGoogleCalendarInstalled] = useState(false);

  // Helper to check if Google Calendar is installed
  const checkGoogleCalendarInstalled = async () => {
    if (Platform.OS === 'android') {
      try {
        const supported = await Linking.canOpenURL('intent://com.google.android.calendar/#Intent;scheme=package;end');
        setGoogleCalendarInstalled(supported);
      } catch {
        setGoogleCalendarInstalled(false);
      }
    } else if (Platform.OS === 'ios') {
      try {
        const supported = await Linking.canOpenURL('googlecalendar://');
        setGoogleCalendarInstalled(supported);
      } catch {
        setGoogleCalendarInstalled(false);
      }
    } else {
      setGoogleCalendarInstalled(false);
    }
  };

  useEffect(() => {
    if (showGoogleCalendarOption) checkGoogleCalendarInstalled();
  }, [showGoogleCalendarOption]);

  const handleAddReminderToCalendar = async () => {
    if (!reminderEvent || !reminderSelections.length) return;
    const eventDateTime = buildDateFromStrings(reminderEvent.date, reminderEvent.startTime);
    // Validate all reminders
    for (const sel of reminderSelections) {
      for (const time of sel.times) {
        const reminderDateTime = buildDateFromStrings(sel.date, time);
        if (!reminderDateTime || !eventDateTime || reminderDateTime >= eventDateTime) {
          showAlert('Invalid Reminder', 'All reminders must be set before the event start time.');
          return;
        }
      }
    }
    try {
      const summary = (reminderEvent.title || '').replace(/\r?\n/g, ' ');
      const description = reminderEvent.description || '';
      const location = reminderEvent.venue || '';
      let deviceCalendarSuccess = false;
      if (Platform.OS !== 'web' && ExpoCalendar) {
        try {
          for (const sel of reminderSelections) {
            for (const time of sel.times) {
              const startDate = buildDateFromStrings(sel.date, time);
              const endDate = new Date(startDate.getTime() + 60 * 60 * 1000);
              await ExpoCalendar.createEventAsync(
                (await ExpoCalendar.getDefaultCalendarAsync())?.id,
                {
                  title: summary,
                  startDate,
                  endDate,
                  location,
                  notes: description,
                  timeZone: undefined,
                }
              );
            }
          }
          setReminderModalVisible(false);
          showAlert('Success', 'Reminders added to your calendar.');
          deviceCalendarSuccess = true;
        } catch {
          // Device calendar failed, fallback to Google Calendar
          deviceCalendarSuccess = false;
        }
      }
      if (!deviceCalendarSuccess) {
        setShowGoogleCalendarOption(true);
        showAlert('Calendar Not Available', 'Your device calendar is not available or does not support reminders. You can add to Google Calendar instead.');
      }
    } catch {
      setShowGoogleCalendarOption(true);
      showAlert('Error', 'Could not add reminders to your device calendar. You can add to Google Calendar instead.');
    }
  };
    // --- Reminder Modal State ---
      // Render Google Calendar option if device calendar is unavailable
      const renderGoogleCalendarOption = () => {
        if (!showGoogleCalendarOption) return null;
        // Prepare event details for Google Calendar (web)
        let eventProps: {
          title: string;
          description?: string;
          location?: string;
          start?: Date;
          end?: Date;
        } = { title: '' };
        if (reminderEvent) {
          // Use the first reminder as the event time for add-to-calendar
          let start: Date | undefined = undefined;
          let end: Date | undefined = undefined;
          if (reminderSelections.length && reminderSelections[0].times.length) {
            start = buildDateFromStrings(reminderSelections[0].date, reminderSelections[0].times[0]);
            end = new Date(start.getTime() + 60 * 60 * 1000); // 1 hour duration
          }
          eventProps = {
            title: reminderEvent.title || '',
            description: reminderEvent.description || '',
            location: reminderEvent.venue || '',
            start,
            end,
          };
        }
        // Show GoogleCalendarButton for web integration
        return (
          <GoogleCalendarButton event={eventProps} />
        );
      };
    const [reminderModalVisible, setReminderModalVisible] = useState(false);
    // Array of { date: string, times: string[] }
    const [reminderSelections, setReminderSelections] = useState<{ date: string, times: string[] }[]>([]);
    const [reminderEvent, setReminderEvent] = useState<EventItem | null>(null);
    const [showReminderDatePicker, setShowReminderDatePicker] = useState(false);
    const [editingReminderDate, setEditingReminderDate] = useState<string | null>(null);
    const [showReminderTimePicker, setShowReminderTimePicker] = useState(false);
    const [, setEditingReminderTime] = useState<{ date: string, time: string | null } | null>(null);

    // Helper: get min/max for reminder date
    const getReminderMaxDate = () => {
      if (!reminderEvent) return undefined;
      return reminderEvent.date;
    };

    // Helper: is reminder valid (all selected reminders must be before event)
    const isReminderValid = () => {
      if (!reminderEvent || !reminderSelections.length) return false;
      const eventDateTime = buildDateFromStrings(reminderEvent.date, reminderEvent.startTime);
      return reminderSelections.every(sel =>
        sel.times.length > 0 &&
        sel.times.every(time => {
          const dt = buildDateFromStrings(sel.date, time);
          return dt < eventDateTime;
        })
      );
    };
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'General' as EventCategory,
    appearance: 'Physical Meeting' as AppearanceType,
    startTime: '12:00 PM',
    endTime: '01:00 PM',
    durationHours: '',
    durationMinutes: '',
    venue: '',
    platform: 'Zoom' as OnlinePlatform,
    link: '',
    organizer: '',
    flyer: '',
  });

  const [announcementData, setAnnouncementData] = useState({
    title: '',
    announcedFor: '',
    message: '',
    category: 'General' as EventCategory,
    priority: 'Not Urgent' as 'Not Urgent' | 'Urgent',
    image: '',
    hasDateTime: false,
    date: getTodayUTC(),
    fromTime: '12:00 PM',
    toTime: '01:00 PM',
  });

  // Custom alert function using modal
  const showAlert = useCallback((title: string, message: string, buttons?: AlertButton[]) => {
    setAlertState({
      visible: true,
      title,
      message,
      buttons: buttons || [{ text: 'OK', onPress: () => {} }],
    });
  }, []);

  const requireAuth = (action: string = 'continue') => {
    showAlert(
      'Login Required',
      `Please sign up or log in to ${action}.`,
      [
        { text: 'Maybe later', style: 'cancel' },
        { text: 'Login / Sign up', onPress: () => router.push('/auth') },
      ],
    );
  };

  const hideAlert = () => {
    setAlertState(prev => ({ ...prev, visible: false }));
  };

  // Generate search suggestions based on events and announcements
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setSearchSuggestions([]);
      return;
    }

    const query = searchQuery.toLowerCase().trim();
    const uniqueTitles = new Set<string>();
    const uniqueOrganizers = new Set<string>();
    const uniqueAnnouncementTitles = new Set<string>();
    const uniqueAnnouncedFor = new Set<string>();
    
    const suggestions: SearchSuggestion[] = [];

    // Event titles
    events.forEach(event => {
      if (event.title.toLowerCase().includes(query) && !uniqueTitles.has(event.title)) {
        uniqueTitles.add(event.title);
        suggestions.push({
          id: event.id,
          title: event.title,
          organizer: event.organizer,
          type: 'title'
        });
      }
    });

    // Event organizers
    events.forEach(event => {
      if (event.organizer.toLowerCase().includes(query) && !uniqueOrganizers.has(event.organizer)) {
        uniqueOrganizers.add(event.organizer);
        suggestions.push({
          id: event.id,
          title: event.organizer,
          organizer: event.organizer,
          type: 'organizer'
        });
      }
    });

    // Announcement titles
    allAnnouncements.forEach(a => {
      const title = (a.title || '').toLowerCase();
      if (title.includes(query) && !uniqueAnnouncementTitles.has(a.title)) {
        uniqueAnnouncementTitles.add(a.title);
        suggestions.push({
          id: a.id,
          title: a.title,
          organizer: a.announced_for || 'Announcement',
          type: 'announcementTitle'
        });
      }
    });

    // Announcement audience (announced_for)
    allAnnouncements.forEach(a => {
      const audience = (a.announced_for || '').toLowerCase();
      if (audience.includes(query) && !uniqueAnnouncedFor.has(a.announced_for)) {
        uniqueAnnouncedFor.add(a.announced_for);
        suggestions.push({
          id: a.id,
          title: a.announced_for || 'Audience',
          organizer: a.title || 'Announcement',
          type: 'announcedFor'
        });
      }
    });

    // Limit to 10 suggestions
    setSearchSuggestions(suggestions.slice(0, 10));
  }, [searchQuery, events, allAnnouncements]);

  // Handle search when query changes
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setIsSearchActive(false);
      setSearchedEvents([]);
      return;
    }

    setIsSearchActive(true);
    const query = searchQuery.toLowerCase().trim();
    
    const filtered = events.filter(event => 
      event.title.toLowerCase().includes(query) || 
      event.organizer.toLowerCase().includes(query)
    );
    
    setSearchedEvents(filtered);
  }, [searchQuery, events]);

  // Upload image to Supabase Storage
  const uploadImageToSupabase = async (imageUri: string, bucket: string = 'event-flyers'): Promise<string | null> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        showAlert('Error', 'You must be logged in to upload images');
        return null;
      }

      console.log('Starting image upload:', { imageUri, bucket, userId: user.id });

      // Generate unique filename - simple UUID for all files
      const fileExt = imageUri.split('.').pop()?.toLowerCase() || 'jpg';
      const fileName = `${uuidv4()}.${fileExt}`;
      
      console.log('Generated filename:', fileName);

      // Convert image to blob - handle both file:// and https:// URIs
      let blob;
      try {
        const response = await fetch(imageUri);
        if (!response.ok) {
          throw new Error(`Failed to fetch image: ${response.statusText}`);
        }
        blob = await response.blob();
        console.log('Blob created, size:', blob.size);
      } catch (fetchError) {
        console.error('Fetch error:', fetchError);
        showAlert('Error', 'Failed to read image file');
        return null;
      }

      if (!blob || blob.size === 0) {
        console.error('Blob is empty or invalid');
        showAlert('Error', 'Image file is empty');
        return null;
      }

      // Upload to Supabase Storage
      console.log('Uploading to bucket:', bucket);
      const { error } = await supabase.storage
        .from(bucket)
        .upload(fileName, blob, {
          cacheControl: '3600',
          upsert: false,
          contentType: `image/${fileExt}`
        });

      if (error) {
        console.error('Supabase upload error:', error);
        showAlert('Upload Error', `Failed to upload: ${error.message}`);
        return null;
      }

      console.log('Upload successful, getting public URL');

      // Get public URL
      const { data: urlData } = supabase.storage
        .from(bucket)
        .getPublicUrl(fileName);

      const publicUrl = urlData?.publicUrl;
      
      if (!publicUrl) {
        console.error('Failed to get public URL from response:', urlData);
        showAlert('Error', 'Failed to generate image URL');
        return null;
      }

      console.log('Image uploaded successfully:', publicUrl);
      return publicUrl;
    } catch (error) {
      console.error('Unexpected error uploading image:', error);
      showAlert('Error', `Unexpected error: ${error}`);
      return null;
    }
  };

  // Delete image from Supabase Storage
  const deleteImageFromSupabase = async (imageUrl: string) => {
    try {
      // Extract filename from URL
      const urlParts = imageUrl.split('/');
      const fileName = urlParts[urlParts.length - 1];
      
      const { error } = await supabase.storage
        .from('event-flyers')
        .remove([fileName]);

      if (error) {
        console.error('Error deleting image:', error);
      }
    } catch (error) {
      console.error('Error deleting image:', error);
    }
  };


  // Animated loading screen effects
  useEffect(() => {
    if (isLoading) {
      // Pulsing ring animation
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.15,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start();

      // Animated dots sequence
      const animateDot = (anim: Animated.Value, delay: number) => {
        return Animated.loop(
          Animated.sequence([
            Animated.delay(delay),
            Animated.timing(anim, {
              toValue: 1,
              duration: 400,
              useNativeDriver: true,
            }),
            Animated.timing(anim, {
              toValue: 0,
              duration: 400,
              useNativeDriver: true,
            }),
            Animated.delay(600),
          ])
        );
      };

      animateDot(dotsAnim1, 0).start();
      animateDot(dotsAnim2, 200).start();
      animateDot(dotsAnim3, 400).start();
    }
  }, [isLoading, pulseAnim, dotsAnim1, dotsAnim2, dotsAnim3]);

  // Reset banner index when events change
  useEffect(() => {
    setBannerIndex(0);
  }, [events]);

  // Listen for dimension changes (screen rotation, window resize)
  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setScreenDimensions(window);
    });

    return () => subscription?.remove();
  }, []);

  const fetchUserUniversity = useCallback(async () => {
    try {
      let campus = await getSelectedCampus();
      if (!campus) {
        // If no campus is selected (including unauthenticated users), set a default campus
        const { GHANA_UNIVERSITIES } = await import('@/constants/campuses');
        campus = GHANA_UNIVERSITIES[0];
        // Optionally, persist this selection for the session
        if (campus) {
          setUserUniversity(campus);
        }
      } else {
        setUserUniversity(campus);
      }

      // Always allow events to be shown for the selected campus, even if not authenticated
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setCurrentUserId(user.id);
      // If not authenticated, currentUserId remains empty, but events will still show
    } catch (error) {
      console.error('Error fetching user university:', error);
      showAlert('Error', 'Unable to load your university information');
    }
  }, [showAlert]);

  const fetchEvents = useCallback(async () => {
    if (!userUniversity) return;

    setIsLoading(true);
    const startTime = Date.now();
    
    // Force loading to end after 7 seconds maximum
    const maxLoadingTimeout = setTimeout(() => {
      setIsLoading(false);
    }, 7000);
    
    try {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('university', userUniversity)
        .order('date', { ascending: true });

      if (error) throw error;

      if (data) {
        const typedEvents = data.map(event => ({
          id: event.id,
          title: event.title,
          description: event.description,
          category: event.category as EventCategory,
          appearance: event.appearance as AppearanceType,
          date: event.date,
          startTime: event.start_time,
          endTime: event.end_time,
          venue: event.venue,
          platform: event.platform as OnlinePlatform,
          link: event.link,
          organizer: event.organizer,
          flyer: event.flyer_url,
          university: event.university,
          perDayDescriptions: event.per_day_descriptions,
          perDayTimes: event.per_day_times,
          perDayVenues: event.per_day_venues,
        }));
        setEvents(typedEvents);
      }
    } catch (error) {
      console.error('Error fetching events:', error);
      showAlert('Error', 'Unable to load events');
    } finally {
      // Ensure loading screen shows for at least 5 seconds but no more than 7
      const elapsedTime = Date.now() - startTime;
      const remainingTime = Math.max(0, Math.min(5000 - elapsedTime, 7000 - elapsedTime));
      
      setTimeout(() => {
        clearTimeout(maxLoadingTimeout);
        setIsLoading(false);
      }, remainingTime);
    }
  }, [showAlert, userUniversity]);

  const fetchUserEvents = async () => {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        showAlert('Error', 'Unable to identify user');
        return;
      }

      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('created_by', user.id)
        .order('date', { ascending: true });

      if (error) throw error;

      if (data) {
        const typedEvents = data.map(event => ({
          id: event.id,
          title: event.title,
          description: event.description,
          category: event.category as EventCategory,
          appearance: event.appearance as AppearanceType,
          date: event.date,
          startTime: event.start_time,
          endTime: event.end_time,
          venue: event.venue,
          platform: event.platform as OnlinePlatform,
          link: event.link,
          organizer: event.organizer,
          flyer: event.flyer_url,
          university: event.university,
          perDayDescriptions: event.per_day_descriptions,
          perDayTimes: event.per_day_times,
          perDayVenues: event.per_day_venues,
        }));
        setUserEvents(typedEvents);
      }
    } catch (error) {
      console.error('Error fetching user events:', error);
      showAlert('Error', 'Unable to load your events');
    }
  };

  const fetchUserAnnouncements = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUserAnnouncements(data || []);
      if (!data || data.length === 0) {
        showAlert('No Announcements', 'You haven\'t posted any announcements yet');
      }
    } catch (error) {
      console.error('Error fetching announcements:', error);
      showAlert('Error', 'Failed to fetch your announcements');
    }
  };

  const fetchAllAnnouncements = useCallback(async () => {
    if (!userUniversity) return;

    try {
      const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .eq('university', userUniversity)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAllAnnouncements(data || []);
    } catch (error) {
      console.error('Error fetching all announcements:', error);
    }
  }, [userUniversity]);

  // On mount: delete expired items, then fetch university
  useEffect(() => {
    (async () => {
      await deleteExpiredItems();
      fetchUserUniversity();
    })();
  }, [fetchUserUniversity]);

  // Fetch events from Supabase
  useEffect(() => {
    if (userUniversity) {
      fetchEvents();
      fetchAllAnnouncements();
    }
  }, [userUniversity, fetchEvents, fetchAllAnnouncements]);

  // Pull-to-refresh handler
  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchEvents(), fetchAllAnnouncements()]);
    setRefreshing(false);
  };

  const deleteAnnouncement = async (announcementId: string) => {
    try {
      const { error } = await supabase
        .from('announcements')
        .delete()
        .eq('id', announcementId);

      if (error) throw error;

      setUserAnnouncements(prev => prev.filter(a => a.id !== announcementId));
      showAlert('Success', 'Announcement deleted successfully');
    } catch (error) {
      console.error('Error deleting announcement:', error);
      showAlert('Error', 'Failed to delete announcement');
    }
  };

  const editAnnouncement = (announcement: any) => {
    setSelectedAnnouncement(announcement);
    const dates = announcement.announcement_dates ? JSON.parse(announcement.announcement_dates) : [getTodayUTC()];
    setAnnouncementData({
      title: announcement.title,
      announcedFor: announcement.announced_for,
      message: announcement.message,
      category: announcement.category as EventCategory,
      priority: announcement.priority as 'Not Urgent' | 'Urgent',
      image: announcement.image_url || '',
      hasDateTime: announcement.has_date_time,
      date: dates?.[0] ?? getTodayUTC(),
      fromTime: announcement.from_time || '12:00 PM',
      toTime: announcement.to_time || '01:00 PM',
    });
    setSelectedAnnouncementDates(dates);
    const dayTimes = announcement.per_day_times
      ? (JSON.parse(announcement.per_day_times) as Record<string, { fromTime?: string; toTime?: string }> )
      : {};
    setAnnouncementDayDetails(dayTimes);
    setShowUserAnnouncements(false);
    setIsAnnouncementModalVisible(true);
  };

  const saveEditedAnnouncement = async () => {
    if (!selectedAnnouncement) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        showAlert('Error', 'You must be logged in to edit announcements');
        return;
      }

      let imageUrl: string = announcementData.image;
      if (announcementData.image && !announcementData.image.startsWith('https://')) {
        console.log('Image to upload:', announcementData.image);
        startUploadFlow('announcementFlyer');
        const uploadedUrl = await uploadImageToSupabase(announcementData.image, 'announcements');
        console.log('Upload result:', uploadedUrl);
        if (uploadedUrl) {
          imageUrl = uploadedUrl;
          completeUploadFlow('announcementFlyer');
        } else {
          stopUploadFlow();
          console.warn('Image upload failed, continuing with existing image');
          imageUrl = announcementData.image;
        }
      }

      const { error } = await supabase
        .from('announcements')
        .update({
          title: announcementData.title,
          announced_for: announcementData.announcedFor,
          message: announcementData.message,
          category: announcementData.category,
          priority: announcementData.priority,
          image_url: imageUrl,
          has_date_time: announcementData.hasDateTime,
          announcement_dates: announcementData.hasDateTime ? JSON.stringify(selectedAnnouncementDates) : null,
          from_time: announcementData.hasDateTime ? announcementData.fromTime : null,
          to_time: announcementData.hasDateTime ? announcementData.toTime : null,
          per_day_times: selectedAnnouncementDates.length > 1 && announcementData.hasDateTime ? JSON.stringify(announcementDayDetails) : null,
        })
        .eq('id', selectedAnnouncement.id);

      if (error) throw error;

      setIsAnnouncementModalVisible(false);
      setSelectedAnnouncement(null);
      setShowAnnouncementCalendar(false);
      setSelectedAnnouncementDates([getTodayUTC()]);
      setAnnouncementDayDetails({});
      setAnnouncementData({
        title: '',
        announcedFor: '',
        message: '',
        category: 'General',
        priority: 'Not Urgent',
        image: '',
        hasDateTime: false,
        date: getTodayUTC(),
        fromTime: '12:00 PM',
        toTime: '01:00 PM',
      });
      fetchUserAnnouncements();
      showAlert('Success', 'Announcement updated successfully!');
    } catch (error) {
      console.error('Error updating announcement:', error);
      showAlert('Error', 'Failed to update announcement');
    }
  };

  const showDeleteConfirmation = (announcementId: string) => {
    showAlert('Delete Announcement', 'Are you sure you want to delete this announcement?', [
      { text: 'Cancel', onPress: () => {} },
      { text: 'Delete', onPress: () => deleteAnnouncement(announcementId), style: 'destructive' }
    ]);
  };

  const handleDeleteEvent = async (eventId: string) => {
    try {
      // Get the event first to check if it has a flyer
      const eventToDelete = events.find(e => e.id === eventId) || userEvents.find(e => e.id === eventId);
      
      if (eventToDelete?.flyer && eventToDelete.flyer.startsWith('https://')) {
        // Delete the flyer image from storage
        await deleteImageFromSupabase(eventToDelete.flyer);
      }
      
      const { error } = await supabase
        .from('events')
        .delete()
        .eq('id', eventId);

      if (error) throw error;

      setUserEvents(prev => prev.filter(e => e.id !== eventId));
      setEvents(prev => prev.filter(e => e.id !== eventId));
      
      // Use showAlert instead of Alert.alert for consistency
      showAlert('Success', 'Event deleted successfully');
      
      // If we're in event details modal, close it
      if (showEventDetails) {
        setShowEventDetails(false);
      }
      
      // If we're in user events modal, fetch updated list
      if (showUserEvents) {
        fetchUserEvents();
      }
    } catch (error) {
      console.error('Error deleting event:', error);
      showAlert('Error', 'Failed to delete event');
    }
  };

  const handleEditEvent = (event: EventItem) => {
    // Populate form with event data
    setFormData({
      title: event.title,
      description: event.description || '',
      category: event.category,
      appearance: event.appearance,
      startTime: event.startTime || '12:00 PM',
      endTime: event.endTime || '01:00 PM',
      durationHours: '',
      durationMinutes: '',
      venue: event.venue || '',
      platform: (event.platform as OnlinePlatform) || 'Zoom',
      link: event.link || '',
      organizer: event.organizer,
      flyer: event.flyer || '',
    });

    // Set selected dates
    setSelectedDates([event.date]);

    // Set day details if multi-day
    if (event.perDayDescriptions || event.perDayTimes) {
      const details: Record<string, DayDetails> = {};
      const daysArray = event.perDayTimes ? Object.keys(event.perDayTimes) : [event.date];
      daysArray.forEach(day => {
        details[day] = {
          startTime: event.perDayTimes?.[day]?.startTime || event.startTime || '12:00 PM',
          endTime: event.perDayTimes?.[day]?.endTime || event.endTime || '01:00 PM',
          description: event.perDayDescriptions?.[day] || event.description || '',
          venue: event.perDayVenues?.[day] || event.venue,
          platform: event.platform,
          link: event.link,
        };
      });
      setDayDetails(details);
    }

    // Enter edit mode and close details modal
    setIsEditingEvent(true);
    setShowEventDetails(false);
    setIsModalVisible(true);
  };

  // Build Date objects from event date and time strings
  const buildDateFromStrings = (dateStr: string, timeStr?: string) => {
    const base = new Date(dateStr + 'T00:00:00');
    if (!timeStr) return base;
    const parts = timeStr.split(' ');
    const timePart = parts[0];
    const period = parts[1];
    const [hStr, mStr] = timePart.split(':');
    let hours = parseInt(hStr || '0', 10);
    const minutes = parseInt(mStr || '0', 10);
    if (period === 'AM' || period === 'PM') {
      hours = hours % 12;
      if (period === 'PM') hours += 12;
    }
    base.setHours(hours, minutes, 0, 0);
    return base;
  };

  // Retained for future direct reminder flow; currently invoked via modal actions.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _handleSetReminder = async (event: EventItem) => {
    try {
      if (Platform.OS === 'web') {
        const start = buildDateFromStrings(event.date, event.startTime);
        let end = buildDateFromStrings(event.date, event.endTime);
        if (end.getTime() <= start.getTime()) {
          end = new Date(end.getTime() + 24 * 60 * 60 * 1000);
        }

        const location = event.appearance === 'Virtual Meeting' ? (event.platform || event.link || '') : (event.venue || '');
        const description = event.description || '';
        const summary = (event.title || '').replace(/\r?\n/g, ' ');

        if (typeof window !== 'undefined') {
          const ua = window.navigator?.userAgent || '';
          const isAndroid = /Android/i.test(ua);
          const isIOS = /iPad|iPhone|iPod/i.test(ua);
          const isMac = /Macintosh|Mac OS X/i.test(ua);
          const isWindows = /Windows NT/i.test(ua);
          const isMobile = /Mobi|Android|iPhone|iPad/i.test(ua);
          const isDesktop = !isMobile;

          const fmt = (d: Date) => new Date(d).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
          const gcUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(summary)}&dates=${fmt(start)}/${fmt(end)}&location=${encodeURIComponent(location)}&details=${encodeURIComponent(description)}`;

          // Mac desktop: open Apple Calendar
          if (isMac && isDesktop) {
            try {
              const secondsSince2001 = start.getTime() / 1000 - 978307200;
              const url = 'calshow:' + secondsSince2001;
              window.location.href = url;
              return;
            } catch (err) {
              console.warn('Mac Calendar failed, opening Google Calendar:', err);
              showAlert(
                'Calendar Not Available',
                'Please install Google Calendar from the App Store to add reminders easily.',
                [
                  { text: 'Open Web Calendar', onPress: () => Linking.openURL(gcUrl) },
                  { text: 'Cancel', style: 'cancel' }
                ]
              );
              return;
            }
          }

          // iOS mobile: open Apple Calendar
          if (isIOS) {
            try {
              const secondsSince2001 = start.getTime() / 1000 - 978307200;
              const url = 'calshow:' + secondsSince2001;
              window.location.href = url;
              return;
            } catch (err) {
              console.warn('iOS Calendar failed, suggesting Google Calendar:', err);
              showAlert(
                'Calendar Not Available',
                'Please install Google Calendar from the App Store to add reminders easily.',
                [
                  { text: 'Open Web Calendar', onPress: () => Linking.openURL(gcUrl) },
                  { text: 'Cancel', style: 'cancel' }
                ]
              );
              return;
            }
          }

          // Windows desktop: open Windows Calendar app
          if (isWindows && isDesktop) {
            try {
              // Create ICS content for webcal protocol
              const formatICSDate = (d: Date) => {
                return new Date(d).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
              };

              const uid = uuidv4();
              const dtstamp = formatICSDate(new Date());
              const dtstart = formatICSDate(start);
              const dtend = formatICSDate(end);
              
              const ics = [
                'BEGIN:VCALENDAR',
                'VERSION:2.0',
                'PRODID:-//Suyado Campus//EN',
                'METHOD:PUBLISH',
                'BEGIN:VEVENT',
                `UID:${uid}`,
                `DTSTAMP:${dtstamp}`,
                `DTSTART:${dtstart}`,
                `DTEND:${dtend}`,
                `SUMMARY:${summary}`,
                location ? `LOCATION:${location}` : '',
                description ? `DESCRIPTION:${description}` : '',
                'STATUS:TENTATIVE',
                'END:VEVENT',
                'END:VCALENDAR',
              ].filter(Boolean).join('\r\n');

              // Create blob and webcal URL to open in Windows Calendar
              const blob = new Blob([ics], { type: 'text/calendar' });
              const blobUrl = URL.createObjectURL(blob);
              const webcalUrl = blobUrl.replace('blob:', 'webcal:');
              
              // Try to open Windows Calendar
              window.location.href = webcalUrl;
              
              // Clean up blob URL after delay
              setTimeout(() => URL.revokeObjectURL(blobUrl), 5000);
              
              // Fallback after short delay if Calendar didn't open
              setTimeout(() => {
                showAlert(
                  'Calendar App Required',
                  'To easily add reminders, please install Google Calendar.',
                  [
                    { text: 'Open Web Calendar', onPress: () => Linking.openURL(gcUrl) },
                    { text: 'Get Google Calendar', onPress: () => Linking.openURL('https://calendar.google.com/') },
                    { text: 'Cancel', style: 'cancel' }
                  ]
                );
              }, 1500);
              return;
            } catch (err) {
              console.warn('Windows Calendar failed, suggesting Google Calendar:', err);
              showAlert(
                'Calendar App Required',
                'To easily add reminders, please install Google Calendar.',
                [
                  { text: 'Open Web Calendar', onPress: () => Linking.openURL(gcUrl) },
                  { text: 'Get Google Calendar', onPress: () => Linking.openURL('https://calendar.google.com/') },
                  { text: 'Cancel', style: 'cancel' }
                ]
              );
              return;
            }
          }

          // Android mobile: open native calendar app
          if (isAndroid) {
            try {
              const baseInsert = `intent:#Intent;action=android.intent.action.INSERT;type=vnd.android.cursor.item/event;S.title=${encodeURIComponent(summary)};S.eventLocation=${encodeURIComponent(location)};S.description=${encodeURIComponent(description)};long.beginTime=${start.getTime()};long.endTime=${end.getTime()};end`;

              // Prefer Samsung Calendar when device likely Samsung
              const isSamsung = /Samsung|SM-|SAMSUNG/i.test(ua);
              if (isSamsung) {
                const samsungInsert = `intent:#Intent;action=android.intent.action.INSERT;type=vnd.android.cursor.item/event;package=com.samsung.android.calendar;S.title=${encodeURIComponent(summary)};S.eventLocation=${encodeURIComponent(location)};S.description=${encodeURIComponent(description)};long.beginTime=${start.getTime()};long.endTime=${end.getTime()};end`;
                try {
                  window.location.href = samsungInsert;
                  return;
                } catch {}
              }

              window.location.href = baseInsert;
              
              // Fallback suggestion after delay
              setTimeout(() => {
                showAlert(
                  'Calendar App Required',
                  'Please install Google Calendar from the Play Store to add reminders easily.',
                  [
                    { text: 'Open Web Calendar', onPress: () => Linking.openURL(gcUrl) },
                    { text: 'Get Google Calendar', onPress: () => Linking.openURL('https://play.google.com/store/apps/details?id=com.google.android.calendar') },
                    { text: 'Cancel', style: 'cancel' }
                  ]
                );
              }, 2000);
              return;
            } catch (err) {
              console.warn('Android Calendar failed, suggesting Google Calendar:', err);
              showAlert(
                'Calendar App Required',
                'Please install Google Calendar from the Play Store to add reminders easily.',
                [
                  { text: 'Open Web Calendar', onPress: () => Linking.openURL(gcUrl) },
                  { text: 'Get Google Calendar', onPress: () => Linking.openURL('https://play.google.com/store/apps/details?id=com.google.android.calendar') },
                  { text: 'Cancel', style: 'cancel' }
                ]
              );
              return;
            }
          }

          // Generic fallback: suggest Google Calendar
          showAlert(
            'Calendar App Required',
            'Please install Google Calendar to add reminders easily.',
            [
              { text: 'Open Web Calendar', onPress: () => Linking.openURL(gcUrl) },
              { text: 'Get Google Calendar', onPress: () => Linking.openURL('https://calendar.google.com/') },
              { text: 'Cancel', style: 'cancel' }
            ]
          );
        }
        return;
      }

      const start = buildDateFromStrings(event.date, event.startTime);
      let end = buildDateFromStrings(event.date, event.endTime);
      if (end.getTime() <= start.getTime()) {
        end = new Date(end.getTime() + 24 * 60 * 60 * 1000);
      }

      const location = event.appearance === 'Virtual Meeting' ? (event.platform || event.link || '') : (event.venue || '');
      const description = event.description || '';

      if (Platform.OS === 'android') {
        try {
          await IntentLauncher.startActivityAsync('android.intent.action.INSERT', {
            data: 'content://com.android.calendar/events',
            extra: {
              title: event.title,
              eventLocation: location,
              description,
              beginTime: start.getTime(),
              endTime: end.getTime(),
            },
          });
          return;
        } catch (e) {
          // Fallback below if intent fails
          console.warn('Calendar insert intent failed, falling back to direct create:', e);
        }
      }

      // iOS (and Android fallback): create the event directly using Expo Calendar
      if (!ExpoCalendar) {
        showAlert('Not Supported', 'Adding reminders to your calendar is not available on the web.');
        return;
      }
      const { status } = await ExpoCalendar.requestCalendarPermissionsAsync();
      if (status !== 'granted') {
        showAlert('Permission Required', 'Please allow calendar access to add this reminder.');
        return;
      }

      let calendarId: string | undefined;
      try {
        const defaultCal = await ExpoCalendar.getDefaultCalendarAsync();
        calendarId = defaultCal?.id;
      } catch {}
      if (!calendarId) {
        const cals = await ExpoCalendar.getCalendarsAsync(ExpoCalendar.EntityTypes.EVENT);
        calendarId = cals?.[0]?.id;
      }
      if (!calendarId) {
        showAlert('Error', 'Could not find a calendar to add the event.');
        return;
      }

      await ExpoCalendar.createEventAsync(calendarId, {
        title: event.title,
        startDate: start,
        endDate: end,
        location,
        notes: description,
        timeZone: undefined,
      });

      if (Platform.OS === 'ios') {
        // Open the Calendar app to the event date
        const secondsSince2001 = start.getTime() / 1000 - 978307200;
        try { await Linking.openURL('calshow:' + secondsSince2001); } catch {}
      }
      showAlert('Success', 'Reminder added to your calendar.');
    } catch (error) {
      console.error('Error setting reminder:', error);
      showAlert('Error', 'Failed to add reminder to calendar.');
    }
  };

  // Helper function to get dynamic background based on category
  const getCategoryBackground = (category: string, index: number = 0) => {
    const backgrounds: Record<string, { gradient: string[], pattern: string, bgImages: string[] }> = {
      'General': {
        gradient: ['rgba(255,107,53,0.50)', 'rgba(255,53,160,0.50)'],
        pattern: '🎯',
        bgImages: [
          'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&q=80',
          'https://images.unsplash.com/photo-1505373877841-8d25f7d46678?w=800&q=80',
          'https://images.unsplash.com/photo-1475721027785-f74eccf877e2?w=800&q=80'
        ]
      },
      'Entertainment': {
        gradient: ['rgba(156,39,176,0.50)', 'rgba(233,30,99,0.50)'],
        pattern: '🎭',
        bgImages: [
          'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&q=80',
          'https://images.unsplash.com/photo-1501612780327-45045538702b?w=800&q=80',
          'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=800&q=80'
        ]
      },
      'Educational': {
        gradient: ['rgba(33,150,243,0.50)', 'rgba(3,169,244,0.50)'],
        pattern: '📚',
        bgImages: [
          'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=800&q=80',
          'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=800&q=80',
          'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=800&q=80'
        ]
      },
      'Political': {
        gradient: ['rgba(255,152,0,0.50)', 'rgba(255,193,7,0.50)'],
        pattern: '🗳️',
        bgImages: [
          'https://images.unsplash.com/photo-1529107386315-e1a2ed48a620?w=800&q=80',
          'https://images.unsplash.com/photo-1541872703-74c5e44368f9?w=800&q=80',
          'https://images.unsplash.com/photo-1503428593586-e225b39bddfe?w=800&q=80'
        ]
      },
      'Religious': {
        gradient: ['rgba(76,175,80,0.50)', 'rgba(139,195,74,0.50)'],
        pattern: '🕊️',
        bgImages: [
          'https://images.unsplash.com/photo-1438232992991-995b7058bbb3?w=800&q=80',
          'https://images.unsplash.com/photo-1507692049790-de58290a4334?w=800&q=80',
          'https://images.unsplash.com/photo-1464207687429-7505649dae38?w=800&q=80'
        ]
      },
      'Academic': {
        gradient: ['rgba(63,81,181,0.50)', 'rgba(103,58,183,0.50)'],
        pattern: '🎓',
        bgImages: [
          'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=800&q=80',
          'https://images.unsplash.com/photo-1541829070764-84a7d30dd3f3?w=800&q=80',
          'https://images.unsplash.com/photo-1562774053-701939374585?w=800&q=80'
        ]
      },
      'Social': {
        gradient: ['rgba(244,67,54,0.50)', 'rgba(233,30,99,0.50)'],
        pattern: '👥',
        bgImages: [
          'https://images.unsplash.com/photo-1511632765486-a01980e01a18?w=800&q=80',
          'https://images.unsplash.com/photo-1543269865-cbf427effbad?w=800&q=80',
          'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=800&q=80'
        ]
      },
      'Sports': {
        gradient: ['rgba(0,188,212,0.50)', 'rgba(0,150,136,0.50)'],
        pattern: '⚽',
        bgImages: [
          'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=800&q=80',
          'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?w=800&q=80',
          'https://images.unsplash.com/photo-1517649763962-0c623066013b?w=800&q=80'
        ]
      },
      'Culture': {
        gradient: ['rgba(255,235,59,0.50)', 'rgba(255,193,7,0.50)'],
        pattern: '🎨',
        bgImages: [
          'https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?w=800&q=80',
          'https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=800&q=80',
          'https://images.unsplash.com/photo-1518998053901-5348d3961a04?w=800&q=80'
        ]
      },
      'Career': {
        gradient: ['rgba(96,125,139,0.50)', 'rgba(69,90,100,0.50)'],
        pattern: '💼',
        bgImages: [
          'https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=800&q=80',
          'https://images.unsplash.com/photo-1521737711867-e3b97375f902?w=800&q=80',
          'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=800&q=80'
        ]
      },
    };
    const categoryData = backgrounds[category] || backgrounds['General'];
    const bgImage = categoryData.bgImages[index % categoryData.bgImages.length];
    return { ...categoryData, bgImage };
  };

  // Helper function to get event status based on time
  const getEventStatus = (event: EventItem) => {
    if (!event.startTime || !event.endTime) return 'HAPPENING TODAY';
    
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const startMinutes = timeToMinutes(event.startTime);
    const endMinutes = timeToMinutes(event.endTime);
    
    // Handle events that span past midnight
    const adjustedEndMinutes = endMinutes < startMinutes ? endMinutes + 24 * 60 : endMinutes;
    
    if (currentMinutes < startMinutes) {
      return 'HAPPENING TODAY';
    } else if (currentMinutes >= startMinutes && currentMinutes <= adjustedEndMinutes) {
      return 'HAPPENING NOW';
    } else {
      return 'EVENT COMPLETED';
    }
  };

  const pickFlyer = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });
      
      if (result.canceled || !result.assets?.[0]) return;
      
      const imageUri = result.assets[0].uri;
      startUploadFlow('eventFlyer');
      
      // Upload to Supabase Storage
      const flyerUrl = await uploadImageToSupabase(imageUri);
      
      if (flyerUrl) {
        setFormData({ ...formData, flyer: flyerUrl });
        completeUploadFlow('eventFlyer');
      } else {
        stopUploadFlow();
        showAlert('Error', 'Failed to upload flyer. Please try again.');
      }
    } catch (error) {
      stopUploadFlow();
      console.error('Error picking/uploading flyer:', error);
      showAlert('Error', 'Failed to upload flyer. Please try again.');
    }
  };

  const todayEvents = useMemo(() => events.filter(e => e.date === getTodayUTC()), [events]);

  // Get announcements that should show on banner
  const bannerAnnouncements = useMemo(() => {
    if (!allAnnouncements.length) return [];
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return allAnnouncements.filter(announcement => {
      try {
        const postedDate = new Date(announcement.created_at);
        postedDate.setHours(0, 0, 0, 0);

        const hasDates = announcement.has_date_time && announcement.announcement_dates;
        const dates = hasDates ? JSON.parse(announcement.announcement_dates) : [];

        // Determine announcement date if provided
        const announcementDate = hasDates && Array.isArray(dates) && dates.length > 0
          ? new Date(dates[0])
          : null;

        if (announcementDate) {
          announcementDate.setHours(0, 0, 0, 0);

          // Window: max(posted date, 7 days before announcement) -> announcement date (inclusive)
          const sevenDaysBefore = new Date(announcementDate);
          sevenDaysBefore.setDate(announcementDate.getDate() - 7);

          const windowStart = postedDate > sevenDaysBefore ? postedDate : sevenDaysBefore;
          return today >= windowStart && today <= announcementDate;
        }

        // Fallback: no date provided. Show for 7 days from posted date (inclusive)
        const windowEnd = new Date(postedDate);
        windowEnd.setDate(windowEnd.getDate() + 6);
        return today >= postedDate && today <= windowEnd;
      } catch (error) {
        console.error('Error parsing announcement dates:', error);
        return false;
      }
    });
  }, [allAnnouncements]);

  // Combined banner items (events happening today + banner-eligible announcements)
  const bannerItems = useMemo(() => {
    const items: { type: 'event' | 'announcement'; data: any }[] = [];

    todayEvents.forEach(event => items.push({ type: 'event', data: event }));
    bannerAnnouncements.forEach(announcement => items.push({ type: 'announcement', data: announcement }));

    return items;
  }, [todayEvents, bannerAnnouncements]);

  useEffect(() => {
    const items = bannerItems;

    if (items.length > 0) {
      if (bannerIndex >= items.length) {
        setBannerIndex(0);
      }

      const interval = setInterval(() => {
        setBannerIndex((prev) => (prev >= items.length - 1 ? 0 : prev + 1));
      }, 4000);

      return () => clearInterval(interval);
    }

    setBannerIndex(0);
  }, [bannerItems, bannerIndex]);

  // Apply filter to events
  const filterEventsByDate = (eventsToFilter: EventItem[]): EventItem[] => {
    if (activeFilter === 'All') return eventsToFilter;

    const today = new Date();
    const filterDate = (dateStr: string): boolean => {
      const eventDate = new Date(dateStr);
      
      switch (activeFilter) {
        case 'Today':
          return eventDate.toDateString() === today.toDateString();
        case 'Tomorrow':
          const tomorrow = new Date(today);
          tomorrow.setDate(today.getDate() + 1);
          return eventDate.toDateString() === tomorrow.toDateString();
        case 'This Week': {
          const dayOfWeek = today.getDay();
          const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
          const weekStart = new Date(today);
          weekStart.setDate(today.getDate() + diffToMonday);
          weekStart.setHours(0, 0, 0, 0);
          
          const weekEnd = new Date(weekStart);
          weekEnd.setDate(weekStart.getDate() + 6);
          weekEnd.setHours(23, 59, 59, 999);
          
          return eventDate >= weekStart && eventDate <= weekEnd;
        }
        case 'This Month': {
          const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
          const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
          monthEnd.setHours(23, 59, 59, 999);
          
          return eventDate >= monthStart && eventDate <= monthEnd;
        }
        case 'Next Month': {
          const nextMonthStart = new Date(today.getFullYear(), today.getMonth() + 1, 1);
          const nextMonthEnd = new Date(today.getFullYear(), today.getMonth() + 2, 0);
          nextMonthEnd.setHours(23, 59, 59, 999);
          
          return eventDate >= nextMonthStart && eventDate <= nextMonthEnd;
        }
        default:
          if (activeFilter.startsWith('Specific Day:')) {
            const dateMatch = activeFilter.match(/\d{4}-\d{2}-\d{2}/);
            if (dateMatch) {
              return eventDate.toDateString() === new Date(dateMatch[0]).toDateString();
            }
          } else if (activeFilter.startsWith('Selected Days:')) {
            return filterSelectedDays.includes(dateStr);
          }
          return true;
      }
    };

    return eventsToFilter.filter(event => filterDate(event.date));
  };

  // Apply time filter to events
  const filterEventsByTime = (eventsToFilter: EventItem[]): EventItem[] => {
    if (!filterTimeRange) return eventsToFilter;

    return eventsToFilter.filter(event => {
      if (!event.startTime) return false;
      
      const eventStartMinutes = timeToMinutes(event.startTime);
      const filterStartMinutes = timeToMinutes(filterTimeRange.startTime);
      const filterEndMinutes = timeToMinutes(filterTimeRange.endTime);
      
      return eventStartMinutes >= filterStartMinutes && eventStartMinutes <= filterEndMinutes;
    });
  };

  const filteredEvents = useMemo(() => {
    let result = events;
    
    // Apply search filter
    if (isSearchActive && searchedEvents.length > 0) {
      result = searchedEvents.filter(event => activeCategory === 'All' || event.category === activeCategory);
    } else {
      result = events.filter(event => activeCategory === 'All' || event.category === activeCategory);
    }
    
    // Apply date filter
    result = filterEventsByDate(result);
    
    // Apply time filter
    result = filterEventsByTime(result);
    
    return result;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCategory, events, isSearchActive, searchedEvents, activeFilter, filterSelectedDays, filterTimeRange]);

  const filteredAnnouncements = useMemo(() => {
    let result = allAnnouncements;
    
    // Apply category filter (using same categories as events)
    if (activeCategory !== 'All') {
      result = result.filter(announcement => announcement.category === activeCategory);
    }
    
    // Apply search if active
    if (isSearchActive && searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter(announcement => {
        const title = (announcement.title || '').toLowerCase();
        const announcedFor = (announcement.announced_for || '').toLowerCase();
        const message = (announcement.message || '').toLowerCase();
        return title.includes(q) || announcedFor.includes(q) || message.includes(q);
      });
    }
    
    // Apply date filter to announcements
    if (activeFilter !== 'All') {
      result = result.filter(announcement => {
        if (!announcement.has_date_time || !announcement.announcement_dates) return false;
        
        try {
          const dates = JSON.parse(announcement.announcement_dates);
          if (!Array.isArray(dates) || dates.length === 0) return false;
          
          const announcementDate = new Date(dates[0]);
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          announcementDate.setHours(0, 0, 0, 0);
          
          switch (activeFilter) {
            case 'Today':
              return announcementDate.toDateString() === today.toDateString();
            case 'Tomorrow': {
              const tomorrow = new Date(today);
              tomorrow.setDate(today.getDate() + 1);
              return announcementDate.toDateString() === tomorrow.toDateString();
            }
            case 'This Week': {
              const dayOfWeek = today.getDay();
              const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
              const weekStart = new Date(today);
              weekStart.setDate(today.getDate() + diffToMonday);
              weekStart.setHours(0, 0, 0, 0);
              
              const weekEnd = new Date(weekStart);
              weekEnd.setDate(weekStart.getDate() + 6);
              weekEnd.setHours(23, 59, 59, 999);
              
              return announcementDate >= weekStart && announcementDate <= weekEnd;
            }
            case 'This Month': {
              const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
              const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
              monthEnd.setHours(23, 59, 59, 999);
              
              return announcementDate >= monthStart && announcementDate <= monthEnd;
            }
            case 'Next Month': {
              const nextMonthStart = new Date(today.getFullYear(), today.getMonth() + 1, 1);
              const nextMonthEnd = new Date(today.getFullYear(), today.getMonth() + 2, 0);
              nextMonthEnd.setHours(23, 59, 59, 999);
              
              return announcementDate >= nextMonthStart && announcementDate <= nextMonthEnd;
            }
            default:
              if (activeFilter.startsWith('Specific Day:')) {
                const dateMatch = activeFilter.match(/\d{4}-\d{2}-\d{2}/);
                if (dateMatch) {
                  return announcementDate.toDateString() === new Date(dateMatch[0]).toDateString();
                }
              } else if (activeFilter.startsWith('Selected Days:')) {
                return dates.some((date: string) => filterSelectedDays.includes(date));
              }
              return true;
          }
        } catch (error) {
          console.error('Error filtering announcement dates:', error);
          return false;
        }
      });
    }
    
    // Apply time filter to announcements
    if (filterTimeRange && filterTimeRange.startTime && filterTimeRange.endTime) {
      result = result.filter(announcement => {
        if (!announcement.from_time) return false;
        
        const announcementStartMinutes = timeToMinutes(announcement.from_time);
        const filterStartMinutes = timeToMinutes(filterTimeRange.startTime);
        const filterEndMinutes = timeToMinutes(filterTimeRange.endTime);
        
        return announcementStartMinutes >= filterStartMinutes && announcementStartMinutes <= filterEndMinutes;
      });
    }
    
    return result;
  }, [activeCategory, allAnnouncements, isSearchActive, searchQuery, activeFilter, filterSelectedDays, filterTimeRange]);

  // Handle suggestion selection
  const handleSelectSuggestion = (suggestion: SearchSuggestion) => {
    if (suggestion.type === 'title') {
      setSearchQuery(suggestion.title);
      setSearchedEvents(events.filter(event => event.title === suggestion.title));
    } else if (suggestion.type === 'organizer') {
      setSearchQuery(suggestion.organizer);
      setSearchedEvents(events.filter(event => event.organizer === suggestion.organizer));
    } else if (suggestion.type === 'announcementTitle') {
      setSearchQuery(suggestion.title);
      setSearchedEvents([]);
    } else {
      setSearchQuery(suggestion.title);
      setSearchedEvents([]);
    }
    setIsSearchActive(true);
  };

  // Clear search
  const handleClearSearch = () => {
    setIsSearchActive(false);
    setSearchedEvents([]);
    setSearchQuery('');
  };

  // Apply filter
  const handleApplyFilter = (filter: FilterType) => {
    setActiveFilter(filter);
    
    // Extract date from filter if it's a specific day
    if (filter.startsWith('Specific Day:')) {
      const dateMatch = filter.match(/\d{4}-\d{2}-\d{2}/);
      if (dateMatch) {
        setFilterSpecificDate(dateMatch[0]);
      }
    }
  };

  // Auto-calculate end time when duration changes
  useEffect(() => {
    if (formData.startTime && (formData.durationHours || formData.durationMinutes)) {
      const startMinutes = timeToMinutes(formData.startTime);
      const hours = parseInt(formData.durationHours) || 0;
      const minutes = parseInt(formData.durationMinutes) || 0;
      let totalMinutes = startMinutes + hours * 60 + minutes;

      const newHours = Math.floor(totalMinutes / 60) % 24;
      const newMinutes = totalMinutes % 60;
      const period = newHours >= 12 ? 'PM' : 'AM';
      const displayHours = newHours % 12 || 12;

      const endTime = `${displayHours.toString().padStart(2, '0')}:${newMinutes.toString().padStart(2, '0')} ${period}`;
      setFormData(prev => ({ ...prev, endTime }));
    }
  }, [formData.startTime, formData.durationHours, formData.durationMinutes]);

  // Initialize day details when dates change
  useEffect(() => {
    if (selectedDates.length > 0) {
      const newDetails: Record<string, DayDetails> = {};
      selectedDates.forEach(date => {
        if (!dayDetails[date]) {
          newDetails[date] = {
            startTime: formData.startTime,
            endTime: formData.endTime,
            description: '',
            venue: formData.venue,
            platform: formData.platform,
            link: formData.link,
          };
        }
      });
      setDayDetails(prev => ({ ...prev, ...newDetails }));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDates]);

  // Update formData when dayDetails change (for venues)
  useEffect(() => {
    if (selectedDates.length > 1 && (formData.appearance === 'Physical Meeting' || formData.appearance === 'Both')) {
      // Check if all days have the same venue (not empty)
      const venues = selectedDates.map(date => {
        const details = dayDetails[date];
        return details?.venue || '';
      }).filter(venue => venue !== ''); // Only consider non-empty venues
      
      if (venues.length > 0) {
        const allSameVenue = venues.every(venue => venue === venues[0]);
        if (allSameVenue && venues[0] !== formData.venue) {
          // Update default venue to match the common venue from day details
          setFormData(prev => ({ ...prev, venue: venues[0] }));
        }
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dayDetails, selectedDates, formData.appearance]);

  // Update formData when dayDetails change (for times)
  useEffect(() => {
    if (selectedDates.length > 1) {
      // Check if all days have the same time
      const times = selectedDates.map(date => {
        const details = dayDetails[date];
        return details ? { startTime: details.startTime, endTime: details.endTime } : null;
      }).filter(time => time !== null);
      
      if (times.length > 0) {
        const allSameStartTime = times.every(time => time.startTime === times[0].startTime);
        const allSameEndTime = times.every(time => time.endTime === times[0].endTime);
        
        if (allSameStartTime && allSameEndTime && 
            (times[0].startTime !== formData.startTime || times[0].endTime !== formData.endTime)) {
          // Update default times to match the common times from day details
          setFormData(prev => ({ 
            ...prev, 
            startTime: times[0].startTime,
            endTime: times[0].endTime
          }));
        }
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dayDetails, selectedDates]);

  // Check if all days have different specific times
  const allDaysHaveDifferentTimes = () => {
    if (selectedDates.length <= 1) return false;
    const times = new Set<string>();
    let customDaysCount = 0;
    selectedDates.forEach(date => {
      const details = dayDetails[date];
      if (details?.startTime && details?.endTime) {
        times.add(`${details.startTime}-${details.endTime}`);
        if (details.startTime !== formData.startTime || details.endTime !== formData.endTime) {
          customDaysCount++;
        }
      }
    });
    return times.size === selectedDates.length && customDaysCount > 0;
  };

  // Check if all days have different specific venues
  const allDaysHaveDifferentVenues = () => {
    if (selectedDates.length <= 1) return false;
    const venues = new Set<string>();
    let customDaysCount = 0;
    selectedDates.forEach(date => {
      const details = dayDetails[date];
      if (details?.venue && details.venue !== '') {
        venues.add(details.venue);
        if (details.venue !== formData.venue) {
          customDaysCount++;
        }
      }
    });
    return venues.size === selectedDates.length && customDaysCount > 0;
  };

  const handleAddEvent = async () => {
    if (!userUniversity) {
      showAlert('Error', 'Unable to determine your university');
      return;
    }

    // Validate required fields and provide user feedback
    const missing: string[] = [];
    if (!formData.title) missing.push('Title');
    if (!formData.organizer) missing.push('Organizer');
    if (selectedDates.length === 0) missing.push('Event Dates');
    if (!formData.startTime || !formData.endTime) missing.push('Event Time');
    if (!formData.category) missing.push('Category');
    if (!formData.appearance) missing.push('Event Attendance Option');

    // Venue is required only when event has a physical component and no per-day venues
    if (formData.appearance === 'Physical Meeting' || formData.appearance === 'Both') {
      const hasDefaultVenue = formData.venue && formData.venue.trim() !== '';
      const perDayDifferent = selectedDates.length > 1 && allDaysHaveDifferentVenues();
      if (!hasDefaultVenue && !perDayDifferent) missing.push('Venue');
    }

    if (missing.length > 0) {
      showAlert('Missing required fields', `Please fill in the following: ${missing.join(', ')}`);
      return;
    }

    let startedPublishFlow = false;

    try {
      // Get current user ID
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        requireAuth('create an event');
        return;
      }

      // Handle edit mode
      if (isEditingEvent && selectedEvent) {
        let flyerUrl: string = formData.flyer || '';
        
        // If flyer changed and is a local file, upload it
        if (formData.flyer && formData.flyer.startsWith('file://') && formData.flyer !== selectedEvent.flyer) {
          startUploadFlow('eventFlyer');
          const uploadedUrl = await uploadImageToSupabase(formData.flyer);
          if (!uploadedUrl) {
            stopUploadFlow();
            showAlert('Error', 'Failed to upload flyer');
            return;
          }
          completeUploadFlow('eventFlyer');
          flyerUrl = uploadedUrl;
          
          // Delete old flyer if it exists
          if (selectedEvent.flyer && selectedEvent.flyer.startsWith('https://')) {
            await deleteImageFromSupabase(selectedEvent.flyer);
          }
        }

        const { error } = await supabase
          .from('events')
          .update({
            title: formData.title,
            description: selectedDates.length === 1 ? formData.description : '',
            category: formData.category,
            appearance: formData.appearance,
            date: selectedDates[0],
            start_time: formData.startTime,
            end_time: formData.endTime,
            venue: formData.venue,
            platform: formData.platform,
            link: formData.link,
            organizer: formData.organizer,
            flyer_url: flyerUrl,
          })
          .eq('id', selectedEvent.id);

        if (error) throw error;

        // Update local state
        const updatedEvent = {
          ...selectedEvent,
          title: formData.title,
          description: formData.description,
          category: formData.category,
          appearance: formData.appearance,
          date: selectedDates[0],
          startTime: formData.startTime,
          endTime: formData.endTime,
          venue: formData.venue,
          platform: formData.platform,
          link: formData.link,
          organizer: formData.organizer,
          flyer: flyerUrl || '',
        };

        setUserEvents(prev => prev.map(e => e.id === selectedEvent.id ? updatedEvent : e));
        setEvents(prev => prev.map(e => e.id === selectedEvent.id ? updatedEvent : e));
        setSelectedEvent(updatedEvent);

        setIsModalVisible(false);
        setIsEditingEvent(false);
        setFormData({
          title: '', description: '', category: 'General', appearance: 'Physical Meeting',
          startTime: '12:00 PM', endTime: '01:00 PM', durationHours: '', durationMinutes: '',
          venue: '', platform: 'Zoom', link: '', organizer: '', flyer: ''
        });
        showAlert('Success', 'Event updated successfully!');
        return;
      }

      // For new events, upload flyer if it's a local file
      startPublishFlow('event');
      startedPublishFlow = true;

      let flyerUrl: string = formData.flyer || '';
      if (formData.flyer && formData.flyer.startsWith('file://')) {
        startUploadFlow('eventFlyer');
        const uploadedUrl = await uploadImageToSupabase(formData.flyer);
        if (!uploadedUrl) {
          stopUploadFlow();
          stopPublishFlow();
          showAlert('Error', 'Failed to upload flyer');
          return;
        }
        completeUploadFlow('eventFlyer');
        flyerUrl = uploadedUrl;
      }

      // Original create event logic
      const perDayDescriptions: Record<string, string> = {};
      const perDayTimes: Record<string, { startTime: string; endTime: string }> = {};
      const perDayVenues: Record<string, string> = {};
      
      // Check if any day has custom times (different from default)
      let hasCustomTimes = false;
      let allTimesSame = true;
      let firstTime = { startTime: formData.startTime, endTime: formData.endTime };
      
      selectedDates.forEach(date => {
        const details = dayDetails[date];
        if (details) {
          if (details.startTime !== formData.startTime || details.endTime !== formData.endTime) {
            hasCustomTimes = true;
          }
          if (allTimesSame && (details.startTime !== firstTime.startTime || details.endTime !== firstTime.endTime)) {
            allTimesSame = false;
          }
          // Always capture all per-day times for proper tracking
          if (details.startTime && details.endTime) {
            perDayTimes[date] = {
              startTime: details.startTime,
              endTime: details.endTime
            };
          }
        }
      });

      // Check venues - track if all days have the same venue
      let allVenuesSame = true;
      let firstVenue = formData.venue;
      const dayVenues: string[] = [];
      
      selectedDates.forEach(date => {
        const details = dayDetails[date];
        if (details && details.venue && details.venue !== '') {
          dayVenues.push(details.venue);
          if (allVenuesSame && details.venue !== firstVenue) {
            allVenuesSame = false;
          }
          // Always capture all per-day venues for proper tracking
          perDayVenues[date] = details.venue;
        }
      });

      // If all day-specific venues are the same and not empty, use that as the default
      const uniqueVenues = [...new Set(dayVenues)];
      const effectiveDefaultVenue = uniqueVenues.length === 1 ? uniqueVenues[0] : formData.venue;

      selectedDates.forEach(date => {
        const details = dayDetails[date];
        if (details?.description) {
          perDayDescriptions[date] = details.description;
        }
      });

      const eventsToInsert = selectedDates.map(date => {
        const details = dayDetails[date];
        
        // Determine which times to use
        const useDefaultTimes = !hasCustomTimes || allTimesSame || !details?.startTime;
        const startTimeToUse = useDefaultTimes ? formData.startTime : details?.startTime;
        const endTimeToUse = useDefaultTimes ? formData.endTime : details?.endTime;
        
        // Determine which venue to use
        let venueToUse = effectiveDefaultVenue;
        if (details?.venue && details.venue !== '') {
          venueToUse = details.venue;
        }
        
        // Prepare the event data for database insertion
        const eventData: any = {
          title: formData.title,
          description: selectedDates.length === 1 ? formData.description : '',
          category: formData.category,
          appearance: formData.appearance,
          date,
          start_time: startTimeToUse,
          end_time: endTimeToUse,
          venue: venueToUse,
          platform: details?.platform || formData.platform,
          link: details?.link || formData.link,
          organizer: formData.organizer,
          flyer_url: flyerUrl,
          university: userUniversity,
          created_by: user.id,
        };

        // Add per-day data if multi-day event
        if (selectedDates.length > 1) {
          if (Object.keys(perDayDescriptions).length > 0) {
            eventData.per_day_descriptions = perDayDescriptions;
          }
          if (!allTimesSame) {
            eventData.per_day_times = perDayTimes;
          }
          if (!allVenuesSame && Object.keys(perDayVenues).length > 0) {
            eventData.per_day_venues = perDayVenues;
          }
        }

        return eventData;
      });

      const { data, error } = await supabase
        .from('events')
        .insert(eventsToInsert)
        .select();

      if (error) throw error;

      // Add the new events to local state
      const newEvents = data.map((event) => ({
        id: event.id,
        title: event.title,
        description: event.description,
        category: event.category as EventCategory,
        appearance: event.appearance as AppearanceType,
        date: event.date,
        startTime: event.start_time,
        endTime: event.end_time,
        venue: event.venue,
        platform: event.platform as OnlinePlatform,
        link: event.link,
        organizer: event.organizer,
        flyer: event.flyer_url,
        university: event.university,
        perDayDescriptions: event.per_day_descriptions,
        perDayTimes: event.per_day_times,
        perDayVenues: event.per_day_venues,
      }));

      setEvents(prev => [...prev, ...newEvents]);

      setIsModalVisible(false);
      setShowCalendar(false);
      setSelectedDates([getTodayUTC()]);
      setDayDetails({});
      setFormData({
        title: '', description: '', category: 'General', appearance: 'Physical Meeting',
        startTime: '12:00 PM', endTime: '01:00 PM', durationHours: '', durationMinutes: '',
        venue: '', platform: 'Zoom', link: '', organizer: '', flyer: ''
      });

      completePublishFlow('event');
    } catch (error: any) {
      if (startedPublishFlow) {
        stopPublishFlow();
      }
      console.error('Error publishing event:', error);
      showAlert('Error', error.message || 'Failed to publish event');
    }
  };

  const handleEditDay = (index: number, date: string) => {
    setEditingDayIndex(index);
    setEditingDayDate(date);
    setShowDayEditor(true);
  };

  const handleSaveDayDetails = (date: string, data: DayDetails) => {
    setDayDetails(prev => ({
      ...prev,
      [date]: data
    }));
    showAlert('Saved', 'Day details updated successfully!');
  };

  const renderEvent = ({ item }: { item: EventItem }) => {
    const hasPerDayDesc = item.perDayDescriptions && Object.keys(item.perDayDescriptions).length > 0;
    const hasPerDayTimes = item.perDayTimes && Object.keys(item.perDayTimes).length > 0;
    const hasPerDayVenues = item.perDayVenues && Object.keys(item.perDayVenues).length > 0;
    
    // Show default time if no per-day times OR if all times are the same (implied by no perDayTimes)
    const showDefaultTime = !hasPerDayTimes;
    // Show default venue if no per-day venues OR if all venues are the same (implied by no perDayVenues)
    const showDefaultVenue = !hasPerDayVenues;
    
    // Don't show venue if event is virtual
    const shouldShowVenue = item.appearance !== 'Virtual Meeting' && item.venue;
    
    return (
      <TouchableOpacity 
        style={styles.card}
        onPress={() => {
          setSelectedEvent(item);
          setIsViewingOwnEvent(false);
          setShowEventDetails(true);
        }}
      >
        <View style={styles.cardLayout}>
          <View style={styles.flyerContainer}>
            {item.flyer && item.flyer.startsWith('https://') ? (
              <Image 
                source={{ uri: item.flyer }} 
                style={styles.flyerImage} 
                resizeMode="contain" 
                onError={() => console.log('Error loading image:', item.flyer)}
              />
            ) : (
              <View style={styles.placeholderFlyer}>
                <Text style={styles.placeholderText}>
                  {item.flyer ? 'LOADING...' : 'NO FLYER'}
                </Text>
              </View>
            )}
          </View>

          <View style={styles.cardContent}>
            <View style={styles.tagRow}>
              <View style={[styles.categoryBadge, { backgroundColor: '#2E8BC020' }]}><Text style={[styles.categoryBadgeText, { color: '#2E8BC0' }]}>{item.category}</Text></View>
              <View style={styles.appearanceBadge}><Text style={styles.appearanceBadgeText}>{item.appearance}</Text></View>
              {hasPerDayDesc && (
                <View style={styles.multiDayBadge}><Text style={styles.multiDayBadgeText}>Multi-Day</Text></View>
              )}
            </View>
            <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
            <Text style={styles.organizerText} numberOfLines={1}>{item.organizer}</Text>
            
            {hasPerDayDesc ? (
              <>
                <Text style={styles.footerInfo}>
                  📅 {Object.keys(item.perDayDescriptions!).length} days • Starts: {formatShortDate(item.date)}
                </Text>
                
                {/* Show time based on whether there are per-day times */}
                {showDefaultTime ? (
                  <Text style={styles.footerInfo}>
                    🕒 {item.startTime} - {item.endTime} ({calculateDuration(item.startTime!, item.endTime!)})
                  </Text>
                ) : (
                  <Text style={styles.footerInfo}>
                    🕒 Multiple times • See details for each day
                  </Text>
                )}
                
                {/* Show venue based on whether there are per-day venues and event is not virtual */}
                {showDefaultVenue && shouldShowVenue && (
                  <Text style={styles.footerInfo}>📍 {item.venue}</Text>
                )}
                
                {!showDefaultVenue && item.perDayVenues && item.appearance !== 'Virtual Meeting' && (
                  <Text style={styles.footerInfo}>
                    📍 Different venues for each day
                  </Text>
                )}
              </>
            ) : (
              <>
                <Text style={styles.footerInfo}>
                  📅 {new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  {item.startTime && item.endTime && ` • ${item.startTime} - ${item.endTime} (${calculateDuration(item.startTime, item.endTime)})`}
                </Text>
                {shouldShowVenue && <Text style={styles.footerInfo}>📍 {item.venue}</Text>}
                {item.platform && (item.appearance === 'Virtual Meeting' || item.appearance === 'Both') && <Text style={styles.footerInfo}>💻 {item.platform}</Text>}
              </>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderAnnouncement = ({ item }: { item: any }) => {
    const announcementDates = item.announcement_dates ? JSON.parse(item.announcement_dates) : [];
    const hasDateTime = item.has_date_time;
    
    // Helper function for category colors
    const getCategoryColor = (category: string) => {
      const colorMap: Record<string, string> = {
        'Academic': '#5B8FF9',
        'Social': '#FF6B9D',
        'Sports': '#00D9C0',
        'Culture': '#FFB020',
        'Career': '#6DC8BF',
        'General': '#FF7A45',
        'Entertainment': '#9E5CF2',
        'Educational': '#2E8BC0',
        'Political': '#FF8C42',
        'Religious': '#52C41A',
      };
      return colorMap[category] || colors.primary;
    };

    // Helper function for priority colors
    const getPriorityColor = (priority: string) => {
      const colorMap: Record<string, string> = {
        'Urgent': '#FF4444',
        'Not Urgent': '#888888',
      };
      return colorMap[priority] || colors.textSecondary;
    };
    
    return (
      <TouchableOpacity
        style={[styles.announcementCard, { backgroundColor: colors.card, borderColor: colors.border }]}
        onPress={() => {
          setSelectedAnnouncement(item);
          setShowAnnouncementDetails(true);
        }}
      >
        {/* Image Section */}
        {item.image_url && item.image_url.startsWith('https://') && (
          <TouchableOpacity 
            style={styles.announcementImageContainer}
            onPress={(e) => {
              e.stopPropagation();
              setFullScreenImageUrl(item.image_url);
              setShowFullScreenImage(true);
            }}
            activeOpacity={0.8}
          >
            <Image 
              source={{ uri: item.image_url }} 
              style={styles.announcementImageStyle} 
              resizeMode="cover" 
            />
          </TouchableOpacity>
        )}
        
        {/* Content Section */}
        <View style={[styles.announcementCardContent, { flex: 1 }]}>
          <Text style={[styles.announcementCardTitle, { color: colors.text }]} numberOfLines={2}>{item.title}</Text>
          
          {item.announced_for && (
            <Text style={[styles.announcementCardSubtitle, { color: colors.textSecondary }]} numberOfLines={1}>
              👥 {item.announced_for}
            </Text>
          )}
          
          <View style={{ flexDirection: 'row', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
            <View style={[styles.priorityBadge, { backgroundColor: getCategoryColor(item.category) }]}>
              <Text style={[styles.priorityBadgeText, { color: '#FFFFFF' }]}>{item.category}</Text>
            </View>
            {item.priority && (
              <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(item.priority) }]}>
                <Text style={[styles.priorityBadgeText, { color: '#FFFFFF' }]}>{item.priority}</Text>
              </View>
            )}
          </View>
          
          {hasDateTime && announcementDates.length > 0 && (
            <Text style={[styles.announcementCardDate, { color: colors.textSecondary, marginTop: 8 }]} numberOfLines={1}>
              📅 {announcementDates.length === 1 
                ? formatShortDate(announcementDates[0])
                : `${formatShortDate(announcementDates[0])} - ${formatShortDate(announcementDates[announcementDates.length - 1])}`
              }
            </Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const renderUserEvent = ({ item }: { item: EventItem }) => (
    <View style={styles.userEventCard}>
      <TouchableOpacity 
        style={{ flex: 1, flexDirection: 'row' }}
        onPress={() => {
          setSelectedEvent(item);
          setIsViewingOwnEvent(true);
          setShowEventDetails(true);
        }}
      >
        {/* Flyer Section */}
        <View style={styles.userEventFlyerContainer}>
          {item.flyer && item.flyer.startsWith('https://') ? (
            <Image source={{ uri: item.flyer }} style={styles.userEventFlyerImage} resizeMode="cover" />
          ) : (
            <View style={styles.userEventPlaceholderFlyer}>
              <Text style={styles.userEventPlaceholderText}>
                {item.flyer ? 'LOADING...' : 'NO FLYER'}
              </Text>
            </View>
          )}
        </View>

        {/* Event Info Section */}
        <View style={styles.userEventContent}>
          <Text style={styles.userEventTitle} numberOfLines={1}>{item.title}</Text>
          <Text style={styles.userEventDate}>
            📅 {formatShortDate(item.date)} • {item.category}
          </Text>
          <Text style={styles.userEventTime}>
            🕒 {item.startTime} - {item.endTime}
          </Text>
          {item.venue && item.appearance !== 'Virtual Meeting' && <Text style={styles.userEventVenue}>📍 {item.venue}</Text>}
        </View>
      </TouchableOpacity>

      {/* Delete Button */}
      <TouchableOpacity 
        style={styles.userEventDeleteBtn}
        onPress={() => {
          showAlert(
            'Delete Event',
            'Are you sure you want to delete this event?',
            [
              { 
                text: 'Cancel', 
                style: 'cancel',
                onPress: () => {}
              },
              { 
                text: 'Delete', 
                style: 'destructive',
                onPress: () => handleDeleteEvent(item.id)
              }
            ]
          );
        }}
      >
        <Text style={styles.userEventDeleteText}>Delete</Text>
      </TouchableOpacity>
    </View>
  );

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          {/* Modern Loading Animation */}
          <View style={styles.loadingContent}>
            {/* Animated Pulsing Rings */}
            <View style={styles.loadingRingsContainer}>
              <Animated.View 
                style={[
                  styles.loadingRing, 
                  styles.loadingRingOuter,
                  { 
                    backgroundColor: colors.primary + '20',
                    borderColor: colors.primary + '30',
                    transform: [{ scale: pulseAnim }],
                  }
                ]} 
              />
              <Animated.View 
                style={[
                  styles.loadingRing, 
                  styles.loadingRingMiddle,
                  { 
                    backgroundColor: colors.primary + '30',
                    borderColor: colors.primary + '50',
                    transform: [{ scale: Animated.multiply(pulseAnim, 1.05) }],
                  }
                ]} 
              />
              <Animated.View 
                style={[
                  styles.loadingRing, 
                  styles.loadingRingInner,
                  { 
                    backgroundColor: colors.primary + '60',
                    borderColor: colors.primary,
                    transform: [{ scale: Animated.multiply(pulseAnim, 1.1) }],
                  }
                ]} 
              />
              {/* Center Icon */}
              <View style={[styles.loadingIconContainer, { backgroundColor: colors.primary }]}>
                <Text style={styles.loadingIcon}>📅</Text>
              </View>
            </View>
            
            {/* Loading Text with Professional Typography */}
            <View style={styles.loadingTextContainer}>
              <Text style={[styles.loadingTitle, { color: colors.text }]}>Loading Events</Text>
              <Text style={[styles.loadingSubtitle, { color: colors.textSecondary }]}>
                Fetching the latest campus activities...
              </Text>
            </View>

            {/* Animated Loading Dots */}
            <View style={styles.loadingDotsContainer}>
              <Animated.View 
                style={[
                  styles.loadingDot, 
                  { 
                    backgroundColor: colors.primary,
                    opacity: dotsAnim1,
                    transform: [{ scale: dotsAnim1 }],
                  }
                ]} 
              />
              <Animated.View 
                style={[
                  styles.loadingDot, 
                  { 
                    backgroundColor: colors.primary,
                    opacity: dotsAnim2,
                    transform: [{ scale: dotsAnim2 }],
                  }
                ]} 
              />
              <Animated.View 
                style={[
                  styles.loadingDot, 
                  { 
                    backgroundColor: colors.primary,
                    opacity: dotsAnim3,
                    transform: [{ scale: dotsAnim3 }],
                  }
                ]} 
              />
            </View>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} backgroundColor={colors.primary} />

      <View style={[
        styles.headerRow, 
        { 
          backgroundColor: colors.card, 
          borderBottomColor: colors.border,
          flexDirection: isMobile ? 'column' : 'row',
          padding: isMobile ? 12 : isTablet ? 14 : 16,
          alignItems: isMobile ? 'stretch' : 'flex-start',
        }
      ]}>
        <View style={{ flex: 1 }}>
          {/* Toggle Buttons */}
          <View style={[
            styles.feedToggleContainer,
            {
              flexWrap: isMobile ? 'wrap' : 'nowrap',
            }
          ]}>
            {/* Announcements button first */}
            <TouchableOpacity 
              style={[
                styles.feedToggleButton, 
                feedView === 'announcements' && styles.feedToggleButtonActive,
                { 
                  backgroundColor: feedView === 'announcements' ? colors.primary : colors.card, 
                  borderColor: colors.border,
                  paddingHorizontal: isMobile ? 16 : 20,
                  paddingVertical: isMobile ? 7 : 8,
                  minWidth: isMobile ? 90 : 100,
                }
              ]}
              onPress={() => setFeedView('announcements')}
            >
              <Text style={[
                styles.feedToggleText,
                { 
                  color: feedView === 'announcements' ? '#FFFFFF' : colors.text,
                  fontSize: isMobile ? 13 : 14,
                }
              ]}>Announcements</Text>
            </TouchableOpacity>
            {/* Events button second */}
            <TouchableOpacity 
              style={[
                styles.feedToggleButton, 
                feedView === 'events' && styles.feedToggleButtonActive,
                { 
                  backgroundColor: feedView === 'events' ? colors.primary : colors.card, 
                  borderColor: colors.border,
                  paddingHorizontal: isMobile ? 16 : 20,
                  paddingVertical: isMobile ? 7 : 8,
                  minWidth: isMobile ? 90 : 100,
                }
              ]}
              onPress={() => setFeedView('events')}
            >
              <Text style={[
                styles.feedToggleText,
                { 
                  color: feedView === 'events' ? '#FFFFFF' : colors.text,
                  fontSize: isMobile ? 13 : 14,
                }
              ]}>Events</Text>
            </TouchableOpacity>
          </View>
          
          {userUniversity && (
            <Text style={[
              styles.universityText, 
              { 
                color: colors.primary,
                fontSize: isMobile ? 13 : 14,
              }
            ]}>📍 {userUniversity}</Text>
          )}
        </View>
        <View style={[
          styles.headerButtons,
          {
            marginTop: isMobile ? 12 : 0,
            justifyContent: isMobile ? 'flex-end' : 'center',
            alignSelf: isMobile ? 'stretch' : 'flex-start',
          }
        ]}>
          {/* Filter Button - Added on the left of Add Event Button */}
          <TouchableOpacity 
            style={[
              styles.filterButton, 
              { 
                backgroundColor: '#E3F2FD', 
                marginRight: 8,
                paddingHorizontal: isMobile ? 14 : 16,
                height: isMobile ? 36 : 40,
                flex: isMobile ? 1 : 0,
              }
            ]} 
            onPress={() => setShowFilterModal(true)}
          >
            <Text style={[
              styles.filterButtonText, 
              { 
                color: '#2E8BC0',
                fontSize: isMobile ? 13 : 14,
              }
            ]}>Filter</Text>
            {activeFilter !== 'All' && (
              <View style={[styles.filterBadge, { backgroundColor: '#2E8BC0' }]}>
                <Text style={styles.filterBadgeText}>✓</Text>
              </View>
            )}
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[
              styles.addButton, 
              { 
                backgroundColor: colors.primary,
                width: isMobile ? 36 : 40,
                height: isMobile ? 36 : 40,
              }
            ]} 
            onPress={() => setShowActionMenu(true)}
          >
            <Text style={[
              styles.addButtonText,
              { fontSize: isMobile ? 22 : 24 }
            ]}>＋</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Professional Modern Search Bar - Fixed with high zIndex */}
      <View style={{ zIndex: 1000 }}>
        <SearchBar
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          suggestions={searchSuggestions}
          onSelectSuggestion={handleSelectSuggestion}
          onClearSearch={handleClearSearch}
          colors={colors}
        />
      </View>

      {/* Active Filter Indicator */}
      {activeFilter !== 'All' && (
        <View style={[styles.activeFilterContainer, { backgroundColor: colors.primaryLight + '30' }]}>
          <Text style={[styles.activeFilterText, { color: colors.primary }]}>
            Active Filter: {activeFilter}
            {filterTimeRange && ` • ${formatTimeDisplay(filterTimeRange.startTime)} - ${formatTimeDisplay(filterTimeRange.endTime)}`}
          </Text>
          <TouchableOpacity onPress={() => handleApplyFilter('All')}>
            <Text style={[styles.clearFilterText, { color: colors.primary }]}>✕</Text>
          </TouchableOpacity>
        </View>
      )}

      {isSearchActive && searchQuery && (
        <View style={styles.searchResultsHeader}>
          <Text style={[styles.searchResultsText, { color: colors.text }]}>
            Search results for &quot;{searchQuery}&quot; • {feedView === 'events' ? searchedEvents.length : filteredAnnouncements.length} {feedView === 'events' ? 'event' : 'announcement'}{(feedView === 'events' ? searchedEvents.length : filteredAnnouncements.length) !== 1 ? 's' : ''} found
          </Text>
          <TouchableOpacity onPress={handleClearSearch} style={styles.clearSearchResultsButton}>
            <Text style={[styles.clearSearchResultsText, { color: colors.primary }]}>Clear</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Banner - Show for events or announcements based on feedView, with fallback */}
      {feedView === 'events' && todayEvents.length > 0 && bannerIndex < todayEvents.length && !isSearchActive ? (
        <TouchableOpacity 
          onPress={() => {
            if (todayEvents[bannerIndex]) {
              setSelectedEvent(todayEvents[bannerIndex]);
              setIsViewingOwnEvent(false);
              setShowEventDetails(true);
            }
          }}
        >
          <View style={[
            styles.adBanner, 
            { 
              backgroundColor: getCategoryBackground(todayEvents[bannerIndex]?.category || 'General', bannerIndex).gradient[0],
            }
          ]}>
            <Image 
              source={{ uri: todayEvents[bannerIndex]?.flyer && todayEvents[bannerIndex].flyer.startsWith('https://') 
                ? todayEvents[bannerIndex].flyer 
                : getCategoryBackground(todayEvents[bannerIndex]?.category || 'General', bannerIndex).bgImage 
              }} 
              style={styles.adBgImage} 
              blurRadius={8}
            />
            {/* Removed dark overlay on banner */}
            <View style={styles.adContent}>
              <View style={styles.adTextSide}>
                <View style={{ flexDirection: 'row', gap: 6, marginBottom: 4 }}>
                  <View style={styles.liveTag}><Text style={styles.liveTagText}>📅 EVENT</Text></View>
                  <View style={styles.liveTag}><Text style={styles.liveTagText}>{getEventStatus(todayEvents[bannerIndex])}</Text></View>
                </View>
                <Text style={[styles.adTitle, { color: '#FF9800' }]} numberOfLines={2}>{todayEvents[bannerIndex]?.title || ''}</Text>
                <Text style={styles.adLocation} numberOfLines={1}>
                  {todayEvents[bannerIndex]?.appearance === 'Virtual Meeting' 
                    ? todayEvents[bannerIndex]?.platform 
                    : (todayEvents[bannerIndex]?.appearance === 'Both' 
                        ? (todayEvents[bannerIndex]?.venue || todayEvents[bannerIndex]?.platform)
                        : todayEvents[bannerIndex]?.venue)}
                </Text>
                {todayEvents[bannerIndex]?.startTime && todayEvents[bannerIndex]?.endTime && (
                  <Text style={styles.adTime}>🕒 {todayEvents[bannerIndex].startTime} - {todayEvents[bannerIndex].endTime} ({calculateDuration(todayEvents[bannerIndex].startTime!, todayEvents[bannerIndex].endTime!)})</Text>
                )}
              </View>
                <View style={styles.adFlyerSide}>
                  <View style={styles.adFlyerCard}>
                    {todayEvents[bannerIndex]?.flyer && todayEvents[bannerIndex].flyer.startsWith('https://') ? (
                      <Image source={{ uri: todayEvents[bannerIndex].flyer }} style={styles.adFlyerImage} resizeMode="contain" />
                    ) : (
                      <View style={styles.adPlaceholder}><Text style={styles.adPlaceholderText}>FLYER</Text></View>
                    )}
                  </View>
                </View>
            </View>
          </View>
        </TouchableOpacity>
      ) : !isSearchActive && bannerItems.length > 0 && bannerIndex < bannerItems.length ? (
        (() => {
          const current = bannerItems[bannerIndex];

          if (current.type === 'event') {
            const event = current.data;
            return (
              <TouchableOpacity 
                onPress={() => {
                  setSelectedEvent(event);
                  setIsViewingOwnEvent(false);
                  setShowEventDetails(true);
                }}
              >
                <View style={[
                  styles.adBanner, 
                  { 
                    backgroundColor: getCategoryBackground(event?.category || 'General').gradient[0],
                  }
                ]}>
                  {event?.flyer && event.flyer.startsWith('https://') ? (
                    <>
                      <Image source={{ uri: event.flyer }} style={styles.adBgImage} blurRadius={14} />
                      {/* Removed dark overlay on banner */}
                    </>
                  ) : (
                    <>
                      <View style={styles.adPatternOverlay}>
                        <Text style={styles.adPatternText}>{getCategoryBackground(event?.category || 'General').pattern}</Text>
                        <Text style={styles.adPatternText}>{getCategoryBackground(event?.category || 'General').pattern}</Text>
                        <Text style={styles.adPatternText}>{getCategoryBackground(event?.category || 'General').pattern}</Text>
                      </View>
                    </>
                  )}
                  <View style={styles.adContent}>
                    <View style={styles.adTextSide}>
                      <View style={{ flexDirection: 'row', gap: 6, marginBottom: 4 }}>
                        <View style={styles.liveTag}><Text style={styles.liveTagText}>📅 EVENT</Text></View>
                        <View style={styles.liveTag}><Text style={styles.liveTagText}>{getEventStatus(event)}</Text></View>
                      </View>
                      <Text style={[styles.adTitle, { color: '#FF9800' }]} numberOfLines={2}>{event?.title || ''}</Text>
                      <Text style={styles.adLocation} numberOfLines={1}>
                        {event?.appearance === 'Virtual Meeting' 
                          ? event?.platform 
                          : (event?.appearance === 'Both' 
                              ? (event?.venue || event?.platform)
                              : event?.venue)}
                      </Text>
                      {event?.startTime && event?.endTime && (
                        <Text style={styles.adTime}>🕒 {event.startTime} - {event.endTime} ({calculateDuration(event.startTime!, event.endTime!)})</Text>
                      )}
                    </View>
                    <View style={styles.adFlyerSide}>
                      <View style={styles.adFlyerCard}>
                        {event?.flyer && event.flyer.startsWith('https://') ? (
                          <Image source={{ uri: event.flyer }} style={styles.adFlyerImage} resizeMode="contain" />
                        ) : (
                          <View style={styles.adPlaceholder}><Text style={styles.adPlaceholderText}>FLYER</Text></View>
                        )}
                      </View>
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            );
          }

          const announcement = current.data;
          const announcementIndex = announcement?.id
            ? announcement.id.split('').reduce((acc: number, char: string) => acc + char.charCodeAt(0), 0)
            : 0;
          return (
            <TouchableOpacity 
              onPress={() => {
                setSelectedAnnouncement(announcement);
                setShowAnnouncementDetails(true);
              }}
            >
              <View style={[
                styles.adBanner, 
                { 
                  backgroundColor: getCategoryBackground(announcement?.category || 'General', announcementIndex).gradient[0],
                }
              ]}>
                <Image 
                  source={{ uri: announcement?.image_url && announcement.image_url.startsWith('https://') 
                    ? announcement.image_url 
                    : getCategoryBackground(announcement?.category || 'General', announcementIndex).bgImage 
                  }} 
                  style={styles.adBgImage} 
                  blurRadius={8}
                />
                <View style={[styles.adBgOverlay, {
                  ...(Platform.OS === 'web'
                    ? ({ backgroundImage: 'linear-gradient(135deg, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0.7) 100%)' } as any)
                    : {}),
                  backgroundColor: 'rgba(0,0,0,0.6)',
                }]} />
                <View style={{ position: 'absolute', top: 12, right: 12, zIndex: 10 }}>
                  <View style={[styles.liveTag, { 
                    backgroundColor: announcement?.priority === 'Urgent' ? colors.error : colors.success,
                    paddingHorizontal: 10,
                    paddingVertical: 4,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.3,
                    shadowRadius: 4,
                    elevation: 5,
                  }]}>
                    <Text style={[styles.liveTagText, { 
                      color: '#ffffff',
                      fontSize: 9,
                      fontWeight: '900',
                    }]}>
                      {announcement?.priority || 'Not Urgent'}
                    </Text>
                  </View>
                </View>
                <View style={styles.adContent}>
                  <View style={styles.adTextSide}>
                    <View style={{ flexDirection: 'row', gap: 6, marginBottom: 4 }}>
                      <View style={[styles.liveTag, { backgroundColor: 'rgba(255,255,255,0.25)' }]}>
                        <Text style={styles.liveTagText}>📢 ANNOUNCEMENT</Text>
                      </View>
                      <View style={[styles.liveTag, { backgroundColor: 'rgba(255,255,255,0.3)' }]}>
                        <Text style={styles.liveTagText}>
                          {(() => {
                            if (!announcement?.announcement_dates) return 'UPCOMING';
                            try {
                              const dates = JSON.parse(announcement.announcement_dates);
                              const announcementDate = new Date(dates[0]);
                              const today = new Date();
                              today.setHours(0, 0, 0, 0);
                              announcementDate.setHours(0, 0, 0, 0);
                              const daysDiff = Math.floor((announcementDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                              
                              if (daysDiff === 0) return 'TODAY';
                              if (daysDiff === 1) return 'TOMORROW';
                              return `IN ${daysDiff} DAYS`;
                            } catch {
                              return 'UPCOMING';
                            }
                          })()}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.adTitle} numberOfLines={2}>{announcement?.title || ''}</Text>
                    {announcement?.from_time && announcement?.to_time && (
                      <Text style={[styles.adTime, { marginBottom: 2 }]}>🕒 {announcement.from_time} - {announcement.to_time}</Text>
                    )}
                    <Text style={[styles.adLocation, { marginTop: 2 }]} numberOfLines={1}>
                      👥 {announcement?.announced_for || 'All Students'}
                    </Text>
                  </View>
                  <View style={styles.adFlyerSide}>
                    <View style={styles.adFlyerCard}>
                      {announcement?.image_url && announcement.image_url.startsWith('https://') ? (
                        <Image source={{ uri: announcement.image_url }} style={styles.adFlyerImage} resizeMode="contain" />
                      ) : (
                        <View style={styles.adPlaceholder}><Text style={styles.adPlaceholderText}>📢</Text></View>
                      )}
                    </View>
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          );
        })()
      ) : null}

      <View style={{ marginBottom: 15, zIndex: 1 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollPadding}>
          {['All', ...CATEGORIES].map(cat => (
            <TouchableOpacity
              key={cat}
              onPress={() => setActiveCategory(cat as EventCategory | 'All')}
              style={[
                styles.categoryChip,
                { backgroundColor: colors.card, borderColor: colors.border },
                activeCategory === cat && { backgroundColor: colors.primary, borderColor: colors.primary },
              ]}
            >
              <Text
                style={[
                  styles.categoryText,
                  { color: colors.textSecondary },
                  activeCategory === cat && { color: '#ffffff', fontWeight: '700' },
                ]}
              >
                {cat}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Show login/signup message for events if not signed in, but always show the banner above */}
      {feedView === 'events' && !currentUserId ? (
        <>
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyText, { color: colors.text, marginBottom: 8 }]}>Sign up or log in to see all events</Text>
            <Text style={[styles.emptySubtext, { color: colors.textSecondary, marginBottom: 20 }]}>Events are only visible to registered users. Announcements are always visible.</Text>
            <TouchableOpacity
              style={{
                backgroundColor: colors.primary,
                paddingHorizontal: 32,
                paddingVertical: 14,
                borderRadius: 24,
                marginTop: 8,
                alignItems: 'center',
                shadowColor: colors.primary,
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.2,
                shadowRadius: 4,
                elevation: 2,
              }}
              onPress={() => router.push('/auth')}
            >
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>Sign up / Log in</Text>
            </TouchableOpacity>
          </View>
        </>
      ) : ( (feedView === 'events' ? filteredEvents : filteredAnnouncements).length === 0 ? (
        <View style={styles.emptyContainer}>
          {isSearchActive ? (
            <>
              <Text style={[styles.emptyText, { color: colors.text }]}>No {feedView} found for &quot;{searchQuery}&quot;</Text>
              <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>Try a different search term</Text>
            </>
          ) : (
            <>
              <Text style={[styles.emptyText, { color: colors.text }]}>No {feedView} found for {activeFilter !== 'All' ? activeFilter : userUniversity}</Text>
              <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>
                {activeFilter !== 'All' ? 'Try changing your filter settings' : `Be the first to create ${feedView === 'events' ? 'an event' : 'an announcement'}!`}
              </Text>
            </>
          )}
        </View>
      ) : (
        <FlatList
          data={feedView === 'events' ? filteredEvents : filteredAnnouncements}
          keyExtractor={item => item.id}
          renderItem={feedView === 'events' ? renderEvent : renderAnnouncement}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[colors.primary]}
            />
          }
        />
      ))}

      <ActionMenuModal
        showActionMenu={showActionMenu}
        setShowActionMenu={setShowActionMenu}
        isDarkMode={isDarkMode}
        colors={colors}
        currentUserId={currentUserId}
        requireAuth={requireAuth}
        setIsModalVisible={setIsModalVisible}
        setIsAnnouncementModalVisible={setIsAnnouncementModalVisible}
        fetchUserEvents={fetchUserEvents}
        setShowUserEvents={setShowUserEvents}
        fetchUserAnnouncements={fetchUserAnnouncements}
        setShowUserAnnouncements={setShowUserAnnouncements}
      />

      {/* FILTER MODAL */}
      <FilterModal
        visible={showFilterModal}
        onClose={() => setShowFilterModal(false)}
        colors={colors}
        onApplyFilter={handleApplyFilter}
        currentFilter={activeFilter}
      />

      <UserEventsModal
        showUserEvents={showUserEvents}
        setShowUserEvents={setShowUserEvents}
        colors={colors}
        userEvents={userEvents}
        renderUserEvent={renderUserEvent}
      />

      <UserAnnouncementsModal
        showUserAnnouncements={showUserAnnouncements}
        setShowUserAnnouncements={setShowUserAnnouncements}
        colors={colors}
        userAnnouncements={userAnnouncements}
        setSelectedAnnouncement={setSelectedAnnouncement}
        setViewingAnnouncementFromMyList={setViewingAnnouncementFromMyList}
        setShowAnnouncementDetails={setShowAnnouncementDetails}
        setFullScreenImageUrl={setFullScreenImageUrl}
        setShowFullScreenImage={setShowFullScreenImage}
      />

      <EventDetailsModal
        showEventDetails={showEventDetails}
        setShowEventDetails={setShowEventDetails}
        styles={styles}
        colors={colors}
        selectedEvent={selectedEvent}
        setShowFlyerFullView={setShowFlyerFullView}
        isDarkMode={isDarkMode}
        formatFullDate={formatFullDate}
        calculateDuration={calculateDuration}
        showAlert={showAlert}
        setReminderEvent={setReminderEvent}
        buildDateFromStrings={buildDateFromStrings}
        setReminderSelections={setReminderSelections}
        setReminderModalVisible={setReminderModalVisible}
        reminderModalVisible={reminderModalVisible}
        setShowReminderDatePicker={setShowReminderDatePicker}
        reminderSelections={reminderSelections}
        formatTimeDisplay={formatTimeDisplay}
        setEditingReminderDate={setEditingReminderDate}
        setEditingReminderTime={setEditingReminderTime}
        setShowReminderTimePicker={setShowReminderTimePicker}
        isReminderValid={isReminderValid}
        handleAddReminderToCalendar={handleAddReminderToCalendar}
        renderGoogleCalendarOption={renderGoogleCalendarOption}
        showReminderDatePicker={showReminderDatePicker}
        getTodayUTC={getTodayUTC}
        getReminderMaxDate={getReminderMaxDate}
        showReminderTimePicker={showReminderTimePicker}
        reminderEvent={reminderEvent}
        editingReminderDate={editingReminderDate}
        isViewingOwnEvent={isViewingOwnEvent}
        handleEditEvent={handleEditEvent}
        handleDeleteEvent={handleDeleteEvent}
      />

      <AnnouncementDetailsModal
        showAnnouncementDetails={showAnnouncementDetails}
        setShowAnnouncementDetails={setShowAnnouncementDetails}
        setViewingAnnouncementFromMyList={setViewingAnnouncementFromMyList}
        styles={styles}
        colors={colors}
        selectedAnnouncement={selectedAnnouncement}
        setFullScreenImageUrl={setFullScreenImageUrl}
        setShowFullScreenImage={setShowFullScreenImage}
        viewingAnnouncementFromMyList={viewingAnnouncementFromMyList}
        currentUserId={currentUserId}
        editAnnouncement={editAnnouncement}
        showDeleteConfirmation={showDeleteConfirmation}
      />

      <FullscreenFlyerModal
        showFlyerFullView={showFlyerFullView}
        setShowFlyerFullView={setShowFlyerFullView}
        styles={styles}
        isDarkMode={isDarkMode}
        selectedEvent={selectedEvent}
      />

      <NewEventModal
        isModalVisible={isModalVisible}
        styles={styles}
        colors={colors}
        isEditingEvent={isEditingEvent}
        setIsModalVisible={setIsModalVisible}
        setShowCalendar={setShowCalendar}
        setSelectedDates={setSelectedDates}
        setDayDetails={setDayDetails}
        setIsEditingEvent={setIsEditingEvent}
        setFormData={setFormData}
        getTodayUTC={getTodayUTC}
        showCalendar={showCalendar}
        selectedDates={selectedDates}
        userUniversity={userUniversity}
        formData={formData}
        pickFlyer={pickFlyer}
        formatFullDate={formatFullDate}
        timeToMinutes={timeToMinutes}
        calculateDuration={calculateDuration}
        setShowDescriptionModal={setShowDescriptionModal}
        showDescriptionModal={showDescriptionModal}
        allDaysHaveDifferentTimes={allDaysHaveDifferentTimes}
        dayDetails={dayDetails}
        allDaysHaveDifferentVenues={allDaysHaveDifferentVenues}
        handleEditDay={handleEditDay}
        CATEGORIES={CATEGORIES}
        APPEARANCES={APPEARANCES}
        PLATFORMS={PLATFORMS}
        setShowGeneralDescriptionModal={setShowGeneralDescriptionModal}
        showGeneralDescriptionModal={showGeneralDescriptionModal}
        handleAddEvent={handleAddEvent}
        formatTimeDisplay={formatTimeDisplay}
      />

      {/* Day Editor Modal */}
      {showDayEditor && editingDayDate && (
        <DayEditorModal
          visible={showDayEditor}
          onClose={() => setShowDayEditor(false)}
          dayData={dayDetails[editingDayDate] || {
            startTime: formData.startTime,
            endTime: formData.endTime,
            description: '',
            venue: formData.venue,
            platform: formData.platform,
            link: formData.link,
          }}
          dayIndex={editingDayIndex}
          date={editingDayDate}
          onSave={(data) => handleSaveDayDetails(editingDayDate, data)}
          formData={formData}
          selectedDatesLength={selectedDates.length}
          colors={colors}
        />
      )}

      {/* Custom Alert Modal */}
      <CustomAlert
        visible={alertState.visible}
        title={alertState.title}
        message={alertState.message}
        buttons={alertState.buttons}
        onClose={hideAlert}
        colors={colors}
      />

      <Modal visible={publishOverlay.visible} transparent animationType="fade" statusBarTranslucent>
        <View style={styles.publishingOverlay}>
          <View style={[styles.publishingCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View
              style={[
                styles.publishingIconWrap,
                {
                  backgroundColor:
                    publishOverlay.phase === 'success' ? `${colors.success}20` : `${colors.primary}20`,
                },
              ]}
            >
              {publishOverlay.phase === 'processing' ? (
                <ActivityIndicator size="large" color={colors.primary} />
              ) : (
                <Text style={[styles.publishingSuccessIcon, { color: colors.success }]}>✓</Text>
              )}
            </View>

            <Text style={[styles.publishingTitle, { color: colors.text }]}>
              {publishOverlay.phase === 'processing'
                ? publishOverlay.kind === 'event'
                  ? 'Publishing Event'
                  : 'Posting Announcement'
                : 'Success'}
            </Text>
            <Text style={[styles.publishingMessage, { color: colors.textSecondary }]}>
              {publishOverlay.message}
            </Text>

            {publishOverlay.phase === 'success' ? (
              <TouchableOpacity
                style={[styles.publishingOkButton, { backgroundColor: colors.primary }]}
                onPress={acknowledgePublishSuccess}
                activeOpacity={0.85}
              >
                <Text style={styles.publishingOkButtonText}>OK</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>
      </Modal>

      <Modal visible={uploadOverlay.visible} transparent animationType="fade" statusBarTranslucent>
        <View style={styles.publishingOverlay}>
          <View style={[styles.publishingCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View
              style={[
                styles.publishingIconWrap,
                {
                  backgroundColor:
                    uploadOverlay.phase === 'success' ? `${colors.success}20` : `${colors.primary}20`,
                },
              ]}
            >
              {uploadOverlay.phase === 'processing' ? (
                <ActivityIndicator size="large" color={colors.primary} />
              ) : (
                <Text style={[styles.publishingSuccessIcon, { color: colors.success }]}>✓</Text>
              )}
            </View>

            <Text style={[styles.publishingTitle, { color: colors.text }]}>
              {uploadOverlay.phase === 'processing' ? 'Uploading Flyer' : 'Upload Complete'}
            </Text>
            <Text style={[styles.publishingMessage, { color: colors.textSecondary }]}>
              {uploadOverlay.message}
            </Text>
          </View>
        </View>
      </Modal>

      <AnnouncementModal
        isAnnouncementModalVisible={isAnnouncementModalVisible}
        setIsAnnouncementModalVisible={setIsAnnouncementModalVisible}
        setShowAnnouncementCalendar={setShowAnnouncementCalendar}
        setSelectedAnnouncement={setSelectedAnnouncement}
        setSelectedAnnouncementDates={setSelectedAnnouncementDates}
        getTodayUTC={getTodayUTC}
        setAnnouncementDayDetails={setAnnouncementDayDetails}
        setAnnouncementData={setAnnouncementData}
        colors={colors}
        selectedAnnouncement={selectedAnnouncement}
        showAnnouncementCalendar={showAnnouncementCalendar}
        selectedAnnouncementDates={selectedAnnouncementDates}
        announcementData={announcementData}
        userUniversity={userUniversity}
        CATEGORIES={CATEGORIES}
        showAnnouncementDatePicker={showAnnouncementDatePicker}
        setShowAnnouncementDatePicker={setShowAnnouncementDatePicker}
        showAnnouncementDayEditor={showAnnouncementDayEditor}
        editingAnnouncementDayIndex={editingAnnouncementDayIndex}
        editingAnnouncementDayDate={editingAnnouncementDayDate}
        showFullScreenMessageEditor={showFullScreenMessageEditor}
        setShowFullScreenMessageEditor={setShowFullScreenMessageEditor}
        announcementDayDetails={announcementDayDetails}
        formatFullDate={formatFullDate}
        formatTimeDisplay={formatTimeDisplay}
        setEditingAnnouncementDayIndex={setEditingAnnouncementDayIndex}
        setEditingAnnouncementDayDate={setEditingAnnouncementDayDate}
        setShowAnnouncementDayEditor={setShowAnnouncementDayEditor}
        saveEditedAnnouncement={saveEditedAnnouncement}
        showAlert={showAlert}
        requireAuth={requireAuth}
        uploadImageToSupabase={uploadImageToSupabase}
        fetchUserAnnouncements={fetchUserAnnouncements}
        fetchAllAnnouncements={fetchAllAnnouncements}
        startPublishFlow={startPublishFlow}
        completePublishFlow={completePublishFlow}
        stopPublishFlow={stopPublishFlow}
        startUploadFlow={startUploadFlow}
        completeUploadFlow={completeUploadFlow}
        stopUploadFlow={stopUploadFlow}
      />

      {/* FULL SCREEN IMAGE MODAL */}
      <Modal visible={showFullScreenImage} animationType="fade" transparent>
        <View style={{ flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.95)' }}>
          <SafeAreaView style={{ flex: 1 }}>
            {/* Close Button */}
            <TouchableOpacity 
              style={{
                position: 'absolute',
                top: 50,
                right: 20,
                zIndex: 10,
                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                width: 40,
                height: 40,
                borderRadius: 20,
                justifyContent: 'center',
                alignItems: 'center',
              }}
              onPress={() => setShowFullScreenImage(false)}
            >
              <Text style={{ fontSize: 24, color: '#fff', fontWeight: 'bold' }}>×</Text>
            </TouchableOpacity>

            {/* Full Screen Image */}
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
              <Image 
                source={{ uri: fullScreenImageUrl }} 
                style={{ width: '100%', height: '100%' }}
                resizeMode="contain"
              />
            </View>
          </SafeAreaView>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

/* ---------------- STYLES CREATOR ---------------- */
export const createStyles = (colors: typeof LIGHT_COLORS) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  loadingContainer: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  loadingContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingRingsContainer: {
    width: 140,
    height: 140,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  loadingRing: {
    position: 'absolute',
    borderRadius: 999,
    borderWidth: 2,
  },
  loadingRingOuter: {
    width: 140,
    height: 140,
    opacity: 0.3,
  },
  loadingRingMiddle: {
    width: 100,
    height: 100,
    opacity: 0.5,
  },
  loadingRingInner: {
    width: 60,
    height: 60,
    opacity: 0.8,
  },
  loadingIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  loadingIcon: {
    fontSize: 24,
  },
  loadingTextContainer: {
    marginTop: 32,
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  loadingTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 8,
    letterSpacing: 0.3,
  },
  loadingSubtitle: {
    fontSize: 14,
    fontWeight: '400',
    textAlign: 'center',
    lineHeight: 20,
  },
  loadingDotsContainer: {
    flexDirection: 'row',
    marginTop: 24,
    gap: 8,
  },
  loadingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  loadingText: { fontSize: 16, color: colors.text },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', padding: 14, alignItems: 'flex-start', backgroundColor: colors.card, borderBottomWidth: 1, borderBottomColor: colors.border },
  headerButtons: { flexDirection: 'row', alignItems: 'center' },
  welcomeText: { fontSize: 12, color: colors.textSecondary, fontWeight: '700', textTransform: 'uppercase' },
  header: { fontSize: 32, fontWeight: '900', color: colors.text },
  universityText: { fontSize: 14, color: colors.primary, marginTop: 4, fontWeight: '600' },
  feedToggleContainer: { flexDirection: 'row', marginTop: 8, marginBottom: 8, gap: 8 },
  feedToggleButton: { paddingHorizontal: 20, paddingVertical: 8, borderRadius: 20, borderWidth: 1, minWidth: 100, alignItems: 'center' },
  feedToggleButtonActive: { elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2 },
  feedToggleText: { fontSize: 14, fontWeight: '600' },
  addButton: { backgroundColor: colors.primary, width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  addButtonText: { color: '#ffffff', fontSize: 24 },
  filterButton: { backgroundColor: '#E3F2FD', paddingHorizontal: 16, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center', flexDirection: 'row', position: 'relative' },
  filterButtonText: { color: '#2E8BC0', fontSize: 14, fontWeight: '600' },
  filterBadge: { position: 'absolute', top: -4, right: -4, backgroundColor: '#2E8BC0', width: 16, height: 16, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  filterBadgeText: { color: '#ffffff', fontSize: 10, fontWeight: 'bold' },
  activeFilterContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, marginHorizontal: 10, marginTop: 5, borderRadius: 10 },
  activeFilterText: { fontSize: 12, fontWeight: '600', color: colors.primary, flex: 1 },
  clearFilterText: { fontSize: 16, fontWeight: 'bold', marginLeft: 8 },

  // Search Bar Styles - FIXED with proper z-index
  searchContainer: {
    paddingHorizontal: 10,
    paddingTop: 6,
    paddingBottom: 4,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    position: 'relative',
  },
  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: colors.border,
    paddingHorizontal: 16,
    paddingVertical: 9,
    elevation: 3,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  searchIconContainer: {
    marginRight: 12,
  },
  searchIcon: {
    fontSize: 13,
    color: colors.textTertiary,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: colors.text,
    paddingVertical: 0,
    paddingHorizontal: 0,
  },
  clearSearchButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  clearSearchIcon: {
    fontSize: 14,
    color: colors.textTertiary,
    fontWeight: '600',
  },
  suggestionsContainer: {
    position: 'absolute',
    top: 55, // Adjusted to be closer to the search input
    left: 0,
    right: 0,
    marginHorizontal: 20,
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: colors.border,
    elevation: 9999, // Very high elevation for Android
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    zIndex: 9999, // Very high zIndex for iOS
    maxHeight: 320,
  },
  suggestionsList: {
    maxHeight: 280,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border + '40',
  },
  suggestionIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.primaryLight + '30',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  suggestionIcon: {
    fontSize: 16,
  },
  suggestionContent: {
    flex: 1,
  },
  suggestionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 2,
  },
  suggestionSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  suggestionArrow: {
    fontSize: 18,
    color: colors.textTertiary,
    fontWeight: '300',
  },
  suggestionsFooter: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border + '40',
    backgroundColor: colors.surface,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
  },
  suggestionsFooterText: {
    fontSize: 12,
    color: colors.textTertiary,
    fontWeight: '500',
    textAlign: 'center',
  },
  searchResultsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: colors.surface,
    marginTop: 8,
  },
  searchResultsText: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  clearSearchResultsButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: colors.primaryLight + '30',
    borderRadius: 8,
  },
  clearSearchResultsText: {
    fontSize: 13,
    fontWeight: '600',
  },

  // Filter Modal Styles
  filterOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  filterOptionSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight + '30',
  },
  filterOptionIcon: {
    fontSize: 20,
    marginRight: 12,
    width: 24,
  },
  filterOptionText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
  },
  filterOptionCheck: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  filterOptionArrow: {
    fontSize: 18,
  },
  filterSectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 12,
    color: colors.text,
    textTransform: 'uppercase',
  },
  timeFilterSection: {
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 20,
    overflow: 'hidden',
  },
  timeFilterToggle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  timeFilterLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
  timeFilterToggleIcon: {
    fontSize: 14,
  },
  timeRangeContent: {
    padding: 16,
  },
  timeFilterSubLabel: {
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  timeFilterHint: {
    fontSize: 11,
    fontStyle: 'italic',
    marginTop: 8,
  },
  filterActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
    marginBottom: 30,
  },
  filterActionButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  filterResetButton: {
    borderWidth: 1,
  },
  filterApplyButton: {
    backgroundColor: colors.primary,
  },
  filterResetButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  filterApplyButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },

  actionMenuOverlay: { flex: 1, justifyContent: 'flex-end' },
  actionMenuContainer: { backgroundColor: colors.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingVertical: 24, paddingBottom: 40 },
  actionMenuTitle: { fontSize: 20, fontWeight: '900', color: colors.text, marginBottom: 20, textAlign: 'center' },
  actionMenuButton: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, marginBottom: 12, backgroundColor: colors.surface, borderRadius: 16, paddingHorizontal: 16, borderWidth: 1, borderColor: colors.border },
  actionMenuButtonIcon: { fontSize: 32, marginRight: 16 },
  actionMenuButtonTitle: { fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 4 },
  actionMenuButtonSubtitle: { fontSize: 12, color: colors.textSecondary },
  actionMenuCancel: { paddingVertical: 16, alignItems: 'center', marginTop: 12 },
  actionMenuCancelText: { fontSize: 16, fontWeight: '600', color: colors.textSecondary },

  userEventsList: { paddingHorizontal: 20, paddingVertical: 20 },
  userEventCard: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: colors.card, 
    borderRadius: 12, 
    borderWidth: 1, 
    borderColor: colors.border, 
    marginBottom: 12, 
    overflow: 'hidden',
    minHeight: 100,
  },
  userEventFlyerContainer: {
    width: 80,
    height: 100,
    backgroundColor: colors.surface,
    borderRightWidth: 1,
    borderRightColor: colors.border,
  },
  userEventFlyerImage: {
    width: '100%',
    height: '100%',
  },
  userEventPlaceholderFlyer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.surface,
  },
  userEventPlaceholderText: {
    fontSize: 10,
    color: colors.textSecondary,
    fontWeight: 'bold',
  },
  userEventContent: { flex: 1, padding: 16 },
  userEventTitle: { fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 8 },
  userEventDate: { fontSize: 13, color: colors.textSecondary, marginBottom: 4 },
  userEventTime: { fontSize: 13, color: colors.textSecondary, marginBottom: 4 },
  userEventVenue: { fontSize: 13, color: colors.textSecondary },
  userEventDeleteBtn: { paddingHorizontal: 12, paddingVertical: 8, backgroundColor: colors.error + '20', borderRadius: 8, marginRight: 12 },
  userEventDeleteText: { fontSize: 12, fontWeight: '600', color: colors.error },

  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40 },
  emptyText: { fontSize: 18, fontWeight: '700', color: colors.text, textAlign: 'center', marginBottom: 8 },
  emptySubtext: { fontSize: 14, color: colors.textSecondary, textAlign: 'center' },

  announcementsList: { paddingHorizontal: 20, paddingVertical: 20 },
  announcementCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 12,
    overflow: 'hidden',
    flexDirection: 'row',
  },
  announcementImageContainer: {
    width: 120,
    height: 120,
    overflow: 'hidden',
    borderRightWidth: 1,
    borderRightColor: colors.border,
  },
  announcementImageStyle: {
    width: '100%',
    height: '100%',
  },
  announcementImagePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  announcementImagePlaceholderText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textTertiary,
    textAlign: 'center',
  },
  announcementCardImage: {
    width: '100%',
    height: 150,
  },
  announcementCardContent: {
    padding: 16,
  },
  announcementCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  announcementCardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  announcementCardSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  priorityBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginLeft: 8,
  },
  priorityBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  announcementCardMessage: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 12,
    lineHeight: 20,
  },
  announcementCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  announcementCardDate: {
    fontSize: 12,
    color: colors.textTertiary,
  },
  announcementCardCategory: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  announcementCardActions: {
    flexDirection: 'row',
    gap: 8,
  },
  announcementActionBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  announcementActionBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },

  announcementMessageSection: {
    borderRadius: 16,
    padding: 24,
    marginTop: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  announcementMessageHeader: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  announcementMessageIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  announcementMessageIcon: {
    fontSize: 28,
  },
  announcementMessageTitle: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  announcementMessageDivider: {
    height: 2,
    backgroundColor: colors.primary,
    width: 60,
    alignSelf: 'center',
    borderRadius: 2,
    marginBottom: 20,
  },
  priorityButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  priorityButtonActive: {
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  priorityButtonText: {
    fontWeight: '600',
    fontSize: 14,
  },
  announcementMessageText: {
    fontSize: 16,
    lineHeight: 26,
    textAlign: 'left',
    fontWeight: '400',
    paddingHorizontal: 8,
  },

  universityBadge: {
    backgroundColor: colors.primaryLight + '30',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    alignSelf: 'flex-start',
    marginBottom: 20,
  },
  universityBadgeText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
  },

  categoryBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  categoryBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },

  dateTimeToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 20,
  },
  dateTimeToggleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  dateTimeToggleIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  dateTimeToggleTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 2,
  },
  dateTimeToggleSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  dateTimeToggleCheckbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dateTimeToggleCheckboxActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  dateTimeToggleCheckmark: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },

  adBanner: { 
    marginHorizontal: 5, 
    marginTop: 5, 
    minHeight: 130, 
    borderRadius: 20, 
    marginBottom: 5, 
    overflow: 'hidden',
    position: 'relative',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  adBgImage: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  adBgOverlay: { 
    position: 'absolute', 
    top: 0, 
    left: 0, 
    right: 0, 
    bottom: 0, 
  },
  adPatternOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    opacity: 0.15,
  },
  adPatternText: {
    fontSize: 60,
    transform: [{ rotate: '-15deg' }],
  },
  adContent: { 
    flex: 1, 
    flexDirection: 'row', 
    padding: 20, 
    borderRadius: 16,
  },
  adTextSide: { flex: 1.4 },
  liveTag: { 
    backgroundColor: 'rgba(255,255,255,0.3)', 
    alignSelf: 'flex-start', 
    paddingHorizontal: 10, 
    paddingVertical: 4, 
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
    backdropFilter: 'blur(10px)',
  },
  liveTagText: { 
    color: '#ffffff', 
    fontSize: 9, 
    fontWeight: '900', 
    textShadowColor: 'rgba(0,0,0,0.5)', 
    textShadowOffset: { width: 0, height: 1 }, 
    textShadowRadius: 3,
    letterSpacing: 0.5,
  },
  adTitle: { 
    color: '#ffffff', 
    fontSize: 16, 
    fontWeight: '900', 
    textShadowColor: 'rgba(0,0,0,0.6)', 
    textShadowOffset: { width: 0, height: 1 }, 
    textShadowRadius: 4,
    lineHeight: 20,
    letterSpacing: 0.3,
  },
  adLocation: { 
    color: '#ffffff', 
    opacity: 0.95, 
    fontSize: 13, 
    textShadowColor: 'rgba(0,0,0,0.5)', 
    textShadowOffset: { width: 0, height: 1 }, 
    textShadowRadius: 3,
  },
  adTime: { 
    color: '#ffffff', 
    opacity: 0.9, 
    fontSize: 12, 
    textShadowColor: 'rgba(0,0,0,0.5)', 
    textShadowOffset: { width: 0, height: 1 }, 
    textShadowRadius: 3,
  },
  adFlyerSide: { flex: 1, justifyContent: 'center' },
  adFlyerCard: { 
    width: '68%',
    maxHeight: 85,
    aspectRatio: 3 / 4,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 14,
    padding: 4,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.35)',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
    overflow: 'hidden',
    alignSelf: 'flex-end',
    justifyContent: 'center',
    alignItems: 'center'
  },
  adFlyerImage: { width: '100%', height: '100%' },
  adPlaceholder: { 
    width: '100%', 
    height: '100%', 
    backgroundColor: 'rgba(255,255,255,0.18)', 
    justifyContent: 'center', 
    alignItems: 'center',
  },
  adPlaceholderText: { color: '#ffffff', fontSize: 10, fontWeight: '600' },

  scrollPadding: { paddingHorizontal: 20 },
  categoryChip: { paddingVertical: 10, paddingHorizontal: 18, backgroundColor: colors.card, marginRight: 8, borderRadius: 12, borderWidth: 1, borderColor: colors.border },
  activeCategory: { backgroundColor: '#FF9500', borderColor: '#FF9500' },
  categoryText: { fontWeight: '600', fontSize: 13 },
  activeCategoryText: { color: '#ffffff', fontWeight: '700' },

  card: { backgroundColor: colors.card, borderRadius: 20, marginBottom: 16, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
  cardLayout: { flexDirection: 'row', padding: 12 },
  flyerContainer: { width: 75, height: 100, backgroundColor: colors.surface, borderRadius: 12, overflow: 'hidden' },
  flyerImage: { width: '100%', height: '100%' },
  placeholderFlyer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  placeholderText: { fontSize: 10, color: colors.textSecondary, fontWeight: 'bold' },
  cardContent: { flex: 1, paddingLeft: 12 },
  tagRow: { flexDirection: 'row', gap: 6, marginBottom: 8, flexWrap: 'wrap' },
  appearanceBadge: { backgroundColor: colors.primaryLight + '30', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  appearanceBadgeText: { fontSize: 9, fontWeight: '800', color: colors.primary },
  multiDayBadge: { backgroundColor: colors.info + '20', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  multiDayBadgeText: { fontSize: 9, fontWeight: '800', color: colors.info },
  title: { fontSize: 16, fontWeight: '800', color: colors.text },
  organizerText: { fontSize: 12, fontWeight: '600', color: colors.primary },
  footerInfo: { fontSize: 11, color: colors.textSecondary, marginTop: 4 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: colors.card, borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: colors.border },
  modalTitle: { fontSize: 24, fontWeight: '900', color: colors.text },
  closeBtn: { backgroundColor: colors.surface, width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  closeBtnText: { fontSize: 16, color: colors.textSecondary },

  inputLabel: { fontSize: 12, fontWeight: '800', marginBottom: 8, color: colors.text, textTransform: 'uppercase' },
  input: { backgroundColor: colors.surface, padding: 16, borderRadius: 14, marginBottom: 20, borderWidth: 1, borderColor: colors.border, fontSize: 15, color: colors.text },
  textArea: { height: 100, textAlignVertical: 'top' },

  uploadBox: { width: 140, height: 180, alignSelf: 'center', borderWidth: 2, borderStyle: 'dashed', borderColor: colors.border, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginBottom: 24, backgroundColor: colors.surface },
  uploadBoxActive: { borderColor: colors.primary, borderStyle: 'solid', backgroundColor: colors.primaryLight + '20' },
  uploadInner: { alignItems: 'center' },
  uploadIcon: { fontSize: 32, marginBottom: 12, color: colors.primary },
  uploadPreview: { width: '100%', height: '100%' },
  uploadText: { color: colors.text, fontWeight: '600', fontSize: 14 },
  uploadSubtext: { color: colors.textSecondary, fontSize: 11 },

  dateInputCard: { backgroundColor: colors.surface, padding: 16, borderRadius: 14, borderWidth: 1, borderColor: colors.border, flexDirection: 'row', alignItems: 'flex-start', marginBottom: 20 },
  dateInputIconContainer: { width: 40, height: 40, backgroundColor: colors.card, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginRight: 12, marginTop: 4 },
  dateInputIcon: { fontSize: 18, color: colors.primary },
  dateInputTextContainer: { flex: 1 },
  dateInputLabel: { fontSize: 12, fontWeight: '800', color: colors.text, textTransform: 'uppercase', marginBottom: 4 },
  dateInputValue: { fontSize: 15, fontWeight: '600', color: colors.text },
  dateInputArrow: { fontSize: 18, color: colors.textSecondary, marginTop: 8 },

  multiDateText: {
    fontSize: 13,
    color: colors.textSecondary,
    marginRight: 8,
  },

  durationDisplay: {
    alignItems: 'center',
    padding: 12,
    backgroundColor: colors.primaryLight + '40',
    borderRadius: 12,
    marginVertical: 12,
  },
  durationDisplayText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primary,
  },

  // Multi-day summary styles
  daysSummaryContainer: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  daySummaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  dayNumberBadge: {
    width: 60,
    marginRight: 12,
    alignItems: 'center',
  },
  dayNumberText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 4,
  },
  customBadge: {
    backgroundColor: colors.success,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  customBadgeText: {
    color: '#ffffff',
    fontSize: 8,
    fontWeight: '700',
  },
  daySummaryContent: {
    flex: 1,
  },
  daySummaryDate: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  daySummaryTimes: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginBottom: 4,
  },
  daySummaryTime: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  daySummaryDuration: {
    fontSize: 13,
    color: colors.primary,
    fontWeight: '700',
  },
  daySummaryDesc: {
    fontSize: 11,
    color: colors.textSecondary,
    fontStyle: 'italic',
    marginTop: 2,
  },
  daySummaryVenue: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  editDayTimeButton: {
    backgroundColor: colors.card,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  editDayTimeText: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '700',
  },
  customTimeIndicator: {
    fontSize: 11,
    color: colors.success,
    fontStyle: 'italic',
  },

  button: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  setTimesButton: {
    backgroundColor: colors.primaryLight,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  setTimesButtonText: {
    color: colors.primary,
    fontWeight: '800',
    fontSize: 14,
  },

  // Day Editor Styles
  dayEditorHeader: {
    backgroundColor: colors.primaryLight + '30',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    alignItems: 'center',
  },
  dayEditorDate: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primary,
    textAlign: 'center',
  },
  dayEditorSubdate: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
  },
  timeInputRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  timeInputButton: {
    flex: 1,
    backgroundColor: colors.surface,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  timeInputLabelSmall: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  timeInputValue: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  durationInputContainer: {
    marginBottom: 20,
  },
  durationInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  durationInput: {
    backgroundColor: colors.surface,
    padding: 14,
    borderRadius: 12,
    textAlign: 'center',
    fontSize: 16,
    borderWidth: 1,
    borderColor: colors.border,
    flex: 1,
    color: colors.text,
  },
  durationLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textSecondary,
    minWidth: 20,
  },

  selectionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  formChip: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 12, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  formChipActive: { backgroundColor: '#FF9500', borderColor: '#FF9500' },
  formChipText: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
  formChipTextActive: { color: '#ffffff', fontWeight: '700' },

  submitButton: { backgroundColor: colors.primary, padding: 20, borderRadius: 16, alignItems: 'center', marginVertical: 20 },
  submitButtonText: { color: '#ffffff', fontWeight: '800', fontSize: 16 },

  calendarNavHeader: { marginBottom: 20, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: colors.border },
  calendarBackButton: { flexDirection: 'row', alignItems: 'center', padding: 12, backgroundColor: colors.surface, borderRadius: 10 },
  calendarBackIcon: { fontSize: 16, marginRight: 8, color: colors.text },
  calendarBackText: { fontSize: 14, fontWeight: '600', color: colors.text },

  calendarContainer: { backgroundColor: colors.card, borderRadius: 20, padding: 20, borderWidth: 1, borderColor: colors.border },
  calendarHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  calendarTitle: { fontSize: 20, fontWeight: '900', color: colors.text },
  calendarActions: { flexDirection: 'row', gap: 8 },
  actionButton: { paddingVertical: 8, paddingHorizontal: 12, backgroundColor: colors.surface, borderRadius: 10, borderWidth: 1, borderColor: colors.border },
  actionButtonActive: { backgroundColor: colors.primaryLight, borderColor: colors.primary },
  actionButtonText: { fontSize: 13, fontWeight: '600', color: colors.text },
  actionButtonTextActive: { color: '#ffffff' },
  clearButton: { paddingVertical: 8, paddingHorizontal: 12, backgroundColor: colors.error + '20', borderRadius: 10 },
  clearButtonText: { fontSize: 13, fontWeight: '600', color: colors.error },

  rangeHint: { padding: 12, backgroundColor: colors.primaryLight + '30', borderRadius: 10, marginBottom: 16 },
  rangeHintText: { fontSize: 14, color: colors.primary, textAlign: 'center', fontWeight: '600' },

  calendarStyle: { borderRadius: 16, overflow: 'hidden', marginBottom: 20 },

  selectedSummary: { marginTop: 10 },
  selectedCount: { fontSize: 15, fontWeight: '700', color: colors.primary, marginBottom: 12 },
  dateChip: { backgroundColor: colors.primary, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, marginRight: 8 },
  dateChipText: { color: '#ffffff', fontSize: 12, fontWeight: '700' },

  timeInputContainer: { flex: 1, backgroundColor: colors.surface, padding: 16, borderRadius: 14, borderWidth: 1, borderColor: colors.border, flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  timeInputIconContainer: { width: 40, height: 40, backgroundColor: colors.card, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  timeInputIcon: { fontSize: 18, color: colors.primary },
  timeInputTextContainer: { flex: 1 },
  timeInputLabel: { fontSize: 11, fontWeight: '700', color: colors.textSecondary, textTransform: 'uppercase' },
  timeInputPlaceholder: { fontSize: 15, color: colors.textSecondary },
  timeInputArrowContainer: { width: 24, height: 24, justifyContent: 'center', alignItems: 'center' },
  timeInputArrow: { fontSize: 12, color: colors.textSecondary },

  timePickerOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  timePickerContainer: { backgroundColor: colors.card, borderRadius: 24, width: '100%', maxWidth: 400 },
  timePickerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 24, borderBottomWidth: 1, borderBottomColor: colors.border },
  timePickerTitle: { fontSize: 20, fontWeight: '900', color: colors.text },
  timePickerCloseButton: { width: 36, height: 36, backgroundColor: colors.surface, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  timePickerClose: { fontSize: 16, color: colors.textSecondary },
  timePickerBody: { flexDirection: 'row', padding: 24, gap: 16 },
  timeColumnContainer: { flex: 1 },
  timeColumnLabel: { fontSize: 12, fontWeight: '700', color: colors.textSecondary, textAlign: 'center', marginBottom: 8 },
  timeColumn: { maxHeight: 200, backgroundColor: colors.surface, borderRadius: 12 },
  timeOption: { paddingVertical: 12, alignItems: 'center' },
  timeOptionSelected: { backgroundColor: colors.primary, borderRadius: 8 },
  timeOptionText: { fontSize: 15, fontWeight: '600', color: colors.text },
  timeOptionTextSelected: { color: '#ffffff', fontWeight: '700' },
  periodContainer: { flexDirection: 'row', justifyContent: 'center', gap: 12 },
  periodOption: { paddingVertical: 12, paddingHorizontal: 24, backgroundColor: colors.surface, borderRadius: 10, borderWidth: 1, borderColor: colors.border },
  periodOptionSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  periodOptionText: { fontSize: 15, fontWeight: '600', color: colors.text },
  periodOptionTextSelected: { color: '#ffffff' },
  timePickerFooter: { padding: 24, borderTopWidth: 1, borderTopColor: colors.border },
  selectedTimePreviewContainer: { flexDirection: 'row', justifyContent: 'space-between', padding: 16, backgroundColor: colors.primaryLight + '20', borderRadius: 12, marginBottom: 20 },
  selectedTimeLabel: { fontSize: 14, fontWeight: '700', color: colors.primary },
  selectedTimeValue: { fontSize: 18, fontWeight: '900', color: colors.primary },
  timeConfirmButton: { backgroundColor: colors.primary, padding: 18, borderRadius: 14, alignItems: 'center' },
  timeConfirmButtonText: { color: '#ffffff', fontWeight: '800', fontSize: 16 },

  // Event Details Modal Styles (Professional/Modern)
  eventDetailsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.card,
  },
  eventDetailsHeaderTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  eventDetailsBackBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eventDetailsBackIcon: {
    fontSize: 28,
    color: colors.text,
  },
  flyerBannerContainer: {
    width: '100%',
    height: 380,
    backgroundColor: colors.card,
    paddingHorizontal: 12,
    paddingVertical: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  flyerBannerInner: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.surface,
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
    elevation: 8,
    shadowColor: colors.text,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
  },
  flyerBannerImage: {
    width: '100%',
    height: '100%',
  },
  flyerBannerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(45, 55, 72, 0.08)',
  },
  flyerBannerHint: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    elevation: 6,
    shadowColor: colors.text,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  flyerBannerHintIcon: {
    fontSize: 16,
  },
  flyerBannerHintText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  flyerBannerPlaceholder: {
    width: '100%',
    height: 380,
    backgroundColor: colors.surface,
    marginHorizontal: 12,
    marginVertical: 12,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: colors.text,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  flyerBannerPlaceholderIcon: {
    fontSize: 56,
    marginBottom: 12,
  },
  flyerBannerPlaceholderText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  eventDetailsFlyerWrapper: {
    width: '100%',
    height: 240,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  eventDetailsFlyerImage: {
    width: '100%',
    height: '100%',
  },
  eventDetailsFlyerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
  },
  eventDetailsMainContent: {
    padding: 20,
  },
  eventDetailsTitleSection: {
    marginBottom: 24,
  },
  eventDetailsMainTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 12,
    lineHeight: 32,
  },
  eventDetailsBadgesRow: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
  },
  eventDetailsBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: colors.primaryLight,
  },
  eventDetailsBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
  },
  eventDetailsCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
  },
  eventDetailsCardRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  eventDetailsCardIcon: {
    width: 40,
    height: 40,
    backgroundColor: colors.primaryLight,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eventDetailsCardIconText: {
    fontSize: 20,
  },
  eventDetailsCardInfo: {
    flex: 1,
  },
  eventDetailsCardLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  eventDetailsCardValue: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    lineHeight: 22,
  },
  eventDetailsCardSubValue: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
    fontStyle: 'italic',
  },
  eventDetailsDescriptionText: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 22,
    marginTop: 8,
  },
  eventDetailsActionButtons: {
    gap: 12,
    marginTop: 24,
    paddingBottom: 20,
  },
  eventDetailsActionButton: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  eventDetailsActionButtonIcon: {
    fontSize: 16,
  },
  eventDetailsActionButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
  },
  
  // Fullscreen Flyer Modal Styles
  flyerFullScreenContainer: {
    flex: 1,
    backgroundColor: '#1A202C',
  },
  flyerFullScreenHeader: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  flyerCloseBtn: {
    width: 42,
    height: 42,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flyerCloseBtnText: {
    fontSize: 28,
    color: '#ffffff',
    fontWeight: '600',
  },
  flyerFullScreenContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  flyerFullScreenImage: {
    width: '100%',
    height: '100%',
  },
  publishingOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  publishingCard: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 20,
    paddingVertical: 28,
    paddingHorizontal: 20,
    alignItems: 'center',
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 8,
  },
  publishingIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  publishingSuccessIcon: {
    fontSize: 34,
    fontWeight: '800',
    lineHeight: 36,
  },
  publishingTitle: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 6,
  },
  publishingMessage: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  publishingOkButton: {
    marginTop: 18,
    minWidth: 120,
    paddingVertical: 11,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  publishingOkButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  eventDetailsFlyerTapHint: {
    position: 'absolute',
    bottom: 10,
    alignSelf: 'center',
    fontSize: 12,
    fontWeight: '600',
    color: '#ffffff',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
});