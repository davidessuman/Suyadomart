import React from 'react';
import { FlatList, Image, Modal, SafeAreaView, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { createStyles, LIGHT_COLORS } from '../index';

export const UserAnnouncementsModal = ({
  showUserAnnouncements,
  setShowUserAnnouncements,
  colors,
  userAnnouncements,
  setSelectedAnnouncement,
  setViewingAnnouncementFromMyList,
  setShowAnnouncementDetails,
  setFullScreenImageUrl,
  setShowFullScreenImage,
}: {
  showUserAnnouncements: boolean;
  setShowUserAnnouncements: (value: boolean) => void;
  colors: typeof LIGHT_COLORS;
  userAnnouncements: any[];
  setSelectedAnnouncement: (announcement: any) => void;
  setViewingAnnouncementFromMyList: (value: boolean) => void;
  setShowAnnouncementDetails: (value: boolean) => void;
  setFullScreenImageUrl: (url: string) => void;
  setShowFullScreenImage: (value: boolean) => void;
}) => {
  const styles = createStyles(colors);
  const { width } = useWindowDimensions();
  const isLargeScreen = width >= 768;

  return (
    <Modal visible={showUserAnnouncements} animationType="slide" transparent>
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
        <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
          <Text style={[styles.modalTitle, { color: colors.text }]}>My Announcements</Text>
          <TouchableOpacity onPress={() => setShowUserAnnouncements(false)} style={[styles.closeBtn, { backgroundColor: colors.surface }]}>
            <Text style={[styles.closeBtnText, { color: colors.textSecondary }]}>✕</Text>
          </TouchableOpacity>
        </View>

        {userAnnouncements.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyText, { color: colors.text }]}>No announcements posted yet</Text>
            <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>Post your first announcement to get started</Text>
          </View>
        ) : (
          <FlatList
            data={userAnnouncements}
            keyExtractor={item => item.id}
            renderItem={({ item: announcement }) => {
              console.log('Rendering announcement:', announcement.id, 'Image URL:', announcement.image_url);

              // Helper function for category colors
              const getCategoryColor = (category: string) => {
                const colorMap: Record<string, string> = {
                  'Academic': colors.primary,
                  'Social': '#FF6B6B',
                  'Sports': '#4ECDC4',
                  'Culture': '#FFD93D',
                  'Career': '#A8E6CF',
                  'General': colors.textSecondary,
                  'Entertainment': '#FF6B6B',
                  'Educational': colors.primary,
                  'Political': '#FFD93D',
                  'Religious': '#A8E6CF',
                };
                return colorMap[category] || colors.primary;
              };

              return (
              <TouchableOpacity
                style={[styles.announcementCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => {
                  setSelectedAnnouncement(announcement);
                  setViewingAnnouncementFromMyList(true);
                  setShowAnnouncementDetails(true);
                }}
              >
                {/* Image Section */}
                {announcement.image_url && announcement.image_url.startsWith('https://') ? (
                  <TouchableOpacity
                    style={styles.announcementImageContainer}
                    onPress={(e) => {
                      e.stopPropagation();
                      setFullScreenImageUrl(announcement.image_url);
                      setShowFullScreenImage(true);
                    }}
                    activeOpacity={0.8}
                  >
                    <Image
                      source={{ uri: announcement.image_url }}
                      style={styles.announcementImageStyle}
                      resizeMode="cover"
                    />
                  </TouchableOpacity>
                ) : (
                  <View style={styles.announcementImageContainer}>
                    <View style={styles.announcementImagePlaceholder}>
                      <Text style={styles.announcementImagePlaceholderText}>
                        {announcement.image_url ? 'LOADING...' : 'NO IMAGE'}
                      </Text>
                    </View>
                  </View>
                )}

                {/* Content Section */}
                <View style={styles.announcementCardContent}>
                  <View style={styles.announcementCardHeader}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.announcementCardTitle, { color: colors.text }]} numberOfLines={2}>
                        {announcement.title}
                      </Text>
                      <Text style={[styles.announcementCardSubtitle, { color: colors.textSecondary }]}>
                        For: {announcement.announced_for}
                      </Text>
                    </View>
                    <View style={[
                      styles.priorityBadge,
                      announcement.priority === 'Urgent' ? { backgroundColor: colors.error + '30' } : { backgroundColor: colors.info + '30' }
                    ]}>
                      <Text style={[
                        styles.priorityBadgeText,
                        announcement.priority === 'Urgent' ? { color: colors.error } : { color: colors.info }
                      ]}>
                        {announcement.priority}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.announcementCardFooter}>
                    <Text style={[styles.announcementCardDate, { color: colors.textTertiary }]}>
                      📅 {new Date(announcement.created_at).toLocaleDateString()}
                    </Text>
                    <View style={[styles.categoryBadge, { backgroundColor: getCategoryColor(announcement.category) + '30' }]}>
                      <Text style={[styles.categoryBadgeText, { color: getCategoryColor(announcement.category) }]}>
                        {announcement.category}
                      </Text>
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
              );
            }}
            contentContainerStyle={styles.announcementsList}
          />
        )}
      </SafeAreaView>
      </View>
    </Modal>
  );
};