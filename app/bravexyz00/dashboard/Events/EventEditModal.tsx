import React, { useEffect, useMemo, useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Calendar, DateData } from 'react-native-calendars';
import { supabase } from '../../../../lib/supabase';

const CATEGORIES = ['General', 'Entertainment', 'Educational', 'Political', 'Religious'] as const;
const APPEARANCES = ['Physical Meeting', 'Virtual Meeting', 'Both'] as const;
const PRIORITIES = ['Not Urgent', 'Urgent'] as const;

const parseAnnouncementDate = (value: string | null | undefined) => {
  if (!value) return '';
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed) && parsed[0]) return String(parsed[0]);
  } catch {
    return value;
  }
  return '';
};

const toTwelveHour = (raw: string) => {
  if (!raw) return '';
  if (/AM|PM/i.test(raw)) return raw;
  const [h = '0', m = '00'] = raw.split(':');
  const hour24 = Number(h);
  if (Number.isNaN(hour24)) return raw;
  const period = hour24 >= 12 ? 'PM' : 'AM';
  const hour12 = hour24 % 12 || 12;
  return `${String(hour12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${period}`;
};

const TimePickerField = ({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) => {
  const [showPicker, setShowPicker] = useState(false);
  const [hour, setHour] = useState('12');
  const [minute, setMinute] = useState('00');
  const [period, setPeriod] = useState<'AM' | 'PM'>('AM');

  useEffect(() => {
    const normalized = toTwelveHour(value);
    if (!normalized) return;
    const [timePart, periodPart] = normalized.split(' ');
    const [h, m] = (timePart || '12:00').split(':');
    setHour(h || '12');
    setMinute(m || '00');
    setPeriod(periodPart === 'PM' ? 'PM' : 'AM');
  }, [value]);

  const hours = Array.from({ length: 12 }, (_, idx) => String(idx + 1).padStart(2, '0'));
  const minutes = Array.from({ length: 60 }, (_, idx) => String(idx).padStart(2, '0'));

  return (
    <>
      <TouchableOpacity style={styles.selectorButton} onPress={() => setShowPicker(true)} activeOpacity={0.8}>
        <Text style={styles.selectorButtonLabel}>{label}</Text>
        <Text style={styles.selectorButtonValue}>{value || 'Select time'}</Text>
      </TouchableOpacity>

      <Modal visible={showPicker} transparent animationType="fade">
        <View style={styles.timePickerOverlay}>
          <View style={styles.timePickerContainer}>
            <View style={styles.timePickerHeader}>
              <Text style={styles.timePickerTitle}>{label}</Text>
              <TouchableOpacity onPress={() => setShowPicker(false)} style={styles.timePickerCloseBtn}>
                <Text style={styles.timePickerCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.timePickerColumns}>
              <View style={styles.timeColumnContainer}>
                <Text style={styles.timeColumnLabel}>Hour</Text>
                <ScrollView style={styles.timeColumn} showsVerticalScrollIndicator={false}>
                  {hours.map((h) => (
                    <TouchableOpacity key={h} style={[styles.timeOption, hour === h && styles.timeOptionActive]} onPress={() => setHour(h)}>
                      <Text style={[styles.timeOptionText, hour === h && styles.timeOptionTextActive]}>{h}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              <View style={styles.timeColumnContainer}>
                <Text style={styles.timeColumnLabel}>Minute</Text>
                <ScrollView style={styles.timeColumn} showsVerticalScrollIndicator={false}>
                  {minutes.map((m) => (
                    <TouchableOpacity key={m} style={[styles.timeOption, minute === m && styles.timeOptionActive]} onPress={() => setMinute(m)}>
                      <Text style={[styles.timeOptionText, minute === m && styles.timeOptionTextActive]}>{m}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              <View style={styles.timeColumnContainer}>
                <Text style={styles.timeColumnLabel}>Period</Text>
                <View style={styles.periodContainer}>
                  {(['AM', 'PM'] as const).map((p) => (
                    <TouchableOpacity key={p} style={[styles.periodChip, period === p && styles.periodChipActive]} onPress={() => setPeriod(p)}>
                      <Text style={[styles.periodChipText, period === p && styles.periodChipTextActive]}>{p}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>

            <TouchableOpacity
              style={styles.timeConfirmBtn}
              onPress={() => {
                onChange(`${hour}:${minute} ${period}`);
                setShowPicker(false);
              }}
            >
              <Text style={styles.timeConfirmText}>Confirm Time</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
};

interface EventEditModalProps {
  visible: boolean;
  onClose: () => void;
  item: any | null;
  type: 'event' | 'announcement' | null;
  onSaved?: (updatedItem: any, type: 'event' | 'announcement') => void;
}

const EventEditModal: React.FC<EventEditModalProps> = ({ visible, onClose, item, type, onSaved }) => {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [organizer, setOrganizer] = useState('');
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [venue, setVenue] = useState('');
  const [appearance, setAppearance] = useState('');
  const [platform, setPlatform] = useState('');
  const [link, setLink] = useState('');
  const [description, setDescription] = useState('');

  const [priority, setPriority] = useState('');
  const [announcedFor, setAnnouncedFor] = useState('');
  const [announcementDate, setAnnouncementDate] = useState('');
  const [fromTime, setFromTime] = useState('');
  const [toTime, setToTime] = useState('');
  const [message, setMessage] = useState('');
  const [showCalendar, setShowCalendar] = useState(false);
  const [calendarTarget, setCalendarTarget] = useState<'event' | 'announcement'>('event');

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusAlert, setStatusAlert] = useState<{
    visible: boolean;
    title: string;
    message: string;
    type: 'success' | 'error' | 'warning';
    onClose?: () => void;
  }>({
    visible: false,
    title: '',
    message: '',
    type: 'success',
  });

  const openStatusAlert = (
    title: string,
    message: string,
    type: 'success' | 'error' | 'warning',
    onCloseCallback?: () => void
  ) => {
    setStatusAlert({
      visible: true,
      title,
      message,
      type,
      onClose: onCloseCallback,
    });
  };

  useEffect(() => {
    if (!visible || !item || !type) return;

    setTitle(item.title || '');
    setCategory(item.category || '');

    if (type === 'event') {
      setOrganizer(item.organizer || '');
      setDate(item.date || '');
      setStartTime(toTwelveHour(item.start_time || ''));
      setEndTime(toTwelveHour(item.end_time || ''));
      setVenue(item.venue || '');
      setAppearance(item.appearance || '');
      setPlatform(item.platform || '');
      setLink(item.link || '');
      setDescription(item.description || '');
    } else {
      setPriority(item.priority || '');
      setAnnouncedFor(item.announced_for || '');
      setAnnouncementDate(parseAnnouncementDate(item.announcement_dates));
      setFromTime(toTwelveHour(item.from_time || ''));
      setToTime(toTwelveHour(item.to_time || ''));
      setMessage(item.message || '');
    }

    setError(null);
  }, [visible, item, type]);

  const titleLabel = useMemo(() => {
    if (type === 'event') return 'Edit Event';
    if (type === 'announcement') return 'Edit Announcement';
    return 'Edit Item';
  }, [type]);

  const handleSave = async () => {
    if (!item?.id || !type) return;
    if (!title.trim()) {
      setError('Title is required.');
      openStatusAlert('Missing title', 'Please enter a title before saving.', 'warning');
      return;
    }

    setSaving(true);
    setError(null);

    const isEvent = type === 'event';
    const table = isEvent ? 'events' : 'announcements';
    const payload = isEvent
      ? {
          title: title.trim(),
          category: category.trim() || null,
          organizer: organizer.trim() || null,
          date: date.trim() || null,
          start_time: startTime.trim() || null,
          end_time: endTime.trim() || null,
          venue: venue.trim() || null,
          appearance: appearance.trim() || null,
          platform: platform.trim() || null,
          link: link.trim() || null,
          description: description.trim() || null,
        }
      : {
          title: title.trim(),
          category: category.trim() || null,
          priority: priority.trim() || null,
          announced_for: announcedFor.trim() || null,
          announcement_dates: announcementDate ? JSON.stringify([announcementDate]) : item?.announcement_dates || null,
          has_date_time: !!(announcementDate || fromTime || toTime),
          from_time: fromTime.trim() || null,
          to_time: toTime.trim() || null,
          message: message.trim() || null,
        };

    const { error: updateError } = await supabase
      .from(table)
      .update(payload)
      .eq('id', item.id);

    setSaving(false);

    if (updateError) {
      setError(`Failed to save changes. ${updateError.message || ''}`.trim());
      openStatusAlert('Update failed', `Failed to save changes. ${updateError.message || ''}`.trim(), 'error');
      return;
    }

    onSaved?.({ ...item, ...payload }, type);
    openStatusAlert('Success', 'Changes saved successfully.', 'success', onClose);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.modalContent}>
          <View style={styles.headerRow}>
            <Text style={styles.headerTitle}>{titleLabel}</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.8}>
              <Text style={styles.closeBtnText}>×</Text>
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.scrollBody} showsVerticalScrollIndicator={false}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Title</Text>
              <TextInput value={title} onChangeText={setTitle} style={styles.input} placeholder="Enter title" placeholderTextColor="#94A3B8" />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Category</Text>
              <View style={styles.chipWrap}>
                {CATEGORIES.map((itemCategory) => (
                  <TouchableOpacity
                    key={itemCategory}
                    style={[styles.chip, category === itemCategory && styles.chipActive]}
                    onPress={() => setCategory(itemCategory)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.chipText, category === itemCategory && styles.chipTextActive]}>{itemCategory}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {type === 'event' ? (
              <>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Organizer</Text>
                  <TextInput value={organizer} onChangeText={setOrganizer} style={styles.input} placeholder="Organizer name" placeholderTextColor="#94A3B8" />
                </View>

                <View style={styles.row}>
                  <View style={styles.halfInputGroup}>
                    <Text style={styles.label}>Date</Text>
                    <TouchableOpacity
                      style={styles.selectorButton}
                      onPress={() => {
                        setCalendarTarget('event');
                        setShowCalendar(true);
                      }}
                    >
                      <Text style={styles.selectorButtonLabel}>Event Date</Text>
                      <Text style={styles.selectorButtonValue}>{date || 'Select date'}</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={styles.halfInputGroup}>
                    <Text style={styles.label}>Appearance</Text>
                    <View style={styles.chipWrap}>
                      {APPEARANCES.map((itemAppearance) => (
                        <TouchableOpacity
                          key={itemAppearance}
                          style={[styles.chip, appearance === itemAppearance && styles.chipActive]}
                          onPress={() => setAppearance(itemAppearance)}
                          activeOpacity={0.8}
                        >
                          <Text style={[styles.chipText, appearance === itemAppearance && styles.chipTextActive]}>{itemAppearance}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                </View>

                <View style={styles.row}>
                  <View style={styles.halfInputGroup}>
                    <Text style={styles.label}>Start Time</Text>
                    <TimePickerField label="Start Time" value={startTime} onChange={setStartTime} />
                  </View>
                  <View style={styles.halfInputGroup}>
                    <Text style={styles.label}>End Time</Text>
                    <TimePickerField label="End Time" value={endTime} onChange={setEndTime} />
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Venue</Text>
                  <TextInput value={venue} onChangeText={setVenue} style={styles.input} placeholder="Venue" placeholderTextColor="#94A3B8" />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Platform</Text>
                  <TextInput value={platform} onChangeText={setPlatform} style={styles.input} placeholder="Google Meet / Zoom" placeholderTextColor="#94A3B8" />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Link</Text>
                  <TextInput value={link} onChangeText={setLink} style={styles.input} placeholder="https://..." placeholderTextColor="#94A3B8" autoCapitalize="none" />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Description</Text>
                  <TextInput
                    value={description}
                    onChangeText={setDescription}
                    style={[styles.input, styles.textArea]}
                    placeholder="Write event description"
                    placeholderTextColor="#94A3B8"
                    multiline
                  />
                </View>
              </>
            ) : (
              <>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Priority</Text>
                  <View style={styles.chipWrap}>
                    {PRIORITIES.map((itemPriority) => (
                      <TouchableOpacity
                        key={itemPriority}
                        style={[styles.chip, priority === itemPriority && styles.chipActive]}
                        onPress={() => setPriority(itemPriority)}
                        activeOpacity={0.8}
                      >
                        <Text style={[styles.chipText, priority === itemPriority && styles.chipTextActive]}>{itemPriority}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Announced For</Text>
                  <TextInput value={announcedFor} onChangeText={setAnnouncedFor} style={styles.input} placeholder="Audience" placeholderTextColor="#94A3B8" />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Announcement Date</Text>
                  <TouchableOpacity
                    style={styles.selectorButton}
                    onPress={() => {
                      setCalendarTarget('announcement');
                      setShowCalendar(true);
                    }}
                  >
                    <Text style={styles.selectorButtonLabel}>Announcement Date</Text>
                    <Text style={styles.selectorButtonValue}>{announcementDate || 'Select date'}</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.row}>
                  <View style={styles.halfInputGroup}>
                    <Text style={styles.label}>From Time</Text>
                    <TimePickerField label="From Time" value={fromTime} onChange={setFromTime} />
                  </View>
                  <View style={styles.halfInputGroup}>
                    <Text style={styles.label}>To Time</Text>
                    <TimePickerField label="To Time" value={toTime} onChange={setToTime} />
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Message</Text>
                  <TextInput
                    value={message}
                    onChangeText={setMessage}
                    style={[styles.input, styles.textArea]}
                    placeholder="Write announcement message"
                    placeholderTextColor="#94A3B8"
                    multiline
                  />
                </View>
              </>
            )}

            {error ? <Text style={styles.errorText}>{error}</Text> : null}
          </ScrollView>

          <Modal visible={showCalendar} transparent animationType="fade">
            <View style={styles.calendarOverlay}>
              <View style={styles.calendarContainer}>
                <View style={styles.calendarHeader}>
                  <Text style={styles.calendarTitle}>{calendarTarget === 'event' ? 'Select Event Date' : 'Select Announcement Date'}</Text>
                  <TouchableOpacity onPress={() => setShowCalendar(false)} style={styles.timePickerCloseBtn}>
                    <Text style={styles.timePickerCloseText}>✕</Text>
                  </TouchableOpacity>
                </View>

                <Calendar
                  minDate={new Date().toISOString().split('T')[0]}
                  markedDates={{
                    [(calendarTarget === 'event' ? date : announcementDate) || '']: {
                      selected: true,
                      selectedColor: '#2563EB',
                      selectedTextColor: '#FFFFFF',
                    },
                  }}
                  onDayPress={(day: DateData) => {
                    if (calendarTarget === 'event') {
                      setDate(day.dateString);
                    } else {
                      setAnnouncementDate(day.dateString);
                    }
                    setShowCalendar(false);
                  }}
                  theme={{
                    todayTextColor: '#2563EB',
                    arrowColor: '#2563EB',
                    selectedDayBackgroundColor: '#2563EB',
                    selectedDayTextColor: '#FFFFFF',
                    textDayFontWeight: '600',
                    textMonthFontWeight: '700',
                    textDayHeaderFontWeight: '700',
                  }}
                />
              </View>
            </View>
          </Modal>

          <View style={styles.footerActions}>
            <TouchableOpacity style={styles.cancelButton} onPress={onClose} activeOpacity={0.85}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveButton} onPress={handleSave} activeOpacity={0.85} disabled={saving}>
              {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveButtonText}>Save Changes</Text>}
            </TouchableOpacity>
          </View>

          {statusAlert.visible ? (
            <View style={styles.confirmOverlay}>
              <View style={[styles.confirmCard, styles.statusCard]}>
                <View
                  style={[
                    styles.confirmIconWrap,
                    statusAlert.type === 'success'
                      ? styles.statusIconSuccess
                      : statusAlert.type === 'warning'
                        ? styles.statusIconWarning
                        : styles.statusIconError,
                  ]}
                >
                  <Ionicons
                    name={
                      statusAlert.type === 'success'
                        ? 'checkmark-circle-outline'
                        : statusAlert.type === 'warning'
                          ? 'warning-outline'
                          : 'alert-circle-outline'
                    }
                    size={20}
                    color={statusAlert.type === 'success' ? '#15803D' : statusAlert.type === 'warning' ? '#B45309' : '#DC2626'}
                  />
                </View>
                <Text style={styles.confirmTitle}>{statusAlert.title}</Text>
                <Text style={styles.confirmMessage}>{statusAlert.message}</Text>

                <View style={styles.confirmActions}>
                  <TouchableOpacity
                    style={styles.confirmOkButton}
                    onPress={() => {
                      const callback = statusAlert.onClose;
                      setStatusAlert({ visible: false, title: '', message: '', type: 'success' });
                      if (callback) callback();
                    }}
                  >
                    <Text style={styles.confirmOkText}>OK</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ) : null}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '95%',
    maxWidth: 560,
    maxHeight: '92%',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingTop: 16,
    paddingHorizontal: 16,
    paddingBottom: 14,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 18,
    elevation: 8,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A',
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
  },
  closeBtnText: {
    color: '#334155',
    fontSize: 24,
    fontWeight: '700',
    lineHeight: 26,
    marginTop: -1,
  },
  scrollBody: {
    paddingBottom: 8,
  },
  inputGroup: {
    marginBottom: 12,
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
  chipActive: {
    backgroundColor: '#DBEAFE',
    borderColor: '#2563EB',
  },
  chipText: {
    color: '#334155',
    fontSize: 12,
    fontWeight: '600',
  },
  chipTextActive: {
    color: '#1D4ED8',
  },
  halfInputGroup: {
    flex: 1,
  },
  row: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#F8FAFC',
    color: '#0F172A',
    fontSize: 14,
  },
  textArea: {
    minHeight: 90,
    textAlignVertical: 'top',
  },
  selectorButton: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#F8FAFC',
  },
  selectorButtonLabel: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
    marginBottom: 3,
  },
  selectorButtonValue: {
    fontSize: 14,
    color: '#0F172A',
    fontWeight: '600',
  },
  calendarOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  calendarContainer: {
    width: '92%',
    maxWidth: 460,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  calendarTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  timePickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  timePickerContainer: {
    width: '94%',
    maxWidth: 520,
    maxHeight: '86%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
  },
  timePickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  timePickerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  timePickerCloseBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timePickerCloseText: {
    fontSize: 16,
    color: '#334155',
    fontWeight: '700',
  },
  timePickerColumns: {
    flexDirection: 'row',
    gap: 10,
  },
  timeColumnContainer: {
    flex: 1,
  },
  timeColumnLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
    marginBottom: 8,
  },
  timeColumn: {
    maxHeight: 220,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
  },
  timeOption: {
    paddingVertical: 10,
    alignItems: 'center',
  },
  timeOptionActive: {
    backgroundColor: '#DBEAFE',
  },
  timeOptionText: {
    fontSize: 14,
    color: '#334155',
    fontWeight: '600',
  },
  timeOptionTextActive: {
    color: '#1D4ED8',
    fontWeight: '700',
  },
  periodContainer: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    padding: 8,
    gap: 8,
  },
  periodChip: {
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  periodChipActive: {
    borderColor: '#2563EB',
    backgroundColor: '#DBEAFE',
  },
  periodChipText: {
    color: '#334155',
    fontWeight: '600',
  },
  periodChipTextActive: {
    color: '#1D4ED8',
    fontWeight: '700',
  },
  timeConfirmBtn: {
    marginTop: 12,
    backgroundColor: '#2563EB',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  timeConfirmText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  confirmOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  confirmCard: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#FECACA',
    padding: 16,
  },
  statusCard: {
    borderColor: '#E2E8F0',
  },
  confirmIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  statusIconSuccess: {
    backgroundColor: '#DCFCE7',
  },
  statusIconWarning: {
    backgroundColor: '#FEF3C7',
  },
  statusIconError: {
    backgroundColor: '#FEE2E2',
  },
  confirmTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 6,
  },
  confirmMessage: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 19,
  },
  confirmActions: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
  },
  confirmOkButton: {
    minWidth: 84,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#2563EB',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  confirmOkText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  errorText: {
    color: '#DC2626',
    marginTop: 4,
    fontSize: 13,
    fontWeight: '500',
  },
  footerActions: {
    flexDirection: 'row',
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingTop: 12,
    marginTop: 4,
  },
  cancelButton: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  cancelButtonText: {
    color: '#334155',
    fontSize: 15,
    fontWeight: '600',
  },
  saveButton: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563EB',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});

export default EventEditModal;
