import React from 'react';
import { View, Text, TextInput, TouchableOpacity, Image, ActivityIndicator, Modal, SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function PersonalSection(props: any) {
  const {
    colors,
    userProfile,
    avatarLoading,
    avatarMenuVisible,
    setAvatarMenuVisible,
    pickAvatarFromCamera,
    pickAvatarFromLibrary,
    removeAvatar,
    personalName,
    setPersonalName,
    usernameLoading,
    saveUsername,
  } = props;
  const isUsernameEmpty = !personalName || personalName.trim().length === 0;
  return (
    <View style={{ marginHorizontal: 24, marginBottom: 16, backgroundColor: colors.card, borderRadius: 12, padding: 16, borderWidth: 1, borderColor: colors.border }}>
      <Text style={{ color: colors.text, fontWeight: '700', fontSize: 18, marginBottom: 12 }}>Edit Personal Information</Text>
      <View style={{ alignItems: 'center', marginBottom: 16 }}>
        <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: colors.border, justifyContent: 'center', alignItems: 'center', overflow: 'hidden', position: 'relative' }}>
          {userProfile?.avatarUrl ? (
            <Image
              source={{ uri: userProfile.avatarUrl }}
              style={{ width: 80, height: 80, borderRadius: 40 }}
              resizeMode="cover"
            />
          ) : (
            <Ionicons name="person-circle" size={76} color={colors.textSecondary} />
          )}
          <TouchableOpacity
            style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 32, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' }}
            onPress={() => setAvatarMenuVisible(true)}
            disabled={avatarLoading}
          >
            {avatarLoading ? (
              <ActivityIndicator color="white" size="small" />
            ) : (
              <Ionicons name="camera" size={20} color="white" />
            )}
          </TouchableOpacity>

          <Modal
            visible={avatarMenuVisible}
            animationType="fade"
            transparent={true}
            onRequestClose={() => setAvatarMenuVisible(false)}
          >
            <SafeAreaView style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.35)' }}>
              <View
                style={{
                  width: '100%',
                  maxWidth: 400,
                  marginHorizontal: 16,
                  backgroundColor: colors.card,
                  borderRadius: 20,
                  paddingVertical: 28,
                  paddingHorizontal: 24,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 8 },
                  shadowOpacity: 0.18,
                  shadowRadius: 24,
                  elevation: 12,
                  alignItems: 'stretch',
                }}
              >
                <Text style={{ color: colors.text, fontWeight: '700', fontSize: 22, marginBottom: 24, textAlign: 'center', letterSpacing: 0.2 }}>Profile Photo</Text>
                <TouchableOpacity
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, borderRadius: 12, paddingHorizontal: 8, marginBottom: 4, backgroundColor: colors.inputBg }}
                  onPress={async () => { setAvatarMenuVisible(false); await pickAvatarFromCamera(); }}
                  disabled={avatarLoading}
                  activeOpacity={0.85}
                >
                  <Ionicons name="camera" size={22} color={colors.primary} />
                  <Text style={{ color: colors.text, fontSize: 17, fontWeight: '500' }}>Take Photo</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, borderRadius: 12, paddingHorizontal: 8, marginBottom: 4, backgroundColor: colors.inputBg }}
                  onPress={async () => { setAvatarMenuVisible(false); await pickAvatarFromLibrary(); }}
                  disabled={avatarLoading}
                  activeOpacity={0.85}
                >
                  <Ionicons name="image" size={22} color={colors.primary} />
                  <Text style={{ color: colors.text, fontSize: 17, fontWeight: '500' }}>Choose from Library</Text>
                </TouchableOpacity>
                {userProfile?.avatarUrl && (
                  <TouchableOpacity
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, borderRadius: 12, paddingHorizontal: 8, marginBottom: 4, backgroundColor: colors.error + '10' }}
                    onPress={async () => { setAvatarMenuVisible(false); await removeAvatar(); }}
                    disabled={avatarLoading}
                    activeOpacity={0.85}
                  >
                    <Ionicons name="trash" size={22} color={colors.error} />
                    <Text style={{ color: colors.error, fontSize: 17, fontWeight: '500' }}>Remove Photo</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={{ alignItems: 'center', paddingVertical: 14, borderRadius: 12, marginTop: 8, backgroundColor: colors.inputBg }}
                  onPress={() => setAvatarMenuVisible(false)}
                  activeOpacity={0.85}
                >
                  <Text style={{ color: colors.textSecondary, fontSize: 17, fontWeight: '500' }}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </SafeAreaView>
          </Modal>
        </View>
      </View>
      <Text style={{ color: colors.textSecondary, fontWeight: '500', fontSize: 14, marginBottom: 4 }}>Username</Text>
      <TextInput
        style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: 10, color: colors.text, marginBottom: 12, backgroundColor: colors.inputBg }}
        value={personalName}
        onChangeText={setPersonalName}
        placeholder="Enter your username"
        placeholderTextColor={colors.textSecondary}
      />
      {isUsernameEmpty && (
        <Text style={{ color: colors.error, fontSize: 13, marginBottom: 8 }}>Username cannot be empty</Text>
      )}
      <Text style={{ color: colors.textSecondary, fontWeight: '500', fontSize: 14, marginBottom: 4 }}>Email</Text>
      <TextInput
        style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: 10, color: colors.text, marginBottom: 12, backgroundColor: colors.inputBg, opacity: 0.6 }}
        value={userProfile?.email || ''}
        editable={false}
        selectTextOnFocus={false}
        placeholder="Enter your email"
        placeholderTextColor={colors.textSecondary}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      <TouchableOpacity
        style={{ backgroundColor: colors.primary, borderRadius: 8, paddingVertical: 12, alignItems: 'center', opacity: usernameLoading || isUsernameEmpty ? 0.6 : 1 }}
        onPress={saveUsername}
        disabled={usernameLoading || isUsernameEmpty}
      >
        {usernameLoading ? (
          <ActivityIndicator color="white" size="small" />
        ) : (
          <Text style={{ color: 'white', fontWeight: '700', fontSize: 16 }}>Save Changes</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}
