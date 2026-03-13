import React, { useState } from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { Calendar, DateData } from 'react-native-calendars';
import { createStyles, type LightColors } from '../index';

const getTodayUTC = () => new Date().toISOString().split('T')[0];

export const MultiDayCalendar = ({
  selectedDates,
  onDatesChange,
  onApply,
  colors,
}: {
  selectedDates: string[];
  onDatesChange: (dates: string[]) => void;
  onApply: (dates: string[]) => void;
  colors: LightColors;
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
        let start = new Date(tempStart);
        let end = new Date(dateStr);
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
        selectedTextColor: '#ffffff',
      };
    });

    if (tempStart && isRangeMode) {
      marked[tempStart] = {
        ...marked[tempStart],
        startingDay: true,
        color: colors.primaryLight,
        textColor: '#ffffff',
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
export default MultiDayCalendar;
