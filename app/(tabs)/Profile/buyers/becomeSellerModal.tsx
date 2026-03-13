
import React from 'react';
import { ActivityIndicator, Modal, ScrollView, Text, TextInput, TouchableOpacity, View, Alert } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';

export const becomeSeller = async (
  fullName: string,
  shopName: string,
  phoneNumber: string,
  campusLocation: string,
  selectedSchool: string,
  shopNameAvailability: 'checking' | 'available' | 'taken' | null,
  setPhoneError: (msg: string) => void,
  setShopNameAvailability: (v: 'checking' | 'available' | 'taken' | null) => void,
  checkShopNameAvailability: (name: string) => Promise<void>,
  setSubmittingSeller: (v: boolean) => void,
  setSellerFormModal: (v: boolean) => void,
  setProgressModal: (v: boolean) => void,
  setCountdown: (v: number) => void,
  session: any,
  setProfile: (v: any) => void,
  setShopData: (v: any) => void,
  countdownTimerRef: any,
  setSuccessModalVisible: (v: boolean) => void
) => {
  // Validate all fields
  if (!fullName.trim()) {
    Alert.alert('Error', 'Please enter your full name', [{ text: 'OK' }]);
    return;
  }
  if (!shopName.trim()) {
    Alert.alert('Error', 'Please enter a shop name', [{ text: 'OK' }]);
    return;
  }
  if (!phoneNumber.trim()) {
    Alert.alert('Error', 'Please enter your phone number', [{ text: 'OK' }]);
    return;
  }
  if (!campusLocation.trim()) {
    Alert.alert('Error', 'Please enter campus location', [{ text: 'OK' }]);
    return;
  }
  if (!selectedSchool) {
    Alert.alert('Error', 'Please select your university', [{ text: 'OK' }]);
    return;
  }
  // Validate phone number length
  if (phoneNumber.length !== 9) {
    setPhoneError('Phone number must be exactly 9 digits');
    Alert.alert('Invalid Phone Number', 'Phone number must be exactly 9 digits (without leading zero).', [{ text: 'OK' }]);
    return;
  }
  // Check if shop name is taken before proceeding
  if (shopNameAvailability === 'taken') {
    Alert.alert('Shop Name Taken', 'This shop name is already taken at your university location. Please choose a different name.', [{ text: 'OK' }]);
    return;
  }
  // If availability hasn't been checked yet, check it now
  if (shopNameAvailability === null) {
    setShopNameAvailability('checking');
    await checkShopNameAvailability(shopName);
    // Wait a moment and check again
    await new Promise(resolve => setTimeout(resolve, 300));
    if (shopNameAvailability === 'taken') {
      Alert.alert('Shop Name Taken', 'This shop name is already taken at your university location. Please choose a different name.', [{ text: 'OK' }]);
      return;
    }
  }
  setSubmittingSeller(true);
  setSellerFormModal(false);
  setProgressModal(true);
  setCountdown(10);
  try {
    const userId = session!.user.id;
    const cleanPhone = phoneNumber.replace(/\D/g, '').trim();
    const normalized = cleanPhone.length === 10 && cleanPhone.startsWith('0') ? cleanPhone.slice(1) : cleanPhone;
    const fullPhone = normalized.startsWith('233') ? `+${normalized}` : `+233${normalized}`;
    const fullLocation = `${selectedSchool} – ${campusLocation.trim()}`;
    const { data: newShopData, error: shopError } = await supabase
      .from('shops')
      .insert({
        owner_id: userId,
        name: shopName.trim(),
        phone: fullPhone,
        location: fullLocation,
        description: `Shop by ${fullName.trim()} at ${selectedSchool}`,
        is_open: true
      })
      .select()
      .single();
    if (shopError) {
      if (shopError.code === '23505') {
        // This is the unique constraint violation
        Alert.alert('Shop Name Already Exists', 'A shop with this name already exists at your university location. Please choose a different name.', [{ text: 'OK' }]);
        setProgressModal(false);
        setSellerFormModal(true);
        setSubmittingSeller(false);
        return;
      } else {
        throw shopError;
      }
    }
    const { error: profileError } = await supabase
      .from('user_profiles')
      .update({
        full_name: fullName.trim(),
        is_seller: true,
        university: selectedSchool,
      })
      .eq('id', userId);
    if (profileError) throw profileError;
    // Update local profile state to reflect seller status
    setProfile((prev: any) => ({
      ...prev,
      is_seller: true,
      full_name: fullName.trim(),
      university: selectedSchool
    }));
    // Set shop data immediately for the seller section
    setShopData(newShopData);
    // Clear any existing timer
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
    }
    // Start countdown timer
    countdownTimerRef.current = setInterval(() => {
      setCountdown((prev: number) => {
        if (prev <= 1) {
          // Clear timer and close progress modal first
          if (countdownTimerRef.current) {
            clearInterval(countdownTimerRef.current);
            countdownTimerRef.current = null;
          }
          setProgressModal(false);
          // Use a short delay to ensure modal is fully closed, then show success modal
          setTimeout(() => {
            setSuccessModalVisible(true);
          }, 100);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => {
      if (countdownTimerRef.current) {
        clearInterval(countdownTimerRef.current);
      }
    };
  } catch (err: any) {
    console.error('Become seller error:', err);
    // Clean up timer on error
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
    setProgressModal(false);
    // Use setTimeout to ensure modal is closed before showing error alert
    setTimeout(() => {
      Alert.alert('Error', err.message || 'Failed to create shop. Please try again.', [{ 
        text: 'OK' 
      }]);
    }, 300);
  } finally {
    setSubmittingSeller(false);
  }
};


type BuyerBecomeSellerModalProps = {
  sellerFormModal: boolean;
  setSellerFormModal: (value: boolean) => void;
  styles: any;
  colors: any;
  fullName: string;
  setFullName: (value: string) => void;
  shopName: string;
  handleShopNameChange: (value: string) => void;
  shopNameAvailability: 'checking' | 'available' | 'taken' | null;
  selectedSchool: string;
  phoneError: string;
  phoneNumber: string;
  handlePhoneNumberChange: (value: string) => void;
  campusLocation: string;
  setCampusLocation: (value: string) => void;
  submittingSeller: boolean;
  becomeSeller: () => void;
};

export default function BuyerBecomeSellerModal({
  sellerFormModal,
  setSellerFormModal,
  styles,
  colors,
  fullName,
  setFullName,
  shopName,
  handleShopNameChange,
  shopNameAvailability,
  selectedSchool,
  phoneError,
  phoneNumber,
  handlePhoneNumberChange,
  campusLocation,
  setCampusLocation,
  submittingSeller,
  becomeSeller,
}: BuyerBecomeSellerModalProps) {
  return (
    <Modal
      visible={sellerFormModal}
      transparent
      animationType="slide"
      onRequestClose={() => setSellerFormModal(false)}
    >
      <View style={[styles.modalContainer, { backgroundColor: colors.overlay }]}>
        <View style={[styles.modalSheet, { backgroundColor: colors.modalBg }]}>
          <View style={styles.modalHeader}>
            <View style={styles.headerContent}>
              <MaterialCommunityIcons name="store-plus" size={28} color={colors.primary} />
              <Text style={[styles.modalTitle, { color: colors.text }]}>Become a Seller</Text>
            </View>
            <TouchableOpacity
              style={[styles.closeButton, { backgroundColor: colors.border }]}
              onPress={() => setSellerFormModal(false)}
            >
              <Ionicons name="close" size={22} color={colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} style={styles.scrollContainer}>
            <View style={styles.formSection}>
              <Text style={[styles.formLabel, { color: colors.text }]}>Full Name *</Text>
              <TextInput
                style={[styles.formInput, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]}
                placeholder="Enter your full name"
                placeholderTextColor={colors.textSecondary}
                value={fullName}
                onChangeText={setFullName}
                autoCapitalize="words"
              />
            </View>

            <View style={styles.formSection}>
              <Text style={[styles.formLabel, { color: colors.text }]}>Shop Name *</Text>
              <View>
                <TextInput
                  style={[
                    styles.formInput,
                    {
                      backgroundColor: colors.inputBg,
                      color: colors.text,
                      borderColor: colors.border,
                      borderBottomLeftRadius: shopNameAvailability ? 0 : 12,
                      borderBottomRightRadius: shopNameAvailability ? 0 : 12,
                    },
                  ]}
                  placeholder="Enter your shop name"
                  placeholderTextColor={colors.textSecondary}
                  value={shopName}
                  onChangeText={handleShopNameChange}
                  autoCapitalize="words"
                />
                {shopNameAvailability && (
                  <View
                    style={[
                      styles.availabilityIndicator,
                      {
                        backgroundColor:
                          shopNameAvailability === 'available'
                            ? colors.success + '20'
                            : shopNameAvailability === 'taken'
                              ? colors.error + '20'
                              : colors.warning + '20',
                        borderColor:
                          shopNameAvailability === 'available'
                            ? colors.success
                            : shopNameAvailability === 'taken'
                              ? colors.error
                              : colors.warning,
                        borderTopWidth: 0,
                      },
                    ]}
                  >
                    <View style={styles.availabilityContent}>
                      {shopNameAvailability === 'checking' && (
                        <>
                          <ActivityIndicator size="small" color={colors.warning} style={styles.availabilityIcon} />
                          <Text style={[styles.availabilityText, { color: colors.warning }]}>Checking availability...</Text>
                        </>
                      )}
                      {shopNameAvailability === 'available' && (
                        <>
                          <Ionicons name="checkmark-circle" size={18} color={colors.success} style={styles.availabilityIcon} />
                          <Text style={[styles.availabilityText, { color: colors.success }]}>
                            Shop name is available at {selectedSchool}
                          </Text>
                        </>
                      )}
                      {shopNameAvailability === 'taken' && (
                        <>
                          <Ionicons name="close-circle" size={18} color={colors.error} style={styles.availabilityIcon} />
                          <Text style={[styles.availabilityText, { color: colors.error }]}>Shop name already taken at this university</Text>
                        </>
                      )}
                    </View>
                  </View>
                )}
                <Text style={[styles.availabilityNote, { color: colors.textSecondary }]}>Enter a unique shop name for your campus</Text>
              </View>
            </View>

            <View style={styles.formSection}>
              <Text style={[styles.formLabel, { color: colors.text }]}>Phone Number *</Text>
              <View>
                <View
                  style={[
                    styles.phoneContainer,
                    {
                      backgroundColor: colors.inputBg,
                      borderColor: phoneError ? colors.error : colors.border,
                      marginBottom: phoneError ? 4 : 0,
                    },
                  ]}
                >
                  <View style={[styles.countryCode, { backgroundColor: colors.primary }]}>
                    <Text style={styles.countryCodeText}>+233</Text>
                  </View>
                  <TextInput
                    style={[styles.phoneInput, { color: colors.text }]}
                    placeholder="241234567"
                    placeholderTextColor={colors.textSecondary}
                    keyboardType="phone-pad"
                    value={phoneNumber}
                    onChangeText={handlePhoneNumberChange}
                    maxLength={9}
                  />
                </View>
                {phoneError ? (
                  <View style={styles.phoneErrorContainer}>
                    <Ionicons name="alert-circle" size={16} color={colors.error} style={styles.phoneErrorIcon} />
                    <Text style={[styles.phoneErrorText, { color: colors.error }]}>{phoneError}</Text>
                  </View>
                ) : null}
                <Text style={[styles.phoneNote, { color: colors.textSecondary }]}>Enter 9 digits without leading zero (e.g., 241234567)</Text>
              </View>
            </View>

            <View style={styles.formSection}>
              <Text style={[styles.formLabel, { color: colors.text }]}>University *</Text>
              <View style={[styles.selectedUniversityBadge, { backgroundColor: colors.primary + '15', borderColor: colors.primary }]}>
                <Ionicons name="school" size={20} color={colors.primary} />
                <Text style={[styles.selectedUniversityText, { color: colors.primary }]}>{selectedSchool}</Text>
              </View>
            </View>

            <View style={styles.formSection}>
              <Text style={[styles.formLabel, { color: colors.text }]}>Location of shop on campus *</Text>
              <TextInput
                style={[styles.formInput, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]}
                placeholder="e.g., Near Night Market, Hall C"
                placeholderTextColor={colors.textSecondary}
                value={campusLocation}
                onChangeText={setCampusLocation}
              />
            </View>
          </ScrollView>

          <View style={styles.modalActions}>
            <TouchableOpacity
              style={[styles.actionButton, styles.secondaryAction, { backgroundColor: colors.border }]}
              onPress={() => setSellerFormModal(false)}
            >
              <Text style={[styles.actionButtonText, { color: colors.text }]}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.actionButton,
                styles.primaryAction,
                {
                  backgroundColor: colors.primary,
                  opacity: submittingSeller || shopNameAvailability === 'taken' || phoneError ? 0.6 : 1,
                },
              ]}
              onPress={becomeSeller}
              disabled={submittingSeller || shopNameAvailability === 'taken' || !!phoneError}
            >
              {submittingSeller ? (
                <ActivityIndicator color="white" size="small" />
              ) : (
                <>
                  <MaterialCommunityIcons name="store-plus" size={20} color="white" />
                  <Text style={[styles.actionButtonText, { color: 'white', marginLeft: 8 }]}>Create Shop</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
