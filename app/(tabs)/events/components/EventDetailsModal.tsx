import React from 'react';
import { Modal, SafeAreaView, View, TouchableOpacity, Text, ScrollView, Image, Linking, useWindowDimensions } from 'react-native';
import { ReminderModal } from './ReminderModal';

type Props = {
  showEventDetails: boolean;
  setShowEventDetails: (value: boolean) => void;
  styles: any;
  colors: any;
  selectedEvent: any;
  setShowFlyerFullView: (value: boolean) => void;
  isDarkMode: boolean;
  formatFullDate: (date: string) => string;
  calculateDuration: (start: string, end: string) => string;
  showAlert: (title: string, message: string, buttons?: any[]) => void;
  setReminderEvent: (event: any) => void;
  buildDateFromStrings: (dateStr: string, timeStr?: string) => Date;
  setReminderSelections: React.Dispatch<React.SetStateAction<{ date: string; times: string[] }[]>>;
  setReminderModalVisible: (value: boolean) => void;
  reminderModalVisible: boolean;
  setShowReminderDatePicker: (value: boolean) => void;
  reminderSelections: { date: string; times: string[] }[];
  formatTimeDisplay: (time: string) => string;
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
  isViewingOwnEvent: boolean;
  handleEditEvent: (event: any) => void;
  handleDeleteEvent: (eventId: string) => void;
};

export function EventDetailsModal({
  showEventDetails,
  setShowEventDetails,
  styles,
  colors,
  selectedEvent,
  setShowFlyerFullView,
  isDarkMode,
  formatFullDate,
  calculateDuration,
  showAlert,
  setReminderEvent,
  buildDateFromStrings,
  setReminderSelections,
  setReminderModalVisible,
  reminderModalVisible,
  setShowReminderDatePicker,
  reminderSelections,
  formatTimeDisplay,
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
  isViewingOwnEvent,
  handleEditEvent,
  handleDeleteEvent,
}: Props) {
  const { width } = useWindowDimensions();
  const isLargeScreen = width >= 768;

  return (
    <Modal visible={showEventDetails} animationType="slide" transparent>
      <View
        style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.6)',
          justifyContent: isLargeScreen ? 'center' : 'flex-start',
        }}
      >
      <SafeAreaView
        style={[
          styles.container,
          {
            backgroundColor: colors.background,
            width: isLargeScreen ? Math.min(width * 0.8, 800) : '100%',
            alignSelf: 'center',
            borderRadius: isLargeScreen ? 24 : 0,
            maxHeight: isLargeScreen ? '92%' : '100%',
            overflow: 'hidden',
          },
        ]}
      >
        {/* Header */}
        <View style={[styles.eventDetailsHeader, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => setShowEventDetails(false)} style={styles.eventDetailsBackBtn}>
            <Text style={[styles.eventDetailsBackIcon, { color: colors.text }]}>‹</Text>
          </TouchableOpacity>
          <Text style={[styles.eventDetailsHeaderTitle, { color: colors.text }]}>Event Details</Text>
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
                <Text style={[styles.flyerBannerPlaceholderText, { color: colors.textSecondary }]}>No Flyer Available</Text>
              </View>
            )}

            {/* Main Content */}
            <View style={styles.eventDetailsMainContent}>
              {/* Title Section */}
              <View style={styles.eventDetailsTitleSection}>
                <Text style={[styles.eventDetailsMainTitle, { color: colors.text }]}>{selectedEvent.title}</Text>
                <View style={styles.eventDetailsBadgesRow}>
                  <View style={[styles.eventDetailsBadge, { backgroundColor: colors.primaryLight }]}>
                    <Text style={[styles.eventDetailsBadgeText, { color: colors.primary }]}>{selectedEvent.category}</Text>
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
                    <Text style={[styles.eventDetailsCardLabel, { color: colors.textSecondary }]}>Organizer / Organization</Text>
                    <Text style={[styles.eventDetailsCardValue, { color: colors.text }]}>{selectedEvent.organizer}</Text>
                  </View>
                </View>
              </View>

              <View style={[styles.eventDetailsCard, { backgroundColor: colors.surface, borderLeftColor: colors.primary }]}>
                <View style={styles.eventDetailsCardRow}>
                  <View style={[styles.eventDetailsCardIcon, { backgroundColor: colors.primaryLight }]}>
                    <Text style={styles.eventDetailsCardIconText}>📅</Text>
                  </View>
                  <View style={styles.eventDetailsCardInfo}>
                    <Text style={[styles.eventDetailsCardLabel, { color: colors.textSecondary }]}>Date</Text>
                    <Text style={[styles.eventDetailsCardValue, { color: colors.text }]}>{formatFullDate(selectedEvent.date)}</Text>
                  </View>
                </View>
              </View>

              <View style={[styles.eventDetailsCard, { backgroundColor: colors.surface, borderLeftColor: colors.primary }]}>
                <View style={styles.eventDetailsCardRow}>
                  <View style={[styles.eventDetailsCardIcon, { backgroundColor: colors.primaryLight }]}>
                    <Text style={styles.eventDetailsCardIconText}>🕒</Text>
                  </View>
                  <View style={styles.eventDetailsCardInfo}>
                    <Text style={[styles.eventDetailsCardLabel, { color: colors.textSecondary }]}>Time</Text>
                    <Text style={[styles.eventDetailsCardValue, { color: colors.text }]}>
                      {selectedEvent.startTime} - {selectedEvent.endTime}
                    </Text>
                    <Text style={[styles.eventDetailsCardSubValue, { color: colors.textSecondary }]}>
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
                      <Text style={[styles.eventDetailsCardLabel, { color: colors.textSecondary }]}>Venue</Text>
                      <Text style={[styles.eventDetailsCardValue, { color: colors.text }]}>{selectedEvent.venue}</Text>
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
                      <Text style={[styles.eventDetailsCardLabel, { color: colors.textSecondary }]}>Platform</Text>
                      <Text style={[styles.eventDetailsCardValue, { color: colors.text }]}>{selectedEvent.platform}</Text>
                    </View>
                  </View>
                </View>
              )}

              {selectedEvent.link && (
                <TouchableOpacity
                  style={[styles.eventDetailsCard, { backgroundColor: colors.surface, borderLeftColor: colors.primary }]}
                  onPress={async () => {
                    if (selectedEvent.link) {
                      try {
                        let url = selectedEvent.link;
                        if (!url.startsWith('http://') && !url.startsWith('https://')) {
                          url = 'https://' + url;
                        }

                        const supported = await Linking.canOpenURL(url);
                        if (supported) {
                          await Linking.openURL(url);
                        } else {
                          showAlert('Error', `Cannot open this URL: ${url}`);
                        }
                      } catch (error) {
                        console.error('Error opening URL:', error);
                        showAlert('Error', 'Failed to open the link. Please check the URL.');
                      }
                    }
                  }}
                  activeOpacity={0.7}
                >
                  <View style={styles.eventDetailsCardRow}>
                    <View style={[styles.eventDetailsCardIcon, { backgroundColor: colors.primaryLight }]}>
                      <Text style={styles.eventDetailsCardIconText}>🌐</Text>
                    </View>
                    <View style={styles.eventDetailsCardInfo}>
                      <Text style={[styles.eventDetailsCardLabel, { color: colors.textSecondary }]}>Meeting Link</Text>
                      <Text style={[styles.eventDetailsCardValue, { color: colors.primary }]} numberOfLines={1}>
                        {selectedEvent.link}
                      </Text>
                      <Text style={[styles.eventDetailsCardSubValue, { color: colors.primary, fontSize: 11 }]}>
                        Tap to open link ↗
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              )}

              {selectedEvent.description && (
                <View style={[styles.eventDetailsCard, { backgroundColor: colors.surface, borderLeftColor: colors.primary }]}>
                  <Text style={[styles.eventDetailsCardLabel, { color: colors.textSecondary }]}>About This Event</Text>
                  <Text style={[styles.eventDetailsDescriptionText, { color: colors.text }]}>{selectedEvent.description}</Text>
                </View>
              )}

              {/* Set Reminder Button - Available to all users */}
              <View style={styles.eventDetailsActionButtons}>
                <TouchableOpacity
                  style={[styles.eventDetailsActionButton, { backgroundColor: colors.primary }]}
                  onPress={() => {
                    setReminderEvent(selectedEvent);
                    // Default: 6 hours before event time
                    const eventDate = selectedEvent.date;
                    const eventTime = selectedEvent.startTime || '12:00 PM';
                    const eventDateTime = buildDateFromStrings(eventDate, eventTime);
                    const defaultDate = eventDateTime ? new Date(eventDateTime.getTime() - 6 * 60 * 60 * 1000) : new Date();
                    const defaultDay = defaultDate.toISOString().slice(0, 10);
                    const defaultTime = defaultDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
                    setReminderSelections([{ date: defaultDay, times: [defaultTime] }]);
                    setReminderModalVisible(true);
                  }}
                >
                  <Text style={styles.eventDetailsActionButtonText}>⏰ Set Reminder</Text>
                </TouchableOpacity>
              </View>
              <ReminderModal
                reminderModalVisible={reminderModalVisible}
                setReminderModalVisible={setReminderModalVisible}
                styles={styles}
                colors={colors}
                setShowReminderDatePicker={setShowReminderDatePicker}
                reminderSelections={reminderSelections}
                formatFullDate={formatFullDate}
                formatTimeDisplay={formatTimeDisplay}
                setReminderSelections={setReminderSelections}
                setEditingReminderDate={setEditingReminderDate}
                setEditingReminderTime={setEditingReminderTime}
                setShowReminderTimePicker={setShowReminderTimePicker}
                isReminderValid={isReminderValid}
                handleAddReminderToCalendar={handleAddReminderToCalendar}
                renderGoogleCalendarOption={renderGoogleCalendarOption}
                showReminderDatePicker={showReminderDatePicker}
                getTodayUTC={getTodayUTC}
                getReminderMaxDate={getReminderMaxDate}
                showReminderTimePicker={showReminderTimePicker}
                reminderEvent={reminderEvent}
                editingReminderDate={editingReminderDate}
              />

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
                      showAlert(
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
                        ]
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
      </View>
    </Modal>
  );
}

export default EventDetailsModal;
