import React, { useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, ScrollView, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { Calendar, DateData } from 'react-native-calendars';
import { AdvancedTimePicker } from './AdvancedTimePicker';
import { MultiDayCalendar } from './MultiDayCalendar';
import { createStyles, formatShortDate, LIGHT_COLORS } from '../index';

type FilterType =
  | 'All'
  | 'Today'
  | 'Tomorrow'
  | 'This Week'
  | 'This Month'
  | 'Next Month'
  | `Specific Day: ${string}`
  | `Selected Days: ${string}`;

const getTodayUTC = () => new Date().toISOString().split('T')[0];

export const FilterModal = ({
  visible,
  onClose,
  colors,
  onApplyFilter,
  currentFilter,
}: {
  visible: boolean;
  onClose: () => void;
  colors: typeof LIGHT_COLORS;
  onApplyFilter: (filter: FilterType) => void;
  currentFilter: FilterType;
}) => {
  const { width } = useWindowDimensions();
  const isLargeScreen = width >= 768;

  const [selectedFilter, setSelectedFilter] = useState<FilterType>(currentFilter);
  const [customDate, setCustomDate] = useState<string>(getTodayUTC());
  const [startTime, setStartTime] = useState<string>('09:00 AM');
  const [endTime, setEndTime] = useState<string>('05:00 PM');
  const [showCustomDatePicker, setShowCustomDatePicker] = useState(false);
  const [showTimeRange, setShowTimeRange] = useState(false);
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [showMultiDayPicker, setShowMultiDayPicker] = useState(false);

  const styles = createStyles(colors);

  const getDateRange = (filterType: string): { start: string; end: string } => {
    const today = new Date();
    const start = new Date();
    const end = new Date();

    switch (filterType) {
      case 'Today':
        return { start: today.toISOString().split('T')[0], end: today.toISOString().split('T')[0] };
      case 'Tomorrow':
        start.setDate(today.getDate() + 1);
        end.setDate(today.getDate() + 1);
        return { start: start.toISOString().split('T')[0], end: end.toISOString().split('T')[0] };
      case 'This Week':
        const dayOfWeek = today.getDay();
        const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
        start.setDate(today.getDate() + diffToMonday);
        end.setDate(start.getDate() + 6);
        return { start: start.toISOString().split('T')[0], end: end.toISOString().split('T')[0] };
      case 'This Month':
        start.setDate(1);
        end.setMonth(today.getMonth() + 1, 0);
        return { start: start.toISOString().split('T')[0], end: end.toISOString().split('T')[0] };
      case 'Next Month':
        start.setMonth(today.getMonth() + 1, 1);
        end.setMonth(today.getMonth() + 2, 0);
        return { start: start.toISOString().split('T')[0], end: end.toISOString().split('T')[0] };
      default:
        return { start: getTodayUTC(), end: getTodayUTC() };
    }
  };

  const handleApplyFilter = () => {
    onApplyFilter(selectedFilter);
    onClose();
  };

  const handleResetFilter = () => {
    setSelectedFilter('All');
    setShowTimeRange(false);
    onApplyFilter('All');
    onClose();
  };

  const renderFilterOption = (label: string, value: FilterType, icon: string) => (
    <TouchableOpacity
      style={[
        styles.filterOption,
        selectedFilter === value && styles.filterOptionSelected,
        { backgroundColor: colors.surface, borderColor: colors.border },
      ]}
      onPress={() => setSelectedFilter(value)}
    >
      <Text style={styles.filterOptionIcon}>{icon}</Text>
      <Text
        style={[
          styles.filterOptionText,
          { color: selectedFilter === value ? colors.primary : colors.text },
        ]}
      >
        {label}
      </Text>
      {selectedFilter === value && (
        <Text style={[styles.filterOptionCheck, { color: colors.primary }]}>✓</Text>
      )}
    </TouchableOpacity>
  );

  const renderTimeFilterSection = () => (
    <View style={[styles.timeFilterSection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <TouchableOpacity
        style={[styles.timeFilterToggle, { borderBottomColor: colors.border }]}
        onPress={() => setShowTimeRange(!showTimeRange)}
      >
        <Text style={[styles.timeFilterLabel, { color: colors.text }]}>🕒 Time Specific Filter</Text>
        <Text style={[styles.timeFilterToggleIcon, { color: colors.textSecondary }]}>
          {showTimeRange ? '▲' : '▼'}
        </Text>
      </TouchableOpacity>

      {showTimeRange && (
        <View style={styles.timeRangeContent}>
          <View style={styles.timeInputRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.timeFilterSubLabel, { color: colors.textSecondary }]}>From</Text>
              <AdvancedTimePicker
                time={startTime}
                onTimeChange={setStartTime}
                label="Start Time"
                colors={colors}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.timeFilterSubLabel, { color: colors.textSecondary }]}>To</Text>
              <AdvancedTimePicker
                time={endTime}
                onTimeChange={setEndTime}
                label="End Time"
                colors={colors}
              />
            </View>
          </View>
          <Text style={[styles.timeFilterHint, { color: colors.textTertiary }]}>
            Only show events happening between these times
          </Text>
        </View>
      )}
    </View>
  );

  const renderCustomDatePicker = () => (
    <Modal visible={showCustomDatePicker} transparent animationType="fade">
      <View style={styles.timePickerOverlay}>
        <View style={styles.timePickerContainer}>
          <View style={styles.timePickerHeader}>
            <Text style={styles.timePickerTitle}>Select Specific Date</Text>
            <TouchableOpacity onPress={() => setShowCustomDatePicker(false)} style={styles.timePickerCloseButton}>
              <Text style={styles.timePickerClose}>✕</Text>
            </TouchableOpacity>
          </View>
          <Calendar
            minDate={getTodayUTC()}
            onDayPress={(day: DateData) => {
              setCustomDate(day.dateString);
              setSelectedFilter(`Specific Day: ${formatShortDate(day.dateString)}`);
              setShowCustomDatePicker(false);
            }}
            markedDates={{
              [customDate]: {
                selected: true,
                selectedColor: colors.primary,
                selectedTextColor: '#ffffff',
              },
            }}
            theme={{
              backgroundColor: colors.card,
              calendarBackground: colors.card,
              textSectionTitleColor: colors.textSecondary,
              selectedDayBackgroundColor: colors.primary,
              selectedDayTextColor: '#ffffff',
              todayTextColor: colors.primary,
              dayTextColor: colors.text,
              textDisabledColor: colors.border,
              arrowColor: colors.primary,
              monthTextColor: colors.text,
              textDayFontWeight: '600',
              textMonthFontWeight: 'bold',
              textDayHeaderFontWeight: '700',
              textDayFontSize: 15,
              textMonthFontSize: 18,
              textDayHeaderFontSize: 13,
            }}
            style={styles.calendarStyle}
          />
        </View>
      </View>
    </Modal>
  );

  const renderMultiDayPicker = () => (
    <Modal visible={showMultiDayPicker} transparent animationType="fade">
      <View style={styles.timePickerOverlay}>
        <View style={styles.timePickerContainer}>
          <View style={styles.timePickerHeader}>
            <Text style={styles.timePickerTitle}>Select Multiple Days</Text>
            <TouchableOpacity onPress={() => setShowMultiDayPicker(false)} style={styles.timePickerCloseButton}>
              <Text style={styles.timePickerClose}>✕</Text>
            </TouchableOpacity>
          </View>
          <MultiDayCalendar
            selectedDates={selectedDays}
            onDatesChange={setSelectedDays}
            onApply={(dates) => {
              if (dates.length > 0) {
                setSelectedFilter(`Selected Days: ${dates.length} days`);
              }
              setShowMultiDayPicker(false);
            }}
            colors={colors}
          />
        </View>
      </View>
    </Modal>
  );

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={[
          styles.modalOverlay,
          { justifyContent: isLargeScreen ? 'center' : 'flex-end' },
        ]}
      >
        <View
          style={[
            styles.modalContent,
            {
              backgroundColor: colors.card,
              width: isLargeScreen ? Math.min(width * 0.8, 800) : '100%',
              alignSelf: 'center',
              borderRadius: isLargeScreen ? 24 : undefined,
              maxHeight: isLargeScreen ? '92%' : '90%',
            },
          ]}
        >
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Filter Events</Text>
            <TouchableOpacity onPress={onClose} style={[styles.closeBtn, { backgroundColor: colors.surface }]}>
              <Text style={[styles.closeBtnText, { color: colors.textSecondary }]}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
            <Text style={[styles.filterSectionTitle, { color: colors.text }]}>Quick Filters</Text>
            {renderFilterOption('All Events', 'All', '📋')}
            {renderFilterOption('Today', 'Today', '📅')}
            {renderFilterOption('Tomorrow', 'Tomorrow', '⏩')}
            {renderFilterOption('This Week', 'This Week', '📆')}
            {renderFilterOption('This Month', 'This Month', '🗓️')}
            {renderFilterOption('Next Month', 'Next Month', '➡️')}

            <Text style={[styles.filterSectionTitle, { color: colors.text, marginTop: 24 }]}>Custom Filters</Text>
            <TouchableOpacity
              style={[
                styles.filterOption,
                selectedFilter.startsWith('Specific Day') && styles.filterOptionSelected,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
              onPress={() => setShowCustomDatePicker(true)}
            >
              <Text style={styles.filterOptionIcon}>🎯</Text>
              <Text
                style={[
                  styles.filterOptionText,
                  { color: selectedFilter.startsWith('Specific Day') ? colors.primary : colors.text },
                ]}
              >
                {selectedFilter.startsWith('Specific Day') ? selectedFilter : 'Specific Day'}
              </Text>
              <Text style={[styles.filterOptionArrow, { color: colors.textSecondary }]}>›</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.filterOption,
                selectedFilter.startsWith('Selected Days') && styles.filterOptionSelected,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
              onPress={() => setShowMultiDayPicker(true)}
            >
              <Text style={styles.filterOptionIcon}>🗓️</Text>
              <Text
                style={[
                  styles.filterOptionText,
                  { color: selectedFilter.startsWith('Selected Days') ? colors.primary : colors.text },
                ]}
              >
                {selectedFilter.startsWith('Selected Days') ? selectedFilter : 'Multiple Days'}
              </Text>
              <Text style={[styles.filterOptionArrow, { color: colors.textSecondary }]}>›</Text>
            </TouchableOpacity>

            {renderTimeFilterSection()}

            <View style={styles.filterActions}>
              <TouchableOpacity
                style={[
                  styles.filterActionButton,
                  styles.filterResetButton,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                ]}
                onPress={handleResetFilter}
              >
                <Text style={[styles.filterResetButtonText, { color: colors.text }]}>Reset Filter</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.filterActionButton, styles.filterApplyButton, { backgroundColor: colors.primary }]}
                onPress={handleApplyFilter}
              >
                <Text style={styles.filterApplyButtonText}>Apply Filter</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
      {renderCustomDatePicker()}
      {renderMultiDayPicker()}
    </Modal>
  );
};