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
  Platform,
} from 'react-native';
import { Ionicons, Feather, MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'expo-router';
import type { Session } from '@supabase/supabase-js';
import { useFocusEffect } from '@react-navigation/native';
import { useSelectedCampus } from '@/hooks/useSelectedCampus';
import BuyerSettingsModal from './Settings/settingsModal';
import BuyerBecomeSellerModal, { becomeSeller as becomeSellerFn } from './becomeSellerModal';
import BuyerProfileCard from './profileCard';
import DisplaySellerSection from './displaySellerSection';

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

const UNIVERSITY_ABBREVIATIONS: Record<string, string> = {
  UG: 'University of Ghana',
  KNUST: 'Kwame Nkrumah University of Science and Technology',
  UCC: 'University of Cape Coast',
  UEW: 'University of Education, Winneba',
  UDS: 'University for Development Studies',
  UENR: 'University of Energy and Natural Resources',
  UMAT: 'University of Mines and Technology',
  UHAS: 'University of Health and Allied Sciences',
  GIMPA: 'Ghana Institute of Management and Public Administration',
  UPSA: 'University of Professional Studies, Accra',
  ATU: 'Accra Technical University',
  KTU: 'Kumasi Technical University',
  TTU: 'Takoradi Technical University',
  HTU: 'Ho Technical University',
  CCTU: 'Cape Coast Technical University',
  BTU: 'Bolgatanga Technical University',
  KoforiduaTU: 'Koforidua Technical University',
  TamaleTU: 'Tamale Technical University',
  STU: 'Sunyani Technical University',
  REGENT: 'Regent University College of Science and Technology',
  ASHESI: 'Ashesi University',
  CENTRAL: 'Central University',
  VVU: 'Valley View University',
  PENTECOST: 'Pentecost University',
  METHODIST: 'Methodist University College Ghana',
  PRESBY: 'Presbyterian University College, Ghana',
  CATHOLIC: 'Catholic University College of Ghana',
  CSUC: 'Christian Service University College',
  WISCONSIN: 'Wisconsin International University College, Ghana',
  LANCASTER: 'Lancaster University Ghana',
  ACADEMIC: 'Academic City University College',
  RADFORD: 'Radford University College',
};

const ACRONYM_STOPWORDS = new Set(['of', 'for', 'and', 'the', 'in', 'at', 'on']);

const toSearchKey = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const normalizeAbbreviationToken = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, '');

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
  const normalizedQuery = normalizeAbbreviationToken(rawQuery);

  const nameKey = toSearchKey(universityName);
  if (nameKey.includes(q)) return true;

  const abbreviationMatch = Object.entries(UNIVERSITY_ABBREVIATIONS).find(
    ([abbr, name]) =>
      name === universityName && normalizeAbbreviationToken(abbr) === normalizedQuery
  );
  if (abbreviationMatch) return true;

  const qCompact = q.replace(/\s+/g, '');
  const acronym = toAcronym(universityName);
  if (acronym.startsWith(qCompact)) return true;

  const normalizedAcronym = normalizeAbbreviationToken(acronym);
  if (normalizedAcronym.includes(normalizedQuery)) return true;

  return nameKey.split(' ').some((w) => w.startsWith(q));
};

const SELLER_BACKGROUND_URL = 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?ixlib=rb-4.0.3&auto=format&fit=crop&w=1350&q=80';

export default function ProfileScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme() || 'light';
  const isDarkMode = colorScheme === 'dark';

  const [session, setSession] = useState<Session | null>(null);
  // Pass session to useSelectedCampus for sync
  const { campus: selectedCampus, save: saveCampus, loading } = useSelectedCampus(session);
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
    text: isDarkMode ? '#ffffff' : '#010917',
    textSecondary: isDarkMode ? '#94a3b8' : '#010811',
    border: isDarkMode ? '#334155' : '#116ade',
    inputBg: isDarkMode ? '#1e293b' : '#ffffff',
    error: isDarkMode ? '#790404' : '#ef4444',
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
      // Load list of followed sellers (owner ids) so profile components can display counts
      try {
        const { data: follows, error: followsError } = await supabase
          .from('shop_follows')
          .select('shop_owner_id')
          .eq('follower_id', userId);

        if (!followsError && follows) {
          const ownerIds = (follows || []).map((r: any) => r.shop_owner_id).filter(Boolean);
          setProfile((prev: any) => ({ ...(prev || {}), followed_sellers: ownerIds }));
        } else {
          setProfile((prev: any) => ({ ...(prev || {}), followed_sellers: [] }));
        }
      } catch (err) {
        setProfile((prev: any) => ({ ...(prev || {}), followed_sellers: [] }));
      }
      if (data?.university) setSelectedSchool(data.university);
      if (data?.full_name) setFullName(data.full_name);

      // If user is already a seller, automatically show seller section and load shop data
      if (data?.is_seller) {
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
      const timeout = setTimeout(() => {
        checkShopNameAvailability(text);
      }, 500);
      setShopNameDebounce(timeout as unknown as NodeJS.Timeout);
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
      await saveCampus(selectedSchool);
      setProfile({ ...profile, university: selectedSchool });
      setSettingsModal(false);
      // Refresh the entire web app on web; on native, navigate to the Profile tab
      try {
        if (Platform.OS === 'web' && typeof window !== 'undefined') {
          // full page reload to ensure all state/stores reset
          window.location.reload();
        } else {
          router.replace('/(tabs)/Profile/buyers');
        }
      } catch (e) {
        // ignore navigation errors — user still sees updated profile
      }
      Alert.alert('Success', 'University updated!', [{ text: 'OK' }]);
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

  // ...becomeSeller moved to becomeSellerModal.tsx

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
                  <MaterialCommunityIcons name="school" size={28} color={colors.primary} />
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

  const isSeller = !!profile?.is_seller;
  const displaySellerSection = isSeller && showSellerSection;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      <View style={styles.userContainer}>
        {!displaySellerSection ? (
          <>
            <View style={[styles.header, { borderBottomColor: colors.border }]}>
              <Text style={[styles.headerTitle, { color: colors.text }]}>Profile</Text>
              <TouchableOpacity 
                style={[styles.settingsButton, { backgroundColor: isDarkMode ? '#334155' : '#e2e8f0' }]}
                onPress={() => setSettingsModal(true)}
              >
                <Ionicons name="settings-outline" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <BuyerProfileCard
                styles={styles}
                colors={colors}
                isDarkMode={isDarkMode}
                avatarUrl={avatarUrl}
                getFallbackAvatar={getFallbackAvatar}
                avatarLoading={avatarLoading}
                uploadAvatar={uploadAvatar}
                profile={profile}
                session={session}
                selectedSchool={selectedSchool}
                setSettingsModal={setSettingsModal}
                setSellerFormModal={setSellerFormModal}
              />
            </ScrollView>
          </>
        ) : (
          <DisplaySellerSection
            styles={styles}
            colors={colors}
            profile={profile}
            shopData={shopData}
            SELLER_BACKGROUND_URL={SELLER_BACKGROUND_URL}
            router={router}
          />
        )}
      </View>

      {/* Settings Modal */}
      <BuyerSettingsModal
        settingsModal={settingsModal}
        setSettingsModal={setSettingsModal}
        styles={styles}
        colors={colors}
        universitySearch={universitySearch}
        setUniversitySearch={setUniversitySearch}
        filteredUniversities={filteredUniversities}
        selectedSchool={selectedSchool}
        setSelectedSchool={setSelectedSchool}
        saveSchool={saveSchool}
        confirmLogout={confirmLogout}
        showLogoutConfirm={showLogoutConfirm}
        cancelLogout={cancelLogout}
        proceedLogout={proceedLogout}
        userProfile={{
          username: profile?.username || '',
          email: session?.user?.email || '',
          avatarUrl: avatarUrl,
        }}
        session={session}
        setAvatarUrl={setAvatarUrl}
        setProfile={setProfile}
        avatarUrl={avatarUrl}
      />

      {/* Become Seller Modal */}
      <BuyerBecomeSellerModal
        sellerFormModal={sellerFormModal}
        setSellerFormModal={setSellerFormModal}
        styles={styles}
        colors={colors}
        fullName={fullName}
        setFullName={setFullName}
        shopName={shopName}
        handleShopNameChange={handleShopNameChange}
        shopNameAvailability={shopNameAvailability}
        selectedSchool={selectedSchool}
        phoneError={phoneError}
        phoneNumber={phoneNumber}
        handlePhoneNumberChange={handlePhoneNumberChange}
        campusLocation={campusLocation}
         // becomeSeller prop now passed as wrapper above
        submittingSeller={submittingSeller}
        becomeSeller={() => becomeSellerFn(
          fullName,
          shopName,
          phoneNumber,
          campusLocation,
          selectedSchool,
          shopNameAvailability,
          setPhoneError,
          setShopNameAvailability,
          checkShopNameAvailability,
          setSubmittingSeller,
          setSellerFormModal,
          setProgressModal,
          setCountdown,
          session,
          setProfile,
          setShopData,
          countdownTimerRef,
          setSuccessModalVisible
        )}
      />

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
  sellerBackground: { width: '100%', height: height, justifyContent: 'center' },
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