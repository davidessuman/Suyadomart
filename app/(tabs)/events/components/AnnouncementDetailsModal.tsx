import React from 'react';
import { Modal, SafeAreaView, View, TouchableOpacity, Text, ScrollView, Image, useWindowDimensions } from 'react-native';

type Props = {
  showAnnouncementDetails: boolean;
  setShowAnnouncementDetails: (value: boolean) => void;
  setViewingAnnouncementFromMyList: (value: boolean) => void;
  styles: any;
  colors: any;
  selectedAnnouncement: any;
  setFullScreenImageUrl: (value: string) => void;
  setShowFullScreenImage: (value: boolean) => void;
  viewingAnnouncementFromMyList: boolean;
  currentUserId: string;
  editAnnouncement: (announcement: any) => void;
  showDeleteConfirmation: (announcementId: string) => void;
};

export function AnnouncementDetailsModal({
  showAnnouncementDetails,
  setShowAnnouncementDetails,
  setViewingAnnouncementFromMyList,
  styles,
  colors,
  selectedAnnouncement,
  setFullScreenImageUrl,
  setShowFullScreenImage,
  viewingAnnouncementFromMyList,
  currentUserId,
  editAnnouncement,
  showDeleteConfirmation,
}: Props) {
  const { width } = useWindowDimensions();
  const isLargeScreen = width >= 768;

  return (
    <Modal visible={showAnnouncementDetails} animationType="slide" transparent>
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
          <TouchableOpacity onPress={() => { setShowAnnouncementDetails(false); setViewingAnnouncementFromMyList(false); }} style={styles.eventDetailsBackBtn}>
            <Text style={[styles.eventDetailsBackIcon, { color: colors.text }]}>‹</Text>
          </TouchableOpacity>
          <Text style={[styles.eventDetailsHeaderTitle, { color: colors.text }]}>Announcement Details</Text>
          <View style={{ width: 40 }} />
        </View>

        {selectedAnnouncement && (
          <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
            {/* Professional Image Banner Section */}
            {selectedAnnouncement.image_url && selectedAnnouncement.image_url.startsWith('https://') ? (
              <TouchableOpacity
                activeOpacity={0.8}
                style={styles.flyerBannerContainer}
                onPress={() => {
                  setFullScreenImageUrl(selectedAnnouncement.image_url);
                  setShowFullScreenImage(true);
                }}
              >
                <View style={[styles.flyerBannerInner, { backgroundColor: colors.surface }]}>
                  <Image
                    source={{ uri: selectedAnnouncement.image_url }}
                    style={styles.flyerBannerImage}
                    resizeMode="contain"
                  />
                  <View style={styles.flyerBannerOverlay} />
                </View>
              </TouchableOpacity>
            ) : (
              <View style={[styles.flyerBannerPlaceholder, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={styles.flyerBannerPlaceholderIcon}>📢</Text>
                <Text style={[styles.flyerBannerPlaceholderText, { color: colors.textSecondary }]}>No Image Available</Text>
              </View>
            )}

            {/* Main Content */}
            <View style={styles.eventDetailsMainContent}>
              {/* Title Section */}
              <View style={styles.eventDetailsTitleSection}>
                <Text style={[styles.eventDetailsMainTitle, { color: colors.text }]}>{selectedAnnouncement.title}</Text>
                <View style={styles.eventDetailsBadgesRow}>
                  <View style={[styles.eventDetailsBadge, { backgroundColor: colors.primaryLight }]}>
                    <Text style={[styles.eventDetailsBadgeText, { color: colors.primary }]}>{selectedAnnouncement.category}</Text>
                  </View>
                  <View style={[styles.eventDetailsBadge, {
                    backgroundColor: selectedAnnouncement.priority === 'Urgent' ? colors.error + '20' : colors.info + '20'
                  }]}>
                    <Text style={[styles.eventDetailsBadgeText, {
                      color: selectedAnnouncement.priority === 'Urgent' ? colors.error : colors.info
                    }]}>
                      {selectedAnnouncement.priority}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Info Cards */}
              <View style={[styles.eventDetailsCard, { backgroundColor: colors.surface, borderLeftColor: colors.primary }]}>
                <View style={styles.eventDetailsCardRow}>
                  <View style={[styles.eventDetailsCardIcon, { backgroundColor: colors.primaryLight }]}>
                    <Text style={styles.eventDetailsCardIconText}>👥</Text>
                  </View>
                  <View style={styles.eventDetailsCardInfo}>
                    <Text style={[styles.eventDetailsCardLabel, { color: colors.textSecondary }]}>Announced For</Text>
                    <Text style={[styles.eventDetailsCardValue, { color: colors.text }]}>{selectedAnnouncement.announced_for}</Text>
                  </View>
                </View>
              </View>

              <View style={[styles.eventDetailsCard, { backgroundColor: colors.surface, borderLeftColor: colors.primary }]}>
                <View style={styles.eventDetailsCardRow}>
                  <View style={[styles.eventDetailsCardIcon, { backgroundColor: colors.primaryLight }]}>
                    <Text style={styles.eventDetailsCardIconText}>📅</Text>
                  </View>
                  <View style={styles.eventDetailsCardInfo}>
                    <Text style={[styles.eventDetailsCardLabel, { color: colors.textSecondary }]}>Posted Date</Text>
                    <Text style={[styles.eventDetailsCardValue, { color: colors.text }]}>
                      {new Date(selectedAnnouncement.created_at).toLocaleDateString('en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Message Section - Professional and Centered */}
              <View style={[styles.announcementMessageSection, { backgroundColor: colors.surface }]}>
                <View style={styles.announcementMessageHeader}>
                  <View style={[styles.announcementMessageIconContainer, { backgroundColor: colors.primaryLight }]}>
                    <Text style={styles.announcementMessageIcon}>💬</Text>
                  </View>
                  <Text style={[styles.announcementMessageTitle, { color: colors.text }]}>Announcement Message</Text>
                </View>
                <View style={styles.announcementMessageDivider} />
                <Text style={[styles.announcementMessageText, { color: colors.text }]}>
                  {selectedAnnouncement.message}
                </Text>
              </View>

              {/* Edit and Delete Buttons - Only when viewing from My Announcements */}
              {viewingAnnouncementFromMyList && selectedAnnouncement.user_id === currentUserId && (
                <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
                  <TouchableOpacity
                    style={[styles.eventDetailsActionButton, { backgroundColor: colors.primary, flex: 1 }]}
                    onPress={() => {
                      setShowAnnouncementDetails(false);
                      editAnnouncement(selectedAnnouncement);
                    }}
                  >
                    <Text style={[styles.eventDetailsActionButtonIcon]}>✏️</Text>
                    <Text style={[styles.eventDetailsActionButtonText, { color: '#FFFFFF' }]}>Edit Announcement</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.eventDetailsActionButton, { backgroundColor: colors.error, flex: 1 }]}
                    onPress={() => {
                      setShowAnnouncementDetails(false);
                      showDeleteConfirmation(selectedAnnouncement.id);
                    }}
                  >
                    <Text style={[styles.eventDetailsActionButtonIcon]}>🗑️</Text>
                    <Text style={[styles.eventDetailsActionButtonText, { color: '#FFFFFF' }]}>Delete</Text>
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
