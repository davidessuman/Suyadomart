import React, { useEffect, useState } from 'react';
import { supabase } from '../../../../lib/supabase';
import { Modal, View, Text, Image, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface EventDetailsModalProps {
  visible: boolean;
  onClose: () => void;
  onEdit?: (item: any, type: 'event' | 'announcement') => void;
  onDelete?: (item: any, type: 'event' | 'announcement') => Promise<void> | void;
  event?: any;
  announcement?: any;
}

const SUPABASE_URL = 'https://qwujadyqebfypyhfuwfl.supabase.co';

const getAvatarUrl = (avatarUrl: string | null | undefined) => {
  if (!avatarUrl) return null;
  // If already a full URL, return as is
  if (avatarUrl.startsWith('http')) return avatarUrl;
  return `${SUPABASE_URL}/storage/v1/object/public/avatars/${avatarUrl}`;
};

const EventDetailsModal: React.FC<EventDetailsModalProps> = ({ visible, onClose, onEdit, onDelete, event, announcement }) => {
  const [userProfile, setUserProfile] = useState<any | null>(null);
  const [showFullFlyer, setShowFullFlyer] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);
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
  const details = event || announcement;
  const userId = details?.user_id || details?.created_by || details?.id;
  useEffect(() => {
    if (visible && userId) {
      supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single()
        .then(({ data }) => setUserProfile(data));
    } else {
      setUserProfile(null);
    }
  }, [visible, userId]);

  if (!event && !announcement) return null;
  const isEvent = !!event;

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.modalContent}>
          <View style={styles.headerRow}>
            <View style={styles.headerMetaWrap}>
              <Text style={styles.headerMeta}>{isEvent ? 'Event Details' : 'Announcement Details'}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.8}>
              <View style={styles.closeBtnCircle}>
                <Text style={styles.closeBtnText}>×</Text>
              </View>
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {/* User Profile Section */}
            {userProfile && (
              <View style={styles.userProfileRow}>
                {userProfile.avatar_url && getAvatarUrl(userProfile.avatar_url) ? (
                  <Image source={{ uri: getAvatarUrl(userProfile.avatar_url) as string }} style={styles.userAvatar} />
                ) : (
                  <View style={styles.userAvatarPlaceholder}>
                    <Text style={styles.userAvatarInitial}>{(userProfile.full_name && userProfile.full_name.trim()) ? userProfile.full_name[0] : (userProfile.username ? userProfile.username[0] : '?')}</Text>
                  </View>
                )}
                <View style={styles.userProfileInfo}>
                  <Text style={styles.userProfileName}>{(userProfile.full_name && userProfile.full_name.trim()) ? userProfile.full_name : (userProfile.username || 'Unknown User')}</Text>
                  {userProfile.university && <Text style={styles.userProfileUniversity}>{userProfile.university}</Text>}
                  {userProfile.email && <Text style={styles.userProfileEmail}>{userProfile.email}</Text>}
                </View>
              </View>
            )}
            {/* Flyer/Image */}
            {details.flyer_url || details.image_url ? (
              <TouchableOpacity activeOpacity={0.9} onPress={() => setShowFullFlyer(true)}>
                <Image
                  source={{ uri: details.flyer_url || details.image_url }}
                  style={styles.flyer}
                  resizeMode="contain"
                />
              </TouchableOpacity>
            ) : (
              <View style={styles.flyerPlaceholder}>
                <Text style={styles.flyerPlaceholderText}>No Image</Text>
              </View>
            )}
                  {/* Fullscreen Flyer Modal */}
                  <Modal visible={showFullFlyer} animationType="fade" transparent>
                    <View style={styles.fullFlyerOverlay}>
                      <TouchableOpacity style={styles.fullFlyerCloseBtn} onPress={() => setShowFullFlyer(false)} activeOpacity={0.8}>
                        <View style={styles.closeBtnCircle}>
                          <Text style={styles.closeBtnText}>×</Text>
                        </View>
                      </TouchableOpacity>
                      <Image
                        source={{ uri: details.flyer_url || details.image_url }}
                        style={styles.fullFlyerImage}
                        resizeMode="contain"
                      />
                    </View>
                  </Modal>
            {/* Title & Badges */}
            <Text style={styles.title}>{details.title}</Text>
            <View style={styles.badgesRow}>
              {details.category && (
                <View style={styles.badge}><Text style={styles.badgeText}>{details.category}</Text></View>
              )}
              {isEvent && details.appearance && (
                <View style={styles.badge}><Text style={styles.badgeText}>{details.appearance}</Text></View>
              )}
              {!isEvent && details.priority && (
                <View style={styles.badge}><Text style={styles.badgeText}>{details.priority}</Text></View>
              )}
            </View>
            {/* Info Cards */}
            {isEvent ? (
              <>
                <View style={styles.infoCard}><Text style={styles.infoLabel}>Organizer:</Text><Text style={styles.infoValue}>{details.organizer}</Text></View>
                <View style={styles.infoCard}><Text style={styles.infoLabel}>Date:</Text><Text style={styles.infoValue}>{details.date}</Text></View>
                <View style={styles.infoCard}><Text style={styles.infoLabel}>Time:</Text><Text style={styles.infoValue}>{details.start_time} - {details.end_time}</Text></View>
                {details.venue && details.appearance !== 'Virtual Meeting' && (
                  <View style={styles.infoCard}><Text style={styles.infoLabel}>Venue:</Text><Text style={styles.infoValue}>{details.venue}</Text></View>
                )}
                {(details.appearance === 'Virtual Meeting' || details.appearance === 'Both') && details.platform && (
                  <View style={styles.infoCard}><Text style={styles.infoLabel}>Platform:</Text><Text style={styles.infoValue}>{details.platform}</Text></View>
                )}
                {details.link && (
                  <View style={styles.infoCard}><Text style={styles.infoLabel}>Link:</Text><Text style={[styles.infoValue, { color: '#2563EB' }]}>{details.link}</Text></View>
                )}
                {details.description && (
                  <View style={styles.infoCard}><Text style={styles.infoLabel}>Description:</Text><Text style={styles.infoValue}>{details.description}</Text></View>
                )}
              </>
            ) : (
              <>
                <View style={styles.infoCard}><Text style={styles.infoLabel}>Announced For:</Text><Text style={styles.infoValue}>{details.announced_for}</Text></View>
                <View style={styles.infoCard}><Text style={styles.infoLabel}>Posted Date:</Text><Text style={styles.infoValue}>{new Date(details.created_at).toLocaleDateString()}</Text></View>
                {details.message && (
                  <View style={styles.infoCard}><Text style={styles.infoLabel}>Message:</Text><Text style={styles.infoValue}>{details.message}</Text></View>
                )}
              </>
            )}
          </ScrollView>

          <View style={styles.footerActions}>
            <TouchableOpacity
              style={[styles.removeButton, deleting && styles.removeButtonDisabled]}
              activeOpacity={0.85}
              disabled={deleting}
              onPress={() => {
                if (!onDelete || deleting) return;
                setShowRemoveConfirm(true);
              }}
            >
              <Text style={styles.removeButtonText}>{deleting ? 'Removing...' : 'Remove'}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.editButton}
              activeOpacity={0.85}
              onPress={() => onEdit?.(details, isEvent ? 'event' : 'announcement')}
            >
              <Text style={styles.editButtonText}>Edit</Text>
            </TouchableOpacity>
          </View>

          {showRemoveConfirm ? (
            <View style={styles.confirmOverlay}>
              <View style={[styles.confirmCard, styles.statusCard]}>
                <View style={[styles.confirmIconWrap, styles.statusIconWarning]}>
                  <Ionicons name="warning-outline" size={20} color="#B45309" />
                </View>
                <Text style={styles.confirmTitle}>{`Remove ${isEvent ? 'Event' : 'Announcement'}`}</Text>
                <Text style={styles.confirmMessage}>{`Are you sure you want to remove this ${isEvent ? 'event' : 'announcement'}? This action cannot be undone.`}</Text>

                <View style={styles.confirmActions}>
                  <TouchableOpacity
                    style={styles.confirmCancelButton}
                    onPress={() => setShowRemoveConfirm(false)}
                    disabled={deleting}
                  >
                    <Text style={styles.confirmCancelText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.confirmDeleteButton, deleting && styles.removeButtonDisabled]}
                    onPress={async () => {
                      if (!onDelete || deleting) return;
                      try {
                        setDeleting(true);
                        await onDelete(details, isEvent ? 'event' : 'announcement');
                        setShowRemoveConfirm(false);
                        openStatusAlert(
                          'Success',
                          `${isEvent ? 'Event' : 'Announcement'} removed successfully.`,
                          'success',
                          onClose
                        );
                      } catch (removeError: any) {
                        openStatusAlert(
                          'Delete failed',
                          removeError?.message || `Failed to delete ${isEvent ? 'event' : 'announcement'}.`,
                          'error'
                        );
                      } finally {
                        setDeleting(false);
                      }
                    }}
                    disabled={deleting}
                  >
                    <Text style={styles.confirmDeleteText}>{deleting ? 'Removing...' : 'Remove'}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ) : null}

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
  fullFlyerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullFlyerImage: {
    width: '95%',
    height: '80%',
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
  },
  fullFlyerCloseBtn: {
    position: 'absolute',
    top: 32,
    right: 32,
    zIndex: 10,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  headerMetaWrap: {
    backgroundColor: '#EEF2FF',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#E0E7FF',
  },
  headerMeta: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4338CA',
    letterSpacing: 0.2,
  },
  closeBtn: {
    zIndex: 2,
  },
  closeBtnCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  closeBtnText: {
    fontSize: 24,
    color: '#334155',
    fontWeight: '700',
    lineHeight: 26,
    textAlign: 'center',
    marginTop: -1,
  },
  userProfileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    gap: 12,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 10,
  },
  userAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E0E7FF',
  },
  userAvatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E0E7FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  userAvatarInitial: {
    fontSize: 22,
    color: '#3730A3',
    fontWeight: '700',
  },
  userProfileInfo: {
    flex: 1,
  },
  userProfileName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
  },
  userProfileUniversity: {
    fontSize: 13,
    color: '#64748B',
  },
  userProfileEmail: {
    fontSize: 13,
    color: '#64748B',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '95%',
    maxWidth: 500,
    backgroundColor: '#fff',
    borderRadius: 20,
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 16,
    maxHeight: '90%',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 18,
    elevation: 8,
  },
  scrollContent: {
    paddingBottom: 10,
  },
  footerActions: {
    flexDirection: 'row',
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingTop: 12,
    marginTop: 4,
  },
  removeButton: {
    flex: 1,
    backgroundColor: '#DC2626',
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#B91C1C',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  removeButtonDisabled: {
    opacity: 0.7,
  },
  removeButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  editButton: {
    flex: 1,
    backgroundColor: '#2563EB',
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#1D4ED8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  editButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  flyer: {
    width: '100%',
    height: 220,
    borderRadius: 12,
    marginBottom: 14,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  flyerPlaceholder: {
    width: '100%',
    height: 220,
    borderRadius: 12,
    marginBottom: 14,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  flyerPlaceholderText: {
    color: '#64748B',
    fontSize: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 10,
  },
  badgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  badge: {
    backgroundColor: '#EEF2FF',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 5,
    marginRight: 6,
    borderWidth: 1,
    borderColor: '#E0E7FF',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#3730A3',
  },
  infoCard: {
    marginBottom: 10,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  infoLabel: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 15,
    color: '#1E293B',
    fontWeight: '500',
  },
  confirmOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    zIndex: 30,
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
  statusIconWarning: {
    backgroundColor: '#FEF3C7',
  },
  statusIconSuccess: {
    backgroundColor: '#DCFCE7',
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
  confirmCancelButton: {
    height: 36,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  confirmCancelText: {
    color: '#334155',
    fontSize: 12,
    fontWeight: '700',
  },
  confirmDeleteButton: {
    minWidth: 96,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#DC2626',
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 12,
  },
  confirmDeleteText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
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
});

export default EventDetailsModal;
