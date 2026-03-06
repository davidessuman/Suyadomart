import React from 'react';
import { Modal, KeyboardAvoidingView, View, Text, TouchableOpacity, ScrollView, Platform, useWindowDimensions } from 'react-native';
import { Calendar, DateData } from 'react-native-calendars';
import { AdvancedTimePicker } from './AdvancedTimePicker';

type ReminderSelection = { date: string; times: string[] };

type Props = {
  reminderModalVisible: boolean;
  setReminderModalVisible: (value: boolean) => void;
  styles: any;
  colors: any;
  setShowReminderDatePicker: (value: boolean) => void;
  reminderSelections: ReminderSelection[];
  formatFullDate: (date: string) => string;
  formatTimeDisplay: (time: string) => string;
  setReminderSelections: React.Dispatch<React.SetStateAction<ReminderSelection[]>>;
  setEditingReminderDate: (value: string | null) => void;
  setEditingReminderTime: (value: { date: string; time: string | null } | null) => void;
  setShowReminderTimePicker: (value: boolean) => void;
  isReminderValid: () => boolean;
  handleAddReminderToCalendar: () => void;
  renderGoogleCalendarOption: () => React.ReactNode;
  showReminderDatePicker: boolean;
  getTodayUTC: () => string;
  getReminderMaxDate: () => string | undefined;
  showReminderTimePicker: boolean;
  reminderEvent: any;
  editingReminderDate: string | null;
};

export function ReminderModal({
  reminderModalVisible,
  setReminderModalVisible,
  styles,
  colors,
  setShowReminderDatePicker,
  reminderSelections,
  formatFullDate,
  formatTimeDisplay,
  setReminderSelections,
  setEditingReminderDate,
  setEditingReminderTime,
  setShowReminderTimePicker,
  isReminderValid,
  handleAddReminderToCalendar,
  renderGoogleCalendarOption,
  showReminderDatePicker,
  getTodayUTC,
  getReminderMaxDate,
  showReminderTimePicker,
  reminderEvent,
  editingReminderDate,
}: Props) {
  const { width } = useWindowDimensions();
  const isLargeScreen = width >= 768;

  return (
    <Modal visible={reminderModalVisible} animationType="slide" transparent>
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
              maxHeight: isLargeScreen ? '92%' : '100%',
            },
          ]}
        >
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Set Reminders</Text>
            <TouchableOpacity onPress={() => setReminderModalVisible(false)} style={[styles.closeBtn, { backgroundColor: colors.surface }]}> 
              <Text style={[styles.closeBtnText, { color: colors.textSecondary }]}>✕</Text>
            </TouchableOpacity>
          </View>
          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={[styles.inputLabel, { color: colors.text }]}>Reminder Day</Text>
            <TouchableOpacity
              style={[styles.dateInputCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={() => setShowReminderDatePicker(true)}
            >
              <View style={[styles.dateInputIconContainer, { backgroundColor: colors.card }]}>
                <Text style={[styles.dateInputIcon, { color: colors.primary }]}>📅</Text>
              </View>
              <View style={styles.dateInputTextContainer}>
                <Text style={[styles.dateInputLabel, { color: colors.text }]}>Select Day</Text>
                <Text style={[styles.dateInputValue, { color: colors.text }]}>{reminderSelections[0] ? formatFullDate(reminderSelections[0].date) : ''}</Text>
              </View>
              <Text style={[styles.dateInputArrow, { color: colors.textSecondary }]}>›</Text>
            </TouchableOpacity>
            {reminderSelections[0] && (
              <View style={{ marginBottom: 12, padding: 10, backgroundColor: colors.surface, borderRadius: 10, borderWidth: 1, borderColor: colors.border }}>
                <Text style={{ color: colors.primary, fontWeight: '700' }}>{formatFullDate(reminderSelections[0].date)}</Text>
                {reminderSelections[0].times.length === 1 && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                    <Text style={{ color: colors.text, fontSize: 15 }}>{formatTimeDisplay(reminderSelections[0].times[0])}</Text>
                    <TouchableOpacity onPress={() => {
                      setReminderSelections(reminderSelections => [{
                        date: reminderSelections[0].date,
                        times: []
                      }]);
                    }} style={{ marginLeft: 10, padding: 2, borderRadius: 6, backgroundColor: colors.error + '11' }}>
                      <Text style={{ color: colors.error, fontSize: 16 }}>Remove ✕</Text>
                    </TouchableOpacity>
                  </View>
                )}
                {reminderSelections[0].times.length === 0 && (
                  <TouchableOpacity onPress={() => {
                    setEditingReminderDate(reminderSelections[0].date);
                    setEditingReminderTime({ date: reminderSelections[0].date, time: null });
                    setShowReminderTimePicker(true);
                  }} style={{ marginTop: 8, alignSelf: 'flex-start', padding: 4, borderRadius: 6, backgroundColor: colors.primary + '11' }}>
                    <Text style={{ color: colors.primary }}>+ Set Time</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
            <TouchableOpacity
              style={[styles.submitButton, { backgroundColor: isReminderValid() ? colors.primary : colors.textTertiary }]}
              onPress={handleAddReminderToCalendar}
              disabled={!isReminderValid()}
            >
              <Text style={styles.submitButtonText}>Add All to Calendar</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
      {renderGoogleCalendarOption()}
      {/* Date Picker Modal for selecting the day */}
      <Modal visible={showReminderDatePicker} transparent animationType="fade">
        <View style={styles.timePickerOverlay}>
          <View style={[styles.timePickerContainer, { backgroundColor: colors.card }]}> 
            <View style={[styles.timePickerHeader, { borderBottomColor: colors.border }]}> 
              <Text style={[styles.timePickerTitle, { color: colors.text }]}>Select Reminder Day</Text>
              <TouchableOpacity onPress={() => setShowReminderDatePicker(false)} style={[styles.timePickerCloseButton, { backgroundColor: colors.surface }]}> 
                <Text style={[styles.timePickerClose, { color: colors.textSecondary }]}>✕</Text>
              </TouchableOpacity>
            </View>
            <Calendar
              minDate={getTodayUTC()}
              maxDate={getReminderMaxDate()}
              onDayPress={(day: DateData) => {
                setReminderSelections([{ date: day.dateString, times: reminderSelections[0]?.times || [] }]);
                setShowReminderDatePicker(false);
              }}
              markedDates={reminderSelections[0] ? { [reminderSelections[0].date]: { selected: true, selectedColor: colors.primary, selectedTextColor: '#fff' } } : {}}
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
      {/* Time Picker Modal for adding time to a day */}
      <Modal visible={showReminderTimePicker} transparent animationType="fade">
        <View style={styles.timePickerOverlay}>
          <View style={styles.timePickerContainer}>
            <View style={styles.timePickerHeader}>
              <Text style={styles.timePickerTitle}>Select Reminder Time</Text>
              <TouchableOpacity onPress={() => setShowReminderTimePicker(false)} style={styles.timePickerCloseButton}>
                <Text style={styles.timePickerClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <AdvancedTimePicker
              time={reminderEvent?.startTime || '12:00 PM'}
              onTimeChange={time => {
                if (editingReminderDate) {
                  setReminderSelections(prev => [{
                    date: editingReminderDate,
                    times: [time]
                  }]);
                }
                setShowReminderTimePicker(false);
              }}
              label="Reminder Time"
              colors={colors}
            />
          </View>
        </View>
      </Modal>
    </Modal>
  );
}
