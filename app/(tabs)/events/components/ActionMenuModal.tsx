import React from 'react';
import { Modal, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { createStyles, LIGHT_COLORS } from '../index';

export const ActionMenuModal = ({
  showActionMenu,
  setShowActionMenu,
  isDarkMode,
  colors,
  currentUserId,
  requireAuth,
  setIsModalVisible,
  setIsAnnouncementModalVisible,
  fetchUserEvents,
  setShowUserEvents,
  fetchUserAnnouncements,
  setShowUserAnnouncements,
}: {
  showActionMenu: boolean;
  setShowActionMenu: (value: boolean) => void;
  isDarkMode: boolean;
  colors: typeof LIGHT_COLORS;
  currentUserId: string;
  requireAuth: (action?: string) => void;
  setIsModalVisible: (value: boolean) => void;
  setIsAnnouncementModalVisible: (value: boolean) => void;
  fetchUserEvents: () => void;
  setShowUserEvents: (value: boolean) => void;
  fetchUserAnnouncements: () => void;
  setShowUserAnnouncements: (value: boolean) => void;
}) => {
  const styles = createStyles(colors);
  const { width } = useWindowDimensions();
  const isLargeScreen = width >= 768;

  return (
    <Modal visible={showActionMenu} animationType="fade" transparent>
      <View
        style={[
          styles.actionMenuOverlay,
          {
            backgroundColor: isDarkMode ? 'rgba(0,0,0,0.8)' : 'rgba(0,0,0,0.6)',
            justifyContent: isLargeScreen ? 'center' : 'flex-end',
          },
        ]}
      >
        <View
          style={[
            styles.actionMenuContainer,
            {
              backgroundColor: colors.card,
              width: isLargeScreen ? Math.min(width * 0.8, 800) : '100%',
              alignSelf: 'center',
              borderRadius: isLargeScreen ? 24 : undefined,
            },
          ]}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={[styles.actionMenuTitle, { color: colors.text, flex: 1 }]}>What would you like to do?</Text>
            <TouchableOpacity
              onPress={() => setShowActionMenu(false)}
              style={[styles.closeBtn, { backgroundColor: colors.surface }]}
            >
              <Text style={[styles.closeBtnText, { color: colors.textSecondary }]}>✕</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.actionMenuButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={() => {
              if (!currentUserId) {
                requireAuth('create an event');
                return;
              }
              setIsModalVisible(true);
            }}
          >
            <Text style={styles.actionMenuButtonIcon}>📝</Text>
            <View>
              <Text style={[styles.actionMenuButtonTitle, { color: colors.text }]}>New Event</Text>
              <Text style={[styles.actionMenuButtonSubtitle, { color: colors.textSecondary }]}>Create and publish a new event</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionMenuButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={() => {
              if (!currentUserId) {
                requireAuth('post an announcement');
                return;
              }
              setIsAnnouncementModalVisible(true);
            }}
          >
            <Text style={styles.actionMenuButtonIcon}>📢</Text>
            <View>
              <Text style={[styles.actionMenuButtonTitle, { color: colors.text }]}>New Announcement</Text>
              <Text style={[styles.actionMenuButtonSubtitle, { color: colors.textSecondary }]}>Post an important announcement</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionMenuButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={() => {
              if (!currentUserId) {
                requireAuth('view your events');
                return;
              }
              fetchUserEvents();
              setShowUserEvents(true);
            }}
          >
            <Text style={styles.actionMenuButtonIcon}>📋</Text>
            <View>
              <Text style={[styles.actionMenuButtonTitle, { color: colors.text }]}>My Events</Text>
              <Text style={[styles.actionMenuButtonSubtitle, { color: colors.textSecondary }]}>View your published events</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionMenuButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={() => {
              if (!currentUserId) {
                requireAuth('view your announcements');
                return;
              }
              fetchUserAnnouncements();
              setShowUserAnnouncements(true);
            }}
          >
            <Text style={styles.actionMenuButtonIcon}>📢</Text>
            <View>
              <Text style={[styles.actionMenuButtonTitle, { color: colors.text }]}>My Announcements</Text>
              <Text style={[styles.actionMenuButtonSubtitle, { color: colors.textSecondary }]}>View and manage your announcements</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionMenuCancel}
            onPress={() => setShowActionMenu(false)}
          >
            <Text style={[styles.actionMenuCancelText, { color: colors.textSecondary }]}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};