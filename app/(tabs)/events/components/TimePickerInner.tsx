import React, { useEffect, useState } from 'react';
import { ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { createStyles, LIGHT_COLORS } from '../index';

export const TimePickerInner = ({
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
            <Text style={{ fontSize: 12, color: colors.textSecondary }}>Clock</Text>
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
              <Text style={{ fontSize: 12, color: colors.textSecondary }}>Duration (h m)</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 }}>
                <TextInput
                  value={durationHours}
                  onChangeText={txt => onDurationChange(txt.replace(/[^0-9]/g, ''), durationMinutes || '')}
                  placeholder="0"
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="number-pad"
                  style={[styles.durationInput, { width: 60 }]}
                />
                <Text style={styles.durationLabel}>h</Text>
                <TextInput
                  value={durationMinutes}
                  onChangeText={txt => onDurationChange(durationHours || '', txt.replace(/[^0-9]/g, ''))}
                  placeholder="0"
                  placeholderTextColor={colors.textSecondary}
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

  export default TimePickerInner;