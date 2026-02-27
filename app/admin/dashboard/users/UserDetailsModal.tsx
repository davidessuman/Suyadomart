import React from 'react';
import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View, Image } from 'react-native';
// Make sure ModifyUserMenu.tsx exists in the same folder, or update the path if it's elsewhere
import { Ionicons } from '@expo/vector-icons';

const SUPABASE_URL = 'https://qwujadyqebfypyhfuwfl.supabase.co';

type UserProfile = {
  id: string;
  full_name: string | null;
  username: string | null;
  email: string | null;
  university: string | null;
  is_seller: boolean | null;
  created_at: string;
  avatar_url?: string | null;
  shop_name?: string | null;
  shop_phone?: string | null;
};

interface UserDetailsModalProps {
  visible: boolean;
  user: UserProfile | null;
  onClose: () => void;
  onViewShop?: (user: UserProfile) => void;
}


const UserDetailsModal = ({ visible, user, onClose, onViewShop }: UserDetailsModalProps) => {
  if (!user) return null;

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const getAvatarUrl = (avatarUrl: string | null | undefined) => {
    if (!avatarUrl) return null;
    return `${SUPABASE_URL}/storage/v1/object/public/avatars/${avatarUrl}`;
  };

  const displayName = user.full_name || user.username || user.email || 'Unnamed user';
  const isSeller = Boolean(user.is_seller);
  const avatarUrl = getAvatarUrl(user.avatar_url);

  const handleViewShop = () => {
    if (!isSeller) return;

    onClose();
    onViewShop?.(user);
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header with Avatar */}
          <View style={styles.header}>
            <View style={styles.headerContent}>
              <View style={styles.avatarSection}>
                {avatarUrl ? (
                  <Image source={{ uri: avatarUrl }} style={styles.profileAvatar} />
                ) : (
                  <View style={[styles.profileAvatar, styles.defaultAvatar]}>
                    <Ionicons name="person" size={48} color="#CBD5E1" />
                  </View>
                )}
              </View>
              <Text style={styles.headerTitle}>{displayName}</Text>
              <Text style={styles.headerSubtitle}>@{user.username || 'username'}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeIconButton}>
              <Ionicons name="close" size={24} color="#64748B" />
            </TouchableOpacity>
          </View>

          {/* Content */}
          <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
            {/* Account Type Badge Section */}
            <View style={styles.accountTypeSection}>
              <View style={[styles.accountTypeBadge, isSeller ? styles.sellerBadgeSection : styles.buyerBadgeSection]}>
                <View style={[styles.iconCircle, isSeller ? styles.sellerIcon : styles.buyerIcon]}>
                  <Ionicons name={isSeller ? 'storefront' : 'cart'} size={20} color="#FFFFFF" />
                </View>
                <View style={styles.accountTypeText}>
                  <Text style={[styles.accountTypeLabel, isSeller ? styles.sellerLabel : styles.buyerLabel]}>
                    {isSeller ? 'Seller Account' : 'Buyer Account'}
                  </Text>
                  <Text style={styles.accountTypeDescription}>
                    {isSeller ? 'Shop owner and product seller' : 'Regular buyer account'}
                  </Text>
                </View>
              </View>
            </View>

            {/* Profile Information Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                <Ionicons name="person" size={14} color="#0F172A" /> Basic Information
              </Text>
              <View style={styles.sectionContent}>
                {isSeller ? (
                  <>
                    <View style={styles.detailRow}>
                      <View style={styles.detailLeft}>
                        <Text style={styles.detailLabel}>Full Name</Text>
                      </View>
                      <Text style={styles.detailValue}>{user.full_name || '-'}</Text>
                    </View>
                    <View style={styles.divider} />
                  </>
                ) : null}

                <View style={styles.detailRow}>
                  <View style={styles.detailLeft}>
                    <Text style={styles.detailLabel}>Username</Text>
                  </View>
                  <Text style={[styles.detailValue, styles.usernameValue]}>{user.username ? `@${user.username}` : '-'}</Text>
                </View>
                <View style={styles.divider} />

                <View style={styles.detailRow}>
                  <View style={styles.detailLeft}>
                    <Text style={styles.detailLabel}>Email</Text>
                  </View>
                  <Text style={[styles.detailValue, styles.emailValue]}>{user.email || '-'}</Text>
                </View>
              </View>
            </View>

            {/* University Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                <Ionicons name="school" size={14} color="#0F172A" /> University
              </Text>
              <View style={styles.sectionContent}>
                <Text style={styles.universityValue}>{user.university || 'Not specified'}</Text>
              </View>
            </View>

            {/* Shop Information Section (Sellers Only) */}
            {isSeller ? (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>
                  <Ionicons name="storefront" size={14} color="#1D4ED8" /> Shop Information
                </Text>
                <View style={[styles.sectionContent, styles.shopSection]}>
                  <View style={styles.detailRow}>
                    <View style={styles.detailLeft}>
                      <Text style={styles.detailLabel}>Shop Name</Text>
                    </View>
                    <Text style={styles.detailValue}>{user.shop_name || '-'}</Text>
                  </View>
                  <View style={styles.divider} />

                  <View style={styles.detailRow}>
                    <View style={styles.detailLeft}>
                      <Text style={styles.detailLabel}>Shop Phone</Text>
                    </View>
                    <Text style={[styles.detailValue, styles.phoneValue]}>{user.shop_phone || '-'}</Text>
                  </View>
                </View>
              </View>
            ) : null}

            {/* Account Dates Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                <Ionicons name="calendar" size={14} color="#0F172A" /> Account Details
              </Text>
              <View style={styles.sectionContent}>
                <View style={styles.detailRow}>
                  <View style={styles.detailLeft}>
                    <Text style={styles.detailLabel}>Member Since</Text>
                  </View>
                  <Text style={styles.detailValue}>{formatDate(user.created_at)}</Text>
                </View>
              </View>
            </View>

            {/* User ID Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                <Ionicons name="key" size={14} color="#0F172A" /> User ID
              </Text>
              <View style={[styles.sectionContent, styles.idSection]}>
                <Text style={styles.idValue} selectable>
                  {user.id}
                </Text>
              </View>
            </View>
          </ScrollView>

          {/* Footer */}
          <View style={styles.footer}>
            <View style={styles.footerButtonsRow}>
              {isSeller ? (
                <TouchableOpacity style={styles.viewShopButton} onPress={handleViewShop} activeOpacity={0.88}>
                  <Ionicons name="storefront-outline" size={18} color="#FFFFFF" />
                  <Text style={styles.viewShopButtonText}>View Shop</Text>
                </TouchableOpacity>
              ) : null}

              <TouchableOpacity style={styles.closeButton} onPress={onClose} activeOpacity={0.88}>
                <Ionicons name="close-circle" size={18} color="#FFFFFF" />
                <Text style={styles.closeButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    width: '100%',
    maxWidth: 520,
    maxHeight: '90%',
    flexDirection: 'column',
    overflow: 'hidden',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  headerContent: {
    flex: 1,
    alignItems: 'center',
  },
  avatarSection: {
    marginBottom: 12,
  },
  profileAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: '#2563EB',
  },
  defaultAvatar: {
    backgroundColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
    textAlign: 'center',
  },
  closeIconButton: {
    padding: 8,
    marginLeft: 16,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 24,
    paddingVertical: 20,
    gap: 20,
  },
  accountTypeSection: {
    marginBottom: 4,
  },
  accountTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  sellerBadgeSection: {
    backgroundColor: '#DBEAFE',
  },
  buyerBadgeSection: {
    backgroundColor: '#F0F4F8',
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sellerIcon: {
    backgroundColor: '#1D4ED8',
  },
  buyerIcon: {
    backgroundColor: '#475569',
  },
  accountTypeText: {
    flex: 1,
  },
  accountTypeLabel: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  sellerLabel: {
    color: '#1D4ED8',
  },
  buyerLabel: {
    color: '#334155',
  },
  accountTypeDescription: {
    fontSize: 12,
    color: '#64748B',
  },
  section: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  sectionContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  shopSection: {
    backgroundColor: '#FFFBEB',
    borderBottomColor: '#FEE2E2',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  detailLeft: {
    flex: 0.4,
  },
  detailLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  detailValue: {
    fontSize: 14,
    color: '#0F172A',
    fontWeight: '500',
    flex: 0.6,
    textAlign: 'right',
  },
  usernameValue: {
    color: '#1D4ED8',
    fontFamily: 'monospace',
  },
  emailValue: {
    fontSize: 13,
  },
  phoneValue: {
    fontSize: 13,
  },
  universityValue: {
    fontSize: 14,
    color: '#0F172A',
    fontWeight: '500',
    paddingVertical: 4,
  },
  idSection: {
    backgroundColor: '#F1F5F9',
  },
  idValue: {
    fontSize: 11,
    fontFamily: 'monospace',
    color: '#64748B',
    lineHeight: 18,
  },
  divider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 0,
  },
  footer: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  footerButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  modifyButton: {
    flex: 1,
    maxWidth: 220,
    minHeight: 46,
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#2563EB',
    borderWidth: 1,
    borderColor: '#2563EB',
    shadowColor: '#1D4ED8',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  viewShopButton: {
    flex: 1,
    maxWidth: 220,
    minHeight: 46,
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#0F766E',
    borderWidth: 1,
    borderColor: '#0D5F59',
    shadowColor: '#0D5F59',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 3,
  },
  viewShopButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  modifyButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  closeButton: {
    flex: 1,
    maxWidth: 220,
    minHeight: 46,
    backgroundColor: '#DC2626',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#B91C1C',
    paddingHorizontal: 20,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#B91C1C',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 3,
  },
  closeButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
});

export default UserDetailsModal;
