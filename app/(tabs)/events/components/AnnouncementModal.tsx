// @ts-nocheck
import * as ImagePicker from 'expo-image-picker';
import React from 'react';
import { Image, KeyboardAvoidingView, Modal, Platform, ScrollView, Text, TextInput, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { Calendar, DateData } from 'react-native-calendars';
import { supabase } from '@/lib/supabase';
import { AdvancedTimePicker } from './AdvancedTimePicker';
import { MultiDayCalendar } from './MultiDayCalendar';
import { createStyles, LIGHT_COLORS } from '../index';

export const AnnouncementModal = ({
  isAnnouncementModalVisible,
  setIsAnnouncementModalVisible,
  setShowAnnouncementCalendar,
  setSelectedAnnouncement,
  setSelectedAnnouncementDates,
  getTodayUTC,
  setAnnouncementDayDetails,
  setAnnouncementData,
  colors,
  selectedAnnouncement,
  showAnnouncementCalendar,
  selectedAnnouncementDates,
  announcementData,
  userUniversity,
  CATEGORIES,
  showAnnouncementDatePicker,
  setShowAnnouncementDatePicker,
  showAnnouncementDayEditor,
  editingAnnouncementDayIndex,
  editingAnnouncementDayDate,
  showFullScreenMessageEditor,
  setShowFullScreenMessageEditor,
  announcementDayDetails,
  formatFullDate,
  formatTimeDisplay,
  setEditingAnnouncementDayIndex,
  setEditingAnnouncementDayDate,
  setShowAnnouncementDayEditor,
  saveEditedAnnouncement,
  showAlert,
  requireAuth,
  uploadImageToSupabase,
  fetchUserAnnouncements,
  fetchAllAnnouncements,
  startPublishFlow,
  completePublishFlow,
  stopPublishFlow,
  startUploadFlow,
  completeUploadFlow,
  stopUploadFlow,
}: {
  isAnnouncementModalVisible: boolean;
  setIsAnnouncementModalVisible: (value: boolean) => void;
  setShowAnnouncementCalendar: (value: boolean) => void;
  setSelectedAnnouncement: (value: any) => void;
  setSelectedAnnouncementDates: (value: string[]) => void;
  getTodayUTC: () => string;
  setAnnouncementDayDetails: (value: any) => void;
  setAnnouncementData: (value: any) => void;
  colors: typeof LIGHT_COLORS;
  selectedAnnouncement: any;
  showAnnouncementCalendar: boolean;
  selectedAnnouncementDates: string[];
  announcementData: any;
  userUniversity: string;
  CATEGORIES: string[];
  showAnnouncementDatePicker: boolean;
  setShowAnnouncementDatePicker: (value: boolean) => void;
  showAnnouncementDayEditor: boolean;
  editingAnnouncementDayIndex: number;
  editingAnnouncementDayDate: string;
  showFullScreenMessageEditor: boolean;
  setShowFullScreenMessageEditor: (value: boolean) => void;
  announcementDayDetails: Record<string, { fromTime?: string; toTime?: string }>;
  formatFullDate: (date: string) => string;
  formatTimeDisplay: (time: string) => string;
  setEditingAnnouncementDayIndex: (value: number) => void;
  setEditingAnnouncementDayDate: (value: string) => void;
  setShowAnnouncementDayEditor: (value: boolean) => void;
  saveEditedAnnouncement: () => Promise<void>;
  showAlert: (title: string, message: string) => void;
  requireAuth: (action?: string) => void;
  uploadImageToSupabase: (imageUri: string, bucket?: string) => Promise<string | null>;
  fetchUserAnnouncements: () => void;
  fetchAllAnnouncements: () => void;
  startPublishFlow: (kind: 'event' | 'announcement') => void;
  completePublishFlow: (kind: 'event' | 'announcement') => void;
  stopPublishFlow: () => void;
  startUploadFlow: (kind: 'eventFlyer' | 'announcementFlyer') => void;
  completeUploadFlow: (kind: 'eventFlyer' | 'announcementFlyer') => void;
  stopUploadFlow: () => void;
}) => {
  const styles = createStyles(colors);
  const { width } = useWindowDimensions();
  const isLargeScreen = width >= 768;

  return (
    <>
    <Modal visible={isAnnouncementModalVisible} animationType="slide" transparent>
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
            <Text style={[styles.modalTitle, { color: colors.text }]}>{selectedAnnouncement ? 'Edit Announcement' : 'New Announcement'}</Text>
            <TouchableOpacity onPress={() => {
              setIsAnnouncementModalVisible(false);
              setShowAnnouncementCalendar(false);
              setSelectedAnnouncement(null);
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
            }} style={[styles.closeBtn, { backgroundColor: colors.surface }]}>
              <Text style={[styles.closeBtnText, { color: colors.textSecondary }]}>✕</Text>
            </TouchableOpacity>
          </View>

          {showAnnouncementCalendar && (
            <View style={[styles.calendarNavHeader, { borderBottomColor: colors.border }]}>
              <TouchableOpacity onPress={() => setShowAnnouncementCalendar(false)} style={[styles.calendarBackButton, { backgroundColor: colors.surface }]}> 
                <Text style={styles.calendarBackIcon}>←</Text>
                <Text style={[styles.calendarBackText, { color: colors.text }]}>Back to Form</Text>
              </TouchableOpacity>
            </View>
          )}

          <ScrollView showsVerticalScrollIndicator={false}>
            {showAnnouncementCalendar ? (
              <>
                <MultiDayCalendar
                  selectedDates={selectedAnnouncementDates}
                  onDatesChange={setSelectedAnnouncementDates}
                  onApply={(dates) => {
                    setSelectedAnnouncementDates(dates);
                    setShowAnnouncementCalendar(false);
                  }}
                  colors={colors}
                />
              </>
            ) : (
              <>
                <View style={[styles.universityBadge, { backgroundColor: colors.primaryLight + '30' }]}>
                  <Text style={[styles.universityBadgeText, { color: colors.primary }]}>For: {userUniversity}</Text>
                </View>

                <Text style={[styles.inputLabel, { color: colors.text }]}>Announcement Image (Optional)</Text>
                <TouchableOpacity style={[styles.uploadBox, announcementData.image && styles.uploadBoxActive,
                  { borderColor: colors.border, backgroundColor: colors.surface }]} onPress={async () => {
                  const result = await ImagePicker.launchImageLibraryAsync({
                    mediaTypes: ImagePicker.MediaTypeOptions.Images,
                    allowsEditing: true,
                    aspect: [16, 9],
                    quality: 0.8,
                  });
                  if (result.canceled || !result.assets?.[0]) return;
                  console.log('Image selected:', result.assets[0].uri);
                  setAnnouncementData({ ...announcementData, image: result.assets[0].uri });
                }}>
                  {announcementData.image ? (
                    <Image source={{ uri: announcementData.image }} style={styles.uploadPreview} resizeMode="contain" />
                  ) : (
                    <View style={styles.uploadInner}>
                      <Text style={[styles.uploadIcon, { color: colors.primary }]}>📷</Text>
                      <Text style={[styles.uploadText, { color: colors.text }]}>Tap to select image</Text>
                      <Text style={[styles.uploadSubtext, { color: colors.textSecondary }]}>JPEG or PNG</Text>
                    </View>
                  )}
                </TouchableOpacity>

                <Text style={[styles.inputLabel, { color: colors.text }]}>Title <Text style={{ color: colors.error }}>*</Text></Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                  value={announcementData.title}
                  onChangeText={txt => setAnnouncementData({ ...announcementData, title: txt })}
                  placeholder="Enter announcement title"
                  placeholderTextColor={colors.textSecondary}
                />

                <Text style={[styles.inputLabel, { color: colors.text }]}>Announced For <Text style={{ color: colors.error }}>*</Text></Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                  value={announcementData.announcedFor}
                  onChangeText={txt => setAnnouncementData({ ...announcementData, announcedFor: txt })}
                  placeholder="e.g., All Students, CS Department, First Years..."
                  placeholderTextColor={colors.textSecondary}
                />

                <Text style={[styles.inputLabel, { color: colors.text }]}>Category</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
                  {CATEGORIES.map(cat => (
                    <TouchableOpacity
                      key={cat}
                      onPress={() => setAnnouncementData({ ...announcementData, category: cat as any })}
                      style={[
                        styles.categoryChip,
                        announcementData.category === cat && styles.activeCategory,
                        announcementData.category !== cat && { backgroundColor: colors.card, borderColor: colors.border, marginRight: 8 }
                      ]}
                    >
                      <Text style={[
                        styles.categoryText,
                        announcementData.category === cat && styles.activeCategoryText,
                        { color: announcementData.category === cat ? '#ffffff' : colors.textSecondary }
                      ]}>{cat}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                <Text style={[styles.inputLabel, { color: colors.text }]}>Message <Text style={{ color: colors.error }}>*</Text></Text>
                <TouchableOpacity
                  style={[styles.input, styles.textArea, {
                    height: 180,
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    justifyContent: 'flex-start',
                    paddingTop: 12,
                    overflow: 'hidden'
                  }]}
                  onPress={() => setShowFullScreenMessageEditor(true)}
                  activeOpacity={0.85}
                >
                  <Text
                    style={[{ color: announcementData.message ? colors.text : colors.textSecondary }]}
                    numberOfLines={8}
                    ellipsizeMode="tail"
                  >
                    {announcementData.message || 'Tap to enter your announcement message...'}
                  </Text>
                </TouchableOpacity>

                <Text style={[styles.inputLabel, { color: colors.text }]}>Priority</Text>
                <View style={{ flexDirection: 'row', gap: 8, marginBottom: 20 }}>
                  {['Not Urgent', 'Urgent'].map(priority => (
                    <TouchableOpacity
                      key={priority}
                      onPress={() => setAnnouncementData({ ...announcementData, priority: priority as 'Not Urgent' | 'Urgent' })}
                      style={[
                        styles.priorityButton,
                        announcementData.priority === priority && styles.priorityButtonActive,
                        {
                          backgroundColor: announcementData.priority === priority
                            ? (priority === 'Urgent' ? colors.error : colors.primary)
                            : colors.surface,
                          borderColor: colors.border
                        }
                      ]}
                    >
                      <Text style={[
                        styles.priorityButtonText,
                        { color: announcementData.priority === priority ? '#ffffff' : colors.text }
                      ]}>
                        {priority === 'Urgent' ? '🔴 ' : '🟢 '}{priority}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <TouchableOpacity
                  style={[styles.dateTimeToggle, { backgroundColor: colors.surface, borderColor: colors.border }]}
                  onPress={() => setAnnouncementData({ ...announcementData, hasDateTime: !announcementData.hasDateTime })}
                >
                  <View style={styles.dateTimeToggleLeft}>
                    <Text style={[styles.dateTimeToggleIcon, { color: colors.primary }]}>📅</Text>
                    <View>
                      <Text style={[styles.dateTimeToggleTitle, { color: colors.text }]}>Add Date & Time</Text>
                      <Text style={[styles.dateTimeToggleSubtitle, { color: colors.textSecondary }]}>For time-sensitive announcements</Text>
                    </View>
                  </View>
                  <View style={[styles.dateTimeToggleCheckbox, announcementData.hasDateTime && styles.dateTimeToggleCheckboxActive,
                    { borderColor: announcementData.hasDateTime ? colors.primary : colors.border, backgroundColor: announcementData.hasDateTime ? colors.primary : 'transparent' }]}>
                    {announcementData.hasDateTime && (
                      <Text style={styles.dateTimeToggleCheckmark}>✓</Text>
                    )}
                  </View>
                </TouchableOpacity>

                {announcementData.hasDateTime && (
                  <>
                    <Text style={[styles.inputLabel, { color: colors.text }]}>Date(s)</Text>
                    <TouchableOpacity
                      style={[styles.dateInputCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
                      onPress={() => setShowAnnouncementCalendar(true)}
                    >
                      <View style={[styles.dateInputIconContainer, { backgroundColor: colors.card }]}>
                        <Text style={[styles.dateInputIcon, { color: colors.primary }]}>📅</Text>
                      </View>
                      <View style={styles.dateInputTextContainer}>
                        <Text style={[styles.dateInputLabel, { color: colors.text }]}>Announcement Date(s)</Text>
                        {selectedAnnouncementDates.length === 1 ? (
                          <Text style={[styles.dateInputValue, { color: colors.text }]}>
                            {formatFullDate(selectedAnnouncementDates[0])}
                          </Text>
                        ) : (
                          <View>
                            <Text style={[styles.dateInputValue, { color: colors.text }]}>{selectedAnnouncementDates.length} days selected</Text>
                            <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 8 }}>
                              {selectedAnnouncementDates.slice(0, 3).map(date => (
                                <Text key={date} style={[styles.multiDateText, { color: colors.textSecondary }]}>
                                  Day {selectedAnnouncementDates.indexOf(date) + 1}: {new Date(date).toLocaleDateString('en-US', {
                                    month: 'short',
                                    day: 'numeric'
                                  })}{'  '}
                                </Text>
                              ))}
                              {selectedAnnouncementDates.length > 3 && (
                                <Text style={[styles.multiDateText, { color: colors.textSecondary }]}>
                                  ... +{selectedAnnouncementDates.length - 3} more
                                </Text>
                              )}
                            </View>
                          </View>
                        )}
                      </View>
                      <Text style={[styles.dateInputArrow, { color: colors.textSecondary }]}>›</Text>
                    </TouchableOpacity>

                    {selectedAnnouncementDates.length > 1 && (
                      <>
                        <Text style={[styles.inputLabel, { color: colors.text }]}>Times per Day</Text>
                        <View style={[styles.daysSummaryContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                          {selectedAnnouncementDates.map((date, index) => {
                            const dayDetail = announcementDayDetails[date];
                            const dayFromTime = dayDetail?.fromTime || announcementData.fromTime;
                            const dayToTime = dayDetail?.toTime || announcementData.toTime;
                            const hasCustomTime = announcementDayDetails[date] !== undefined;

                            return (
                              <View key={date} style={[styles.daySummaryRow, { borderBottomColor: colors.border }]}>
                                <View style={styles.dayNumberBadge}>
                                  <Text style={[styles.dayNumberText, { color: colors.primary }]}>Day {index + 1}</Text>
                                  {hasCustomTime && (
                                    <View style={[styles.customBadge, { backgroundColor: colors.success }]}>
                                      <Text style={styles.customBadgeText}>Custom</Text>
                                    </View>
                                  )}
                                </View>
                                <View style={styles.daySummaryContent}>
                                  <Text style={[styles.daySummaryDate, { color: colors.text }]}>{formatFullDate(date)}</Text>
                                  <Text style={[styles.daySummaryTime, { color: colors.textSecondary }]}>
                                    {formatTimeDisplay(dayFromTime)} - {formatTimeDisplay(dayToTime)}
                                  </Text>
                                </View>
                                <TouchableOpacity
                                  style={[styles.editDayTimeButton, { backgroundColor: colors.card, borderColor: colors.primary }]}
                                  onPress={() => {
                                    setEditingAnnouncementDayIndex(index);
                                    setEditingAnnouncementDayDate(date);
                                    setShowAnnouncementDayEditor(true);
                                  }}
                                >
                                  <Text style={[styles.editDayTimeText, { color: colors.primary }]}>Edit</Text>
                                </TouchableOpacity>
                              </View>
                            );
                          })}
                        </View>
                      </>
                    )}

                    <Text style={[styles.inputLabel, { color: colors.text }]}>From Time</Text>
                    <AdvancedTimePicker
                      time={announcementData.fromTime}
                      onTimeChange={(time) => setAnnouncementData({ ...announcementData, fromTime: time })}
                      label="From"
                      colors={colors}
                    />

                    <Text style={[styles.inputLabel, { color: colors.text }]}>To Time</Text>
                    <AdvancedTimePicker
                      time={announcementData.toTime}
                      onTimeChange={(time) => setAnnouncementData({ ...announcementData, toTime: time })}
                      label="To"
                      colors={colors}
                    />
                  </>
                )}

                <TouchableOpacity
                  style={[styles.submitButton, { backgroundColor: colors.primary, marginTop: 20, marginBottom: 40 }]}
                  onPress={async () => {
                    if (!announcementData.title || !announcementData.announcedFor || !announcementData.message) {
                      showAlert('Missing Fields', 'Please fill in title, target audience, and message');
                      return;
                    }

                    // If editing, use saveEditedAnnouncement
                    if (selectedAnnouncement) {
                      await saveEditedAnnouncement();
                      return;
                    }

                    try {
                      const { data: { user } } = await supabase.auth.getUser();
                      if (!user) {
                        requireAuth('post an announcement');
                        return;
                      }

                      startPublishFlow('announcement');

                      // Upload image if provided
                      let imageUrl: string = '';
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
                          console.warn('Image upload failed, continuing without image');
                        }
                      }

                      // Insert announcement into database
                      console.log('Saving announcement with image URL:', imageUrl);
                      const { error } = await supabase
                        .from('announcements')
                        .insert({
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
                          university: userUniversity,
                          user_id: user.id,
                          created_at: new Date().toISOString(),
                        });

                      if (error) throw error;

                      setIsAnnouncementModalVisible(false);
                      setShowAnnouncementCalendar(false);
                      setSelectedAnnouncement(null);
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
                      fetchAllAnnouncements();
                      completePublishFlow('announcement');
                    } catch (error) {
                      stopUploadFlow();
                      stopPublishFlow();
                      console.error('Error posting announcement:', error);
                      showAlert('Error', 'Failed to post announcement. Please try again.');
                    }
                  }}
                >
                  <Text style={styles.submitButtonText}>{selectedAnnouncement ? 'Update Announcement' : 'Post Announcement'}</Text>
                </TouchableOpacity>
              </>
            )}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>

    {/* ANNOUNCEMENT DATE PICKER MODAL */}
    <Modal visible={showAnnouncementDatePicker} transparent animationType="fade">
      <View style={styles.timePickerOverlay}>
        <View style={[styles.timePickerContainer, { backgroundColor: colors.card }]}>
          <View style={[styles.timePickerHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.timePickerTitle, { color: colors.text }]}>Select Date</Text>
            <TouchableOpacity onPress={() => setShowAnnouncementDatePicker(false)} style={[styles.timePickerCloseButton, { backgroundColor: colors.surface }]}> 
              <Text style={[styles.timePickerClose, { color: colors.textSecondary }]}>✕</Text>
            </TouchableOpacity>
          </View>
          <Calendar
            minDate={getTodayUTC()}
            onDayPress={(day: DateData) => {
              setSelectedAnnouncementDates([day.dateString]);
              setShowAnnouncementDatePicker(false);
            }}
            markedDates={{
              [selectedAnnouncementDates[0]]: {
                selected: true,
                selectedColor: colors.primary,
                selectedTextColor: '#ffffff',
              }
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

    {/* ANNOUNCEMENT DATE PICKER MODAL */}
    <Modal visible={showAnnouncementDatePicker} transparent animationType="fade">
      <View style={styles.timePickerOverlay}>
        <View style={[styles.timePickerContainer, { backgroundColor: colors.card }]}>
          <View style={[styles.timePickerHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.timePickerTitle, { color: colors.text }]}>Select Date</Text>
            <TouchableOpacity onPress={() => setShowAnnouncementDatePicker(false)} style={[styles.timePickerCloseButton, { backgroundColor: colors.surface }]}> 
              <Text style={[styles.timePickerClose, { color: colors.textSecondary }]}>✕</Text>
            </TouchableOpacity>
          </View>
          <Calendar
            minDate={getTodayUTC()}
            onDayPress={(day: DateData) => {
              setAnnouncementData({ ...announcementData, date: day.dateString });
              setSelectedAnnouncementDates([day.dateString]);
              setShowAnnouncementDatePicker(false);
            }}
            markedDates={{
              [announcementData.date]: {
                selected: true,
                selectedColor: colors.primary,
                selectedTextColor: '#ffffff',
              }
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

    {/* ANNOUNCEMENT DAY EDITOR MODAL */}
    {showAnnouncementDayEditor && editingAnnouncementDayDate && (
      <Modal visible={showAnnouncementDayEditor} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Edit Day {editingAnnouncementDayIndex + 1} Time</Text>
              <TouchableOpacity onPress={() => setShowAnnouncementDayEditor(false)} style={[styles.closeBtn, { backgroundColor: colors.surface }]}>
                <Text style={[styles.closeBtnText, { color: colors.textSecondary }]}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
              <View style={{ padding: 20 }}>
                <Text style={[styles.inputLabel, { color: colors.text }]}>Date</Text>
                <View style={[styles.dateInputCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <View style={[styles.dateInputIconContainer, { backgroundColor: colors.card }]}>
                    <Text style={[styles.dateInputIcon, { color: colors.primary }]}>📅</Text>
                  </View>
                  <View style={styles.dateInputTextContainer}>
                    <Text style={[styles.dateInputLabel, { color: colors.text }]}>Announcement Date</Text>
                    <Text style={[styles.dateInputValue, { color: colors.text }]}>
                      {formatFullDate(editingAnnouncementDayDate)}
                    </Text>
                  </View>
                </View>

                <Text style={[styles.inputLabel, { color: colors.text, marginTop: 20 }]}>From Time for this Day</Text>
                <AdvancedTimePicker 
                  time={announcementDayDetails[editingAnnouncementDayDate]?.fromTime || announcementData.fromTime}
                  onTimeChange={(time) => {
                    setAnnouncementDayDetails({
                      ...announcementDayDetails,
                      [editingAnnouncementDayDate]: { 
                        ...announcementDayDetails[editingAnnouncementDayDate],
                        fromTime: time 
                      }
                    });
                  }}
                  label="From"
                  colors={colors}
                />

                <Text style={[styles.inputLabel, { color: colors.text }]}>To Time for this Day</Text>
                <AdvancedTimePicker 
                  time={announcementDayDetails[editingAnnouncementDayDate]?.toTime || announcementData.toTime}
                  onTimeChange={(time) => {
                    setAnnouncementDayDetails({
                      ...announcementDayDetails,
                      [editingAnnouncementDayDate]: { 
                        ...announcementDayDetails[editingAnnouncementDayDate],
                        toTime: time 
                      }
                    });
                  }}
                  label="To"
                  colors={colors}
                />

                <TouchableOpacity 
                  style={[styles.submitButton, { backgroundColor: colors.primary, marginTop: 20, marginBottom: 40 }]}
                  onPress={() => setShowAnnouncementDayEditor(false)}
                >
                  <Text style={styles.submitButtonText}>Save Time</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    )}

    {/* FULL SCREEN MESSAGE EDITOR */}
    <Modal visible={showFullScreenMessageEditor} animationType="slide" transparent={isLargeScreen}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{
          flex: 1,
          backgroundColor: isLargeScreen ? 'rgba(0,0,0,0.6)' : colors.background,
          justifyContent: isLargeScreen ? 'center' : 'flex-start',
        }}
      >
        <View
          style={{
            flex: isLargeScreen ? undefined : 1,
            height: isLargeScreen ? '90%' : '100%',
            width: isLargeScreen ? Math.min(width * 0.8, 800) : '100%',
            alignSelf: 'center',
            borderRadius: isLargeScreen ? 24 : 0,
            overflow: 'hidden',
            backgroundColor: colors.background,
          }}
        >
          <View style={[styles.modalHeader, { borderBottomColor: colors.border, backgroundColor: colors.card }]}>
            <TouchableOpacity onPress={() => setShowFullScreenMessageEditor(false)} style={{ padding: 8 }}>
              <Text style={[{ color: colors.primary, fontSize: 16, fontWeight: '600' }]}>← Back</Text>
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.text, flex: 1, textAlign: 'center' }]}>Announcement Message</Text>
            <TouchableOpacity onPress={() => setShowFullScreenMessageEditor(false)} style={{ padding: 8 }}>
              <Text style={[{ color: colors.primary, fontSize: 16, fontWeight: '600' }]}>Done</Text>
            </TouchableOpacity>
          </View>
          <View style={{ flex: 1, padding: 16 }}>
            <TextInput
              style={[{
                flex: 1,
                backgroundColor: colors.surface,
                borderColor: colors.border,
                borderWidth: 1,
                borderRadius: 12,
                color: colors.text,
                padding: 16,
                fontSize: 16,
                textAlignVertical: 'top'
              }]}
              value={announcementData.message}
              onChangeText={txt => setAnnouncementData({ ...announcementData, message: txt })}
              placeholder="Enter your announcement message..."
              placeholderTextColor={colors.textSecondary}
              multiline
              autoFocus
            />
            <Text style={[{ color: colors.textSecondary, fontSize: 12, marginTop: 8, textAlign: 'right' }]}>
              {announcementData.message.length} characters
            </Text>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
    </>
  );
};