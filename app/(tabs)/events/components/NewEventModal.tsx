// @ts-nocheck
import React from 'react';
import { Image, KeyboardAvoidingView, Modal, Platform, ScrollView, Text, TextInput, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { AdvancedTimePicker } from './AdvancedTimePicker';
import { MultiDayCalendar } from './MultiDayCalendar';

export const NewEventModal = ({
  isModalVisible,
  styles,
  colors,
  isEditingEvent,
  setIsModalVisible,
  setShowCalendar,
  setSelectedDates,
  setDayDetails,
  setIsEditingEvent,
  setFormData,
  getTodayUTC,
  showCalendar,
  selectedDates,
  userUniversity,
  formData,
  pickFlyer,
  formatFullDate,
  timeToMinutes,
  calculateDuration,
  setShowDescriptionModal,
  showDescriptionModal,
  allDaysHaveDifferentTimes,
  dayDetails,
  allDaysHaveDifferentVenues,
  handleEditDay,
  CATEGORIES,
  APPEARANCES,
  PLATFORMS,
  setShowGeneralDescriptionModal,
  showGeneralDescriptionModal,
  handleAddEvent,
  formatTimeDisplay,
}: any) => {
  const { width } = useWindowDimensions();
  const isLargeScreen = width >= 768;

  return (
    <Modal visible={isModalVisible} animationType="slide" transparent>
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
            <Text style={[styles.modalTitle, { color: colors.text }]}>{isEditingEvent ? 'Edit Event' : 'New Event'}</Text>
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
              <Text style={[styles.closeBtnText, { color: colors.textSecondary }]}>✕</Text>
            </TouchableOpacity>
          </View>

          {showCalendar && (
            <View style={[styles.calendarNavHeader, { borderBottomColor: colors.border }]}>
              <TouchableOpacity onPress={() => setShowCalendar(false)} style={[styles.calendarBackButton, { backgroundColor: colors.surface }]}>
                <Text style={styles.calendarBackIcon}>←</Text>
                <Text style={[styles.calendarBackText, { color: colors.text }]}>Back to Form</Text>
              </TouchableOpacity>
            </View>
          )}

          <ScrollView showsVerticalScrollIndicator={false}>
            {showCalendar ? (
              <>
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
                  <Text style={[styles.universityBadgeText, { color: colors.primary }]}>For: {userUniversity}</Text>
                </View>

                <Text style={[styles.inputLabel, { color: colors.text }]}>Event Flyer</Text>
                <TouchableOpacity style={[styles.uploadBox, formData.flyer && styles.uploadBoxActive,
                  { borderColor: colors.border, backgroundColor: colors.surface }]} onPress={pickFlyer}>
                  {formData.flyer && formData.flyer.startsWith('https://') ? (
                    <Image source={{ uri: formData.flyer }} style={styles.uploadPreview} resizeMode="contain" />
                  ) : (
                    <View style={styles.uploadInner}>
                      <Text style={[styles.uploadIcon, { color: colors.primary }]}>📷</Text>
                      <Text style={[styles.uploadText, { color: colors.text }]}>Tap to select flyer</Text>
                      <Text style={[styles.uploadSubtext, { color: colors.textSecondary }]}>JPEG or PNG</Text>
                    </View>
                  )}
                </TouchableOpacity>

                <Text style={[styles.inputLabel, { color: colors.text }]}>Title <Text style={{ color: colors.error }}>*</Text></Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                  value={formData.title}
                  onChangeText={txt => setFormData({ ...formData, title: txt })}
                  placeholder="Enter event name"
                  placeholderTextColor={colors.textSecondary}
                />

                <Text style={[styles.inputLabel, { color: colors.text }]}>Organizer / Organization <Text style={{ color: colors.error }}>*</Text></Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                  value={formData.organizer}
                  onChangeText={txt => setFormData({ ...formData, organizer: txt })}
                  placeholder="Organized by..."
                  placeholderTextColor={colors.textSecondary}
                />

                <Text style={[styles.inputLabel, { color: colors.text }]}>Event Dates <Text style={{ color: colors.error }}>*</Text></Text>
                <TouchableOpacity
                  style={[styles.dateInputCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
                  onPress={() => setShowCalendar(true)}
                >
                  <View style={[styles.dateInputIconContainer, { backgroundColor: colors.card }]}>
                    <Text style={[styles.dateInputIcon, { color: colors.primary }]}>📅</Text>
                  </View>
                  <View style={styles.dateInputTextContainer}>
                    <Text style={[styles.dateInputLabel, { color: colors.text }]}>Event Dates</Text>
                    {selectedDates.length === 1 ? (
                      <Text style={[styles.dateInputValue, { color: colors.text }]}>
                        {formatFullDate(selectedDates[0])}
                      </Text>
                    ) : (
                      <View>
                        <Text style={[styles.dateInputValue, { color: colors.text }]}>{selectedDates.length} days selected</Text>
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 8 }}>
                          {selectedDates.slice(0, 3).map((date: string) => (
                            <Text key={date} style={[styles.multiDateText, { color: colors.textSecondary }]}> 
                              Day {selectedDates.indexOf(date) + 1}: {new Date(date).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric'
                              })}{'  '}
                            </Text>
                          ))}
                          {selectedDates.length > 3 && (
                            <Text style={[styles.multiDateText, { color: colors.textSecondary }]}>
                              ... +{selectedDates.length - 3} more
                            </Text>
                          )}
                        </View>
                      </View>
                    )}
                  </View>
                  <Text style={[styles.dateInputArrow, { color: colors.textSecondary }]}>›</Text>
                </TouchableOpacity>

                {/* Single Day vs Multi-Day Time Display */}
                {selectedDates.length === 1 ? (
                  // SINGLE DAY: Show regular time pickers with description
                  <>
                    <Text style={[styles.inputLabel, { color: colors.text }]}>Event Time <Text style={{ color: colors.error }}>*</Text></Text>
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
                          setFormData((prev: any) => ({ ...prev, endTime }));
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
                          setFormData((prev: any) => ({ ...prev, endTime }));
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
                        <Text style={[styles.durationDisplayText, { color: colors.primary }]}>
                          Duration: {calculateDuration(formData.startTime, formData.endTime)}
                        </Text>
                      </View>
                    )}

                    <Text style={[styles.inputLabel, { color: colors.text }]}>Event Description (Single Day)</Text>
                    <TouchableOpacity onPress={() => setShowDescriptionModal(true)}>
                      <View pointerEvents="none">
                        <TextInput
                          style={[styles.input, styles.textArea, { height: 100, backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                          multiline
                          value={formData.description}
                          editable={false}
                          placeholder="Describe what will happen at this event..."
                          placeholderTextColor={colors.textSecondary}
                        />
                      </View>
                    </TouchableOpacity>

                    <Modal visible={showDescriptionModal} animationType="slide" transparent={isLargeScreen}>
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
                            <TouchableOpacity onPress={() => setShowDescriptionModal(false)} style={{ padding: 8 }}>
                              <Text style={[{ color: colors.primary, fontSize: 16, fontWeight: '600' }]}>← Back</Text>
                            </TouchableOpacity>
                            <Text style={[styles.modalTitle, { color: colors.text, flex: 1, textAlign: 'center' }]}>Edit Event Description</Text>
                            <TouchableOpacity onPress={() => setShowDescriptionModal(false)} style={{ padding: 8 }}>
                              <Text style={[{ color: colors.primary, fontSize: 16, fontWeight: '600' }]}>Done</Text>
                            </TouchableOpacity>
                          </View>
                          <View style={{ flex: 1, padding: 16 }}>
                            <TextInput
                              style={[styles.input, styles.textArea, {
                                flex: 1,
                                backgroundColor: colors.surface,
                                borderColor: colors.border,
                                color: colors.text,
                                fontSize: 18,
                                textAlignVertical: 'top'
                              }]}
                              multiline
                              autoFocus
                              value={formData.description}
                              onChangeText={txt => setFormData({ ...formData, description: txt })}
                              placeholder="Describe what will happen at this event..."
                              placeholderTextColor={colors.textSecondary}
                            />
                          </View>
                        </View>
                      </KeyboardAvoidingView>
                    </Modal>
                  </>
                ) : (
                  // MULTI-DAY: Show summary of each day with edit option
                  <>
                    {!allDaysHaveDifferentTimes() && (
                      <>
                        <Text style={[styles.inputLabel, { color: colors.text }]}>Default Event Time (for all days)</Text>
                        <AdvancedTimePicker
                          time={formData.startTime}
                          onTimeChange={(time) => {
                            setFormData({ ...formData, startTime: time });
                            // Update all days that haven't been customized
                            const updatedDetails = { ...dayDetails };
                            selectedDates.forEach((date: string) => {
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
                              setFormData((prev: any) => ({ ...prev, endTime }));

                              // Update all days that haven't been customized
                              const updatedDetails = { ...dayDetails };
                              selectedDates.forEach((date: string) => {
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
                            selectedDates.forEach((date: string) => {
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
                            <Text style={[styles.durationDisplayText, { color: colors.primary }]}> 
                              Default Duration: {calculateDuration(formData.startTime, formData.endTime)}
                            </Text>
                          </View>
                        )}
                      </>
                    )}

                    <Text style={[styles.inputLabel, { color: colors.text }]}>Event Days Summary</Text>
                    <View style={[styles.daysSummaryContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                      {selectedDates.map((date: string, index: number) => {
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
                              <Text style={[styles.daySummaryDate, { color: colors.text }]}>{formatFullDate(date)}</Text>
                              <View style={styles.daySummaryTimes}>
                                <Text style={[styles.daySummaryTime, { color: colors.textSecondary }]}> 
                                  {formatTimeDisplay(details.startTime)} - {formatTimeDisplay(details.endTime)}
                                </Text>
                                {duration && (
                                  <Text style={[styles.daySummaryDuration, { color: colors.primary }]}> • {duration}</Text>
                                )}
                                {hasCustomTime && (
                                  <Text style={[styles.customTimeIndicator, { color: colors.success }]}> (Custom)</Text>
                                )}
                              </View>
                              {details.description ? (
                                <Text style={[styles.daySummaryDesc, { color: colors.textSecondary }]} numberOfLines={2}>
                                  {details.description}
                                </Text>
                              ) : null}
                              {hasCustomVenue && details.venue && (
                                <Text style={[styles.daySummaryVenue, { color: colors.textSecondary }]} numberOfLines={1}>
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
                      <Text style={[styles.setTimesButtonText, { color: colors.primary }]}>Edit Day Details</Text>
                    </TouchableOpacity>
                  </>
                )}

                <Text style={[styles.inputLabel, { color: colors.text }]}>Category <Text style={{ color: colors.error }}>*</Text></Text>
                <View style={styles.selectionRow}>
                  {CATEGORIES.map((c: string) => (
                    <TouchableOpacity
                      key={c}
                      style={[styles.formChip, formData.category === c && styles.formChipActive,
                        formData.category !== c && { backgroundColor: colors.surface, borderColor: colors.border }]}
                      onPress={() => setFormData({ ...formData, category: c })}
                    >
                      <Text style={[styles.formChipText, formData.category === c && styles.formChipTextActive,
                        { color: formData.category === c ? '#ffffff' : colors.textSecondary }]}>{c}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={[styles.inputLabel, { color: colors.text }]}>Event Attendance Option <Text style={{ color: colors.error }}>*</Text></Text>
                <View style={styles.selectionRow}>
                  {APPEARANCES.map((a: string) => (
                    <TouchableOpacity
                      key={a}
                      style={[styles.formChip, formData.appearance === a && styles.formChipActive,
                        formData.appearance !== a && { backgroundColor: colors.surface, borderColor: colors.border }]}
                      onPress={() => setFormData({ ...formData, appearance: a })}
                    >
                      <Text style={[styles.formChipText, formData.appearance === a && styles.formChipTextActive,
                        { color: formData.appearance === a ? '#ffffff' : colors.textSecondary }]}>{a}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {(formData.appearance === 'Physical Meeting' || formData.appearance === 'Both') && (
                  <>
                    {!(selectedDates.length > 1 && allDaysHaveDifferentVenues()) && (
                      <>
                        <Text style={[styles.inputLabel, { color: colors.text }]}>Default Venue <Text style={{ color: colors.error }}>*</Text></Text>
                        <TextInput
                          style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                          value={formData.venue}
                          onChangeText={txt => setFormData({ ...formData, venue: txt })}
                          placeholder="Physical location"
                          placeholderTextColor={colors.textSecondary}
                        />
                      </>
                    )}
                  </>
                )}

                {(formData.appearance === 'Virtual Meeting' || formData.appearance === 'Both') && (
                  <>
                    <Text style={[styles.inputLabel, { color: colors.text }]}>Default Platform</Text>
                    <View style={styles.selectionRow}>
                      {PLATFORMS.map((p: string) => (
                        <TouchableOpacity
                          key={p}
                          style={[styles.formChip, formData.platform === p && styles.formChipActive,
                            formData.platform !== p && { backgroundColor: colors.surface, borderColor: colors.border }]}
                          onPress={() => setFormData({ ...formData, platform: p })}
                        >
                          <Text style={[styles.formChipText, formData.platform === p && styles.formChipTextActive,
                            { color: formData.platform === p ? '#ffffff' : colors.textSecondary }]}>{p}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>

                    <Text style={[styles.inputLabel, { color: colors.text }]}>Default Link</Text>
                    <TextInput
                      style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                      value={formData.link}
                      onChangeText={txt => setFormData({ ...formData, link: txt })}
                      placeholder="Meeting link "
                      placeholderTextColor={colors.textSecondary}
                    />
                  </>
                )}

                {selectedDates.length === 1 ? (
                  <Text style={[styles.inputLabel, { color: colors.text }]}>General Description</Text>
                ) : (
                  <Text style={[styles.inputLabel, { color: colors.text }]}>General Event Description (Overview)</Text>
                )}
                <TouchableOpacity onPress={() => setShowGeneralDescriptionModal(true)}>
                  <View pointerEvents="none">
                    <TextInput
                      style={[styles.input, styles.textArea, { height: 100, backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                      multiline
                      value={formData.description}
                      editable={false}
                      placeholder={selectedDates.length === 1 ? 'Event details...' : 'Overview of the multi-day event...'}
                      placeholderTextColor={colors.textSecondary}
                    />
                  </View>
                </TouchableOpacity>

                <Modal visible={showGeneralDescriptionModal} animationType="slide" transparent={isLargeScreen}>
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
                        <TouchableOpacity onPress={() => setShowGeneralDescriptionModal(false)} style={{ padding: 8 }}>
                          <Text style={[{ color: colors.primary, fontSize: 16, fontWeight: '600' }]}>← Back</Text>
                        </TouchableOpacity>
                        <Text style={[styles.modalTitle, { color: colors.text, flex: 1, textAlign: 'center' }]}>Edit General Description</Text>
                        <TouchableOpacity onPress={() => setShowGeneralDescriptionModal(false)} style={{ padding: 8 }}>
                          <Text style={[{ color: colors.primary, fontSize: 16, fontWeight: '600' }]}>Done</Text>
                        </TouchableOpacity>
                      </View>
                      <View style={{ flex: 1, padding: 16 }}>
                        <TextInput
                          style={[styles.input, styles.textArea, {
                            flex: 1,
                            backgroundColor: colors.surface,
                            borderColor: colors.border,
                            color: colors.text,
                            fontSize: 18,
                            textAlignVertical: 'top'
                          }]}
                          multiline
                          autoFocus
                          value={formData.description}
                          onChangeText={txt => setFormData({ ...formData, description: txt })}
                          placeholder={selectedDates.length === 1 ? 'Event details...' : 'Overview of the multi-day event...'}
                          placeholderTextColor={colors.textSecondary}
                        />
                      </View>
                    </View>
                  </KeyboardAvoidingView>
                </Modal>

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
  );
};
