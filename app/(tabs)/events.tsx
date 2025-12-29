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
  Alert,
  useColorScheme,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Calendar, DateData } from 'react-native-calendars';
import { supabase } from '@/lib/supabase';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';

const { width, height } = Dimensions.get('window');

/* ---------------- THEME SYSTEM WITH DARK/LIGHT MODE ---------------- */
const LIGHT_COLORS = {
  primary: '#FF6B35',
  primaryLight: '#FF9E7A',
  primaryDark: '#E55A2B',
  background: '#FFF9F5',
  card: '#ffffff',
  textMain: '#2D3748',
  textMuted: '#718096',
  white: '#ffffff',
  border: '#E2E8F0',
  error: '#E53E3E',
  success: '#38A169',
  info: '#3182CE',
  surface: '#F7FAFC',
  onSurface: '#2D3748',
};

const DARK_COLORS = {
  primary: '#FF8B5A',
  primaryLight: '#FFB08D',
  primaryDark: '#FF6B35',
  background: '#1A1A1A',
  card: '#2D2D2D',
  textMain: '#F7FAFC',
  textMuted: '#A0AEC0',
  white: '#ffffff',
  border: '#4A5568',
  error: '#FC8181',
  success: '#68D391',
  info: '#63B3ED',
  surface: '#2D3748',
  onSurface: '#E2E8F0',
};

const getThemeColors = (isDarkMode: boolean) => isDarkMode ? DARK_COLORS : LIGHT_COLORS;

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

const getTodayUTC = () => new Date().toISOString().split('T')[0];
const CATEGORIES: EventCategory[] = ['General', 'Entertainment', 'Educational', 'Political', 'Religious'];
const APPEARANCES: AppearanceType[] = ['Physical Meeting', 'Virtual Meeting', 'Both'];
const PLATFORMS: OnlinePlatform[] = ['Zoom', 'Google Meet', 'Microsoft Teams', 'YouTube Live', 'TikTok Live', 'Facebook Live', 'Instagram Live'];

// Gradient backgrounds for different event categories
const CATEGORY_GRADIENTS = {
  'General': ['#FF6B35', '#FF9E7A'],
  'Entertainment': ['#9F7AEA', '#D6BCFA'],
  'Educational': ['#38B2AC', '#81E6D9'],
  'Political': ['#ED8936', '#FBD38D'],
  'Religious': ['#4299E1', '#90CDF4'],
  'All': ['#718096', '#A0AEC0'],
};

/* ---------------- HELPER: Convert 12h to 24h minutes ---------------- */
const timeToMinutes = (time: string): number => {
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
const formatFullDate = (dateStr: string) => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
};

/* ---------------- HELPER: Format date to short string ---------------- */
const formatShortDate = (dateStr: string) => {
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
const calculateDuration = (startTime: string, endTime: string) => {
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

/* ---------------- ADVANCED TIME PICKER COMPONENT ---------------- */
const AdvancedTimePicker = ({
  time,
  onTimeChange,
  label,
  isDurationPicker,
  durationHours,
  durationMinutes,
  onDurationChange,
  colors,
}: {
  time: string;
  onTimeChange: (time: string) => void;
  label: string;
  isDurationPicker?: boolean;
  durationHours?: string;
  durationMinutes?: string;
  onDurationChange?: (hours: string, minutes: string) => void;
  colors: typeof LIGHT_COLORS;
}) => {
  const [showPicker, setShowPicker] = useState(false);
  const [hours, setHours] = useState('12');
  const [minutes, setMinutes] = useState('00');
  const [period, setPeriod] = useState('PM');
  const [is24Hour, setIs24Hour] = useState(false);
  const switchTo24 = () => {
    if (!is24Hour) {
      const hNum = parseInt(hours, 10) || 0;
      let newH = hNum % 12;
      if (period === 'PM') newH = (hNum % 12) + 12;
      setHours(newH.toString().padStart(2, '0'));
      setPeriod('');
      setIs24Hour(true);
    }
  };

  const switchTo12 = () => {
    if (is24Hour) {
      const hNum = parseInt(hours, 10) || 0;
      const p = hNum >= 12 ? 'PM' : 'AM';
      const displayH = hNum % 12 || 12;
      setHours(displayH.toString());
      setPeriod(p);
      setIs24Hour(false);
    }
  };

  useEffect(() => {
    if (time) {
      const [timePart, periodPart] = time.split(' ');
      if (timePart) {
        const [h, m] = timePart.split(':');
        setHours(h || '12');
        setMinutes(m || '00');
        setPeriod(periodPart || 'PM');
        if (periodPart === undefined && parseInt(h, 10) >= 0) {
          setIs24Hour(true);
        }
      }
    }
  }, [time]);

  const handleConfirm = () => {
    let formattedTime = '';
    if (is24Hour) {
      formattedTime = `${hours.padStart(2, '0')}:${minutes}`;
    } else {
      formattedTime = `${hours.padStart(2, '0')}:${minutes} ${period}`;
    }
    onTimeChange(formattedTime);
    setShowPicker(false);
  };

  const generateNumbers = (start: number, end: number) => {
    return Array.from({ length: end - start + 1 }, (_, i) => (start + i).toString().padStart(2, '0'));
  };

  const styles = createStyles(colors);

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
          <Text style={styles.timeInputLabel}>{label}</Text>
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

            <View style={styles.timePickerBody}>
              <View style={styles.timeColumnContainer}>
                <Text style={styles.timeColumnLabel}>Hour</Text>
                <ScrollView style={styles.timeColumn} showsVerticalScrollIndicator={false}>
                  {(is24Hour ? generateNumbers(0, 23) : generateNumbers(1, 12)).map((hour) => (
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

              {!is24Hour && (
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
              )}
            </View>

            <View style={styles.timePickerFooter}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <View>
                  <Text style={{ fontSize: 12, color: colors.textMuted }}>Clock</Text>
                  <View style={{ flexDirection: 'row', gap: 8, marginTop: 6 }}>
                    <TouchableOpacity
                      style={[styles.formChip, !is24Hour && { borderColor: colors.primary, backgroundColor: is24Hour ? colors.surface : colors.primaryLight }]}
                      onPress={switchTo12}
                    >
                      <Text style={[styles.formChipText, !is24Hour && styles.formChipTextActive]}>12h</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.formChip, is24Hour && { borderColor: colors.primary, backgroundColor: colors.primaryLight }]}
                      onPress={switchTo24}
                    >
                      <Text style={[styles.formChipText, is24Hour && styles.formChipTextActive]}>24h</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {isDurationPicker && onDurationChange && (
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={{ fontSize: 12, color: colors.textMuted }}>Duration (h m)</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 }}>
                      <TextInput
                        value={durationHours}
                        onChangeText={txt => onDurationChange(txt.replace(/[^0-9]/g, ''), durationMinutes || '')}
                        placeholder="0"
                        placeholderTextColor={colors.textMuted}
                        keyboardType="number-pad"
                        style={[styles.durationInput, { width: 60 }]}
                      />
                      <Text style={styles.durationLabel}>h</Text>
                      <TextInput
                        value={durationMinutes}
                        onChangeText={txt => onDurationChange(durationHours || '', txt.replace(/[^0-9]/g, ''))}
                        placeholder="0"
                        placeholderTextColor={colors.textMuted}
                        keyboardType="number-pad"
                        style={[styles.durationInput, { width: 60 }]}
                      />
                      <Text style={styles.durationLabel}>m</Text>
                    </View>
                  </View>
                )}
              </View>

              <View style={styles.selectedTimePreviewContainer}>
                <Text style={styles.selectedTimeLabel}>Selected Time:</Text>
                <Text style={styles.selectedTimeValue}>{is24Hour ? `${hours}:${minutes}` : `${hours}:${minutes} ${period}`}</Text>
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

/* ---------------- PROFESSIONAL MULTI-DAY CALENDAR ---------------- */
const MultiDayCalendar = ({ 
  selectedDates, 
  onDatesChange,
  onApply,
  colors,
}: { 
  selectedDates: string[]; 
  onDatesChange: (dates: string[]) => void;
  onApply: (dates: string[]) => void;
  colors: typeof LIGHT_COLORS;
}) => {
  const [isRangeMode, setIsRangeMode] = useState(false);
  const [tempStart, setTempStart] = useState<string | null>(null);

  const styles = createStyles(colors);

  const handleDayPress = (day: DateData) => {
    const dateStr = day.dateString;

    if (isRangeMode) {
      if (!tempStart) {
        setTempStart(dateStr);
      } else {
        const start = new Date(tempStart);
        const end = new Date(dateStr);
        if (end < start) [start, end] = [end, start];

        const range: string[] = [];
        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
          range.push(d.toISOString().split('T')[0]);
        }

        const newDates = Array.from(new Set([...selectedDates, ...range]));
        onDatesChange(newDates.sort());

        setTempStart(null);
        setIsRangeMode(false);
      }
    } else {
      if (selectedDates.includes(dateStr)) {
        onDatesChange(selectedDates.filter(d => d !== dateStr));
      } else {
        onDatesChange([...selectedDates, dateStr].sort());
      }
    }
  };

  const getMarkedDates = () => {
    const marked: any = {};

    selectedDates.forEach(date => {
      marked[date] = {
        selected: true,
        selectedColor: colors.primary,
        selectedTextColor: colors.white,
      };
    });

    if (tempStart && isRangeMode) {
      marked[tempStart] = {
        ...marked[tempStart],
        startingDay: true,
        color: colors.primaryLight,
        textColor: colors.white,
      };
    }

    return marked;
  };

  const clearAll = () => {
    onDatesChange([]);
    setTempStart(null);
    setIsRangeMode(false);
  };

  return (
    <View style={styles.calendarContainer}>
      <View style={styles.calendarHeader}>
        <Text style={styles.calendarTitle}>Select Event Dates</Text>
        <View style={styles.calendarActions}>
          <TouchableOpacity
            style={[styles.actionButton, isRangeMode && styles.actionButtonActive]}
            onPress={() => {
              setIsRangeMode(!isRangeMode);
              if (isRangeMode) setTempStart(null);
            }}
          >
            <Text style={[styles.actionButtonText, isRangeMode && styles.actionButtonTextActive]}>
              {isRangeMode ? 'Cancel Range' : 'Select Range'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.clearButton} onPress={clearAll}>
            <Text style={styles.clearButtonText}>Clear</Text>
          </TouchableOpacity>
        </View>
      </View>

      {isRangeMode && tempStart && (
        <View style={styles.rangeHint}>
          <Text style={styles.rangeHintText}>Tap end date to complete range</Text>
        </View>
      )}

      <Calendar
        minDate={getTodayUTC()}
        onDayPress={handleDayPress}
        markedDates={getMarkedDates()}
        markingType="multi-dot"
        theme={{
          backgroundColor: colors.card,
          calendarBackground: colors.card,
          textSectionTitleColor: colors.textMuted,
          selectedDayBackgroundColor: colors.primary,
          selectedDayTextColor: colors.white,
          todayTextColor: colors.primary,
          dayTextColor: colors.textMain,
          textDisabledColor: colors.border,
          arrowColor: colors.primary,
          monthTextColor: colors.textMain,
          textDayFontWeight: '600',
          textMonthFontWeight: 'bold',
          textDayHeaderFontWeight: '700',
          textDayFontSize: 15,
          textMonthFontSize: 18,
          textDayHeaderFontSize: 13,
        }}
        style={styles.calendarStyle}
      />

      <View style={styles.selectedSummary}>
        {selectedDates.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
            {selectedDates.map((date, index) => (
              <View key={date} style={styles.dateChip}>
                <Text style={styles.dateChipText}>
                  Day {index + 1}: {new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </Text>
              </View>
            ))}
          </ScrollView>
        )}
      </View>

      {selectedDates.length > 0 && (
        <TouchableOpacity 
          style={styles.submitButton}
          onPress={() => onApply(selectedDates)}
        >
          <Text style={styles.submitButtonText}>Apply {selectedDates.length} Date{selectedDates.length > 1 ? 's' : ''}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

/* ---------------- DAY EDITOR MODAL COMPONENT ---------------- */
const DayEditorModal = ({
  visible,
  onClose,
  dayData,
  dayIndex,
  date,
  onSave,
  formData,
  selectedDatesLength,
  colors,
}: {
  visible: boolean;
  onClose: () => void;
  dayData: DayDetails;
  dayIndex: number;
  date: string;
  onSave: (data: DayDetails) => void;
  formData: any;
  selectedDatesLength?: number;
  colors: typeof LIGHT_COLORS;
}) => {
  const [localData, setLocalData] = useState<DayDetails>(dayData);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [tempStartTime, setTempStartTime] = useState('');
  const [tempEndTime, setTempEndTime] = useState('');
  const [durationHours, setDurationHours] = useState('');
  const [durationMinutes, setDurationMinutes] = useState('');

  const styles = createStyles(colors);

  useEffect(() => {
    setLocalData(dayData);
  }, [dayData]);

  const handleSave = () => {
    onSave(localData);
    onClose();
  };

  const calculateEndTime = (startTime: string, hours: string, minutes: string) => {
    if (!startTime) return localData.endTime;
    
    const startMinutes = timeToMinutes(startTime);
    const h = parseInt(hours) || 0;
    const m = parseInt(minutes) || 0;
    let totalMinutes = startMinutes + h * 60 + m;

    const newHours = Math.floor(totalMinutes / 60) % 24;
    const newMinutes = totalMinutes % 60;
    const period = newHours >= 12 ? 'PM' : 'AM';
    const displayHours = newHours % 12 || 12;

    return `${displayHours.toString().padStart(2, '0')}:${newMinutes.toString().padStart(2, '0')} ${period}`;
  };

  const handleStartTimeChange = (time: string) => {
    setLocalData({ ...localData, startTime: time });
    if (durationHours || durationMinutes) {
      const newEndTime = calculateEndTime(time, durationHours, durationMinutes);
      setLocalData(prev => ({ ...prev, endTime: newEndTime }));
    }
  };

  const handleDurationChange = (hours: string, minutes: string) => {
    setDurationHours(hours);
    setDurationMinutes(minutes);
    
    if (localData.startTime) {
      const newEndTime = calculateEndTime(localData.startTime, hours, minutes);
      setLocalData(prev => ({ ...prev, endTime: newEndTime }));
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
        <View style={[styles.modalContent, { maxHeight: '95%' }]}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Edit Day {dayIndex + 1}</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.dayEditorHeader}>
              <Text style={styles.dayEditorDate}>{formatFullDate(date)}</Text>
              <Text style={styles.dayEditorSubdate}>{formatShortDate(date)}</Text>
            </View>

            <Text style={styles.inputLabel}>Time Settings</Text>
            
            <View style={styles.timeInputRow}>
              <TouchableOpacity 
                style={styles.timeInputButton}
                onPress={() => {
                  setTempStartTime(localData.startTime);
                  setShowStartPicker(true);
                }}
              >
                <Text style={styles.timeInputLabelSmall}>From</Text>
                <Text style={styles.timeInputValue}>{localData.startTime || 'Select'}</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.timeInputButton}
                onPress={() => {
                  setTempEndTime(localData.endTime);
                  setShowEndPicker(true);
                }}
              >
                <Text style={styles.timeInputLabelSmall}>To</Text>
                <Text style={styles.timeInputValue}>{localData.endTime || 'Select'}</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.durationInputContainer}>
              <Text style={styles.inputLabel}>Duration (h m)</Text>
              <View style={styles.durationInputRow}>
                <TextInput
                  value={durationHours}
                  onChangeText={txt => handleDurationChange(txt.replace(/[^0-9]/g, ''), durationMinutes)}
                  placeholder="0"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="number-pad"
                  style={styles.durationInput}
                />
                <Text style={styles.durationLabel}>h</Text>
                <TextInput
                  value={durationMinutes}
                  onChangeText={txt => handleDurationChange(durationHours, txt.replace(/[^0-9]/g, ''))}
                  placeholder="0"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="number-pad"
                  style={styles.durationInput}
                />
                <Text style={styles.durationLabel}>m</Text>
              </View>
            </View>

            {localData.startTime && localData.endTime && (
              <View style={styles.durationDisplay}>
                <Text style={styles.durationDisplayText}>
                  Duration: {calculateDuration(localData.startTime, localData.endTime)}
                </Text>
              </View>
            )}

            <Text style={styles.inputLabel}>Day-Specific Details</Text>
            {selectedDatesLength && selectedDatesLength > 1 && (
              <TextInput
                style={[styles.input, styles.textArea, { height: 120 }]}
                multiline
                value={localData.description}
                onChangeText={txt => setLocalData({ ...localData, description: txt })}
                placeholder="What's happening on this specific day? (Optional)"
                placeholderTextColor={colors.textMuted}
              />
            )}

            {(formData.appearance === 'Physical Meeting' || formData.appearance === 'Both') && (
              <>
                <Text style={styles.inputLabel}>Venue for this day (Optional)</Text>
                <TextInput
                  style={styles.input}
                  value={localData.venue || ''}
                  onChangeText={txt => setLocalData({ ...localData, venue: txt })}
                  placeholder="Leave empty to use default venue"
                  placeholderTextColor={colors.textMuted}
                />
              </>
            )}

            {(formData.appearance === 'Virtual Meeting' || formData.appearance === 'Both') && (
              <>
                <Text style={styles.inputLabel}>Platform for this day (Optional)</Text>
                <TextInput
                  style={styles.input}
                  value={localData.platform || ''}
                  onChangeText={txt => setLocalData({ ...localData, platform: txt })}
                  placeholder="Leave empty to use default platform"
                  placeholderTextColor={colors.textMuted}
                />

                <Text style={styles.inputLabel}>Link for this day (Optional)</Text>
                <TextInput
                  style={styles.input}
                  value={localData.link || ''}
                  onChangeText={txt => setLocalData({ ...localData, link: txt })}
                  placeholder="Leave empty to use default link"
                  placeholderTextColor={colors.textMuted}
                />
              </>
            )}

            <TouchableOpacity style={[styles.submitButton, { marginTop: 20 }]} onPress={handleSave}>
              <Text style={styles.submitButtonText}>Save Day Details</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>

      {/* Start Time Picker Modal */}
      <Modal visible={showStartPicker} transparent animationType="fade">
        <View style={styles.timePickerOverlay}>
          <View style={styles.timePickerContainer}>
            <View style={styles.timePickerHeader}>
              <Text style={styles.timePickerTitle}>Select Start Time</Text>
              <TouchableOpacity onPress={() => setShowStartPicker(false)} style={styles.timePickerCloseButton}>
                <Text style={styles.timePickerClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <TimePickerInner
              time={tempStartTime}
              onTimeChange={(time) => {
                setLocalData({ ...localData, startTime: time });
                setShowStartPicker(false);
              }}
              isDurationPicker={true}
              durationHours={durationHours}
              durationMinutes={durationMinutes}
              onDurationChange={handleDurationChange}
              colors={colors}
            />
          </View>
        </View>
      </Modal>

      {/* End Time Picker Modal */}
      <Modal visible={showEndPicker} transparent animationType="fade">
        <View style={styles.timePickerOverlay}>
          <View style={styles.timePickerContainer}>
            <View style={styles.timePickerHeader}>
              <Text style={styles.timePickerTitle}>Select End Time</Text>
              <TouchableOpacity onPress={() => setShowEndPicker(false)} style={styles.timePickerCloseButton}>
                <Text style={styles.timePickerClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <TimePickerInner
              time={tempEndTime}
              onTimeChange={(time) => {
                setLocalData({ ...localData, endTime: time });
                setShowEndPicker(false);
              }}
              colors={colors}
            />
          </View>
        </View>
      </Modal>
    </Modal>
  );
};

/* ---------------- TIME PICKER INNER COMPONENT ---------------- */
const TimePickerInner = ({
  time,
  onTimeChange,
  isDurationPicker,
  durationHours,
  durationMinutes,
  onDurationChange,
  colors,
}: {
  time: string;
  onTimeChange: (time: string) => void;
  isDurationPicker?: boolean;
  durationHours?: string;
  durationMinutes?: string;
  onDurationChange?: (hours: string, minutes: string) => void;
  colors: typeof LIGHT_COLORS;
}) => {
  const [hours, setHours] = useState('12');
  const [minutes, setMinutes] = useState('00');
  const [period, setPeriod] = useState('PM');
  const [is24Hour, setIs24Hour] = useState(false);

  const styles = createStyles(colors);

  useEffect(() => {
    if (time) {
      const [timePart, periodPart] = time.split(' ');
      if (timePart) {
        const [h, m] = timePart.split(':');
        setHours(h || '12');
        setMinutes(m || '00');
        setPeriod(periodPart || 'PM');
        if (periodPart === undefined && parseInt(h, 10) >= 0) {
          setIs24Hour(true);
        }
      }
    }
  }, [time]);

  const handleConfirm = () => {
    let formattedTime = '';
    if (is24Hour) {
      formattedTime = `${hours.padStart(2, '0')}:${minutes}`;
    } else {
      formattedTime = `${hours.padStart(2, '0')}:${minutes} ${period}`;
    }
    onTimeChange(formattedTime);
  };

  const generateNumbers = (start: number, end: number) => {
    return Array.from({ length: end - start + 1 }, (_, i) => (start + i).toString().padStart(2, '0'));
  };

  const switchTo24 = () => {
    if (!is24Hour) {
      const hNum = parseInt(hours, 10) || 0;
      let newH = hNum % 12;
      if (period === 'PM') newH = (hNum % 12) + 12;
      setHours(newH.toString().padStart(2, '0'));
      setPeriod('');
      setIs24Hour(true);
    }
  };

  const switchTo12 = () => {
    if (is24Hour) {
      const hNum = parseInt(hours, 10) || 0;
      const p = hNum >= 12 ? 'PM' : 'AM';
      const displayH = hNum % 12 || 12;
      setHours(displayH.toString());
      setPeriod(p);
      setIs24Hour(false);
    }
  };

  return (
    <>
      <View style={styles.timePickerBody}>
        <View style={styles.timeColumnContainer}>
          <Text style={styles.timeColumnLabel}>Hour</Text>
          <ScrollView style={styles.timeColumn} showsVerticalScrollIndicator={false}>
            {(is24Hour ? generateNumbers(0, 23) : generateNumbers(1, 12)).map((hour) => (
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

        {!is24Hour && (
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
        )}
      </View>

      <View style={styles.timePickerFooter}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <View>
            <Text style={{ fontSize: 12, color: colors.textMuted }}>Clock</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 6 }}>
              <TouchableOpacity
                style={[styles.formChip, !is24Hour && { borderColor: colors.primary, backgroundColor: is24Hour ? colors.surface : colors.primaryLight }]}
                onPress={switchTo12}
              >
                <Text style={[styles.formChipText, !is24Hour && styles.formChipTextActive]}>12h</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.formChip, is24Hour && { borderColor: colors.primary, backgroundColor: colors.primaryLight }]}
                onPress={switchTo24}
              >
                <Text style={[styles.formChipText, is24Hour && styles.formChipTextActive]}>24h</Text>
              </TouchableOpacity>
            </View>
          </View>

          {isDurationPicker && onDurationChange && (
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={{ fontSize: 12, color: colors.textMuted }}>Duration (h m)</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 }}>
                <TextInput
                  value={durationHours}
                  onChangeText={txt => onDurationChange(txt.replace(/[^0-9]/g, ''), durationMinutes || '')}
                  placeholder="0"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="number-pad"
                  style={[styles.durationInput, { width: 60 }]}
                />
                <Text style={styles.durationLabel}>h</Text>
                <TextInput
                  value={durationMinutes}
                  onChangeText={txt => onDurationChange(durationHours || '', txt.replace(/[^0-9]/g, ''))}
                  placeholder="0"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="number-pad"
                  style={[styles.durationInput, { width: 60 }]}
                />
                <Text style={styles.durationLabel}>m</Text>
              </View>
            </View>
          )}
        </View>

        <View style={styles.selectedTimePreviewContainer}>
          <Text style={styles.selectedTimeLabel}>Selected Time:</Text>
          <Text style={styles.selectedTimeValue}>{is24Hour ? `${hours}:${minutes}` : `${hours}:${minutes} ${period}`}</Text>
        </View>
        <TouchableOpacity style={styles.timeConfirmButton} onPress={handleConfirm}>
          <Text style={styles.timeConfirmButtonText}>Confirm Time</Text>
        </TouchableOpacity>
      </View>
    </>
  );
};

/* ---------------- MAIN COMPONENT ---------------- */
export default function EventsScreen() {
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === 'dark';
  const colors = getThemeColors(isDarkMode);
  const styles = createStyles(colors);

  const [events, setEvents] = useState<EventItem[]>([]);
  const [userUniversity, setUserUniversity] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  const [activeCategory, setActiveCategory] = useState<EventCategory | 'All'>('All');
  const [showActionMenu, setShowActionMenu] = useState(false);
  const [showUserEvents, setShowUserEvents] = useState(false);
  const [showEventDetails, setShowEventDetails] = useState(false);
  const [isViewingOwnEvent, setIsViewingOwnEvent] = useState(false);
  const [userEvents, setUserEvents] = useState<EventItem[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<EventItem | null>(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isEditingEvent, setIsEditingEvent] = useState(false);
  const [showFlyerFullView, setShowFlyerFullView] = useState(false);
  const [bannerIndex, setBannerIndex] = useState(0);
  const [showCalendar, setShowCalendar] = useState(false);
  const [selectedDates, setSelectedDates] = useState<string[]>([getTodayUTC()]);
  const [dayDetails, setDayDetails] = useState<Record<string, DayDetails>>({});
  const [showDayEditor, setShowDayEditor] = useState(false);
  const [editingDayIndex, setEditingDayIndex] = useState(0);
  const [editingDayDate, setEditingDayDate] = useState('');

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

  // Custom alert function to ensure alerts are shown
  const showAlert = (title: string, message: string) => {
    // Use setTimeout to ensure alert shows after any state updates
    setTimeout(() => {
      Alert.alert(
        title,
        message,
        [{ text: 'OK', onPress: () => {} }],
        { cancelable: true }
      );
    }, 100);
  };

  // Upload image to Supabase Storage
  const uploadImageToSupabase = async (imageUri: string): Promise<string | null> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        showAlert('Error', 'You must be logged in to upload images');
        return null;
      }

      // Generate unique filename
      const fileExt = imageUri.split('.').pop()?.toLowerCase() || 'jpg';
      const fileName = `${uuidv4()}.${fileExt}`;
      
      // Convert image to blob
      const response = await fetch(imageUri);
      const blob = await response.blob();
      
      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('event-flyers')
        .upload(fileName, blob, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) {
        console.error('Upload error:', error);
        throw error;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('event-flyers')
        .getPublicUrl(fileName);

      return publicUrl;
    } catch (error) {
      console.error('Error uploading image:', error);
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

  // Fetch user's university on component mount
  useEffect(() => {
    fetchUserUniversity();
  }, []);

  // Fetch events from Supabase
  useEffect(() => {
    if (userUniversity) {
      fetchEvents();
    }
  }, [userUniversity]);

  // Reset banner index when events change
  useEffect(() => {
    setBannerIndex(0);
  }, [events]);

  const fetchUserUniversity = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data, error } = await supabase
          .from('user_profiles')
          .select('university')
          .eq('id', user.id)
          .single();

        if (error) throw error;
        if (data) {
          setUserUniversity(data.university);
        }
      }
    } catch (error) {
      console.error('Error fetching user university:', error);
      showAlert('Error', 'Unable to load your university information');
    }
  };

  const fetchEvents = async () => {
    if (!userUniversity) return;

    setIsLoading(true);
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
      setIsLoading(false);
    }
  };

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
      
      // Use Alert.alert directly for consistency
      Alert.alert('Success', 'Event deleted successfully', [{ text: 'OK' }]);
      
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
      Alert.alert('Error', 'Failed to delete event', [{ text: 'OK' }]);
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

  const pickFlyer = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        showAlert('Permission Required', 'Please allow access to your photo library to select a flyer.');
        return;
      }
      
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
        aspect: [4, 3],
      });
      
      if (!result.canceled && result.assets[0]) {
        const imageUri = result.assets[0].uri;
        
        // Show loading state
        showAlert('Uploading', 'Uploading flyer image...');
        
        // Upload to Supabase Storage
        const flyerUrl = await uploadImageToSupabase(imageUri);
        
        if (flyerUrl) {
          setFormData({ ...formData, flyer: flyerUrl });
          showAlert('Success', 'Flyer uploaded successfully!');
        } else {
          showAlert('Error', 'Failed to upload flyer. Please try again.');
        }
      }
    } catch (error) {
      console.error('Error picking/uploading flyer:', error);
      showAlert('Error', 'Failed to upload flyer. Please try again.');
    }
  };

  const todayEvents = useMemo(() => events.filter(e => e.date === getTodayUTC()), [events]);

  useEffect(() => {
    // Only set up banner rotation if there are todayEvents
    if (todayEvents.length > 0) {
      // Ensure bannerIndex is valid
      if (bannerIndex >= todayEvents.length) {
        setBannerIndex(0);
      }
      
      const interval = setInterval(() => {
        setBannerIndex((prev) => {
          // If component refreshed and todayEvents changed, reset to 0
          if (prev >= todayEvents.length - 1) {
            return 0;
          }
          return prev + 1;
        });
      }, 4000);
      
      return () => clearInterval(interval);
    } else {
      // No events today, reset banner index
      setBannerIndex(0);
    }
  }, [todayEvents, bannerIndex]);

  const filteredEvents = useMemo(() => {
    return events.filter(event => activeCategory === 'All' || event.category === activeCategory);
  }, [activeCategory, events]);

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

    try {
      // Get current user ID
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        showAlert('Error', 'You must be logged in to create events');
        return;
      }

      // Handle edit mode
      if (isEditingEvent && selectedEvent) {
        let flyerUrl = formData.flyer;
        
        // If flyer changed and is a local file, upload it
        if (formData.flyer && formData.flyer.startsWith('file://') && formData.flyer !== selectedEvent.flyer) {
          flyerUrl = await uploadImageToSupabase(formData.flyer);
          if (!flyerUrl) {
            showAlert('Error', 'Failed to upload flyer');
            return;
          }
          
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
      let flyerUrl = formData.flyer;
      if (formData.flyer && formData.flyer.startsWith('file://')) {
        flyerUrl = await uploadImageToSupabase(formData.flyer);
        if (!flyerUrl) {
          showAlert('Error', 'Failed to upload flyer');
          return;
        }
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

      showAlert('Success', 'Event(s) published successfully!');
    } catch (error: any) {
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
              <View style={styles.categoryBadge}><Text style={styles.categoryBadgeText}>{item.category}</Text></View>
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
                {item.description ? (
                  <Text style={[styles.footerInfo, { color: colors.textMain }]} numberOfLines={2}>
                    {item.description}
                  </Text>
                ) : null}
                {shouldShowVenue && <Text style={styles.footerInfo}>📍 {item.venue}</Text>}
                {item.platform && (item.appearance === 'Virtual Meeting' || item.appearance === 'Both') && <Text style={styles.footerInfo}>💻 {item.platform}</Text>}
              </>
            )}
          </View>
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
          Alert.alert(
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
            ],
            { cancelable: true }
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
          <Text style={[styles.loadingText, { color: colors.textMain }]}>Loading events...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} backgroundColor={colors.primary} />

      <View style={[styles.headerRow, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <View>
          <Text style={[styles.welcomeText, { color: colors.textMuted }]}>Featured Today</Text>
          <Text style={[styles.header, { color: colors.textMain }]}>Events</Text>
          {userUniversity && (
            <Text style={[styles.universityText, { color: colors.primary }]}>📍 {userUniversity}</Text>
          )}
        </View>
        <TouchableOpacity style={[styles.addButton, { backgroundColor: colors.primary }]} onPress={() => setShowActionMenu(true)}>
          <Text style={styles.addButtonText}>＋</Text>
        </TouchableOpacity>
      </View>

      {todayEvents.length > 0 && bannerIndex < todayEvents.length ? (
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
              backgroundColor: colors.primary,
            }
          ]}>
            <View style={styles.adContent}>
              <View style={styles.adTextSide}>
                <View style={styles.liveTag}><Text style={styles.liveTagText}>HAPPENING NOW</Text></View>
                <Text style={styles.adTitle} numberOfLines={2}>{todayEvents[bannerIndex]?.title || ''}</Text>
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
                {todayEvents[bannerIndex]?.flyer && todayEvents[bannerIndex].flyer.startsWith('https://') ? (
                  <Image source={{ uri: todayEvents[bannerIndex].flyer }} style={styles.adFlyerImage} resizeMode="contain" />
                ) : (
                  <View style={styles.adPlaceholder}><Text style={styles.adPlaceholderText}>FLYER</Text></View>
                )}
              </View>
            </View>
          </View>
        </TouchableOpacity>
      ) : null}

      <View style={{ marginBottom: 15 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollPadding}>
          {['All', ...CATEGORIES].map(cat => (
            <TouchableOpacity
              key={cat}
              onPress={() => setActiveCategory(cat as EventCategory)}
              style={[styles.categoryChip, activeCategory === cat && styles.activeCategory, 
                { backgroundColor: colors.card, borderColor: colors.border }]}
            >
              <Text style={[styles.categoryText, activeCategory === cat && styles.activeCategoryText, 
                { color: activeCategory === cat ? colors.white : colors.textMuted }]}>{cat}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {events.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={[styles.emptyText, { color: colors.textMain }]}>No events found for {userUniversity}</Text>
          <Text style={[styles.emptySubtext, { color: colors.textMuted }]}>Be the first to create an event!</Text>
        </View>
      ) : (
        <FlatList
          data={filteredEvents}
          keyExtractor={item => item.id}
          renderItem={renderEvent}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
        />
      )}

      {/* ACTION MENU MODAL */}
      <Modal visible={showActionMenu} animationType="fade" transparent>
        <View style={[styles.actionMenuOverlay, { backgroundColor: isDarkMode ? 'rgba(0,0,0,0.8)' : 'rgba(0,0,0,0.6)' }]}>
          <View style={[styles.actionMenuContainer, { backgroundColor: colors.card }]}>
            <Text style={[styles.actionMenuTitle, { color: colors.textMain }]}>What would you like to do?</Text>
            
            <TouchableOpacity 
              style={[styles.actionMenuButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={() => {
                setShowActionMenu(false);
                setIsModalVisible(true);
              }}
            >
              <Text style={styles.actionMenuButtonIcon}>📝</Text>
              <View>
                <Text style={[styles.actionMenuButtonTitle, { color: colors.textMain }]}>New Event</Text>
                <Text style={[styles.actionMenuButtonSubtitle, { color: colors.textMuted }]}>Create and publish a new event</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.actionMenuButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={() => {
                setShowActionMenu(false);
                fetchUserEvents();
                setShowUserEvents(true);
              }}
            >
              <Text style={styles.actionMenuButtonIcon}>📋</Text>
              <View>
                <Text style={[styles.actionMenuButtonTitle, { color: colors.textMain }]}>My Events</Text>
                <Text style={[styles.actionMenuButtonSubtitle, { color: colors.textMuted }]}>View your published events</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.actionMenuCancel}
              onPress={() => setShowActionMenu(false)}
            >
              <Text style={[styles.actionMenuCancelText, { color: colors.textMuted }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* USER EVENTS MODAL */}
      <Modal visible={showUserEvents} animationType="slide" transparent>
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.textMain }]}>My Events</Text>
            <TouchableOpacity onPress={() => setShowUserEvents(false)} style={[styles.closeBtn, { backgroundColor: colors.surface }]}>
              <Text style={[styles.closeBtnText, { color: colors.textMuted }]}>✕</Text>
            </TouchableOpacity>
          </View>

          {userEvents.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={[styles.emptyText, { color: colors.textMain }]}>No events published yet</Text>
              <Text style={[styles.emptySubtext, { color: colors.textMuted }]}>Create your first event to get started</Text>
            </View>
          ) : (
            <FlatList
              data={userEvents}
              keyExtractor={item => item.id}
              renderItem={renderUserEvent}
              contentContainerStyle={styles.userEventsList}
            />
          )}
        </SafeAreaView>
      </Modal>

      {/* EVENT DETAILS MODAL */}
      <Modal visible={showEventDetails} animationType="slide" transparent>
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
          {/* Header */}
          <View style={[styles.eventDetailsHeader, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={() => setShowEventDetails(false)} style={styles.eventDetailsBackBtn}>
              <Text style={[styles.eventDetailsBackIcon, { color: colors.textMain }]}>‹</Text>
            </TouchableOpacity>
            <Text style={[styles.eventDetailsHeaderTitle, { color: colors.textMain }]}>Event Details</Text>
            <View style={{ width: 40 }} />
          </View>

          {selectedEvent && (
            <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
              {/* Professional Flyer Banner Section */}
              {selectedEvent.flyer && selectedEvent.flyer.startsWith('https://') ? (
                <TouchableOpacity 
                  activeOpacity={0.8}
                  onPress={() => setShowFlyerFullView(true)}
                  style={styles.flyerBannerContainer}
                >
                  <View style={[styles.flyerBannerInner, { backgroundColor: colors.surface }]}>
                    <Image 
                      source={{ uri: selectedEvent.flyer }} 
                      style={styles.flyerBannerImage}
                      resizeMode="contain"
                    />
                    <View style={styles.flyerBannerOverlay} />
                    <View style={[styles.flyerBannerHint, { backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.15)' : 'rgba(255, 255, 255, 0.95)' }]}>
                      <Text style={styles.flyerBannerHintIcon}>🔍</Text>
                      <Text style={[styles.flyerBannerHintText, { color: colors.primary }]}>View Full Flyer</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ) : (
                <View style={[styles.flyerBannerPlaceholder, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <Text style={styles.flyerBannerPlaceholderIcon}>📍</Text>
                  <Text style={[styles.flyerBannerPlaceholderText, { color: colors.textMuted }]}>No Flyer Available</Text>
                </View>
              )}

              {/* Main Content */}
              <View style={styles.eventDetailsMainContent}>
                {/* Title Section */}
                <View style={styles.eventDetailsTitleSection}>
                  <Text style={[styles.eventDetailsMainTitle, { color: colors.textMain }]}>{selectedEvent.title}</Text>
                  <View style={styles.eventDetailsBadgesRow}>
                    <View style={[styles.eventDetailsBadge, { backgroundColor: colors.primaryLight }]}>
                      <Text style={[styles.eventDetailsBadgeText, { color: colors.primaryDark }]}>{selectedEvent.category}</Text>
                    </View>
                    <View style={[styles.eventDetailsBadge, { backgroundColor: colors.info + '20' }]}>
                      <Text style={[styles.eventDetailsBadgeText, { color: colors.info }]}>{selectedEvent.appearance}</Text>
                    </View>
                  </View>
                </View>

                {/* Info Cards */}
                <View style={[styles.eventDetailsCard, { backgroundColor: colors.surface, borderLeftColor: colors.primary }]}>
                  <View style={styles.eventDetailsCardRow}>
                    <View style={[styles.eventDetailsCardIcon, { backgroundColor: colors.primaryLight }]}>
                      <Text style={styles.eventDetailsCardIconText}>👤</Text>
                    </View>
                    <View style={styles.eventDetailsCardInfo}>
                      <Text style={[styles.eventDetailsCardLabel, { color: colors.textMuted }]}>Organizer</Text>
                      <Text style={[styles.eventDetailsCardValue, { color: colors.textMain }]}>{selectedEvent.organizer}</Text>
                    </View>
                  </View>
                </View>

                <View style={[styles.eventDetailsCard, { backgroundColor: colors.surface, borderLeftColor: colors.primary }]}>
                  <View style={styles.eventDetailsCardRow}>
                    <View style={[styles.eventDetailsCardIcon, { backgroundColor: colors.primaryLight }]}>
                      <Text style={styles.eventDetailsCardIconText}>📅</Text>
                    </View>
                    <View style={styles.eventDetailsCardInfo}>
                      <Text style={[styles.eventDetailsCardLabel, { color: colors.textMuted }]}>Date</Text>
                      <Text style={[styles.eventDetailsCardValue, { color: colors.textMain }]}>{formatFullDate(selectedEvent.date)}</Text>
                    </View>
                  </View>
                </View>

                <View style={[styles.eventDetailsCard, { backgroundColor: colors.surface, borderLeftColor: colors.primary }]}>
                  <View style={styles.eventDetailsCardRow}>
                    <View style={[styles.eventDetailsCardIcon, { backgroundColor: colors.primaryLight }]}>
                      <Text style={styles.eventDetailsCardIconText}>🕒</Text>
                    </View>
                    <View style={styles.eventDetailsCardInfo}>
                      <Text style={[styles.eventDetailsCardLabel, { color: colors.textMuted }]}>Time</Text>
                      <Text style={[styles.eventDetailsCardValue, { color: colors.textMain }]}>
                        {selectedEvent.startTime} - {selectedEvent.endTime}
                      </Text>
                      <Text style={[styles.eventDetailsCardSubValue, { color: colors.textMuted }]}>
                        ({calculateDuration(selectedEvent.startTime!, selectedEvent.endTime!)})
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Only show venue if event is not virtual */}
                {selectedEvent.venue && selectedEvent.appearance !== 'Virtual Meeting' && (
                  <View style={[styles.eventDetailsCard, { backgroundColor: colors.surface, borderLeftColor: colors.primary }]}>
                    <View style={styles.eventDetailsCardRow}>
                      <View style={[styles.eventDetailsCardIcon, { backgroundColor: colors.primaryLight }]}>
                        <Text style={styles.eventDetailsCardIconText}>📍</Text>
                      </View>
                      <View style={styles.eventDetailsCardInfo}>
                        <Text style={[styles.eventDetailsCardLabel, { color: colors.textMuted }]}>Venue</Text>
                        <Text style={[styles.eventDetailsCardValue, { color: colors.textMain }]}>{selectedEvent.venue}</Text>
                      </View>
                    </View>
                  </View>
                )}

                {(selectedEvent.appearance === 'Virtual Meeting' || selectedEvent.appearance === 'Both') && selectedEvent.platform && (
                  <View style={[styles.eventDetailsCard, { backgroundColor: colors.surface, borderLeftColor: colors.primary }]}>
                    <View style={styles.eventDetailsCardRow}>
                      <View style={[styles.eventDetailsCardIcon, { backgroundColor: colors.primaryLight }]}>
                        <Text style={styles.eventDetailsCardIconText}>💻</Text>
                      </View>
                      <View style={styles.eventDetailsCardInfo}>
                        <Text style={[styles.eventDetailsCardLabel, { color: colors.textMuted }]}>Platform</Text>
                        <Text style={[styles.eventDetailsCardValue, { color: colors.textMain }]}>{selectedEvent.platform}</Text>
                      </View>
                    </View>
                  </View>
                )}

                {selectedEvent.link && (
                  <View style={[styles.eventDetailsCard, { backgroundColor: colors.surface, borderLeftColor: colors.primary }]}>
                    <View style={styles.eventDetailsCardRow}>
                      <View style={[styles.eventDetailsCardIcon, { backgroundColor: colors.primaryLight }]}>
                        <Text style={styles.eventDetailsCardIconText}>🌐</Text>
                      </View>
                      <View style={styles.eventDetailsCardInfo}>
                        <Text style={[styles.eventDetailsCardLabel, { color: colors.textMuted }]}>Meeting Link</Text>
                        <Text style={[styles.eventDetailsCardValue, { color: colors.primary }]} numberOfLines={1}>
                          {selectedEvent.link}
                        </Text>
                      </View>
                    </View>
                  </View>
                )}

                {selectedEvent.description && (
                  <View style={[styles.eventDetailsCard, { backgroundColor: colors.surface, borderLeftColor: colors.primary }]}>
                    <Text style={[styles.eventDetailsCardLabel, { color: colors.textMuted }]}>About This Event</Text>
                    <Text style={[styles.eventDetailsDescriptionText, { color: colors.textMain }]}>{selectedEvent.description}</Text>
                  </View>
                )}

                {/* Action Buttons for Own Events - Only show if viewing own event */}
                {isViewingOwnEvent && (
                  <View style={styles.eventDetailsActionButtons}>
                    <TouchableOpacity 
                      style={[styles.eventDetailsActionButton, { backgroundColor: colors.primary }]}
                      onPress={() => handleEditEvent(selectedEvent!)}
                    >
                      <Text style={styles.eventDetailsActionButtonText}>✏️ Edit Event</Text>
                    </TouchableOpacity>

                    <TouchableOpacity 
                      style={[styles.eventDetailsActionButton, { backgroundColor: colors.error }]}
                      onPress={() => {
                        Alert.alert(
                          'Delete Event',
                          'Are you sure you want to delete this event? This action cannot be undone.',
                          [
                            { 
                              text: 'Cancel', 
                              style: 'cancel',
                              onPress: () => {}
                            },
                            { 
                              text: 'Delete', 
                              style: 'destructive',
                              onPress: () => handleDeleteEvent(selectedEvent.id)
                            }
                          ],
                          { cancelable: true }
                        );
                      }}
                    >
                      <Text style={styles.eventDetailsActionButtonText}>🗑️ Delete Event</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {/* Spacing */}
                <View style={{ height: 20 }} />
              </View>
            </ScrollView>
          )}
        </SafeAreaView>
      </Modal>

      {/* FULLSCREEN FLYER MODAL */}
      <Modal visible={showFlyerFullView} animationType="fade" transparent>
        <SafeAreaView style={[styles.flyerFullScreenContainer, { backgroundColor: isDarkMode ? '#1A202C' : '#000' }]}>
          <View style={styles.flyerFullScreenHeader}>
            <TouchableOpacity 
              onPress={() => setShowFlyerFullView(false)}
              style={[styles.flyerCloseBtn, { backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.15)' : 'rgba(255, 255, 255, 0.15)' }]}
            >
              <Text style={styles.flyerCloseBtnText}>✕</Text>
            </TouchableOpacity>
          </View>
          {selectedEvent?.flyer && selectedEvent.flyer.startsWith('https://') && (
            <View style={styles.flyerFullScreenContent}>
              <Image 
                source={{ uri: selectedEvent.flyer }} 
                style={styles.flyerFullScreenImage}
                resizeMode="contain"
              />
            </View>
          )}
        </SafeAreaView>
      </Modal>

      {/* NEW EVENT MODAL */}
      <Modal visible={isModalVisible} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.textMain }]}>{isEditingEvent ? 'Edit Event' : 'New Event'}</Text>
              <TouchableOpacity onPress={() => {
                setIsModalVisible(false);
                setShowCalendar(false);
                setSelectedDates([getTodayUTC()]);
                setDayDetails({});
                setIsEditingEvent(false);
                setFormData({
                  title: '', description: '', category: 'General', appearance: 'Physical Meeting',
                  startTime: '12:00 PM', endTime: '01:00 PM', durationHours: '', durationMinutes: '',
                  venue: '', platform: 'Zoom', link: '', organizer: '', flyer: ''
                });
              }} style={[styles.closeBtn, { backgroundColor: colors.surface }]}>
                <Text style={[styles.closeBtnText, { color: colors.textMuted }]}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {showCalendar ? (
                <>
                  <View style={[styles.calendarNavHeader, { borderBottomColor: colors.border }]}>
                    <TouchableOpacity onPress={() => setShowCalendar(false)} style={[styles.calendarBackButton, { backgroundColor: colors.surface }]}>
                      <Text style={styles.calendarBackIcon}>←</Text>
                      <Text style={[styles.calendarBackText, { color: colors.textMain }]}>Back to Form</Text>
                    </TouchableOpacity>
                  </View>

                  <MultiDayCalendar
                    selectedDates={selectedDates}
                    onDatesChange={setSelectedDates}
                    onApply={(dates) => {
                      setSelectedDates(dates);
                      setShowCalendar(false);
                    }}
                    colors={colors}
                  />
                </>
              ) : (
                <>
                  <View style={[styles.universityBadge, { backgroundColor: colors.primaryLight + '30' }]}>
                    <Text style={[styles.universityBadgeText, { color: colors.primaryDark }]}>For: {userUniversity}</Text>
                  </View>

                  <Text style={[styles.inputLabel, { color: colors.textMain }]}>Event Flyer</Text>
                  <TouchableOpacity style={[styles.uploadBox, formData.flyer && styles.uploadBoxActive, 
                    { borderColor: colors.border, backgroundColor: colors.surface }]} onPress={pickFlyer}>
                    {formData.flyer && formData.flyer.startsWith('https://') ? (
                      <Image source={{ uri: formData.flyer }} style={styles.uploadPreview} resizeMode="contain" />
                    ) : (
                      <View style={styles.uploadInner}>
                        <Text style={[styles.uploadIcon, { color: colors.primary }]}>📷</Text>
                        <Text style={[styles.uploadText, { color: colors.textMain }]}>Tap to select flyer</Text>
                        <Text style={[styles.uploadSubtext, { color: colors.textMuted }]}>JPEG or PNG</Text>
                      </View>
                    )}
                  </TouchableOpacity>

                  <Text style={[styles.inputLabel, { color: colors.textMain }]}>Title <Text style={{ color: colors.error }}>*</Text></Text>
                  <TextInput 
                    style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.textMain }]} 
                    value={formData.title} 
                    onChangeText={txt => setFormData({ ...formData, title: txt })} 
                    placeholder="Enter event name" 
                    placeholderTextColor={colors.textMuted}
                  />

                  <Text style={[styles.inputLabel, { color: colors.textMain }]}>Organizer / Organization <Text style={{ color: colors.error }}>*</Text></Text>
                  <TextInput 
                    style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.textMain }]} 
                    value={formData.organizer} 
                    onChangeText={txt => setFormData({ ...formData, organizer: txt })} 
                    placeholder="Organized by..." 
                    placeholderTextColor={colors.textMuted}
                  />

                  <Text style={[styles.inputLabel, { color: colors.textMain }]}>Event Dates <Text style={{ color: colors.error }}>*</Text></Text>
                  <TouchableOpacity 
                    style={[styles.dateInputCard, { backgroundColor: colors.surface, borderColor: colors.border }]} 
                    onPress={() => setShowCalendar(true)}
                  >
                    <View style={[styles.dateInputIconContainer, { backgroundColor: colors.card }]}>
                      <Text style={[styles.dateInputIcon, { color: colors.primary }]}>📅</Text>
                    </View>
                    <View style={styles.dateInputTextContainer}>
                      <Text style={[styles.dateInputLabel, { color: colors.textMain }]}>Event Dates</Text>
                      {selectedDates.length === 1 ? (
                        <Text style={[styles.dateInputValue, { color: colors.textMain }]}>
                          {formatFullDate(selectedDates[0])}
                        </Text>
                      ) : (
                        <View>
                          <Text style={[styles.dateInputValue, { color: colors.textMain }]}>{selectedDates.length} days selected</Text>
                          <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 8 }}>
                            {selectedDates.slice(0, 3).map(date => (
                              <Text key={date} style={[styles.multiDateText, { color: colors.textMuted }]}>
                                Day {selectedDates.indexOf(date) + 1}: {new Date(date).toLocaleDateString('en-US', { 
                                  month: 'short', 
                                  day: 'numeric' 
                                })}{'  '}
                              </Text>
                            ))}
                            {selectedDates.length > 3 && (
                              <Text style={[styles.multiDateText, { color: colors.textMuted }]}>
                                ... +{selectedDates.length - 3} more
                              </Text>
                            )}
                          </View>
                        </View>
                      )}
                    </View>
                    <Text style={[styles.dateInputArrow, { color: colors.textMuted }]}>›</Text>
                  </TouchableOpacity>

                  {/* Single Day vs Multi-Day Time Display */}
                  {selectedDates.length === 1 ? (
                    // SINGLE DAY: Show regular time pickers with description
                    <>
                      <Text style={[styles.inputLabel, { color: colors.textMain }]}>Event Time <Text style={{ color: colors.error }}>*</Text></Text>
                      <AdvancedTimePicker 
                        time={formData.startTime}
                        onTimeChange={(time) => {
                          setFormData({ ...formData, startTime: time });
                          if (formData.durationHours || formData.durationMinutes) {
                            const startMinutes = timeToMinutes(time);
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
                        }}
                        label="From"
                        isDurationPicker
                        durationHours={formData.durationHours}
                        durationMinutes={formData.durationMinutes}
                        onDurationChange={(h, m) => {
                          setFormData({ ...formData, durationHours: h, durationMinutes: m });
                          if (formData.startTime) {
                            const startMinutes = timeToMinutes(formData.startTime);
                            const hours = parseInt(h) || 0;
                            const minutes = parseInt(m) || 0;
                            let totalMinutes = startMinutes + hours * 60 + minutes;

                            const newHours = Math.floor(totalMinutes / 60) % 24;
                            const newMinutes = totalMinutes % 60;
                            const period = newHours >= 12 ? 'PM' : 'AM';
                            const displayHours = newHours % 12 || 12;

                            const endTime = `${displayHours.toString().padStart(2, '0')}:${newMinutes.toString().padStart(2, '0')} ${period}`;
                            setFormData(prev => ({ ...prev, endTime }));
                          }
                        }}
                        colors={colors}
                      />

                      <AdvancedTimePicker 
                        time={formData.endTime}
                        onTimeChange={(time) => {
                          setFormData({ ...formData, endTime: time, durationHours: '', durationMinutes: '' });
                        }}
                        label="To"
                        colors={colors}
                      />

                      {formData.startTime && formData.endTime && (
                        <View style={[styles.durationDisplay, { backgroundColor: colors.primaryLight + '40' }]}>
                          <Text style={[styles.durationDisplayText, { color: colors.primaryDark }]}>
                            Duration: {calculateDuration(formData.startTime, formData.endTime)}
                          </Text>
                        </View>
                      )}

                      <Text style={[styles.inputLabel, { color: colors.textMain }]}>Event Description (Single Day)</Text>
                      <TextInput 
                        style={[styles.input, styles.textArea, { height: 100, backgroundColor: colors.surface, borderColor: colors.border, color: colors.textMain }]} 
                        multiline 
                        value={formData.description} 
                        onChangeText={txt => setFormData({ ...formData, description: txt })} 
                        placeholder="Describe what will happen at this event..."
                        placeholderTextColor={colors.textMuted}
                      />
                    </>
                  ) : (
                    // MULTI-DAY: Show summary of each day with edit option
                    <>
                      {!allDaysHaveDifferentTimes() && (
                        <>
                          <Text style={[styles.inputLabel, { color: colors.textMain }]}>Default Event Time (for all days)</Text>
                          <AdvancedTimePicker 
                            time={formData.startTime}
                            onTimeChange={(time) => {
                              setFormData({ ...formData, startTime: time });
                              // Update all days that haven't been customized
                              const updatedDetails = { ...dayDetails };
                              selectedDates.forEach(date => {
                                if (!updatedDetails[date]) {
                                  updatedDetails[date] = {
                                    startTime: time,
                                    endTime: formData.endTime,
                                    description: '',
                                    venue: formData.venue,
                                    platform: formData.platform,
                                    link: formData.link,
                                  };
                                } else if (updatedDetails[date].startTime === formData.startTime) {
                                  // Only update if it matches the old default (not custom)
                                  updatedDetails[date] = {
                                    ...updatedDetails[date],
                                    startTime: time,
                                  };
                                }
                              });
                              setDayDetails(updatedDetails);
                            }}
                            label="From"
                            isDurationPicker
                            durationHours={formData.durationHours}
                            durationMinutes={formData.durationMinutes}
                            onDurationChange={(h, m) => {
                              setFormData({ ...formData, durationHours: h, durationMinutes: m });
                              if (formData.startTime) {
                                const startMinutes = timeToMinutes(formData.startTime);
                                const hours = parseInt(h) || 0;
                                const minutes = parseInt(m) || 0;
                                let totalMinutes = startMinutes + hours * 60 + minutes;

                                const newHours = Math.floor(totalMinutes / 60) % 24;
                                const newMinutes = totalMinutes % 60;
                                const period = newHours >= 12 ? 'PM' : 'AM';
                                const displayHours = newHours % 12 || 12;

                                const endTime = `${displayHours.toString().padStart(2, '0')}:${newMinutes.toString().padStart(2, '0')} ${period}`;
                                setFormData(prev => ({ ...prev, endTime }));
                                
                                // Update all days that haven't been customized
                                const updatedDetails = { ...dayDetails };
                                selectedDates.forEach(date => {
                                  if (!updatedDetails[date]) {
                                    updatedDetails[date] = {
                                      startTime: formData.startTime,
                                      endTime,
                                      description: '',
                                      venue: formData.venue,
                                      platform: formData.platform,
                                      link: formData.link,
                                    };
                                  } else if (updatedDetails[date].endTime === formData.endTime) {
                                    // Only update if it matches the old default (not custom)
                                    updatedDetails[date] = {
                                      ...updatedDetails[date],
                                      endTime,
                                    };
                                  }
                                });
                                setDayDetails(updatedDetails);
                              }
                            }}
                            colors={colors}
                          />

                          <AdvancedTimePicker 
                            time={formData.endTime}
                            onTimeChange={(time) => {
                              setFormData({ ...formData, endTime: time, durationHours: '', durationMinutes: '' });
                              // Update all days that haven't been customized
                              const updatedDetails = { ...dayDetails };
                              selectedDates.forEach(date => {
                                if (!updatedDetails[date]) {
                                  updatedDetails[date] = {
                                    startTime: formData.startTime,
                                    endTime: time,
                                    description: '',
                                    venue: formData.venue,
                                    platform: formData.platform,
                                    link: formData.link,
                                  };
                                } else if (updatedDetails[date].endTime === formData.endTime) {
                                  // Only update if it matches the old default (not custom)
                                  updatedDetails[date] = {
                                    ...updatedDetails[date],
                                    endTime: time,
                                  };
                                }
                              });
                              setDayDetails(updatedDetails);
                            }}
                            label="To"
                            colors={colors}
                          />

                          {formData.startTime && formData.endTime && (
                            <View style={[styles.durationDisplay, { backgroundColor: colors.primaryLight + '40' }]}>
                              <Text style={[styles.durationDisplayText, { color: colors.primaryDark }]}>
                                Default Duration: {calculateDuration(formData.startTime, formData.endTime)}
                              </Text>
                            </View>
                          )}
                        </>
                      )}

                      <Text style={[styles.inputLabel, { color: colors.textMain }]}>Event Days Summary</Text>
                      <View style={[styles.daysSummaryContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                        {selectedDates.map((date, index) => {
                          const details = dayDetails[date] || {
                            startTime: formData.startTime,
                            endTime: formData.endTime,
                            description: '',
                            venue: formData.venue,
                            platform: formData.platform,
                            link: formData.link,
                          };
                          const duration = calculateDuration(details.startTime, details.endTime);
                          const hasCustomTime = details.startTime !== formData.startTime || details.endTime !== formData.endTime;
                          const hasCustomVenue = details.venue && details.venue !== formData.venue;
                          const hasCustomDetails = details.description || hasCustomTime || hasCustomVenue ||
                            (details.platform && details.platform !== formData.platform) ||
                            (details.link && details.link !== formData.link);
                          
                          return (
                            <View key={date} style={[styles.daySummaryRow, { borderBottomColor: colors.border }]}>
                              <View style={styles.dayNumberBadge}>
                                <Text style={[styles.dayNumberText, { color: colors.primary }]}>Day {index + 1}</Text>
                                {hasCustomDetails && (
                                  <View style={[styles.customBadge, { backgroundColor: colors.success }]}>
                                    <Text style={styles.customBadgeText}>Custom</Text>
                                  </View>
                                )}
                              </View>
                              <View style={styles.daySummaryContent}>
                                <Text style={[styles.daySummaryDate, { color: colors.textMain }]}>{formatFullDate(date)}</Text>
                                <View style={styles.daySummaryTimes}>
                                  <Text style={[styles.daySummaryTime, { color: colors.textMuted }]}>
                                    {formatTimeDisplay(details.startTime)} - {formatTimeDisplay(details.endTime)}
                                  </Text>
                                  {duration && (
                                    <Text style={[styles.daySummaryDuration, { color: colors.primaryDark }]}> • {duration}</Text>
                                  )}
                                  {hasCustomTime && (
                                    <Text style={[styles.customTimeIndicator, { color: colors.success }]}> (Custom)</Text>
                                  )}
                                </View>
                                {details.description ? (
                                  <Text style={[styles.daySummaryDesc, { color: colors.textMuted }]} numberOfLines={2}>
                                    {details.description}
                                  </Text>
                                ) : null}
                                {hasCustomVenue && details.venue && (
                                  <Text style={[styles.daySummaryVenue, { color: colors.textMuted }]} numberOfLines={1}>
                                    📍 {details.venue}
                                  </Text>
                                )}
                              </View>
                              <TouchableOpacity 
                                style={[styles.editDayTimeButton, { backgroundColor: colors.card, borderColor: colors.primary }]}
                                onPress={() => handleEditDay(index, date)}
                              >
                                <Text style={[styles.editDayTimeText, { color: colors.primary }]}>Edit</Text>
                              </TouchableOpacity>
                            </View>
                          );
                        })}
                      </View>
                      
                      <TouchableOpacity 
                        style={[styles.button, styles.setTimesButton, { backgroundColor: colors.primaryLight, borderColor: colors.primary }]}
                        onPress={() => {
                          if (selectedDates.length > 0) {
                            handleEditDay(0, selectedDates[0]);
                          }
                        }}
                      >
                        <Text style={[styles.setTimesButtonText, { color: colors.primaryDark }]}>Edit Day Details</Text>
                      </TouchableOpacity>
                    </>
                  )}

                  <Text style={[styles.inputLabel, { color: colors.textMain }]}>Category <Text style={{ color: colors.error }}>*</Text></Text>
                  <View style={styles.selectionRow}>
                    {CATEGORIES.map(c => (
                      <TouchableOpacity 
                        key={c} 
                        style={[styles.formChip, formData.category === c && styles.formChipActive, 
                          { backgroundColor: colors.surface, borderColor: colors.border }]} 
                        onPress={() => setFormData({ ...formData, category: c })}
                      >
                        <Text style={[styles.formChipText, formData.category === c && styles.formChipTextActive, 
                          { color: formData.category === c ? colors.white : colors.textMuted }]}>{c}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <Text style={[styles.inputLabel, { color: colors.textMain }]}>Event Attendance Option <Text style={{ color: colors.error }}>*</Text></Text>
                  <View style={styles.selectionRow}>
                    {APPEARANCES.map(a => (
                      <TouchableOpacity 
                        key={a} 
                        style={[styles.formChip, formData.appearance === a && styles.formChipActive, 
                          { backgroundColor: colors.surface, borderColor: colors.border }]} 
                        onPress={() => setFormData({ ...formData, appearance: a })}
                      >
                        <Text style={[styles.formChipText, formData.appearance === a && styles.formChipTextActive, 
                          { color: formData.appearance === a ? colors.white : colors.textMuted }]}>{a}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  {(formData.appearance === 'Physical Meeting' || formData.appearance === 'Both') && (
                    <>
                      {!(selectedDates.length > 1 && allDaysHaveDifferentVenues()) && (
                        <>
                          <Text style={[styles.inputLabel, { color: colors.textMain }]}>Default Venue <Text style={{ color: colors.error }}>*</Text></Text>
                          <TextInput 
                            style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.textMain }]} 
                            value={formData.venue} 
                            onChangeText={txt => setFormData({ ...formData, venue: txt })} 
                            placeholder="Physical location"
                            placeholderTextColor={colors.textMuted}
                          />
                        </>
                      )}
                    </>
                  )}

                  {(formData.appearance === 'Virtual Meeting' || formData.appearance === 'Both') && (
                    <>
                      <Text style={[styles.inputLabel, { color: colors.textMain }]}>Default Platform</Text>
                      <View style={styles.selectionRow}>
                        {PLATFORMS.map(p => (
                          <TouchableOpacity 
                            key={p} 
                            style={[styles.formChip, formData.platform === p && styles.formChipActive, 
                              { backgroundColor: colors.surface, borderColor: colors.border }]} 
                            onPress={() => setFormData({ ...formData, platform: p })}
                          >
                            <Text style={[styles.formChipText, formData.platform === p && styles.formChipTextActive, 
                              { color: formData.platform === p ? colors.white : colors.textMuted }]}>{p}</Text>
                            </TouchableOpacity>
                        ))}
                      </View>

                      <Text style={[styles.inputLabel, { color: colors.textMain }]}>Default Link</Text>
                      <TextInput 
                        style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.textMain }]} 
                        value={formData.link} 
                        onChangeText={txt => setFormData({ ...formData, link: txt })} 
                        placeholder="Meeting link "
                        placeholderTextColor={colors.textMuted}
                      />
                    </>
                  )}

                  {selectedDates.length === 1 ? (
                    <Text style={[styles.inputLabel, { color: colors.textMain }]}>General Description</Text>
                  ) : (
                    <Text style={[styles.inputLabel, { color: colors.textMain }]}>General Event Description (Overview)</Text>
                  )}
                  <TextInput 
                    style={[styles.input, styles.textArea, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.textMain }]} 
                    multiline 
                    value={formData.description} 
                    onChangeText={txt => setFormData({ ...formData, description: txt })} 
                    placeholder={selectedDates.length === 1 ? "Event details..." : "Overview of the multi-day event..."}
                    placeholderTextColor={colors.textMuted}
                  />

                  <TouchableOpacity style={[styles.submitButton, { backgroundColor: colors.primary }]} onPress={handleAddEvent}>
                    <Text style={styles.submitButtonText}>
                      {isEditingEvent ? 'Update Event' : (selectedDates.length > 1 ? `Create ${selectedDates.length} Events` : 'Publish Event')}
                    </Text>
                  </TouchableOpacity>
                </>
              )}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

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
    </SafeAreaView>
  );
}

/* ---------------- STYLES CREATOR ---------------- */
const createStyles = (colors: typeof LIGHT_COLORS) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { fontSize: 16, color: colors.textMain },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', padding: 20, alignItems: 'flex-start', backgroundColor: colors.card, borderBottomWidth: 1, borderBottomColor: colors.border },
  welcomeText: { fontSize: 12, color: colors.textMuted, fontWeight: '700', textTransform: 'uppercase' },
  header: { fontSize: 32, fontWeight: '900', color: colors.textMain },
  universityText: { fontSize: 14, color: colors.primary, marginTop: 4, fontWeight: '600' },
  addButton: { backgroundColor: colors.primary, width: 48, height: 48, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  addButtonText: { color: colors.white, fontSize: 24 },

  actionMenuOverlay: { flex: 1, justifyContent: 'flex-end' },
  actionMenuContainer: { backgroundColor: colors.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingVertical: 24, paddingBottom: 40 },
  actionMenuTitle: { fontSize: 20, fontWeight: '900', color: colors.textMain, marginBottom: 20, textAlign: 'center' },
  actionMenuButton: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, marginBottom: 12, backgroundColor: colors.surface, borderRadius: 16, paddingHorizontal: 16, borderWidth: 1, borderColor: colors.border },
  actionMenuButtonIcon: { fontSize: 32, marginRight: 16 },
  actionMenuButtonTitle: { fontSize: 16, fontWeight: '700', color: colors.textMain, marginBottom: 4 },
  actionMenuButtonSubtitle: { fontSize: 12, color: colors.textMuted },
  actionMenuCancel: { paddingVertical: 16, alignItems: 'center', marginTop: 12 },
  actionMenuCancelText: { fontSize: 16, fontWeight: '600', color: colors.textMuted },

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
    color: colors.textMuted,
    fontWeight: 'bold',
  },
  userEventContent: { flex: 1, padding: 16 },
  userEventTitle: { fontSize: 16, fontWeight: '700', color: colors.textMain, marginBottom: 8 },
  userEventDate: { fontSize: 13, color: colors.textMuted, marginBottom: 4 },
  userEventTime: { fontSize: 13, color: colors.textMuted, marginBottom: 4 },
  userEventVenue: { fontSize: 13, color: colors.textMuted },
  userEventDeleteBtn: { paddingHorizontal: 12, paddingVertical: 8, backgroundColor: colors.error + '20', borderRadius: 8, marginRight: 12 },
  userEventDeleteText: { fontSize: 12, fontWeight: '600', color: colors.error },

  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40 },
  emptyText: { fontSize: 18, fontWeight: '700', color: colors.textMain, textAlign: 'center', marginBottom: 8 },
  emptySubtext: { fontSize: 14, color: colors.textMuted, textAlign: 'center' },

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
    color: colors.primaryDark,
  },

  adBanner: { 
    marginHorizontal: 20, 
    marginTop: 20, 
    height: 160, 
    backgroundColor: colors.primary, 
    borderRadius: 20, 
    marginBottom: 20, 
    overflow: 'hidden',
  },
  adContent: { flex: 1, flexDirection: 'row', padding: 20 },
  adTextSide: { flex: 1.4 },
  liveTag: { backgroundColor: 'rgba(255,255,255,0.25)', alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  liveTagText: { color: colors.white, fontSize: 9, fontWeight: '900' },
  adTitle: { color: colors.white, fontSize: 20, fontWeight: '900' },
  adLocation: { color: colors.white, opacity: 0.9, fontSize: 13 },
  adTime: { color: colors.white, opacity: 0.8, fontSize: 12 },
  adFlyerSide: { flex: 1 },
  adFlyerImage: { width: '100%', height: '100%' },
  adPlaceholder: { width: '100%', height: '100%', backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center' },
  adPlaceholderText: { color: colors.white, fontSize: 10 },

  scrollPadding: { paddingHorizontal: 20 },
  categoryChip: { paddingVertical: 10, paddingHorizontal: 18, backgroundColor: colors.card, marginRight: 8, borderRadius: 12, borderWidth: 1, borderColor: colors.border },
  activeCategory: { backgroundColor: colors.primary, borderColor: colors.primary },
  categoryText: { fontWeight: '600', fontSize: 13 },
  activeCategoryText: { color: colors.white, fontWeight: '700' },

  card: { backgroundColor: colors.card, borderRadius: 20, marginBottom: 16, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
  cardLayout: { flexDirection: 'row', padding: 16 },
  flyerContainer: { width: 90, height: 120, backgroundColor: colors.surface, borderRadius: 12, overflow: 'hidden' },
  flyerImage: { width: '100%', height: '100%' },
  placeholderFlyer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  placeholderText: { fontSize: 10, color: colors.textMuted, fontWeight: 'bold' },
  cardContent: { flex: 1, paddingLeft: 16 },
  tagRow: { flexDirection: 'row', gap: 6, marginBottom: 8, flexWrap: 'wrap' },
  categoryBadge: { backgroundColor: colors.surface, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  categoryBadgeText: { fontSize: 9, fontWeight: '800', color: colors.textMuted },
  appearanceBadge: { backgroundColor: colors.primaryLight + '30', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  appearanceBadgeText: { fontSize: 9, fontWeight: '800', color: colors.primaryDark },
  multiDayBadge: { backgroundColor: colors.info + '20', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  multiDayBadgeText: { fontSize: 9, fontWeight: '800', color: colors.info },
  title: { fontSize: 16, fontWeight: '800', color: colors.textMain },
  organizerText: { fontSize: 12, fontWeight: '600', color: colors.primary },
  footerInfo: { fontSize: 11, color: colors.textMuted, marginTop: 4 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: colors.card, borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: colors.border },
  modalTitle: { fontSize: 24, fontWeight: '900', color: colors.textMain },
  closeBtn: { backgroundColor: colors.surface, width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  closeBtnText: { fontSize: 16, color: colors.textMuted },

  inputLabel: { fontSize: 12, fontWeight: '800', marginBottom: 8, color: colors.textMain, textTransform: 'uppercase' },
  input: { backgroundColor: colors.surface, padding: 16, borderRadius: 14, marginBottom: 20, borderWidth: 1, borderColor: colors.border, fontSize: 15, color: colors.textMain },
  textArea: { height: 100, textAlignVertical: 'top' },

  uploadBox: { width: 140, height: 180, alignSelf: 'center', borderWidth: 2, borderStyle: 'dashed', borderColor: colors.border, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginBottom: 24, backgroundColor: colors.surface },
  uploadBoxActive: { borderColor: colors.primary, borderStyle: 'solid', backgroundColor: colors.primaryLight + '20' },
  uploadInner: { alignItems: 'center' },
  uploadIcon: { fontSize: 32, marginBottom: 12, color: colors.primary },
  uploadPreview: { width: '100%', height: '100%' },
  uploadText: { color: colors.textMain, fontWeight: '600', fontSize: 14 },
  uploadSubtext: { color: colors.textMuted, fontSize: 11 },

  dateInputCard: { backgroundColor: colors.surface, padding: 16, borderRadius: 14, borderWidth: 1, borderColor: colors.border, flexDirection: 'row', alignItems: 'flex-start', marginBottom: 20 },
  dateInputIconContainer: { width: 40, height: 40, backgroundColor: colors.card, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginRight: 12, marginTop: 4 },
  dateInputIcon: { fontSize: 18, color: colors.primary },
  dateInputTextContainer: { flex: 1 },
  dateInputLabel: { fontSize: 12, fontWeight: '800', color: colors.textMain, textTransform: 'uppercase', marginBottom: 4 },
  dateInputValue: { fontSize: 15, fontWeight: '600', color: colors.textMain },
  dateInputArrow: { fontSize: 18, color: colors.textMuted, marginTop: 8 },

  multiDateText: {
    fontSize: 13,
    color: colors.textMuted,
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
    color: colors.primaryDark,
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
    color: colors.white,
    fontSize: 8,
    fontWeight: '700',
  },
  daySummaryContent: {
    flex: 1,
  },
  daySummaryDate: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textMain,
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
    color: colors.textMuted,
    fontWeight: '600',
  },
  daySummaryDuration: {
    fontSize: 13,
    color: colors.primaryDark,
    fontWeight: '700',
  },
  daySummaryDesc: {
    fontSize: 11,
    color: colors.textMuted,
    fontStyle: 'italic',
    marginTop: 2,
  },
  daySummaryVenue: {
    fontSize: 11,
    color: colors.textMuted,
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
    color: colors.primaryDark,
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
    color: colors.primaryDark,
    textAlign: 'center',
  },
  dayEditorSubdate: {
    fontSize: 14,
    color: colors.textMuted,
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
    color: colors.textMuted,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  timeInputValue: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textMain,
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
    color: colors.textMain,
  },
  durationLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textMuted,
    minWidth: 20,
  },

  selectionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  formChip: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 12, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  formChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  formChipText: { fontSize: 13, fontWeight: '600', color: colors.textMuted },
  formChipTextActive: { color: colors.white, fontWeight: '700' },

  submitButton: { backgroundColor: colors.primary, padding: 20, borderRadius: 16, alignItems: 'center', marginVertical: 20 },
  submitButtonText: { color: colors.white, fontWeight: '800', fontSize: 16 },

  calendarNavHeader: { marginBottom: 20, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: colors.border },
  calendarBackButton: { flexDirection: 'row', alignItems: 'center', padding: 12, backgroundColor: colors.surface, borderRadius: 10 },
  calendarBackIcon: { fontSize: 16, marginRight: 8, color: colors.textMain },
  calendarBackText: { fontSize: 14, fontWeight: '600', color: colors.textMain },

  calendarContainer: { backgroundColor: colors.card, borderRadius: 20, padding: 20, borderWidth: 1, borderColor: colors.border },
  calendarHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  calendarTitle: { fontSize: 20, fontWeight: '900', color: colors.textMain },
  calendarActions: { flexDirection: 'row', gap: 8 },
  actionButton: { paddingVertical: 8, paddingHorizontal: 12, backgroundColor: colors.surface, borderRadius: 10, borderWidth: 1, borderColor: colors.border },
  actionButtonActive: { backgroundColor: colors.primaryLight, borderColor: colors.primary },
  actionButtonText: { fontSize: 13, fontWeight: '600', color: colors.textMain },
  actionButtonTextActive: { color: colors.white },
  clearButton: { paddingVertical: 8, paddingHorizontal: 12, backgroundColor: colors.error + '20', borderRadius: 10 },
  clearButtonText: { fontSize: 13, fontWeight: '600', color: colors.error },

  rangeHint: { padding: 12, backgroundColor: colors.primaryLight + '30', borderRadius: 10, marginBottom: 16 },
  rangeHintText: { fontSize: 14, color: colors.primaryDark, textAlign: 'center', fontWeight: '600' },

  calendarStyle: { borderRadius: 16, overflow: 'hidden', marginBottom: 20 },

  selectedSummary: { marginTop: 10 },
  selectedCount: { fontSize: 15, fontWeight: '700', color: colors.primary, marginBottom: 12 },
  dateChip: { backgroundColor: colors.primary, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, marginRight: 8 },
  dateChipText: { color: colors.white, fontSize: 12, fontWeight: '700' },

  timeInputContainer: { flex: 1, backgroundColor: colors.surface, padding: 16, borderRadius: 14, borderWidth: 1, borderColor: colors.border, flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  timeInputIconContainer: { width: 40, height: 40, backgroundColor: colors.card, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  timeInputIcon: { fontSize: 18, color: colors.primary },
  timeInputTextContainer: { flex: 1 },
  timeInputLabel: { fontSize: 11, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase' },
  timeInputPlaceholder: { fontSize: 15, color: colors.textMuted },
  timeInputValue: { fontSize: 15, fontWeight: '600', color: colors.textMain },
  timeInputArrowContainer: { width: 24, height: 24, justifyContent: 'center', alignItems: 'center' },
  timeInputArrow: { fontSize: 12, color: colors.textMuted },

  timePickerOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  timePickerContainer: { backgroundColor: colors.card, borderRadius: 24, width: '100%', maxWidth: 400 },
  timePickerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 24, borderBottomWidth: 1, borderBottomColor: colors.border },
  timePickerTitle: { fontSize: 20, fontWeight: '900', color: colors.textMain },
  timePickerCloseButton: { width: 36, height: 36, backgroundColor: colors.surface, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  timePickerClose: { fontSize: 16, color: colors.textMuted },
  timePickerBody: { flexDirection: 'row', padding: 24, gap: 16 },
  timeColumnContainer: { flex: 1 },
  timeColumnLabel: { fontSize: 12, fontWeight: '700', color: colors.textMuted, textAlign: 'center', marginBottom: 8 },
  timeColumn: { maxHeight: 200, backgroundColor: colors.surface, borderRadius: 12 },
  timeOption: { paddingVertical: 12, alignItems: 'center' },
  timeOptionSelected: { backgroundColor: colors.primary, borderRadius: 8 },
  timeOptionText: { fontSize: 15, fontWeight: '600', color: colors.textMain },
  timeOptionTextSelected: { color: colors.white, fontWeight: '700' },
  periodContainer: { flexDirection: 'row', justifyContent: 'center', gap: 12 },
  periodOption: { paddingVertical: 12, paddingHorizontal: 24, backgroundColor: colors.surface, borderRadius: 10, borderWidth: 1, borderColor: colors.border },
  periodOptionSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  periodOptionText: { fontSize: 15, fontWeight: '600', color: colors.textMain },
  periodOptionTextSelected: { color: colors.white },
  timePickerFooter: { padding: 24, borderTopWidth: 1, borderTopColor: colors.border },
  selectedTimePreviewContainer: { flexDirection: 'row', justifyContent: 'space-between', padding: 16, backgroundColor: colors.primaryLight + '20', borderRadius: 12, marginBottom: 20 },
  selectedTimeLabel: { fontSize: 14, fontWeight: '700', color: colors.primaryDark },
  selectedTimeValue: { fontSize: 18, fontWeight: '900', color: colors.primaryDark },
  timeConfirmButton: { backgroundColor: colors.primary, padding: 18, borderRadius: 14, alignItems: 'center' },
  timeConfirmButtonText: { color: colors.white, fontWeight: '800', fontSize: 16 },

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
    color: colors.textMain,
  },
  eventDetailsBackBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eventDetailsBackIcon: {
    fontSize: 28,
    color: colors.textMain,
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
    shadowColor: colors.textMain,
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
    shadowColor: colors.textMain,
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
    shadowColor: colors.textMain,
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
    color: colors.textMuted,
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
    color: colors.textMain,
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
    color: colors.primaryDark,
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
    color: colors.textMuted,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  eventDetailsCardValue: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textMain,
    lineHeight: 22,
  },
  eventDetailsCardSubValue: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 2,
    fontStyle: 'italic',
  },
  eventDetailsDescriptionText: {
    fontSize: 14,
    color: colors.textMain,
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
  eventDetailsActionButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.white,
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
    color: colors.white,
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
  eventDetailsFlyerTapHint: {
    position: 'absolute',
    bottom: 10,
    alignSelf: 'center',
    fontSize: 12,
    fontWeight: '600',
    color: colors.white,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
});