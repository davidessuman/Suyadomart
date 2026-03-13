import React, { useState } from 'react';
import { ActivityIndicator, Alert, Image, Text, TouchableOpacity, View, Modal, FlatList, Platform, StyleSheet, useWindowDimensions } from 'react-native';
import { Ionicons, MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import FollowedSellersScreen from './followedSellers';

type BuyerProfileCardProps = {
  styles: any;
  colors: any;
  isDarkMode: boolean;
  avatarUrl: string;
  getFallbackAvatar: () => string;
  avatarLoading: boolean;
  profile: any;
  session: any;
  selectedSchool: string;
  setSettingsModal: (value: boolean) => void;
  setSellerFormModal: (value: boolean) => void;
};


function BuyerProfileCard({
  styles,
  colors,
  isDarkMode,
  avatarUrl,
  getFallbackAvatar,
  avatarLoading,
  profile,
  session,
  selectedSchool,
  setSettingsModal,
  setSellerFormModal,
}: BuyerProfileCardProps) {
  const [photoModalVisible, setPhotoModalVisible] = useState(false);
  const [followedModalVisible, setFollowedModalVisible] = useState(false);
  const followedSellers: any[] = profile?.followed_sellers || [];

  const isFollowedActive = (followedSellers && followedSellers.length > 0) || followedModalVisible;

  const { width } = useWindowDimensions();
  const buttonMinWidth = Math.max(84, Math.min(140, Math.round(width * 0.28)));
  const followedButtonMinWidth = Math.max(64, Math.min(110, Math.round(width * 0.22)));

  const localStyles = StyleSheet.create({
    actionRow: { flexDirection: 'row', marginTop: 10, marginBottom: 6, justifyContent: 'center' },
    actionButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 999 },
    infoButton: { marginRight: 8, borderWidth: 1 },
    followedButton: { marginLeft: 8, borderWidth: 1 },
    buttonText: { fontWeight: '700', fontSize: 14 },
    badgeContainer: { marginLeft: 10, minWidth: 28, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    badgeText: { fontWeight: '800', fontSize: 12 },
  });
  return (
    <View style={[styles.profileCard, { backgroundColor: colors.card }]}>
      <View style={styles.avatarContainer}>
        <TouchableOpacity onPress={() => setPhotoModalVisible(true)} activeOpacity={0.85}>
          <View style={[styles.avatarWrapper, { borderColor: colors.primary }]}>
            <Image
              source={{ uri: avatarUrl }}
              style={styles.avatar}
              defaultSource={{ uri: getFallbackAvatar() }}
              resizeMode="cover"
            />
            {avatarLoading && (
              <View style={[styles.cameraOverlay, { backgroundColor: 'rgba(0,0,0,0.6)' }]}>
                <ActivityIndicator color="white" size="small" />
              </View>
            )}
          </View>
        </TouchableOpacity>
      </View>

      {/* Profile Photo View Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={photoModalVisible}
        onRequestClose={() => setPhotoModalVisible(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', alignItems: 'center' }}>
          <TouchableOpacity
            style={{ position: 'absolute', top: 40, right: 30, flexDirection: 'row', alignItems: 'center', zIndex: 2 }}
            onPress={() => setPhotoModalVisible(false)}
            activeOpacity={0.9}
          >
            <Ionicons name="close" size={28} color="#fff" />
            <Text style={{ color: '#fff', fontSize: 16, marginLeft: 6 }}>Close</Text>
          </TouchableOpacity>
          <TouchableOpacity style={{ flex: 1, width: '100%', justifyContent: 'center', alignItems: 'center' }} activeOpacity={1} onPress={() => setPhotoModalVisible(false)}>
            <Image
              source={{ uri: avatarUrl }}
              style={{ width: 300, height: 300, borderRadius: 20, borderWidth: 2, borderColor: colors.primary }}
              resizeMode="cover"
            />
          </TouchableOpacity>
        </View>
      </Modal>

      {/* Followed Sellers Modal */}
      <Modal
        animationType="slide"
        transparent
        visible={followedModalVisible}
        onRequestClose={() => setFollowedModalVisible(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ width: '92%', maxHeight: '74%', borderRadius: 16, overflow: 'hidden' }}>
            <FollowedSellersScreen onClose={() => setFollowedModalVisible(false)} embedded />
          </View>
        </View>
      </Modal>

      <View style={styles.userInfo}>
        <Text style={[styles.username, { color: colors.text }]}> 
          <Text style={{ fontWeight: '700', color: colors.text, marginRight: 6 }}>Username: </Text>
          @{profile?.username || 'username'}
        </Text>

        <Text style={[styles.email, { color: colors.textSecondary }]}> 
          <Text style={{ fontWeight: '700', color: colors.textSecondary, marginRight: 6 }}>Email: </Text>
          {session?.user?.email}
        </Text>

        <View style={localStyles.actionRow}>
          <TouchableOpacity
            onPress={() => Alert.alert('Info', 'User info coming soon')}
            activeOpacity={0.9}
            style={[
              localStyles.actionButton,
              localStyles.infoButton,
              { borderColor: colors.primary, backgroundColor: 'transparent', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
              { minWidth: buttonMinWidth },
            ]}
          >
            <Ionicons name="information-circle" size={18} color={colors.primary} style={{ marginRight: 8 }} />
            <Text style={[localStyles.buttonText, { color: colors.primary }]}>Info</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setFollowedModalVisible(true)}
            activeOpacity={0.9}
            style={[
              localStyles.actionButton,
              localStyles.followedButton,
              isFollowedActive
                ? { backgroundColor: colors.primary, borderColor: colors.primary }
                : { backgroundColor: 'transparent', borderColor: colors.primary },
              { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
              { minWidth: followedButtonMinWidth },
            ]}
          >
            <MaterialCommunityIcons name="heart-outline" size={18} color={isFollowedActive ? '#fff' : colors.primary} style={{ marginRight: 8 }} />
            <Text style={[localStyles.buttonText, { color: isFollowedActive ? '#fff' : colors.primary }]}>Followed Sellers</Text>
            <View style={[localStyles.badgeContainer, { backgroundColor: isFollowedActive ? '#fff' : colors.primary }]}> 
              <Text style={[localStyles.badgeText, { color: isFollowedActive ? colors.primary : '#fff' }]}>{followedSellers.length || 0}</Text>
            </View>
          </TouchableOpacity>
        </View>

        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        <View style={styles.detailRow}>
          <Ionicons name="school" size={20} color={colors.textSecondary} />
          <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>University:</Text>
          <Text style={[styles.detailValue, { color: colors.text }]}>
            {profile?.university || 'Not selected'}
          </Text>
        </View>

        <View style={styles.detailRow}>
          <MaterialIcons name="badge" size={20} color={colors.textSecondary} />
          <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Status:</Text>
          <View style={[styles.buyerBadge, { backgroundColor: colors.primary + '20' }]}>
            <Text style={[styles.buyerText, { color: colors.primary }]}>BUYER</Text>
          </View>
        </View>
        {/* Push notifications moved to Settings -> Notifications */}
      </View>

      <TouchableOpacity
        style={[styles.sellerButton, { backgroundColor: colors.primary }]}
        onPress={() => {
          if (!selectedSchool) {
            Alert.alert(
              'Select University',
              'Please select your university first before becoming a seller.',
              [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Select University', onPress: () => setSettingsModal(true) },
              ]
            );
          } else {
            setSellerFormModal(true);
          }
        }}
      >
        <MaterialCommunityIcons name="storefront" size={24} color="white" />
        <Text style={styles.sellerButtonText}>Become a Seller</Text>
      </TouchableOpacity>
    </View>
  );
}

export default BuyerProfileCard;
