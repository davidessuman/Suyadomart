import React, { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  calculateDuration,
  createStyles,
  formatFullDate,
  formatShortDate,
  TimePickerInner,
  timeToMinutes,
  type LightColors,
} from '../index';

interface DayDetails {
  startTime: string;
  endTime: string;
  description: string;
  venue?: string;
  platform?: string;
  link?: string;
}

export const DayEditorModal = ({
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
  colors: LightColors;
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

  /* Unused
  const handleStartTimeChange = (time: string) => {
    setLocalData({ ...localData, startTime: time });
    if (durationHours || durationMinutes) {
      const newEndTime = calculateEndTime(time, durationHours, durationMinutes);
      setLocalData(prev => ({ ...prev, endTime: newEndTime }));
    }
  };
  */

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
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="number-pad"
                  style={styles.durationInput}
                />
                <Text style={styles.durationLabel}>h</Text>
                <TextInput
                  value={durationMinutes}
                  onChangeText={txt => handleDurationChange(durationHours, txt.replace(/[^0-9]/g, ''))}
                  placeholder="0"
                  placeholderTextColor={colors.textSecondary}
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
                placeholderTextColor={colors.textSecondary}
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
                  placeholderTextColor={colors.textSecondary}
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
                  placeholderTextColor={colors.textSecondary}
                />

                <Text style={styles.inputLabel}>Link for this day (Optional)</Text>
                <TextInput
                  style={styles.input}
                  value={localData.link || ''}
                  onChangeText={txt => setLocalData({ ...localData, link: txt })}
                  placeholder="Leave empty to use default link"
                  placeholderTextColor={colors.textSecondary}
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

export default DayEditorModal;
