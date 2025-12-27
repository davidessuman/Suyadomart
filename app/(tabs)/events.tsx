import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  Dimensions,
  ScrollView,
  StatusBar,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Calendar, DateData } from 'react-native-calendars';

const { width, height } = Dimensions.get('window');

/* ---------------- THEME ---------------- */
const COLORS = {
  primary: '#FF6B35', // Vibrant orange
  primaryLight: '#FF9E7A',
  primaryDark: '#E55A2B',
  background: '#FFF9F5',
  card: '#ffffff',
  textMain: '#2D3748',
  textMuted: '#718096',
  white: '#ffffff',
  chipActive: '#2D3748',
  border: '#E2E8F0',
  success: '#38A169',
  warning: '#ECC94B',
  error: '#E53E3E',
};

/* ---------------- TYPES ---------------- */
type EventCategory = 'All' | 'Entertainment' | 'Educational' | 'Political' | 'Religious' | 'General';
type AppearanceType = 'Physical' | 'Virtual' | 'Both';
type OnlinePlatform = 'Zoom' | 'Google Meet' | 'Microsoft Teams' | 'YouTube Live' | 'Other';
type CalendarView = 'month' | 'week';

interface EventItem {
  id: string;
  title: string;
  description: string;
  category: EventCategory;
  appearance: AppearanceType;
  date: string;
  time?: string;
  venue?: string;
  platform?: string;
  link?: string;
  organizer: string;
  flyer?: string;
}

const getTodayUTC = () => new Date().toISOString().split('T')[0];
const CATEGORIES: EventCategory[] = ['Entertainment', 'Educational', 'Political', 'Religious', 'General'];
const APPEARANCES: AppearanceType[] = ['Physical', 'Virtual', 'Both'];
const PLATFORMS: OnlinePlatform[] = ['Zoom', 'Google Meet', 'Microsoft Teams', 'YouTube Live', 'Other'];

/* ---------------- ADVANCED TIME PICKER COMPONENT ---------------- */
const AdvancedTimePicker = ({ time, onTimeChange }: { time: string; onTimeChange: (time: string) => void }) => {
  const [showPicker, setShowPicker] = useState(false);
  const [hours, setHours] = useState('12');
  const [minutes, setMinutes] = useState('00');
  const [period, setPeriod] = useState('PM');
  const [activeTab, setActiveTab] = useState<'manual' | 'preset'>('manual');

  useEffect(() => {
    if (time) {
      const [timePart, periodPart] = time.split(' ');
      if (timePart) {
        const [h, m] = timePart.split(':');
        setHours(h || '12');
        setMinutes(m || '00');
        setPeriod(periodPart || 'PM');
      }
    }
  }, [time]);

  const handleConfirm = () => {
    const formattedTime = `${hours}:${minutes} ${period}`;
    onTimeChange(formattedTime);
    setShowPicker(false);
  };

  const generateNumbers = (start: number, end: number) => {
    return Array.from({ length: end - start + 1 }, (_, i) => (start + i).toString().padStart(2, '0'));
  };

  const presetTimes = [
    '08:00 AM', '09:00 AM', '10:00 AM', '11:00 AM',
    '12:00 PM', '01:00 PM', '02:00 PM', '03:00 PM',
    '04:00 PM', '05:00 PM', '06:00 PM', '07:00 PM',
    '08:00 PM', '09:00 PM', '10:00 PM'
  ];

  const handlePresetSelect = (preset: string) => {
    const [timePart, periodPart] = preset.split(' ');
    const [h, m] = timePart.split(':');
    setHours(h);
    setMinutes(m);
    setPeriod(periodPart);
  };

  return (
    <>
      <TouchableOpacity 
        style={styles.timeInputContainer} 
        onPress={() => setShowPicker(true)}
        activeOpacity={0.7}
      >
        <View style={styles.timeInputIconContainer}>
          <Text style={styles.timeInputIcon}>🕒</Text>
        </View>
        <View style={styles.timeInputTextContainer}>
          <Text style={styles.timeInputLabel}>Event Time</Text>
          <Text style={time ? styles.timeInputValue : styles.timeInputPlaceholder}>
            {time || 'Select time'}
          </Text>
        </View>
        <View style={styles.timeInputArrowContainer}>
          <Text style={styles.timeInputArrow}>▼</Text>
        </View>
      </TouchableOpacity>

      <Modal visible={showPicker} transparent animationType="fade">
        <View style={styles.timePickerOverlay}>
          <View style={styles.timePickerContainer}>
            <View style={styles.timePickerHeader}>
              <Text style={styles.timePickerTitle}>Select Time</Text>
              <TouchableOpacity 
                onPress={() => setShowPicker(false)} 
                style={styles.timePickerCloseButton}
              >
                <Text style={styles.timePickerClose}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.timePickerTabs}>
              <TouchableOpacity 
                style={[styles.timePickerTab, activeTab === 'manual' && styles.timePickerTabActive]}
                onPress={() => setActiveTab('manual')}
              >
                <Text style={[styles.timePickerTabText, activeTab === 'manual' && styles.timePickerTabTextActive]}>
                  Manual
                </Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.timePickerTab, activeTab === 'preset' && styles.timePickerTabActive]}
                onPress={() => setActiveTab('preset')}
              >
                <Text style={[styles.timePickerTabText, activeTab === 'preset' && styles.timePickerTabTextActive]}>
                  Preset Times
                </Text>
              </TouchableOpacity>
            </View>

            {activeTab === 'manual' ? (
              <>
                <View style={styles.timePickerBody}>
                  <View style={styles.timeColumnContainer}>
                    <Text style={styles.timeColumnLabel}>Hour</Text>
                    <ScrollView style={styles.timeColumn} showsVerticalScrollIndicator={false}>
                      {generateNumbers(1, 12).map((hour) => (
                        <TouchableOpacity
                          key={hour}
                          style={[styles.timeOption, hours === hour && styles.timeOptionSelected]}
                          onPress={() => setHours(hour)}
                        >
                          <Text style={[styles.timeOptionText, hours === hour && styles.timeOptionTextSelected]}>
                            {hour}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>

                  <View style={styles.timeColumnContainer}>
                    <Text style={styles.timeColumnLabel}>Minute</Text>
                    <ScrollView style={styles.timeColumn} showsVerticalScrollIndicator={false}>
                      {generateNumbers(0, 59).map((minute) => (
                        <TouchableOpacity
                          key={minute}
                          style={[styles.timeOption, minutes === minute && styles.timeOptionSelected]}
                          onPress={() => setMinutes(minute)}
                        >
                          <Text style={[styles.timeOptionText, minutes === minute && styles.timeOptionTextSelected]}>
                            {minute}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>

                  <View style={styles.timeColumnContainer}>
                    <Text style={styles.timeColumnLabel}>Period</Text>
                    <View style={styles.periodContainer}>
                      {['AM', 'PM'].map((p) => (
                        <TouchableOpacity
                          key={p}
                          style={[styles.periodOption, period === p && styles.periodOptionSelected]}
                          onPress={() => setPeriod(p)}
                        >
                          <Text style={[styles.periodOptionText, period === p && styles.periodOptionTextSelected]}>
                            {p}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                </View>
              </>
            ) : (
              <View style={styles.presetTimesContainer}>
                <ScrollView showsVerticalScrollIndicator={false}>
                  <View style={styles.presetTimesGrid}>
                    {presetTimes.map((preset) => {
                      const [timePart, periodPart] = preset.split(' ');
                      const [h, m] = timePart.split(':');
                      const isSelected = hours === h && minutes === m && period === periodPart;
                      
                      return (
                        <TouchableOpacity
                          key={preset}
                          style={[styles.presetTimeButton, isSelected && styles.presetTimeButtonSelected]}
                          onPress={() => handlePresetSelect(preset)}
                        >
                          <Text style={[styles.presetTimeText, isSelected && styles.presetTimeTextSelected]}>
                            {preset}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </ScrollView>
              </View>
            )}

            <View style={styles.timePickerFooter}>
              <View style={styles.selectedTimePreviewContainer}>
                <Text style={styles.selectedTimeLabel}>Selected Time:</Text>
                <Text style={styles.selectedTimeValue}>{hours}:{minutes} {period}</Text>
              </View>
              <TouchableOpacity style={styles.timeConfirmButton} onPress={handleConfirm}>
                <Text style={styles.timeConfirmButtonText}>Confirm Time</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
};

/* ---------------- MULTI-DAY SELECTION COMPONENT ---------------- */
const MultiDayCalendar = ({ 
  selectedDates, 
  onDatesChange, 
  onViewChange 
}: { 
  selectedDates: string[]; 
  onDatesChange: (dates: string[]) => void;
  onViewChange: (view: CalendarView) => void;
}) => {
  const [currentDate, setCurrentDate] = useState(getTodayUTC());
  const [calendarView, setCalendarView] = useState<CalendarView>('month');
  const [startDate, setStartDate] = useState<string | null>(null);
  const [endDate, setEndDate] = useState<string | null>(null);
  const [isRangeSelecting, setIsRangeSelecting] = useState(false);

  const handleDayPress = (day: DateData) => {
    if (isRangeSelecting) {
      if (!startDate) {
        setStartDate(day.dateString);
        setIsRangeSelecting(true);
      } else if (!endDate) {
        if (day.dateString < startDate) {
          setEndDate(startDate);
          setStartDate(day.dateString);
        } else {
          setEndDate(day.dateString);
        }
        setIsRangeSelecting(false);
        
        // Generate range of dates
        const start = new Date(startDate);
        const end = new Date(day.dateString);
        const rangeDates: string[] = [];
        
        for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
          rangeDates.push(date.toISOString().split('T')[0]);
        }
        
        onDatesChange([...selectedDates, ...rangeDates]);
      }
    } else {
      // Toggle single date selection
      if (selectedDates.includes(day.dateString)) {
        onDatesChange(selectedDates.filter(date => date !== day.dateString));
      } else {
        onDatesChange([...selectedDates, day.dateString]);
      }
    }
  };

  const handleMonthPress = () => {
    const newView = calendarView === 'month' ? 'week' : 'month';
    setCalendarView(newView);
    onViewChange(newView);
  };

  const toggleRangeSelection = () => {
    setIsRangeSelecting(!isRangeSelecting);
    if (isRangeSelecting) {
      setStartDate(null);
      setEndDate(null);
    }
  };

  const clearSelection = () => {
    onDatesChange([]);
    setStartDate(null);
    setEndDate(null);
    setIsRangeSelecting(false);
  };

  const getMarkedDates = () => {
    const marked: any = {};
    
    selectedDates.forEach(date => {
      marked[date] = {
        selected: true,
        selectedColor: COLORS.primary,
        selectedTextColor: COLORS.white,
      };
    });

    // Highlight range in progress
    if (startDate && !endDate) {
      marked[startDate] = {
        startingDay: true,
        color: COLORS.primaryLight,
        textColor: COLORS.white,
      };
    }

    return marked;
  };

  return (
    <View style={styles.calendarContainer}>
      <View style={styles.calendarHeader}>
        <View style={styles.calendarHeaderLeft}>
          <TouchableOpacity onPress={handleMonthPress} style={styles.viewToggleButton}>
            <Text style={styles.viewToggleText}>
              {calendarView === 'month' ? 'Switch to Week View' : 'Switch to Month View'}
            </Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.calendarHeaderRight}>
          <TouchableOpacity 
            onPress={toggleRangeSelection} 
            style={[styles.rangeButton, isRangeSelecting && styles.rangeButtonActive]}
          >
            <Text style={[styles.rangeButtonText, isRangeSelecting && styles.rangeButtonTextActive]}>
              {isRangeSelecting ? 'Selecting Range...' : 'Select Range'}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity onPress={clearSelection} style={styles.clearButton}>
            <Text style={styles.clearButtonText}>Clear All</Text>
          </TouchableOpacity>
        </View>
      </View>

      <Calendar
        current={currentDate}
        minDate={getTodayUTC()}
        onDayPress={handleDayPress}
        markingType={selectedDates.length > 1 ? 'multi-period' : 'simple'}
        markedDates={getMarkedDates()}
        hideExtraDays={calendarView === 'week'}
        theme={{
          backgroundColor: COLORS.white,
          calendarBackground: COLORS.white,
          textSectionTitleColor: COLORS.textMuted,
          selectedDayBackgroundColor: COLORS.primary,
          selectedDayTextColor: COLORS.white,
          todayTextColor: COLORS.primary,
          dayTextColor: COLORS.textMain,
          textDisabledColor: '#CBD5E0',
          dotColor: COLORS.primary,
          selectedDotColor: COLORS.white,
          arrowColor: COLORS.primary,
          monthTextColor: COLORS.textMain,
          indicatorColor: COLORS.primary,
          textDayFontWeight: '600',
          textMonthFontWeight: 'bold',
          textDayHeaderFontWeight: '700',
          textDayFontSize: 14,
          textMonthFontSize: 16,
          textDayHeaderFontSize: 12,
          'stylesheet.calendar.header': {
            week: {
              marginTop: 5,
              marginBottom: 5,
              flexDirection: 'row',
              justifyContent: 'space-around',
              borderBottomWidth: 1,
              borderBottomColor: COLORS.border,
              paddingBottom: 5,
            }
          }
        }}
        style={styles.calendarStyle}
      />

      {selectedDates.length > 0 && (
        <View style={styles.selectedDatesContainer}>
          <Text style={styles.selectedDatesLabel}>Selected Dates:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.selectedDatesScroll}>
            {selectedDates.slice(0, 5).map((date, index) => (
              <View key={date} style={styles.selectedDateChip}>
                <Text style={styles.selectedDateText}>
                  {new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  {selectedDates.length > 5 && index === 4 ? '...' : ''}
                </Text>
              </View>
            ))}
            {selectedDates.length > 5 && (
              <View style={styles.moreDatesChip}>
                <Text style={styles.moreDatesText}>+{selectedDates.length - 5} more</Text>
              </View>
            )}
          </ScrollView>
        </View>
      )}

      <View style={styles.calendarFooter}>
        <View style={styles.legendContainer}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: COLORS.primary }]} />
            <Text style={styles.legendText}>Selected</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: COLORS.primaryLight }]} />
            <Text style={styles.legendText}>Range Start</Text>
          </View>
        </View>
        
        <Text style={styles.selectedCount}>
          {selectedDates.length} date{selectedDates.length !== 1 ? 's' : ''} selected
        </Text>
      </View>
    </View>
  );
};

/* ---------------- MAIN COMPONENT ---------------- */
export default function EventsScreen() {
  const [events, setEvents] = useState<EventItem[]>([
    {
      id: '1',
      title: 'Annual Tech Summit',
      description: 'The biggest tech gathering on campus.',
      category: 'Educational',
      appearance: 'Physical',
      date: getTodayUTC(),
      time: '02:30 PM',
      venue: 'Main Auditorium',
      organizer: 'Tech Club',
      flyer: '',
    },
  ]);

  const [activeCategory, setActiveCategory] = useState<EventCategory>('All');
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [bannerIndex, setBannerIndex] = useState(0);
  const [showCalendar, setShowCalendar] = useState(false);
  const [selectedDates, setSelectedDates] = useState<string[]>([getTodayUTC()]);
  const [calendarView, setCalendarView] = useState<CalendarView>('month');

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'General' as EventCategory,
    appearance: 'Physical' as AppearanceType,
    date: getTodayUTC(),
    time: '',
    venue: '',
    platform: 'Zoom' as OnlinePlatform,
    link: '',
    organizer: '',
    flyer: '',
  });

  const todayEvents = useMemo(() => events.filter(e => e.date === getTodayUTC()), [events]);

  useEffect(() => {
    if (todayEvents.length <= 1) {
      setBannerIndex(0);
      return;
    }
    const interval = setInterval(() => {
      setBannerIndex((prev) => (prev + 1) % todayEvents.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [todayEvents]);

  const filteredEvents = useMemo(() => {
    return events.filter(event => activeCategory === 'All' || event.category === activeCategory);
  }, [activeCategory, events]);

  const pickFlyer = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });
    if (!result.canceled) {
      setFormData({ ...formData, flyer: result.assets[0].uri });
    }
  };

  const handleAddEvent = () => {
    if (!formData.title || !formData.organizer) return;

    // Create events for each selected date
    const newEvents = selectedDates.map(date => ({
      id: `${Date.now()}-${date}`,
      ...formData,
      date,
    }));

    setEvents([...newEvents, ...events]);
    setIsModalVisible(false);
    setShowCalendar(false);
    setSelectedDates([getTodayUTC()]);
    setFormData({
      title: '', description: '', category: 'General', appearance: 'Physical',
      date: getTodayUTC(), time: '', venue: '', platform: 'Zoom', link: '', organizer: '', flyer: ''
    });
  };

  const handleDateSelection = (dates: string[]) => {
    setSelectedDates(dates);
    if (dates.length > 0) {
      setFormData({ ...formData, date: dates[0] });
    }
  };

  const renderEvent = ({ item }: { item: EventItem }) => (
    <View style={styles.card}>
      <View style={styles.cardLayout}>
        <View style={styles.flyerContainer}>
          {item.flyer ? (
            <Image source={{ uri: item.flyer }} style={styles.flyerImage} resizeMode="contain" />
          ) : (
            <View style={styles.placeholderFlyer}><Text style={styles.placeholderText}>NO FLYER</Text></View>
          )}
        </View>

        <View style={styles.cardContent}>
          <View style={styles.tagRow}>
            <View style={styles.categoryBadge}><Text style={styles.categoryBadgeText}>{item.category}</Text></View>
            <View style={styles.appearanceBadge}><Text style={styles.appearanceBadgeText}>{item.appearance}</Text></View>
          </View>
          <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
          <Text style={styles.organizerText} numberOfLines={1}>{item.organizer}</Text>
          <Text style={styles.footerInfo}>📅 {item.date} {item.time && `• ${item.time}`}</Text>
          {item.venue ? <Text style={styles.footerInfo} numberOfLines={1}>📍 {item.venue}</Text> : null}
          {item.link ? <Text style={styles.footerInfo} numberOfLines={1}>🔗 {item.platform}</Text> : null}
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.primary} />

      <View style={styles.headerRow}>
        <View>
          <Text style={styles.welcomeText}>Featured Today</Text>
          <Text style={styles.header}>Events</Text>
        </View>
        <TouchableOpacity style={styles.addButton} onPress={() => setIsModalVisible(true)}>
          <Text style={styles.addButtonText}>＋</Text>
        </TouchableOpacity>
      </View>

      {todayEvents.length > 0 && (
        <View style={styles.adBanner}>
          <View style={styles.adContent}>
            <View style={styles.adTextSide}>
              <View style={styles.liveTag}><Text style={styles.liveTagText}>HAPPENING NOW</Text></View>
              <Text style={styles.adTitle} numberOfLines={2}>{todayEvents[bannerIndex].title}</Text>
              <Text style={styles.adLocation} numberOfLines={1}>
                {todayEvents[bannerIndex].appearance === 'Virtual' ? todayEvents[bannerIndex].platform : todayEvents[bannerIndex].venue}
              </Text>
              {todayEvents[bannerIndex].time && (
                <Text style={styles.adTime} numberOfLines={1}>🕒 {todayEvents[bannerIndex].time}</Text>
              )}
            </View>
            <View style={styles.adFlyerSide}>
              {todayEvents[bannerIndex].flyer ? (
                <Image source={{ uri: todayEvents[bannerIndex].flyer }} style={styles.adFlyerImage} resizeMode="contain" />
              ) : (
                <View style={styles.adPlaceholder}><Text style={styles.adPlaceholderText}>FLYER</Text></View>
              )}
            </View>
          </View>
        </View>
      )}

      <View style={{ marginBottom: 15 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollPadding}>
          {['All', ...CATEGORIES].map(cat => (
            <TouchableOpacity
              key={cat}
              onPress={() => setActiveCategory(cat as EventCategory)}
              style={[styles.categoryChip, activeCategory === cat && styles.activeCategory]}
            >
              <Text style={[styles.categoryText, activeCategory === cat && styles.activeCategoryText]}>{cat}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <FlatList
        data={filteredEvents}
        keyExtractor={item => item.id}
        renderItem={renderEvent}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
      />

      {/* MAIN EVENT MODAL */}
      <Modal visible={isModalVisible} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>New Event</Text>
              <TouchableOpacity onPress={() => {
                setIsModalVisible(false);
                setShowCalendar(false);
                setSelectedDates([getTodayUTC()]);
              }} style={styles.closeBtn}>
                <Text style={styles.closeBtnText}>✕</Text>
              </TouchableOpacity>
            </View>
            
            <ScrollView showsVerticalScrollIndicator={false} style={styles.modalScroll}>
              {showCalendar ? (
                <>
                  <View style={styles.calendarNavHeader}>
                    <TouchableOpacity onPress={() => setShowCalendar(false)} style={styles.calendarBackButton}>
                      <Text style={styles.calendarBackIcon}>←</Text>
                      <Text style={styles.calendarBackText}>Back to Form</Text>
                    </TouchableOpacity>
                    <Text style={styles.calendarMainTitle}>Select Dates</Text>
                    <View style={styles.calendarNavSpacer} />
                  </View>
                  
                  <MultiDayCalendar 
                    selectedDates={selectedDates}
                    onDatesChange={handleDateSelection}
                    onViewChange={setCalendarView}
                  />
                </>
              ) : (
                <>
                  <Text style={styles.inputLabel}>Event Flyer</Text>
                  <TouchableOpacity style={[styles.uploadBox, formData.flyer && styles.uploadBoxActive]} onPress={pickFlyer}>
                    {formData.flyer ? (
                      <Image source={{ uri: formData.flyer }} style={styles.uploadPreview} resizeMode="contain" />
                    ) : (
                      <View style={styles.uploadInner}>
                        <Text style={styles.uploadIcon}>📷</Text>
                        <Text style={styles.uploadText}>Tap to select flyer</Text>
                        <Text style={styles.uploadSubtext}>JPEG or PNG</Text>
                      </View>
                    )}
                  </TouchableOpacity>

                  <Text style={styles.inputLabel}>Title</Text>
                  <TextInput 
                    style={styles.input} 
                    value={formData.title} 
                    onChangeText={txt => setFormData({ ...formData, title: txt })} 
                    placeholder="Enter event name" 
                    placeholderTextColor={COLORS.textMuted}
                  />

                  <Text style={styles.inputLabel}>Organizer</Text>
                  <TextInput 
                    style={styles.input} 
                    value={formData.organizer} 
                    onChangeText={txt => setFormData({ ...formData, organizer: txt })} 
                    placeholder="Organized by..." 
                    placeholderTextColor={COLORS.textMuted}
                  />

                  <Text style={styles.inputLabel}>Date & Time</Text>
                  <View style={styles.datetimeSection}>
                    <TouchableOpacity 
                      style={styles.dateInputCard} 
                      onPress={() => setShowCalendar(true)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.dateInputIconContainer}>
                        <Text style={styles.dateInputIcon}>📅</Text>
                      </View>
                      <View style={styles.dateInputTextContainer}>
                        <Text style={styles.dateInputLabel}>Event Dates</Text>
                        <Text style={styles.dateInputValue}>
                          {selectedDates.length === 1 
                            ? selectedDates[0] 
                            : `${selectedDates.length} dates selected`
                          }
                        </Text>
                      </View>
                      <View style={styles.dateInputArrowContainer}>
                        <Text style={styles.dateInputArrow}>›</Text>
                      </View>
                    </TouchableOpacity>

                    <View style={styles.timeInputSeparator} />
                    
                    <AdvancedTimePicker 
                      time={formData.time} 
                      onTimeChange={(time) => setFormData({ ...formData, time })} 
                    />
                  </View>

                  <Text style={styles.inputLabel}>Category</Text>
                  <View style={styles.selectionRow}>
                    {CATEGORIES.map(c => (
                      <TouchableOpacity key={c} style={[styles.formChip, formData.category === c && styles.formChipActive]} onPress={() => setFormData({ ...formData, category: c })}>
                        <Text style={[styles.formChipText, formData.category === c && styles.formChipTextActive]}>{c}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <Text style={styles.inputLabel}>Appearance</Text>
                  <View style={styles.selectionRow}>
                    {APPEARANCES.map(a => (
                      <TouchableOpacity key={a} style={[styles.formChip, formData.appearance === a && styles.formChipActive]} onPress={() => setFormData({ ...formData, appearance: a })}>
                        <Text style={[styles.formChipText, formData.appearance === a && styles.formChipTextActive]}>{a}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  {/* CONDITIONAL FIELDS */}
                  {(formData.appearance === 'Physical' || formData.appearance === 'Both') && (
                    <>
                      <Text style={styles.inputLabel}>Venue</Text>
                      <TextInput 
                        style={styles.input} 
                        value={formData.venue} 
                        onChangeText={txt => setFormData({ ...formData, venue: txt })} 
                        placeholder="Type the physical venue" 
                        placeholderTextColor={COLORS.textMuted}
                      />
                    </>
                  )}

                  {(formData.appearance === 'Virtual' || formData.appearance === 'Both') && (
                    <>
                      <Text style={styles.inputLabel}>Online Platform</Text>
                      <View style={styles.selectionRow}>
                        {PLATFORMS.map(p => (
                          <TouchableOpacity key={p} style={[styles.formChip, formData.platform === p && styles.formChipActive]} onPress={() => setFormData({ ...formData, platform: p })}>
                            <Text style={[styles.formChipText, formData.platform === p && styles.formChipTextActive]}>{p}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                      <Text style={styles.inputLabel}>Meeting Link</Text>
                      <TextInput 
                        style={styles.input} 
                        value={formData.link} 
                        onChangeText={txt => setFormData({ ...formData, link: txt })} 
                        placeholder="Paste meeting URL here" 
                        placeholderTextColor={COLORS.textMuted}
                      />
                    </>
                  )}

                  <Text style={styles.inputLabel}>Description</Text>
                  <TextInput 
                    style={[styles.input, styles.textArea]} 
                    multiline 
                    numberOfLines={4}
                    value={formData.description} 
                    onChangeText={txt => setFormData({ ...formData, description: txt })} 
                    placeholder="Event details, agenda, speakers..." 
                    placeholderTextColor={COLORS.textMuted}
                  />

                  <TouchableOpacity style={styles.submitButton} onPress={handleAddEvent}>
                    <Text style={styles.submitButtonText}>
                      {selectedDates.length > 1 
                        ? `Create ${selectedDates.length} Events` 
                        : 'Publish Event'
                      }
                    </Text>
                  </TouchableOpacity>
                </>
              )}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  // Container & Layout
  container: { flex: 1, backgroundColor: COLORS.background },
  
  // Header
  headerRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    padding: 20, 
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  welcomeText: { 
    fontSize: 12, 
    color: COLORS.textMuted, 
    fontWeight: '700', 
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  header: { 
    fontSize: 32, 
    fontWeight: '900', 
    color: COLORS.textMain, 
    letterSpacing: -1,
  },
  addButton: { 
    backgroundColor: COLORS.primary, 
    width: 48, 
    height: 48, 
    borderRadius: 12, 
    justifyContent: 'center', 
    alignItems: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  addButtonText: { 
    color: COLORS.white, 
    fontSize: 24, 
    fontWeight: '300',
  },
  
  // Ad Banner
  adBanner: { 
    marginHorizontal: 20, 
    marginTop: 20,
    height: 160, 
    backgroundColor: COLORS.primary, 
    borderRadius: 20, 
    marginBottom: 20, 
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  adContent: { 
    flex: 1, 
    flexDirection: 'row', 
    padding: 20, 
    alignItems: 'center' 
  },
  adTextSide: { 
    flex: 1.4 
  },
  liveTag: { 
    backgroundColor: 'rgba(255,255,255,0.25)', 
    alignSelf: 'flex-start', 
    paddingHorizontal: 10, 
    paddingVertical: 4, 
    borderRadius: 6, 
    marginBottom: 8 
  },
  liveTagText: { 
    color: COLORS.white, 
    fontSize: 9, 
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  adTitle: { 
    color: COLORS.white, 
    fontSize: 20, 
    fontWeight: '900', 
    marginBottom: 4,
    lineHeight: 26,
  },
  adLocation: { 
    color: COLORS.white, 
    opacity: 0.9, 
    fontSize: 13, 
    fontWeight: '600',
    marginBottom: 2,
  },
  adTime: { 
    color: COLORS.white, 
    opacity: 0.8, 
    fontSize: 12, 
    fontWeight: '500',
  },
  adFlyerSide: { 
    flex: 1, 
    height: '100%' 
  },
  adFlyerImage: { 
    width: '100%', 
    height: '100%', 
    borderRadius: 12 
  },
  adPlaceholder: { 
    width: '100%', 
    height: '100%', 
    backgroundColor: 'rgba(255,255,255,0.1)', 
    borderRadius: 12, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  adPlaceholderText: { 
    color: COLORS.white, 
    fontSize: 10, 
    opacity: 0.5,
  },
  
  // Category Chips
  scrollPadding: { 
    paddingHorizontal: 20 
  },
  categoryChip: { 
    paddingVertical: 10, 
    paddingHorizontal: 18, 
    backgroundColor: COLORS.white, 
    marginRight: 8, 
    borderRadius: 12, 
    borderWidth: 1, 
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  activeCategory: { 
    backgroundColor: COLORS.primary, 
    borderColor: COLORS.primary,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  categoryText: { 
    fontWeight: '600', 
    color: COLORS.textMuted,
    fontSize: 13,
  },
  activeCategoryText: { 
    color: COLORS.white,
    fontWeight: '700',
  },
  
  // Event Cards
  card: { 
    backgroundColor: COLORS.card, 
    borderRadius: 20, 
    marginBottom: 16, 
    borderWidth: 1, 
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 4,
    overflow: 'hidden',
  },
  cardLayout: { 
    flexDirection: 'row', 
    padding: 16 
  },
  flyerContainer: { 
    width: 90, 
    height: 120, 
    backgroundColor: '#F7FAFC', 
    borderRadius: 12, 
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#EDF2F7',
  },
  flyerImage: { 
    width: '100%', 
    height: '100%' 
  },
  placeholderFlyer: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
  },
  placeholderText: { 
    fontSize: 10, 
    color: '#CBD5E0', 
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  cardContent: { 
    flex: 1, 
    paddingLeft: 16, 
    justifyContent: 'center' 
  },
  tagRow: { 
    flexDirection: 'row', 
    gap: 6, 
    marginBottom: 8 
  },
  categoryBadge: { 
    backgroundColor: '#F7FAFC', 
    paddingHorizontal: 8, 
    paddingVertical: 4, 
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#EDF2F7',
  },
  categoryBadgeText: { 
    fontSize: 9, 
    fontWeight: '800', 
    color: COLORS.textMuted,
    letterSpacing: 0.3,
  },
  appearanceBadge: { 
    backgroundColor: '#FFF5F0', 
    paddingHorizontal: 8, 
    paddingVertical: 4, 
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#FEEBC8',
  },
  appearanceBadgeText: { 
    fontSize: 9, 
    fontWeight: '800', 
    color: COLORS.primaryDark,
    letterSpacing: 0.3,
  },
  title: { 
    fontSize: 16, 
    fontWeight: '800', 
    color: COLORS.textMain,
    marginBottom: 2,
    lineHeight: 22,
  },
  organizerText: { 
    fontSize: 12, 
    fontWeight: '600', 
    color: COLORS.primary, 
    marginBottom: 6,
    letterSpacing: 0.3,
  },
  footerInfo: { 
    fontSize: 11, 
    color: COLORS.textMuted, 
    marginTop: 2,
    letterSpacing: 0.2,
  },
  
  // Modal
  modalOverlay: { 
    flex: 1, 
    backgroundColor: 'rgba(15, 23, 42, 0.8)', 
    justifyContent: 'flex-end' 
  },
  modalContent: { 
    backgroundColor: COLORS.white, 
    borderTopLeftRadius: 32, 
    borderTopRightRadius: 32, 
    padding: 24, 
    maxHeight: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 20,
  },
  modalHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginBottom: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalTitle: { 
    fontSize: 24, 
    fontWeight: '900',
    color: COLORS.textMain,
  },
  modalScroll: { 
    maxHeight: height * 0.75,
  },
  closeBtn: { 
    backgroundColor: '#F7FAFC', 
    width: 36, 
    height: 36, 
    borderRadius: 18, 
    justifyContent: 'center', 
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  closeBtnText: {
    fontSize: 16,
    color: COLORS.textMuted,
    fontWeight: '300',
  },
  
  // Upload Box
  uploadBox: { 
    width: 140, 
    height: 180, 
    alignSelf: 'center', 
    borderWidth: 2, 
    borderStyle: 'dashed', 
    borderColor: '#E2E8F0', 
    borderRadius: 20, 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginBottom: 24, 
    overflow: 'hidden',
    backgroundColor: '#F7FAFC',
  },
  uploadBoxActive: { 
    borderColor: COLORS.primary, 
    borderStyle: 'solid',
    backgroundColor: '#FFF5F0',
  },
  uploadInner: { 
    alignItems: 'center',
    padding: 16,
  },
  uploadIcon: {
    fontSize: 32,
    marginBottom: 12,
    color: COLORS.primary,
  },
  uploadPreview: { 
    width: '100%', 
    height: '100%' 
  },
  uploadText: { 
    color: COLORS.textMain, 
    fontWeight: '600', 
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 4,
  },
  uploadSubtext: {
    color: COLORS.textMuted,
    fontSize: 11,
    fontWeight: '500',
  },
  
  // Form Inputs
  inputLabel: { 
    fontSize: 12, 
    fontWeight: '800', 
    marginBottom: 8, 
    color: COLORS.textMain, 
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  input: { 
    backgroundColor: '#F7FAFC', 
    padding: 16, 
    borderRadius: 14, 
    marginBottom: 20, 
    borderWidth: 1, 
    borderColor: '#EDF2F7',
    fontSize: 15,
    fontWeight: '500',
    color: COLORS.textMain,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
    paddingTop: 16,
  },
  
  // Date & Time Section
  datetimeSection: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
    alignItems: 'center',
  },
  dateInputCard: {
    flex: 1,
    backgroundColor: '#F7FAFC',
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#EDF2F7',
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateInputIconContainer: {
    width: 40,
    height: 40,
    backgroundColor: COLORS.white,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  dateInputIcon: {
    fontSize: 18,
    color: COLORS.primary,
  },
  dateInputTextContainer: {
    flex: 1,
  },
  dateInputLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  dateInputValue: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textMain,
  },
  dateInputArrowContainer: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dateInputArrow: {
    fontSize: 18,
    color: COLORS.textMuted,
    fontWeight: '300',
  },
  timeInputSeparator: {
    width: 12,
  },
  
  // Time Input
  timeInputContainer: {
    flex: 1,
    backgroundColor: '#F7FAFC',
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#EDF2F7',
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeInputIconContainer: {
    width: 40,
    height: 40,
    backgroundColor: COLORS.white,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  timeInputIcon: {
    fontSize: 18,
    color: COLORS.primary,
  },
  timeInputTextContainer: {
    flex: 1,
  },
  timeInputLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  timeInputValue: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textMain,
  },
  timeInputPlaceholder: {
    fontSize: 15,
    fontWeight: '500',
    color: COLORS.textMuted,
  },
  timeInputArrowContainer: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  timeInputArrow: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  
  // Selection Chips
  selectionRow: { 
    flexDirection: 'row', 
    flexWrap: 'wrap', 
    gap: 8, 
    marginBottom: 20 
  },
  formChip: { 
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12, 
    backgroundColor: '#F7FAFC',
    borderWidth: 1,
    borderColor: '#EDF2F7',
  },
  formChipActive: { 
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  formChipText: { 
    fontSize: 13, 
    fontWeight: '600', 
    color: COLORS.textMuted,
  },
  formChipTextActive: { 
    color: COLORS.white,
    fontWeight: '700',
  },
  
  // Submit Button
  submitButton: { 
    backgroundColor: COLORS.primary, 
    padding: 20, 
    borderRadius: 16, 
    alignItems: 'center', 
    marginTop: 10, 
    marginBottom: 30,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  submitButtonText: { 
    color: COLORS.white, 
    fontWeight: '800', 
    fontSize: 16,
    letterSpacing: 0.3,
  },
  
  // Calendar Navigation
  calendarNavHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  calendarBackButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#F7FAFC',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  calendarBackIcon: {
    fontSize: 16,
    color: COLORS.textMain,
    marginRight: 6,
  },
  calendarBackText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textMain,
  },
  calendarMainTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: COLORS.textMain,
    textAlign: 'center',
    flex: 1,
  },
  calendarNavSpacer: {
    width: 100,
  },
  
  // Multi-Day Calendar
  calendarContainer: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 4,
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  calendarHeaderLeft: {
    flex: 1,
  },
  calendarHeaderRight: {
    flexDirection: 'row',
    gap: 8,
  },
  viewToggleButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#F7FAFC',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  viewToggleText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textMain,
  },
  rangeButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#F7FAFC',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  rangeButtonActive: {
    backgroundColor: COLORS.primaryLight,
    borderColor: COLORS.primary,
  },
  rangeButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textMain,
  },
  rangeButtonTextActive: {
    color: COLORS.white,
    fontWeight: '700',
  },
  clearButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#FEE2E2',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  clearButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.error,
  },
  calendarStyle: {
    borderRadius: 16,
    overflow: 'hidden',
    padding: 8,
    backgroundColor: COLORS.white,
  },
  selectedDatesContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  selectedDatesLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textMuted,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  selectedDatesScroll: {
    flexDirection: 'row',
  },
  selectedDateChip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    marginRight: 8,
  },
  selectedDateText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.white,
  },
  moreDatesChip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#F7FAFC',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  moreDatesText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  calendarFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  legendContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  legendText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  selectedCount: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.primary,
  },
  
  // Advanced Time Picker
  timePickerOverlay: { 
    flex: 1, 
    backgroundColor: 'rgba(15, 23, 42, 0.9)', 
    justifyContent: 'center', 
    alignItems: 'center',
    padding: 20,
  },
  timePickerContainer: { 
    backgroundColor: COLORS.white, 
    borderRadius: 24, 
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 20,
  },
  timePickerHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    padding: 24, 
    borderBottomWidth: 1, 
    borderBottomColor: COLORS.border,
  },
  timePickerTitle: { 
    fontSize: 20, 
    fontWeight: '900', 
    color: COLORS.textMain,
  },
  timePickerCloseButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F7FAFC',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  timePickerClose: { 
    fontSize: 16, 
    color: COLORS.textMuted,
    fontWeight: '300',
  },
  timePickerTabs: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingTop: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  timePickerTab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  timePickerTabActive: {
    borderBottomColor: COLORS.primary,
  },
  timePickerTabText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  timePickerTabTextActive: {
    color: COLORS.primary,
    fontWeight: '700',
  },
  timePickerBody: {
    flexDirection: 'row',
    padding: 24,
    gap: 16,
  },
  timeColumnContainer: {
    flex: 1,
  },
  timeColumnLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
    textAlign: 'center',
  },
  timeColumn: { 
    flex: 1, 
    maxHeight: 200,
    borderRadius: 12,
    backgroundColor: '#F7FAFC',
    paddingVertical: 8,
  },
  timeOption: { 
    paddingVertical: 12, 
    alignItems: 'center', 
    borderRadius: 8, 
    marginHorizontal: 4, 
    marginVertical: 2,
  },
  timeOptionSelected: { 
    backgroundColor: COLORS.primary,
  },
  timeOptionText: { 
    fontSize: 15, 
    fontWeight: '600', 
    color: COLORS.textMain,
  },
  timeOptionTextSelected: { 
    color: COLORS.white,
    fontWeight: '700',
  },
  periodContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  periodOption: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 10,
    backgroundColor: '#F7FAFC',
    borderWidth: 1,
    borderColor: COLORS.border,
    width: '100%',
    alignItems: 'center',
  },
  periodOptionSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  periodOptionText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textMain,
  },
  periodOptionTextSelected: {
    color: COLORS.white,
    fontWeight: '700',
  },
  presetTimesContainer: {
    padding: 24,
    maxHeight: 300,
  },
  presetTimesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  presetTimeButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#F7FAFC',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    minWidth: '30%',
    flex: 1,
  },
  presetTimeButtonSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  presetTimeText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textMain,
    textAlign: 'center',
  },
  presetTimeTextSelected: {
    color: COLORS.white,
    fontWeight: '700',
  },
  timePickerFooter: {
    padding: 24,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  selectedTimePreviewContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    padding: 16,
    backgroundColor: '#FFF5F0',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FEEBC8',
  },
  selectedTimeLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.primaryDark,
  },
  selectedTimeValue: {
    fontSize: 18,
    fontWeight: '900',
    color: COLORS.primaryDark,
  },
  timeConfirmButton: {
    backgroundColor: COLORS.primary,
    padding: 18,
    borderRadius: 14,
    alignItems: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  timeConfirmButtonText: {
    color: COLORS.white,
    fontWeight: '800',
    fontSize: 16,
  },
});
