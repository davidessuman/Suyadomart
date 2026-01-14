// app/(tabs)/Profile/index.tsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  Modal,
  FlatList,
  TextInput,
  ScrollView,
  ImageBackground,
  useColorScheme,
  StatusBar,
  Dimensions,
} from 'react-native';
import { Ionicons, Feather, MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'expo-router';
import type { Session } from '@supabase/supabase-js';
import { useFocusEffect } from '@react-navigation/native';
import { useSelectedCampus } from '@/app/hooks/useSelectedCampus';

const { width, height } = Dimensions.get('window');

const GHANA_UNIVERSITIES = [
  'University of Ghana', 'Kwame Nkrumah University of Science and Technology', 'University of Cape Coast',
  'University of Education, Winneba', 'University for Development Studies', 'University of Energy and Natural Resources',
  'University of Mines and Technology', 'University of Health and Allied Sciences', 'Ghana Institute of Management and Public Administration',
  'University of Professional Studies, Accra',
  'Accra Technical University', 'Kumasi Technical University', 'Takoradi Technical University', 'Ho Technical University',
  'Cape Coast Technical University', 'Bolgatanga Technical University', 'Koforidua Technical University', 'Tamale Technical University',
  'Sunyani Technical University', 'Regent University College of Science and Technology', 'Ashesi University', 'Central University',
  'Valley View University', 'Pentecost University', 'Methodist University College Ghana', 'Presbyterian University College, Ghana',
  'Catholic University College of Ghana', 'Christian Service University College', 'Wisconsin International University College, Ghana',
  'Lancaster University Ghana', 'Academic City University College', 'Radford University College'
].sort();

const ACRONYM_STOPWORDS = new Set(['of', 'for', 'and', 'the', 'in', 'at', 'on']);

const toSearchKey = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

const toAcronym = (name: string) => {
  const words = toSearchKey(name)
    .split(' ')
    .filter(Boolean)
    .filter((w) => !ACRONYM_STOPWORDS.has(w));
  return words.map((w) => w[0]).join('');
};

const matchesUniversity = (universityName: string, rawQuery: string) => {
  const q = toSearchKey(rawQuery);
  if (!q) return true;

  const nameKey = toSearchKey(universityName);
  if (nameKey.includes(q)) return true;

  const qCompact = q.replace(/\s+/g, '');
  const acronym = toAcronym(universityName);
  if (acronym.startsWith(qCompact)) return true;

  return nameKey.split(' ').some((w) => w.startsWith(q));
};

const SELLER_BACKGROUND_URL = 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?ixlib=rb-4.0.3&auto=format&fit=crop&w=1350&q=80';

export default function ProfileScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme() || 'light';
  const isDarkMode = colorScheme === 'dark';

  const { campus: selectedCampus, save: saveCampus } = useSelectedCampus();
  
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [avatarUrl, setAvatarUrl] = useState<string>('');
  const [avatarLoading, setAvatarLoading] = useState(false);
  const [settingsModal, setSettingsModal] = useState(false);
  const [sellerFormModal, setSellerFormModal] = useState(false);
  const [progressModal, setProgressModal] = useState(false);
  const [countdown, setCountdown] = useState(10);
  const [fullName, setFullName] = useState('');
  const [shopName, setShopName] = useState('');
  const [campusLocation, setCampusLocation] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [selectedSchool, setSelectedSchool] = useState('');
  const [universitySearch, setUniversitySearch] = useState('');
  const [submittingSeller, setSubmittingSeller] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showSellerSection, setShowSellerSection] = useState(false);
  const [successModalVisible, setSuccessModalVisible] = useState(false);

  // Campus picker (for guests and optionally authenticated users)
  const [campusPickerVisible, setCampusPickerVisible] = useState(false);
  const [campusPickerSearch, setCampusPickerSearch] = useState('');
  const [campusPickerSelected, setCampusPickerSelected] = useState<string>('');
  const [campusPickerSaving, setCampusPickerSaving] = useState(false);

  // Shop name availability states
  const [shopNameAvailability, setShopNameAvailability] = useState<'checking' | 'available' | 'taken' | null>(null);
  const [shopNameDebounce, setShopNameDebounce] = useState<NodeJS.Timeout | null>(null);

  // Phone number validation states
  const [phoneError, setPhoneError] = useState<string>('');

  // Shop data for seller section
  const [shopData, setShopData] = useState<any>(null);

  // Track modal and alert state to prevent conflicts
  const isAlertShowingRef = useRef(false);
  const countdownTimerRef = useRef<NodeJS.Timeout | null>(null);

  const colors = {
    primary: '#FF9900',
    primaryLight: '#ffb74d',
    primaryDark: '#f57c00',
    background: isDarkMode ? '#0f172a' : '#f8fafc',
    card: isDarkMode ? '#1e293b' : '#ffffff',
    text: isDarkMode ? '#0418f5' : '#0418f5',
    textSecondary: isDarkMode ? '#94a3b8' : '#64748b',
    border: isDarkMode ? '#334155' : '#e2e8f0',
    inputBg: isDarkMode ? '#1e293b' : '#ffffff',
    error: isDarkMode ? '#fca5a5' : '#ef4444',
    success: isDarkMode ? '#86efac' : '#10b981',
    warning: isDarkMode ? '#fcd34d' : '#f59e0b',
    overlay: isDarkMode ? 'rgba(15, 23, 42, 0.95)' : 'rgba(0, 0, 0, 0.85)',
    modalBg: isDarkMode ? '#1e293b' : '#ffffff',
  };

  const filteredUniversities = useMemo(() => {
    if (!universitySearch) return GHANA_UNIVERSITIES;
    return GHANA_UNIVERSITIES.filter((uni) => matchesUniversity(uni, universitySearch));
  }, [universitySearch]);

  const filteredCampuses = useMemo(() => {
    if (!campusPickerSearch.trim()) return GHANA_UNIVERSITIES;
    return GHANA_UNIVERSITIES.filter((uni) => matchesUniversity(uni, campusPickerSearch));
  }, [campusPickerSearch]);

  const openCampusPicker = useCallback(() => {
    setCampusPickerSearch('');
    setCampusPickerSelected(selectedCampus || '');
    setCampusPickerVisible(true);
  }, [selectedCampus]);

  const confirmCampusPicker = useCallback(async () => {
    if (!campusPickerSelected || campusPickerSaving) return;
    setCampusPickerSaving(true);
    try {
      await saveCampus(campusPickerSelected);
      setCampusPickerVisible(false);
      // Reset tabs so Home/Search/Events remount with new campus.
      router.replace('/(tabs)');
    } finally {
      setCampusPickerSaving(false);
    }
  }, [campusPickerSelected, campusPickerSaving, router, saveCampus]);

  const getFallbackAvatar = () => {
    const email = session?.user?.email || 'user';
    const firstLetter = email[0]?.toUpperCase() || 'U';
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(firstLetter)}&background=${encodeURIComponent(colors.primary.replace('#', ''))}&color=fff&size=300&bold=true&rounded=true`;
  };

  const refreshAvatarUrl = async () => {
    if (!profile?.avatar_url) {
      setAvatarUrl(getFallbackAvatar());
      return;
    }

    try {
      const { data } = await supabase.storage
        .from('avatars')
        .createSignedUrl(profile.avatar_url, 3600);

      if (data?.signedUrl) {
        setAvatarUrl(`${data.signedUrl}&t=${Date.now()}`);
      } else {
        setAvatarUrl(getFallbackAvatar());
      }
    } catch (error) {
      setAvatarUrl(getFallbackAvatar());
    }
  };

  const loadUserData = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('full_name, username, avatar_url, university, is_seller')
        .eq('id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Load profile error:', error);
      }

      setProfile(data || null);
      if (data?.university) setSelectedSchool(data.university);
      if (data?.full_name) setFullName(data.full_name);
      
      // If user is already a seller, automatically show seller section and load shop data
      if (data?.is_seller === true) {
        setShowSellerSection(true);
        // Load shop data for seller section
        await loadShopData(userId);
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  // Load shop data for seller section
  const loadShopData = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('shops')
        .select('name, location, description, phone, is_open')
        .eq('owner_id', userId)
        .single();

      if (error) {
        console.error('Load shop data error:', error);
        return;
      }

      setShopData(data);
    } catch (error) {
      console.error('Error loading shop data:', error);
    }
  };

  useEffect(() => {
    refreshAvatarUrl();
  }, [profile?.avatar_url]);

  useEffect(() => {
    (async () => {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Needed', 'Please allow photo access to upload avatar');
      }
    })();

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user?.id) loadUserData(session.user.id);
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session?.user?.id) {
        loadUserData(session.user.id);
      } else {
        // Reset state when user logs out
        setProfile(null);
        setShopData(null);
        setShowSellerSection(false);
        setAvatarUrl('');
      }
    });

    return () => {
      listener?.subscription?.unsubscribe();
      // Clean up timer on unmount
      if (countdownTimerRef.current) {
        clearInterval(countdownTimerRef.current);
      }
      if (shopNameDebounce) {
        clearTimeout(shopNameDebounce);
      }
    };
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (!loading && !session?.user) {
        Alert.alert(
          'Sign up required',
          'Please sign up or log in to view your profile, manage your details, and become a seller.',
          [
            { text: 'Not now', style: 'cancel' },
            { text: 'Login / Sign up', onPress: () => router.push('/auth') },
          ],
        );
      }
    }, [loading, router, session?.user])
  );

  // Function to check shop name availability
  const checkShopNameAvailability = async (name: string) => {
    if (!name.trim() || !selectedSchool) {
      setShopNameAvailability(null);
      return;
    }

    setShopNameAvailability('checking');

    try {
      // Get the location format that matches the constraint
      const location = `${selectedSchool} – ${campusLocation.trim()}`;
      
      const { data, error } = await supabase
        .from('shops')
        .select('name, location')
        .eq('name', name.trim())
        .eq('location', location)
        .maybeSingle();

      if (error) {
        console.error('Error checking shop name:', error);
        setShopNameAvailability(null);
        return;
      }

      // If data exists, name is taken at this location
      if (data) {
        setShopNameAvailability('taken');
      } else {
        setShopNameAvailability('available');
      }
    } catch (error) {
      console.error('Error checking shop name:', error);
      setShopNameAvailability(null);
    }
  };

  // Handle shop name input with debounce
  const handleShopNameChange = (text: string) => {
    setShopName(text);
    
    // Clear previous debounce timer
    if (shopNameDebounce) {
      clearTimeout(shopNameDebounce);
    }

    // Set new debounce timer
    if (text.trim().length >= 2 && selectedSchool) {
      setShopNameDebounce(
        setTimeout(() => {
          checkShopNameAvailability(text);
        }, 500)
      );
    } else {
      setShopNameAvailability(null);
    }
  };

  // Handle phone number input with validation
  const handlePhoneNumberChange = (text: string) => {
    // Remove all non-digit characters
    const cleaned = text.replace(/\D/g, '');
    
    // Check if starts with zero
    if (cleaned.startsWith('0')) {
      setPhoneError('Phone number should not start with zero');
      // Remove the leading zero
      const withoutZero = cleaned.substring(1);
      setPhoneNumber(withoutZero);
      return;
    }
    
    // Check if exceeds 9 digits
    if (cleaned.length > 9) {
      setPhoneError('Phone number should be 9 digits');
      setPhoneNumber(cleaned.substring(0, 9));
      return;
    }
    
    // Clear error if validation passes
    if (phoneError) {
      setPhoneError('');
    }
    
    setPhoneNumber(cleaned);
  };

  const uploadAvatar = async () => {
    if (!session?.user) {
      Alert.alert('Error', 'Not logged in');
      return;
    }

    try {
      setAvatarLoading(true);

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (result.canceled || !result.assets?.[0]?.uri) {
        setAvatarLoading(false);
        return;
      }

      const uri = result.assets[0].uri;
      const fileExt = uri.split('.').pop()?.toLowerCase() || 'jpg';
      const mimeType = fileExt === 'png' ? 'image/png' : 'image/jpeg';
      const filePath = `${session.user.id}/avatar.jpg`;

      const response = await fetch(uri);
      const blob = await response.blob();

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

      await loadUserData(session.user.id);
      Alert.alert('Success', 'Profile picture updated!', [{ text: 'OK' }]);

    } catch (err: any) {
      Alert.alert('Upload Failed', err.message || 'Try again', [{ text: 'OK' }]);
    } finally {
      setAvatarLoading(false);
    }
  };

  const saveSchool = async () => {
    if (!selectedSchool) {
      Alert.alert('Error', 'Please select a university', [{ text: 'OK' }]);
      return;
    }

    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({ university: selectedSchool })
        .eq('id', session?.user?.id);

      if (error) {
        Alert.alert('Failed', error.message, [{ text: 'OK' }]);
      } else {
        setProfile({ ...profile, university: selectedSchool });
        setSettingsModal(false);
        Alert.alert('Success', 'University updated!', [{ text: 'OK' }]);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to update university', [{ text: 'OK' }]);
    }
  };

  const logoutUser = async () => {
    try {
      await supabase.auth.signOut();
      router.replace('/auth');
    } catch (error) {
      Alert.alert('Error', 'Failed to logout. Please try again.', [{ text: 'OK' }]);
    }
  };

  const confirmLogout = () => {
    setShowLogoutConfirm(true);
  };

  const cancelLogout = () => {
    setShowLogoutConfirm(false);
  };

  const proceedLogout = () => {
    setShowLogoutConfirm(false);
    setSettingsModal(false);
    logoutUser();
  };

  const becomeSeller = async () => {
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
        setCountdown((prev) => {
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

  const handleSuccessModalOK = () => {
    setSuccessModalVisible(false);
    // Set seller section to show immediately when OK is pressed
    setShowSellerSection(true);
  };

  // Reset shop name availability when modal opens/closes
  useEffect(() => {
    if (!sellerFormModal) {
      setShopNameAvailability(null);
      setPhoneError('');
      if (shopNameDebounce) {
        clearTimeout(shopNameDebounce);
        setShopNameDebounce(null);
      }
    }
  }, [sellerFormModal]);

  // Re-check availability when school or campus location changes
  useEffect(() => {
    if (shopName.trim() && selectedSchool && campusLocation.trim()) {
      checkShopNameAvailability(shopName);
    }
  }, [selectedSchool, campusLocation]);

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
        <ActivityIndicator size="large" color={colors.primary} style={{ flex: 1 }} />
      </SafeAreaView>
    );
  }

  if (!session?.user) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
        <View style={styles.guestContainer}>
          <View style={[styles.guestCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Ionicons name="person-circle-outline" size={64} color={colors.primary} />
            <Text style={[styles.guestTitle, { color: colors.text }]}>Welcome</Text>
            <Text style={[styles.guestSubtitle, { color: colors.textSecondary }]}>Sign up or log in to view your profile, orders, cart, and seller tools.</Text>
            <TouchableOpacity
              style={[styles.guestPrimaryButton, { backgroundColor: colors.primary }]}
              onPress={() => router.push('/auth')}
            >
              <Text style={styles.guestPrimaryButtonText}>Login / Sign up</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.guestSecondaryButton, { borderColor: colors.border }]}
              onPress={openCampusPicker}
            >
              <Text style={[styles.guestSecondaryButtonText, { color: colors.text }]}>Change campus</Text>
            </TouchableOpacity>
          </View>
        </View>

        <Modal
          visible={campusPickerVisible}
          animationType="slide"
          transparent
          onRequestClose={() => setCampusPickerVisible(false)}
        >
          <View style={[styles.modalContainer, { backgroundColor: colors.overlay }]}>
            <View style={[styles.modalSheet, { backgroundColor: colors.modalBg }]}>
              <View style={styles.modalHeader}>
                <View style={styles.headerContent}>
                  <MaterialCommunityIcons name="university" size={28} color={colors.primary} />
                  <Text style={[styles.modalTitle, { color: colors.text }]}>Choose your campus</Text>
                </View>
                <TouchableOpacity
                  style={[styles.closeButton, { backgroundColor: colors.border }]}
                  onPress={() => setCampusPickerVisible(false)}
                >
                  <Ionicons name="close" size={22} color={colors.text} />
                </TouchableOpacity>
              </View>

              <View style={[styles.searchContainer, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
                <Ionicons name="search" size={20} color={colors.textSecondary} style={styles.searchIcon} />
                <TextInput
                  style={[styles.searchInput, { color: colors.text }]}
                  placeholder="Search universities..."
                  placeholderTextColor={colors.textSecondary}
                  value={campusPickerSearch}
                  onChangeText={setCampusPickerSearch}
                  autoCapitalize="none"
                  returnKeyType="search"
                />
                {campusPickerSearch ? (
                  <TouchableOpacity onPress={() => setCampusPickerSearch('')}>
                    <Ionicons name="close-circle" size={20} color={colors.textSecondary} />
                  </TouchableOpacity>
                ) : null}
              </View>

              <View style={styles.universityListContainer}>
                <FlatList
                  data={filteredCampuses}
                  keyExtractor={(item) => item}
                  showsVerticalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                  contentContainerStyle={styles.universityListContent}
                  renderItem={({ item }) => {
                    const isSelected = campusPickerSelected === item;
                    return (
                      <TouchableOpacity
                        style={[
                          styles.universityCard,
                          {
                            backgroundColor: isSelected ? colors.primary + '10' : colors.card,
                            borderColor: isSelected ? colors.primary : colors.border,
                          },
                        ]}
                        onPress={() => setCampusPickerSelected(item)}
                      >
                        <View style={styles.universityCardContent}>
                          <View style={[styles.universityIcon, { backgroundColor: colors.primary + '15' }]}>
                            <Ionicons name="school" size={22} color={colors.primary} />
                          </View>
                          <View style={styles.universityInfo}>
                            <Text style={[styles.universityName, { color: colors.text }]} numberOfLines={2}>
                              {item}
                            </Text>
                            {isSelected ? (
                              <Text style={[styles.selectedLabel, { color: colors.primary }]}>Selected</Text>
                            ) : null}
                          </View>
                        </View>
                        <View style={[styles.selectedCheck, { backgroundColor: isSelected ? colors.primary : colors.border }]}>
                          <Ionicons name={isSelected ? 'checkmark' : 'ellipse-outline'} size={16} color={isSelected ? 'white' : colors.textSecondary} />
                        </View>
                      </TouchableOpacity>
                    );
                  }}
                />
              </View>

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.actionButton, styles.secondaryAction, { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.border }]}
                  onPress={() => setCampusPickerVisible(false)}
                  disabled={campusPickerSaving}
                >
                  <Text style={[styles.actionButtonText, { color: colors.text }]}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.actionButton,
                    styles.primaryAction,
                    { backgroundColor: !campusPickerSelected || campusPickerSaving ? `${colors.primary}66` : colors.primary },
                  ]}
                  onPress={confirmCampusPicker}
                  disabled={!campusPickerSelected || campusPickerSaving}
                >
                  <Text style={[styles.actionButtonText, { color: 'white' }]}>
                    {campusPickerSaving ? 'Saving…' : 'Continue'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    );
  }

  const isSeller = profile?.is_seller === true;
  const displaySellerSection = isSeller && showSellerSection;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      <ScrollView showsVerticalScrollIndicator={false}>
        {!displaySellerSection ? (
          <View style={styles.userContainer}>
            <View style={[styles.header, { borderBottomColor: colors.border }]}>
              <Text style={[styles.headerTitle, { color: colors.text }]}>Profile</Text>
              <TouchableOpacity 
                style={[styles.settingsButton, { backgroundColor: isDarkMode ? '#334155' : '#e2e8f0' }]}
                onPress={() => setSettingsModal(true)}
              >
                <Ionicons name="settings-outline" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <View style={[styles.profileCard, { backgroundColor: colors.card }]}>
              <View style={styles.avatarContainer}>
                <View style={[styles.avatarWrapper, { borderColor: colors.primary }]}>
                  <Image
                    source={{ uri: avatarUrl }}
                    style={styles.avatar}
                    defaultSource={{ uri: getFallbackAvatar() }}
                    resizeMode="cover"
                  />
                  {avatarLoading ? (
                    <View style={[styles.cameraOverlay, { backgroundColor: 'rgba(0,0,0,0.6)' }]}>
                      <ActivityIndicator color="white" size="small" />
                    </View>
                  ) : (
                    <TouchableOpacity style={styles.cameraOverlay} onPress={uploadAvatar}>
                      <Ionicons name="camera" size={20} color="white" />
                    </TouchableOpacity>
                  )}
                </View>

                <View style={[styles.verifiedBadge, { backgroundColor: colors.success }]}>
                  <MaterialIcons name="verified" size={16} color="white" />
                </View>
              </View>

              <View style={styles.userInfo}>
                <Text style={[styles.username, { color: colors.text }]}>
                  @{profile?.username || 'username'}
                </Text>
                <Text style={[styles.email, { color: colors.textSecondary }]}>
                  {session?.user?.email}
                </Text>
                
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
                        { text: 'Select University', onPress: () => setSettingsModal(true) }
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
          </View>
        ) : (
          <ImageBackground
            source={{ uri: SELLER_BACKGROUND_URL }}
            style={styles.sellerBackground}
            resizeMode="cover"
          >
            <View style={[styles.sellerOverlay, { backgroundColor: 'rgba(0,0,0,0.7)' }]} />
            <View style={styles.sellerContent}>
              <View style={styles.sellerHeader}>
                <View style={[styles.sellerBadge, { backgroundColor: colors.primary }]}>
                  <MaterialCommunityIcons name="store-check" size={24} color="white" />
                </View>
                <Text style={[styles.sellerTitle, { color: 'green' }]}>Storefront Live</Text>
              </View>
              
              <Text style={[styles.sellerWelcome, { color: 'white' }]}>WELCOME 🥳🥳</Text>
              <Text style={[styles.sellerName, { color: colors.primary }]}>
                {profile?.full_name || 'seller'}
              </Text>
              
              <View style={styles.sellerInfo}>
                <View style={styles.infoCard}>
                  <MaterialCommunityIcons name="store" size={20} color={colors.text} />
                  <Text style={[styles.infoText, { color: colors.text }]}>{shopData?.name || 'Shop Name'}</Text>
                </View>
                <View style={styles.infoCard}>
                  <Ionicons name="school" size={20} color={colors.text} />
                  <Text style={[styles.infoText, { color: colors.text }]}>{profile?.university}</Text>
                </View>
              </View>
              
              <TouchableOpacity
                style={[styles.dashboardButton, { backgroundColor: colors.primary }]}
                onPress={() => router.navigate('/(tabs)/Profile/seller')}
              >
                <MaterialCommunityIcons name="view-dashboard" size={24} color="white" />
                <Text style={styles.dashboardButtonText}>Open Seller Dashboard</Text>
              </TouchableOpacity>
            </View>
          </ImageBackground>
        )}
      </ScrollView>

      {/* Settings Modal */}
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
                <MaterialCommunityIcons name="university" size={28} color={colors.primary} />
                <Text style={[styles.modalTitle, { color: colors.text }]}>Profile Settings</Text>
              </View>
              <TouchableOpacity 
                style={[styles.closeButton, { backgroundColor: colors.border }]}
                onPress={() => setSettingsModal(false)}
              >
                <Ionicons name="close" size={22} color={colors.text} />
              </TouchableOpacity>
            </View>

            <View style={[styles.searchContainer, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
              <Ionicons name="search" size={20} color={colors.textSecondary} style={styles.searchIcon} />
              <TextInput
                style={[styles.searchInput, { color: colors.text }]}
                placeholder="Search universities..."
                placeholderTextColor={colors.textSecondary}
                value={universitySearch}
                onChangeText={setUniversitySearch}
                autoCapitalize="none"
                returnKeyType="search"
              />
              {universitySearch ? (
                <TouchableOpacity onPress={() => setUniversitySearch('')}>
                  <Ionicons name="close-circle" size={20} color={colors.textSecondary} />
                </TouchableOpacity>
              ) : null}
            </View>

            <View style={styles.universityListContainer}>
              <FlatList
                data={filteredUniversities}
                keyExtractor={(item) => item}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.universityListContent}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[
                      styles.universityCard,
                      { 
                        backgroundColor: selectedSchool === item ? colors.primary + '10' : colors.card,
                        borderColor: selectedSchool === item ? colors.primary : colors.border
                      }
                    ]}
                    onPress={() => setSelectedSchool(item)}
                  >
                    <View style={styles.universityCardContent}>
                      <View style={[styles.universityIcon, { backgroundColor: colors.primary + '15' }]}>
                        <Ionicons 
                          name="school" 
                          size={20} 
                          color={selectedSchool === item ? colors.primary : colors.textSecondary} 
                        />
                      </View>
                      <View style={styles.universityInfo}>
                        <Text style={[
                          styles.universityName,
                          { 
                            color: selectedSchool === item ? colors.primary : colors.text,
                            fontWeight: selectedSchool === item ? '600' : '400'
                          }
                        ]}>
                          {item}
                        </Text>
                        {selectedSchool === item && (
                          <Text style={[styles.selectedLabel, { color: colors.success }]}>
                            Currently Selected
                          </Text>
                        )}
                      </View>
                      {selectedSchool === item && (
                        <View style={[styles.selectedCheck, { backgroundColor: colors.success }]}>
                          <Ionicons name="checkmark" size={18} color="white" />
                        </View>
                      )}
                    </View>
                  </TouchableOpacity>
                )}
                ListEmptyComponent={
                  <View style={styles.emptyState}>
                    <Ionicons name="search-outline" size={48} color={colors.textSecondary} />
                    <Text style={[styles.emptyStateText, { color: colors.textSecondary }]}>
                      No universities found
                    </Text>
                    <Text style={[styles.emptyStateSubtext, { color: colors.textSecondary }]}>
                      Try a different search term
                    </Text>
                  </View>
                }
              />
            </View>

            {selectedSchool && (
              <View style={[styles.selectedPreview, { backgroundColor: colors.primary + '10', borderColor: colors.primary }]}>
                <View style={styles.selectedPreviewContent}>
                  <Ionicons name="checkmark-circle" size={24} color={colors.success} />
                  <View style={styles.selectedPreviewInfo}>
                    <Text style={[styles.selectedPreviewLabel, { color: colors.textSecondary }]}>
                      Selected University
                    </Text>
                    <Text style={[styles.selectedPreviewValue, { color: colors.text }]}>
                      {selectedSchool}
                    </Text>
                  </View>
                  <TouchableOpacity onPress={() => setSelectedSchool('')}>
                    <Ionicons name="close-circle" size={24} color={colors.textSecondary} />
                  </TouchableOpacity>
                </View>
              </View>
            )}

            <View style={styles.modalActions}>
              <TouchableOpacity 
                style={[styles.actionButton, styles.secondaryAction, { backgroundColor: colors.border }]}
                onPress={() => setSettingsModal(false)}
              >
                <Text style={[styles.actionButtonText, { color: colors.text }]}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[
                  styles.actionButton, 
                  styles.primaryAction, 
                  { 
                    backgroundColor: selectedSchool ? colors.primary : colors.textSecondary,
                    opacity: selectedSchool ? 1 : 0.6
                  }
                ]}
                onPress={saveSchool}
                disabled={!selectedSchool}
              >
                <Text style={[styles.actionButtonText, { color: 'white' }]}>
                  Save University
                </Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity 
              style={[styles.logoutButton, { backgroundColor: colors.error + '20' }]}
              onPress={confirmLogout}
            >
              <Ionicons name="log-out-outline" size={22} color={colors.error} />
              <Text style={[styles.logoutButtonText, { color: colors.error }]}>Log Out</Text>
            </TouchableOpacity>

            {showLogoutConfirm && (
              <View style={styles.confirmOverlay}>
                <View style={[styles.confirmCard, { backgroundColor: colors.modalBg }]}>
                  <Text style={[styles.confirmTitle, { color: colors.text }]}>Logout</Text>
                  <Text style={[styles.confirmMessage, { color: colors.textSecondary }]}>
                    Are you sure you want to logout?
                  </Text>
                  <View style={styles.confirmButtons}>
                    <TouchableOpacity 
                      style={[styles.confirmBtn, styles.cancelBtn]}
                      onPress={cancelLogout}
                    >
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

      {/* Become Seller Modal */}
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
                        borderBottomRightRadius: shopNameAvailability ? 0 : 12
                      }
                    ]}
                    placeholder="Enter your shop name"
                    placeholderTextColor={colors.textSecondary}
                    value={shopName}
                    onChangeText={handleShopNameChange}
                    autoCapitalize="words"
                  />
                  {shopNameAvailability && (
                    <View style={[
                      styles.availabilityIndicator,
                      {
                        backgroundColor: shopNameAvailability === 'available' ? colors.success + '20' :
                                       shopNameAvailability === 'taken' ? colors.error + '20' :
                                       colors.warning + '20',
                        borderColor: shopNameAvailability === 'available' ? colors.success :
                                   shopNameAvailability === 'taken' ? colors.error :
                                   colors.warning,
                        borderTopWidth: 0
                      }
                    ]}>
                      <View style={styles.availabilityContent}>
                        {shopNameAvailability === 'checking' && (
                          <>
                            <ActivityIndicator size="small" color={colors.warning} style={styles.availabilityIcon} />
                            <Text style={[styles.availabilityText, { color: colors.warning }]}>
                              Checking availability...
                            </Text>
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
                            <Text style={[styles.availabilityText, { color: colors.error }]}>
                              Shop name already taken at this university
                            </Text>
                          </>
                        )}
                      </View>
                    </View>
                  )}
                  <Text style={[styles.availabilityNote, { color: colors.textSecondary }]}>
                    Enter a unique shop name for your campus
                  </Text>
                </View>
              </View>
              
              <View style={styles.formSection}>
                <Text style={[styles.formLabel, { color: colors.text }]}>Phone Number *</Text>
                <View>
                  <View style={[
                    styles.phoneContainer, 
                    { 
                      backgroundColor: colors.inputBg, 
                      borderColor: phoneError ? colors.error : colors.border,
                      marginBottom: phoneError ? 4 : 0
                    }
                  ]}>
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
                      <Text style={[styles.phoneErrorText, { color: colors.error }]}>
                        {phoneError}
                      </Text>
                    </View>
                  ) : null}
                  <Text style={[styles.phoneNote, { color: colors.textSecondary }]}>
                    Enter 9 digits without leading zero (e.g., 241234567)
                  </Text>
                </View>
              </View>
              
              <View style={styles.formSection}>
                <Text style={[styles.formLabel, { color: colors.text }]}>University *</Text>
                <View style={[styles.selectedUniversityBadge, { backgroundColor: colors.primary + '15', borderColor: colors.primary }]}>
                  <Ionicons name="school" size={20} color={colors.primary} />
                  <Text style={[styles.selectedUniversityText, { color: colors.primary }]}>
                    {selectedSchool}
                  </Text>
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
                    opacity: (submittingSeller || shopNameAvailability === 'taken' || phoneError) ? 0.6 : 1 
                  }
                ]}
                onPress={becomeSeller}
                disabled={submittingSeller || shopNameAvailability === 'taken' || !!phoneError}
              >
                {submittingSeller ? (
                  <ActivityIndicator color="white" size="small" />
                ) : (
                  <>
                    <MaterialCommunityIcons name="store-plus" size={20} color="white" />
                    <Text style={[styles.actionButtonText, { color: 'white', marginLeft: 8 }]}>
                      Create Shop
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Progress Modal */}
      <Modal
        visible={progressModal}
        transparent
        animationType="fade"
        onRequestClose={() => {}}
      >
        <View style={styles.progressContainer}>
          <View style={[styles.progressCard, { backgroundColor: colors.modalBg }]}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.progressText, { color: colors.text }]}>
              Shop creation in progress
            </Text>
            <Text style={[styles.countdownText, { color: colors.primary }]}>
              {countdown}
            </Text>
          </View>
        </View>
      </Modal>

      {/* Success Modal */}
      <Modal
        visible={successModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setSuccessModalVisible(false)}
      >
        <View style={[styles.modalContainer, { backgroundColor: colors.overlay }]}>
          <View style={[styles.successCard, { backgroundColor: colors.modalBg }]}>
            <View style={[styles.successIconContainer, { backgroundColor: colors.success + '20' }]}>
              <Ionicons name="checkmark-circle" size={60} color={colors.success} />
            </View>
            
            <Text style={[styles.successTitle, { color: colors.text }]}>
              Success!
            </Text>
            
            <Text style={[styles.successMessage, { color: colors.textSecondary }]}>
              Your shop has been created successfully.
            </Text>
            
            <Text style={[styles.successSubMessage, { color: colors.textSecondary }]}>
              You can now start adding products and managing your shop.
            </Text>
            
            <TouchableOpacity
              style={[styles.successButton, { backgroundColor: colors.primary }]}
              onPress={handleSuccessModalOK}
            >
              <Text style={styles.successButtonText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  userContainer: { flex: 1, paddingHorizontal: 20, paddingTop: 10 },
  guestContainer: { flex: 1, paddingHorizontal: 20, justifyContent: 'center' },
  guestCard: { borderRadius: 24, padding: 24, borderWidth: 1, alignItems: 'center' },
  guestTitle: { fontSize: 28, fontWeight: '800', marginTop: 12, marginBottom: 6 },
  guestSubtitle: { fontSize: 14, lineHeight: 20, textAlign: 'center', marginBottom: 20 },
  guestPrimaryButton: { width: '100%', paddingVertical: 14, borderRadius: 14, alignItems: 'center', marginBottom: 12 },
  guestPrimaryButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  guestSecondaryButton: { width: '100%', paddingVertical: 14, borderRadius: 14, alignItems: 'center', borderWidth: 1 },
  guestSecondaryButtonText: { fontSize: 16, fontWeight: '700' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 16, borderBottomWidth: 1, marginBottom: 20 },
  headerTitle: { fontSize: 32, fontWeight: '800', letterSpacing: -0.5 },
  settingsButton: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center' },
  profileCard: { borderRadius: 24, padding: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.1, shadowRadius: 20, elevation: 10, marginBottom: 20 },
  avatarContainer: { alignItems: 'center', marginBottom: 24 },
  avatarWrapper: { width: 120, height: 120, borderRadius: 60, borderWidth: 4, position: 'relative', overflow: 'hidden' },
  avatar: { width: '100%', height: '100%', borderRadius: 60 },
  cameraOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 36, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center' },
  verifiedBadge: { position: 'absolute', top: 8, right: width * 0.35, width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: 'white' },
  userInfo: { width: '100%' },
  username: { fontSize: 24, fontWeight: '700', marginBottom: 4, textAlign: 'center' },
  email: { fontSize: 16, marginBottom: 20, textAlign: 'center' },
  divider: { height: 1, width: '100%', marginVertical: 16 },
  detailRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, paddingVertical: 8 },
  detailLabel: { fontSize: 14, marginLeft: 12, marginRight: 8, width: 90 },
  detailValue: { fontSize: 16, fontWeight: '500', flex: 1 },
  buyerBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
  buyerText: { fontSize: 12, fontWeight: '700', letterSpacing: 0.5 },
  sellerButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, borderRadius: 16, marginTop: 24 },
  sellerButtonText: { color: 'white', fontSize: 16, fontWeight: '600', marginLeft: 8 },
  sellerBackground: { width: '100%', height: height * 0.85, justifyContent: 'center' },
  sellerOverlay: { ...StyleSheet.absoluteFillObject },
  sellerContent: { alignItems: 'center', paddingHorizontal: 24, zIndex: 10 },
  sellerHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 24 },
  sellerBadge: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  sellerTitle: { fontSize: 28, fontWeight: '700' },
  sellerWelcome: { fontSize: 20, marginBottom: 8 },
  sellerName: { fontSize: 36, fontWeight: '800', marginBottom: 32, textAlign: 'center' },
  sellerInfo: { width: '100%', marginBottom: 32 },
  infoCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.1)', padding: 16, borderRadius: 12, marginBottom: 12 },
  infoText: { fontSize: 16, marginLeft: 12, fontWeight: '500' },
  dashboardButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, paddingVertical: 16, borderRadius: 16 },
  dashboardButtonText: { color: 'white', fontSize: 16, fontWeight: '600', marginLeft: 8 },
  modalContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.7)' },
  modalSheet: { width: '90%', maxHeight: height * 0.9, backgroundColor: '#ffffff', borderTopLeftRadius: 30, borderTopRightRadius: 30, position: 'absolute', bottom: 0 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingTop: 24, paddingBottom: 20, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.05)' },
  headerContent: { flexDirection: 'row', alignItems: 'center' },
  modalTitle: { fontSize: 22, fontWeight: '700', marginLeft: 12 },
  closeButton: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  searchContainer: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 24, marginTop: 16, marginBottom: 20, paddingHorizontal: 16, paddingVertical: 14, borderRadius: 16, borderWidth: 1 },
  searchIcon: { marginRight: 12 },
  searchInput: { flex: 1, fontSize: 16 },
  universityListContainer: { flex: 1, marginHorizontal: 24, marginBottom: 20 },
  universityListContent: { paddingBottom: 10 },
  universityCard: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 16, marginBottom: 12, borderWidth: 1 },
  universityCardContent: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  universityIcon: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  universityInfo: { flex: 1 },
  universityName: { fontSize: 16, marginBottom: 4 },
  selectedLabel: { fontSize: 12, fontWeight: '500' },
  selectedCheck: { width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginLeft: 12 },
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyStateText: { fontSize: 18, fontWeight: '600', marginTop: 16, marginBottom: 8 },
  emptyStateSubtext: { fontSize: 14 },
  selectedPreview: { marginHorizontal: 24, marginBottom: 20, padding: 16, borderRadius: 16, borderWidth: 1 },
  selectedPreviewContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  selectedPreviewInfo: { flex: 1, marginHorizontal: 12 },
  selectedPreviewLabel: { fontSize: 12, marginBottom: 4 },
  selectedPreviewValue: { fontSize: 16, fontWeight: '600' },
  modalActions: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 24, marginBottom: 16 },
  actionButton: { flex: 1, paddingVertical: 16, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  primaryAction: { marginLeft: 8 },
  secondaryAction: { marginRight: 8 },
  actionButtonText: { fontSize: 16, fontWeight: '600' },
  logoutButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginHorizontal: 24, paddingVertical: 16, borderRadius: 16, marginTop: 8 },
  logoutButtonText: { fontSize: 16, fontWeight: '600', marginLeft: 8 },
  scrollContainer: { paddingHorizontal: 24, maxHeight: height * 0.6 },
  formSection: { marginBottom: 20 },
  formLabel: { fontSize: 16, fontWeight: '600', marginBottom: 8 },
  formInput: { borderWidth: 1, paddingHorizontal: 16, paddingVertical: 14, borderRadius: 12, fontSize: 16 },
  phoneContainer: { flexDirection: 'row', borderWidth: 1, borderRadius: 12, overflow: 'hidden' },
  countryCode: { paddingHorizontal: 16, paddingVertical: 14, justifyContent: 'center', alignItems: 'center' },
  countryCodeText: { color: 'white', fontWeight: '600', fontSize: 16 },
  phoneInput: { flex: 1, paddingHorizontal: 16, paddingVertical: 14, fontSize: 16 },
  selectedUniversityBadge: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 12, borderWidth: 1 },
  selectedUniversityText: { fontSize: 16, fontWeight: '600', marginLeft: 8 },
  confirmOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' },
  confirmCard: { width: width * 0.8, padding: 24, borderRadius: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.25, shadowRadius: 20, elevation: 20 },
  confirmTitle: { fontSize: 20, fontWeight: '700', textAlign: 'center', marginBottom: 8 },
  confirmMessage: { fontSize: 16, textAlign: 'center', marginBottom: 24 },
  confirmButtons: { flexDirection: 'row', justifyContent: 'space-between' },
  confirmBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  cancelBtn: { backgroundColor: '#e2e8f0', marginRight: 12 },
  destructiveBtn: { marginLeft: 12 },
  confirmBtnText: { fontSize: 16, fontWeight: '600', color: 'white' },
  progressContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  progressCard: {
    padding: 40,
    borderRadius: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 20,
  },
  progressText: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 20,
    marginBottom: 10,
  },
  countdownText: {
    fontSize: 48,
    fontWeight: 'bold',
  },
  successCard: {
    width: width * 0.85,
    padding: 30,
    borderRadius: 25,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 20,
  },
  successIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  successTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  successMessage: {
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 8,
  },
  successSubMessage: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 30,
  },
  successButton: {
    width: '100%',
    paddingVertical: 16,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  successButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  // New styles for shop name availability checker
  availabilityIndicator: {
    borderWidth: 1,
    borderTopWidth: 0,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
  },
  availabilityContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  availabilityIcon: {
    marginRight: 8,
  },
  availabilityText: {
    fontSize: 14,
    fontWeight: '500',
  },
  availabilityNote: {
    fontSize: 12,
    marginTop: 6,
    marginLeft: 4,
  },
  // New styles for phone validation
  phoneErrorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    marginLeft: 4,
  },
  phoneErrorIcon: {
    marginRight: 6,
  },
  phoneErrorText: {
    fontSize: 13,
    fontWeight: '500',
  },
  phoneNote: {
    fontSize: 12,
    marginTop: 6,
    marginLeft: 4,
  },
});