import React, { useState } from 'react';
import { Modal, Text, TouchableOpacity, View, SafeAreaView, useWindowDimensions, ScrollView } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import NotificationSection from './NotificationSection';
import UniversitySection from './UniversitySection';
import PersonalSection from './PersonalSection';

type BuyerSettingsModalProps = {
  settingsModal: boolean;
  setSettingsModal: (value: boolean) => void;
  styles: any;
  colors: any;
  universitySearch: string;
  setUniversitySearch: (value: string) => void;
  filteredUniversities: string[];
  selectedSchool: string;
  setSelectedSchool: (value: string) => void;
  saveSchool: () => void;
  confirmLogout: () => void;
  showLogoutConfirm: boolean;
  cancelLogout: () => void;
  proceedLogout: () => void;
  userProfile?: {
    username: string;
    email: string;
    avatarUrl: string;
  };
  session?: any;
  setAvatarUrl?: (url: string) => void;
  setProfile?: (profile: any) => void;
  avatarUrl?: string;
};

// Push-related globals removed

export default function BuyerSettingsModal({
  settingsModal,
  setSettingsModal,
  styles,
  colors,
  universitySearch,
  setUniversitySearch,
  filteredUniversities,
  selectedSchool,
  setSelectedSchool,
  saveSchool,
  confirmLogout,
  showLogoutConfirm,
  cancelLogout,
  proceedLogout,
  userProfile,
  session,
  setAvatarUrl,
  setProfile,
  avatarUrl,
}: BuyerSettingsModalProps) {
  const [avatarLoading, setAvatarLoading] = useState(false);
  const [avatarMenuVisible, setAvatarMenuVisible] = useState(false);
  const [showPersonal, setShowPersonal] = useState(true);
  const [showUniversity, setShowUniversity] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  // Notification preferences
  const [notificationPrefs, setNotificationPrefs] = useState<Record<string, boolean>>({
    email: false,
    push: false,
    announcements: false,
  });
  const [choosingKey, setChoosingKey] = useState<string | null>(null);
  // push notifications removed
  const [savingNotifications, setSavingNotifications] = useState(false);

  // Responsive button sizing for the top buttons row
  const { width } = useWindowDimensions();
  const TOP_BUTTON_COUNT = 4; // Personal, University, Notifications, Log Out
  const SIDE_MARGIN = 48; // approximate combined horizontal padding/margins
  const SPACING = 8 * (TOP_BUTTON_COUNT - 1);
  // Compute an approximate button width and use it to determine font/icon sizes,
  // but buttons will use flex:1 so they stay on one line.
  const approxButtonWidth = Math.max(60, Math.min(Math.floor((width - SIDE_MARGIN - SPACING) / TOP_BUTTON_COUNT), 220));
  const computedFontSize = Math.max(12, Math.min(16, Math.round(approxButtonWidth / 14)));
  const computedIconSize = Math.max(14, Math.min(20, Math.round(computedFontSize * 1.1)));
  // Right-side control width for notification rows, responsive to screen width
  const computedRightWidth = Math.max(90, Math.min(220, Math.floor(width * 0.36)));
  const personalActive = showPersonal;
  const universityActive = showUniversity;
  const notificationsActive = showNotifications;
  const logoutActive = showLogoutConfirm;

  // Username is editable, but email and avatarUrl are from props
  const [personalName, setPersonalName] = useState(userProfile?.username || '');
  const [usernameLoading, setUsernameLoading] = useState(false);

  // Update username field if userProfile changes (e.g. after profile update)
  React.useEffect(() => {
    setPersonalName(userProfile?.username || '');
  }, [userProfile?.username]);

  // push-related initialization removed

  // Username validation (copied from auth.tsx)
  const validateUsername = (username: string) => {
    const trimmed = username.trim();
    if (trimmed.length < 3) return { valid: false, message: 'Username must be at least 3 characters' };
    if (trimmed.length > 20) return { valid: false, message: 'Username must be less than 20 characters' };
    return { valid: true, message: '' };
  };

  // Save username logic with uniqueness check
  const saveUsername = async () => {
    if (!session?.user) {
      alert('Not logged in');
      return;
    }
    const validation = validateUsername(personalName);
    if (!validation.valid) {
      alert(validation.message);
      return;
    }
    try {
      setUsernameLoading(true);
      const { supabase } = await import('@/lib/supabase');
      // Check if username is already taken by another user
      const { data, error: checkError } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('username', personalName.trim())
        .neq('id', session.user.id)
        .maybeSingle();
      if (checkError) throw checkError;
      if (data) {
        alert('Username already taken. Reverting to previous username.');
        setPersonalName(userProfile?.username || '');
        return;
      }
      // Username is unique, update it
      const { error } = await supabase
        .from('user_profiles')
        .update({ username: personalName.trim() })
        .eq('id', session.user.id);
      if (error) throw error;
      if (setProfile) await setProfile((prev: any) => ({ ...prev, username: personalName.trim() }));
      alert('Username updated!');
    } catch (err: any) {
      alert('Update Failed: ' + (err.message || 'Try again'));
    } finally {
      setUsernameLoading(false);
    }
  };

  // Avatar upload logic with menu
  const pickAvatarFromLibrary = async () => {
    if (!session?.user) {
      alert('Not logged in');
      return;
    }
    try {
      setAvatarLoading(true);
      const ImagePicker = await import('expo-image-picker');
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (result.canceled || !result.assets?.[0]?.uri) return;
      await uploadAvatarToSupabase(result.assets[0].uri);
    } catch (err: any) {
      alert('Upload Failed: ' + (err.message || 'Try again'));
    } finally {
      setAvatarLoading(false);
    }
  };

  const pickAvatarFromCamera = async () => {
    if (!session?.user) {
      alert('Not logged in');
      return;
    }
    try {
      setAvatarLoading(true);
      const ImagePicker = await import('expo-image-picker');
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (result.canceled || !result.assets?.[0]?.uri) return;
      await uploadAvatarToSupabase(result.assets[0].uri);
    } catch (err: any) {
      alert('Upload Failed: ' + (err.message || 'Try again'));
    } finally {
      setAvatarLoading(false);
    }
  };

  const uploadAvatarToSupabase = async (uri: string) => {
    const fileExt = uri.split('.').pop()?.toLowerCase() || 'jpg';
    const mimeType = fileExt === 'png' ? 'image/png' : 'image/jpeg';
    const filePath = `${session.user.id}/avatar.${fileExt}`;
    const response = await fetch(uri);
    const blob = await response.blob();
    const { supabase } = await import('@/lib/supabase');
    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, blob, {
        upsert: true,
        contentType: mimeType,
      });
    if (uploadError) throw uploadError;
    const { error: dbError } = await supabase
      .from('user_profiles')
      .update({ avatar_url: filePath })
      .eq('id', session.user.id);
    if (dbError) throw dbError;
    if (setProfile) await setProfile((prev: any) => ({ ...prev, avatar_url: filePath }));
    if (setAvatarUrl) setAvatarUrl(filePath);
    alert('Profile picture updated!');
  };

  const removeAvatar = async () => {
    if (!session?.user) return;
    try {
      setAvatarLoading(true);
      const { supabase } = await import('@/lib/supabase');
      const { error } = await supabase
        .from('user_profiles')
        .update({ avatar_url: null })
        .eq('id', session.user.id);
      if (error) throw error;
      if (setProfile) await setProfile((prev: any) => ({ ...prev, avatar_url: null }));
      if (setAvatarUrl) setAvatarUrl('');
      alert('Profile photo removed!');
    } catch (err: any) {
      alert('Failed to remove photo: ' + (err.message || 'Try again'));
    } finally {
      setAvatarLoading(false);
    }
  };

  return (
    <Modal
      visible={settingsModal}
      transparent
      animationType="slide"
      onRequestClose={() => setSettingsModal(false)}
    >
      <View style={[styles.modalContainer, { backgroundColor: colors.overlay }]}>
        <View style={[styles.modalSheet, { backgroundColor: colors.modalBg }]}>
          <View style={styles.modalHeader}>
            <View style={styles.headerContent}>
              <MaterialCommunityIcons name="account" size={28} color={colors.primary} />
              <Text style={[styles.modalTitle, { color: colors.text }]}>Profile Settings</Text>
            </View>
            <TouchableOpacity
              style={[styles.closeButton, { backgroundColor: colors.border }]}
              onPress={() => setSettingsModal(false)}
            >
              <Ionicons name="close" size={22} color={colors.text} />
            </TouchableOpacity>
          </View>
          {/* Top buttons (fixed, not scrollable) */}
          <View style={{ flexDirection: 'row', alignItems: 'center', marginLeft: 24, marginRight: 24, marginTop: 8, marginBottom: 8 }}>
            <TouchableOpacity
              style={{ marginRight: 8, flex: 1, paddingVertical: 8, borderRadius: 8, backgroundColor: personalActive ? colors.success + '20' : colors.primary + '20', justifyContent: 'center', alignItems: 'center' }}
              onPress={() => {
                setShowPersonal(true);
                setShowUniversity(false);
                setShowNotifications(false);
              }}
            >
              <Text style={{ color: personalActive ? colors.success : colors.primary, fontWeight: '600', fontSize: computedFontSize }}>Personal</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={{ marginRight: 8, flex: 1, paddingVertical: 8, borderRadius: 8, backgroundColor: universityActive ? colors.success + '20' : colors.primary + '20', justifyContent: 'center', alignItems: 'center' }}
              onPress={() => {
                setShowUniversity(true);
                setShowPersonal(false);
                setShowNotifications(false);
              }}
            >
              <Text style={{ color: universityActive ? colors.success : colors.primary, fontWeight: '600', fontSize: computedFontSize }}>University</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={{ marginRight: 8, flex: 1, paddingVertical: 8, paddingHorizontal: 6, borderRadius: 8, backgroundColor: notificationsActive ? colors.success + '20' : colors.primary + '20', flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}
              onPress={() => {
                setShowNotifications(true);
                setShowPersonal(false);
                setShowUniversity(false);
              }}
            >
              <Ionicons name="notifications" size={computedIconSize} color={notificationsActive ? colors.success : colors.primary} style={{ marginRight: 6 }} />
              <Text
                numberOfLines={1}
                adjustsFontSizeToFit={true}
                minimumFontScale={0.7}
                style={{ color: notificationsActive ? colors.success : colors.primary, fontWeight: '600', fontSize: computedFontSize, flexShrink: 1, textAlign: 'center' }}
              >
                Notifications
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={{ flexDirection: 'row', alignItems: 'center', flex: 1, paddingVertical: 8, borderRadius: 8, backgroundColor: logoutActive ? colors.success + '20' : colors.error + '20', justifyContent: 'center' }}
              onPress={confirmLogout}
            >
              <Ionicons name="log-out-outline" size={computedIconSize} color={logoutActive ? colors.success : colors.error} style={{ marginRight: 6 }} />
              <Text style={{ color: logoutActive ? colors.success : colors.error, fontWeight: '600', fontSize: computedFontSize }}>Log Out</Text>
            </TouchableOpacity>
          </View>

          {/* Make the modal body scrollable so content fits on small screens */}
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 140 }} keyboardShouldPersistTaps="handled">

          {/* Personal Info Section */}
          {showPersonal && (
            <PersonalSection
              styles={styles}
              colors={colors}
              userProfile={userProfile}
              avatarLoading={avatarLoading}
              avatarMenuVisible={avatarMenuVisible}
              setAvatarMenuVisible={setAvatarMenuVisible}
              pickAvatarFromCamera={pickAvatarFromCamera}
              pickAvatarFromLibrary={pickAvatarFromLibrary}
              removeAvatar={removeAvatar}
              personalName={personalName}
              setPersonalName={setPersonalName}
              usernameLoading={usernameLoading}
              saveUsername={saveUsername}
              setProfile={setProfile}
              setAvatarUrl={setAvatarUrl}
            />
          )}

          {/* University Section (only show when University button is pressed) */}
          {showUniversity && (
            <UniversitySection
              styles={styles}
              colors={colors}
              universitySearch={universitySearch}
              setUniversitySearch={setUniversitySearch}
              filteredUniversities={filteredUniversities}
              selectedSchool={selectedSchool}
              setSelectedSchool={setSelectedSchool}
              saveSchool={saveSchool}
            />
          )}

            {/* Notifications Section (push removed) */}
            {showNotifications && (
              <NotificationSection
                colors={colors}
                notificationPrefs={notificationPrefs}
                choosingKey={choosingKey}
                setChoosingKey={setChoosingKey}
                setNotificationPrefs={setNotificationPrefs}
                computedFontSize={computedFontSize}
                savingNotifications={savingNotifications}
                setSavingNotifications={setSavingNotifications}
                session={session}
              />
            )}

            {/* ...existing code... */}
          </ScrollView>

          {showUniversity && (
            <SafeAreaView style={{ position: 'absolute', left: 12, right: 12, bottom: 12, zIndex: 50 }}>
              <View
                style={{
                  backgroundColor: colors.card,
                  borderRadius: 16,
                  padding: 10,
                  borderWidth: 1,
                  borderColor: colors.border,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 8 },
                  shadowOpacity: 0.08,
                  shadowRadius: 16,
                  elevation: 8,
                }}
              >
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <TouchableOpacity
                    activeOpacity={0.9}
                    onPress={() => setSettingsModal(false)}
                    style={{
                      flex: 1,
                      paddingVertical: Math.max(10, Math.round(computedFontSize / 1.1)),
                      backgroundColor: colors.border,
                      borderRadius: 12,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Text style={{ color: colors.text, fontWeight: '700', fontSize: computedFontSize }}>Cancel</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    activeOpacity={0.9}
                    onPress={saveSchool}
                    disabled={!selectedSchool}
                    style={{
                      flex: 1,
                      paddingVertical: Math.max(10, Math.round(computedFontSize / 1.1)),
                      backgroundColor: selectedSchool ? colors.primary : colors.textSecondary,
                      borderRadius: 12,
                      alignItems: 'center',
                      justifyContent: 'center',
                      opacity: selectedSchool ? 1 : 0.8,
                    }}
                  >
                    <Text style={{ color: 'white', fontWeight: '700', fontSize: computedFontSize }}>Save University</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </SafeAreaView>
          )}

          {showLogoutConfirm && (
            <View style={styles.confirmOverlay}>
              <View style={[styles.confirmCard, { backgroundColor: colors.modalBg }]}>
                <Text style={[styles.confirmTitle, { color: colors.text }]}>Logout</Text>
                <Text style={[styles.confirmMessage, { color: colors.textSecondary }]}>Are you sure you want to logout?</Text>
                <View style={styles.confirmButtons}>
                  <TouchableOpacity style={[styles.confirmBtn, styles.cancelBtn]} onPress={cancelLogout}>
                    <Text style={[styles.confirmBtnText, { color: colors.text }]}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.confirmBtn, styles.destructiveBtn, { backgroundColor: colors.error }]}
                    onPress={proceedLogout}
                  >
                    <Text style={styles.confirmBtnText}>Logout</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}
