// app/(tabs)/index.tsx — COMPLETE UPDATED CODE WITH UNIVERSITY FILTERING
import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  StatusBar,
  useWindowDimensions,
  FlatList,
  Modal,
  ScrollView,
  Dimensions,
  Share,
  TextInput,
  Alert,
  RefreshControl,
  useColorScheme,
  Appearance,
} from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { FontAwesome } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { formatDistanceToNow, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, eachDayOfInterval, eachMonthOfInterval, isSameDay, isSameMonth, isWithinInterval, format, addDays, subDays } from 'date-fns';
import * as Linking from 'expo-linking';
import * as Clipboard from 'expo-clipboard';
import { useRouter, useLocalSearchParams } from 'expo-router';

const SUPABASE_URL = 'https://qwujadyqebfypyhfuwfl.supabase.co';
const SUPABASE_PROJECT_REF = 'qwujadyqebfypyhfuwfl';
const PAGE_SIZE = 10;
const PRIMARY_COLOR = '#FF9900';
const screenWidth = Dimensions.get('window').width;
const screenHeight = Dimensions.get('window').height;

// === COLOR THEMES ===
const lightTheme = {
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
  gradientStart: 'rgba(255,255,255,0)',
  gradientEnd: 'rgba(255,255,255,0.9)',
};

const darkTheme = {
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
  gradientStart: 'rgba(0,0,0,0)',
  gradientEnd: 'rgba(0,0,0,0.8)',
};

// === PRODUCT INTERFACE ===
interface Product {
  id: string;
  title: string;
  description?: string;
  price: number;
  original_price: number | null;
  quantity?: number;
  media_urls: string[];
  seller_id: string;
  display_name: string;
  avatar_url: string;
  university: string;
  hasDiscount: boolean;
  discountPercent: number | null;
  isVideo: boolean;
  score: number;
  commentCount?: number;
  likeCount?: number;
  shareCount?: number;
  followerCount?: number;
  isLiked?: boolean;
  isShared?: boolean;
  isFollowed?: boolean;
  inCart?: boolean;
  category?: string;
  created_at?: string;
  color_media?: Record<string, string[]>;
  colors_available?: string[];
  sizes_available?: string[];
  color_stock?: Record<string, string>;
  size_stock?: Record<string, string>;
  isFromSameSeller?: boolean;
  similarityScore?: number;
}

interface Comment {
  id: number;
  text: string;
  time: string;
  user: string;
  avatarUrl: string;
}

interface CartItem {
  product: Product;
  quantity: number;
  added_at: string;
}

interface OrderFormData {
  fullName: string;
  phoneNumber: string;
  location: string;
  deliveryOption: 'pickup' | 'delivery';
  additionalNotes?: string;
  selectedColor?: string | null;
  selectedSize?: string | null;
  quantity?: number | null;
}

// Order sorting and filtering types
type SortOption = 'newest' | 'oldest' | 'price-high' | 'price-low' | 'status';
type FilterOption = 'all' | 'pending' | 'processing' | 'completed' | 'cancelled' | 'shipped';

// === HELPER FUNCTIONS FOR MEDIA HANDLING ===
const isVideoUrl = (url: string): boolean => {
  if (!url) return false;
  const lowerUrl = url.toLowerCase();
  return lowerUrl.includes('.mp4') || 
         lowerUrl.includes('.mov') || 
         lowerUrl.includes('.avi') ||
         lowerUrl.includes('.webm') ||
         lowerUrl.includes('.wmv');
};

const getCardDisplayUrl = (urls?: string[] | null) => {
  const arr = (urls || []).map(u => u.startsWith('http') ? u : `${SUPABASE_URL}/storage/v1/object/public/products/${u}`);
  // prefer first non-video image
  const image = arr.find(a => !isVideoUrl(a));
  return image || arr[0] || 'https://via.placeholder.com/400';
};

const getCardDisplayMedia = (urls?: string[] | null): string | undefined => {
  const arr = (urls || []).map(u => u.startsWith('http') ? u : `${SUPABASE_URL}/storage/v1/object/public/products/${u}`);
  if (!arr || arr.length === 0) return undefined;
  
  // If first media is a video, try to get the second one
  if (isVideoUrl(arr[0])) {
    // If there's a second media, return it
    if (arr.length > 1) {
      return arr[1];
    }
    // If no second media, try to find first non-video
    const imageUrl = arr.find(url => !isVideoUrl(url));
    return imageUrl || arr[0];
  }
  
  // First media is not a video, return it
  return arr[0];
};

// Calendar filter types
type CalendarViewMode = 'day' | 'week' | 'month' | 'year';
type DateSelection = {
  singleDate?: Date;
  dateRange?: { start: Date; end: Date };
  monthRange?: { start: Date; end: Date };
  year?: number;
  viewMode: CalendarViewMode;
};

// === WEB APP PRODUCT LINK GENERATOR ===
const generateProductWebLink = (product: Product): string => {
  const WEB_APP_DOMAIN = 'https://www.suyadomart.com/';
 
  const params = new URLSearchParams({
    productId: product.id,
    productTitle: product.title.substring(0, 80),
    price: product.price.toString(),
    seller: product.display_name?.substring(0, 30) || 'Seller',
    university: product.university?.substring(0, 20) || 'Campus'
  });
 
  return `${WEB_APP_DOMAIN}/?${params.toString()}`;
};

// Helper functions for order status
const getStatusColor = (status: string, theme: any) => {
  switch (status) {
    case 'pending': return theme.warning;
    case 'processing': return theme.info;
    case 'completed': return theme.success;
    case 'cancelled': return theme.error;
    case 'shipped': return '#302e9fff';
    default: return theme.textTertiary;
  }
};

const getStatusText = (status: string) => {
  switch (status) {
    case 'pending': return 'Pending Review';
    case 'processing': return 'Processing';
    case 'completed': return 'Completed';
    case 'cancelled': return 'Cancelled';
    default: return status;
  }
};

// === CALENDAR FILTER COMPONENT ===
const CalendarFilter: React.FC<{
  isVisible: boolean;
  onClose: () => void;
  onApplyFilter: (selection: DateSelection | null) => void;
  currentSelection: DateSelection | null;
  theme: any;
}> = ({ isVisible, onClose, onApplyFilter, currentSelection, theme }) => {
  const [viewMode, setViewMode] = useState<CalendarViewMode>('day');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [dateRange, setDateRange] = useState<{ start: Date; end: Date } | null>(null);
  const [monthRange, setMonthRange] = useState<{ start: Date; end: Date } | null>(null);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [quickFilter, setQuickFilter] = useState<'thisWeek' | 'thisMonth' | 'thisYear' | null>(null);

  // Initialize with current selection
  useEffect(() => {
    if (currentSelection) {
      setViewMode(currentSelection.viewMode);
      setSelectedDate(currentSelection.singleDate || null);
      setDateRange(currentSelection.dateRange || null);
      setMonthRange(currentSelection.monthRange || null);
      setSelectedYear(currentSelection.year || new Date().getFullYear());
      if (currentSelection.singleDate) {
        setCurrentDate(new Date(currentSelection.singleDate));
      }
    }
  }, [currentSelection]);

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      if (viewMode === 'day' || viewMode === 'week' || viewMode === 'month') {
        newDate.setMonth(prev.getMonth() + (direction === 'next' ? 1 : -1));
      } else if (viewMode === 'year') {
        newDate.setFullYear(prev.getFullYear() + (direction === 'next' ? 1 : -1));
      }
      return newDate;
    });
  };

  const renderDayView = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDay = firstDay.getDay();

    const days = [];
    for (let i = 0; i < 42; i++) {
      const day = i - startingDay + 1;
      const date = new Date(year, month, day);
      const isCurrentMonth = day > 0 && day <= daysInMonth;
      const isSelected = selectedDate && isSameDay(date, selectedDate);
      const isToday = isSameDay(date, new Date());

      days.push(
        <TouchableOpacity
          key={i}
          style={[
            styles.calendarDay,
            { backgroundColor: theme.surface },
            !isCurrentMonth && styles.calendarDayOtherMonth,
            isSelected && [styles.calendarDaySelected, { backgroundColor: theme.primary }],
            isToday && [styles.calendarDayToday, { borderColor: theme.primary }],
          ]}
          onPress={() => isCurrentMonth && setSelectedDate(date)}
          disabled={!isCurrentMonth}
        >
          <Text style={[
            styles.calendarDayText,
            { color: isCurrentMonth ? theme.text : theme.textTertiary },
            isSelected && styles.calendarDaySelectedText,
            isToday && { color: theme.primary, fontWeight: 'bold' }
          ]}>
            {isCurrentMonth ? day : ''}
          </Text>
        </TouchableOpacity>
      );
    }

    return (
      <View style={styles.calendarGrid}>
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <Text key={day} style={[styles.calendarWeekday, { color: theme.textTertiary }]}>
            {day}
          </Text>
        ))}
        {days}
      </View>
    );
  };

  const renderWeekView = () => {
    const start = startOfWeek(currentDate, { weekStartsOn: 0 });
    const days = eachDayOfInterval({ start, end: addDays(start, 6) });

    const isWeekSelected = dateRange && 
      isSameDay(dateRange.start, start) && 
      isSameDay(dateRange.end, addDays(start, 6));

    return (
      <View style={styles.weekViewContainer}>
        <Text style={[styles.weekRangeText, { color: theme.textSecondary }]}>
          {format(start, 'MMM d')} - {format(addDays(start, 6), 'MMM d, yyyy')}
        </Text>
        <TouchableOpacity
          style={[
            styles.weekSelector,
            { backgroundColor: theme.surface, borderColor: theme.border },
            isWeekSelected && [styles.weekSelected, { borderColor: theme.primary, backgroundColor: `${theme.primary}20` }]
          ]}
          onPress={() => {
            const start = startOfWeek(currentDate, { weekStartsOn: 0 });
            const end = endOfWeek(currentDate, { weekStartsOn: 0 });
            setDateRange({ start, end });
            setQuickFilter(null);
          }}
        >
          <Text style={[
            styles.weekSelectorText,
            { color: theme.text },
            isWeekSelected && { color: theme.primary, fontWeight: 'bold' }
          ]}>
            Select This Week
          </Text>
        </TouchableOpacity>
        <View style={styles.weekDaysGrid}>
          {days.map((day, index) => {
            const isSelected = selectedDate && isSameDay(day, selectedDate);
            const isToday = isSameDay(day, new Date());
            
            return (
              <TouchableOpacity
                key={index}
                style={[
                  styles.weekDay,
                  { backgroundColor: theme.surface },
                  isSelected && [styles.weekDaySelected, { backgroundColor: theme.primary }],
                  isToday && [styles.weekDayToday, { borderColor: theme.primary }],
                ]}
                onPress={() => setSelectedDate(day)}
              >
                <Text style={[
                  styles.weekDayName,
                  { color: theme.textTertiary }
                ]}>
                  {format(day, 'EEE')}
                </Text>
                <Text style={[
                  styles.weekDayNumber,
                  { color: theme.text },
                  isSelected && styles.weekDaySelectedText,
                  isToday && { color: theme.primary, fontWeight: 'bold' }
                ]}>
                  {format(day, 'd')}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    );
  };

  const renderMonthView = () => {
    const months = eachMonthOfInterval({
      start: new Date(selectedYear, 0, 1),
      end: new Date(selectedYear, 11, 31)
    });

    const isMonthSelected = (month: Date) => {
      if (monthRange) {
        return isSameMonth(month, monthRange.start) || 
               isSameMonth(month, monthRange.end) ||
               (month > monthRange.start && month < monthRange.end);
      }
      return false;
    };

    return (
      <View style={styles.monthViewContainer}>
        <View style={styles.yearSelector}>
          <TouchableOpacity onPress={() => setSelectedYear(prev => prev - 1)}>
            <Ionicons name="chevron-back" size={24} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.yearText, { color: theme.text }]}>{selectedYear}</Text>
          <TouchableOpacity onPress={() => setSelectedYear(prev => prev + 1)}>
            <Ionicons name="chevron-forward" size={24} color={theme.text} />
          </TouchableOpacity>
        </View>
        
        <TouchableOpacity
          style={[
            styles.monthRangeSelector,
            { backgroundColor: theme.surface, borderColor: theme.border },
            quickFilter === 'thisMonth' && [styles.monthRangeSelected, { borderColor: theme.primary, backgroundColor: `${theme.primary}20` }]
          ]}
          onPress={() => {
            const start = startOfMonth(new Date());
            const end = endOfMonth(new Date());
            setMonthRange({ start, end });
            setQuickFilter('thisMonth');
          }}
        >
          <Text style={[
            styles.monthRangeText,
            { color: theme.text },
            quickFilter === 'thisMonth' && { color: theme.primary, fontWeight: 'bold' }
          ]}>
            Select This Month
          </Text>
        </TouchableOpacity>

        <View style={styles.monthsGrid}>
          {months.map((month, index) => {
            const isSelected = isMonthSelected(month);
            const isCurrentMonth = isSameMonth(month, new Date());
            
            return (
              <TouchableOpacity
                key={index}
                style={[
                  styles.monthCell,
                  { backgroundColor: theme.surface },
                  isSelected && [styles.monthCellSelected, { backgroundColor: theme.primary }],
                  isCurrentMonth && [styles.monthCellCurrent, { borderColor: theme.primary }],
                ]}
                onPress={() => {
                  // Toggle month selection for range
                  if (!monthRange) {
                    setMonthRange({ start: month, end: month });
                  } else if (isSameMonth(month, monthRange.start) && isSameMonth(month, monthRange.end)) {
                    // Clicking same month again clears selection
                    setMonthRange(null);
                  } else if (month < monthRange.start) {
                    setMonthRange({ start: month, end: monthRange.end });
                  } else {
                    setMonthRange({ start: monthRange.start, end: month });
                  }
                  setQuickFilter(null);
                }}
              >
                <Text style={[
                  styles.monthText,
                  { color: theme.text },
                  isSelected && styles.monthCellSelectedText,
                  isCurrentMonth && { color: theme.primary, fontWeight: 'bold' }
                ]}>
                  {format(month, 'MMM')}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    );
  };

  const renderYearView = () => {
    const years = Array.from({ length: 12 }, (_, i) => selectedYear - 6 + i);

    return (
      <View style={styles.yearViewContainer}>
        <View style={styles.yearNavigation}>
          <TouchableOpacity onPress={() => setSelectedYear(prev => prev - 12)}>
            <Ionicons name="chevron-back" size={24} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.yearRangeText, { color: theme.text }]}>
            {selectedYear - 6} - {selectedYear + 5}
          </Text>
          <TouchableOpacity onPress={() => setSelectedYear(prev => prev + 12)}>
            <Ionicons name="chevron-forward" size={24} color={theme.text} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[
            styles.yearQuickFilter,
            { backgroundColor: theme.surface, borderColor: theme.border },
            quickFilter === 'thisYear' && [styles.yearQuickFilterSelected, { borderColor: theme.primary, backgroundColor: `${theme.primary}20` }]
          ]}
          onPress={() => {
            const currentYear = new Date().getFullYear();
            setSelectedYear(currentYear);
            setQuickFilter('thisYear');
          }}
        >
          <Text style={[
            styles.yearQuickFilterText,
            { color: theme.text },
            quickFilter === 'thisYear' && { color: theme.primary, fontWeight: 'bold' }
          ]}>
            Select Current Year ({new Date().getFullYear()})
          </Text>
        </TouchableOpacity>

        <View style={styles.yearsGrid}>
          {years.map((year, index) => {
            const isCurrentYear = year === new Date().getFullYear();
            const isSelected = selectedYear === year;
            
            return (
              <TouchableOpacity
                key={index}
                style={[
                  styles.yearCell,
                  { backgroundColor: theme.surface },
                  isSelected && [styles.yearCellSelected, { backgroundColor: theme.primary }],
                  isCurrentYear && [styles.yearCellCurrent, { borderColor: theme.primary }],
                ]}
                onPress={() => {
                  setSelectedYear(year);
                  setQuickFilter(null);
                }}
              >
                <Text style={[
                  styles.yearCellText,
                  { color: theme.text },
                  isSelected && styles.yearCellSelectedText,
                  isCurrentYear && { color: theme.primary, fontWeight: 'bold' }
                ]}>
                  {year}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    );
  };

  const handleApply = () => {
    let selection: DateSelection | null = null;

    if (quickFilter === 'thisWeek') {
      const start = startOfWeek(new Date(), { weekStartsOn: 0 });
      const end = endOfWeek(new Date(), { weekStartsOn: 0 });
      selection = { dateRange: { start, end }, viewMode: 'week' };
    } else if (quickFilter === 'thisMonth') {
      const start = startOfMonth(new Date());
      const end = endOfMonth(new Date());
      selection = { monthRange: { start, end }, viewMode: 'month' };
    } else if (quickFilter === 'thisYear') {
      const year = new Date().getFullYear();
      selection = { year, viewMode: 'year' };
    } else if (selectedDate && viewMode === 'day') {
      selection = { singleDate: selectedDate, viewMode: 'day' };
    } else if (dateRange && viewMode === 'week') {
      selection = { dateRange, viewMode: 'week' };
    } else if (monthRange && viewMode === 'month') {
      selection = { monthRange, viewMode: 'month' };
    } else if (viewMode === 'year') {
      selection = { year: selectedYear, viewMode: 'year' };
    }

    onApplyFilter(selection);
    onClose();
  };

  const handleClear = () => {
    setSelectedDate(null);
    setDateRange(null);
    setMonthRange(null);
    setSelectedYear(new Date().getFullYear());
    setQuickFilter(null);
    onApplyFilter(null);
    onClose();
  };

  const formatSelectionText = () => {
    if (quickFilter === 'thisWeek') return 'This Week';
    if (quickFilter === 'thisMonth') return 'This Month';
    if (quickFilter === 'thisYear') return 'This Year';
    if (selectedDate && viewMode === 'day') return format(selectedDate, 'MMM d, yyyy');
    if (dateRange && viewMode === 'week') return `${format(dateRange.start, 'MMM d')} - ${format(dateRange.end, 'MMM d, yyyy')}`;
    if (monthRange && viewMode === 'month') {
      if (isSameMonth(monthRange.start, monthRange.end)) {
        return format(monthRange.start, 'MMMM yyyy');
      }
      return `${format(monthRange.start, 'MMM yyyy')} - ${format(monthRange.end, 'MMM yyyy')}`;
    }
    if (viewMode === 'year') return `Year: ${selectedYear}`;
    return 'No date selected';
  };

  if (!isVisible) return null;

  return (
    <Modal
      transparent={true}
      visible={isVisible}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={[styles.calendarOverlay, { backgroundColor: theme.modalOverlay }]}>
        <View style={[styles.calendarContainer, { backgroundColor: theme.modalBackground }]}>
          <View style={[styles.calendarHeader, { borderBottomColor: theme.border }]}>
            <TouchableOpacity onPress={onClose} style={styles.calendarCloseButton}>
              <Ionicons name="close" size={24} color={theme.text} />
            </TouchableOpacity>
            <Text style={[styles.calendarTitle, { color: theme.text }]}>Select Date Range</Text>
            <View style={{ width: 40 }} />
          </View>

          <ScrollView style={styles.calendarContent}>
            {/* Quick Filters */}
            <View style={styles.quickFiltersContainer}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Quick Filters</Text>
              <View style={styles.quickFiltersGrid}>
                <TouchableOpacity
                  style={[
                    styles.quickFilterButton,
                    { backgroundColor: theme.surface },
                    quickFilter === 'thisWeek' && [styles.quickFilterActive, { backgroundColor: theme.primary }]
                  ]}
                  onPress={() => {
                    setQuickFilter('thisWeek');
                    setViewMode('week');
                  }}
                >
                  <Ionicons 
                    name="calendar-outline" 
                    size={20} 
                    color={quickFilter === 'thisWeek' ? '#fff' : theme.text} 
                  />
                  <Text style={[
                    styles.quickFilterText,
                    { color: quickFilter === 'thisWeek' ? '#fff' : theme.text }
                  ]}>
                    This Week
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[
                    styles.quickFilterButton,
                    { backgroundColor: theme.surface },
                    quickFilter === 'thisMonth' && [styles.quickFilterActive, { backgroundColor: theme.primary }]
                  ]}
                  onPress={() => {
                    setQuickFilter('thisMonth');
                    setViewMode('month');
                  }}
                >
                  <Ionicons 
                    name="calendar" 
                    size={20} 
                    color={quickFilter === 'thisMonth' ? '#fff' : theme.text} 
                  />
                  <Text style={[
                    styles.quickFilterText,
                    { color: quickFilter === 'thisMonth' ? '#fff' : theme.text }
                  ]}>
                    This Month
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* View Mode Selector */}
            <View style={styles.viewModeContainer}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>View Mode</Text>
              <View style={styles.viewModeButtons}>
                {(['day', 'week', 'month', 'year'] as CalendarViewMode[]).map(mode => (
                  <TouchableOpacity
                    key={mode}
                    style={[
                      styles.viewModeButton,
                      { backgroundColor: theme.surface },
                      viewMode === mode && [styles.viewModeButtonActive, { backgroundColor: theme.primary }]
                    ]}
                    onPress={() => {
                      setViewMode(mode);
                      setQuickFilter(null);
                    }}
                  >
                    <Text style={[
                      styles.viewModeButtonText,
                      { color: viewMode === mode ? '#fff' : theme.text }
                    ]}>
                      {mode.charAt(0).toUpperCase() + mode.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Current Selection Display */}
            <View style={[styles.selectionDisplay, { backgroundColor: `${theme.primary}10`, borderColor: theme.primary }]}>
              <Ionicons name="calendar" size={20} color={theme.primary} />
              <Text style={[styles.selectionText, { color: theme.primary }]}>
                {formatSelectionText()}
              </Text>
            </View>

            {/* Calendar Navigation */}
            <View style={styles.calendarNavigation}>
              <TouchableOpacity onPress={() => navigateMonth('prev')}>
                <Ionicons name="chevron-back" size={24} color={theme.text} />
              </TouchableOpacity>
              
              <Text style={[styles.currentDateText, { color: theme.text }]}>
                {viewMode === 'day' || viewMode === 'week' ? format(currentDate, 'MMMM yyyy') : 
                 viewMode === 'month' ? `Year: ${selectedYear}` :
                 `${selectedYear - 6} - ${selectedYear + 5}`}
              </Text>
              
              <TouchableOpacity onPress={() => navigateMonth('next')}>
                <Ionicons name="chevron-forward" size={24} color={theme.text} />
              </TouchableOpacity>
            </View>

            {/* Calendar View */}
            <View style={styles.calendarViewContainer}>
              {viewMode === 'day' && renderDayView()}
              {viewMode === 'week' && renderWeekView()}
              {viewMode === 'month' && renderMonthView()}
              {viewMode === 'year' && renderYearView()}
            </View>

            {/* Instructions */}
            <View style={[styles.instructions, { backgroundColor: theme.surface }]}>
              <Ionicons name="information-circle-outline" size={16} color={theme.textSecondary} />
              <Text style={[styles.instructionsText, { color: theme.textSecondary }]}>
                {viewMode === 'day' ? 'Tap a day to select single date' :
                 viewMode === 'week' ? 'Tap "Select This Week" or individual days' :
                 viewMode === 'month' ? 'Tap months to select range (tap first and last)' :
                 'Select year for annual filter'}
              </Text>
            </View>
          </ScrollView>

          {/* Action Buttons */}
          <View style={[styles.calendarActions, { borderTopColor: theme.border }]}>
            <TouchableOpacity
              style={[styles.calendarButton, styles.cancelButton, { backgroundColor: theme.surface, borderColor: theme.border }]}
              onPress={handleClear}
            >
              <Text style={[styles.calendarButtonText, { color: theme.text }]}>Clear Filter</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.calendarButton, styles.applyButton, { backgroundColor: theme.primary }]}
              onPress={handleApply}
            >
              <Text style={styles.calendarButtonText}>Apply Filter</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

// === CUSTOM ALERT SYSTEM ===
const CustomAlert = ({ visible, title, message, buttons, onClose, theme }: any) => {
  if (!visible) return null;

  return (
    <Modal
      transparent={true}
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={[styles.alertOverlay, { backgroundColor: theme.modalOverlay }]}>
        <View style={[styles.alertContainer, { backgroundColor: theme.modalBackground, borderColor: theme.border }]}>
          <Text style={[styles.alertTitle, { color: theme.text }]}>{title}</Text>
          <Text style={[styles.alertMessage, { color: theme.textSecondary }]}>{message}</Text>
          <View style={styles.alertButtons}>
            {buttons.map((button: any, index: number) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.alertButton,
                  index === 0 ? styles.alertButtonPrimary : styles.alertButtonSecondary,
                  index === 0 ? { backgroundColor: theme.primary } : { backgroundColor: theme.surface, borderColor: theme.border }
                ]}
                onPress={() => {
                  button.onPress && button.onPress();
                  onClose();
                }}
              >
                <Text style={[
                  styles.alertButtonText,
                  index === 0 ? styles.alertButtonPrimaryText : styles.alertButtonSecondaryText,
                  index === 0 ? { color: '#000' } : { color: theme.text }
                ]}>
                  {button.text}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
};

// === CONTACT SELLER MODAL - UPDATED WITH PRODUCT LINK AND IMAGE ===
const ContactSellerModal: React.FC<{
  isVisible: boolean;
  onClose: () => void;
  product: Product | null;
  order: any | null;
  onReopenProductModal?: () => void;
  showAlert: (title: string, message: string, buttons?: any[]) => void;
  theme: any;
}> = ({ isVisible, onClose, product, order, onReopenProductModal, showAlert, theme }) => {
  const [sellerPhone, setSellerPhone] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [sellerName, setSellerName] = useState<string>('');
  const [sellerAvatar, setSellerAvatar] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [shopData, setShopData] = useState<any>(null);
  const sellerCacheRef = useRef<Map<string, any>>(new Map()); // Cache seller data by seller_id

  useEffect(() => {
    const fetchSellerInfo = async () => {
      if (!product || !product.seller_id) {
        setError('No product or seller information available');
        setLoading(false);
        return;
      }
     
      setLoading(true);
      setError('');
      
      // Use immediate product data while fetching detailed shop info
      setSellerName(product.display_name || 'Seller');
      if (product.avatar_url) {
        setSellerAvatar(product.avatar_url);
      }
      
      // Check cache first
      const cached = sellerCacheRef.current.get(product.seller_id);
      if (cached) {
        setSellerPhone(cached.phone || '');
        setSellerName(cached.name || product.display_name || 'Seller');
        if (cached.avatar_url) {
          const url = cached.avatar_url.startsWith('http')
            ? cached.avatar_url
            : `${SUPABASE_URL}/storage/v1/object/public/avatars/${cached.avatar_url}`;
          setSellerAvatar(url);
        }
        setShopData(cached.shopData);
        setLoading(false);
        return;
      }
      
      try {
        // Fetch shop and user profile in parallel with 3 second timeout
        let shopData = null;
        let userData = null;
        let timedOut = false;
        
        const timeoutPromise = new Promise<null>(resolve => {
          setTimeout(() => {
            timedOut = true;
            resolve(null);
          }, 3000); // 3 second timeout
        });

        // Create race between queries and timeout
        const queryPromise = Promise.all([
          supabase
            .from('shops')
            .select('phone, name, avatar_url, location, description')
            .eq('owner_id', product.seller_id)
            .maybeSingle(),
          supabase
            .from('user_profiles')
            .select('full_name, avatar_url')
            .eq('id', product.seller_id)
            .maybeSingle()
        ]);

        const result = await Promise.race<any>([queryPromise, timeoutPromise]);
        
        if (result && !timedOut) {
          const [{ data: sd }, { data: ud }] = result;
          shopData = sd;
          userData = ud;
        }

        // Use shop data if available, otherwise use user profile
        if (shopData) {
          // Cache the data
          sellerCacheRef.current.set(product.seller_id, {
            ...shopData,
            shopData: shopData
          });
          
          setShopData(shopData);
          setSellerPhone(shopData.phone || '');
          setSellerName(shopData.name || product.display_name || 'Seller');
          
          if (shopData.avatar_url) {
            const url = shopData.avatar_url.startsWith('http')
              ? shopData.avatar_url
              : `${SUPABASE_URL}/storage/v1/object/public/avatars/${shopData.avatar_url}`;
            setSellerAvatar(url);
          } else if (userData?.avatar_url) {
            const url = userData.avatar_url.startsWith('http')
              ? userData.avatar_url
              : `${SUPABASE_URL}/storage/v1/object/public/avatars/${userData.avatar_url}`;
            setSellerAvatar(url);
          }
        } else if (userData) {
          // Cache user profile
          sellerCacheRef.current.set(product.seller_id, {
            ...userData,
            shopData: null
          });
          
          setSellerName(userData.full_name || product.display_name || 'Seller');
          setSellerPhone('');
          setShopData(null);
          
          if (userData.avatar_url) {
            const url = userData.avatar_url.startsWith('http')
              ? userData.avatar_url
              : `${SUPABASE_URL}/storage/v1/object/public/avatars/${userData.avatar_url}`;
            setSellerAvatar(url);
          }
        }
       
      } catch (error: any) {
        console.error('Error fetching seller info:', error);
        // Keep using the immediate data even if detailed fetch fails
      } finally {
        setLoading(false);
      }
    };

    if (isVisible && product) {
      fetchSellerInfo();
    }
  }, [isVisible, product]);

  const handleWhatsApp = () => {
    if (!sellerPhone || !product) {
      showAlert(
        'Contact Unavailable', 
        'This seller has not provided a contact number in their shop profile.'
      );
      return;
    }
    
    const cleanPhone = sellerPhone.replace(/[^\d]/g, '');
    let whatsappPhone = cleanPhone;
    
    if (cleanPhone.startsWith('0')) {
      whatsappPhone = '233' + cleanPhone.slice(1);
    } else if (!cleanPhone.startsWith('233')) {
      whatsappPhone = '233' + cleanPhone;
    }
    
    let message = '';
    
    const productWebLink = generateProductWebLink(product);
    const productImageUrl = product.media_urls?.[0] ? 
      (product.media_urls[0].startsWith('http') ? 
        product.media_urls[0] : 
        `${SUPABASE_URL}/storage/v1/object/public/products/${product.media_urls[0]}`) 
      : '';
    
    if (order) {
      message = `Hello! I'm the buyer for order #${order.id.slice(-8)}:\n\n` +
                `📱 *Product*: ${product.title}\n` +
                `💰 *Price*: GHS ${product.price.toFixed(2)}\n` +
                `🔗 *Product Link*: ${productWebLink}\n` +
                `🖼️ *Product Image*: ${productImageUrl}\n\n` +
                `📦 *Order Status*: ${getStatusText(order.status)}\n` +
                `📝 *My Name*: ${order.buyer_name}\n` +
                `📞 *My Phone*: ${order.phone_number}\n` +
                `📍 *Location*: ${order.location}\n` +
                `🚚 *Delivery*: ${order.delivery_option === 'delivery' ? 'Delivery' : 'Pickup'}\n\n` +
                `I'd like to discuss my order.`;
    } else {
      const productDescription = product.description || product.title || 'Check out this product';
     
      message = `Hello! I'm interested in your product:\n\n` +
                `📱 *Product*: ${product.title}\n` +
                `💰 *Price*: GHS ${product.price.toFixed(2)}\n` +
                `📝 *Description*: ${productDescription}\n` +
                `🔗 *Product Link*: ${productWebLink}\n` +
                `🖼️ *Product Image*: ${productImageUrl}\n\n` +
                `I found this on CampusConnect. Are you available to discuss?`;
    }
   
    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/${whatsappPhone}?text=${encodedMessage}`;
   
    Linking.openURL(whatsappUrl).catch(() => {
      Linking.openURL(`https://web.whatsapp.com/send?phone=${whatsappPhone}&text=${encodedMessage}`);
    });
  };

  const handleCall = () => {
    if (!sellerPhone) {
      showAlert('Contact Unavailable', 'No phone number available in shop profile');
      return;
    }
    
    const cleanPhone = sellerPhone.replace(/[^\d]/g, '');
    let phoneNumber = cleanPhone;
    
    if (cleanPhone.startsWith('0')) {
      phoneNumber = '+233' + cleanPhone.slice(1);
    } else if (!cleanPhone.startsWith('233')) {
      phoneNumber = '+233' + cleanPhone;
    } else {
      phoneNumber = '+' + cleanPhone;
    }
    
    const telUrl = `tel:${phoneNumber}`;
    Linking.openURL(telUrl).catch(() => {
      showAlert('Error', 'Could not initiate phone call');
    });
  };

  const handleCopyPhone = () => {
    if (!sellerPhone) {
      showAlert('Error', 'No phone number to copy');
      return;
    }
    Clipboard.setStringAsync(sellerPhone);
    showAlert('Copied!', 'Phone number copied to clipboard');
  };

  const handleClose = () => {
    onClose();
    if (onReopenProductModal) {
      setTimeout(() => {
        onReopenProductModal();
      }, 300);
    }
  };

  const getAvatarUrl = () => {
    if (sellerAvatar) {
      return sellerAvatar;
    }
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(sellerName)}&background=FF9900&color=fff`;
  };

  if (!isVisible) return null;

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={isVisible}
      onRequestClose={handleClose}
    >
      <View style={[styles.contactOverlay, { backgroundColor: theme.modalOverlay }]}>
        <View style={[styles.contactModal, { backgroundColor: theme.modalBackground }]}>
          <View style={[styles.contactHeader, { borderBottomColor: theme.border }]}>
            <TouchableOpacity onPress={handleClose} style={styles.contactCloseButton}>
              <Ionicons name="close" size={24} color={theme.text} />
            </TouchableOpacity>
            <Text style={[styles.contactTitle, { color: theme.text }]}>Contact Seller</Text>
            <View style={{ width: 40 }} />
          </View>
          
          <ScrollView style={styles.contactContent} showsVerticalScrollIndicator={false}>
            {!sellerPhone && !sellerName ? (
              // Show skeleton loader while initial data is loading
              <View style={styles.contactLoading}>
                <ActivityIndicator size="large" color={theme.primary} />
                <Text style={[styles.contactLoadingText, { color: theme.text }]}>Loading seller information...</Text>
              </View>
            ) : !sellerPhone ? (
              // Seller data loaded but no phone (shop not set up)
              <View style={styles.contactUnavailable}>
                <Ionicons name="call-outline" size={80} color={theme.textTertiary} />
                <Text style={[styles.contactUnavailableTitle, { color: theme.text }]}>Contact Unavailable</Text>
                <Text style={[styles.contactUnavailableText, { color: theme.textSecondary }]}>
                  This seller hasn't set up their shop profile yet.
                </Text>
                <Text style={[styles.contactUnavailableSubtext, { color: theme.textTertiary }]}>
                  Phone numbers can only be found in the shops table.
                </Text>
                
                <View style={[styles.sellerInfoCard, { backgroundColor: theme.surface }]}>
                  <View style={[styles.productInfo, { borderBottomColor: theme.border }]}>
                    <Text style={[styles.productName, { color: theme.text }]} numberOfLines={2}>
                      {product?.title}
                    </Text>
                    <Text style={[styles.productPrice, { color: theme.primary }]}>
                      GHS {product?.price.toFixed(2)}
                    </Text>
                  </View>
                  
                  <View style={[styles.sellerDisplayInfo, { borderTopColor: theme.border, borderBottomColor: theme.border }]}>
                    <View style={styles.sellerAvatarContainer}>
                      {getAvatarUrl() ? (
                        <Image 
                          source={{ uri: getAvatarUrl() }} 
                          style={styles.sellerContactAvatar} 
                        />
                      ) : (
                        <View style={[styles.sellerContactAvatarPlaceholder, { backgroundColor: theme.surface }]}>
                          <Ionicons name="person" size={30} color={theme.textTertiary} />
                        </View>
                      )}
                    </View>
                    <View style={styles.sellerTextInfo}>
                      <Text style={[styles.sellerNameText, { color: theme.text }]}>
                        {sellerName}
                      </Text>
                      <Text style={[styles.sellerShopStatus, { color: theme.textTertiary }]}>
                        {shopData ? 'Shop exists (no phone)' : 'Shop not set up'}
                      </Text>
                    </View>
                  </View>
                  
                  {shopData && shopData.location && (
                    <View style={[styles.shopLocationInfo, { borderTopColor: theme.border }]}>
                      <Ionicons name="location-outline" size={16} color={theme.textTertiary} />
                      <Text style={[styles.shopLocationText, { color: theme.textSecondary }]}>
                        {shopData.location}
                      </Text>
                    </View>
                  )}
                </View>
                
                <TouchableOpacity 
                  style={[styles.contactContinueButton, { backgroundColor: theme.primary }]} 
                  onPress={handleClose}
                >
                  <Text style={[styles.contactContinueButtonText, { color: '#000' }]}>Continue Browsing</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <View style={[styles.sellerInfoCard, { backgroundColor: theme.surface }]}>
                  <View style={[styles.productInfo, { borderBottomColor: theme.border }]}>
                    <Text style={[styles.productName, { color: theme.text }]} numberOfLines={2}>
                      {product?.title}
                    </Text>
                    <Text style={[styles.productPrice, { color: theme.primary }]}>
                      GHS {product?.price.toFixed(2)}
                    </Text>
                  </View>
                 
                  <View style={[styles.sellerDisplayInfo, { borderTopColor: theme.border, borderBottomColor: theme.border }]}>
                    <View style={styles.sellerAvatarContainer}>
                      {getAvatarUrl() ? (
                        <Image 
                          source={{ uri: getAvatarUrl() }} 
                          style={styles.sellerContactAvatar} 
                        />
                      ) : (
                        <View style={[styles.sellerContactAvatarPlaceholder, { backgroundColor: theme.surface }]}>
                          <Ionicons name="person" size={30} color={theme.textTertiary} />
                        </View>
                      )}
                    </View>
                    <View style={styles.sellerTextInfo}>
                      <Text style={[styles.sellerNameText, { color: theme.text }]}>
                        {sellerName}
                      </Text>
                      <Text style={[styles.sellerShopVerified, { color: theme.success }]}>
                        ✓ Shop Verified
                      </Text>
                    </View>
                  </View>
                 
                  <View style={[styles.phoneInfo, { borderTopColor: theme.border }]}>
                    <Ionicons name="call" size={20} color={theme.primary} />
                    <Text style={[styles.phoneNumber, { color: theme.text }]}>{sellerPhone}</Text>
                    <TouchableOpacity onPress={handleCopyPhone} style={styles.copyButton}>
                      <Ionicons name="copy-outline" size={18} color={theme.textSecondary} />
                    </TouchableOpacity>
                  </View>
                  
                  {shopData && shopData.location && (
                    <View style={[styles.shopLocationInfo, { borderTopColor: theme.border }]}>
                      <Ionicons name="location-outline" size={16} color={theme.textTertiary} />
                      <Text style={[styles.shopLocationText, { color: theme.textSecondary }]}>
                        Shop Location: {shopData.location}
                      </Text>
                    </View>
                  )}
                  
                  {shopData && shopData.description && (
                    <View style={[styles.shopDescription, { borderTopColor: theme.border }]}>
                      <Text style={[styles.shopDescriptionText, { color: theme.textSecondary }]} numberOfLines={2}>
                        {shopData.description}
                      </Text>
                    </View>
                  )}
                </View>
                
                <Text style={[styles.contactOptionsTitle, { color: theme.text }]}>Choose how to contact:</Text>
               
                <TouchableOpacity
                  style={[styles.contactOption, styles.whatsappOption, { backgroundColor: theme.surface, borderLeftColor: '#25D366' }]}
                  onPress={handleWhatsApp}
                >
                  <View style={[styles.contactIconContainer, { backgroundColor: '#25D366' }]}>
                    <Ionicons name="logo-whatsapp" size={30} color="#fff" />
                  </View>
                  <View style={styles.contactOptionText}>
                    <Text style={[styles.contactOptionTitle, { color: theme.text }]}>Open WhatsApp</Text>
                    <Text style={[styles.contactOptionDescription, { color: theme.textSecondary }]}>
                      {order ? 'Opens WhatsApp with order details' : 'Opens WhatsApp with product details'}
                    </Text>
                    <Text style={[styles.whatsappNote, { color: '#25D366' }]}>
                      {order ? 'Includes order information and product link/image' : 'Includes product info, link, and image'}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={theme.textTertiary} />
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[styles.contactOption, styles.callOption, { backgroundColor: theme.surface, borderLeftColor: theme.primary }]}
                  onPress={handleCall}
                >
                  <View style={[styles.contactIconContainer, { backgroundColor: theme.primary }]}>
                    <Ionicons name="call" size={30} color="#fff" />
                  </View>
                  <View style={styles.contactOptionText}>
                    <Text style={[styles.contactOptionTitle, { color: theme.text }]}>Make a Call</Text>
                    <Text style={[styles.contactOptionDescription, { color: theme.textSecondary }]}>
                      Call the seller directly
                    </Text>
                    <Text style={[styles.callNote, { color: theme.primary }]}>
                      Opens your phone dialer with the seller's number
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={theme.textTertiary} />
                </TouchableOpacity>
                
                <View style={[styles.contactDisclaimer, { backgroundColor: theme.background }]}>
                  <Ionicons name="information-circle-outline" size={16} color={theme.textSecondary} />
                  <Text style={[styles.contactDisclaimerText, { color: theme.textTertiary }]}>
                    Contact seller to make any enquiry. Your safety is important.
                  </Text>
                </View>
              </>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

// === SHARE MODAL ===
const ShareModal: React.FC<{
  isVisible: boolean;
  onClose: () => void;
  product: Product;
  onShare: (platform: string) => Promise<void>;
  showAlert: (title: string, message: string, buttons?: any[]) => void;
  theme: any;
}> = ({ isVisible, onClose, product, onShare, showAlert, theme }) => {
  const shareOptions = [
    { id: 'whatsapp', name: 'WhatsApp', icon: 'logo-whatsapp', iconType: 'ionicons', color: '#25D366', scheme: 'whatsapp://send?text=' },
    { id: 'facebook', name: 'Facebook', icon: 'logo-facebook', iconType: 'ionicons', color: '#1877F2', scheme: 'fb://share?text=' },
    { id: 'x', name: 'X', icon: 'twitter', iconType: 'fontawesome', color: '#000000', scheme: 'twitter://post?message=' },
    { id: 'instagram', name: 'Instagram', icon: 'logo-instagram', iconType: 'ionicons', color: '#E4405F', scheme: 'instagram://share?text=' },
    { id: 'telegram', name: 'Telegram', icon: 'paper-plane', iconType: 'ionicons', color: '#0088cc', scheme: 'tg://msg?text=' },
    { id: 'copy', name: 'Copy Link', icon: 'copy', iconType: 'ionicons', color: theme.textSecondary },
  ];

  const generateImageUrl = (product: Product) => {
    if (product.media_urls?.[0]) {
      if (product.media_urls[0].startsWith('http')) {
        return product.media_urls[0];
      }
      return `${SUPABASE_URL}/storage/v1/object/public/products/${product.media_urls[0]}`;
    }
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(product.title)}&background=FF9900&color=fff`;
  };

  const productWebLink = generateProductWebLink(product);

  const createShareMessage = () => {
    const productImageUrl = generateImageUrl(product);
    const price = product.price.toFixed(2);
   
    return `🔥 Check out "${product.title}" for GHS ${price} on Suyado Mart!\n\n` +
           `📱 *Product Details*\n` +
           `• Title: ${product.title}\n` +
           `• Price: GHS ${price}\n` +
           `• Seller: ${product.display_name}\n` +
           `• Campus: ${product.university}\n\n` +
           `🔗 *View Full Product Details*:\n${productWebLink}\n\n` +
           `🖼️ *Product Image*: ${productImageUrl}\n\n` +
           `📲 Visit Suyado Mart for the best campus Trading experience!\n` +
           `#SuyadoMart `;
  };

  const createShortShareMessage = () => {
    const price = product.price.toFixed(2);
   
    return `Check out "${product.title}" for GHS ${price} on Suyado Mart!\n\n` +
           `View product: ${productWebLink}\n\n` +
           `Seller: ${product.display_name}\n` +
           `#SuyadoMart `;
  };

  const handleShare = async (platformId: string) => {
    const fullShareMessage = createShareMessage();
    const shortShareMessage = createShortShareMessage();
    const productImageUrl = generateImageUrl(product);
   
    await onShare(platformId);
   
    if (platformId === 'copy') {
      await Clipboard.setStringAsync(productWebLink);
      showAlert('Copied!', 'Product link copied to clipboard');
      onClose();
      return;
    }
   
    if (platformId === 'more') {
      Share.share({
        message: fullShareMessage,
        title: product.title,
        url: productWebLink,
      });
      onClose();
      return;
    }
   
    const platform = shareOptions.find(p => p.id === platformId);
   
    if (platform?.scheme) {
      try {
        const messageToShare = platformId === 'x' ? shortShareMessage : fullShareMessage;
       
        await Linking.openURL(`${platform.scheme}${encodeURIComponent(messageToShare)}`);
      } catch (error) {
        if (platformId === 'whatsapp') {
          await Linking.openURL(`https://api.whatsapp.com/send?text=${encodeURIComponent(fullShareMessage)}`);
        } else if (platformId === 'facebook') {
          await Linking.openURL(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(productWebLink)}&quote=${encodeURIComponent(product.title)}`);
        } else if (platformId === 'x') {
          await Linking.openURL(`https://x.com/intent/tweet?text=${encodeURIComponent(shortShareMessage)}&url=${encodeURIComponent(productWebLink)}`);
        } else if (platformId === 'instagram') {
          if (product.media_urls?.[0]) {
            const instagramUrl = `instagram://library?AssetPath=${encodeURIComponent(productImageUrl)}`;
            await Linking.openURL(instagramUrl);
          } else {
            await Linking.openURL('instagram://app');
          }
        } else {
          Share.share({
            message: fullShareMessage,
            title: product.title,
            url: productWebLink,
          });
        }
      }
    }
   
    onClose();
  };

  if (!isVisible) return null;

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={isVisible}
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={[styles.shareOverlay, { backgroundColor: theme.modalOverlay }]}
        activeOpacity={1}
        onPress={onClose}
      >
        <View style={[styles.shareContainer, { backgroundColor: theme.modalBackground }]}>
          <View style={styles.shareHeader}>
            <Text style={[styles.shareTitle, { color: theme.text }]}>Share Product</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={theme.text} />
            </TouchableOpacity>
          </View>
         
          <View style={[styles.shareProductPreview, { backgroundColor: theme.surface }]}>
            {product.media_urls?.[0] ? (
              <Image
                source={{ uri: generateImageUrl(product) }}
                style={styles.sharePreviewImage}
                resizeMode="cover"
              />
            ) : (
              <View style={[styles.sharePreviewImage, styles.sharePreviewPlaceholder, { backgroundColor: theme.card }]}>
                <Ionicons name="image-outline" size={30} color={theme.textTertiary} />
              </View>
            )}
            <View style={styles.sharePreviewInfo}>
              <Text style={[styles.shareProductTitle, { color: theme.text }]} numberOfLines={2}>
                {product.title}
              </Text>
              <Text style={[styles.shareProductPrice, { color: theme.primary }]}>
                GHS {product.price.toFixed(2)}
              </Text>
              {product.hasDiscount && (
                <View style={styles.shareDiscountBadge}>
                  <Text style={styles.shareDiscountText}>SAVE {product.discountPercent}%</Text>
                </View>
              )}
              <Text style={[styles.shareSourceText, { color: theme.textTertiary }]}>
                Shared from Suyado Mart
              </Text>
            </View>
          </View>
         
          <View style={[styles.productLinkContainer, { 
            backgroundColor: theme.background, 
            borderColor: theme.border 
          }]}>
            <Text style={[styles.productLinkLabel, { color: theme.primary }]}>Product Web Link:</Text>
            <Text style={[styles.productLinkExample, { color: theme.textTertiary }]}>
              https://www.suyadomart.com/?productId={product.id.substring(0, 8)}...
            </Text>
            <TouchableOpacity
              style={[styles.productLinkButton, { backgroundColor: theme.surface }]}
              onPress={() => {
                Clipboard.setStringAsync(productWebLink);
                showAlert('Copied!', 'Product link copied to clipboard');
              }}
            >
              <Text style={[styles.productLinkText, { color: theme.text }]} numberOfLines={1}>
                {productWebLink}
              </Text>
              <Ionicons name="copy-outline" size={18} color={theme.primary} />
            </TouchableOpacity>
          </View>
         
          <Text style={[styles.shareInstructions, { color: theme.textSecondary }]}>
            Share includes product image + web link
          </Text>
         
          <View style={styles.shareGrid}>
            {shareOptions.map((option) => (
              <TouchableOpacity
                key={option.id}
                style={styles.shareOption}
                onPress={() => handleShare(option.id)}
              >
                <View style={[styles.shareIconContainer, { backgroundColor: option.color }]}>
                  {option.id === 'x' ? (
                    <Text style={{ fontSize: 30, fontWeight: 'bold', color: '#fff' }}>X</Text>
                  ) : option.iconType === 'fontawesome' ? (
                    <FontAwesome name={option.icon as any} size={30} color="#fff" />
                  ) : (
                    <Ionicons name={option.icon as any} size={30} color="#fff" />
                  )}
                </View>
                <Text style={[styles.shareOptionText, { color: theme.text }]}>{option.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity
            style={[styles.moreOptionsButton, { backgroundColor: theme.primary }]}
            onPress={() => handleShare('more')}
          >
            <Ionicons name="share-social" size={24} color="#fff" />
            <Text style={styles.moreOptionsText}>More Options</Text>
          </TouchableOpacity>
         
          <Text style={[styles.shareNote, { color: theme.textTertiary }]}>
            Product web link will open product details in browser
          </Text>
        </View>
      </TouchableOpacity>
    </Modal>
  );
};

// === ORDER PRODUCT DETAIL MODAL - UPDATED WITH CORRECT COLOR MEDIA FILTERING ===
const OrderProductDetailModal: React.FC<{
  isVisible: boolean;
  onClose: () => void;
  product: Product | null;
  order: any | null;
  onOpenFullViewer: (index: number) => void;
  onContactSeller: () => void;
  onCancelOrder: (orderId: string) => Promise<void>;
  showAlert: (title: string, message: string, buttons?: any[]) => void;
  theme: any;
}> = ({ isVisible, onClose, product, order, onOpenFullViewer, onContactSeller, onCancelOrder, showAlert, theme }) => {
  const [cancelling, setCancelling] = useState(false);
  const [orderItems, setOrderItems] = useState<any[]>([]);
  const [fullProductData, setFullProductData] = useState<any>(null);
  const [colorSpecificMedia, setColorSpecificMedia] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0);
  const { width } = useWindowDimensions();
  
  // Calculate dimensions for desktop centering
  const isLargeScreen = width >= 768;
  const modalWidth = isLargeScreen ? Math.min(width * 0.8, 800) : '100%';

  // Fetch full product data including color_media
useEffect(() => {
  const fetchFullProductData = async () => {
    if (!product || !order) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('id', product.id)
        .single();
      
      if (error) throw error;
      setFullProductData(data);
      
      // Filter media by selected color
      if (order.selected_color && data?.color_media) {
        const colorMedia = data.color_media || {};
        const mediaForColor = colorMedia[order.selected_color];
        
        if (mediaForColor?.length > 0) {
          // Use color-specific media if available
          // Make sure media URLs are properly formatted
          const formattedMedia = mediaForColor.map((url: string) => {
            if (url.startsWith('http')) {
              return url;
            } else {
              return `${SUPABASE_URL}/storage/v1/object/public/products/${url}`;
            }
          });
          setColorSpecificMedia(formattedMedia);
        } else {
          // Fall back to general media URLs
          const generalMedia = data.media_urls || [];
          const formattedMedia = generalMedia.map((url: string) => {
            if (url.startsWith('http')) {
              return url;
            } else {
              return `${SUPABASE_URL}/storage/v1/object/public/products/${url}`;
            }
          });
          setColorSpecificMedia(formattedMedia);
        }
      } else {
        // No color selected, use general media
        const generalMedia = data?.media_urls || product.media_urls || [];
        const formattedMedia = generalMedia.map((url: string) => {
          if (url.startsWith('http')) {
            return url;
          } else {
            return `${SUPABASE_URL}/storage/v1/object/public/products/${url}`;
          }
        });
        setColorSpecificMedia(formattedMedia);
      }
    } catch (error) {
      console.error('Error fetching product details:', error);
      // Fallback to product's media_urls
      const generalMedia = product.media_urls || [];
      const formattedMedia = generalMedia.map((url: string) => {
        if (url.startsWith('http')) {
          return url;
        } else {
          return `${SUPABASE_URL}/storage/v1/object/public/products/${url}`;
        }
      });
      setColorSpecificMedia(formattedMedia);
    } finally {
      setLoading(false);
    }
  };
  
  if (isVisible && product && order) {
    fetchFullProductData();
  } else {
    setColorSpecificMedia([]);
    setFullProductData(null);
  }
}, [isVisible, product, order]);

  // Fetch order items with size and color details
  useEffect(() => {
    const fetchOrderItems = async () => {
      if (!order) return;
      
      try {
        const { data, error } = await supabase
          .from('order_items')
          .select('*')
          .eq('order_id', order.id);
        
        if (error) throw error;
        setOrderItems(data || []);
      } catch (error) {
        console.error('Error fetching order items:', error);
      }
    };
    
    if (isVisible && order) {
      fetchOrderItems();
    } else {
      setOrderItems([]);
    }
  }, [isVisible, order]);

  const handleCancelOrder = async () => {
    if (!order) return;
    
    setCancelling(true);
    try {
      await onCancelOrder(order.id);
    } catch (error) {
      console.error('Error cancelling order:', error);
    } finally {
      setCancelling(false);
    }
  };

  // Helper function to check if media URL is color-specific
  const isColorSpecificMedia = (mediaUrl: string) => {
    if (!order?.selected_color || !fullProductData?.color_media) return false;
    const colorMedia = fullProductData.color_media[order.selected_color] || [];
    return colorMedia.some((url: string) => {
      const fullUrl = url.startsWith('http') ? url : `${SUPABASE_URL}/storage/v1/object/public/products/${url}`;
      return fullUrl === mediaUrl;
    });
  };

  // Format media URLs for display
  const formatMediaUrls = (urls: string[]) => {
    return urls.map(url => {
      if (url.startsWith('http')) {
        return url;
      } else {
        return `${SUPABASE_URL}/storage/v1/object/public/products/${url}`;
      }
    });
  };

  if (!product || !order) return null;

  // Determine which media to display
  const displayMedia = colorSpecificMedia.length > 0 ? colorSpecificMedia : formatMediaUrls(product.media_urls || []);

  // Check if we have color-specific media to show
  const hasColorSpecificMedia = colorSpecificMedia.length > 0 && 
    order.selected_color && 
    fullProductData?.color_media?.[order.selected_color]?.length > 0;

  return (
    <Modal animationType="slide" transparent={true} visible={isVisible} onRequestClose={onClose}>
      <View style={[styles.modalCenteredView, { backgroundColor: theme.modalOverlay }]}>
        <View style={[
          styles.modalModalView, 
          { 
            backgroundColor: theme.modalBackground,
            width: modalWidth,
            maxWidth: 800,
            alignSelf: 'center',
            marginHorizontal: 'auto',
            left: 0,
            right: 0,
            marginLeft: 'auto',
            marginRight: 'auto',
          }
        ]}>
          <TouchableOpacity style={styles.modalCloseButton} onPress={onClose}>
            <Ionicons name="close-circle" size={30} color={theme.primary} />
          </TouchableOpacity>
          
          {loading ? (
            <View style={styles.modalLoadingContainer}>
              <ActivityIndicator size="large" color={theme.primary} />
              <Text style={[styles.modalLoadingText, { color: theme.text }]}>Loading product details...</Text>
            </View>
          ) : (
            <ScrollView contentContainerStyle={styles.modalScrollContent}>
              {/* Show media gallery */}
              {displayMedia?.length > 0 && (
                <View style={[styles.mediaGalleryContainer, { alignItems: 'center' }]}>
                  <View style={styles.colorMediaSection}>
                    {hasColorSpecificMedia && order.selected_color && (
                      <View style={styles.colorMediaHeader}>
                        <Ionicons name="color-palette" size={18} color={theme.primary} />
                        <Text style={[styles.colorMediaTitle, { color: theme.text }]}>
                          Viewing: {order.selected_color} color media ({colorSpecificMedia.length} images)
                        </Text>
                        <View style={[styles.colorIndicator, { backgroundColor: theme.primary }]}>
                          <Text style={styles.colorIndicatorText}>Color Specific</Text>
                        </View>
                      </View>
                    )}
                    {!hasColorSpecificMedia && order.selected_color && (
                      <View style={styles.colorMediaHeader}>
                        <Ionicons name="color-palette-outline" size={18} color={theme.textTertiary} />
                        <Text style={[styles.colorMediaTitle, { color: theme.textSecondary }]}>
                          No specific media found for {order.selected_color}, showing all product images
                        </Text>
                      </View>
                    )}
                    {/* Show one media at a time with swipe navigation for ordered product details */}
                    {displayMedia && displayMedia.length > 0 && (
                      <View style={{ width: isLargeScreen ? Math.min(width * 0.8, 700) : '100%', height: isLargeScreen ? 420 : 260, alignSelf: 'center' }}>
                        <FlatList
                          data={displayMedia}
                          horizontal
                          pagingEnabled
                          showsHorizontalScrollIndicator={false}
                          keyExtractor={(_, i) => i.toString()}
                          getItemLayout={(_, i) => ({ length: isLargeScreen ? Math.min(width * 0.8, 700) : width, offset: (isLargeScreen ? Math.min(width * 0.8, 700) : width) * i, index: i })}
                          initialScrollIndex={currentMediaIndex}
                          onMomentumScrollEnd={(e) => {
                            const containerWidth = isLargeScreen ? Math.min(width * 0.8, 700) : width;
                            setCurrentMediaIndex(Math.round(e.nativeEvent.contentOffset.x / containerWidth));
                          }}
                          renderItem={({ item: url, index }) => {
                            const isVideo = url.toLowerCase().includes('.mp4');
                            const containerWidth = isLargeScreen ? Math.min(width * 0.8, 700) : width;
                            const containerHeight = isLargeScreen ? 420 : 260;
                            return (
                              <TouchableOpacity 
                                activeOpacity={0.95} 
                                style={{ width: containerWidth, height: containerHeight, backgroundColor: theme.background }}
                                onPress={() => onOpenFullViewer(index)}
                              >
                                {isVideo ? (
                                  <View style={{ width: '100%', height: '100%' }}>
                                    <Image source={{ uri: getCardDisplayUrl(displayMedia) }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                                    <View style={styles.tiktokPlayThumbnailOverlay} pointerEvents="none">
                                      <View style={styles.tiktokPlayButtonSmall}>
                                        <Ionicons name="play" size={36} color="#fff" />
                                      </View>
                                    </View>
                                  </View>
                                ) : (
                                  <Image source={{ uri: url }} style={{ width: '100%', height: '100%' }} resizeMode="contain" />
                                )}
                              </TouchableOpacity>
                            );
                          }}
                        />
                      </View>
                    )}
                    
                    {/* Media counter and color indicator */}
                    {displayMedia.length > 1 && (
                      <View style={[styles.mediaCounterBadge, { backgroundColor: theme.overlay }]}>
                        <Text style={[styles.mediaCounterText, { color: '#fff' }]}>
                          {currentMediaIndex + 1} / {displayMedia.length}
                        </Text>
                      </View>
                    )}
                    
                    {/* Color media indicator */}
                    {hasColorSpecificMedia && (
                      <View style={[styles.colorMediaBadge, { backgroundColor: theme.primary }]}>
                        <Text style={styles.colorMediaBadgeText}>
                          {order.selected_color} • {colorSpecificMedia.length} images
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              )}
              
              <View style={styles.modalDetailsContainer}>
                
                {/* Order Status Badge */}
                <View style={[
                  styles.orderStatusBadge, 
                  { backgroundColor: getStatusColor(order.status, theme) }
                ]}>
                  <Text style={styles.orderStatusText}>
                    {getStatusText(order.status)}
                  </Text>
                </View>

                <Text style={[styles.modalTitle, { color: theme.text }]}>{product.title}</Text>
                <View style={styles.modalPriceRow}>
                  <Text style={[styles.modalPrice, { color: theme.primary }]}>
                    <Text style={[styles.modalCurrency, { color: theme.primary }]}>GHS</Text> {Number(product.price).toFixed(2)}
                  </Text>
                  {product.hasDiscount && (
                    <>
                      <Text style={[styles.modalOldPrice, { color: theme.textTertiary }]}>GHS {Number(product.original_price).toFixed(2)}</Text>
                      <View style={styles.modalDiscountBadge}>
                        <Text style={styles.modalDiscountText}>-{product.discountPercent}%</Text>
                      </View>
                    </>
                  )}
                </View>
                
                {/* Selected Options Display */}
                {(order.selected_size || order.selected_color || order.quantity) && (
                  <View style={[styles.selectedOptionsContainer, { backgroundColor: theme.surface }]}>
                    <Text style={[styles.selectedOptionsTitle, { color: theme.text }]}>Order Details:</Text>
                    <View style={styles.selectedOptionsGrid}>
                      {order.selected_size && (
                        <View style={styles.selectedOptionItem}>
                          <Ionicons name="resize-outline" size={16} color={theme.textTertiary} />
                          <Text style={[styles.selectedOptionLabel, { color: theme.textSecondary }]}>Size:</Text>
                          <Text style={[styles.selectedOptionValue, { color: theme.text }]}>{order.selected_size}</Text>
                        </View>
                      )}
                      {order.selected_color && (
                        <View style={styles.selectedOptionItem}>
                          <Ionicons 
                            name={hasColorSpecificMedia ? "color-palette" : "color-palette-outline"} 
                            size={16} 
                            color={hasColorSpecificMedia ? theme.primary : theme.textTertiary} 
                          />
                          <Text style={[styles.selectedOptionLabel, { color: theme.textSecondary }]}>Color:</Text>
                          <Text style={[
                            styles.selectedOptionValue, 
                            { color: hasColorSpecificMedia ? theme.primary : theme.text }
                          ]}>
                            {order.selected_color}
                            {hasColorSpecificMedia && (
                              <Text style={{ fontSize: 10, color: theme.success }}> ✓</Text>
                            )}
                          </Text>
                        </View>
                      )}
                      {order.quantity && (
                        <View style={styles.selectedOptionItem}>
                          <Ionicons name="cart-outline" size={16} color={theme.textTertiary} />
                          <Text style={[styles.selectedOptionLabel, { color: theme.textSecondary }]}>Quantity:</Text>
                          <Text style={[styles.selectedOptionValue, { color: theme.text }]}>{order.quantity}</Text>
                        </View>
                      )}
                    </View>
                  </View>
                )}
               
                <Text style={[styles.modalSectionTitle, { color: theme.text, borderBottomColor: theme.border }]}>Product Description</Text>
                <Text style={[styles.modalDescription, { color: theme.textSecondary }]}>
                  {product.description || product.title}
                </Text>
               
                <View style={[styles.modalSellerInfo, { borderTopColor: theme.border }]}>
                  <Image source={{ uri: product.avatar_url }} style={[styles.modalSellerAvatar, { borderColor: theme.primary }]} />
                  <View>
                    <Text style={[styles.modalSellerName, { color: theme.text }]}>Sold by: {product.display_name}</Text>
                    <Text style={[styles.modalSellerUniversity, { color: theme.textTertiary }]}>{product.university}</Text>
                  </View>
                </View>

                {/* Order Information Section */}
                <View style={[styles.orderInfoSection, { borderTopColor: theme.border }]}>
                  <Text style={[styles.modalSectionTitle, { color: theme.text, borderBottomColor: theme.border }]}>Order Information</Text>
                  
                  <View style={styles.orderInfoRow}>
                    <Ionicons name="person-outline" size={16} color={theme.textTertiary} />
                    <Text style={[styles.orderInfoLabel, { color: theme.textSecondary }]}>Buyer: </Text>
                    <Text style={[styles.orderInfoValue, { color: theme.text }]}>{order.buyer_name}</Text>
                  </View>
                  
                  <View style={styles.orderInfoRow}>
                    <Ionicons name="call-outline" size={16} color={theme.textTertiary} />
                    <Text style={[styles.orderInfoLabel, { color: theme.textSecondary }]}>Phone: </Text>
                    <Text style={[styles.orderInfoValue, { color: theme.text }]}>{order.phone_number}</Text>
                  </View>
                  
                  <View style={styles.orderInfoRow}>
                    <Ionicons name="location-outline" size={16} color={theme.textTertiary} />
                    <Text style={[styles.orderInfoLabel, { color: theme.textSecondary }]}>Location: </Text>
                    <Text style={[styles.orderInfoValue, { color: theme.text }]}>{order.location}</Text>
                  </View>
                  
                  <View style={styles.orderInfoRow}>
                    <Ionicons
                      name={order.delivery_option === 'delivery' ? "car-outline" : "storefront-outline"}
                      size={16}
                      color={theme.textTertiary}
                    />
                    <Text style={[styles.orderInfoLabel, { color: theme.textSecondary }]}>Delivery: </Text>
                    <Text style={[styles.orderInfoValue, { color: theme.text }]}>
                      {order.delivery_option === 'delivery' ? 'Campus Delivery' : 'Meetup/Pickup'}
                    </Text>
                  </View>
                  
                  <View style={styles.orderInfoRow}>
                    <Ionicons name="pricetag-outline" size={16} color={theme.textTertiary} />
                    <Text style={[styles.orderInfoLabel, { color: theme.textSecondary }]}>Total Amount: </Text>
                    <Text style={[styles.orderInfoValue, { color: theme.primary }]}>
                      GHS {order.total_amount?.toFixed(2) || '0.00'}
                    </Text>
                  </View>
                  
                  {order.additional_notes && (
                    <View style={styles.orderInfoRow}>
                      <Ionicons name="document-text-outline" size={16} color={theme.textTertiary} />
                      <Text style={[styles.orderInfoLabel, { color: theme.textSecondary }]}>Notes: </Text>
                      <Text style={[styles.orderInfoValue, { color: theme.text }]}>{order.additional_notes}</Text>
                    </View>
                  )}
                  
                  <View style={styles.orderInfoRow}>
                    <Ionicons name="calendar-outline" size={16} color={theme.textTertiary} />
                    <Text style={[styles.orderInfoLabel, { color: theme.textSecondary }]}>Order Date: </Text>
                    <Text style={[styles.orderInfoValue, { color: theme.text }]}>
                      {new Date(order.created_at).toLocaleDateString()}
                    </Text>
                  </View>
                </View>
                
                {/* Order Items (for cart orders) */}
                {order.is_cart_order && orderItems.length > 0 && (
                  <View style={[styles.orderItemsSection, { borderTopColor: theme.border }]}>
                    <Text style={[styles.modalSectionTitle, { color: theme.text, borderBottomColor: theme.border }]}>
                      Order Items ({orderItems.length})
                    </Text>
                    {orderItems.map((item, index) => (
                      <View key={index} style={[styles.orderItemCard, { backgroundColor: theme.surface }]}>
                        <View style={styles.orderItemHeader}>
                          <Text style={[styles.orderItemTitle, { color: theme.text }]} numberOfLines={1}>
                            {item.product_name}
                          </Text>
                          <Text style={[styles.orderItemPrice, { color: theme.primary }]}>
                            GHS {item.total_price?.toFixed(2) || '0.00'}
                          </Text>
                        </View>
                        <View style={styles.orderItemDetails}>
                          <Text style={[styles.orderItemDetail, { color: theme.textSecondary }]}>
                            Price: GHS {item.product_price?.toFixed(2)} × {item.quantity} units
                          </Text>
                          {item.size && (
                            <Text style={[styles.orderItemDetail, { color: theme.textSecondary }]}>
                              Size: {item.size}
                            </Text>
                          )}
                          {item.color && (
                            <Text style={[styles.orderItemDetail, { color: theme.textSecondary }]}>
                              Color: {item.color}
                            </Text>
                          )}
                        </View>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            </ScrollView>
          )}
          <View style={[styles.modalActionBar, { borderTopColor: theme.border, backgroundColor: theme.modalBackground }]}>
            {(order.status === 'pending' || order.status === 'processing') && (
              <TouchableOpacity
                style={[styles.modalContactButton, { backgroundColor: theme.surface }]}
                onPress={onContactSeller}
              >
                <Ionicons name="chatbubble-outline" size={20} color={theme.text} />
                <Text style={[styles.modalContactButtonText, { color: theme.text }]}>Chat Seller</Text>
              </TouchableOpacity>
            )}
           
            {(order.status === 'pending' || order.status === 'processing') && (
              <TouchableOpacity
                style={[styles.modalCancelOrderButton, { backgroundColor: theme.error }]}
                onPress={handleCancelOrder}
                disabled={cancelling}
              >
                {cancelling ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Ionicons name="close-circle" size={20} color="#fff" />
                )}
                <Text style={styles.modalCancelOrderButtonText}>
                  {cancelling ? 'Cancelling...' : 'Cancel Order'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
};

// === ORDERS SCREEN COMPONENT - UPDATED WITH CALENDAR FILTER ===
const OrdersScreenModal: React.FC<{
  isVisible: boolean;
  onClose: () => void;
  onViewProductDetails: (order: any, product: Product) => void;
  showAlert: (title: string, message: string, buttons?: any[]) => void;
  theme: any;
}> = ({ isVisible, onClose, onViewProductDetails, showAlert, theme }) => {
  const [orders, setOrders] = useState<any[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [shopData, setShopData] = useState<Record<string, { name: string; avatar_url: string | null }>>({});
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);
  
  // Sorting and filtering states
  const [sortOption, setSortOption] = useState<SortOption>('newest');
  const [filterOption, setFilterOption] = useState<FilterOption>('all');
  const [calendarFilter, setCalendarFilter] = useState<DateSelection | null>(null);
  const [showSortFilterMenu, setShowSortFilterMenu] = useState(false);
  const [showCalendarFilter, setShowCalendarFilter] = useState(false);

  const getCurrentUserId = async () => {
    const { data } = await supabase.auth.getUser();
    return data?.user?.id ?? null;
  };

  const fetchUnreadNotificationCount = async (userId: string) => {
    try {
      const { count, error } = await supabase
        .from('buyer_notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('is_read', false);
      
      if (error) {
        console.error('Error fetching unread notifications:', error);
        return 0;
      }
      
      return count || 0;
    } catch (error) {
      console.error('Error fetching unread notifications:', error);
      return 0;
    }
  };

  const markNotificationsAsRead = async (userId: string) => {
    try {
      const { error } = await supabase
        .from('buyer_notifications')
        .update({ is_read: true })
        .eq('user_id', userId)
        .eq('is_read', false);
      
      if (error) {
        console.error('Error marking notifications as read:', error);
      } else {
        console.log('✅ Notifications marked as read');
        setUnreadNotificationCount(0);
      }
    } catch (error) {
      console.error('Error in markNotificationsAsRead:', error);
    }
  };

  const fetchShopData = async (sellerId: string): Promise<{ name: string; avatar_url: string | null }> => {
    try {
      const { data: shopData, error: shopError } = await supabase
        .from('shops')
        .select('name, avatar_url')
        .eq('owner_id', sellerId)
        .single();
      if (shopError) {
        const { data: profileData, error: userError } = await supabase
          .from('user_profiles')
          .select('full_name, avatar_url')
          .eq('id', sellerId)
          .single();
        if (userError) {
          return { name: 'Seller', avatar_url: null };
        }
        return {
          name: profileData?.full_name || 'Seller',
          avatar_url: profileData?.avatar_url || null
        };
      }
      return {
        name: shopData?.name || 'Shop',
        avatar_url: shopData?.avatar_url || null
      };
    } catch (error) {
      return { name: 'Seller', avatar_url: null };
    }
  };

  const fetchShopDataForOrders = async (orders: any[]): Promise<Record<string, { name: string; avatar_url: string | null }>> => {
    const shopDataMap: Record<string, { name: string; avatar_url: string | null }> = {};
    const uniqueSellerIds = new Set<string>();
    orders.forEach(order => {
      if (order.seller_id) uniqueSellerIds.add(order.seller_id);
      if (order.order_items && order.order_items.length > 0) {
        order.order_items.forEach((item: any) => {
          if (item.seller_id) uniqueSellerIds.add(item.seller_id);
        });
      }
    });
    const promises = Array.from(uniqueSellerIds).map(async (sellerId) => {
      const shopData = await fetchShopData(sellerId);
      shopDataMap[sellerId] = shopData;
    });
    await Promise.all(promises);
    return shopDataMap;
  };

  const applySortingAndFiltering = (ordersList: any[]) => {
    let result = [...ordersList];
    
    // Apply calendar filter
    if (calendarFilter) {
      result = result.filter(order => {
        const orderDate = new Date(order.created_at);
        
        if (calendarFilter.singleDate) {
          return isSameDay(orderDate, calendarFilter.singleDate);
        }
        
        if (calendarFilter.dateRange) {
          return isWithinInterval(orderDate, {
            start: calendarFilter.dateRange.start,
            end: calendarFilter.dateRange.end
          });
        }
        
        if (calendarFilter.monthRange) {
          const orderMonth = new Date(orderDate.getFullYear(), orderDate.getMonth(), 1);
          const startMonth = new Date(calendarFilter.monthRange.start.getFullYear(), calendarFilter.monthRange.start.getMonth(), 1);
          const endMonth = new Date(calendarFilter.monthRange.end.getFullYear(), calendarFilter.monthRange.end.getMonth(), 1);
          
          return orderMonth >= startMonth && orderMonth <= endMonth;
        }
        
        if (calendarFilter.year) {
          return orderDate.getFullYear() === calendarFilter.year;
        }
        
        return true;
      });
    }
    
    // Apply status filter
    if (filterOption !== 'all') {
      result = result.filter(order => order.status === filterOption);
    }
    
    // Apply sorting
    result.sort((a, b) => {
      const dateA = new Date(a.created_at);
      const dateB = new Date(b.created_at);
      
      switch (sortOption) {
        case 'newest':
          return dateB.getTime() - dateA.getTime();
        case 'oldest':
          return dateA.getTime() - dateB.getTime();
        case 'price-high':
          return b.total_amount - a.total_amount;
        case 'price-low':
          return a.total_amount - b.total_amount;
        case 'status':
          // Sort by status: pending > processing > shipped > completed > cancelled
          const statusOrder = { pending: 0, processing: 1, shipped: 2, completed: 3, cancelled: 4 };
          return (statusOrder[a.status as keyof typeof statusOrder] || 5) - 
                 (statusOrder[b.status as keyof typeof statusOrder] || 5);
        default:
          return dateB.getTime() - dateA.getTime();
      }
    });
    
    return result;
  };

  const loadOrders = useCallback(async () => {
    try {
      setLoading(true);
      const userId = await getCurrentUserId();
      if (!userId) {
        showAlert('Login Required', 'Please log in to view orders');
        onClose();
        return;
      }
     
      setCurrentUserId(userId);
      
      await markNotificationsAsRead(userId);
      
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (
            *,
            products (
              title,
              media_urls,
              seller_id
            )
          )
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setOrders(data || []);
      const filtered = applySortingAndFiltering(data || []);
      setFilteredOrders(filtered);
      if (data && data.length > 0) {
        const shopDataMap = await fetchShopDataForOrders(data);
        setShopData(shopDataMap);
      }
      
      const unreadCount = await fetchUnreadNotificationCount(userId);
      setUnreadNotificationCount(unreadCount);
    } catch (error) {
      showAlert('Error', 'Failed to load orders');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [sortOption, filterOption, calendarFilter]);

  useEffect(() => {
    if (!isVisible) return;
    loadOrders();
   
    const channel = supabase
      .channel(`buyer-orders-updates`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
        },
        (payload: any) => {
          if (payload.new && (payload.new as any).user_id === currentUserId) {
            loadOrders();
          }
        }
      )
      .subscribe();
      
    const notificationChannel = supabase
      .channel(`buyer-notifications-${currentUserId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'buyer_notifications',
          filter: `user_id=eq.${currentUserId}`
        },
        async () => {
          if (currentUserId) {
            const unreadCount = await fetchUnreadNotificationCount(currentUserId);
            setUnreadNotificationCount(unreadCount);
          }
        }
      )
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(notificationChannel);
    };
  }, [isVisible, currentUserId]);

  useEffect(() => {
    if (orders.length > 0) {
      const filtered = applySortingAndFiltering(orders);
      setFilteredOrders(filtered);
    }
  }, [sortOption, filterOption, calendarFilter, orders]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadOrders();
  }, [loadOrders]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const cancelOrder = async (orderId: string) => {
    try {
      const userId = await getCurrentUserId();
      if (!userId) {
        showAlert('Error', 'User not found');
        return;
      }
      const { data: order, error: fetchError } = await supabase
        .from('orders')
        .select('status')
        .eq('id', orderId)
        .single();
      if (fetchError) throw fetchError;
      if (order.status === 'cancelled') {
        showAlert('Error', 'This order has already been cancelled');
        return;
      }
      if (order.status !== 'pending') {
        showAlert('Cannot Cancel', 'This order can no longer be cancelled as it has already been accepted by the seller.');
        return;
      }
      const { error } = await supabase
        .from('orders')
        .update({
          status: 'cancelled',
          cancelled_at: new Date().toISOString(),
          cancelled_by: userId,
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId)
        .eq('status', 'pending');
      if (error) throw error;
     
      setOrders(prev => prev.map(order =>
        order.id === orderId
          ? {
              ...order,
              status: 'cancelled',
              cancelled_at: new Date().toISOString(),
              cancelled_by: userId,
              updated_at: new Date().toISOString()
            }
          : order
      ));
      setTimeout(() => {
        loadOrders();
      }, 1000);
      showAlert('Success', 'Order cancelled successfully');
    } catch (error: any) {
      showAlert('Error', error.message || 'Failed to cancel order');
    }
  };

  const getShopDataForOrder = (order: any): { name: string; avatar_url: string | null } => {
    if (order.seller_id && shopData[order.seller_id]) {
      return shopData[order.seller_id];
    }
    if (order.order_items && order.order_items.length > 0) {
      const firstItem = order.order_items[0];
      if (firstItem.seller_id && shopData[firstItem.seller_id]) {
        return shopData[firstItem.seller_id];
      }
      if (firstItem.products?.seller_id && shopData[firstItem.products.seller_id]) {
        return shopData[firstItem.products.seller_id];
      }
    }
    return { name: 'Shop', avatar_url: null };
  };

  const getAvatarUrlForOrder = (order: any): string => {
    const shopData = getShopDataForOrder(order);
   
    if (shopData.avatar_url) {
      if (shopData.avatar_url.startsWith('http')) {
        return shopData.avatar_url;
      } else {
        return `${SUPABASE_URL}/storage/v1/object/public/avatars/${shopData.avatar_url}`;
      }
    }
   
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(shopData.name)}&background=FF9900&color=fff`;
  };

  const getProductFromOrder = (order: any): Product => {
    const firstItem = order.order_items?.[0] || order;
    
    return {
      id: firstItem.product_id || firstItem.id,
      title: firstItem.product_name || firstItem.products?.title || firstItem.title || 'Product',
      description: firstItem.products?.description || '',
      price: firstItem.product_price || firstItem.total_amount || 0,
      original_price: null,
      quantity: firstItem.quantity || 1,
      media_urls: [
        firstItem.product_image_url || 
        firstItem.products?.media_urls?.[0] || 
        firstItem.media_urls?.[0] || 
        'https://ui-avatars.com/api/?name=Product&background=FF9900&color=fff'
      ],
      seller_id: order.seller_id || firstItem.seller_id,
      display_name: getShopDataForOrder(order).name || 'Seller',
      avatar_url: getAvatarUrlForOrder(order),
      university: '',
      hasDiscount: false,
      discountPercent: null,
      isVideo: false,
      score: 0,
      commentCount: 0,
      likeCount: 0,
      shareCount: 0,
      followerCount: 0,
      isLiked: false,
      isFollowed: false,
      inCart: false,
    };
  };

  const formatCalendarFilterText = () => {
    if (!calendarFilter) return '';
    
    if (calendarFilter.singleDate) {
      return format(calendarFilter.singleDate, 'MMM d, yyyy');
    }
    
    if (calendarFilter.dateRange) {
      return `${format(calendarFilter.dateRange.start, 'MMM d')} - ${format(calendarFilter.dateRange.end, 'MMM d, yyyy')}`;
    }
    
    if (calendarFilter.monthRange) {
      if (isSameMonth(calendarFilter.monthRange.start, calendarFilter.monthRange.end)) {
        return format(calendarFilter.monthRange.start, 'MMMM yyyy');
      }
      return `${format(calendarFilter.monthRange.start, 'MMM yyyy')} - ${format(calendarFilter.monthRange.end, 'MMM yyyy')}`;
    }
    
    if (calendarFilter.year) {
      return `Year: ${calendarFilter.year}`;
    }
    
    return '';
  };

  const renderOrderItem = ({ item }: { item: any }) => {
    const firstItem = item.order_items?.[0] || item;
    // Prefer an image thumbnail when possible (avoid showing raw video in list)
    const possibleMedia = [
      firstItem.product_image_url,
      ...(firstItem.products?.media_urls || []),
      ...(firstItem.media_urls || []),
    ].filter(Boolean) as string[];
    // Prefer a static image thumbnail when possible. If only a video exists, fall back to a placeholder image.
    let coverImage = getCardDisplayMedia(possibleMedia) || getCardDisplayUrl(possibleMedia) || 'https://ui-avatars.com/api/?name=Product&background=FF9900&color=fff';
    if (isVideoUrl(coverImage)) {
      // try to find a non-video thumbnail
      const nonVideo = possibleMedia.find(m => !isVideoUrl(m));
      if (nonVideo) coverImage = nonVideo.startsWith('http') ? nonVideo : `${SUPABASE_URL}/storage/v1/object/public/products/${nonVideo}`;
      else {
        // final fallback to placeholder
        coverImage = 'https://ui-avatars.com/api/?name=Product&background=FF9900&color=fff';
      }
    }
   
    const productName = firstItem.product_name ||
                       firstItem.products?.title ||
                       firstItem.title ||
                       'Product';
   
    const shopData = getShopDataForOrder(item);
    const avatarUrl = getAvatarUrlForOrder(item);
   
    return (
      <View style={[styles.orderCard, { 
        backgroundColor: theme.surface,
        shadowColor: theme.shadow,
      }]}>
        <View style={styles.orderHeader}>
          <View style={styles.orderInfo}>
            <Text style={[styles.orderId, { color: theme.text }]}>Order #{item.id.slice(-8)}</Text>
            <Text style={[styles.orderDate, { color: theme.textTertiary }]}>
              {formatDate(item.created_at)}
            </Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status, theme) }]}>
            <Text style={styles.statusText}>{getStatusText(item.status)}</Text>
          </View>
        </View>
        <View style={styles.orderContent}>
          {coverImage && (
            <Image
              source={{ uri: coverImage }}
              style={styles.orderProductImage}
              resizeMode="cover"
            />
          )}
         
          <View style={styles.orderDetails}>
            <Text style={[styles.orderProductTitle, { color: theme.text }]} numberOfLines={2}>
              {productName}
              {item.order_items?.length > 1 && ` +${item.order_items.length - 1} more`}
            </Text>
           
            <Text style={[styles.orderProductPrice, { color: theme.primary }]}>
              GHS {item.total_amount?.toFixed(2) || '0.00'}
            </Text>
           
            <View style={styles.sellerInfo}>
              <Image
                source={{ uri: avatarUrl }}
                style={styles.sellerAvatar}
              />
              <Text style={[styles.sellerName, { color: theme.textSecondary }]}>Shop: {shopData.name}</Text>
            </View>
            <Text style={[styles.orderDeliveryInfo, { color: theme.textTertiary }]}>
              {item.delivery_option === 'delivery' ? 'Delivery' : 'Pickup'} • {item.location || 'No location specified'}
            </Text>
          </View>
        </View>
        <View style={[styles.orderFooter, { borderTopColor: theme.border }]}>
          <Text style={[styles.orderItemsCount, { color: theme.textTertiary }]}>
            {item.order_items?.length || 1} item{item.order_items?.length !== 1 ? 's' : ''}
          </Text>
         
          <TouchableOpacity
            style={[styles.orderActionButton, { backgroundColor: theme.primary }]}
            onPress={() => {
              const product = getProductFromOrder(item);
              onViewProductDetails(item, product);
            }}
          >
            <Ionicons name="eye-outline" size={16} color="#fff" />
            <Text style={styles.orderActionButtonText}>View Details</Text>
          </TouchableOpacity>
         
          {item.status === 'pending' && (
            <TouchableOpacity
              style={[styles.orderActionButton, styles.cancelOrderButton, { backgroundColor: theme.error }]}
              onPress={() => {
                showAlert(
                  'Cancel Order',
                  'Are you sure you want to cancel this order? This action cannot be undone.',
                  [
                    {
                      text: 'Keep Order',
                      style: 'cancel',
                      onPress: () => {}
                    },
                    {
                      text: 'Yes, Cancel',
                      style: 'destructive',
                      onPress: () => cancelOrder(item.id)
                    }
                  ]
                );
              }}
            >
              <Ionicons name="close-circle" size={16} color="#fff" />
              <Text style={styles.orderActionButtonText}>Cancel Order</Text>
            </TouchableOpacity>
          )}
         
          {item.status === 'cancelled' && (
            <View style={[styles.orderActionButton, { backgroundColor: theme.textTertiary }]}>
              <Ionicons name="close-circle" size={16} color="#fff" />
              <Text style={styles.orderActionButtonText}>Cancelled</Text>
            </View>
          )}
         
          {item.status === 'processing' && (
            <View style={[styles.orderActionButton, { backgroundColor: theme.info }]}>
              <Ionicons name="time" size={16} color="#fff" />
              <Text style={styles.orderActionButtonText}>Processing</Text>
            </View>
          )}
         
          {item.status === 'completed' && (
            <View style={[styles.orderActionButton, { backgroundColor: theme.success }]}>
              <Ionicons name="checkmark-circle" size={16} color="#fff" />
              <Text style={styles.orderActionButtonText}>Completed</Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  const renderSortFilterMenu = () => {
    if (!showSortFilterMenu) return null;

    const sortOptions = [
      { key: 'newest', label: 'Newest First', icon: 'arrow-down' },
      { key: 'oldest', label: 'Oldest First', icon: 'arrow-up' },
      { key: 'price-high', label: 'Price: High to Low', icon: 'cash' },
      { key: 'price-low', label: 'Price: Low to High', icon: 'cash-outline' },
      { key: 'status', label: 'By Status', icon: 'list' },
    ];

    const filterOptions = [
      { key: 'all', label: 'All Status', icon: 'grid' },
      { key: 'pending', label: 'Pending', icon: 'time' },
      { key: 'processing', label: 'Processing', icon: 'sync' },
      { key: 'shipped', label: 'Shipped', icon: 'car' },
      { key: 'completed', label: 'Completed', icon: 'checkmark-circle' },
      { key: 'cancelled', label: 'Cancelled', icon: 'close-circle' },
    ];

    return (
      <Modal
        transparent={true}
        visible={showSortFilterMenu}
        animationType="slide"
        onRequestClose={() => setShowSortFilterMenu(false)}
      >
        <View style={[styles.sortFilterOverlay, { backgroundColor: theme.modalOverlay }]}>
          <View style={[styles.sortFilterContainer, { backgroundColor: theme.modalBackground }]}>
            <View style={[styles.sortFilterHeader, { borderBottomColor: theme.border }]}>
              <Text style={[styles.sortFilterTitle, { color: theme.text }]}>Sort & Filter Orders</Text>
              <TouchableOpacity onPress={() => setShowSortFilterMenu(false)}>
                <Ionicons name="close" size={24} color={theme.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.sortFilterContent}>
              {/* Sort Options */}
              <View style={styles.sortFilterSection}>
                <Text style={[styles.sortFilterSectionTitle, { color: theme.text }]}>Sort By</Text>
                {sortOptions.map(option => (
                  <TouchableOpacity
                    key={option.key}
                    style={[
                      styles.sortFilterOption,
                      { backgroundColor: theme.surface, borderColor: theme.border },
                      sortOption === option.key && { borderColor: theme.primary, backgroundColor: theme.primaryLight + '20' }
                    ]}
                    onPress={() => {
                      setSortOption(option.key as SortOption);
                    }}
                  >
                    <View style={styles.sortFilterOptionContent}>
                      <Ionicons 
                        name={option.icon as any} 
                        size={20} 
                        color={sortOption === option.key ? theme.primary : theme.textSecondary} 
                      />
                      <Text style={[
                        styles.sortFilterOptionText, 
                        { color: sortOption === option.key ? theme.primary : theme.text }
                      ]}>
                        {option.label}
                      </Text>
                    </View>
                    {sortOption === option.key && (
                      <Ionicons name="checkmark" size={20} color={theme.primary} />
                    )}
                  </TouchableOpacity>
                ))}
              </View>

              {/* Filter Options */}
              <View style={styles.sortFilterSection}>
                <Text style={[styles.sortFilterSectionTitle, { color: theme.text }]}>Filter by Status</Text>
                <View style={styles.filterGrid}>
                  {filterOptions.map(option => (
                    <TouchableOpacity
                      key={option.key}
                      style={[
                        styles.filterChip,
                        { backgroundColor: theme.surface },
                        filterOption === option.key && { backgroundColor: getStatusColor(option.key, theme) }
                      ]}
                      onPress={() => setFilterOption(option.key as FilterOption)}
                    >
                      <Ionicons 
                        name={option.icon as any} 
                        size={16} 
                        color={filterOption === option.key ? '#fff' : theme.textSecondary} 
                      />
                      <Text style={[
                        styles.filterChipText,
                        { color: filterOption === option.key ? '#fff' : theme.text }
                      ]}>
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Calendar Filter Button */}
              <View style={styles.sortFilterSection}>
                <Text style={[styles.sortFilterSectionTitle, { color: theme.text }]}>Date Range</Text>
                <TouchableOpacity
                  style={[styles.calendarFilterButton, { backgroundColor: theme.surface, borderColor: theme.border }]}
                  onPress={() => {
                    setShowSortFilterMenu(false);
                    setShowCalendarFilter(true);
                  }}
                >
                  <Ionicons name="calendar" size={20} color={theme.primary} />
                  <View style={styles.calendarFilterButtonTextContainer}>
                    <Text style={[styles.calendarFilterButtonTitle, { color: theme.text }]}>
                      Select Date Range
                    </Text>
                    <Text style={[styles.calendarFilterButtonSubtitle, { color: theme.textTertiary }]}>
                      {calendarFilter ? formatCalendarFilterText() : 'Tap to select dates'}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={theme.textTertiary} />
                </TouchableOpacity>
              </View>

              {/* Action Buttons */}
              <View style={styles.sortFilterActions}>
                <TouchableOpacity
                  style={[styles.resetButton, { backgroundColor: theme.surface, borderColor: theme.border }]}
                  onPress={() => {
                    setSortOption('newest');
                    setFilterOption('all');
                    setCalendarFilter(null);
                  }}
                >
                  <Text style={[styles.resetButtonText, { color: theme.text }]}>Reset All</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.applyButton, { backgroundColor: theme.primary }]}
                  onPress={() => setShowSortFilterMenu(false)}
                >
                  <Text style={styles.applyButtonText}>Apply Filters</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  };

  const getActiveFilterCount = () => {
    let count = 0;
    if (sortOption !== 'newest') count++;
    if (filterOption !== 'all') count++;
    if (calendarFilter) count++;
    return count;
  };

  if (!isVisible) return null;

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={isVisible}
      onRequestClose={onClose}
    >
      <View style={[styles.ordersModalContainer, { backgroundColor: theme.modalOverlay }]}>
        <View style={[styles.ordersModalContent, { backgroundColor: theme.modalBackground }]}>
          <View style={[styles.ordersModalHeader, { borderBottomColor: theme.border }]}>
            <TouchableOpacity onPress={onClose} style={styles.ordersCloseButton}>
              <Ionicons name="close" size={28} color={theme.text} />
            </TouchableOpacity>
            <Text style={[styles.ordersModalTitle, { color: theme.text }]}>
              My Orders ({filteredOrders.length})
              {unreadNotificationCount > 0 && (
                <Text style={[styles.notificationCountBadge, { color: theme.primary }]}> • {unreadNotificationCount} new</Text>
              )}
            </Text>
            <TouchableOpacity 
              style={styles.sortFilterButton}
              onPress={() => setShowSortFilterMenu(true)}
            >
              <Ionicons name="options-outline" size={24} color={theme.text} />
              {getActiveFilterCount() > 0 && (
                <View style={[styles.filterBadge, { backgroundColor: theme.primary }]}>
                  <Text style={styles.filterBadgeText}>{getActiveFilterCount()}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          {/* Filter Summary */}
          {(filterOption !== 'all' || calendarFilter) && (
            <View style={[styles.filterSummary, { backgroundColor: theme.surface }]}>
              <View style={styles.filterSummaryContent}>
                <Ionicons name="filter" size={16} color={theme.textSecondary} />
                <Text style={[styles.filterSummaryText, { color: theme.text }]}>
                  {filterOption !== 'all' && `Status: ${filterOption.charAt(0).toUpperCase() + filterOption.slice(1)}`}
                  {filterOption !== 'all' && calendarFilter && ' • '}
                  {calendarFilter && `Date: ${formatCalendarFilterText()}`}
                </Text>
                <TouchableOpacity onPress={() => {
                  setFilterOption('all');
                  setCalendarFilter(null);
                }}>
                  <Text style={[styles.clearFiltersText, { color: theme.primary }]}>Clear</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {loading ? (
            <View style={styles.ordersLoadingContainer}>
              <ActivityIndicator size="large" color={theme.primary} />
              <Text style={[styles.ordersLoadingText, { color: theme.text }]}>Loading orders...</Text>
            </View>
          ) : filteredOrders.length === 0 ? (
            <View style={styles.ordersEmptyState}>
              <Ionicons name="receipt-outline" size={80} color={theme.border} />
              <Text style={[styles.ordersEmptyText, { color: theme.textTertiary }]}>
                {orders.length === 0 ? 'No orders yet' : 'No orders match your filters'}
              </Text>
              <Text style={[styles.ordersEmptySubtext, { color: theme.textTertiary }]}>
                {orders.length === 0 
                  ? 'Your orders will appear here when you purchase products from sellers'
                  : 'Try changing your filter or sorting options'}
              </Text>
              {orders.length > 0 && (
                <TouchableOpacity
                  style={[styles.clearFiltersButton, { backgroundColor: theme.primary }]}
                  onPress={() => {
                    setFilterOption('all');
                    setCalendarFilter(null);
                  }}
                >
                  <Text style={styles.clearFiltersButtonText}>Clear Filters</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[styles.ordersContinueButton, { backgroundColor: theme.primary }]}
                onPress={onClose}
              >
                <Text style={styles.ordersContinueButtonText}>Continue Shopping</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <FlatList
              data={filteredOrders}
              keyExtractor={(item) => item.id}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.ordersListContainer}
              renderItem={renderOrderItem}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                  colors={[theme.primary]}
                />
              }
            />
          )}
        </View>
        {renderSortFilterMenu()}
        <CalendarFilter
          isVisible={showCalendarFilter}
          onClose={() => setShowCalendarFilter(false)}
          onApplyFilter={(selection) => {
            setCalendarFilter(selection);
            setShowCalendarFilter(false);
          }}
          currentSelection={calendarFilter}
          theme={theme}
        />
      </View>
    </Modal>
  );
};

// === UTILITY FUNCTIONS ===
const getCurrentUserId = async () => {
  const { data } = await supabase.auth.getUser();
  return data?.user?.id ?? null;
};

const extractKeywords = (title: string): string[] => {
  const commonWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by']);
  return title
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 2 && !commonWords.has(word))
    .slice(0, 5);
};

const scoreAndSortProducts = (products: any[]): Product[] => {
  const scored = products.map(p => {
    let score = Math.random() * 1.5;
    if (p.original_price && p.original_price > p.price) {
      const discountRatio = (p.original_price - p.price) / p.original_price;
      score += discountRatio * 5;
    }
    return {
      ...p,
      score,
      hasDiscount: p.original_price && p.original_price > p.price,
      discountPercent: p.original_price && p.original_price > p.price
        ? Math.round(((p.original_price - p.price) / p.original_price) * 100)
        : null,
      isVideo: p.media_urls?.[0]?.toLowerCase().includes('.mp4'),
    } as Product;
  });
  scored.sort((a, b) => b.score - a.score);
  return scored;
};

// === CART MANAGER ===
const useCart = () => {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [cartVisible, setCartVisible] = useState(false);

  useEffect(() => {
    loadCart();
  }, []);

  const loadCart = async () => {
    try {
      const userId = await getCurrentUserId();
      if (!userId) {
        const savedCart = localStorage.getItem('cart');
        if (savedCart) {
          setCartItems(JSON.parse(savedCart));
        }
        return;
      }
      const { data, error } = await supabase
        .from('cart_items')
        .select('product_id, quantity, added_at, products(*)')
        .eq('user_id', userId);
      if (error) throw error;
      const items: CartItem[] = (data || []).map((item: any) => ({
        product: item.products,
        quantity: item.quantity,
        added_at: item.added_at,
      }));
      setCartItems(items);
    } catch (error) {
      console.error('Error loading cart:', error);
      const savedCart = localStorage.getItem('cart');
      if (savedCart) {
        setCartItems(JSON.parse(savedCart));
      }
    }
  };

  const saveCart = async (items: CartItem[]) => {
    try {
      localStorage.setItem('cart', JSON.stringify(items));
     
      const userId = await getCurrentUserId();
      if (userId) {
        await supabase.from('cart_items').delete().eq('user_id', userId);
       
        const cartItemsToInsert = items.map(item => ({
          user_id: userId,
          product_id: item.product.id,
          quantity: item.quantity,
          added_at: new Date().toISOString(),
        }));
        if (cartItemsToInsert.length > 0) {
          await supabase.from('cart_items').insert(cartItemsToInsert);
        }
      }
    } catch (error) {
      console.error('Error saving cart:', error);
    }
  };

  const addToCart = async (product: Product) => {
    const existingItemIndex = cartItems.findIndex(item => item.product.id === product.id);
    let newCartItems: CartItem[];
    
    // Prevent duplicate additions - throw error if product already exists
    if (existingItemIndex >= 0) {
      throw new Error('Product is already in cart');
    } else {
      newCartItems = [...cartItems, {
        product,
        quantity: 1,
        added_at: new Date().toISOString(),
      }];
    }
    
    setCartItems(newCartItems);
    await saveCart(newCartItems);
    return newCartItems;
  };

  const removeFromCart = async (productId: string) => {
    const newCartItems = cartItems.filter(item => item.product.id !== productId);
    setCartItems(newCartItems);
    await saveCart(newCartItems);
    return newCartItems;
  };

  const updateQuantity = async (productId: string, quantity: number) => {
    if (quantity < 1) {
      return removeFromCart(productId);
    }
    const newCartItems = cartItems.map(item =>
      item.product.id === productId ? { ...item, quantity } : item
    );
    setCartItems(newCartItems);
    await saveCart(newCartItems);
    return newCartItems;
  };

  const clearCart = async () => {
    setCartItems([]);
    await saveCart([]);
  };

  const getCartCount = () => {
    return cartItems.reduce((total, item) => total + item.quantity, 0);
  };

  const getCartTotal = () => {
    return cartItems.reduce((total, item) => total + (item.product.price * item.quantity), 0);
  };

  return {
    cartItems,
    cartVisible,
    setCartVisible,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    getCartCount,
    getCartTotal,
    loadCart,
  };
};

// === Helper function to send order notification to seller ===
const sendOrderNotificationToSeller = async (orderData: any) => {
  try {
    const { error } = await supabase
      .from('seller_notifications')
      .insert({
        seller_id: orderData.seller_id,
        order_id: orderData.order_id,
        type: 'new_order',
        title: 'New Order Received',
        message: `New order for ${orderData.product_name} from ${orderData.buyer_name}`,
        data: {
          product_name: orderData.product_name,
          product_price: orderData.product_price,
          product_image: orderData.product_image,
          quantity: orderData.quantity,
          total_amount: orderData.total_amount,
          buyer_name: orderData.buyer_name,
          buyer_phone: orderData.buyer_phone,
          delivery_option: orderData.delivery_option,
          location: orderData.location,
          timestamp: new Date().toISOString(),
        },
        is_read: false,
        created_at: new Date().toISOString(),
      });
    if (error) {
      console.warn('Notification insert error (non-critical):', error);
    }
  } catch (error) {
    console.warn('Error sending notification to seller (non-critical):', error);
  }
};

// === Helper function to send order notification to buyer ===
const sendOrderNotificationToBuyer = async (orderData: any) => {
  try {
    // Prevent duplicate notifications for the same order/user
    try {
      const { data: existing, error: fetchErr } = await supabase
        .from('buyer_notifications')
        .select('id')
        .eq('order_id', orderData.order_id)
        .eq('user_id', orderData.user_id)
        .eq('type', 'order_placed')
        .limit(1)
        .single();
      if (!fetchErr && existing) {
        // A notification for this order and user already exists — skip inserting duplicate
        return;
      }
    } catch (e) {
      // ignore lookup errors and continue to insert to avoid blocking order flow
      console.warn('Error checking existing buyer notification:', e);
    }

    const { error } = await supabase
      .from('buyer_notifications')
      .insert({
        user_id: orderData.user_id,
        order_id: orderData.order_id,
        type: 'order_placed',
        title: 'Order Placed Successfully',
        message: `Your order #${orderData.order_id.slice(-8)} has been placed successfully.`,
        data: {
          order_id: orderData.order_id,
          total_amount: orderData.total_amount,
          status: 'pending',
          timestamp: new Date().toISOString(),
        },
        is_read: false,
        created_at: new Date().toISOString(),
      });
    if (error) {
      console.warn('Buyer notification insert error:', error);
    }
  } catch (error) {
    console.warn('Error sending notification to buyer:', error);
  }
};

// === FULL IMAGE/VIDEO VIEWER ===
const FullImageViewer: React.FC<{
  isVisible: boolean;
  onClose: () => void;
  mediaUrls: string[];
  initialIndex: number;
  theme: any;
}> = ({ isVisible, onClose, mediaUrls, initialIndex, theme }) => {
  const [currentIndex, setCurrentIndex] = useState(Math.max(0, initialIndex || 0));
  const listRef = useRef<FlatList<any> | null>(null);
  const { width: winWidth, height: winHeight } = useWindowDimensions();

  useEffect(() => {
    if (isVisible && initialIndex >= 0 && initialIndex < mediaUrls.length) {
      setCurrentIndex(initialIndex);
      setTimeout(() => listRef.current?.scrollToIndex({ index: initialIndex, animated: false }), 50);
    }
  }, [isVisible, initialIndex, mediaUrls]);

  if (!isVisible || !mediaUrls?.length) return null;

  return (
    <Modal animationType="fade" transparent={true} visible={isVisible} onRequestClose={onClose}>
      <StatusBar hidden />
      <View style={[styles.fullViewerContainer, { backgroundColor: theme.background }]}>
        <TouchableOpacity style={styles.fullViewerCloseButton} onPress={onClose}>
          <Ionicons name="close" size={36} color="#fff" />
        </TouchableOpacity>
        <FlatList
          ref={listRef}
          data={mediaUrls}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          keyExtractor={(_, i) => i.toString()}
          getItemLayout={(_, i) => ({ length: screenWidth, offset: screenWidth * i, index: i })}
          onMomentumScrollEnd={(e) => setCurrentIndex(Math.round(e.nativeEvent.contentOffset.x / screenWidth))}
          renderItem={({ item: url, index }) => {
            const isVideo = url.toLowerCase().includes('.mp4');
            const containerMaxWidth = Math.min(winWidth * 0.9, 1000);
            const containerMaxHeight = Math.min(winHeight * 0.9, 1000);
            return (
              <View style={[styles.fullViewerMediaSlide, { backgroundColor: theme.background, justifyContent: 'center', alignItems: 'center' }]}>
                <View style={{ width: containerMaxWidth, height: containerMaxHeight, justifyContent: 'center', alignItems: 'center' }}>
                  {isVideo ? (
                    <Video
                      source={{ uri: url }}
                      style={{ width: '100%', height: '100%' }}
                      resizeMode={ResizeMode.CONTAIN}
                      isLooping
                      shouldPlay={currentIndex === index}
                      useNativeControls
                    />
                  ) : (
                    <Image source={{ uri: url }} style={{ width: '100%', height: '100%' }} resizeMode="contain" />
                  )}
                </View>
              </View>
            );
          }}
        />
        {mediaUrls.length > 1 && (
          <Text style={[styles.fullViewerPaginationText, { backgroundColor: theme.overlay }]}>
            {currentIndex + 1} / {mediaUrls.length}
          </Text>
        )}
      </View>
    </Modal>
  );
};
// === COMMENTS MODAL ===
const CommentsModal: React.FC<{ 
  isVisible: boolean; 
  onClose: () => void; 
  product: Product | null;
  showAlert: (title: string, message: string, buttons?: any[]) => void;
  theme: any;
}> = ({ isVisible, onClose, product, showAlert, theme }) => {
  const [comment, setComment] = useState('');
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const productId = product?.id;
  const channelRef = useRef<any>(null);

  const fetchComments = useCallback(async () => {
    if (!productId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('product_comments')
        .select(`id, comment_text, created_at, user_profiles (username, avatar_url)`)
        .eq('product_id', productId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      const formatted = (data || []).map((c: any) => ({
        id: c.id,
        text: c.comment_text,
        time: formatDistanceToNow(new Date(c.created_at), { addSuffix: true }),
        user: c.user_profiles?.username || 'Anonymous',
        avatarUrl: c.user_profiles?.avatar_url
          ? c.user_profiles.avatar_url.startsWith('http')
            ? c.user_profiles.avatar_url
            : `${SUPABASE_URL}/storage/v1/object/public/avatars/${c.user_profiles.avatar_url}`
          : `https://ui-avatars.com/api/?name=${encodeURIComponent(c.user_profiles?.full_name || 'User')}&background=FF9900&color=fff`,
      }));
      setComments(formatted);
    } catch (err) {
      console.error('Fetch comments error:', err);
    } finally {
      setLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    if (!isVisible || !productId) return;
    fetchComments();
    const channel = supabase
      .channel(`product-comments:${productId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'product_comments', filter: `product_id=eq.${productId}` }, async (payload: any) => {
        const newComment = payload.new;
        
        // Fetch user profile for the new comment
        const { data: profileData } = await supabase
          .from('user_profiles')
          .select('username, avatar_url')
          .eq('id', newComment.user_id)
          .maybeSingle();
        
        const profile = profileData || {};
        const formatted: Comment = {
          id: newComment.id,
          text: newComment.comment_text,
          time: 'just now',
          user: profile.username || 'Anonymous',
          avatarUrl: profile.avatar_url
            ? profile.avatar_url.startsWith('http')
              ? profile.avatar_url
              : `${SUPABASE_URL}/storage/v1/object/public/avatars/${profile.avatar_url}`
            : `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.username || 'User')}&background=FF9900&color=fff`,
        };
        setComments(prev => [formatted, ...prev]);
      })
      .subscribe();
    channelRef.current = channel;
    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current);
    };
  }, [isVisible, productId, fetchComments]);

  const handleSubmitComment = async () => {
    if (!comment.trim() || !productId || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const userId = await getCurrentUserId();
      if (!userId) throw new Error('Not logged in');
      const { error } = await supabase.from('product_comments').insert({ product_id: productId, user_id: userId, comment_text: comment.trim() });
      if (error) throw error;
      setComment('');
    } catch (err: any) {
      showAlert('Error', err.message || 'Failed to post comment');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal animationType="slide" transparent={true} visible={isVisible} onRequestClose={onClose}>
      <View style={[styles.commentsCenteredView, { backgroundColor: theme.modalOverlay }]}>
        <View style={[styles.commentsModalView, { backgroundColor: theme.modalBackground }]}>
          <View style={[styles.commentsHeader, { borderBottomColor: theme.border }]}>
            <Text style={[styles.commentsTitle, { color: theme.text }]}>Comments ({comments.length})</Text>
            <TouchableOpacity onPress={onClose}><Ionicons name="close" size={28} color={theme.text} /></TouchableOpacity>
          </View>
          {loading ? (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
              <ActivityIndicator size="large" color={theme.primary} />
            </View>
          ) : (
            <FlatList
              data={comments}
              keyExtractor={item => item.id.toString()}
              renderItem={({ item }) => (
                <View style={[styles.commentsCommentContainer, { borderBottomColor: theme.border }]}>
                  <Image source={{ uri: item.avatarUrl }} style={[styles.commentsCommentAvatar, { borderColor: theme.primary }]} />
                  <View style={styles.commentsCommentContent}>
                    <Text style={[styles.commentsCommentUser, { color: theme.text }]}>
                      {item.user}
                      <Text style={[styles.commentsCommentTime, { color: theme.textTertiary }]}> • {item.time}</Text>
                    </Text>
                    <Text style={[styles.commentsCommentText, { color: theme.textSecondary }]}>{item.text}</Text>
                  </View>
                </View>
              )}
              ListEmptyComponent={
                <Text style={[styles.commentsEmptyText, { color: theme.textTertiary }]}>
                  Be the first to comment!
                </Text>
              }
              contentContainerStyle={{ paddingBottom: 100 }}
            />
          )}
          <View style={[styles.commentsInputContainer, { borderTopColor: theme.border, backgroundColor: theme.modalBackground }]}>
            <TextInput 
              style={[styles.commentsInput, { 
                backgroundColor: theme.surface, 
                color: theme.text,
                borderColor: theme.border 
              }]} 
              placeholder="Add a comment..." 
              placeholderTextColor={theme.textTertiary} 
              value={comment} 
              onChangeText={setComment} 
              multiline 
              onSubmitEditing={handleSubmitComment} 
            />
            <TouchableOpacity 
              onPress={handleSubmitComment} 
              disabled={isSubmitting || !comment.trim()} 
              style={[
                styles.commentsSubmitButton, 
                { backgroundColor: theme.primary },
                (!comment.trim() || isSubmitting) && { opacity: 0.5 }
              ]}
            >
              {isSubmitting ? <ActivityIndicator size="small" color="#000" /> : <Ionicons name="send" size={22} color="#000" />}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

// === SIMILAR PRODUCTS SECTION (UPDATED WITH CATEGORY LOGIC) ===
const SimilarProductsSection: React.FC<{
  product: Product;
  onProductSelect: (product: Product) => void;
  onAddToCart: (product: Product) => Promise<void>;
  cartItems?: CartItem[];
  showAlert: (title: string, message: string, buttons?: any[]) => void;
  theme: any;
}> = ({ product, onProductSelect, onAddToCart, cartItems = [], showAlert, theme }) => {
  const [similarProducts, setSimilarProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSimilarProducts = useCallback(async () => {
    console.log('Fetching similar products for:', product.id, product.title);
    setLoading(true);
    setSimilarProducts([]);
    
    try {
      // First, fetch the current product to get its category
      const { data: currentProduct, error: productError } = await supabase
        .from('products')
        .select('category, title, description')
        .eq('id', product.id)
        .single();
      
      if (productError) {
        console.error('Error fetching current product:', productError);
        setLoading(false);
        return;
      }
      
      if (!currentProduct) {
        console.log('Current product not found');
        setLoading(false);
        return;
      }
      
      const currentCategory = currentProduct.category;
      const currentTitle = currentProduct.title;
      
      console.log('Current product category:', currentCategory);
      console.log('Current product title:', currentTitle);
      
      // Extract keywords from product title for similarity matching
      const keywords = extractKeywords(currentTitle);
      console.log('Extracted keywords:', keywords);
      
      if (!currentCategory && keywords.length === 0) {
        console.log('No category or keywords to find similar products');
        setLoading(false);
        return;
      }
      
      // Build the query conditions
      const conditions = [];
      
      // Condition 1: Same category
      if (currentCategory) {
        conditions.push(`category.eq.${currentCategory}`);
      }
      
      // Condition 2: Similar title (using keywords)
      if (keywords.length > 0) {
        const titleConditions = keywords.map(keyword => `title.ilike.%${keyword}%`);
        conditions.push(`or(${titleConditions.join(',')})`);
      }
      
      // If no conditions, return empty
      if (conditions.length === 0) {
        console.log('No conditions for similar products');
        setLoading(false);
        return;
      }
      
      // Build the filter string
      let filterString = '';
      if (conditions.length === 1) {
        filterString = conditions[0];
      } else {
        filterString = `or(${conditions.join(',')})`;
      }
      
      console.log('Filter string:', filterString);
      
      // Fetch similar products that match either same category OR similar title
      const { data: similarProductsData, error: similarError } = await supabase
        .from('products')
        .select('id, title, description, price, original_price, quantity, media_urls, seller_id, category, created_at')
        .neq('id', product.id) // Exclude current product
        .or(filterString)
        .limit(12) // Get more initially, we'll filter later
        .order('created_at', { ascending: false });
      
      if (similarError) {
        console.error('Error fetching similar products:', similarError);
        setLoading(false);
        return;
      }
      
      console.log('Raw similar products found:', similarProductsData?.length || 0);
      
      if (!similarProductsData || similarProductsData.length === 0) {
        console.log('No similar products found');
        setLoading(false);
        return;
      }
      
      // Filter out products that don't actually match our criteria
      const filteredSimilarProducts = similarProductsData.filter(productItem => {
        // Check if product is in the same category
        const sameCategory = currentCategory && productItem.category === currentCategory;
        
        // Check if product has similar title using keywords
        let similarTitle = false;
        if (keywords.length > 0) {
          const productTitleLower = productItem.title.toLowerCase();
          similarTitle = keywords.some(keyword => 
            productTitleLower.includes(keyword.toLowerCase())
          );
        }
        
        return sameCategory || similarTitle;
      });
      
      console.log('Filtered similar products:', filteredSimilarProducts.length);
      
      if (filteredSimilarProducts.length === 0) {
        console.log('No products match the similarity criteria');
        setLoading(false);
        return;
      }
      
      // Remove duplicates
      const uniqueProductsMap = new Map();
      filteredSimilarProducts.forEach(productItem => {
        if (!uniqueProductsMap.has(productItem.id)) {
          uniqueProductsMap.set(productItem.id, productItem);
        }
      });
      
      const uniqueProducts = Array.from(uniqueProductsMap.values());
      
      // Get seller info for all products
      const sellerIds = [...new Set(uniqueProducts.map(p => p.seller_id))];
      
      console.log('Fetching seller info for:', sellerIds.length, 'sellers');
      
      const [
        { data: shopsData },
        { data: profilesData }
      ] = await Promise.all([
        supabase.from('shops').select('owner_id, name, avatar_url').in('owner_id', sellerIds),
        supabase.from('user_profiles').select('id, full_name, avatar_url, university').in('id', sellerIds),
      ]);
      
      const shops = shopsData || [];
      const profiles = profilesData || [];
      
      // Enrich products with seller info and similarity score
      const enriched: (Product & { 
        isFromSameSeller?: boolean;
        similarityScore: number;
      })[] = uniqueProducts.map(productItem => {
        const shop = shops.find((s: any) => s.owner_id === productItem.seller_id);
        const profile = profiles.find((pr: any) => pr.id === productItem.seller_id);
       
        let avatarUrl;
        if (shop?.avatar_url) {
          avatarUrl = shop.avatar_url.startsWith('http')
            ? shop.avatar_url
            : `${SUPABASE_URL}/storage/v1/object/public/avatars/${shop.avatar_url}`;
        } else if (profile?.avatar_url) {
          avatarUrl = profile.avatar_url.startsWith('http')
            ? profile.avatar_url
            : `${SUPABASE_URL}/storage/v1/object/public/avatars/${profile.avatar_url}`;
        } else {
          avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(shop?.name || profile?.full_name || 'U')}&background=FF9900&color=fff&bold=true`;
        }
        
        // Check if product is from the same seller
        const isFromSameSeller = productItem.seller_id === product.seller_id;
        
        // Calculate similarity score
        let similarityScore = 0;
        
        // Same category gets highest priority
        if (currentCategory && productItem.category === currentCategory) {
          similarityScore += 2;
        }
        
        // Same seller gets medium priority
        if (isFromSameSeller) {
          similarityScore += 1.5;
        }
        
        // Title similarity gets points based on keyword matches
        if (keywords.length > 0) {
          const productTitleLower = productItem.title.toLowerCase();
          const keywordMatches = keywords.filter(keyword => 
            productTitleLower.includes(keyword.toLowerCase())
          ).length;
          similarityScore += (keywordMatches / keywords.length) * 1.0;
        }
        
        // Newer products get a small boost
        const daysOld = (Date.now() - new Date(productItem.created_at).getTime()) / (1000 * 60 * 60 * 24);
        similarityScore += Math.max(0, 1 - (daysOld / 30)) * 0.5; // Boost decreases over 30 days
        
        return {
          ...productItem,
          display_name: (shop as any)?.name || profile?.full_name || 'Seller',
          avatar_url: avatarUrl,
          university: profile?.university || 'Campus',
          hasDiscount: productItem.original_price && productItem.original_price > productItem.price,
          discountPercent: productItem.original_price && productItem.original_price > productItem.price
            ? Math.round(((productItem.original_price - productItem.price) / productItem.original_price) * 100)
            : null,
          isVideo: productItem.media_urls?.[0]?.toLowerCase().includes('.mp4'),
          commentCount: 0,
          likeCount: 0,
          shareCount: 0,
          followerCount: 0,
          isLiked: false,
          isFollowed: false,
          inCart: false,
          isFromSameSeller,
          similarityScore,
        };
      });
      
      // Sort by similarity score (highest first)
      enriched.sort((a, b) => b.similarityScore - a.similarityScore);
      
      // Take only top 8 most similar products
      const topProducts = enriched.slice(0, 8);
      
      console.log('Setting similar products:', topProducts.length);
      console.log('Similarity scores:', topProducts.map(p => ({
        title: p.title.substring(0, 30),
        category: p.category,
        sameSeller: p.isFromSameSeller,
        score: p.similarityScore.toFixed(2)
      })));
      
      setSimilarProducts(topProducts);
      
    } catch (err) {
      console.error('Error fetching similar products:', err);
      setSimilarProducts([]);
    } finally {
      setLoading(false);
    }
  }, [product.id, product.seller_id, product.title]);

  useEffect(() => {
    const fetchData = async () => {
      await fetchSimilarProducts();
    };
    
    fetchData();
  }, [product.id, fetchSimilarProducts]);

  const handleAddToCart = async (productItem: Product) => {
    try {
      await onAddToCart(productItem);
      showAlert('Success', 'Product added to cart!');
    } catch (error: any) {
      if (error.message === 'Product is already in cart') {
        showAlert('Already in Cart', 'This product is already in your cart. You can update the quantity from the cart.');
      } else {
        showAlert('Sorry', 'Product is already in cart');
      }
    }
  };

  // Don't show the section if loading and no products yet
  if (loading) {
    return (
      <View style={[styles.similarContainer, { borderTopColor: theme.border }]}>
        <Text style={[styles.similarTitle, { color: theme.text }]}>Similar Products</Text>
        <View style={styles.similarLoadingContainer}>
          <ActivityIndicator size="small" color={theme.primary} />
          <Text style={[styles.similarLoadingText, { color: theme.textSecondary }]}>
            Finding similar products...
          </Text>
        </View>
      </View>
    );
  }

  // Don't show the section if there are no similar products
  if (similarProducts.length === 0) {
    return null;
  }

  return (
    <View style={[styles.similarContainer, { borderTopColor: theme.border }]}>
      <Text style={[styles.similarTitle, { color: theme.text }]}> Similar products you might like </Text>
      <FlatList
        data={similarProducts}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.similarListContent}
        keyExtractor={item => `similar-${item.id}`}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.similarProductCard, { 
              backgroundColor: theme.surface, 
              borderColor: theme.border,
              borderLeftWidth: item.isFromSameSeller ? 3 : 0,
              borderLeftColor: item.isFromSameSeller ? theme.primary : 'transparent'
            }]}
            onPress={() => onProductSelect(item)}
          >
            {getCardDisplayMedia(item.media_urls) ? (
              <Image
                source={{ uri: getCardDisplayMedia(item.media_urls) }}
                style={styles.similarProductImage}
                resizeMode="cover"
              />
            ) : (
              <View style={[styles.similarProductImage, styles.similarProductPlaceholder, { backgroundColor: theme.card }]}>
                <Ionicons name="image-outline" size={30} color={theme.textTertiary} />
              </View>
            )}
            
            {item.isVideo && (
              <View style={styles.similarVideoIcon}>
                <Ionicons name="play" size={16} color="#fff" />
              </View>
            )}

            {item.isFromSameSeller && (
              <View style={[styles.sameSellerBadge, { backgroundColor: theme.primary }]}>
                <Text style={styles.sameSellerBadgeText}>Same seller</Text>
              </View>
            )}
            
            <View style={styles.similarProductInfo}>
              <Text style={[styles.similarProductTitle, { color: theme.text }]} numberOfLines={2}>
                {item.title}
              </Text>
              <View style={styles.similarPriceRow}>
                <Text style={[styles.similarPrice, { color: theme.primary }]}>
                  <Text style={[styles.similarCurrency, { color: theme.primary }]}>GHS</Text> {Number(item.price).toFixed(2)}
                </Text>
                {item.hasDiscount && (
                  <>
                    <Text style={[styles.similarOldPrice, { color: theme.textTertiary }]}>
                      GHS {Number(item.original_price).toFixed(2)}
                    </Text>
                    <View style={styles.similarDiscountBadge}>
                      <Text style={styles.similarDiscountText}>-{item.discountPercent}%</Text>
                    </View>
                  </>
                )}
              </View>
              <View style={styles.similarSellerRow}>
                <Image 
                  source={{ uri: item.avatar_url }} 
                  style={[styles.similarSellerAvatar, { 
                    borderColor: item.isFromSameSeller ? theme.primary : theme.border 
                  }]} 
                />
                <View style={styles.similarSellerInfo}>
                  <Text style={[styles.similarSellerName, { color: theme.textSecondary }]} numberOfLines={1}>
                    {item.display_name}
                  </Text>
                  
                </View>
              </View>
              <TouchableOpacity
                style={[styles.similarAddToCartButton, { 
                  backgroundColor: (() => {
                    const isInCart = cartItems.some(cartItem => cartItem.product.id === item.id);
                    return isInCart ? theme.textTertiary : theme.primary;
                  })()
                }]}
                onPress={(e) => {
                  e.stopPropagation();
                  const isInCart = cartItems.some(cartItem => cartItem.product.id === item.id);
                  if (!isInCart) {
                    handleAddToCart(item);
                  } else {
                    showAlert('Already in Cart', 'This product is already in your cart.');
                  }
                }}
                disabled={cartItems.some(cartItem => cartItem.product.id === item.id)}
              >
                <Ionicons 
                  name={cartItems.some(cartItem => cartItem.product.id === item.id) ? "checkmark-circle" : "cart-outline"} 
                  size={16} 
                  color="#fff" 
                />
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        )}
      />
    </View>
  );
};
// === ORDER FORM MODAL - UPDATED WITH COLOR-SPECIFIC MEDIA PREVIEW ===
const OrderFormModal: React.FC<{
  isVisible: boolean;
  onClose: () => void;
  product: Product | null;
  onSubmitOrder: (orderData: OrderFormData) => Promise<void>;
  isCartOrder?: boolean;
  cartTotal?: number;
  cartItems?: CartItem[];
  showAlert: (title: string, message: string, buttons?: any[]) => void;
  initialSelectedColor?: string | null;
  initialSelectedSize?: string | null;
  initialQuantity?: number | null;
  theme: any;
}> = ({ isVisible, onClose, product, onSubmitOrder, isCartOrder = false, cartTotal = 0, cartItems = [], showAlert, initialSelectedColor, initialSelectedSize, initialQuantity, theme }) => {
  const [orderData, setOrderData] = useState<OrderFormData>({
    fullName: '',
    phoneNumber: '',
    location: '',
    deliveryOption: 'delivery',
    additionalNotes: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [phoneError, setPhoneError] = useState('');
  const [selectedColor, setSelectedColor] = useState<string>('');
  const [selectedSize, setSelectedSize] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(1);
  const [fullProductData, setFullProductData] = useState<any>(null);
  const [loadingProductDetails, setLoadingProductDetails] = useState(false);
  const [availableStock, setAvailableStock] = useState<number>(0);
  const [colorSpecificMedia, setColorSpecificMedia] = useState<string[]>([]);
  const [currentPreviewImageIndex, setCurrentPreviewImageIndex] = useState(0);

  // Fetch complete product data including sizes, colors, and stock
  const fetchFullProductData = async (productId: string) => {
    try {
      setLoadingProductDetails(true);
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('id', productId)
        .single();
      
      if (error) throw error;
      setFullProductData(data);
      
      // Set initial selected color if colors available, prefer passed initial prop
      if (data?.colors_available?.length > 0) {
        const initialColor = (typeof initialSelectedColor !== 'undefined' && initialSelectedColor !== null)
          ? initialSelectedColor
          : data.colors_available[0];
        setSelectedColor(initialColor);
        // Load color-specific media for the initial color
        loadColorSpecificMedia(data, initialColor);
      } else if (initialSelectedColor) {
        setSelectedColor(initialSelectedColor);
      }
      
      // Set initial selected size if sizes available, prefer passed initial prop
      if (data?.sizes_available?.length > 0) {
        const initialSize = (typeof initialSelectedSize !== 'undefined' && initialSelectedSize !== null)
          ? initialSelectedSize
          : data.sizes_available[0];
        setSelectedSize(initialSize);
      } else if (initialSelectedSize) {
        setSelectedSize(initialSelectedSize);
      }

      // Set initial quantity if provided
      if (typeof initialQuantity !== 'undefined' && initialQuantity !== null) {
        setQuantity(initialQuantity);
      }
      
      // Calculate available stock
      calculateAvailableStock(data, data.colors_available?.[0], data.sizes_available?.[0]);
    } catch (error) {
      console.error('Error fetching product details:', error);
    } finally {
      setLoadingProductDetails(false);
    }
  };

  // Load color-specific media
  const loadColorSpecificMedia = (productData: any, color: string) => {
    if (!productData || !color) {
      // Fall back to general media
      const generalMedia = productData?.media_urls || product?.media_urls || [];
      const formattedMedia = generalMedia.map((url: string) => {
        if (url.startsWith('http')) {
          return url;
        } else {
          return `${SUPABASE_URL}/storage/v1/object/public/products/${url}`;
        }
      });
      setColorSpecificMedia(formattedMedia);
      return;
    }
    
    const colorMedia = productData.color_media || {};
    const mediaForColor = colorMedia[color];
    
    if (mediaForColor?.length > 0) {
      // Use color-specific media
      const formattedMedia = mediaForColor.map((url: string) => {
        if (url.startsWith('http')) {
          return url;
        } else {
          return `${SUPABASE_URL}/storage/v1/object/public/products/${url}`;
        }
      });
      // If the first media is a video, prefer an image thumbnail for preview
      const firstNonVideoIndex = formattedMedia.findIndex((u: string) => !isVideoUrl(u));
      if (firstNonVideoIndex > 0) {
        // move the first non-video to index 0 so the preview shows an image
        const reordered = [...formattedMedia];
        const [img] = reordered.splice(firstNonVideoIndex, 1);
        reordered.unshift(img);
        setColorSpecificMedia(reordered);
      } else {
        setColorSpecificMedia(formattedMedia);
      }
    } else {
      // Fall back to general media
      const generalMedia = productData.media_urls || product?.media_urls || [];
      const formattedMedia = generalMedia.map((url: string) => {
        if (url.startsWith('http')) {
          return url;
        } else {
          return `${SUPABASE_URL}/storage/v1/object/public/products/${url}`;
        }
      });
      // Prefer first non-video in preview
      const firstNonVideoIndex = formattedMedia.findIndex((u: string) => !isVideoUrl(u));
      if (firstNonVideoIndex > 0) {
        const reordered = [...formattedMedia];
        const [img] = reordered.splice(firstNonVideoIndex, 1);
        reordered.unshift(img);
        setColorSpecificMedia(reordered);
      } else {
        setColorSpecificMedia(formattedMedia);
      }
    }
    setCurrentPreviewImageIndex(0); // Reset to first image
  };

  // Calculate available stock based on selections
  const calculateAvailableStock = (productData: any, color: string = '', size: string = '') => {
    if (!productData) {
      setAvailableStock(0);
      return;
    }
    
    if (productData.category === 'Services') {
      setAvailableStock(0); // Services have unlimited stock
      return;
    }
    
    // Size-specific stock
    if (productData.sizes_available?.length > 0 && size) {
      const sizeStock = productData.size_stock || {};
      const qty = parseInt(sizeStock[size] || '0');
      setAvailableStock(qty);
      return;
    }
    
    // Color-specific stock
    if (productData.colors_available?.length > 0 && color) {
      const colorStock = productData.color_stock || {};
      const qty = parseInt(colorStock[color] || '0');
      setAvailableStock(qty);
      return;
    }
    
    // General stock
    setAvailableStock(productData.quantity || 0);
  };

  const validatePhoneNumber = (phone: string) => {
    const cleanPhone = phone.replace(/[\s-]/g, '');
   
    if (cleanPhone.startsWith('0')) {
      setPhoneError('Phone number cannot start with 0');
      return false;
    }
   
    if (!/^\d+$/.test(cleanPhone)) {
      setPhoneError('Phone number must contain only digits');
      return false;
    }
   
    if (cleanPhone.length !== 9) {
      setPhoneError('Phone number must be 9 digits (excluding country code)');
      return false;
    }
   
    setPhoneError('');
    return true;
  };

  const handlePhoneChange = (text: string) => {
    const cleanText = text.replace(/[^\d]/g, '');
    setOrderData(prev => ({ ...prev, phoneNumber: cleanText }));
   
    if (cleanText) {
      validatePhoneNumber(cleanText);
    } else {
      setPhoneError('');
    }
  };

  const handleQuantityChange = (change: number) => {
    const newQuantity = Math.max(1, quantity + change);
    
    // Check if quantity exceeds available stock
    if (fullProductData?.category !== 'Services' && newQuantity > availableStock) {
      showAlert('Insufficient Stock', `Only ${availableStock} units available`);
      return;
    }
    
    setQuantity(newQuantity);
  };

  const handleSizeChange = (size: string) => {
    setSelectedSize(size);
    calculateAvailableStock(fullProductData, selectedColor, size);
  };

  const handleColorChange = (color: string) => {
    setSelectedColor(color);
    loadColorSpecificMedia(fullProductData, color);
    calculateAvailableStock(fullProductData, color, selectedSize);
  };

  const handleSubmit = async () => {
    if (!orderData.fullName.trim()) {
      showAlert('Error', 'Please enter your full name');
      return;
    }
   
    if (!orderData.phoneNumber.trim()) {
      showAlert('Error', 'Please enter your phone number');
      return;
    }
   
    if (!validatePhoneNumber(orderData.phoneNumber)) {
      return;
    }
   
    if (!orderData.location.trim()) {
      showAlert('Error', 'Please enter your location');
      return;
    }
   
    if (!orderData.deliveryOption) {
      showAlert('Error', 'Please choose a delivery option');
      return;
    }
    
    // Validate product selections for single product order
    if (!isCartOrder && product) {
      // Check if color is selected when colors available
      if (fullProductData?.colors_available?.length > 0 && !selectedColor) {
        showAlert('Select Color', 'Please select a color before placing order.');
        return;
      }
      
      // Check if size is selected when sizes available
      if (fullProductData?.sizes_available?.length > 0 && !selectedSize) {
        showAlert('Select Size', 'Please select a size before placing order.');
        return;
      }
      
      // Check stock availability
      if (fullProductData?.category !== 'Services') {
        if (quantity > availableStock) {
          showAlert('Insufficient Stock', `Only ${availableStock} units available`);
          return;
        }
        if (availableStock <= 0) {
          showAlert('Out of Stock', 'This product is currently out of stock.');
          return;
        }
      }
    }
    
    // For cart orders, validate each item
    if (isCartOrder && cartItems.length > 0) {
      for (const item of cartItems) {
        if (item.quantity <= 0) {
          showAlert('Error', `Invalid quantity for ${item.product.title}`);
          return;
        }
      }
    }
    
    setSubmitting(true);
    
    try {
      // Add size, color, and quantity to order data
      const orderDataWithSelections = {
        ...orderData,
        selectedColor: isCartOrder ? null : selectedColor,
        selectedSize: isCartOrder ? null : selectedSize,
        quantity: isCartOrder ? null : quantity,
      };
      
      await onSubmitOrder(orderDataWithSelections);
      setOrderData({
        fullName: '',
        phoneNumber: '',
        location: '',
        deliveryOption: 'delivery',
        additionalNotes: '',
      });
      setPhoneError('');
      setSelectedColor('');
      setSelectedSize('');
      setQuantity(1);
      onClose();
    } catch (error: any) {
      console.log('Order submission caught error:', error);
    } finally {
      setSubmitting(false);
    }
  };

  // Get current preview image URL
  const getPreviewImageUrl = () => {
    if (colorSpecificMedia.length > 0) {
      return colorSpecificMedia[currentPreviewImageIndex];
    }
    // Fallback to product media
    if (product?.media_urls?.[0]) {
      const url = product.media_urls[0];
      if (url.startsWith('http')) {
        return url;
      } else {
        return `${SUPABASE_URL}/storage/v1/object/public/products/${url}`;
      }
    }
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(product?.title || 'Product')}&background=FF9900&color=fff`;
  };

  // Navigate through color-specific media
  const handleNextImage = () => {
    if (colorSpecificMedia.length > 1) {
      setCurrentPreviewImageIndex((prev) => (prev + 1) % colorSpecificMedia.length);
    }
  };

  const handlePrevImage = () => {
    if (colorSpecificMedia.length > 1) {
      setCurrentPreviewImageIndex((prev) => 
        prev === 0 ? colorSpecificMedia.length - 1 : prev - 1
      );
    }
  };

  useEffect(() => {
    if (isVisible && product && !isCartOrder) {
      fetchFullProductData(product.id);
      setQuantity(1);
      setCurrentPreviewImageIndex(0);
    }
    
    if (!isVisible) {
      setOrderData({
        fullName: '',
        phoneNumber: '',
        location: '',
        deliveryOption: 'delivery',
        additionalNotes: '',
      });
      setPhoneError('');
      setSubmitting(false);
      setSelectedColor('');
      setSelectedSize('');
      setQuantity(1);
      setFullProductData(null);
      setColorSpecificMedia([]);
      setCurrentPreviewImageIndex(0);
    }
  }, [isVisible, product, isCartOrder]);

  if (!isVisible) return null;

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={isVisible}
      onRequestClose={onClose}
    >
      <View style={[styles.orderFormOverlay, { backgroundColor: theme.modalOverlay }]}>
        <View style={[styles.orderFormContainer, { backgroundColor: theme.modalBackground }]}>
          <View style={[styles.orderFormHeader, { borderBottomColor: theme.border }]}>
            <TouchableOpacity onPress={onClose} style={styles.orderFormCloseButton}>
              <Ionicons name="close" size={24} color={theme.text} />
            </TouchableOpacity>
            <Text style={[styles.orderFormTitle, { color: theme.text }]}>
              {isCartOrder ? 'Place Order' : `Order: ${product?.title}`}
            </Text>
            <View style={{ width: 40 }} />
          </View>
          <ScrollView style={styles.orderFormContent} showsVerticalScrollIndicator={false}>
            
            {/* Product Selection Section (for single product orders) */}
            {!isCartOrder && product && (
              <View style={styles.orderFormSection}>
                <Text style={[styles.orderFormSectionTitle, { color: theme.primary }]}>Product Selection</Text>
                
                {/* Product Preview with Color-Specific Media */}
                <View style={[styles.productPreview, { backgroundColor: theme.surface }]}>
                  <View style={styles.productImageContainer}>
                    <Image
                      source={{ uri: getPreviewImageUrl() }}
                      style={styles.productPreviewImage}
                      resizeMode="cover"
                    />
                    
                    {/* Image Navigation Arrows (if multiple images) */}
                    {colorSpecificMedia.length > 1 && (
                      <>
                        <TouchableOpacity 
                          style={[styles.imageNavButton, styles.prevImageButton, { backgroundColor: theme.overlay }]} 
                          onPress={handlePrevImage}
                        >
                          <Ionicons name="chevron-back" size={24} color="#fff" />
                        </TouchableOpacity>
                        <TouchableOpacity 
                          style={[styles.imageNavButton, styles.nextImageButton, { backgroundColor: theme.overlay }]} 
                          onPress={handleNextImage}
                        >
                          <Ionicons name="chevron-forward" size={24} color="#fff" />
                        </TouchableOpacity>
                        
                        {/* Image Counter */}
                        <View style={[styles.imageCounter, { backgroundColor: theme.overlay }]}>
                          <Text style={styles.imageCounterText}>
                            {currentPreviewImageIndex + 1} / {colorSpecificMedia.length}
                          </Text>
                        </View>
                      </>
                    )}
                  </View>
                  <View style={styles.productPreviewInfo}>
                    <Text style={[styles.productPreviewTitle, { color: theme.text }]} numberOfLines={2}>
                      {product.title}
                    </Text>
                    <Text style={[styles.productPreviewPrice, { color: theme.primary }]}>
                      GHS {product.price.toFixed(2)}
                    </Text>
                    
                    {/* Color Indicator */}
                    {selectedColor && (
                      <View style={styles.colorIndicatorContainer}>
                        <Text style={[styles.colorIndicatorLabel, { color: theme.textSecondary }]}>
                          Selected Color:
                        </Text>
                        <View style={[styles.colorIndicatorChip, { backgroundColor: theme.primaryLight }]}>
                          <Text style={[styles.colorIndicatorText, { color: theme.text }]}>
                            {selectedColor}
                            {colorSpecificMedia.length > 0 && (
                              <Text style={{ fontSize: 12, color: theme.success }}> ✓</Text>
                            )}
                          </Text>
                        </View>
                        {colorSpecificMedia.length > 0 && (
                          <Text style={[styles.colorMediaCount, { color: theme.textTertiary }]}>
                            ({colorSpecificMedia.length} images available)
                          </Text>
                        )}
                      </View>
                    )}
                  </View>
                </View>
                
                {/* Size Selection */}
                {fullProductData?.sizes_available?.length > 0 && (
                  <View style={styles.selectionGroup}>
                    <Text style={[styles.selectionLabel, { color: theme.text }]}>Select Size</Text>
                    <View style={styles.selectionOptions}>
                      {fullProductData.sizes_available.map((size: string) => {
                        const hasSizeStockData = fullProductData.size_stock && typeof fullProductData.size_stock === 'object' && size in fullProductData.size_stock;
                        const sizeQty = hasSizeStockData ? fullProductData.size_stock[size as keyof typeof fullProductData.size_stock] : fullProductData.quantity || 0;
                        const isOutOfStock = parseInt(sizeQty as string | number) === 0;
                        const isSelected = selectedSize === size;
                        
                        return (
                          <TouchableOpacity
                            key={size}
                            style={[
                              styles.selectionOption,
                              { backgroundColor: theme.card, borderColor: theme.border },
                              isSelected && [styles.selectionOptionSelected, { borderColor: theme.primary }],
                              isOutOfStock && styles.selectionOptionDisabled
                            ]}
                            onPress={() => !isOutOfStock && handleSizeChange(size)}
                            disabled={isOutOfStock}
                          >
                            <Text style={[
                              styles.selectionOptionText,
                              { color: theme.text },
                              isSelected && [styles.selectionOptionTextSelected, { color: theme.primary }],
                              isOutOfStock && { color: theme.textTertiary }
                            ]}>
                              {size}
                            </Text>
                            {isOutOfStock && (
                              <Text style={[styles.stockLabelSmall, { color: theme.error }]}>
                                Out of stock
                              </Text>
                            )}
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                )}
                
                {/* Color Selection */}
                {fullProductData?.colors_available?.length > 0 && (
                  <View style={styles.selectionGroup}>
                    <Text style={[styles.selectionLabel, { color: theme.text }]}>Select Color</Text>
                    <View style={styles.selectionOptions}>
                      {fullProductData.colors_available.map((color: string) => {
                        const colorQty = fullProductData.color_stock?.[color] || 0;
                        const isOutOfStock = parseInt(colorQty) === 0;
                        const isSelected = selectedColor === color;
                        const hasColorMedia = fullProductData?.color_media?.[color]?.length > 0;
                        
                        return (
                          <TouchableOpacity
                            key={color}
                            style={[
                              styles.selectionOption,
                              { backgroundColor: theme.card, borderColor: theme.border },
                              isSelected && [styles.selectionOptionSelected, { borderColor: theme.primary }],
                              isOutOfStock && styles.selectionOptionDisabled
                            ]}
                            onPress={() => !isOutOfStock && handleColorChange(color)}
                            disabled={isOutOfStock}
                          >
                            <View style={styles.colorOptionContent}>
                              <Text style={[
                                styles.selectionOptionText,
                                { color: theme.text },
                                isSelected && [styles.selectionOptionTextSelected, { color: theme.primary }],
                                isOutOfStock && { color: theme.textTertiary }
                              ]}>
                                {color}
                              </Text>
                              {hasColorMedia && (
                                <Ionicons 
                                  name="images" 
                                  size={14} 
                                  color={isSelected ? theme.primary : theme.textSecondary} 
                                  style={styles.colorMediaIcon}
                                />
                              )}
                            </View>
                            {isOutOfStock && (
                              <Text style={[styles.stockLabelSmall, { color: theme.error }]}>
                                Out of stock
                              </Text>
                            )}
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                )}
                
                {/* Quantity Selection */}
                <View style={styles.selectionGroup}>
                  <Text style={[styles.selectionLabel, { color: theme.text }]}>Quantity</Text>
                  <View style={styles.quantitySelector}>
                    <TouchableOpacity
                      style={[styles.quantityButton, { backgroundColor: theme.surface, borderColor: theme.border }]}
                      onPress={() => handleQuantityChange(-1)}
                      disabled={quantity <= 1}
                    >
                      <Ionicons name="remove" size={20} color={theme.text} />
                    </TouchableOpacity>
                    
                    <View style={[styles.quantityDisplay, { backgroundColor: theme.surface }]}>
                      <Text style={[styles.quantityText, { color: theme.text }]}>{quantity}</Text>
                    </View>
                    
                    <TouchableOpacity
                      style={[styles.quantityButton, { backgroundColor: theme.surface, borderColor: theme.border }]}
                      onPress={() => handleQuantityChange(1)}
                      disabled={fullProductData?.category !== 'Services' && quantity >= availableStock}
                    >
                      <Ionicons name="add" size={20} color={theme.text} />
                    </TouchableOpacity>
                    
                    <Text style={[styles.stockText, { color: theme.textSecondary }]}>
                      {fullProductData?.category === 'Services' 
                        ? 'Service' 
                        : `${availableStock} available`}
                    </Text>
                  </View>
                </View>
                
                {/* Selected Options Summary */}
                {(selectedSize || selectedColor) && (
                  <View style={[styles.selectedOptionsSummary, { backgroundColor: theme.surface }]}>
                    <Text style={[styles.selectedOptionsTitle, { color: theme.text }]}>Selected Options:</Text>
                    <View style={styles.selectedOptionsRow}>
                      {selectedSize && (
                        <View style={[styles.selectedOptionChip, { backgroundColor: theme.primaryLight }]}>
                          <Text style={[styles.selectedOptionText, { color: theme.text }]}>Size: {selectedSize}</Text>
                        </View>
                      )}
                      {selectedColor && (
                        <View style={[styles.selectedOptionChip, { backgroundColor: theme.primaryLight }]}>
                          <Text style={[styles.selectedOptionText, { color: theme.text }]}>Color: {selectedColor}</Text>
                        </View>
                      )}
                      <View style={[styles.selectedOptionChip, { backgroundColor: theme.primaryLight }]}>
                        <Text style={[styles.selectedOptionText, { color: theme.text }]}>Qty: {quantity}</Text>
                      </View>
                    </View>
                  </View>
                )}
              </View>
            )}
            
            {/* For cart orders, show cart summary */}
            {isCartOrder && cartItems.length > 0 && (
              <View style={styles.orderFormSection}>
                <Text style={[styles.orderFormSectionTitle, { color: theme.primary }]}>Cart Summary</Text>
                <View style={[styles.cartSummary, { backgroundColor: theme.surface }]}>
                  {cartItems.map((item, index) => (
                    <View key={index} style={[styles.cartSummaryItem, { 
                      borderBottomColor: theme.border,
                      borderBottomWidth: index < cartItems.length - 1 ? 1 : 0 
                    }]}>
                      <View style={styles.cartSummaryItemInfo}>
                        <Text style={[styles.cartSummaryItemTitle, { color: theme.text }]} numberOfLines={1}>
                          {item.product.title}
                        </Text>
                        <Text style={[styles.cartSummaryItemQty, { color: theme.textSecondary }]}>
                          Qty: {item.quantity}
                        </Text>
                      </View>
                      <Text style={[styles.cartSummaryItemPrice, { color: theme.primary }]}>
                        GHS {(item.product.price * item.quantity).toFixed(2)}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
            
            {/* Contact Information Section */}
            <View style={styles.orderFormSection}>
              <Text style={[styles.orderFormSectionTitle, { color: theme.primary }]}>Contact Information</Text>
             
              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { color: theme.text }]}>Full Name *</Text>
                <TextInput
                  style={[styles.formInput, { 
                    backgroundColor: theme.surface, 
                    color: theme.text,
                    borderColor: theme.border 
                  }]}
                  placeholder="Enter your full name"
                  placeholderTextColor={theme.textTertiary}
                  value={orderData.fullName}
                  onChangeText={(text) => setOrderData(prev => ({ ...prev, fullName: text }))}
                />
              </View>
              
              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { color: theme.text }]}>Phone Number *</Text>
                <View style={styles.phoneInputContainer}>
                  <View style={[styles.countryCodeContainer, { 
                    backgroundColor: theme.surface, 
                    borderColor: theme.border 
                  }]}>
                    <Text style={[styles.countryCodeText, { color: theme.text }]}>+233</Text>
                  </View>
                  <TextInput
                    style={[styles.formInput, styles.phoneInput, { 
                      backgroundColor: theme.surface, 
                      color: theme.text,
                      borderColor: theme.border 
                    }]}
                    placeholder="Enter your phone number"
                    placeholderTextColor={theme.textTertiary}
                    keyboardType="phone-pad"
                    value={orderData.phoneNumber}
                    onChangeText={handlePhoneChange}
                    maxLength={9}
                  />
                </View>
                {phoneError ? <Text style={[styles.errorText, { color: theme.error }]}>{phoneError}</Text> : null}
                <Text style={[styles.helperText, { color: theme.textTertiary }]}>
                  Enter 9-digit number (without leading 0).
                </Text>
              </View>
              
              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { color: theme.text }]}>Location *</Text>
                <TextInput
                  style={[styles.formInput, { 
                    backgroundColor: theme.surface, 
                    color: theme.text,
                    borderColor: theme.border 
                  }]}
                  placeholder="Enter your delivery location"
                  placeholderTextColor={theme.textTertiary}
                  value={orderData.location}
                  onChangeText={(text) => setOrderData(prev => ({ ...prev, location: text }))}
                />
              </View>
            </View>
            
            {/* Delivery Options Section */}
            <View style={styles.orderFormSection}>
              <Text style={[styles.orderFormSectionTitle, { color: theme.primary }]}>Delivery Options</Text>
             
              <TouchableOpacity
                style={[
                  styles.deliveryOption,
                  { backgroundColor: theme.surface, borderColor: theme.border },
                  orderData.deliveryOption === 'delivery' && [styles.deliveryOptionSelected, { borderColor: theme.primary }]
                ]}
                onPress={() => setOrderData(prev => ({ ...prev, deliveryOption: 'delivery' }))}
              >
                <View style={[styles.deliveryOptionRadio, { borderColor: theme.primary }]}>
                  {orderData.deliveryOption === 'delivery' && (
                    <View style={[styles.deliveryOptionRadioSelected, { backgroundColor: theme.primary }]} />
                  )}
                </View>
                <View style={styles.deliveryOptionContent}>
                  <Ionicons name="car" size={24} color={theme.primary} />
                  <View style={styles.deliveryOptionText}>
                    <Text style={[styles.deliveryOptionTitle, { color: theme.text }]}>Campus Delivery</Text>
                    <Text style={[styles.deliveryOptionDescription, { color: theme.textSecondary }]}>
                      Product will be delivered to your location
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.deliveryOption,
                  { backgroundColor: theme.surface, borderColor: theme.border },
                  orderData.deliveryOption === 'pickup' && [styles.deliveryOptionSelected, { borderColor: theme.primary }]
                ]}
                onPress={() => setOrderData(prev => ({ ...prev, deliveryOption: 'pickup' }))}
              >
                <View style={[styles.deliveryOptionRadio, { borderColor: theme.primary }]}>
                  {orderData.deliveryOption === 'pickup' && (
                    <View style={[styles.deliveryOptionRadioSelected, { backgroundColor: theme.primary }]} />
                  )}
                </View>
                <View style={styles.deliveryOptionContent}>
                  <Ionicons name="storefront" size={24} color={theme.primary} />
                  <View style={styles.deliveryOptionText}>
                    <Text style={[styles.deliveryOptionTitle, { color: theme.text }]}>Meetup/Pickup</Text>
                    <Text style={[styles.deliveryOptionDescription, { color: theme.textSecondary }]}>
                      Pick up product from seller's location
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            </View>
            
            {/* Additional Notes Section */}
            <View style={styles.orderFormSection}>
              <Text style={[styles.orderFormSectionTitle, { color: theme.primary }]}>Additional Notes (Optional)</Text>
              <TextInput
                style={[styles.formInput, styles.textArea, { 
                  backgroundColor: theme.surface, 
                  color: theme.text,
                  borderColor: theme.border 
                }]}
                placeholder="Any special instructions or notes for the seller..."
                placeholderTextColor={theme.textTertiary}
                value={orderData.additionalNotes}
                onChangeText={(text) => setOrderData(prev => ({ ...prev, additionalNotes: text }))}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>
            
            {/* Order Total Section */}
            {isCartOrder && (
              <View style={[styles.orderTotalSection, { backgroundColor: theme.surface }]}>
                <Text style={[styles.orderTotalText, { color: theme.primary }]}>
                  Total Amount: GHS {cartTotal.toFixed(2)}
                </Text>
              </View>
            )}
            
            {!isCartOrder && product && (
              <View style={[styles.orderTotalSection, { backgroundColor: theme.surface }]}>
                <Text style={[styles.orderTotalText, { color: theme.primary }]}>
                  Subtotal: GHS {(product.price * quantity).toFixed(2)}
                </Text>
                <Text style={[styles.orderSummaryText, { color: theme.textSecondary }]}>
                  {quantity} × GHS {product.price.toFixed(2)} each
                </Text>
              </View>
            )}
          </ScrollView>
          
          {/* Footer with Submit Button */}
          <View style={[styles.orderFormFooter, { borderTopColor: theme.border }]}>
            <TouchableOpacity
              style={[styles.submitOrderButton, { backgroundColor: theme.primary }, submitting && styles.submitOrderButtonDisabled]}
              onPress={handleSubmit}
              disabled={submitting}
            >
              {submitting ? (
                <View style={styles.submitOrderLoading}>
                  <ActivityIndicator size="small" color="#fff" />
                  <Text style={styles.submitOrderButtonText}>Processing...</Text>
                </View>
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={22} color="#fff" />
                  <Text style={styles.submitOrderButtonText}>
                    {isCartOrder ? 'Place Order' : 'Confirm Order'}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};
// === CART MODAL ===
const CartModal: React.FC<{
  isVisible: boolean;
  onClose: () => void;
  cartItems: CartItem[];
  onUpdateQuantity: (productId: string, quantity: number) => Promise<void>;
  onRemoveItem: (productId: string) => Promise<void>;
  onClearCart: () => Promise<void>;
  onViewProduct: (product: Product, fromCart: boolean) => void;
  onPlaceOrder: () => void;
  showAlert: (title: string, message: string, buttons?: any[]) => void;
  theme: any;
}> = ({ isVisible, onClose, cartItems, onUpdateQuantity, onRemoveItem, onClearCart, onViewProduct, onPlaceOrder, showAlert, theme }) => {
  const [updating, setUpdating] = useState<string | null>(null);

  const handleUpdateQuantity = async (productId: string, quantity: number) => {
    setUpdating(productId);
    try {
      await onUpdateQuantity(productId, quantity);
    } finally {
      setUpdating(null);
    }
  };

  const getTotal = () => {
    return cartItems.reduce((total, item) => total + (item.product.price * item.quantity), 0);
  };

  const handleViewProduct = (product: Product) => {
    onClose();
    setTimeout(() => {
      const enhancedProduct = {
        ...product,
        display_name: product.display_name || 'Seller',
        avatar_url: product.avatar_url || 
          `https://ui-avatars.com/api/?name=${encodeURIComponent(product.title || 'Product')}&background=FF9900&color=fff`,
        university: product.university || 'Campus',
      };
      onViewProduct(enhancedProduct, true);
    }, 50);
  };

  const handleClearCart = async () => {
    showAlert(
      'Clear Cart',
      'Are you sure you want to clear your entire cart?',
      [
        { text: 'Cancel', style: 'cancel', onPress: () => {} },
        { 
          text: 'Clear All', 
          style: 'destructive',
          onPress: async () => {
            await onClearCart();
            showAlert('Cart Cleared', 'Your cart has been cleared');
          }
        }
      ]
    );
  };

  if (!isVisible) return null;

  return (
    <Modal animationType="slide" transparent={true} visible={isVisible} onRequestClose={onClose}>
      <View style={[styles.cartOverlay, { backgroundColor: theme.modalOverlay }]}>
        <View style={[styles.cartModal, { backgroundColor: theme.modalBackground }]}>
          <View style={[styles.cartHeader, { borderBottomColor: theme.border }]}>
            <TouchableOpacity onPress={onClose} style={styles.cartCloseButton}>
              <Ionicons name="close" size={28} color={theme.text} />
            </TouchableOpacity>
            <Text style={[styles.cartTitle, { color: theme.text }]}>Your Cart ({cartItems.length})</Text>
            {cartItems.length > 0 && (
              <TouchableOpacity onPress={handleClearCart} style={styles.cartClearButton}>
                <Text style={[styles.cartClearText, { color: theme.error }]}>Clear All</Text>
              </TouchableOpacity>
            )}
          </View>
          {cartItems.length === 0 ? (
            <View style={styles.cartEmptyContainer}>
              <Ionicons name="cart-outline" size={80} color={theme.textTertiary} />
              <Text style={[styles.cartEmptyTitle, { color: theme.text }]}>Your cart is empty</Text>
              <Text style={[styles.cartEmptyText, { color: theme.textSecondary }]}>Add some products to get started</Text>
              <TouchableOpacity 
                style={[styles.cartContinueButton, { backgroundColor: theme.primary }]} 
                onPress={onClose}
              >
                <Text style={styles.cartContinueButtonText}>Continue Shopping</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <FlatList
                data={cartItems}
                keyExtractor={item => item.product.id}
                contentContainerStyle={styles.cartListContent}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[styles.cartItem, { backgroundColor: theme.surface }]}
                    onPress={() => handleViewProduct(item.product)}
                    activeOpacity={0.7}
                  >
                    <Image source={{ uri: getCardDisplayUrl(item.product.media_urls) }} style={styles.cartItemImage} />
                    <View style={styles.cartItemInfo}>
                      <Text style={[styles.cartItemTitle, { color: theme.text }]} numberOfLines={2}>{item.product.title}</Text>
                      <Text style={[styles.cartItemSeller, { color: theme.textSecondary }]}>{item.product.display_name || 'Seller'}</Text>
                      <Text style={[styles.cartItemPrice, { color: theme.primary }]}>GHS {item.product.price.toFixed(2)}</Text>
                     
                      <View style={styles.cartQuantityContainer}>
                        <TouchableOpacity
                          style={[styles.cartQuantityButton, { backgroundColor: theme.card }]}
                          onPress={(e) => {
                            e.stopPropagation();
                            handleUpdateQuantity(item.product.id, item.quantity - 1);
                          }}
                          disabled={updating === item.product.id}
                        >
                          <Ionicons name="remove" size={18} color={theme.text} />
                        </TouchableOpacity>
                       
                        <View style={styles.cartQuantityDisplay}>
                          {updating === item.product.id ? (
                            <ActivityIndicator size="small" color={theme.primary} />
                          ) : (
                            <Text style={[styles.cartQuantityText, { color: theme.text }]}>{item.quantity}</Text>
                          )}
                        </View>
                       
                        <TouchableOpacity
                          style={[styles.cartQuantityButton, { backgroundColor: theme.card }]}
                          onPress={(e) => {
                            e.stopPropagation();
                            handleUpdateQuantity(item.product.id, item.quantity + 1);
                          }}
                          disabled={updating === item.product.id}
                        >
                          <Ionicons name="add" size={18} color={theme.text} />
                        </TouchableOpacity>
                       
                        <TouchableOpacity
                          style={styles.cartRemoveButton}
                          onPress={(e) => {
                            e.stopPropagation();
                            onRemoveItem(item.product.id);
                          }}
                        >
                          <Ionicons name="trash-outline" size={18} color={theme.error} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </TouchableOpacity>
                )}
              />
             
              <View style={[styles.cartFooter, { borderTopColor: theme.border }]}>
                <View style={styles.cartTotalRow}>
                  <Text style={[styles.cartTotalLabel, { color: theme.text }]}>Total:</Text>
                  <Text style={[styles.cartTotalAmount, { color: theme.primary }]}>GHS {getTotal().toFixed(2)}</Text>
                </View>
                <TouchableOpacity 
                  style={[styles.cartPlaceOrderButton, { backgroundColor: '#FF4081' }]} 
                  onPress={onPlaceOrder}
                >
                  <Ionicons name="bag-check" size={20} color="#fff" />
                  <Text style={styles.cartPlaceOrderButtonText}>Place Order</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
};

// === PRODUCT MEDIA VIEW ===
const ProductMediaView = ({ urls, onPressMedia, theme }: { 
  urls: string[]; 
  onPressMedia: (i: number) => void;
  theme: any;
}) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const { width } = useWindowDimensions();
  
  // Calculate media dimensions based on screen size
  const isLargeScreen = width >= 768; // Tablet/Desktop breakpoint
  const mediaWidth = isLargeScreen ? Math.min(width * 0.6, 600) : width; // Limit max width on large screens
  const mediaHeight = isLargeScreen ? mediaWidth * 0.7 : mediaWidth * 0.55; // Adjust aspect ratio for large screens
  
  if (!urls?.length) return null;
  
  return (
    <View style={styles.modalMediaContainer}>
      <FlatList
        data={urls}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={(e) => setActiveIndex(Math.round(e.nativeEvent.contentOffset.x / mediaWidth))}
        scrollEventThrottle={16}
        keyExtractor={(_, i) => i.toString()}
        renderItem={({ item: url, index }) => (
          <TouchableOpacity 
            style={{ 
              width: mediaWidth, 
              height: mediaHeight, 
              backgroundColor: theme.background,
              alignSelf: 'center' // Center the media on large screens
            }} 
            activeOpacity={0.9} 
            onPress={() => onPressMedia(index)}
          >
            {url.toLowerCase().includes('.mp4') ? (
              <Video
                source={{ uri: url }}
                style={{ width: '100%', height: '100%' }}
                resizeMode={ResizeMode.CONTAIN}
                usePoster
                posterSource={{ uri: url }}
                posterStyle={{ width: '100%', height: '100%' }}
                shouldPlay={false}
              />
            ) : (
              <Image 
                source={{ uri: url }} 
                style={{ width: '100%', height: '100%' }} 
                resizeMode="contain" 
              />
            )}
          </TouchableOpacity>
        )}
      />
      {urls.length > 1 && (
        <View style={styles.modalPaginationDots}>
          {urls.map((_, i) => (
            <View 
              key={i} 
              style={[
                styles.modalDot, 
                i === activeIndex 
                  ? [styles.modalActiveDot, { backgroundColor: theme.primary }] 
                  : [styles.modalInactiveDot, { backgroundColor: theme.textTertiary }]
              ]} 
            />
          ))}
        </View>
      )}
    </View>
  );
};

// === PRODUCT DETAIL MODAL (UPDATED WITH SIZE, COLOR, AND STOCK INFO) ===
const ProductDetailModal: React.FC<{
  isVisible: boolean;
  onClose: () => void;
  product: Product | null;
  onOpenFullViewer: (index: number) => void;
  onSelectSimilarProduct: (product: Product) => void;
  onAddToCart: (product: Product) => Promise<void>;
  isInCart: () => boolean;
  cartItems?: CartItem[];
  onPlaceOrder: (product: Product, options?: { selectedColor?: string | null; selectedSize?: string | null; quantity?: number | null }) => void;
  fromCart?: boolean;
  fromSellerProfile?: boolean;
  showAlert: (title: string, message: string, buttons?: any[]) => void;
  theme: any;
}> = ({ isVisible, onClose, product, onOpenFullViewer, onSelectSimilarProduct, onAddToCart, isInCart, cartItems = [], onPlaceOrder, fromCart = false, fromSellerProfile = false, showAlert, theme }) => {
  const [addingToCart, setAddingToCart] = useState(false);
  const [productWithSeller, setProductWithSeller] = useState<Product | null>(null);
  const [loadingSeller, setLoadingSeller] = useState(false);
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0);
  const [selectedColor, setSelectedColor] = useState<string>('');
  const [selectedSize, setSelectedSize] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(1);
  const [fullProductData, setFullProductData] = useState<any>(null);
  const [loadingProductDetails, setLoadingProductDetails] = useState(false);
  const [colorSpecificMedia, setColorSpecificMedia] = useState<string[]>([]);
  const { width } = useWindowDimensions();
    // Update colorSpecificMedia when selectedColor or fullProductData changes
    useEffect(() => {
      if (!fullProductData) {
        setColorSpecificMedia([]);
        return;
      }
      if (selectedColor && fullProductData.color_media && fullProductData.color_media[selectedColor]?.length > 0) {
        const formatted = fullProductData.color_media[selectedColor].map((url: string) =>
          url.startsWith('http') ? url : `${SUPABASE_URL}/storage/v1/object/public/products/${url}`
        );
        setColorSpecificMedia(formatted);
      } else if (fullProductData.media_urls) {
        const formatted = fullProductData.media_urls.map((url: string) =>
          url.startsWith('http') ? url : `${SUPABASE_URL}/storage/v1/object/public/products/${url}`
        );
        setColorSpecificMedia(formatted);
      } else {
        setColorSpecificMedia([]);
      }
    }, [selectedColor, fullProductData]);
  
  // Calculate media dimensions based on screen size
  const isLargeScreen = width >= 768;
  const mediaWidth = isLargeScreen ? Math.min(width * 0.6, 600) : width;
  const mediaHeight = isLargeScreen ? mediaWidth * 0.7 : mediaWidth * 0.55;

  // Fetch complete product data including sizes, colors, and stock
  const fetchFullProductData = async (productId: string) => {
    try {
      setLoadingProductDetails(true);
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('id', productId)
        .single();
      
      if (error) throw error;
      setFullProductData(data);
      
      // Set initial selected color if colors available
      if (data?.colors_available?.length > 0) {
        setSelectedColor(data.colors_available[0]);
        // Navigate to color-specific media if available
        navigateToColorMedia(data.colors_available[0], data);
      }
    } catch (error) {
      console.error('Error fetching product details:', error);
    } finally {
      setLoadingProductDetails(false);
    }
  };

  // Navigate to color-specific media
  const navigateToColorMedia = (color: string, productData: any) => {
    const colorMedia = productData?.color_media || {};
    const mediaForColor = colorMedia[color];
    
    if (mediaForColor?.length > 0 && product?.media_urls) {
      // Find first media index for this color
      const firstColorMediaIndex = product.media_urls.findIndex(
        (url: string) => mediaForColor.includes(url)
      );
      if (firstColorMediaIndex !== -1) {
        setCurrentMediaIndex(firstColorMediaIndex);
      }
    }
  };

  useEffect(() => {
    const fetchSellerInfo = async () => {
      if (!product) return;
      
      if (!product.display_name || !product.avatar_url || !product.university) {
        setLoadingSeller(true);
        try {
          const { data: shopData } = await supabase
            .from('shops')
            .select('name, avatar_url')
            .eq('owner_id', product.seller_id)
            .single();

          const { data: profileData } = await supabase
            .from('user_profiles')
            .select('full_name, avatar_url, university')
            .eq('id', product.seller_id)
            .single();

          const updatedProduct = {
            ...product,
            display_name: shopData?.name || profileData?.full_name || 'Seller',
            avatar_url: shopData?.avatar_url || profileData?.avatar_url || 
              `https://ui-avatars.com/api/?name=${encodeURIComponent(shopData?.name || profileData?.full_name || 'Seller')}&background=FF9900&color=fff`,
            university: profileData?.university || 'Campus',
          };
          
          setProductWithSeller(updatedProduct);
        } catch (error) {
          console.error('Error fetching seller info:', error);
          setProductWithSeller({
            ...product,
            display_name: product.display_name || 'Seller',
            avatar_url: product.avatar_url || 
              `https://ui-avatars.com/api/?name=${encodeURIComponent(product.title || 'Product')}&background=FF9900&color=fff`,
            university: product.university || 'Campus',
          });
        } finally {
          setLoadingSeller(false);
        }
      } else {
        setProductWithSeller(product);
      }
    };

    if (isVisible && product) {
      fetchSellerInfo();
      fetchFullProductData(product.id);
      setCurrentMediaIndex(0);
      setSelectedColor('');
      setSelectedSize('');
    }
  }, [isVisible, product]);

  const handleAddToCart = async () => {
    if (!product) return;
    
    // Check if product is out of stock
    const isOutOfStock = checkIfOutOfStock();
    if (isOutOfStock) {
      showAlert('Out of Stock', 'This product is currently out of stock.');
      return;
    }
    
    // Check if color is selected when colors available
    if (fullProductData?.colors_available?.length > 0 && !selectedColor) {
      showAlert('Select Color', 'Please select a color before adding to cart.');
      return;
    }
    
    // Check if size is selected when sizes available
    if (fullProductData?.sizes_available?.length > 0 && !selectedSize) {
      showAlert('Select Size', 'Please select a size before adding to cart.');
      return;
    }
    
    setAddingToCart(true);
    try {
      await onAddToCart(product);
      showAlert('Success', 'Product added to cart!');
    } catch (error: any) {
      if (error.message === 'Product is already in cart') {
        showAlert('Already in Cart', 'This product is already in your cart. You can update the quantity from the cart.');
      } else {
        showAlert('Sorry', 'Product is already in cart');
      }
    } finally {
      setAddingToCart(false);
    }
  };

  const handlePlaceOrder = () => {
    if (!product) return;
    
    // Check if product is out of stock
    const isOutOfStock = checkIfOutOfStock();
    if (isOutOfStock) {
      showAlert('Out of Stock', 'This product is currently out of stock.');
      return;
    }
    
    // Check if color is selected when colors available
    if (fullProductData?.colors_available?.length > 0 && !selectedColor) {
      showAlert('Select Color', 'Please select a color before placing order.');
      return;
    }
    
    // Check if size is selected when sizes available
    if (fullProductData?.sizes_available?.length > 0 && !selectedSize) {
      showAlert('Select Size', 'Please select a size before placing order.');
      return;
    }
    
    onPlaceOrder(product, { selectedColor: selectedColor || null, selectedSize: selectedSize || null, quantity });
  };

  // Check if product is out of stock
  const checkIfOutOfStock = () => {
    if (!fullProductData) return false;
    
    // Check for services (no stock)
    if (fullProductData.category === 'Services') return false;
    
    // Check size-specific stock
    if (fullProductData.sizes_available?.length > 0) {
      const sizeStock = fullProductData.size_stock || {};
      if (selectedSize) {
        const qty = parseInt(sizeStock[selectedSize] || '0');
        return qty <= 0;
      }
      // Check if any size has stock
      return !Object.values(sizeStock).some(qty => parseInt(qty as string) > 0);
    }
    
    // Check color-specific stock
    if (fullProductData.colors_available?.length > 0) {
      const colorStock = fullProductData.color_stock || {};
      if (selectedColor) {
        const qty = parseInt(colorStock[selectedColor] || '0');
        return qty <= 0;
      }
      // Check if any color has stock
      return !Object.values(colorStock).some(qty => parseInt(qty as string) > 0);
    }
    
    // Check general stock
    const generalStock = fullProductData.quantity || 0;
    return generalStock <= 0;
  };

  // Get available stock for selected options
  const getAvailableStock = () => {
    if (!fullProductData) return 0;
    
    if (fullProductData.category === 'Services') return 0;
    
    // Size-specific stock
    if (fullProductData.sizes_available?.length > 0 && selectedSize) {
      const sizeStock = fullProductData.size_stock || {};
      return parseInt(sizeStock[selectedSize] || '0');
    }
    
    // Color-specific stock
    if (fullProductData.colors_available?.length > 0 && selectedColor) {
      const colorStock = fullProductData.color_stock || {};
      return parseInt(colorStock[selectedColor] || '0');
    }
    
    // General stock
    return fullProductData.quantity || 0;
  };

  // Get total available stock
  const getTotalStock = () => {
    if (!fullProductData) return 0;
    
    if (fullProductData.category === 'Services') return 0;
    
    // Sum of size-specific stock
    if (fullProductData.sizes_available?.length > 0) {
      const sizeStock = fullProductData.size_stock || {};
      return Object.values(sizeStock).reduce((sum: number, qty: any) => sum + (parseInt(qty) || 0), 0);
    }
    
    // Sum of color-specific stock
    if (fullProductData.colors_available?.length > 0) {
      const colorStock = fullProductData.color_stock || {};
      return Object.values(colorStock).reduce((sum: number, qty: any) => sum + (parseInt(qty) || 0), 0);
    }
    
    // General stock
    return fullProductData.quantity || 0;
  };

  const displayProduct = productWithSeller || product;
  const isService = fullProductData?.category === 'Services';
  const hasSizes = fullProductData?.sizes_available?.length > 0;
  const hasColors = fullProductData?.colors_available?.length > 0;
  const totalStock = getTotalStock();
  const availableStock = getAvailableStock();
  const isOutOfStock = checkIfOutOfStock();
  const colorMedia = fullProductData?.color_media || {};

  if (!displayProduct) return null;

  return (
    <Modal animationType="slide" transparent={true} visible={isVisible} onRequestClose={onClose}>
      <View style={[styles.modalCenteredView, { backgroundColor: theme.modalOverlay }]}>
        <View style={[
          styles.modalModalView, 
          { 
            backgroundColor: theme.modalBackground,
            // Adjust modal width on large screens
            width: isLargeScreen ? Math.min(width * 0.8, 800) : '100%',
            alignSelf: 'center',
            marginHorizontal: isLargeScreen ? 'auto' : 0
          }
        ]}>
          <TouchableOpacity style={styles.modalCloseButton} onPress={onClose}>
            <Ionicons name="close-circle" size={30} color={theme.primary} />
          </TouchableOpacity>
          
          {loadingSeller || loadingProductDetails ? (
            <View style={styles.modalLoadingContainer}>
              <ActivityIndicator size="large" color={theme.primary} />
              <Text style={[styles.modalLoadingText, { color: theme.text }]}>Loading product details...</Text>
            </View>
          ) : (
            <ScrollView contentContainerStyle={styles.modalScrollContent}>
              {/* Media Gallery with Color Navigation */}
              <View style={[styles.mediaGalleryContainer, { alignItems: 'center' }]}>
                {(colorSpecificMedia.length > 0 || displayProduct.media_urls?.length > 0) && (
                  <View style={{ width: mediaWidth, height: mediaHeight }}>
                    <FlatList
                      data={(colorSpecificMedia.length > 0 ? colorSpecificMedia : displayProduct.media_urls.map((u: string) => u.startsWith('http') ? u : `${SUPABASE_URL}/storage/v1/object/public/products/${u}`))}
                      horizontal
                      pagingEnabled
                      showsHorizontalScrollIndicator={false}
                      keyExtractor={(_, i) => i.toString()}
                      getItemLayout={(_, i) => ({ length: mediaWidth, offset: mediaWidth * i, index: i })}
                      initialScrollIndex={currentMediaIndex}
                      onMomentumScrollEnd={(e) => setCurrentMediaIndex(Math.round(e.nativeEvent.contentOffset.x / mediaWidth))}
                      renderItem={({ item: url, index }) => {
                        const isVideo = url.toLowerCase().includes('.mp4');
                        return (
                          <TouchableOpacity activeOpacity={0.95} style={{ width: mediaWidth, height: mediaHeight }} onPress={() => onOpenFullViewer(index)}>
                            {isVideo ? (
                              <View style={{ width: '100%', height: '100%' }}>
                                <Image source={{ uri: getCardDisplayUrl(colorSpecificMedia.length > 0 ? colorSpecificMedia : displayProduct.media_urls) }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                                <View style={styles.tiktokPlayThumbnailOverlay} pointerEvents="none">
                                  <View style={styles.tiktokPlayButtonSmall}>
                                    <Ionicons name="play" size={28} color="#fff" />
                                  </View>
                                </View>
                              </View>
                            ) : (
                              <Image source={{ uri: url }} style={{ width: '100%', height: '100%' }} resizeMode="contain" />
                            )}
                          </TouchableOpacity>
                        );
                      }}
                    />
                  </View>
                )}
                
                {/* Color Selection for Media Navigation */}
                {hasColors && (
                  <View style={[styles.colorMediaNavigation, { width: mediaWidth }]}>
                    <Text style={[styles.colorNavTitle, { color: theme.text }]}>
                      View by Color:
                    </Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.colorNavChips}>
                      {fullProductData.colors_available.map((color: string) => {
                        const colorSpecificMedia = colorMedia[color] || [];
                        const hasColorMedia = colorSpecificMedia.length > 0;
                        const colorQty = fullProductData.color_stock?.[color] || 0;
                        const isColorOutOfStock = parseInt(colorQty) === 0;
                        const isSelected = selectedColor === color;
                        
                        return (
                          <TouchableOpacity
                            key={color}
                            style={[
                              styles.colorNavChip,
                              { backgroundColor: theme.surface },
                              isSelected && [styles.colorNavChipSelected, { borderColor: theme.primary }],
                              isColorOutOfStock && { backgroundColor: theme.errorLight }
                            ]}
                            onPress={() => {
                              setSelectedColor(color);
                              navigateToColorMedia(color, fullProductData);
                            }}
                          >
                            <Text style={[
                              styles.colorNavChipText,
                              { color: theme.text },
                              isSelected && [styles.colorNavChipTextSelected, { color: theme.primary }],
                              isColorOutOfStock && { color: theme.error }
                            ]}>
                              {color}
                            </Text>
                            {isColorOutOfStock && (
                              <Ionicons name="close-circle" size={12} color={theme.error} />
                            )}
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                  </View>
                )}
                
                {/* Media Pagination Dots */}
                {displayProduct.media_urls?.length > 1 && (
                  <View style={styles.mediaPaginationDots}>
                    {displayProduct.media_urls.map((_, index) => (
                      <View 
                        key={index} 
                        style={[
                          styles.mediaDot, 
                          index === currentMediaIndex 
                            ? [styles.mediaActiveDot, { backgroundColor: theme.primary }] 
                            : [styles.mediaInactiveDot, { backgroundColor: theme.textTertiary }]
                        ]} 
                      />
                    ))}
                  </View>
                )}
              </View>
              
              <View style={styles.modalDetailsContainer}>
                <Text style={[styles.modalTitle, { color: theme.text }]}>{displayProduct.title}</Text>
                
                {/* Price and Stock Status Row */}
                <View style={styles.priceStockRow}>
                  <View style={styles.priceContainer}>
                    <Text style={[styles.modalPrice, { color: theme.primary }]}>
                      <Text style={[styles.modalCurrency, { color: theme.primary }]}>GHS</Text> {Number(displayProduct.price).toFixed(2)}
                    </Text>
                    {displayProduct.hasDiscount && (
                      <>
                        <Text style={[styles.modalOldPrice, { color: theme.textTertiary }]}>
                          GHS {Number(displayProduct.original_price).toFixed(2)}
                        </Text>
                        <View style={styles.modalDiscountBadge}>
                          <Text style={styles.modalDiscountText}>-{displayProduct.discountPercent}%</Text>
                        </View>
                      </>
                    )}
                  </View>
                  
                  {/* Stock Status Badge */}
                  {!isService && (
                    <View style={[
                      styles.stockStatusBadge,
                      { backgroundColor: isOutOfStock ? theme.error : theme.success }
                    ]}>
                      <Ionicons 
                        name={isOutOfStock ? "close-circle" : "checkmark-circle"} 
                        size={14} 
                        color="#fff" 
                      />
                      <Text style={styles.stockStatusText}>
                        {isOutOfStock ? 'Out of Stock' : `${totalStock} Available`}
                      </Text>
                    </View>
                  )}
                </View>
                
                {/* Size Selection Section */}
                {hasSizes && (
                  <View style={[styles.sizeSelectionSection, { backgroundColor: theme.surface }]}>
                    <View style={styles.sectionHeader}>
                      <Ionicons name="resize-outline" size={20} color={theme.text} />
                      <Text style={[styles.sectionTitle, { color: theme.text }]}>Select Size</Text>
                      <Text style={[styles.stockLabel, { color: theme.textSecondary }]}>
                        (Stock shown per size)
                      </Text>
                    </View>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.sizeChips}>
                      {fullProductData.sizes_available.map((size: string) => {
                        const hasSizeStockData = fullProductData.size_stock && typeof fullProductData.size_stock === 'object' && size in fullProductData.size_stock;
                        const sizeQty = hasSizeStockData ? fullProductData.size_stock[size as keyof typeof fullProductData.size_stock] : fullProductData.quantity || 0;
                        const isSizeOutOfStock = parseInt(sizeQty as string | number) === 0;
                        const isSelected = selectedSize === size;
                        
                        return (
                          <TouchableOpacity
                            key={size}
                            style={[
                              styles.sizeChip,
                              { backgroundColor: theme.card },
                              isSelected && [styles.sizeChipSelected, { borderColor: theme.primary }],
                              isSizeOutOfStock && [styles.sizeChipOutOfStock, { backgroundColor: theme.errorLight }]
                            ]}
                            onPress={() => !isSizeOutOfStock && setSelectedSize(size)}
                            disabled={isSizeOutOfStock}
                          >
                            <Text style={[
                              styles.sizeChipText,
                              { color: theme.text },
                              isSelected && [styles.sizeChipTextSelected, { color: theme.primary }],
                              isSizeOutOfStock && { color: theme.error }
                            ]}>
                              {size}
                            </Text>
                            <Text style={[
                              styles.sizeStockText,
                              { color: isSizeOutOfStock ? theme.error : theme.textSecondary }
                            ]}>
                              {isSizeOutOfStock ? 'Out of stock' : `${sizeQty} available`}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                  </View>
                )}
                
                {/* Color Selection with Quantity Display */}
                {hasColors && (
                  <View style={[styles.colorSelectionSection, { backgroundColor: theme.surface }]}>
                    <View style={styles.sectionHeader}>
                      <Ionicons name="color-palette-outline" size={20} color={theme.text} />
                      <Text style={[styles.sectionTitle, { color: theme.text }]}>Select Color</Text>
                      <Text style={[styles.stockLabel, { color: theme.textSecondary }]}>
                        (Stock shown per color)
                      </Text>
                    </View>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.colorChips}>
                      {fullProductData.colors_available.map((color: string) => {
                        const colorQty = fullProductData.color_stock?.[color] || 0;
                        const isColorOutOfStock = parseInt(colorQty) === 0;
                        const isSelected = selectedColor === color;
                        
                        return (
                          <TouchableOpacity
                            key={color}
                            style={[
                              styles.colorChip,
                              { backgroundColor: theme.card },
                              isSelected && [styles.colorChipSelected, { borderColor: theme.primary }],
                              isColorOutOfStock && [styles.colorChipOutOfStock, { backgroundColor: theme.errorLight }]
                            ]}
                            onPress={() => {
                              if (!isColorOutOfStock) {
                                setSelectedColor(color);
                                navigateToColorMedia(color, fullProductData);
                              }
                            }}
                            disabled={isColorOutOfStock}
                          >
                            <Text style={[
                              styles.colorChipText,
                              { color: theme.text },
                              isSelected && [styles.colorChipTextSelected, { color: theme.primary }],
                              isColorOutOfStock && { color: theme.error }
                            ]}>
                              {color}
                            </Text>
                            <Text style={[
                              styles.colorStockText,
                              { color: isColorOutOfStock ? theme.error : theme.textSecondary }
                            ]}>
                              {isColorOutOfStock ? 'Out of stock' : `${colorQty} available`}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                  </View>
                )}
                
                {/* Selected Options Summary */}
                {(selectedSize || selectedColor) && !isOutOfStock && (
                  <View style={[styles.selectedOptionsSummary, { backgroundColor: theme.surface }]}>
                    <Text style={[styles.selectedOptionsTitle, { color: theme.text }]}>Selected:</Text>
                    <View style={styles.selectedOptionsRow}>
                      {selectedSize && (
                        <View style={[styles.selectedOptionChip, { backgroundColor: theme.primary }]}>
                          <Text style={styles.selectedOptionText}>Size: {selectedSize}</Text>
                        </View>
                      )}
                      {selectedColor && (
                        <View style={[styles.selectedOptionChip, { backgroundColor: theme.primary }]}>
                          <Text style={styles.selectedOptionText}>Color: {selectedColor}</Text>
                        </View>
                      )}
                      <Text style={[styles.availableStockText, { color: theme.success }]}>
                        {availableStock} available
                      </Text>
                    </View>
                  </View>
                )}
                
                <Text style={[styles.modalSectionTitle, { color: theme.text, borderBottomColor: theme.border }]}>
                  Product Description
                </Text>
                <Text style={[styles.modalDescription, { color: theme.textSecondary }]}>
                  {displayProduct.description || displayProduct.title}
                </Text>
                
                {/* Seller Info */}
                <View style={[styles.modalSellerInfo, { borderTopColor: theme.border }]}>
                  <Image 
                    source={{ uri: displayProduct.avatar_url }} 
                    style={[styles.modalSellerAvatar, { borderColor: theme.primary }]} 
                  />
                  <View style={styles.modalSellerTextContainer}>
                    <Text style={[styles.modalSellerName, { color: theme.text }]}>
                      Sold by: {displayProduct.display_name}
                    </Text>
                    <Text style={[styles.modalSellerUniversity, { color: theme.textTertiary }]}>
                      {displayProduct.university}
                    </Text>
                  </View>
                </View>
                
                {/* Similar Products Section */}
                <SimilarProductsSection
                  product={displayProduct}
                  onProductSelect={onSelectSimilarProduct}
                  onAddToCart={onAddToCart}
                  cartItems={cartItems}
                  showAlert={showAlert}
                  theme={theme}
                />
              </View>
            </ScrollView>
          )}
          
          {/* Action Bar */}
          {fromCart ? (
            <View style={[styles.modalActionBar, { borderTopColor: theme.border, backgroundColor: theme.modalBackground }]}>
              <TouchableOpacity
                style={[styles.modalPlaceOrderButton, { backgroundColor: isOutOfStock ? theme.error : '#FF4081' }]}
                onPress={handlePlaceOrder}
                disabled={isOutOfStock}
              >
                <Ionicons name="bag-check" size={20} color="#fff" />
                <Text style={styles.modalPlaceOrderButtonText}>
                  {isOutOfStock ? 'Out of Stock' : 'Place Order'}
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={[styles.modalActionBar, { borderTopColor: theme.border, backgroundColor: theme.modalBackground }]}>
              <TouchableOpacity
                style={[styles.modalAddToCartButton, { 
                  backgroundColor: isOutOfStock ? theme.error : isInCart() ? theme.textTertiary : theme.primary 
                }, isInCart() && styles.modalInCartButton]}
                onPress={handleAddToCart}
                disabled={addingToCart || isOutOfStock || isInCart()}
              >
                {addingToCart ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Ionicons
                    name={isInCart() ? "checkmark-circle" : isOutOfStock ? "close-circle" : "cart-outline"}
                    size={20}
                    color="#fff"
                  />
                )}
                <Text style={styles.modalAddToCartButtonText}>
                  {isOutOfStock ? 'Out of Stock' : isInCart() ? 'Already in Cart' : 'Add to Cart'}
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalPlaceOrderButton, { backgroundColor: isOutOfStock ? theme.error : '#FF4081' }]}
                onPress={handlePlaceOrder}
                disabled={isOutOfStock}
              >
                <Ionicons name="bag-check" size={20} color="#fff" />
                <Text style={styles.modalPlaceOrderButtonText}>
                  {isOutOfStock ? 'Out of Stock' : 'Place Order'}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};
// === SELLER PROFILE MODAL (UPDATED - REMOVED LIKES) ===
const SellerProfileModal: React.FC<{
  isVisible: boolean;
  onClose: () => void;
  sellerId: string;
  onOpenProduct: (product: Product) => void;
  onAddToCart: (product: Product) => Promise<void>;
  onPlaceOrder: (product: Product) => void;
  showAlert: (title: string, message: string, buttons?: any[]) => void;
  theme: any;
}> = ({ isVisible, onClose, sellerId, onOpenProduct, onAddToCart, onPlaceOrder, showAlert, theme }) => {
  const [seller, setSeller] = useState<any>({
    display_name: '',
    avatar_url: '',
    university: '',
    totalFollowers: 0,
    totalProducts: 0,
    totalLikes: 0,
  });
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [profilePhotoVisible, setProfilePhotoVisible] = useState(false);

  useEffect(() => {
    if (!isVisible || !sellerId) return;
    const fetchData = async () => {
      try {
        const { data: shop } = await supabase
          .from('shops')
          .select('name, avatar_url')
          .eq('owner_id', sellerId)
          .single() as { data: { name?: string; avatar_url?: string } | null };
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('full_name, avatar_url, university')
          .eq('id', sellerId)
          .single();
        const { data: rawProducts } = await supabase
          .from('products')
          .select('id, title, description, price, original_price, quantity, media_urls')
          .eq('seller_id', sellerId)
          .order('created_at', { ascending: false });
        
        const { count: totalFollowers } = await supabase
          .from('shop_follows')
          .select('*', { count: 'exact', head: true })
          .eq('shop_owner_id', sellerId);
        
        // Calculate total likes on seller's products
        let totalLikes = 0;
        if (rawProducts && rawProducts.length > 0) {
          const productIds = rawProducts.map(p => p.id);
          const { count: likeCount } = await supabase
            .from('product_likes')
            .select('*', { count: 'exact', head: true })
            .in('product_id', productIds);
          totalLikes = likeCount || 0;
        }
        
        const enriched = (rawProducts || []).map(p => {
          let avatarUrl;
          if (shop?.avatar_url) {
            avatarUrl = shop.avatar_url.startsWith('http')
              ? shop.avatar_url
              : `${SUPABASE_URL}/storage/v1/object/public/avatars/${shop.avatar_url}`;
          } else if (profile?.avatar_url) {
            avatarUrl = profile.avatar_url.startsWith('http')
              ? profile.avatar_url
              : `${SUPABASE_URL}/storage/v1/object/public/avatars/${profile.avatar_url}`;
          } else {
            avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(shop?.name || profile?.full_name || 'S')}&background=FF9900&color=fff`;
          }
          return {
            ...p,
            display_name: shop?.name || profile?.full_name || 'Seller',
            avatar_url: avatarUrl,
            university: profile?.university || 'Campus',
            hasDiscount: p.original_price && p.original_price > p.price,
            discountPercent: p.original_price && p.original_price > p.price ? Math.round(((p.original_price - p.price) / p.original_price) * 100) : null,
            isVideo: p.media_urls?.[0]?.toLowerCase().includes('.mp4'),
          } as Product;
        });
        let sellerAvatarUrl;
        if (shop?.avatar_url) {
          sellerAvatarUrl = shop.avatar_url.startsWith('http')
            ? shop.avatar_url
            : `${SUPABASE_URL}/storage/v1/object/public/avatars/${shop.avatar_url}`;
        } else if (profile?.avatar_url) {
          sellerAvatarUrl = profile.avatar_url.startsWith('http')
            ? profile.avatar_url
            : `${SUPABASE_URL}/storage/v1/object/public/avatars/${profile.avatar_url}`;
        } else {
          sellerAvatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(shop?.name || profile?.full_name || 'S')}&background=FF9900&color=fff`;
        }
        setSeller({
          display_name: shop?.name || profile?.full_name || 'Seller',
          avatar_url: sellerAvatarUrl,
          university: profile && !Array.isArray(profile) ? profile.university : 'Campus',
          totalFollowers: totalFollowers || 0,
          totalProducts: enriched.length || 0,
          totalLikes: totalLikes || 0,
        });
        setProducts(enriched);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [isVisible, sellerId]);

  const handleAddToCart = async (product: Product) => {
    try {
      await onAddToCart(product);
      showAlert('Success', 'Product added to cart!');
    } catch (error) {
      showAlert('Sorry', 'Product is already in cart');
    }
  };

  if (!isVisible) return null;

  return (
    <Modal animationType="slide" transparent={true} visible={isVisible} onRequestClose={onClose}>
      <View style={[styles.sellerProfileOverlay, { backgroundColor: theme.modalOverlay }]}>
        <View style={[styles.sellerProfileModal, { backgroundColor: theme.modalBackground }]}>
          <View style={[styles.sellerProfileHeader, { borderBottomColor: theme.border }]}>
            <TouchableOpacity onPress={onClose} style={styles.sellerProfileCloseButton}>
              <Ionicons name="close" size={28} color={theme.text} />
            </TouchableOpacity>
            <Text style={[styles.sellerProfileTitle, { color: theme.text }]}>Seller Profile</Text>
            <View style={{ width: 40 }} />
          </View>
          {loading ? (
            <View style={styles.sellerProfileLoading}>
              <ActivityIndicator size="large" color={theme.primary} />
              <Text style={[styles.sellerProfileLoadingText, { color: theme.text }]}>Loading seller information...</Text>
            </View>
          ) : (
            <View style={styles.sellerProfileContainer}>
            <View style={[styles.sellerInfoSection, { backgroundColor: theme.surface }]}>
                <TouchableOpacity onPress={() => setProfilePhotoVisible(true)}>
                  <Image source={{ uri: seller.avatar_url }} style={[styles.sellerProfileAvatar, { borderColor: theme.primary }]} />
                </TouchableOpacity>
                <Text style={[styles.sellerProfileName, { color: theme.text }]}>{seller.display_name}</Text>
                <Text style={[styles.sellerProfileUniversity, { color: theme.textTertiary }]}>{seller.university}</Text>
                <View style={styles.sellerStatsContainer}>
                  <View style={styles.sellerStatItem}>
                    <Text style={[styles.sellerStatNumber, { color: theme.primary }]}>{seller.totalFollowers}</Text>
                    <Text style={[styles.sellerStatLabel, { color: theme.textSecondary }]}>Followers</Text>
                  </View>
                  <View style={styles.sellerStatItem}>
                    <Text style={[styles.sellerStatNumber, { color: theme.primary }]}>{seller.totalProducts}</Text>
                    <Text style={[styles.sellerStatLabel, { color: theme.textSecondary }]}>Products</Text>
                  </View>
                  <View style={styles.sellerStatItem}>
                    <Text style={[styles.sellerStatNumber, { color: theme.primary }]}>{seller.totalLikes}</Text>
                    <Text style={[styles.sellerStatLabel, { color: theme.textSecondary }]}>Likes</Text>
                  </View>
                </View>
              </View>
              
              {products.length === 0 ? (
                <View style={styles.sellerEmptyProducts}>
                  <Ionicons name="grid-outline" size={60} color={theme.textTertiary} />
                  <Text style={[styles.sellerEmptyProductsText, { color: theme.text }]}>No products yet</Text>
                  <Text style={[styles.sellerEmptyProductsSubtext, { color: theme.textSecondary }]}>This seller hasn't listed any products</Text>
                </View>
              ) : (
                <FlatList
                  data={products}
                  numColumns={2}
                  keyExtractor={item => item.id}
                  contentContainerStyle={styles.sellerProductsGrid}
                  renderItem={({ item }) => (
                    <TouchableOpacity 
                      style={[styles.sellerProductGridItem, { backgroundColor: theme.surface }]} 
                      onPress={() => onOpenProduct(item)}
                    >
                      <Image source={{ uri: getCardDisplayMedia(item.media_urls) }} style={styles.sellerProductGridImage} resizeMode="cover" />
                      <View style={styles.sellerProductGridInfo}>
                        <Text style={[styles.sellerProductGridTitle, { color: theme.text }]} numberOfLines={2}>{item.title}</Text>
                        <Text style={[styles.sellerProductGridPrice, { color: theme.primary }]}>GHS {item.price.toFixed(2)}</Text>
                        <View style={styles.sellerProductGridActions}>
                          <TouchableOpacity
                            style={[styles.sellerProductGridCartButton, { backgroundColor: theme.primary }]}
                            onPress={(e) => {
                              e.stopPropagation();
                              handleAddToCart(item);
                            }}
                          >
                            <Ionicons name="cart-outline" size={16} color="#fff" />
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[styles.sellerProductGridOrderButton, { backgroundColor: '#FF4081' }]}
                            onPress={(e) => {
                              e.stopPropagation();
                              onPlaceOrder(item);
                            }}
                          >
                            <Ionicons name="bag-check" size={16} color="#fff" />
                          </TouchableOpacity>
                        </View>
                      </View>
                    </TouchableOpacity>
                  )}
                />
              )}
            </View>
          )}
        </View>
      </View>
      
      {/* Profile Photo Modal */}
      <Modal animationType="fade" transparent={true} visible={profilePhotoVisible} onRequestClose={() => setProfilePhotoVisible(false)}>
        <View style={[styles.profilePhotoOverlay, { backgroundColor: 'rgba(0,0,0,0.9)' }]}>
          <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={() => setProfilePhotoVisible(false)}>
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
              <Image source={{ uri: seller.avatar_url }} style={{ width: 300, height: 300, borderRadius: 20 }} resizeMode="cover" />
            </View>
          </TouchableOpacity>
        </View>
      </Modal>
    </Modal>
  );
};

// === PRODUCT FEED CARD ===
const ProductFeedCard: React.FC<{
  item: Product;
  ITEM_HEIGHT: number;
  width: number;
  insets: any;
  openModal: (p: Product, fromCart: boolean) => void;
  openComments: (p: Product) => void;
  openSellerProfile: (id: string) => void;
  videoRef: (ref: any) => void;
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
  onAddToCart: (product: Product) => Promise<void>;
  onPlaceOrder: (product: Product, options?: { selectedColor?: string | null; selectedSize?: string | null; quantity?: number | null }) => void;
  onShare: (product: Product, platform: string) => Promise<void>;
  showAlert: (title: string, message: string, buttons?: any[]) => void;
  theme: any;
}> = ({ item, ITEM_HEIGHT, width, insets, openModal, openComments, openSellerProfile, videoRef, setProducts, onAddToCart, onPlaceOrder, onShare, showAlert, theme }) => {
  const { width: windowWidth } = useWindowDimensions();
  const isLargeScreenCard = windowWidth >= 768;
  const router = useRouter();
  const [showHeart, setShowHeart] = useState(false);
  const [addingToCart, setAddingToCart] = useState(false);
  const [shareMenuVisible, setShareMenuVisible] = useState(false);
  const [likeLoading, setLikeLoading] = useState(false);
  const doubleTapRef = useRef<number | null>(null);
  const tapTimeoutRef = useRef<any>(null);
  const localVideoRef = useRef<any>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isBuffering, setIsBuffering] = useState(false);

  const handleTap = async () => {
    const now = Date.now();
    // Double-tap detection
    if (doubleTapRef.current && now - doubleTapRef.current < 300) {
      // double tap -> like
      doubleTapRef.current = null;
      // Prevent concurrent operations and prevent multiple rapid taps
      if (likeLoading) return;
      
      // Only allow liking if not already liked
      if (item.isLiked) return;
      
      setShowHeart(true);
      setTimeout(() => setShowHeart(false), 800);
      setLikeLoading(true);
      const userId = await getCurrentUserId();
      if (!userId) {
        showAlert('Login Required', 'Please log in to like');
        setLikeLoading(false);
        return;
      }
      // Check if user already liked this product
      const { data: existingLike, error: checkError } = await supabase
        .from('product_likes')
        .select('id')
        .eq('product_id', item.id)
        .eq('user_id', userId)
        .maybeSingle();
      if (checkError) {
        showAlert('Error', 'Failed to check like status');
        setLikeLoading(false);
        return;
      }
      if (existingLike) {
        // Already liked, do not increment
        setProducts(prev => prev.map(p =>
          p.id === item.id ? { ...p, isLiked: true, likeCount: p.likeCount || 1 } : p
        ));
        setLikeLoading(false);
        return;
      }
      // Update UI to show liked state immediately
      const previousLikeCount = item.likeCount || 0;
      setProducts(prev => prev.map(p =>
        p.id === item.id ? { ...p, isLiked: true, likeCount: previousLikeCount + 1 } : p
      ));
      try {
        const { error } = await supabase.from('product_likes').insert({ product_id: item.id, user_id: userId });
        if (error) throw error;
      } catch (error) {
        showAlert('Error', 'Failed to like');
        setProducts(prev => prev.map(p =>
          p.id === item.id ? { ...p, isLiked: false, likeCount: Math.max((p.likeCount || 1) - 1, 0) } : p
        ));
      } finally {
        setLikeLoading(false);
      }
      // cancel any pending single-tap action
      if (tapTimeoutRef.current) {
        clearTimeout(tapTimeoutRef.current);
        tapTimeoutRef.current = null;
      }
      return;
    }

    // start waiting for a possible second tap
    doubleTapRef.current = now;

    // schedule single-tap (play/pause) after threshold
    if (tapTimeoutRef.current) clearTimeout(tapTimeoutRef.current);
    tapTimeoutRef.current = setTimeout(async () => {
      // Single tap -> toggle play/pause
      try {
        if (localVideoRef.current && typeof localVideoRef.current.getStatusAsync === 'function') {
          const status: any = await localVideoRef.current.getStatusAsync();
          if (status.isPlaying) {
            await localVideoRef.current.pauseAsync();
            setIsPlaying(false);
          } else {
            await localVideoRef.current.playAsync();
            setIsPlaying(true);
          }
        } else {
          // fallback toggle
          setIsPlaying(prev => !prev);
        }
      } catch (e) {
        // ignore
      }
      tapTimeoutRef.current = null;
    }, 300);
  };

  useEffect(() => {
    return () => {
      if (tapTimeoutRef.current) clearTimeout(tapTimeoutRef.current);
    };
  }, []);

  const handleSharePress = () => {
    setShareMenuVisible(true);
  };

  const handleShareToPlatform = async (platform: string) => {
    try {
      const userId = await getCurrentUserId();
      
      if (!userId) {
        showAlert('Login Required', 'Please log in to share');
        return;
      }
      
      // First update local state
      setProducts(prev => prev.map(p =>
        p.id === item.id ? { 
          ...p, 
          shareCount: (p.shareCount || 0) + 1,
          isShared: true 
        } : p
      ));
      
      let imageUrl = '';
      if (item.media_urls?.[0]) {
        if (item.media_urls[0].startsWith('http')) {
          imageUrl = item.media_urls[0];
        } else {
          imageUrl = `${SUPABASE_URL}/storage/v1/object/public/products/${item.media_urls[0]}`;
        }
      }
      
      // Insert into product_shares table - this is now the source of truth
      const { error } = await supabase.from('product_shares').insert({
        product_id: item.id,
        user_id: userId,
        platform: platform,
        
        shared_at: new Date().toISOString(),
      });
      
      if (error) {
        // Rollback local state on error
        setProducts(prev => prev.map(p =>
          p.id === item.id ? { 
            ...p, 
            shareCount: Math.max((p.shareCount || 1) - 1, 0),
            isShared: false
          } : p
        ));
        
        return;
      }
      
      await onShare(item, platform);
      
    } catch (error) {
      showAlert('Error', 'Failed to share product');
    }
  };

  const handleFollowToggle = async () => {
    const userId = await getCurrentUserId();
    if (!userId) {
      showAlert('Login Required', 'Please log in to follow');
      return;
    }
    const newFollowed = !item.isFollowed;
    setProducts(prev => prev.map(p =>
      p.seller_id === item.seller_id ? { ...p, isFollowed: newFollowed, followerCount: (p.followerCount || 0) + (newFollowed ? 1 : -1) } : p
    ));
    try {
      if (newFollowed) {
        const { error } = await supabase.from('shop_follows').insert({ shop_owner_id: item.seller_id, follower_id: userId });
        if (error) throw error;
      } else {
        const { error } = await supabase.from('shop_follows').delete().eq('shop_owner_id', item.seller_id).eq('follower_id', userId);
        if (error) throw error;
      }
    } catch (error) {
      showAlert('Error', 'Failed to follow/unfollow');
      setProducts(prev => prev.map(p =>
        p.seller_id === item.seller_id ? { ...p, isFollowed: !newFollowed, followerCount: (p.followerCount || 0) + (newFollowed ? -1 : 1) } : p
      ));
    }
  };

  const handleLikeToggle = async () => {
    // Prevent multiple simultaneous requests
    if (likeLoading) return;
    
    const userId = await getCurrentUserId();
    if (!userId) {
      showAlert('Login Required', 'Please log in to like');
      return;
    }
    
    setLikeLoading(true);
    const previousLikeCount = item.likeCount || 0;

    try {
      if (item.isLiked) {
        // Unlike
        setProducts(prev => prev.map(p =>
          p.id === item.id ? { ...p, isLiked: false, likeCount: Math.max(previousLikeCount - 1, 0) } : p
        ));
        const { error } = await supabase.from('product_likes').delete().eq('product_id', item.id).eq('user_id', userId);
        if (error) throw error;
      } else {
        // Like - check if user already liked this product
        const { data: existingLike, error: checkError } = await supabase
          .from('product_likes')
          .select('id')
          .eq('product_id', item.id)
          .eq('user_id', userId)
          .maybeSingle();
        if (checkError) throw checkError;
        
        if (existingLike) {
          // Already liked, do not increment
          setProducts(prev => prev.map(p =>
            p.id === item.id ? { ...p, isLiked: true, likeCount: previousLikeCount } : p
          ));
          return;
        }
        
        // Update UI to show liked state immediately
        setProducts(prev => prev.map(p =>
          p.id === item.id ? { ...p, isLiked: true, likeCount: previousLikeCount + 1 } : p
        ));
        
        // Insert into database
        const { error } = await supabase.from('product_likes').insert({ product_id: item.id, user_id: userId });
        if (error) throw error;
      }
    } catch (error) {
      showAlert('Error', 'Failed to update like');
      // Revert optimistic update on error
      setProducts(prev => prev.map(p =>
        p.id === item.id ? { ...p, isLiked: !item.isLiked, likeCount: previousLikeCount } : p
      ));
    } finally {
      setLikeLoading(false);
    }
  };

  const handleAddToCart = async () => {
    setAddingToCart(true);
    try {
      await onAddToCart(item);
      showAlert('Success', 'Product added to cart!');
    } catch (error) {
      showAlert('Sorry', 'Product is already in cart');
    } finally {
      setAddingToCart(false);
    }
  };

  const handlePlaceOrder = () => {
    onPlaceOrder(item);
  };

  return (
    <View style={{ height: ITEM_HEIGHT, width, backgroundColor: theme.background }}>
      <View style={{ ...StyleSheet.absoluteFillObject, backgroundColor: theme.overlay }} />
      <TouchableOpacity activeOpacity={1} style={[styles.mediaContainer, { alignItems: 'center', justifyContent: 'center' }]} onPress={handleTap}>
        {/* TikTok-style video display on feed (centered on desktop, full-width on mobile) */}
        {item.isVideo ? (
          <View style={[
            { flex: 1, backgroundColor: theme.background, width: '100%' },
            isLargeScreenCard && { width: Math.min(width * 0.7, 500), alignSelf: 'center' }
          ]}>
            <View style={{ width: '100%', height: '97%' }}>
              <Video
                source={{ uri: item.media_urls?.[0] }}
                style={{ width: '100%', height: '100%' }}
                resizeMode={ResizeMode.COVER}
                isLooping
                shouldPlay={isPlaying}
                useNativeControls={false}
                ref={(ref: any) => { localVideoRef.current = ref; if (videoRef) videoRef(ref); }}
                onPlaybackStatusUpdate={(status: any) => {
                  setIsBuffering(!!status.isBuffering);
                  setIsPlaying(!!status.isPlaying);
                }}
              />

              {isBuffering && (
                <View style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, justifyContent: 'center', alignItems: 'center' }}>
                  <ActivityIndicator size="large" color={theme.primary} />
                </View>
              )}

              {!isPlaying && !isBuffering && (
                <View style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, justifyContent: 'center', alignItems: 'center' }} pointerEvents="none">
                  <View style={styles.tiktokPlayButton}>
                    <Ionicons name="play" size={34} color="#fff" />
                  </View>
                </View>
              )}
            </View>
          </View>
        ) : (
          <Image
            source={{ uri: getCardDisplayUrl(item.media_urls) }}
            style={[styles.mainMediaImage, isLargeScreenCard ? { maxWidth: Math.min(windowWidth * 0.9, 900), alignSelf: 'center' } : {}]}
            resizeMode="contain"
          />
        )}
        {showHeart && <View style={styles.doubleTapHeart}><Ionicons name="heart" size={100} color="#f21313ff" /></View>}
      </TouchableOpacity>
      <LinearGradient 
        colors={['transparent', theme.gradientStart, theme.gradientEnd]} 
        style={[styles.gradientOverlay, { height: ITEM_HEIGHT * 0.4 }]} 
      />
      
      {/* Left Sidebar with Cart and Order Icons */}
      <View style={[styles.leftSidebar, { top: insets.top + 80 }]}>
        <TouchableOpacity style={styles.leftSidebarItem} onPress={handleAddToCart} disabled={addingToCart}>
          {addingToCart ? (
            <ActivityIndicator size="small" color={theme.primary} />
          ) : (
            <Ionicons
              name={item.inCart ? "cart" : "cart-outline"}
              size={26}
              color={item.inCart ? theme.primary : '#0d20f2ff'}
              style={styles.shadowIcon}
            />
          )}
          <Text style={[styles.leftSidebarText, { color: '#fff' }]}>Cart</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.leftSidebarItem} onPress={handlePlaceOrder}>
          <Ionicons
            name="bag-check-outline"
            size={26}
            color="#0726efff"
            style={styles.shadowIcon}
          />
          <Text style={[styles.leftSidebarText, { color: '#fff' }]}>Order</Text>
        </TouchableOpacity>
      </View>
      
      {/* Right Sidebar */}
      <View style={[styles.rightSidebar, { bottom: insets.bottom + 90 }]}>
        <View style={styles.sidebarItem}>
          <TouchableOpacity style={[styles.avatarBorder, { borderColor: theme.primary }]} onPress={() => openSellerProfile(item.seller_id)}>
            <Image source={{ uri: item.avatar_url }} style={styles.sidebarAvatar} />
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.followButton, { 
              backgroundColor: theme.background, 
              borderColor: theme.primary 
            }]} 
            onPress={handleFollowToggle}
          >
            <Text style={item.isFollowed ? 
              [styles.followingText, { color: '#fda306ff' }] : 
              [styles.followText, { color: theme.primary }]
            }>
              {item.isFollowed ? 'Following' : 'Follow'}
            </Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity style={styles.sidebarItem} onPress={handleLikeToggle} disabled={likeLoading}>
          {likeLoading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Ionicons
              name={item.isLiked ? "heart" : "heart-outline"}
              size={28}
              color={item.isLiked ? '#FF3B30' : '#fff'}
              style={styles.shadowIcon}
            />
          )}
          <Text style={[styles.sidebarText, { color: '#fff' }]}>{item.likeCount || 0}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.sidebarItem} onPress={() => openComments(item)}>
          <Ionicons name="chatbubble-outline" size={26} color="#fff" style={styles.shadowIcon} />
          <Text style={[styles.sidebarText, { color: '#fff' }]}>{item.commentCount || 0}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.sidebarItem} onPress={handleSharePress}>
          <Ionicons name="share-social" size={25} color="#fff" style={styles.shadowIcon} />
          <Text style={[styles.sidebarText, { color: '#fff' }]}>{item.shareCount || 0}</Text>
        </TouchableOpacity>
      </View>
      
      <View style={[styles.bottomInfoContainer, { width: width - 80, bottom: insets.bottom + 16 }]}>
        <Text style={[styles.titleTeaser, { color: theme.primary }]} numberOfLines={2}>{item.title}</Text>
        <View style={styles.userInfoColumn}>
          <Text style={[styles.username, { color: '#ffffffff' }]}>
            @{(item.display_name || '').replace(/\s/g, '').toLowerCase()}
          </Text>
        </View>
        <TouchableOpacity 
          style={[styles.viewProductButton, { backgroundColor: theme.primary }]} 
          onPress={() => openModal(item, false)}
        >
          <Text style={[styles.viewProductButtonText, { color: theme.background }]}>View Product Details</Text>
        </TouchableOpacity>
      </View>
      <ShareModal
        isVisible={shareMenuVisible}
        onClose={() => setShareMenuVisible(false)}
        product={item}
        onShare={handleShareToPlatform}
        showAlert={showAlert}
        theme={theme}
      />
    </View>
  );
};

// === MAIN SCREEN ===
export default function BuyerScreen() {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams();
  const FEED_ITEM_HEIGHT = height;
  
  // Detect system color scheme
  const colorScheme = useColorScheme();
  const [theme, setTheme] = useState(colorScheme === 'dark' ? darkTheme : lightTheme);
  
  // Listen for system theme changes
  useEffect(() => {
    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      setTheme(colorScheme === 'dark' ? darkTheme : lightTheme);
    });
    
    return () => subscription.remove();
  }, []);
  
  // Update theme when colorScheme changes
  useEffect(() => {
    setTheme(colorScheme === 'dark' ? darkTheme : lightTheme);
  }, [colorScheme]);

  // State
  const [productFromQuery, setProductFromQuery] = useState<Product | null>(null);
  const [checkingQuery, setCheckingQuery] = useState(false);
  const [hasCheckedQuery, setHasCheckedQuery] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [commentsVisible, setCommentsVisible] = useState(false);
  const [sellerProfileVisible, setSellerProfileVisible] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedSellerId, setSelectedSellerId] = useState<string>('');
  const [fullViewerIndex, setFullViewerIndex] = useState(-1);
  const [orderFormVisible, setOrderFormVisible] = useState(false);
  const [orderForProduct, setOrderForProduct] = useState<Product | null>(null);
  const [orderInitialOptions, setOrderInitialOptions] = useState<{ selectedColor?: string | null; selectedSize?: string | null; quantity?: number | null } | null>(null);
  const [isCartOrder, setIsCartOrder] = useState(false);
  const [ordersModalVisible, setOrdersModalVisible] = useState(false);
  const [contactSellerVisible, setContactSellerVisible] = useState(false);
  
  const [orderProductModalVisible, setOrderProductModalVisible] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [selectedOrderProduct, setSelectedOrderProduct] = useState<Product | null>(null);
  
  const [modalFromCart, setModalFromCart] = useState(false);
  const [modalFromSellerProfile, setModalFromSellerProfile] = useState(false);
  
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);
  const [userUniversity, setUserUniversity] = useState<string | null>(null);
  
  // Custom Alert State
  const [alert, setAlert] = useState({
    visible: false,
    title: '',
    message: '',
    buttons: [{ text: 'OK', onPress: () => {} }]
  });
  
  const videoRefs = useRef<{ [key: string]: any }>({});
  const [currentlyPlayingId, setCurrentlyPlayingId] = useState<string | null>(null);
  
  const {
    cartItems,
    cartVisible,
    setCartVisible,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    getCartCount,
    getCartTotal,
    loadCart,
  } = useCart();

  // Custom Alert Functions
  const showAlert = (title: string, message: string, buttons = [{ text: 'OK', onPress: () => {} }]) => {
    setAlert({
      visible: true,
      title,
      message,
      buttons
    });
  };

  const hideAlert = () => {
    setAlert(prev => ({ ...prev, visible: false }));
  };

  // Load user university on mount
  useEffect(() => {
    const loadUserUniversity = async () => {
      try {
        const university = await getCurrentUserUniversity();
        setUserUniversity(university);
      } catch (error) {
        console.error('Error loading user university:', error);
      }
    };
    loadUserUniversity();
  }, []);

  const fetchUnreadNotificationCount = async () => {
    try {
      const userId = await getCurrentUserId();
      if (!userId) return 0;
      
      const { count, error } = await supabase
        .from('buyer_notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('is_read', false);
      
      if (error) {
        console.error('Error fetching unread notifications:', error);
        return 0;
      }
      
      return count || 0;
    } catch (error) {
      console.error('Error fetching unread notifications:', error);
      return 0;
    }
  };

  useEffect(() => {
    const loadNotificationCount = async () => {
      const count = await fetchUnreadNotificationCount();
      setUnreadNotificationCount(count);
    };
    
    loadNotificationCount();
    
    const loadSubscription = async () => {
      const userId = await getCurrentUserId();
      if (userId) {
        const channel = supabase
          .channel(`buyer-notifications-${userId}`)
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'buyer_notifications',
              filter: `user_id=eq.${userId}`
            },
            async () => {
              const newCount = await fetchUnreadNotificationCount();
              setUnreadNotificationCount(newCount);
            }
          )
          .subscribe();
        
        return () => {
          supabase.removeChannel(channel);
        };
      }
    };
    
    const cleanup = loadSubscription();
    return () => {
      if (cleanup && typeof cleanup.then === 'function') {
        cleanup.then(cleanupFn => cleanupFn && cleanupFn());
      }
    };
  }, []);

  useEffect(() => {
    const checkQueryParams = async () => {
      if (hasCheckedQuery) return;
     
      if (params.productId && typeof params.productId === 'string') {
        setCheckingQuery(true);
       
        try {
          const existingProduct = products.find(p => p.id === params.productId);
         
          if (existingProduct) {
            setProductFromQuery(existingProduct);
            setSelectedProduct(existingProduct);
            setModalFromCart(false);
            setTimeout(() => setModalVisible(true), 800);
          } else {
            const { data: productData, error } = await supabase
              .from('products')
              .select(`
                id, title, description, price, original_price, quantity,
                media_urls, seller_id, created_at,
                user_profiles(full_name, avatar_url, university),
                shops(name, avatar_url)
              `)
              .eq('id', params.productId)
              .single();
             
            if (error) {
              console.error('Error fetching product:', error);
              return;
            }
           
            if (productData) {
              // Explicitly type shop and profile to avoid 'never' type
              type ShopType = { name?: string; avatar_url?: string } | null | undefined;
              type ProfileType = { full_name?: string; avatar_url?: string; university?: string } | null | undefined;
              const shop = productData.shops as ShopType | ShopType[];
              const profile = productData.user_profiles as ProfileType;
             
              let avatarUrl;
              if (Array.isArray(shop) ? shop[0]?.avatar_url : (shop as ShopType)?.avatar_url) {
                const avatar = Array.isArray(shop) ? shop[0]?.avatar_url : (shop as ShopType)?.avatar_url;
                avatarUrl = avatar && avatar.startsWith('http')
                  ? avatar
                  : `${SUPABASE_URL}/storage/v1/object/public/avatars/${avatar}`;
              } else if (profile?.avatar_url) {
                avatarUrl = profile.avatar_url.startsWith('http')
                  ? profile.avatar_url
                  : `${SUPABASE_URL}/storage/v1/object/public/avatars/${profile.avatar_url}`;
              } else {
                const shopName = Array.isArray(shop) ? shop[0]?.name : (shop as ShopType)?.name;
                avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(shopName || profile?.full_name || 'U')}&background=FF9900&color=fff&bold=true`;
              }
             
              const product: Product = {
                ...productData,
                display_name: shop?.name || profile?.full_name || 'Verified Seller',
                avatar_url: avatarUrl,
                university: profile?.university || 'Campus',
                hasDiscount: productData.original_price && productData.original_price > productData.price,
                discountPercent: productData.original_price && productData.original_price > productData.price
                  ? Math.round(((productData.original_price - productData.price) / productData.original_price) * 100)
                  : null,
                isVideo: productData.media_urls?.[0]?.toLowerCase().includes('.mp4'),
                score: 0,
                commentCount: 0,
                likeCount: 0,
                shareCount: 0,
                followerCount: 0,
                isLiked: false,
                isShared: false,
                isFollowed: false,
                inCart: false,
              };
             
              setProductFromQuery(product);
              setSelectedProduct(product);
              setModalFromCart(false);
             
              setProducts(prev => {
                if (!prev.some(p => p.id === product.id)) {
                  return [...prev, product];
                }
                return prev;
              });
             
              setTimeout(() => {
                setModalVisible(true);
              }, 1000);
            }
          }
        } catch (err) {
          console.error('Error in checkQueryParams:', err);
        } finally {
          setCheckingQuery(false);
          setHasCheckedQuery(true);
        }
      }
    };
   
    const timer = setTimeout(() => {
      checkQueryParams();
    }, 1500);
   
    return () => clearTimeout(timer);
  }, [params.productId, products, hasCheckedQuery]);

  const openModal = (product: Product, fromCart = false, fromSellerProfile = false) => {
    setSelectedProduct(product);
    setModalFromCart(fromCart);
    setModalFromSellerProfile(fromSellerProfile);
    setModalVisible(true);
  };
 
  const openComments = (product: Product) => {
    setSelectedProduct(product);
    setCommentsVisible(true);
  };
 
  const openSellerProfile = (id: string) => {
    setSelectedSellerId(id);
    setSellerProfileVisible(true);
  };
 
  const openProductFromSeller = (product: Product) => {
    openModal(product, false, true);
    setSellerProfileVisible(false);
  };
  
  const openContactSeller = () => {
    if (!selectedProduct) return;
    setContactSellerVisible(true);
    setModalVisible(false);
  };

  const handleViewProductDetails = (order: any, product: Product) => {
    setSelectedOrder(order);
    setSelectedOrderProduct(product);
    setOrdersModalVisible(false);
    setOrderProductModalVisible(true);
  };

  // === FIXED: ORDER PRODUCT DETAIL MODAL WITH COLOR-SPECIFIC MEDIA ===
  const OrderProductDetailModal: React.FC<{
    isVisible: boolean;
    onClose: () => void;
    product: Product | null;
    order: any | null;
    onOpenFullViewer: (index: number) => void;
    onContactSeller: () => void;
    onCancelOrder: (orderId: string) => Promise<void>;
    showAlert: (title: string, message: string, buttons?: any[]) => void;
    theme: any;
  }> = ({ isVisible, onClose, product, order, onOpenFullViewer, onContactSeller, onCancelOrder, showAlert, theme }) => {
    const [cancelling, setCancelling] = useState(false);
    const [orderItems, setOrderItems] = useState<any[]>([]);
    const [fullProductData, setFullProductData] = useState<any>(null);
    const [colorSpecificMedia, setColorSpecificMedia] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const { width } = useWindowDimensions();
    
    // Calculate dimensions for desktop centering
    const isLargeScreen = width >= 768;
    const modalWidth = isLargeScreen ? Math.min(width * 0.8, 800) : '100%';

    // Fetch full product data including color_media - FIXED VERSION
    useEffect(() => {
      const fetchFullProductData = async () => {
        if (!product || !order) return;
        
        setLoading(true);
        try {
          const { data, error } = await supabase
            .from('products')
            .select('*')
            .eq('id', product.id)
            .single();
          
          if (error) throw error;
          setFullProductData(data);
          
          // Filter media by selected color - FIXED LOGIC
          if (order.selected_color && data?.color_media) {
            const colorMedia = data.color_media || {};
            const mediaForColor = colorMedia[order.selected_color];
            
            if (mediaForColor?.length > 0) {
              // Use color-specific media if available
              const formattedMedia = mediaForColor.map((url: string) => {
                if (url.startsWith('http')) {
                  return url;
                } else {
                  return `${SUPABASE_URL}/storage/v1/object/public/products/${url}`;
                }
              });
              setColorSpecificMedia(formattedMedia);
            } else {
              // Fall back to general media URLs
              const generalMedia = data.media_urls || [];
              const formattedMedia = generalMedia.map((url: string) => {
                if (url.startsWith('http')) {
                  return url;
                } else {
                  return `${SUPABASE_URL}/storage/v1/object/public/products/${url}`;
                }
              });
              setColorSpecificMedia(formattedMedia);
            }
          } else {
            // No color selected, use general media
            const generalMedia = data?.media_urls || product.media_urls || [];
            const formattedMedia = generalMedia.map((url: string) => {
              if (url.startsWith('http')) {
                return url;
              } else {
                return `${SUPABASE_URL}/storage/v1/object/public/products/${url}`;
              }
            });
            setColorSpecificMedia(formattedMedia);
          }
        } catch (error) {
          console.error('Error fetching product details:', error);
          // Fallback to product's media_urls
          const generalMedia = product.media_urls || [];
          const formattedMedia = generalMedia.map((url: string) => {
            if (url.startsWith('http')) {
              return url;
            } else {
              return `${SUPABASE_URL}/storage/v1/object/public/products/${url}`;
            }
          });
          setColorSpecificMedia(formattedMedia);
        } finally {
          setLoading(false);
        }
      };
      
      if (isVisible && product && order) {
        fetchFullProductData();
      } else {
        setColorSpecificMedia([]);
        setFullProductData(null);
      }
    }, [isVisible, product, order]);

    // Fetch order items with size and color details
    useEffect(() => {
      const fetchOrderItems = async () => {
        if (!order) return;
        
        try {
          const { data, error } = await supabase
            .from('order_items')
            .select('*')
            .eq('order_id', order.id);
          
          if (error) throw error;
          setOrderItems(data || []);
        } catch (error) {
          console.error('Error fetching order items:', error);
        }
      };
      
      if (isVisible && order) {
        fetchOrderItems();
      } else {
        setOrderItems([]);
      }
    }, [isVisible, order]);

    const handleCancelOrder = async () => {
      if (!order) return;
      
      setCancelling(true);
      try {
        await onCancelOrder(order.id);
      } catch (error) {
        console.error('Error cancelling order:', error);
      } finally {
        setCancelling(false);
      }
    };

    // Helper function to check if media URL is color-specific
    const isColorSpecificMedia = (mediaUrl: string) => {
      if (!order?.selected_color || !fullProductData?.color_media) return false;
      const colorMedia = fullProductData.color_media[order.selected_color] || [];
      return colorMedia.some((url: string) => {
        const fullUrl = url.startsWith('http') ? url : `${SUPABASE_URL}/storage/v1/object/public/products/${url}`;
        return fullUrl === mediaUrl;
      });
    };

    // Format media URLs for display
    const formatMediaUrls = (urls: string[]) => {
      return urls.map(url => {
        if (url.startsWith('http')) {
          return url;
        } else {
          return `${SUPABASE_URL}/storage/v1/object/public/products/${url}`;
        }
      });
    };

    if (!product || !order) return null;

    // Determine which media to display
    const displayMedia = colorSpecificMedia.length > 0 ? colorSpecificMedia : formatMediaUrls(product.media_urls || []);

    // Check if we have color-specific media to show
    const hasColorSpecificMedia = colorSpecificMedia.length > 0 && 
      order.selected_color && 
      fullProductData?.color_media?.[order.selected_color]?.length > 0;

    return (
      <Modal animationType="slide" transparent={true} visible={isVisible} onRequestClose={onClose}>
        <View style={[styles.modalCenteredView, { backgroundColor: theme.modalOverlay }]}>
          <View style={[
            styles.modalModalView, 
            { 
              backgroundColor: theme.modalBackground,
              width: modalWidth,
              maxWidth: 800,
              alignSelf: 'center',
              marginHorizontal: 'auto',
              left: 0,
              right: 0,
              marginLeft: 'auto',
              marginRight: 'auto',
            }
          ]}>
            <TouchableOpacity style={styles.modalCloseButton} onPress={onClose}>
              <Ionicons name="close-circle" size={30} color={theme.primary} />
            </TouchableOpacity>
            
            {loading ? (
              <View style={styles.modalLoadingContainer}>
                <ActivityIndicator size="large" color={theme.primary} />
                <Text style={[styles.modalLoadingText, { color: theme.text }]}>Loading product details...</Text>
              </View>
            ) : (
              <ScrollView contentContainerStyle={styles.modalScrollContent}>
                {/* Show media gallery */}
                {displayMedia?.length > 0 && (
                  <View style={[styles.mediaGalleryContainer, { alignItems: 'center' }]}>
                    <View style={styles.colorMediaSection}>
                      {hasColorSpecificMedia && order.selected_color && (
                        <View style={styles.colorMediaHeader}>
                          <Ionicons name="color-palette" size={18} color={theme.primary} />
                          <Text style={[styles.colorMediaTitle, { color: theme.text }]}>
                            Viewing: {order.selected_color} color media ({colorSpecificMedia.length} images)
                          </Text>
                          <View style={[styles.colorIndicator, { backgroundColor: theme.primary }]}>
                            <Text style={styles.colorIndicatorText}>Color Specific</Text>
                          </View>
                        </View>
                      )}
                      {!hasColorSpecificMedia && order.selected_color && (
                        <View style={styles.colorMediaHeader}>
                          <Ionicons name="color-palette-outline" size={18} color={theme.textTertiary} />
                          <Text style={[styles.colorMediaTitle, { color: theme.textSecondary }]}>
                            No specific media found for {order.selected_color}, showing all product images
                          </Text>
                        </View>
                      )}
                      <ProductMediaView 
                        urls={displayMedia} 
                        onPressMedia={onOpenFullViewer} 
                        theme={theme} 
                      />
                      
                      {/* Color media indicator on first image */}
                      {hasColorSpecificMedia && displayMedia[0] && (
                        <View style={[styles.colorMediaBadge, { backgroundColor: theme.primary }]}>
                          <Text style={styles.colorMediaBadgeText}>
                            {order.selected_color} • {colorSpecificMedia.length} images
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                )}
                
                <View style={styles.modalDetailsContainer}>
                  
                  {/* Order Status Badge */}
                  <View style={[
                    styles.orderStatusBadge, 
                    { backgroundColor: getStatusColor(order.status, theme) }
                  ]}>
                    <Text style={styles.orderStatusText}>
                      {getStatusText(order.status)}
                    </Text>
                  </View>

                  <Text style={[styles.modalTitle, { color: theme.text }]}>{product.title}</Text>
                  <View style={styles.modalPriceRow}>
                    <Text style={[styles.modalPrice, { color: theme.primary }]}>
                      <Text style={[styles.modalCurrency, { color: theme.primary }]}>GHS</Text> {Number(product.price).toFixed(2)}
                    </Text>
                    {product.hasDiscount && (
                      <>
                        <Text style={[styles.modalOldPrice, { color: theme.textTertiary }]}>GHS {Number(product.original_price).toFixed(2)}</Text>
                        <View style={styles.modalDiscountBadge}>
                          <Text style={styles.modalDiscountText}>-{product.discountPercent}%</Text>
                        </View>
                      </>
                    )}
                  </View>
                  
                  {/* Selected Options Display */}
                  {(order.selected_size || order.selected_color || order.quantity) && (
                    <View style={[styles.selectedOptionsContainer, { backgroundColor: theme.surface }]}>
                      <Text style={[styles.selectedOptionsTitle, { color: theme.text }]}>Order Details:</Text>
                      <View style={styles.selectedOptionsGrid}>
                        {order.selected_size && (
                          <View style={styles.selectedOptionItem}>
                            <Ionicons name="resize-outline" size={16} color={theme.textTertiary} />
                            <Text style={[styles.selectedOptionLabel, { color: theme.textSecondary }]}>Size:</Text>
                            <Text style={[styles.selectedOptionValue, { color: theme.text }]}>{order.selected_size}</Text>
                          </View>
                        )}
                        {order.selected_color && (
                          <View style={styles.selectedOptionItem}>
                            <Ionicons 
                              name={hasColorSpecificMedia ? "color-palette" : "color-palette-outline"} 
                              size={16} 
                              color={hasColorSpecificMedia ? theme.primary : theme.textTertiary} 
                            />
                            <Text style={[styles.selectedOptionLabel, { color: theme.textSecondary }]}>Color:</Text>
                            <Text style={[
                              styles.selectedOptionValue, 
                              { color: hasColorSpecificMedia ? theme.primary : theme.text }
                            ]}>
                              {order.selected_color}
                              {hasColorSpecificMedia && (
                                <Text style={{ fontSize: 10, color: theme.success }}> ✓</Text>
                              )}
                            </Text>
                          </View>
                        )}
                        {order.quantity && (
                          <View style={styles.selectedOptionItem}>
                            <Ionicons name="cart-outline" size={16} color={theme.textTertiary} />
                            <Text style={[styles.selectedOptionLabel, { color: theme.textSecondary }]}>Quantity:</Text>
                            <Text style={[styles.selectedOptionValue, { color: theme.text }]}>{order.quantity}</Text>
                          </View>
                        )}
                      </View>
                    </View>
                  )}
                 
                  <Text style={[styles.modalSectionTitle, { color: theme.text, borderBottomColor: theme.border }]}>Product Description</Text>
                  <Text style={[styles.modalDescription, { color: theme.textSecondary }]}>
                    {product.description || product.title}
                  </Text>
                 
                  <View style={[styles.modalSellerInfo, { borderTopColor: theme.border }]}>
                    <Image source={{ uri: product.avatar_url }} style={[styles.modalSellerAvatar, { borderColor: theme.primary }]} />
                    <View>
                      <Text style={[styles.modalSellerName, { color: theme.text }]}>Sold by: {product.display_name}</Text>
                      <Text style={[styles.modalSellerUniversity, { color: theme.textTertiary }]}>{product.university}</Text>
                    </View>
                  </View>

                  {/* Order Information Section */}
                  <View style={[styles.orderInfoSection, { borderTopColor: theme.border }]}>
                    <Text style={[styles.modalSectionTitle, { color: theme.text, borderBottomColor: theme.border }]}>Order Information</Text>
                    
                    <View style={styles.orderInfoRow}>
                      <Ionicons name="person-outline" size={16} color={theme.textTertiary} />
                      <Text style={[styles.orderInfoLabel, { color: theme.textSecondary }]}>Buyer: </Text>
                      <Text style={[styles.orderInfoValue, { color: theme.text }]}>{order.buyer_name}</Text>
                    </View>
                    
                    <View style={styles.orderInfoRow}>
                      <Ionicons name="call-outline" size={16} color={theme.textTertiary} />
                      <Text style={[styles.orderInfoLabel, { color: theme.textSecondary }]}>Phone: </Text>
                      <Text style={[styles.orderInfoValue, { color: theme.text }]}>{order.phone_number}</Text>
                    </View>
                    
                    <View style={styles.orderInfoRow}>
                      <Ionicons name="location-outline" size={16} color={theme.textTertiary} />
                      <Text style={[styles.orderInfoLabel, { color: theme.textSecondary }]}>Location: </Text>
                      <Text style={[styles.orderInfoValue, { color: theme.text }]}>{order.location}</Text>
                    </View>
                    
                    <View style={styles.orderInfoRow}>
                      <Ionicons
                        name={order.delivery_option === 'delivery' ? "car-outline" : "storefront-outline"}
                        size={16}
                        color={theme.textTertiary}
                      />
                      <Text style={[styles.orderInfoLabel, { color: theme.textSecondary }]}>Delivery: </Text>
                      <Text style={[styles.orderInfoValue, { color: theme.text }]}>
                        {order.delivery_option === 'delivery' ? 'Campus Delivery' : 'Meetup/Pickup'}
                      </Text>
                    </View>
                    
                    <View style={styles.orderInfoRow}>
                      <Ionicons name="pricetag-outline" size={16} color={theme.textTertiary} />
                      <Text style={[styles.orderInfoLabel, { color: theme.textSecondary }]}>Total Amount: </Text>
                      <Text style={[styles.orderInfoValue, { color: theme.primary }]}>
                        GHS {order.total_amount?.toFixed(2) || '0.00'}
                      </Text>
                    </View>
                    
                    {order.additional_notes && (
                      <View style={styles.orderInfoRow}>
                        <Ionicons name="document-text-outline" size={16} color={theme.textTertiary} />
                        <Text style={[styles.orderInfoLabel, { color: theme.textSecondary }]}>Notes: </Text>
                        <Text style={[styles.orderInfoValue, { color: theme.text }]}>{order.additional_notes}</Text>
                      </View>
                    )}
                    
                    <View style={styles.orderInfoRow}>
                      <Ionicons name="calendar-outline" size={16} color={theme.textTertiary} />
                      <Text style={[styles.orderInfoLabel, { color: theme.textSecondary }]}>Order Date: </Text>
                      <Text style={[styles.orderInfoValue, { color: theme.text }]}>
                        {new Date(order.created_at).toLocaleDateString()}
                      </Text>
                    </View>
                  </View>
                  
                  {/* Order Items (for cart orders) */}
                  {order.is_cart_order && orderItems.length > 0 && (
                    <View style={[styles.orderItemsSection, { borderTopColor: theme.border }]}>
                      <Text style={[styles.modalSectionTitle, { color: theme.text, borderBottomColor: theme.border }]}>
                        Order Items ({orderItems.length})
                      </Text>
                      {orderItems.map((item, index) => (
                        <View key={index} style={[styles.orderItemCard, { backgroundColor: theme.surface }]}>
                          <View style={styles.orderItemHeader}>
                            <Text style={[styles.orderItemTitle, { color: theme.text }]} numberOfLines={1}>
                              {item.product_name}
                            </Text>
                            <Text style={[styles.orderItemPrice, { color: theme.primary }]}>
                              GHS {item.total_price?.toFixed(2) || '0.00'}
                            </Text>
                          </View>
                          <View style={styles.orderItemDetails}>
                            <Text style={[styles.orderItemDetail, { color: theme.textSecondary }]}>
                              Price: GHS {item.product_price?.toFixed(2)} × {item.quantity} units
                            </Text>
                            {item.size && (
                              <Text style={[styles.orderItemDetail, { color: theme.textSecondary }]}>
                                Size: {item.size}
                              </Text>
                            )}
                            {item.color && (
                              <Text style={[styles.orderItemDetail, { color: theme.textSecondary }]}>
                                Color: {item.color}
                              </Text>
                            )}
                          </View>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              </ScrollView>
            )}
            <View style={[styles.modalActionBar, { borderTopColor: theme.border, backgroundColor: theme.modalBackground }]}>
              {(order.status === 'pending' || order.status === 'processing') && (
                <TouchableOpacity
                  style={[styles.modalContactButton, { backgroundColor: theme.surface }]}
                  onPress={onContactSeller}
                >
                  <Ionicons name="chatbubble-outline" size={20} color={theme.text} />
                  <Text style={[styles.modalContactButtonText, { color: theme.text }]}>Chat Seller</Text>
                </TouchableOpacity>
              )}
             
              {(order.status === 'pending' || order.status === 'processing') && (
                <TouchableOpacity
                  style={[styles.modalCancelOrderButton, { backgroundColor: theme.error }]}
                  onPress={handleCancelOrder}
                  disabled={cancelling}
                >
                  {cancelling ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Ionicons name="close-circle" size={20} color="#fff" />
                  )}
                  <Text style={styles.modalCancelOrderButtonText}>
                    {cancelling ? 'Cancelling...' : 'Cancel Order'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  const handleCancelOrder = async (orderId: string) => {
    try {
      const userId = await getCurrentUserId();
      if (!userId) {
        showAlert('Error', 'User not found');
        return;
      }
      
      const { data: order, error: fetchError } = await supabase
        .from('orders')
        .select('status')
        .eq('id', orderId)
        .single();
      
      if (fetchError) throw fetchError;
      
      if (order.status === 'cancelled') {
        showAlert('Error', 'This order has already been cancelled');
        return;
      }
      
      if (order.status !== 'pending' && order.status !== 'processing') {
        showAlert('Cannot Cancel', 'This order can no longer be cancelled.');
        return;
      }
      
      const { error } = await supabase
        .from('orders')
        .update({
          status: 'cancelled',
          cancelled_at: new Date().toISOString(),
          cancelled_by: userId,
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId)
        .in('status', ['pending', 'processing']);
      
      if (error) throw error;
      
      showAlert('Success', 'Order cancelled successfully');
      setOrderProductModalVisible(false);
    } catch (error: any) {
      showAlert('Error', error.message || 'Failed to cancel order');
    }
  };

  const handleSelectSimilarProduct = (product: Product) => {
    openModal(product, false, false);
  };

  const handleAddToCart = async (product: Product) => {
    const newCartItems = await addToCart(product);
   
    setProducts(prev => prev.map(p =>
      p.id === product.id ? { ...p, inCart: true } : p
    ));
   
    if (selectedProduct && selectedProduct.id === product.id) {
      setSelectedProduct(prev => prev ? { ...prev, inCart: true } : null);
    }
   
    if (productFromQuery && productFromQuery.id === product.id) {
      setProductFromQuery(prev => prev ? { ...prev, inCart: true } : null);
    }
   
    // Do not return cart items here to match expected handler signature (Promise<void>)
  };

  const handleRemoveFromCart = async (productId: string) => {
    const newCartItems = await removeFromCart(productId);
   
    setProducts(prev => prev.map(p =>
      p.id === productId ? { ...p, inCart: false } : p
    ));
   
    // Do not return cart items to align with expected handler types
  };

  const handleUpdateQuantity = async (productId: string, quantity: number) => {
    await updateQuantity(productId, quantity);
    // no return value to match expected Promise<void> signature
  };

  const handleClearCart = async () => {
    await clearCart();
   
    setProducts(prev => prev.map(p => ({ ...p, inCart: false })));
   
    if (selectedProduct) {
      setSelectedProduct(prev => prev ? { ...prev, inCart: false } : null);
    }
  };

  const handlePlaceOrder = (product: Product, options?: { selectedColor?: string | null; selectedSize?: string | null; quantity?: number | null }) => {
    setOrderForProduct(product);
    setIsCartOrder(false);
    setOrderInitialOptions(options || null);
    setOrderFormVisible(true);
  };

  const handleCartPlaceOrder = () => {
    if (cartItems.length === 0) return;
    setOrderForProduct(null);
    setIsCartOrder(true);
    setOrderFormVisible(true);
    setCartVisible(false);
  };

  const handleSubmitOrder = async (orderData: OrderFormData) => {
    try {
      const userId = await getCurrentUserId();
      if (!userId) {
        showAlert('Login Required', 'Please log in to place an order');
        throw new Error('Please log in to place an order');
      }
      
      if (!orderData.fullName.trim()) {
        throw new Error('Please enter your full name');
      }
      if (!orderData.phoneNumber.trim()) {
        throw new Error('Please enter your phone number');
      }
      if (!orderData.location.trim()) {
        throw new Error('Please enter your location');
      }
      
      let phoneNumber = orderData.phoneNumber;
      if (phoneNumber.startsWith('0')) {
        phoneNumber = '+233' + phoneNumber.substring(1);
      } else if (!phoneNumber.startsWith('+')) {
        phoneNumber = '+233' + phoneNumber;
      }
      
      if (isCartOrder) {
        if (cartItems.length === 0) {
          throw new Error('Cart is empty');
        }
        
        const cartTotal = getCartTotal();
        
        const uniqueSellerIds = new Set(cartItems.map(item => item.product.seller_id));
        if (uniqueSellerIds.size > 1) {
          throw new Error('All items in cart must be from the same seller');
        }
        
        const sellerId = cartItems[0]?.product?.seller_id;
        if (!sellerId) {
          throw new Error('Unable to determine seller');
        }
        
        // For cart orders, we don't set size/color at order level, only at item level
        const { data: masterOrder, error: orderError } = await supabase
          .from('orders')
          .insert({
            user_id: userId,
            seller_id: sellerId,
            buyer_name: orderData.fullName,
            phone_number: phoneNumber,
            location: orderData.location,
            delivery_option: orderData.deliveryOption,
            additional_notes: orderData.additionalNotes || '',
            total_amount: cartTotal,
            status: 'pending',
            is_cart_order: true,
            // Cart orders don't have single product size/color
            selected_color: null,
            selected_size: null,
            quantity: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .select()
          .single();
          
        if (orderError) {
          console.error('Order creation error:', orderError);
          throw new Error(`Failed to create order: ${orderError.message}`);
        }
        
        // Prepare order items with size and color from cart items
        const orderItems = (cartItems as any).map((item: any) => ({
          order_id: masterOrder.id,
          product_id: item.product.id,
          product_name: item.product.title,
          product_price: item.product.price,
          product_image_url: getCardDisplayUrl(item.product.media_urls) || null,
          quantity: item.quantity,
          total_price: item.product.price * item.quantity,
          seller_id: item.product.seller_id,
          size: item.selectedSize || item.product.selectedSize || null, // Get size from cart item
          color: item.selectedColor || item.product.selectedColor || null, // Get color from cart item
          created_at: new Date().toISOString(),
        }));
        
        const { error: itemsError } = await supabase
          .from('order_items')
          .insert(orderItems);
          
        if (itemsError) {
          console.error('Order items error:', itemsError);
          await supabase.from('orders').delete().eq('id', masterOrder.id);
          throw new Error('Failed to create order items. Please try again.');
        }
        
        // Prepare notification data with item details
        const notificationData = {
          order_id: masterOrder.id,
          seller_id: sellerId,
          product_name: cartItems.length > 1 ? `${cartItems.length} items` : cartItems[0].product.title,
          product_price: cartTotal,
          product_image: getCardDisplayUrl(cartItems[0]?.product.media_urls) || null,
          quantity: cartItems.reduce((sum, item) => sum + item.quantity, 0),
          buyer_name: orderData.fullName,
          buyer_phone: phoneNumber,
          total_amount: cartTotal,
          delivery_option: orderData.deliveryOption,
          location: orderData.location,
          items: cartItems.map(item => ({
            name: item.product.title,
            quantity: item.quantity,
            size: item.product.selectedSize,
            color: item.product.selectedColor,
            price: item.product.price,
            total: item.product.price * item.quantity,
          })),
        };
        
        try {
          await sendOrderNotificationToSeller(notificationData);
        } catch (notifError) {
          console.warn('Notification error:', notifError);
        }
        
        try {
          await sendOrderNotificationToBuyer({
            user_id: userId,
            order_id: masterOrder.id,
            total_amount: cartTotal,
            items_count: cartItems.length,
          });
          
          const newCount = await fetchUnreadNotificationCount();
          setUnreadNotificationCount(newCount);
        } catch (notifError) {
          console.warn('Buyer notification error:', notifError);
        }
        
        await clearCart();
        
        setOrderFormVisible(false);
        setCartVisible(false);
        
        showAlert(
          'Order Successful!',
          `Your order #${masterOrder.id.slice(-8)} has been placed successfully. The seller will contact you shortly.`,
          [
            { 
              text: 'OK', 
              onPress: () => {
                if (ordersModalVisible) {
                  // Optional: Refresh orders list
                }
              }
            }
          ]
        );
        
      } else if (orderForProduct) {
        // For single product order, calculate total with quantity
        const quantity = orderData.quantity || 1;
        const totalAmount = orderForProduct.price * quantity;
        
        const { data: order, error: orderError } = await supabase
          .from('orders')
          .insert({
            user_id: userId,
            seller_id: orderForProduct.seller_id,
            product_id: orderForProduct.id,
            product_name: orderForProduct.title,
            product_price: orderForProduct.price,
            product_image_url: getCardDisplayUrl(orderForProduct.media_urls) || null,
            buyer_name: orderData.fullName,
            phone_number: phoneNumber,
            location: orderData.location,
            delivery_option: orderData.deliveryOption,
            additional_notes: orderData.additionalNotes || '',
            total_amount: totalAmount,
            status: 'pending',
            is_cart_order: false,
            // Store selected size, color, and quantity at order level
            selected_color: orderData.selectedColor || null,
            selected_size: orderData.selectedSize || null,
            quantity: quantity,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .select()
          .single();
          
        if (orderError) {
          console.error('Single order error:', orderError);
          throw new Error(`Failed to create order: ${orderError.message}`);
        }
        
        const orderItemData = {
          order_id: order.id,
          product_id: orderForProduct.id,
          product_name: orderForProduct.title,
          product_price: orderForProduct.price,
          product_image_url: getCardDisplayUrl(orderForProduct.media_urls) || null,
          quantity: quantity,
          total_price: totalAmount,
          seller_id: orderForProduct.seller_id,
          size: orderData.selectedSize || null,
          color: orderData.selectedColor || null,
          created_at: new Date().toISOString(),
        };
        
        const { error: itemsError } = await supabase
          .from('order_items')
          .insert(orderItemData);
          
        if (itemsError) {
          console.error('Order item insert error:', itemsError);
          await supabase.from('orders').delete().eq('id', order.id);
          throw new Error('Failed to create order item. Please try again.');
        }
        
        // Update product stock if not a service
        if (orderForProduct.category !== 'Services') {
          // Fetch current product to get stock info
          const { data: productData } = await supabase
            .from('products')
            .select('*')
            .eq('id', orderForProduct.id)
            .single();
          
          if (productData) {
            let updateData: any = {};
            
            // Handle size-specific stock
            if (orderData.selectedSize && productData.sizes_available?.includes(orderData.selectedSize)) {
              const sizeStock = productData.size_stock || {};
              const currentQty = parseInt(sizeStock[orderData.selectedSize] || '0');
              const newQty = Math.max(0, currentQty - quantity);
              
              updateData.size_stock = {
                ...sizeStock,
                [orderData.selectedSize]: newQty.toString(),
              };
            }
            // Handle color-specific stock
            else if (orderData.selectedColor && productData.colors_available?.includes(orderData.selectedColor)) {
              const colorStock = productData.color_stock || {};
              const currentQty = parseInt(colorStock[orderData.selectedColor] || '0');
              const newQty = Math.max(0, currentQty - quantity);
              
              updateData.color_stock = {
                ...colorStock,
                [orderData.selectedColor]: newQty.toString(),
              };
            }
            // Handle general stock
            else {
              const currentQty = productData.quantity || 0;
              updateData.quantity = Math.max(0, currentQty - quantity);
            }
            
            // Update product stock
            await supabase
              .from('products')
              .update(updateData)
              .eq('id', orderForProduct.id);
          }
        }
        
        try {
          await sendOrderNotificationToSeller({
            order_id: order.id,
            seller_id: orderForProduct.seller_id,
            product_name: orderForProduct.title,
            product_price: orderForProduct.price,
            product_image: getCardDisplayUrl(orderForProduct.media_urls) || null,
            quantity: quantity,
            size: orderData.selectedSize,
            color: orderData.selectedColor,
            buyer_name: orderData.fullName,
            buyer_phone: phoneNumber,
            total_amount: totalAmount,
            delivery_option: orderData.deliveryOption,
            location: orderData.location,
          });
        } catch (notifError) {
          console.warn('Notification error:', notifError);
        }
        
        try {
          await sendOrderNotificationToBuyer({
            user_id: userId,
            order_id: order.id,
            total_amount: totalAmount,
            items_count: 1,
          });
          
          const newCount = await fetchUnreadNotificationCount();
          setUnreadNotificationCount(newCount);
        } catch (notifError) {
          console.warn('Buyer notification error:', notifError);
        }
        
        setOrderFormVisible(false);
        setModalVisible(false);
        setSellerProfileVisible(false);
        
        showAlert(
          'Order Successful!',
          `Your order #${order.id.slice(-8)} has been placed successfully. ` +
          `Quantity: ${quantity} • ` +
          (orderData.selectedSize ? `Size: ${orderData.selectedSize} • ` : '') +
          (orderData.selectedColor ? `Color: ${orderData.selectedColor} • ` : '') +
          `Total: GHS ${totalAmount.toFixed(2)}\n\n` +
          `The seller will contact you shortly`,
          [
            { 
              text: 'OK', 
              onPress: () => {
                if (ordersModalVisible) {
                  // Optional: Refresh orders list
                }
              }
            }
          ]
        );
      } else {
        throw new Error('No product selected for order');
      }
      
    } catch (error: any) {
      console.error('Order submission error:', error);
      
      showAlert(
        'Order Failed',
        error.message || 'Failed to submit order. Please try again.'
      );
      
      throw error;
    }
  };

  const handleShare = async (product: Product, platform: string) => {
    const userId = await getCurrentUserId();
   
    if (!userId) {
      showAlert('Login Required', 'Please log in to share');
      return;
    }
    try {
      return Promise.resolve();
    } catch (error) {
      console.error('Share recording error:', error);
      showAlert('Error', 'Failed to record share');
      return;
    }
  };

  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (!viewableItems.length) return;
   
    Object.values(videoRefs.current).forEach(v => {
      if (v && typeof v.pauseAsync === 'function') {
        v.pauseAsync();
      }
    });
   
    const visibleItem = viewableItems[0]?.item;
    if (visibleItem?.isVideo && videoRefs.current[visibleItem.id]) {
      try {
        videoRefs.current[visibleItem.id].playAsync();
        setCurrentlyPlayingId(visibleItem.id);
      } catch (error) {
        console.error('Error playing video:', error);
      }
    } else {
      setCurrentlyPlayingId(null);
    }
  }).current;

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 70,
    minimumViewTime: 300,
  }).current;

  // Get current user's university
  const getCurrentUserUniversity = async () => {
    try {
      const userId = await getCurrentUserId();
      if (!userId) return null;
      
      const { data: userProfile, error } = await supabase
        .from('user_profiles')
        .select('university')
        .eq('id', userId)
        .single();
      
      if (error) {
        console.error('Error fetching user university:', error);
        return null;
      }
      
      return userProfile?.university;
    } catch (error) {
      console.error('Error in getCurrentUserUniversity:', error);
      return null;
    }
  };

  const loadProducts = useCallback(async (currentPage: number) => {
    if (!hasMore && currentPage > 0) return;
    try {
      currentPage === 0 ? setLoadingInitial(true) : setLoadingMore(true);
      const from = currentPage * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      
      // Get current user's university first
      const currentUserUniversity = await getCurrentUserUniversity();
      const currentUserId = await getCurrentUserId();
      
      if (!currentUserUniversity) {
        showAlert('University Required', 'Please update your university in your profile to see products');
        setLoadingInitial(false);
        setLoadingMore(false);
        return;
      }
      
      console.log('📚 Current user university:', currentUserUniversity);
      console.log('👤 Current user ID:', currentUserId);
      
      // Fetch products only from sellers in the same university
      // OR products from the current user (if they're a seller)
      let query = supabase
        .from('products')
        .select('id, title, description, price, original_price, quantity, media_urls, seller_id, created_at')
        .range(from, to)
        .order('created_at', { ascending: false });
      
      // Apply university filter
      // Get seller profiles to filter by university
      const { data: sellerProfiles, error: profilesError } = await supabase
        .from('user_profiles')
        .select('id, university')
        .eq('university', currentUserUniversity);
      
      if (profilesError) {
        console.error('Error fetching seller profiles:', profilesError);
        throw profilesError;
      }
      
      const sameUniversitySellerIds = sellerProfiles?.map(profile => profile.id) || [];
      console.log('🎓 Sellers in same university:', sameUniversitySellerIds.length);
      
      // If current user is a seller, include their products too
      const allSellerIds = [...sameUniversitySellerIds];
      if (currentUserId && !allSellerIds.includes(currentUserId)) {
        allSellerIds.push(currentUserId);
      }
      
      if (allSellerIds.length === 0) {
        console.log('⚠️ No sellers found in your university');
        setProducts([]);
        setHasMore(false);
        setLoadingInitial(false);
        setLoadingMore(false);
        return;
      }
      
      query = query.in('seller_id', allSellerIds);
      
      const { data: rawProducts, error } = await query;
      
      if (error) throw error;
      if (!rawProducts?.length) { 
        setHasMore(false); 
        setLoadingInitial(false); 
        setLoadingMore(false); 
        return; 
      }
      
      console.log('✅ Products found for current university:', rawProducts.length);
      
      const productIds = rawProducts.map(p => p.id);
      const sellerIds = [...new Set(rawProducts.map(p => p.seller_id))];
      const userId = currentUserId;
      
      // Fetch ALL related data including share counts from product_shares table
      const [
        { data: likesData },
        { data: sharesData },  // This gets share counts from product_shares table
        { data: commentsData },
        { data: followsData },
        userLikesRes,
        userFollowsRes,
        { data: cartData },
        { data: userSharesRes },  // Check if current user has shared these products
      ] = await Promise.all([
        supabase.from('product_likes').select('product_id').in('product_id', productIds),
        supabase.from('product_shares').select('product_id').in('product_id', productIds), // Count shares from product_shares
        supabase.from('product_comments').select('product_id').in('product_id', productIds),
        supabase.from('shop_follows').select('shop_owner_id').in('shop_owner_id', sellerIds),
        userId ? supabase.from('product_likes').select('product_id').eq('user_id', userId).in('product_id', productIds) : { data: [] },
        userId ? supabase.from('shop_follows').select('shop_owner_id').eq('follower_id', userId).in('shop_owner_id', sellerIds) : { data: [] },
        userId ? supabase.from('cart_items').select('product_id').eq('user_id', userId).in('product_id', productIds) : { data: [] },
        userId ? supabase.from('product_shares').select('product_id').eq('user_id', userId).in('product_id', productIds) : { data: [] }, // Check user's shares
      ]);
      
      // Count shares from product_shares table
      const shareCounts = (sharesData || []).reduce((acc: any, s: any) => ({ 
        ...acc, 
        [s.product_id]: (acc[s.product_id] || 0) + 1 
      }), {});
      
      const userShares = ((userSharesRes as any)?.data || userSharesRes || []).map((s: any) => s.product_id);
      const userLikes = ((userLikesRes as any)?.data || userLikesRes || []).map((l: any) => l.product_id);
      const userFollows = ((userFollowsRes as any)?.data || userFollowsRes || []).map((f: any) => f.shop_owner_id);
      const cartProductIds = (cartData || []).map(c => c.product_id);
      
      const likeCounts = (likesData || []).reduce((acc: any, l: any) => ({ ...acc, [l.product_id]: (acc[l.product_id] || 0) + 1 }), {});
      const commentCounts = (commentsData || []).reduce((acc: any, c: any) => ({ ...acc, [c.product_id]: (acc[c.product_id] || 0) + 1 }), {});
      const followerCounts = (followsData || []).reduce((acc: any, f: any) => ({ ...acc, [f.shop_owner_id]: (acc[f.shop_owner_id] || 0) + 1 }), {});
      
      const scored = scoreAndSortProducts(rawProducts);
      
      // Get seller info
      const [shopsRes, profilesRes] = await Promise.all([
        supabase.from('shops').select('owner_id, name, avatar_url').in('owner_id', sellerIds),
        supabase.from('user_profiles').select('id, full_name, avatar_url, university').in('id', sellerIds),
      ]);
      
      const shops = shopsRes.data || [];
      const profiles = profilesRes.data || [];
      
      // Enrich products with all counts including share count from product_shares
      const enriched: Product[] = scored.map(p => {
        const shop = shops.find((s: any) => s.owner_id === p.seller_id);
        const profile = profiles.find((pr: any) => pr.id === p.seller_id);
       
        let avatarUrl;
        if (shop?.avatar_url) {
          avatarUrl = shop.avatar_url.startsWith('http')
            ? shop.avatar_url
            : `${SUPABASE_URL}/storage/v1/object/public/avatars/${shop.avatar_url}`;
        } else if (profile?.avatar_url) {
          avatarUrl = profile.avatar_url.startsWith('http')
            ? profile.avatar_url
            : `${SUPABASE_URL}/storage/v1/object/public/avatars/${profile.avatar_url}`;
        } else {
          avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(shop?.name || profile?.full_name || 'U')}&background=FF9900&color=fff&bold=true`;
        }
       
        return {
          ...p,
          display_name: shop?.name || profile?.full_name || 'Verified Seller',
          avatar_url: avatarUrl,
          university: profile?.university || 'Campus',
          commentCount: commentCounts[p.id] || 0,
          likeCount: likeCounts[p.id] || 0,
          shareCount: shareCounts[p.id] || 0, // Now from product_shares table
          followerCount: followerCounts[p.seller_id] || 0,
          isLiked: userLikes.includes(p.id),
          isShared: userShares.includes(p.id), // Track if user shared
          isFollowed: userFollows.includes(p.seller_id),
          inCart: cartProductIds.includes(p.id),
        } as Product;
      });
      
      setProducts(prev => currentPage === 0 ? enriched : [...prev, ...enriched]);
      setHasMore(rawProducts.length === PAGE_SIZE);
      setPage(currentPage + 1);
    } catch (err) {
      console.error('Load products error:', err);
    } finally {
      setLoadingInitial(false);
      setLoadingMore(false);
    }
  }, [hasMore]);

  useEffect(() => {
    loadProducts(0);
    loadCart();
  }, []);

  useEffect(() => {
    const channel = supabase.channel('realtime-product-counts');
    
    // Listen for product_shares changes (UPDATED)
    channel.on('postgres_changes', { 
      event: 'INSERT', 
      schema: 'public', 
      table: 'product_shares' 
    }, (payload: any) => {
      const productId = payload.new?.product_id;
      const userId = payload.new?.user_id;
      if (!productId) return;
      
      // Only update real-time if it's not from the current user (to avoid double increment from optimistic update)
      getCurrentUserId().then(currentUserId => {
        if (userId !== currentUserId) {
          setProducts(prev => prev.map(p => 
            p.id === productId ? { ...p, shareCount: (p.shareCount || 0) + 1 } : p
          ));
        }
      });
    });
    
    channel.on('postgres_changes', { 
      event: 'DELETE', 
      schema: 'public', 
      table: 'product_shares' 
    }, (payload: any) => {
      const productId = payload.old?.product_id;
      const userId = payload.old?.user_id;
      if (!productId) return;
      
      // Only update real-time if it's not from the current user (to avoid double decrement from optimistic update)
      getCurrentUserId().then(currentUserId => {
        if (userId !== currentUserId) {
          setProducts(prev => prev.map(p => 
            p.id === productId ? { ...p, shareCount: Math.max((p.shareCount || 1) - 1, 0) } : p
          ));
        }
      });
    });
    
    // Keep existing listeners
    channel.on('postgres_changes', { event: '*', schema: 'public', table: 'product_likes' }, (payload: any) => {
      const newRow = payload.new;
      const oldRow = payload.old;
      const productId = newRow?.product_id ?? oldRow?.product_id;
      const userId = newRow?.user_id ?? oldRow?.user_id;
      if (!productId) return;
      const delta = payload.eventType === 'INSERT' || payload.event === 'INSERT' ? 1 : (payload.eventType === 'DELETE' || payload.event === 'DELETE' ? -1 : 0);
      if (delta === 0) return;
      // Only update real-time if it's not from the current user (to avoid double increment from optimistic update)
      getCurrentUserId().then(currentUserId => {
        if (userId !== currentUserId) {
          setProducts(prev => prev.map(p => p.id === productId ? { ...p, likeCount: Math.max((p.likeCount || 0) + delta, 0) } : p));
        }
      });
    });
    
    channel.on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'product_comments' }, (payload: any) => {
      const productId = payload.new?.product_id;
      if (!productId) return;
      setProducts(prev => prev.map(p => p.id === productId ? { ...p, commentCount: (p.commentCount || 0) + 1 } : p));
    });
    
    channel.on('postgres_changes', { event: '*', schema: 'public', table: 'shop_follows' }, (payload: any) => {
      const shopOwnerId = payload.new?.shop_owner_id ?? payload.old?.shop_owner_id;
      if (!shopOwnerId) return;
      const delta = payload.eventType === 'INSERT' || payload.event === 'INSERT' ? 1 : (payload.eventType === 'DELETE' || payload.event === 'DELETE' ? -1 : 0);
      if (delta === 0) return;
      setProducts(prev => prev.map(p => p.seller_id === shopOwnerId ? { ...p, followerCount: Math.max((p.followerCount || 0) + delta, 0) } : p));
    });
    
    channel.subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleLoadMore = () => { if (!loadingMore && hasMore) loadProducts(page); };

  useEffect(() => {
    return () => {
      Object.values(videoRefs.current).forEach(v => {
        if (v && typeof v.unloadAsync === 'function') {
          v.unloadAsync();
        }
      });
      videoRefs.current = {};
    };
  }, []);

  if (checkingQuery) {
    return (
      <View style={[styles.center, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
        <Text style={{ color: theme.text, marginTop: 20, fontSize: 16 }}>
          Loading shared product...
        </Text>
      </View>
    );
  }

  if (loadingInitial) {
    return (
      <View style={[styles.center, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <StatusBar barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'} translucent backgroundColor="transparent" />
      
      {/* Custom Alert Component */}
      <CustomAlert
        visible={alert.visible}
        title={alert.title}
        message={alert.message}
        buttons={alert.buttons}
        onClose={hideAlert}
        theme={theme}
      />
      
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <TouchableOpacity
          style={styles.headerIcon}
          onPress={async () => {
            setOrdersModalVisible(true);
            // Clear notification count when viewing orders
            const userId = await getCurrentUserId();
            if (userId) {
              await supabase
                .from('buyer_notifications')
                .update({ is_read: true })
                .eq('user_id', userId)
                .eq('is_read', false);
              setUnreadNotificationCount(0);
            }
          }}
        >
          <Ionicons 
            name="receipt-outline" 
            size={24} 
            color={colorScheme === 'dark' ? theme.text : '#FF6600'} 
          />
          {unreadNotificationCount > 0 && (
            <View style={[styles.ordersBadge, { backgroundColor: theme.error }]}>
              <Text style={styles.ordersBadgeText}>
                {unreadNotificationCount > 99 ? '99+' : unreadNotificationCount}
              </Text>
            </View>
          )}
        </TouchableOpacity>
       
        <TouchableOpacity
          style={styles.headerIcon}
          onPress={() => setCartVisible(true)}
        >
          <Ionicons 
            name="cart-outline" 
            size={24} 
            color={colorScheme === 'dark' ? theme.text : '#FF6600'} 
          />
          {getCartCount() > 0 && (
            <View style={[styles.cartBadge, { backgroundColor: theme.primary }]}>
              <Text style={styles.cartBadgeText}>{getCartCount()}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>
      <FlatList
        data={products}
        renderItem={({ item }) => (
          <ProductFeedCard
            item={item}
            ITEM_HEIGHT={FEED_ITEM_HEIGHT}
            width={width}
            insets={insets}
            openModal={openModal}
            openComments={openComments}
            openSellerProfile={openSellerProfile}
            videoRef={(ref) => {
              if (ref) videoRefs.current[item.id] = ref;
              else delete videoRefs.current[item.id];
            }}
            setProducts={setProducts as any}
            onAddToCart={handleAddToCart as any}
            onPlaceOrder={handlePlaceOrder}
            onShare={handleShare}
            showAlert={showAlert}
            theme={theme}
          />
        )}
        keyExtractor={item => item.id}
        pagingEnabled
        snapToAlignment="start"
        snapToInterval={FEED_ITEM_HEIGHT}
        decelerationRate="fast"
        showsVerticalScrollIndicator={false}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        ListFooterComponent={loadingMore ? (
          <View style={styles.loadingFooter}>
            <ActivityIndicator size="small" color={theme.primary} />
            <Text style={[styles.loadingFooterText, { color: theme.textSecondary }]}>Loading more...</Text>
          </View>
        ) : null}
        ListEmptyComponent={!loadingInitial ? (
          <View style={[styles.emptyState, { backgroundColor: theme.background }]}>
            <Ionicons name="search-outline" size={80} color={theme.primary} />
            <Text style={[styles.emptyTitle, { color: theme.text }]}>No products found</Text>
            <Text style={[styles.emptySubtitle, { color: theme.textSecondary }]}>
              {userUniversity
                ? `No products available in ${userUniversity}`
                : 'No products available at your campus'}
            </Text>
          </View>
        ) : null}
        getItemLayout={(_, index) => ({ length: FEED_ITEM_HEIGHT, offset: FEED_ITEM_HEIGHT * index, index })}
      />
      
      <ProductDetailModal
        isVisible={modalVisible}
        onClose={() => {
          setModalVisible(false);
          if (params.productId) {
            router.setParams({});
            setProductFromQuery(null);
          }
        }}
        product={selectedProduct || productFromQuery}
        onOpenFullViewer={setFullViewerIndex}
        onSelectSimilarProduct={handleSelectSimilarProduct as any}
        onAddToCart={handleAddToCart as any}
        isInCart={() => cartItems.some(item => item.product.id === (selectedProduct?.id || productFromQuery?.id))}
        cartItems={cartItems}
        onPlaceOrder={handlePlaceOrder}
        fromCart={modalFromCart}
        fromSellerProfile={modalFromSellerProfile}
        showAlert={showAlert}
        theme={theme}
      />
      
      <CommentsModal 
        isVisible={commentsVisible} 
        onClose={() => setCommentsVisible(false)} 
        product={selectedProduct}
        showAlert={showAlert}
        theme={theme}
      />
      <FullImageViewer 
        isVisible={fullViewerIndex !== -1} 
        onClose={() => setFullViewerIndex(-1)} 
        mediaUrls={selectedProduct?.media_urls || []} 
        initialIndex={fullViewerIndex}
        theme={theme}
      />
      
      <SellerProfileModal
        isVisible={sellerProfileVisible}
        onClose={() => setSellerProfileVisible(false)}
        sellerId={selectedSellerId}
        onOpenProduct={openProductFromSeller as any}
        onAddToCart={handleAddToCart as any}
        onPlaceOrder={handlePlaceOrder}
        showAlert={showAlert}
        theme={theme}
      />
      
      <CartModal
        isVisible={cartVisible}
        onClose={() => setCartVisible(false)}
        cartItems={cartItems}
        onUpdateQuantity={handleUpdateQuantity as any}
        onRemoveItem={handleRemoveFromCart as any}
        onClearCart={handleClearCart}
        onViewProduct={(product, fromCart) => openModal(product, fromCart, false)}
        onPlaceOrder={handleCartPlaceOrder}
        showAlert={showAlert}
        theme={theme}
      />

     <OrderFormModal
       isVisible={orderFormVisible}
       onClose={() => setOrderFormVisible(false)}
       product={orderForProduct}
       onSubmitOrder={handleSubmitOrder}
       isCartOrder={isCartOrder}
       cartTotal={getCartTotal()}
       cartItems={cartItems} // Add this prop
       showAlert={showAlert}
       initialSelectedColor={orderInitialOptions?.selectedColor ?? null}
       initialSelectedSize={orderInitialOptions?.selectedSize ?? null}
       initialQuantity={orderInitialOptions?.quantity ?? null}
       theme={theme}
     />
     
      {/* Using the fixed OrderProductDetailModal component */}
      <OrderProductDetailModal
        isVisible={orderProductModalVisible}
        onClose={() => {
          setOrderProductModalVisible(false);
          setSelectedOrder(null);
          setSelectedOrderProduct(null);
        }}
        product={selectedOrderProduct}
        order={selectedOrder}
        onOpenFullViewer={setFullViewerIndex}
        onContactSeller={() => {
          setOrderProductModalVisible(false);
          setContactSellerVisible(true);
        }}
        onCancelOrder={handleCancelOrder}
        showAlert={showAlert}
        theme={theme}
      />
     
      <OrdersScreenModal
        isVisible={ordersModalVisible}
        onClose={() => setOrdersModalVisible(false)}
        onViewProductDetails={handleViewProductDetails}
        showAlert={showAlert}
        theme={theme}
      />
     
      <ContactSellerModal
        isVisible={contactSellerVisible}
        onClose={() => {
          setContactSellerVisible(false);
          if (selectedOrder) {
            setOrderProductModalVisible(true);
          } else {
            setModalVisible(true);
          }
        }}
        product={selectedProduct}
        order={selectedOrder}
        onReopenProductModal={() => {
          if (selectedOrder) {
            setOrderProductModalVisible(true);
          } else {
            setModalVisible(true);
          }
        }}
        showAlert={showAlert}
        theme={theme}
      />
    </View>
  );
}

// === ALL STYLES ===
const styles = StyleSheet.create({
  // Alert Styles
  alertOverlay: {flex: 1,justifyContent: 'center',alignItems: 'center',zIndex: 9999,},
  alertContainer: {borderRadius: 15,padding: 20,width: '85%',maxWidth: 400,borderWidth: 1,},
  alertTitle: {fontSize: 20,fontWeight: 'bold',marginBottom: 10,textAlign: 'center',},
  alertMessage: {fontSize: 16,marginBottom: 20,textAlign: 'center',lineHeight: 22,},
  alertButtons: {flexDirection: 'row',justifyContent: 'space-between',gap: 10,},
  alertButton: {flex: 1,padding: 14,borderRadius: 10,alignItems: 'center',},
  alertButtonPrimary: { // Background color set dynamically
},
  alertButtonSecondary: {borderWidth: 1,},
  alertButtonText: {fontSize: 16,fontWeight: '600',},
  alertButtonPrimaryText: {
    // Color set dynamically
  },
  alertButtonSecondaryText: {
    // Color set dynamically
  },
  // Calendar Filter Styles
  calendarOverlay: {flex: 1,justifyContent: 'flex-end',},
  calendarContainer: {borderTopLeftRadius: 20,borderTopRightRadius: 20,height: '85%',},
  calendarHeader: {flexDirection: 'row',justifyContent: 'space-between',alignItems: 'center',padding: 15,borderBottomWidth: 1,},
  calendarCloseButton: {padding: 5,},
  calendarTitle: {fontSize: 18,fontWeight: 'bold',},
  calendarContent: {flex: 1,},
  quickFiltersContainer: {padding: 15,borderBottomWidth: 1,borderBottomColor: 'rgba(0,0,0,0.1)',},
  sectionTitle: {fontSize: 16,fontWeight: 'bold',marginBottom: 10,},
  quickFiltersGrid: {flexDirection: 'row',gap: 10,marginBottom: 5,},
  quickFilterButton: { flex: 1, flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 10, justifyContent: 'center', gap: 8,},
  quickFilterActive: {
    // Background color set dynamically
  },
  quickFilterText: {fontSize: 14,fontWeight: '600',},
  viewModeContainer: {padding: 15,borderBottomWidth: 1,borderBottomColor: 'rgba(0,0,0,0.1)',},
  viewModeButtons: {flexDirection: 'row',gap: 10,},
  viewModeButton: {
    flex: 1,
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  viewModeButtonActive: {
    // Background color set dynamically
  },
  viewModeButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  selectionDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    margin: 15,
    borderRadius: 10,
    borderWidth: 1,
    gap: 10,
  },
  selectionText: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  calendarNavigation: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  currentDateText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  calendarViewContainer: {
    padding: 15,
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  calendarWeekday: {
    width: '14.28%',
    textAlign: 'center',
    paddingVertical: 10,
    fontSize: 12,
    fontWeight: '600',
  },
  calendarDay: {
    width: '14.28%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    marginVertical: 2,
  },
  calendarDayOtherMonth: {
    opacity: 0.3,
  },
  calendarDaySelected: {
    // Background color set dynamically
  },
  calendarDayToday: {
    borderWidth: 2,
  },
  calendarDayText: {
    fontSize: 12,
    fontWeight: '600',
  },
  calendarDaySelectedText: {
    color: '#fff',
  },
  weekViewContainer: {
    padding: 10,
  },
  weekRangeText: {
    textAlign: 'center',
    fontSize: 14,
    marginBottom: 15,
  },
  weekSelector: {
    padding: 15,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 15,
  },
  weekSelected: {
    // Background color set dynamically
  },
  weekSelectorText: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  weekDaysGrid: {
    flexDirection: 'row',
    gap: 5,
  },
  weekDay: {
    flex: 1,
    padding: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  weekDaySelected: {
    // Background color set dynamically
  },
  weekDayToday: {
    borderWidth: 2,
  },
  weekDayName: {
    fontSize: 12,
    marginBottom: 5,
  },
  weekDayNumber: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  weekDaySelectedText: {
    color: '#fff',
  },
  monthViewContainer: {
    padding: 10,
  },
  yearSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
    paddingHorizontal: 20,
  },
  yearText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  monthRangeSelector: {
    padding: 15,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 15,
  },
  monthRangeSelected: {
    // Background color set dynamically
  },
  monthRangeText: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  monthsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'center',
  },
  monthCell: {
    width: '23%',
    aspectRatio: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 10,
    marginVertical: 5,
  },
  monthCellSelected: {
    // Background color set dynamically
  },
  monthCellCurrent: {
    borderWidth: 2,
  },
  monthText: {
    fontSize: 14,
    fontWeight: '600',
  },
  monthCellSelectedText: {
    color: '#fff',
  },
  yearViewContainer: {
    padding: 10,
  },
  yearNavigation: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
    paddingHorizontal: 20,
  },
  yearRangeText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  yearQuickFilter: {
    padding: 15,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 15,
  },
  yearQuickFilterSelected: {
    // Background color set dynamically
  },
  yearQuickFilterText: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  yearsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'center',
  },
  yearCell: {
    width: '30%',
    aspectRatio: 2,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 10,
    marginVertical: 5,
  },
  yearCellSelected: {
    // Background color set dynamically
  },
  yearCellCurrent: {
    borderWidth: 2,
  },
  yearCellText: {
    fontSize: 16,
    fontWeight: '600',
  },
  yearCellSelectedText: {
    color: '#fff',
  },
  instructions: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    margin: 15,
    borderRadius: 10,
    gap: 10,
  },
  instructionsText: {
    fontSize: 12,
    flex: 1,
    lineHeight: 16,
  },
  calendarActions: {
    flexDirection: 'row',
    padding: 15,
    borderTopWidth: 1,
    gap: 10,
  },
  calendarButton: {
    flex: 1,
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  cancelButton: {
    borderWidth: 1,
  },
  applyButton: {
    // Background color set dynamically
  },
  calendarButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  
  // Loading
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingFooter: { height: 60, justifyContent: 'center', alignItems: 'center' },
  loadingFooterText: { fontSize: 14, marginTop: 5 },
  
  // Empty State
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 100 },
  emptyTitle: { fontSize: 18, fontWeight: '600', marginTop: 16 },
  emptySubtitle: { fontSize: 14, marginTop: 8, textAlign: 'center', paddingHorizontal: 40 },
  
  // Header
  header: { position: 'absolute', top: 20, left: 0, right: 0, zIndex: 100, flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 15, paddingBottom: 10,  },
  headerIcon: { padding: 5, position: 'relative' },
  cartBadge: { position: 'absolute', top: -5, right: -5, borderRadius: 10, minWidth: 20, height: 20, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 4 },
  cartBadgeText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  ordersBadge: {  position: 'absolute',  top: -5,  right: -5,  borderRadius: 10,  minWidth: 20,  height: 20,  justifyContent: 'center',  alignItems: 'center', paddingHorizontal: 4, zIndex: 10,},
  ordersBadgeText: { color: '#fff', fontSize: 10, fontWeight: 'bold',},
  
  // Left Sidebar
  leftSidebar: { marginTop: 170,position: 'absolute',left: 12,zIndex: 10,alignItems: 'center',},
  leftSidebarItem: {marginBottom: 20,alignItems: 'center',},
  leftSidebarText: {fontSize: 13,marginTop: 4,fontWeight: '600',textShadowColor: 'rgba(0,0,0,0.7)',textShadowRadius: 6,},
  // Feed Card
  mediaContainer: {
    ...StyleSheet.absoluteFillObject, zIndex: 1, justifyContent: 'center', alignItems: 'center',backgroundColor: '#000',},
  mainMediaImage: { width: '100%', height: '100%',alignSelf: 'center',},
  videoStyle: {width: '100%',height: '100%',alignSelf: 'center',},
  videoWrapper: {flex: 1,width: '100%',justifyContent: 'center',alignItems: 'center',backgroundColor: '#000',},
  doubleTapHeart: { position: 'absolute', opacity: 0.9 },
  gradientOverlay: { position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 2 },
  
  // Right Sidebar
  rightSidebar: { position: 'absolute', right: 12, zIndex: 10, alignItems: 'center' },
  sidebarItem: { marginBottom: 25, alignItems: 'center' },
  avatarBorder: { borderWidth: 2, borderRadius: 30, padding: 1.5 },
  sidebarAvatar: { width: 45, height: 45, borderRadius: 22.5, backgroundColor: '#000' },
  followButton: { position: 'absolute', bottom: -15, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8, borderWidth: 1 },
  followText: { fontSize: 10, fontWeight: 'bold' },
  followingText: { fontSize: 10, fontWeight: 'bold' },
  shadowIcon: { textShadowColor: 'rgba(0,0,0,0.7)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 6 },
  sidebarText: { fontSize: 13, marginTop: 4, fontWeight: '600', textShadowColor: 'rgba(0,0,0,0.7)', textShadowRadius: 6 },
  discountBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 15, marginBottom: 25 },
  discountText: { color: '#fff', fontWeight: '900', fontSize: 14 },
  
  // Bottom Info
  bottomInfoContainer: { position: 'absolute', left: 18, zIndex: 10 ,marginBottom: 25},
  titleTeaser: { fontSize: 18, fontWeight: '500', marginBottom: 5, textShadowColor: 'rgba(0,0,0,0.7)', textShadowRadius: 5 },
  userInfoColumn: { flexDirection: 'column', alignItems: 'flex-start', marginBottom: 8 },
  username: { fontWeight: '700', fontSize: 17, textShadowColor: 'rgba(0,0,0,0.7)', textShadowRadius: 5 },
  universityText: { fontSize: 14, fontWeight: '500', marginTop: 2, textShadowColor: 'rgba(0,0,0,0.7)', textShadowRadius: 3 },
  viewProductButton: {  alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 9, marginVertical: 4 },
  viewProductButtonText: { fontWeight: '700', fontSize: 13 },
  
  // Product Detail Modal
  modalCenteredView: { flex: 1, justifyContent: 'flex-end' },
  modalModalView: { borderTopLeftRadius: 20, borderTopRightRadius: 20, height: '90%', paddingTop: 15 },
  modalScrollContent: { paddingBottom: 100 },
  modalCloseButton: { position: 'absolute', top: 10, right: 15, zIndex: 20, borderRadius: 15, padding: 5 },
  modalMediaContainer: { position: 'relative', marginBottom: 15, borderBottomWidth: 1 },
  modalVideoOverlay: { position: 'absolute', top: '50%', left: '50%', transform: [{ translateX: -30 }, { translateY: -30 }], zIndex: 10 },
  tiktokPlayButton: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', alignItems: 'center' },
  tiktokPlayButtonSmall: { width: 56, height: 56, borderRadius: 28, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', alignItems: 'center' },
  tiktokPlayThumbnailOverlay: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, justifyContent: 'center', alignItems: 'center' },
  mediaCounterBadge: { position: 'absolute', bottom: 12, right: 12, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, zIndex: 5 },
  mediaCounterText: { fontSize: 12, fontWeight: '600' },
  modalPaginationDots: { position: 'absolute', bottom: 10, width: '100%', flexDirection: 'row', justifyContent: 'center' },
  modalDot: { width: 8, height: 8, borderRadius: 4, marginHorizontal: 4 },
  modalActiveDot: {
    // Background color set dynamically
  },
  modalInactiveDot: {
    // Background color set dynamically
  },
  modalDetailsContainer: { padding: 18 },
  modalTitle: { fontSize: 26, fontWeight: 'bold', marginBottom: 15 },
  modalPriceRow: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 20 },
  modalCurrency: { fontSize: 18, fontWeight: '600' },
  modalPrice: { fontSize: 36, fontWeight: '900' },
  modalOldPrice: { fontSize: 18, textDecorationLine: 'line-through', marginLeft: 15, marginBottom: 4 },
  modalDiscountBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 15, marginLeft: 10, marginBottom: 4 },
  modalDiscountText: { color: '#ef8103ff', fontWeight: '900', fontSize: 13 },
  modalSectionTitle: { fontSize: 20, fontWeight: '700', marginTop: 15, marginBottom: 10, borderBottomWidth: 1, paddingBottom: 5 },
  modalDescription: { fontSize: 16, lineHeight: 26, marginBottom: 20 },
  modalSellerInfo: { flexDirection: 'row', alignItems: 'center', marginTop: 20, paddingTop: 20, borderTopWidth: 1 },
  modalSellerAvatar: { width: 45, height: 45, borderRadius: 27.5, marginRight: 15, borderWidth: 2 },
  modalSellerTextContainer: { flex: 1, marginLeft: 15 },
  modalSellerName: { fontWeight: '700', fontSize: 17 },
  modalSellerUniversity: { fontSize: 14 },
  modalActionBar: { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', borderTopWidth: 1, paddingHorizontal: 15, paddingVertical: 12,justifyContent: 'space-between',alignItems: 'center',},
  modalContactButton: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 15,paddingVertical: 12,borderRadius: 10,flex: 1,marginRight: 8,},
  modalContactButtonText: { fontWeight: 'bold', fontSize: 14, marginLeft: 6 },
  modalAddToCartButton: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 12,paddingVertical: 12,borderRadius: 10,marginHorizontal: 4,minWidth: 100,},
  modalInCartButton: { backgroundColor: '#4CAF50' },
  modalAddToCartButtonText: { fontWeight: 'bold', fontSize: 14, marginLeft: 6 },
  modalPlaceOrderButton: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 15,paddingVertical: 12,borderRadius: 10,flex: 1,marginLeft: 8,},
  modalPlaceOrderButtonText: { fontWeight: 'bold', fontSize: 14, marginLeft: 6 },
  
  // Modal Loading
  modalLoadingContainer: {flex: 1,justifyContent: 'center',alignItems: 'center',padding: 40,},
  modalLoadingText: {fontSize: 16,marginTop: 20,},
  
  // Order Status Badge
  orderStatusBadge: {alignSelf: 'flex-start',paddingHorizontal: 12,paddingVertical: 6,borderRadius: 6,marginBottom: 15,},
  orderStatusText: {color: '#fff',fontSize: 12,fontWeight: '600',},
  // Order Information Section
  orderInfoSection: {marginTop: 20,paddingTop: 20,borderTopWidth: 1,},
  orderInfoRow: {flexDirection: 'row',alignItems: 'center',marginBottom: 12,flexWrap: 'wrap',},
  orderInfoLabel: {fontSize: 14,marginLeft: 8,marginRight: 4,width: 70,},
  orderInfoValue: {fontSize: 14,flex: 1,flexWrap: 'wrap',},
  // Cancel Order Button
  modalCancelOrderButton: {flexDirection: 'row',justifyContent: 'center',alignItems: 'center',paddingHorizontal: 15,paddingVertical: 12,borderRadius: 10,flex: 1,marginLeft: 8,},
  modalCancelOrderButtonText: {color: '#fff',fontWeight: 'bold',fontSize: 14,marginLeft: 6,},
  // Full Image/Video Viewer
  fullViewerContainer: { flex: 1 },
  fullViewerCloseButton: { position: 'absolute', top: 40, left: 20, zIndex: 10, padding: 10, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 25 },
  fullViewerMediaSlide: { width: screenWidth, height: screenHeight, justifyContent: 'center', alignItems: 'center' },
  fullViewerMediaImage: { width: '100%', height: '100%' },
  fullViewerPaginationText: { position: 'absolute', bottom: 30, color: '#fff', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 10, fontSize: 16, fontWeight: 'bold' },
  
  // Comments Modal
  commentsCenteredView: { flex: 1, justifyContent: 'flex-end' },
  commentsModalView: { borderTopLeftRadius: 20, borderTopRightRadius: 20, height: '90%' },
  commentsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 15, borderBottomWidth: 1, marginTop: 10 },
  commentsTitle: { fontSize: 18, fontWeight: 'bold' },
  commentsCommentContainer: { flexDirection: 'row', paddingVertical: 12, paddingHorizontal: 15, borderBottomWidth: 1 },
  commentsCommentAvatar: { width: 38, height: 38, borderRadius: 19, marginRight: 12, borderWidth: 1.5 },
  commentsCommentContent: { flex: 1 },
  commentsCommentUser: { fontWeight: 'bold', fontSize: 14.5 },
  commentsCommentTime: { fontSize: 12 },
  commentsCommentText: { fontSize: 15, marginTop: 2, lineHeight: 20 },
  commentsEmptyText: { textAlign: 'center', marginTop: 30, fontSize: 16 },
  commentsInputContainer: { flexDirection: 'row', alignItems: 'center', padding: 15, borderTopWidth: 1 },
  commentsInput: { flex: 1, borderRadius: 25, paddingHorizontal: 18, paddingVertical: 12, fontSize: 16, maxHeight: 100 },
  commentsSubmitButton: { marginLeft: 10, width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center' },
  
  // Seller Profile Modal
  sellerProfileOverlay: { flex: 1, justifyContent: 'flex-end' },
  sellerProfileModal: { borderTopLeftRadius: 20, borderTopRightRadius: 20, height: '97%' },
  sellerProfileHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 15, borderBottomWidth: 1 },
  sellerProfileCloseButton: { padding: 5 },
  sellerProfileTitle: { fontSize: 18, fontWeight: 'bold' },
  sellerProfileLoading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  sellerProfileLoadingText: { marginTop: 10, fontSize: 16 },
  sellerProfileContainer: { flex: 1 },
  sellerInfoSection: { padding: 20, alignItems: 'center' },
  sellerProfileAvatar: { width: 100, height: 100, borderRadius: 50, borderWidth: 3, marginBottom: 15 },
  sellerProfileName: { fontSize: 22, fontWeight: 'bold', marginBottom: 5, textAlign: 'center' },
  sellerProfileUniversity: { fontSize: 16, marginBottom: 15, textAlign: 'center' },
  sellerStatsContainer: { flexDirection: 'row', justifyContent: 'space-around', width: '100%', paddingHorizontal: 20 },
  sellerStatItem: { alignItems: 'center' },
  sellerStatNumber: { fontSize: 20, fontWeight: 'bold' },
  sellerStatLabel: { fontSize: 14, marginTop: 4 },
  sellerEmptyProducts: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  sellerEmptyProductsText: { fontSize: 18, marginTop: 20 },
  sellerEmptyProductsSubtext: { fontSize: 14, marginTop: 10, textAlign: 'center' },
  sellerProductsGrid: { paddingHorizontal: 10, paddingTop: 20 },
  sellerProductGridItem: { flex: 1, margin: 5, borderRadius: 10, overflow: 'hidden', minWidth: 160 },
  sellerProductGridImage: { width: '100%', height: 140 },
  sellerVideoIcon: { position: 'absolute', top: 8, right: 8, backgroundColor: 'rgba(0,0,0,0.6)', padding: 6, borderRadius: 20 },
  sellerProductGridInfo: { padding: 10 },
  sellerProductGridTitle: { fontSize: 13, fontWeight: '600', marginBottom: 5, height: 36 },
  sellerProductGridPrice: { fontSize: 16, fontWeight: 'bold' },
  sellerProductGridActions: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  sellerProductGridCartButton: { padding: 6, borderRadius: 15 },
  sellerProductGridOrderButton: { padding: 6, borderRadius: 15 },
  
  // Similar Products
  similarContainer: {marginTop: 25,paddingTop: 20,borderTopWidth: 1,},
  similarTitle: {fontSize: 18,fontWeight: 'bold',marginBottom: 15,marginLeft: 5,},
  similarLoadingContainer: {height: 200,justifyContent: 'center',alignItems: 'center',},
  similarLoadingText: { fontSize: 14,marginTop: 10,},
  similarNoneText: {fontSize: 14,textAlign: 'center',paddingVertical: 20,fontStyle: 'italic',},
  similarListContent: {paddingHorizontal: 5,paddingBottom: 10,},
  similarProductCard: {width: 160,borderRadius: 12,marginRight: 12,overflow: 'hidden',borderWidth: 1,},
  similarProductImage: {width: '100%',height: 140,},
  similarProductPlaceholder: {justifyContent: 'center',alignItems: 'center',},
  similarVideoIcon: {position: 'absolute',top: 8,right: 8,backgroundColor: 'rgba(0,0,0,0.6)',padding: 5,borderRadius: 15,},
  similarProductInfo: {padding: 10,position: 'relative',},
  similarProductTitle: {fontSize: 13,fontWeight: '600',marginBottom: 8,height: 36,},
  similarPriceRow: {flexDirection: 'row',alignItems: 'center',marginBottom: 8,},
  similarCurrency: {fontSize: 10,fontWeight: '600',},
  similarPrice: {fontSize: 16,fontWeight: 'bold',},
  similarOldPrice: {fontSize: 11,textDecorationLine: 'line-through',marginLeft: 6,},
  similarDiscountBadge: {paddingHorizontal: 6,paddingVertical: 2,borderRadius: 10,marginLeft: 6,},
  similarDiscountText: {color: '#f19603ff',fontSize: 10,fontWeight: 'bold',},
  similarSellerRow: {flexDirection: 'row',alignItems: 'center',marginTop: 5,},
  similarSellerAvatar: {width: 22,height: 22,borderRadius: 11,marginRight: 6,borderWidth: 1,},
  similarSellerName: {fontSize: 11,flex: 1,},
  similarAddToCartButton: {position: 'absolute',bottom: 10,right: 10,padding: 6,borderRadius: 15, },
  
  // Cart Modal
  cartOverlay: { flex: 1, justifyContent: 'flex-end' },
  cartModal: { borderTopLeftRadius: 20, borderTopRightRadius: 20, height: '90%' },
  cartHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 15, borderBottomWidth: 1 },
  cartTitle: { fontSize: 18, fontWeight: 'bold', flex: 1, textAlign: 'center' },
  cartCloseButton: { padding: 5 },
  cartClearButton: { padding: 5 },
  cartClearText: { fontSize: 14 },
  cartEmptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20 },
  cartEmptyTitle: { fontSize: 24, fontWeight: 'bold', marginTop: 20, marginBottom: 10 },
  cartEmptyText: { fontSize: 16, textAlign: 'center', marginBottom: 30 },
  cartContinueButton: { paddingHorizontal: 30, paddingVertical: 12, borderRadius: 25 },
  cartContinueButtonText: { fontWeight: 'bold', fontSize: 16 },
  cartListContent: { padding: 15 },
  cartItem: { flexDirection: 'row', borderRadius: 12, marginBottom: 12, padding: 10 },
  cartItemImage: { width: 80, height: 80, borderRadius: 8 },
  cartItemInfo: { flex: 1, marginLeft: 15, justifyContent: 'space-between' },
  cartItemTitle: { fontSize: 14, fontWeight: '600' },
  cartItemSeller: { fontSize: 12, marginTop: 2 },
  cartItemPrice: { fontSize: 16, fontWeight: 'bold', marginTop: 4 },
  cartQuantityContainer: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  cartQuantityButton: { width: 30, height: 30, borderRadius: 15, justifyContent: 'center', alignItems: 'center' },
  cartQuantityDisplay: { width: 40, alignItems: 'center' },
  cartQuantityText: { fontSize: 16, fontWeight: 'bold' },
  cartRemoveButton: { marginLeft: 15, padding: 6 },
  cartFooter: { borderTopWidth: 1, padding: 15 },
  cartTotalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  cartTotalLabel: { fontSize: 18, fontWeight: 'bold' },
  cartTotalAmount: { fontSize: 22, fontWeight: 'bold' },
  cartPlaceOrderButton: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', padding: 16, borderRadius: 12 },
  cartPlaceOrderButtonText: { fontWeight: 'bold', fontSize: 16, marginLeft: 8 },
  
  // Share Modal
  shareOverlay: {flex: 1,justifyContent: 'flex-end',},
  shareContainer: {borderTopLeftRadius: 20,borderTopRightRadius: 20,padding: 20,paddingBottom: 30, },
  shareHeader: {flexDirection: 'row',justifyContent: 'space-between',alignItems: 'center',marginBottom: 20,},
  shareTitle: {fontSize: 18,fontWeight: 'bold',},
  shareProductPreview: {flexDirection: 'row',borderRadius: 12,padding: 12,marginBottom: 15,alignItems: 'center',},
  sharePreviewImage: {width: 60,height: 60,borderRadius: 8,marginRight: 12,},
  sharePreviewPlaceholder: {justifyContent: 'center',alignItems: 'center',},
  sharePreviewInfo: {flex: 1,},
  shareProductTitle: {fontSize: 16,fontWeight: '600',marginBottom: 5,},
  shareProductPrice: {fontSize: 18,fontWeight: 'bold',marginBottom: 5,},
  shareSourceText: {fontSize: 10,marginTop: 2,},
  productLinkContainer: {borderRadius: 12,padding: 15,marginBottom: 15,borderWidth: 1},
  productLinkLabel: {fontSize: 14,fontWeight: 'bold',marginBottom: 8,},
  productLinkExample: {fontSize: 11,marginBottom: 5,fontFamily: 'monospace',},
  productLinkButton: {flexDirection: 'row',alignItems: 'center',padding: 12,borderRadius: 8,marginBottom: 8,},
  productLinkText: {fontSize: 13,flex: 1,},
  shareInstructions: {fontSize: 12,textAlign: 'center',marginBottom: 20,fontStyle: 'italic',paddingHorizontal: 20,},
  shareNote: {fontSize: 10,textAlign: 'center',marginTop: 10,paddingHorizontal: 20,},
  shareDiscountBadge: {paddingHorizontal: 8,paddingVertical: 3,borderRadius: 6,alignSelf: 'flex-start',  marginTop: 4,},
  shareDiscountText: {color: '#fff',fontSize: 10,fontWeight: 'bold',},
  shareGrid: {flexDirection: 'row',flexWrap: 'wrap',justifyContent: 'space-between',marginBottom: 20,},
  shareOption: {alignItems: 'center',width: '30%',marginBottom: 20,},
  shareIconContainer: {width: 60,height: 60,borderRadius: 30,justifyContent: 'center',alignItems: 'center',marginBottom: 8,},
  shareOptionText: {fontSize: 12,textAlign: 'center',},
  moreOptionsButton: {flexDirection: 'row',alignItems: 'center',justifyContent: 'center',padding: 15,borderRadius: 10,},
  moreOptionsText: {color: '#fff',fontSize: 16,fontWeight: 'bold',marginLeft: 10,},
  // Order Form Modal
  orderFormOverlay: {flex: 1,justifyContent: 'flex-end',},
  orderFormContainer: {borderTopLeftRadius: 20,borderTopRightRadius: 20,height: '85%',},
  orderFormHeader: {flexDirection: 'row',justifyContent: 'space-between',alignItems: 'center',padding: 15,borderBottomWidth: 1,},
  orderFormCloseButton: { padding: 5 },
  orderFormTitle: {fontSize: 18,fontWeight: 'bold',},
  orderFormContent: {flex: 1,padding: 20,},
  orderFormSection: {marginBottom: 25,},
  orderFormSectionTitle: {fontSize: 16,fontWeight: 'bold',marginBottom: 15,},
  formGroup: {marginBottom: 20,},
  formLabel: {fontSize: 14,fontWeight: '600',marginBottom: 8,},
  formInput: {borderRadius: 10,padding: 15,fontSize: 16,borderWidth: 1,},
  phoneInputContainer: {flexDirection: 'row',alignItems: 'center',},
  countryCodeContainer: {padding: 15,borderTopLeftRadius: 10,borderBottomLeftRadius: 10,borderWidth: 1,borderRightWidth: 0,marginRight: -1,},
  countryCodeText: {fontSize: 16,fontWeight: 'bold',},
  phoneInput: {flex: 1,borderTopLeftRadius: 0,borderBottomLeftRadius: 0,borderLeftWidth: 0,},
  errorText: {fontSize: 12,marginTop: 5,},
  helperText: {fontSize: 12,marginTop: 5,},
  textArea: {minHeight: 100,textAlignVertical: 'top',},
  deliveryOption: {flexDirection: 'row',alignItems: 'center',borderRadius: 10,padding: 15,marginBottom: 10,borderWidth: 1,},
  deliveryOptionSelected: {},
  deliveryOptionRadio: {width: 24,height: 24,borderRadius: 12,borderWidth: 2,marginRight: 15,justifyContent: 'center',alignItems: 'center',},
  deliveryOptionRadioSelected: {width: 12,height: 12,borderRadius: 6,},
  deliveryOptionContent: {flexDirection: 'row',alignItems: 'center',flex: 1,},
  deliveryOptionText: {marginLeft: 15,flex: 1,},
  deliveryOptionTitle: {fontSize: 16,fontWeight: 'bold',marginBottom: 2,},
  deliveryOptionDescription: {fontSize: 12,},
  orderTotalSection: {borderRadius: 10,padding: 15,alignItems: 'center',marginVertical: 15,},
  orderTotalText: {fontSize: 20,fontWeight: 'bold',},
  orderFormFooter: {padding: 20,borderTopWidth: 1,},
  submitOrderButton: {flexDirection: 'row',justifyContent: 'center',alignItems: 'center', padding: 18,borderRadius: 10,},
  submitOrderButtonDisabled: {opacity: 0.7,},
  submitOrderLoading: {flexDirection: 'row',alignItems: 'center',},
  submitOrderButtonText: {color: '#fff',fontSize: 16,fontWeight: 'bold',marginLeft: 10,},
  // Orders Modal Styles
  ordersModalContainer: {flex: 1,justifyContent: 'flex-end',},
  ordersModalContent: {borderTopLeftRadius: 20,borderTopRightRadius: 20,height: '90%',},
  ordersModalHeader: {flexDirection: 'row',justifyContent: 'space-between',alignItems: 'center',padding: 15,borderBottomWidth: 1,},
  ordersCloseButton: { padding: 5 },
  ordersModalTitle: {fontSize: 18,fontWeight: 'bold',},
  ordersLoadingContainer: {flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20,},
  ordersLoadingText: {marginTop: 10,fontSize: 16,},
  ordersEmptyState: {flex: 1,justifyContent: 'center',alignItems: 'center',paddingHorizontal: 40,},
  ordersEmptyText: {marginTop: 12,fontSize: 16,fontWeight: '600',},
  ordersEmptySubtext: {marginTop: 8,textAlign: 'center',lineHeight: 20,},
  ordersContinueButton: {paddingHorizontal: 30,paddingVertical: 12,borderRadius: 25,marginTop: 20,},
  ordersContinueButtonText: {color: '#fff',fontWeight: 'bold',fontSize: 16,},
  ordersListContainer: {padding: 16,},
  orderCard: { borderRadius: 12,marginBottom: 12,padding: 16,shadowOffset: { width: 0, height: 2 },shadowOpacity: 0.1,shadowRadius: 4,elevation: 3,},
  orderHeader: {flexDirection: 'row',justifyContent: 'space-between',alignItems: 'center',marginBottom: 12,},
  orderInfo: {flex: 1,},
  orderId: {fontSize: 16,fontWeight: 'bold',marginBottom: 2,},
  orderDate: {fontSize: 12,},
  statusBadge: {paddingHorizontal: 12,paddingVertical: 6,borderRadius: 6,},
  statusText: {color: '#fff',fontSize: 12,fontWeight: '600',},
  orderContent: {flexDirection: 'row',marginBottom: 12,},
  orderProductImage: {width: 80,height: 80,borderRadius: 8,marginRight: 12,},
  orderDetails: {flex: 1,},
  orderProductTitle: {fontSize: 16,fontWeight: '600',marginBottom: 4,},
  orderProductPrice: {fontSize: 18,fontWeight: 'bold',marginBottom: 8,},
  sellerInfo: {flexDirection: 'row',alignItems: 'center',marginBottom: 8,},
  sellerAvatar: {width: 30,height: 30,borderRadius: 15,marginRight: 8,},
  sellerName: {fontSize: 14,fontWeight: '600',},
  orderDeliveryInfo: {fontSize: 12,},
  orderFooter: {flexDirection: 'row',justifyContent: 'space-between',alignItems: 'center',borderTopWidth: 1,paddingTop: 12,},
  orderItemsCount: { fontSize: 12, },
  orderActionButton: {flexDirection: 'row',alignItems: 'center',paddingHorizontal: 12,paddingVertical: 6,borderRadius: 6,minWidth: 120,justifyContent: 'center',gap: 6,},
  cancelOrderButton: {},
  orderActionButtonText: {color: '#fff',fontSize: 12,fontWeight: '600',},
  notificationCountBadge: {fontSize: 14,fontWeight: '600',},
  // Calendar Filter Button in Sort/Filter Menu
  calendarFilterButton: {flexDirection: 'row',alignItems: 'center',padding: 15,borderRadius: 10,borderWidth: 1,gap: 12,},
  calendarFilterButtonTextContainer: {flex: 1,},
  calendarFilterButtonTitle: {fontSize: 14,fontWeight: '600',marginBottom: 2,},
  calendarFilterButtonSubtitle: {fontSize: 12,},
  // Contact Seller Modal Styles
  contactOverlay: {flex: 1,justifyContent: 'flex-end',},
  contactModal: {borderTopLeftRadius: 20,borderTopRightRadius: 20,height: '85%',},
  contactHeader: {flexDirection: 'row',justifyContent: 'space-between',alignItems: 'center',padding: 15,borderBottomWidth: 1,},
  contactCloseButton: { padding: 5 },
  contactTitle: {fontSize: 18,fontWeight: 'bold',},
  contactContent: {flex: 1,},
  contactLoading: {flex: 1,justifyContent: 'center',alignItems: 'center',padding: 20,},
  contactLoadingText: {marginTop: 10,fontSize: 16,},
  contactUnavailable: {flex: 1,justifyContent: 'center',alignItems: 'center',paddingHorizontal: 30,},
  contactUnavailableTitle: {fontSize: 20,fontWeight: 'bold',marginTop: 15,marginBottom: 10,},
  contactUnavailableText: {fontSize: 16,textAlign: 'center',lineHeight: 22,marginBottom: 25,},
  contactUnavailableSubtext: {fontSize: 14,textAlign: 'center',marginBottom: 25,},
  contactContinueButton: {paddingHorizontal: 30,paddingVertical: 12,borderRadius: 25,marginTop: 20,},
  contactContinueButtonText: {fontWeight: 'bold',fontSize: 16,},
  sellerInfoCard: {borderRadius: 12,padding: 20,marginBottom: 25,width: '100%',},
  productInfo: {marginBottom: 15,paddingBottom: 15,borderBottomWidth: 1,},
  productName: { fontSize: 16,fontWeight: '600',marginBottom: 5,},
  productPrice: {fontSize: 18,fontWeight: 'bold',},
  sellerDisplayInfo: {flexDirection: 'row',alignItems: 'center',marginVertical: 15,paddingVertical: 15,borderTopWidth: 1,borderBottomWidth: 1,},
  sellerAvatarContainer: {marginRight: 15,},
  sellerContactAvatar: {width: 60,height: 60,borderRadius: 30,borderWidth: 2,},
  sellerContactAvatarPlaceholder: {width: 60,height: 60,borderRadius: 30,justifyContent: 'center',alignItems: 'center',borderWidth: 2,},
  sellerTextInfo: {flex: 1,},
  sellerNameText: {fontSize: 16,fontWeight: '600',flex: 1,},
  sellerShopVerified: {fontSize: 12,marginTop: 4,},
  sellerShopStatus: {fontSize: 12,marginTop: 4,},
  phoneInfo: {flexDirection: 'row',alignItems: 'center',marginTop: 10,paddingTop: 10,borderTopWidth: 1,},
  phoneNumber: {fontSize: 18,fontWeight: 'bold',marginLeft: 10,flex: 1,},
  copyButton: {padding: 8,marginLeft: 10,},
  shopLocationInfo: {flexDirection: 'row',alignItems: 'center',marginTop: 10,paddingTop: 10,borderTopWidth: 1,},
  shopLocationText: {fontSize: 14,marginLeft: 8,flex: 1,},
  shopDescription: {marginTop: 10,paddingTop: 10,borderTopWidth: 1,},
  shopDescriptionText: {fontSize: 14,lineHeight: 20,},
  contactOptionsTitle: {fontSize: 16,fontWeight: 'bold',marginBottom: 15,marginTop: 10,},
  contactOption: {flexDirection: 'row',alignItems: 'center',borderRadius: 12,padding: 18,marginBottom: 12,},
  whatsappOption: {borderLeftWidth: 4,},
  callOption: {borderLeftWidth: 4,},
  contactIconContainer: {width: 50,height: 50,borderRadius: 25,justifyContent: 'center',alignItems: 'center',marginRight: 15,},
  contactOptionText: {flex: 1,},
  contactOptionTitle: {fontSize: 16,fontWeight: 'bold',marginBottom: 2,},
  contactOptionDescription: { fontSize: 12, marginBottom: 2, },
  whatsappNote: {fontSize: 11,fontStyle: 'italic',},
  callNote: {fontSize: 11,fontStyle: 'italic',},
  contactDisclaimer: {flexDirection: 'row', alignItems: 'center', borderRadius: 8, padding: 15, marginTop: 20, marginBottom: 30,},
  contactDisclaimerText: {fontSize: 12,marginLeft: 10,flex: 1,lineHeight: 16,},
  // Sort and Filter Menu Styles
  sortFilterOverlay: {flex: 1,justifyContent: 'flex-end',},
  sortFilterContainer: {borderTopLeftRadius: 20,borderTopRightRadius: 20,height: '85%',},
  sortFilterHeader: {flexDirection: 'row',justifyContent: 'space-between',alignItems: 'center',padding: 15,borderBottomWidth: 1,},
  sortFilterTitle: {fontSize: 18,fontWeight: 'bold',},
  sortFilterContent: {flex: 1,paddingHorizontal: 15,},
  sortFilterSection: {marginBottom: 25,},
  sortFilterSectionTitle: {fontSize: 16,fontWeight: 'bold',marginBottom: 15,},
  sortFilterOption: {flexDirection: 'row',justifyContent: 'space-between',alignItems: 'center',padding: 15,borderRadius: 10,marginBottom: 10,borderWidth: 1,},
  sortFilterOptionContent: {flexDirection: 'row',alignItems: 'center',flex: 1, },
  sortFilterOptionText: {fontSize: 14,marginLeft: 12,fontWeight: '600',},
  filterGrid: {flexDirection: 'row',flexWrap: 'wrap',gap: 10,},
  filterChip: {flexDirection: 'row',alignItems: 'center',paddingHorizontal: 12,paddingVertical: 8,borderRadius: 20,gap: 6,},
  filterChipText: {fontSize: 12,fontWeight: '600',},
  periodGrid: {flexDirection: 'row',flexWrap: 'wrap',gap: 10,},
  periodChip: {flexDirection: 'row',alignItems: 'center',paddingHorizontal: 12,paddingVertical: 10,borderRadius: 20,borderWidth: 1,gap: 6,},
  periodChipText: {fontSize: 12,fontWeight: '600',},
  sortFilterActions: {flexDirection: 'row',justifyContent: 'space-between',marginTop: 20,marginBottom: 30,gap: 15,},
  resetButton: {flex: 1,padding: 15,borderRadius: 10,alignItems: 'center',borderWidth: 1,},
  resetButtonText: {fontSize: 14,fontWeight: '600',},
  applyButton: {flex: 1,padding: 15,borderRadius: 10,alignItems: 'center',},
  applyButtonText: {color: '#fff',fontSize: 14,fontWeight: '600',},
  sortFilterButton: {padding: 5,position: 'relative',},
  filterBadge: {position: 'absolute',top: -5,right: -5,borderRadius: 10,minWidth: 18,height: 18,justifyContent: 'center',alignItems: 'center',paddingHorizontal: 4,},
  filterBadgeText: {color: '#fff',fontSize: 10,fontWeight: 'bold',},
  filterSummary: {padding: 10,marginHorizontal: 16,marginTop: 10,borderRadius: 10,},
  filterSummaryContent: {flexDirection: 'row',alignItems: 'center',justifyContent: 'space-between',},
  filterSummaryText: {fontSize: 12, flex: 1, marginLeft: 8, marginRight: 12,},
  clearFiltersText: {fontSize: 12,fontWeight: '600',},
  clearFiltersButton: {paddingHorizontal: 20,paddingVertical: 10,borderRadius: 20,marginTop: 10,marginBottom: 20,},
  clearFiltersButtonText: {color: '#fff',fontSize: 14,fontWeight: '600',
  },
  // Add these to your existing styles
similarSubtitle: {
  fontSize: 12,
  marginBottom: 15,
  marginLeft: 5,
  fontStyle: 'italic',
},
sameSellerBadge: {
  position: 'absolute',
  top: 8,
  left: 8,
  paddingHorizontal: 6,
  paddingVertical: 2,
  borderRadius: 4,
},
sameSellerBadgeText: {
  color: '#fff',
  fontSize: 9,
  fontWeight: 'bold',
},
similarSellerInfo: {
  flex: 1,
  marginLeft: 6,
},
similarSellerType: {
  marginTop: 2,
},
// Add these to your existing styles
mediaGalleryContainer: {
  position: 'relative',
  marginBottom: 2,
},
mediaPaginationDots: {
  position: 'absolute',
  bottom: 10,
  width: '100%',
  flexDirection: 'row',
  justifyContent: 'center',
  zIndex: 10,
},
mediaDot: {
  width: 8,
  height: 8,
  borderRadius: 4,
  marginHorizontal: 4,
},
mediaActiveDot: {
  // Background color set dynamically
},
mediaInactiveDot: {
  // Background color set dynamically
},

colorMediaNavigation: {
  padding: 16,
  backgroundColor: 'rgba(0,0,0,0.05)',
},
colorNavTitle: {
  fontSize: 14,
  fontWeight: '600',
  marginBottom: 12,
},
colorNavChips: {
  flexDirection: 'row',
},
colorNavChip: {
  flexDirection: 'row',
  alignItems: 'center',
  paddingHorizontal: 16,
  paddingVertical: 10,
  borderRadius: 20,
  marginRight: 12,
  borderWidth: 1,
  borderColor: 'transparent',
  gap: 6,
},
colorNavChipSelected: {
  borderWidth: 2,
},
colorNavChipText: {
  fontSize: 14,
  fontWeight: '500',
},
colorNavChipTextSelected: {
  fontWeight: 'bold',
},

priceStockRow: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: 20,
},
priceContainer: {
  flexDirection: 'row',
  alignItems: 'flex-end',
  flexWrap: 'wrap',
  flex: 1,
},
stockStatusBadge: {
  flexDirection: 'row',
  alignItems: 'center',
  paddingHorizontal: 12,
  paddingVertical: 8,
  borderRadius: 20,
  gap: 6,
},
stockStatusText: {
  color: '#fff',
  fontSize: 12,
  fontWeight: '600',
  marginLeft: 4,
},

sizeSelectionSection: {
  padding: 16,
  borderRadius: 12,
  marginBottom: 12,
},
colorSelectionSection: {
  padding: 16,
  borderRadius: 12,
  marginBottom: 12,
},
sectionHeader: {
  flexDirection: 'row',
  alignItems: 'center',
  marginBottom: 12,
  gap: 8,
  flexWrap: 'wrap',
},
sectionTitle: {
  fontSize: 16,
  fontWeight: '600',
},
stockLabel: {
  fontSize: 12,
  fontStyle: 'italic',
},
sizeChips: {
  flexDirection: 'row',
},
colorChips: {
  flexDirection: 'row',
},
sizeChip: {
  paddingHorizontal: 20,
  paddingVertical: 12,
  borderRadius: 10,
  marginRight: 12,
  borderWidth: 1,
  borderColor: 'transparent',
  alignItems: 'center',
  minWidth: 100,
},
sizeChipSelected: {
  borderWidth: 2,
},
sizeChipOutOfStock: {
  opacity: 0.7,
},
sizeChipText: {
  fontSize: 14,
  fontWeight: '600',
  marginBottom: 4,
},
sizeChipTextSelected: {
  fontWeight: 'bold',
},
sizeStockText: {
  fontSize: 11,
},
colorChip: {
  paddingHorizontal: 20,
  paddingVertical: 12,
  borderRadius: 10,
  marginRight: 12,
  borderWidth: 1,
  borderColor: 'transparent',
  alignItems: 'center',
  minWidth: 100,
},
colorChipSelected: {
  borderWidth: 2,
},
colorChipOutOfStock: {
  opacity: 0.7,
},
colorChipText: {
  fontSize: 14,
  fontWeight: '600',
  marginBottom: 4,
},
colorChipTextSelected: {
  fontWeight: 'bold',
},
colorStockText: {
  fontSize: 11,
},

selectedOptionsSummary: {
  padding: 16,
  borderRadius: 12,
  marginBottom: 16,
},
selectedOptionsTitle: {
  fontSize: 14,
  fontWeight: '600',
  marginBottom: 8,
},
selectedOptionsRow: {
  flexDirection: 'row',
  alignItems: 'center',
  flexWrap: 'wrap',
  gap: 8,
},
selectedOptionChip: {
  paddingHorizontal: 12,
  paddingVertical: 8,
  borderRadius: 20,
},
selectedOptionText: {
  color: '#fff',
  fontSize: 12,
  fontWeight: '600',
},
availableStockText: {
  fontSize: 12,
  fontWeight: '600',
  marginLeft: 'auto',
},
  productPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  productPreviewImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 12,
  },
  productPreviewInfo: {
    flex: 1,
  },
  productPreviewTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  productPreviewPrice: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  selectionGroup: {
    marginBottom: 20,
  },
  selectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  selectionOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  selectionOption: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    minWidth: 80,
  },
  selectionOptionSelected: {
    borderWidth: 2,
  },
  selectionOptionDisabled: {
    opacity: 0.5,
  },
  selectionOptionText: {
    fontSize: 14,
    fontWeight: '500',
  },
  selectionOptionTextSelected: {
    fontWeight: 'bold',
  },
  stockLabelSmall: {
    fontSize: 10,
    marginTop: 2,
  },
  quantitySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  quantityButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  quantityDisplay: {
    width: 50,
    height: 40,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  stockText: {
    fontSize: 12,
    marginLeft: 'auto',
  },
  cartSummary: {
    borderRadius: 10,
    overflow: 'hidden',
  },
  cartSummaryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  cartSummaryItemInfo: {
    flex: 1,
    marginRight: 12,
  },
  cartSummaryItemTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  cartSummaryItemQty: {
    fontSize: 12,
  },
  cartSummaryItemPrice: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  orderSummaryText: {
    fontSize: 12,
    marginTop: 4,
  },
  
  // Order Details New Styles
  colorMediaSection: {
    marginBottom: 16,
  },
  colorMediaTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    paddingHorizontal: 16,
  },
  selectedOptionsContainer: {
    borderRadius: 10,
    padding: 16,
    marginBottom: 20,
  },
  selectedOptionsTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
  },
  selectedOptionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  selectedOptionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  selectedOptionLabel: {
    fontSize: 12,
    marginRight: 4,
  },
  selectedOptionValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  orderItemsSection: {
    marginTop: 20,
    paddingTop: 20,
  },
  orderItemCard: {
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  orderItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  orderItemTitle: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
    marginRight: 12,
  },
  orderItemPrice: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  orderItemDetails: {
    gap: 4,
  },
  orderItemDetail: {
    fontSize: 12,
  },
  // Add these styles to your styles object:
colorMediaHeader: {
  flexDirection: 'row',
  alignItems: 'center',
  marginBottom: 12,
  paddingHorizontal: 16,
  flexWrap: 'wrap',
  gap: 8,
},
colorIndicator: {
  paddingHorizontal: 8,
  paddingVertical: 4,
  borderRadius: 4,
  marginLeft: 'auto',
},
colorIndicatorText: {
  color: '#fff',
  fontSize: 10,
  fontWeight: 'bold',
},
colorMediaBadge: {
  position: 'absolute',
  top: 16,
  left: 16,
  paddingHorizontal: 10,
  paddingVertical: 6,
  borderRadius: 6,
  zIndex: 10,
},
colorMediaBadgeText: {
  color: '#fff',
  fontSize: 12,
  fontWeight: 'bold',
},
// Add these to your styles object
productImageContainer: {
  position: 'relative',
  marginRight: 12,
},
imageNavButton: {
  position: 'absolute',
  top: '50%',
  transform: [{ translateY: -12 }],
  padding: 8,
  borderRadius: 20,
  zIndex: 10,
},
prevImageButton: {
  left: 8,
},
nextImageButton: {
  right: 8,
},
imageCounter: {
  position: 'absolute',
  bottom: 8,
  right: 8,
  paddingHorizontal: 8,
  paddingVertical: 4,
  borderRadius: 12,
  zIndex: 10,
},
imageCounterText: {
  color: '#fff',
  fontSize: 12,
  fontWeight: '600',
},
colorIndicatorContainer: {
  marginTop: 8,
},
colorIndicatorLabel: {
  fontSize: 12,
  marginBottom: 4,
},
colorIndicatorChip: {
  paddingHorizontal: 8,
  paddingVertical: 4,
  borderRadius: 12,
  alignSelf: 'flex-start',
},

colorMediaCount: {
  fontSize: 10,
  marginTop: 2,
},
colorOptionContent: {
  flexDirection: 'row',
  alignItems: 'center',
},
colorMediaIcon: {
  marginLeft: 6,
},
profilePhotoOverlay: {
  flex: 1,
  justifyContent: 'center',
  alignItems: 'center',
},
});