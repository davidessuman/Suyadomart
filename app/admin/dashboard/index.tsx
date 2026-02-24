import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet, Alert, TouchableOpacity, FlatList, RefreshControl, ScrollView, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import AdminProfile from '../Profiles/AdminProfile';
import UserDetailsModal from './users/UserDetailsModal';

const TAB_ACTIVE_COLOR = '#2563EB';

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

const getUniversityAcronym = (name: string) =>
  name
    .split(/\s+/)
    .filter((word) => /[A-Za-z]/.test(word[0]) && !ACRONYM_STOPWORDS.has(word.toLowerCase()))
    .map((word) => word[0].toUpperCase())
    .join('');

const normalizeAbbreviationToken = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, '');

const DASHBOARD_TABS = [
  {
    label: 'Overview',
    icon: 'grid-outline',
    activeIcon: 'grid',
  },
  {
    label: 'Users',
    icon: 'people-outline',
    activeIcon: 'people',
  },
  {
    label: 'Products',
    icon: 'cube-outline',
    activeIcon: 'cube',
  },
  {
    label: 'Events',
    icon: 'calendar-outline',
    activeIcon: 'calendar',
  },
] as const;
type DashboardTab = (typeof DASHBOARD_TABS)[number]['label'];

type UserProfile = {
  id: string;
  full_name: string | null;
  username: string | null;
  email: string | null;
  university: string | null;
  is_seller: boolean | null;
  created_at: string;
  shop_name?: string | null;
  shop_phone?: string | null;
};

const UsersPanel = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState<'seller' | 'buyer' | null>('seller');
  const [selectedUniversity, setSelectedUniversity] = useState<string | null>(null);
  const [showUniversityDropdown, setShowUniversityDropdown] = useState(false);
  const [universitySearchTerm, setUniversitySearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [showUserDetails, setShowUserDetails] = useState(false);
  const [searchColumn, setSearchColumn] = useState<'name' | 'username' | 'email' | 'shop_name' | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const universityOptions = Array.from(
    new Set(users.map((user) => user.university?.trim()).filter((value): value is string => Boolean(value)))
  ).sort((first, second) => first.localeCompare(second));

  const filteredUniversityOptions = useMemo(() => {
    const query = universitySearchTerm.trim().toLowerCase();
    const normalizedQuery = normalizeAbbreviationToken(query);

    if (!query) {
      return universityOptions;
    }

    const abbreviationMatch = Object.entries(UNIVERSITY_ABBREVIATIONS).find(
      ([abbreviation]) => normalizeAbbreviationToken(abbreviation) === normalizedQuery
    );

    if (abbreviationMatch) {
      const matchedUniversity = abbreviationMatch[1];
      return universityOptions.includes(matchedUniversity) ? [matchedUniversity] : [];
    }

    return universityOptions.filter((university) => {
      const normalizedName = university.toLowerCase();
      const acronym = getUniversityAcronym(university).toLowerCase();
      const normalizedAcronym = normalizeAbbreviationToken(acronym);

      return (
        normalizedName.includes(query) ||
        acronym.includes(query) ||
        normalizedAcronym.includes(normalizedQuery)
      );
    });
  }, [universityOptions, universitySearchTerm]);

  const filteredUsers = users.filter((user) => {
    const normalizedUniversity = user.university?.trim() ?? null;

    if (selectedUniversity && normalizedUniversity !== selectedUniversity) {
      return false;
    }

    if (selectedRole === 'seller') {
      if (!user.is_seller) return false;
    } else if (selectedRole === 'buyer') {
      if (user.is_seller) return false;
    }

    // Apply search filter
    if (searchTerm.trim()) {
      const lowerSearchTerm = searchTerm.toLowerCase().trim();
      if (searchColumn === 'name') {
        const name = (user.full_name || '').toLowerCase();
        if (!name.includes(lowerSearchTerm)) return false;
      } else if (searchColumn === 'username') {
        const username = (user.username || '').toLowerCase();
        if (!username.includes(lowerSearchTerm)) return false;
      } else if (searchColumn === 'email') {
        const email = (user.email || '').toLowerCase();
        if (!email.includes(lowerSearchTerm)) return false;
      } else if (searchColumn === 'shop_name') {
        const shopName = (user.shop_name || '').toLowerCase();
        if (!shopName.includes(lowerSearchTerm)) return false;
      }
    }

    return true;
  });

  const totalUsersCount = selectedUniversity
    ? users.filter((user) => (user.university?.trim() ?? null) === selectedUniversity).length
    : users.length;
  const totalSellersCount = users.filter(
    (user) =>
      user.is_seller &&
      (!selectedUniversity || (user.university?.trim() ?? null) === selectedUniversity)
  ).length;
  const totalBuyersCount = users.filter(
    (user) =>
      !user.is_seller &&
      (!selectedUniversity || (user.university?.trim() ?? null) === selectedUniversity)
  ).length;

  const loadUsers = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setErrorMessage(null);

    const { data, error } = await supabase
      .from('user_profiles')
      .select('id, full_name, username, email, university, is_seller, created_at, avatar_url')
      .order('created_at', { ascending: false });

    if (error) {
      setErrorMessage(error.message || 'Unable to fetch users right now.');
      setUsers([]);
    } else {
      const usersData = data ?? [];

      // Fetch shops for sellers
      const sellerIds = usersData.filter((u) => u.is_seller).map((u) => u.id);

      if (sellerIds.length > 0) {
        const { data: shopsData, error: shopsError } = await supabase
          .from('shops')
          .select('owner_id, name, phone')
          .in('owner_id', sellerIds);

        if (!shopsError && shopsData) {
          const shopsMap = new Map(shopsData.map((shop) => [shop.owner_id, { name: shop.name, phone: shop.phone }]));

          const enrichedUsers = usersData.map((user) => {
            if (user.is_seller && shopsMap.has(user.id)) {
              const shop = shopsMap.get(user.id)!;
              return { ...user, shop_name: shop.name, shop_phone: shop.phone };
            }

            return user;
          });

          setUsers(enrichedUsers);
        } else {
          setUsers(usersData);
        }
      } else {
        setUsers(usersData);
      }
    }

    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const renderUserItem = ({ item }: { item: UserProfile }) => {
    const name = item.full_name?.trim() || '';
    // Only show shop columns when specifically filtering by seller
    const showShopColumns = selectedRole === 'seller';
    // Hide username only when specifically filtering by seller
    const hideUsername = selectedRole === 'seller';
    const hideName = selectedRole === 'buyer';

    return (
      <TouchableOpacity
        style={[styles.panelTableRow]}
        onPress={() => {
          setSelectedUser(item);
          setShowUserDetails(true);
        }}
      >
        {showShopColumns ? (
          <>
            <View style={[styles.panelColShopName, styles.panelColumnContainer]}>
              <Text style={styles.panelTableCellText} numberOfLines={1}>
                {item.shop_name || '-'}
              </Text>
            </View>
            <View style={[styles.panelColEmail, styles.panelColumnContainer]}>
              <Text style={styles.panelTableCellText} numberOfLines={1}>
                {item.email || '-'}
              </Text>
            </View>
            <View style={[styles.panelColName, styles.panelColumnContainer]}>
              <Text style={styles.panelTableCellText} numberOfLines={1}>
                {name}
              </Text>
            </View>
            <View style={[styles.panelColShopPhone, styles.panelColumnContainer]}>
              <Text style={styles.panelTableCellText} numberOfLines={1}>
                {item.shop_phone || '-'}
              </Text>
            </View>
          </>
        ) : (
          <>
        {!hideName && (
          <View style={[styles.panelColName, styles.panelColumnContainer]}>
            <Text style={styles.panelTableCellText} numberOfLines={1}>
              {name}
            </Text>
          </View>
        )}
        {!hideUsername && (
          <View style={[styles.panelColUsername, styles.panelColumnContainer]}>
            <Text style={styles.panelTableCellText} numberOfLines={1}>
              {item.username || '-'}
            </Text>
          </View>
        )}
        <View style={[styles.panelColEmail, styles.panelColumnContainer]}>
          <Text style={styles.panelTableCellText} numberOfLines={1}>
            {item.email || '-'}
          </Text>
        </View>
        <View style={[styles.panelColUniversity, styles.panelColumnContainer]}>
          <Text style={styles.panelTableCellText} numberOfLines={1}>
            {item.university || '-'}
          </Text>
        </View>
          </>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.usersPanelContainer}>
      <View style={styles.panelFiltersRow}>
        <View style={styles.panelFilterBar}>
          <TouchableOpacity
            style={[
              styles.panelFilterSegment,
              selectedRole === 'seller' && styles.panelFilterSegmentActive,
            ]}
            onPress={() => setSelectedRole('seller')}
          >
            <Text
              style={[
                styles.panelFilterButtonText,
                selectedRole === 'seller' && styles.panelFilterButtonTextActive,
              ]}
            >
              Sellers
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.panelFilterSegment,
              styles.panelFilterSegmentMiddle,
              selectedRole === 'buyer' && styles.panelFilterSegmentActive,
            ]}
            onPress={() => {
              const nextRole: 'buyer' = 'buyer';
              setSelectedRole(nextRole);

              if (nextRole === 'buyer' && searchColumn === 'name') {
                setSearchColumn(null);
                setSearchTerm('');
              }
            }}
          >
            <Text
              style={[
                styles.panelFilterButtonText,
                selectedRole === 'buyer' && styles.panelFilterButtonTextActive,
              ]}
            >
              Buyers
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.panelFilterSegment,
              styles.panelFilterSegmentUniversity,
              showUniversityDropdown && styles.panelFilterSegmentActive,
            ]}
            onPress={() => setShowUniversityDropdown((prev) => !prev)}
          >
            <Text
              style={[
                styles.panelFilterButtonText,
                styles.panelUniversityDropdownTriggerText,
                showUniversityDropdown && styles.panelFilterButtonTextActive,
              ]}
              numberOfLines={1}
            >
              {selectedUniversity || 'University'}
            </Text>
            <Ionicons
              name={showUniversityDropdown ? 'chevron-up' : 'chevron-down'}
              size={14}
              color={showUniversityDropdown ? '#1D4ED8' : '#475569'}
            />
          </TouchableOpacity>
        </View>

        <View style={styles.panelRoleCountChip}>
          <View style={styles.panelRoleCountHeader}>
            <Ionicons
              name={selectedRole === 'seller' ? 'storefront' : 'person'}
              size={13}
              color="#334155"
              style={styles.panelRoleCountIcon}
            />
            <Text style={styles.panelRoleCountLabel}>
              {selectedRole === 'seller' ? 'Total sellers' : 'Total buyers'}
            </Text>
          </View>
          <Text style={styles.panelRoleCountValue}>
            {selectedRole === 'seller' ? totalSellersCount : totalBuyersCount}
          </Text>
        </View>

        <View style={[styles.panelUsersStatCard, styles.panelUsersStatCardInline]}>
          <View style={styles.panelUsersStatHeader}>
            <Ionicons name="people" size={14} color="#1D4ED8" style={styles.panelUsersStatIcon} />
            <Text style={styles.panelUsersStatLabel}>Total users</Text>
          </View>
          <Text style={styles.panelUsersStatValue}>{totalUsersCount}</Text>
        </View>
      </View>

      {showUniversityDropdown ? (
        <View style={styles.panelUniversityDropdownMenu}>
          <ScrollView style={styles.panelUniversityDropdownScroll} nestedScrollEnabled>
            <View style={styles.panelUniversitySearchWrapper}>
              <TextInput
                style={styles.panelUniversitySearchInput}
                placeholder="Search university..."
                placeholderTextColor="#94A3B8"
                value={universitySearchTerm}
                onChangeText={setUniversitySearchTerm}
                autoCorrect={false}
                autoCapitalize="none"
              />
            </View>

            <TouchableOpacity
              style={[
                styles.panelUniversityDropdownOption,
                !selectedUniversity && styles.panelUniversityDropdownOptionActive,
              ]}
              onPress={() => {
                setSelectedUniversity(null);
                setShowUniversityDropdown(false);
                setUniversitySearchTerm('');
              }}
            >
              <Text
                style={[
                  styles.panelUniversityDropdownOptionText,
                  !selectedUniversity && styles.panelUniversityDropdownOptionTextActive,
                ]}
              >
                All Universities
              </Text>
            </TouchableOpacity>

            {filteredUniversityOptions.map((university) => (
              <TouchableOpacity
                key={university}
                style={[
                  styles.panelUniversityDropdownOption,
                  selectedUniversity === university && styles.panelUniversityDropdownOptionActive,
                ]}
                onPress={() => {
                  setSelectedUniversity(university);
                  setShowUniversityDropdown(false);
                  setUniversitySearchTerm('');
                }}
              >
                <Text
                  style={[
                    styles.panelUniversityDropdownOptionText,
                    selectedUniversity === university && styles.panelUniversityDropdownOptionTextActive,
                  ]}
                  numberOfLines={1}
                >
                  {university}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      ) : null}

      {loading ? (
        <View style={styles.panelCenterState}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={styles.panelStateText}>Loading users...</Text>
        </View>
      ) : errorMessage ? (
        <View style={styles.panelCenterState}>
          <Text style={styles.panelErrorText}>{errorMessage}</Text>
          <Text style={styles.panelStateText}>Refresh to try again.</Text>
        </View>
      ) : (
        <View style={styles.panelTableWrapper}>
          <View style={styles.panelTableHeaderRow}>
            {selectedRole === 'seller' ? (
              <>
                <View style={[styles.panelColShopName]}>
                  <TouchableOpacity
                    style={styles.panelColumnHeaderContainer}
                    onPress={() => setSearchColumn(searchColumn === 'shop_name' ? null : 'shop_name')}
                  >
                    <Text style={styles.panelTableHeaderText}>Shop Name</Text>
                    <Ionicons
                      name="search"
                      size={12}
                      color={searchColumn === 'shop_name' ? '#2563EB' : '#94A3B8'}
                      style={{ marginLeft: 4 }}
                    />
                  </TouchableOpacity>
                  {searchColumn === 'shop_name' && (
                    <View style={styles.panelColumnSearchWrapper}>
                      <TextInput
                        style={styles.panelColumnSearchInput}
                        placeholder="Type to search..."
                        placeholderTextColor="#94A3B8"
                        value={searchTerm}
                        onChangeText={setSearchTerm}
                        autoFocus
                      />
                      {searchTerm.length > 0 && (
                        <TouchableOpacity
                          style={styles.panelColumnSearchClearButton}
                          onPress={() => setSearchTerm('')}
                        >
                          <Ionicons name="close-circle" size={16} color="#94A3B8" />
                        </TouchableOpacity>
                      )}
                    </View>
                  )}
                </View>
                <View style={[styles.panelColEmail]}>
                  <TouchableOpacity
                    style={styles.panelColumnHeaderContainer}
                    onPress={() => setSearchColumn(searchColumn === 'email' ? null : 'email')}
                  >
                    <Text style={styles.panelTableHeaderText}>Email</Text>
                    <Ionicons
                      name="search"
                      size={12}
                      color={searchColumn === 'email' ? '#2563EB' : '#94A3B8'}
                      style={{ marginLeft: 4 }}
                    />
                  </TouchableOpacity>
                  {searchColumn === 'email' && (
                    <View style={styles.panelColumnSearchWrapper}>
                      <TextInput
                        style={styles.panelColumnSearchInput}
                        placeholder="Type to search..."
                        placeholderTextColor="#94A3B8"
                        value={searchTerm}
                        onChangeText={setSearchTerm}
                        autoFocus
                      />
                      {searchTerm.length > 0 && (
                        <TouchableOpacity
                          style={styles.panelColumnSearchClearButton}
                          onPress={() => setSearchTerm('')}
                        >
                          <Ionicons name="close-circle" size={16} color="#94A3B8" />
                        </TouchableOpacity>
                      )}
                    </View>
                  )}
                </View>
                <View style={[styles.panelColName]}>
                  <TouchableOpacity
                    style={styles.panelColumnHeaderContainer}
                    onPress={() => setSearchColumn(searchColumn === 'name' ? null : 'name')}
                  >
                    <Text style={styles.panelTableHeaderText}>Name</Text>
                    <Ionicons
                      name="search"
                      size={12}
                      color={searchColumn === 'name' ? '#2563EB' : '#94A3B8'}
                      style={{ marginLeft: 4 }}
                    />
                  </TouchableOpacity>
                  {searchColumn === 'name' && (
                    <View style={styles.panelColumnSearchWrapper}>
                      <TextInput
                        style={styles.panelColumnSearchInput}
                        placeholder="Type to search..."
                        placeholderTextColor="#94A3B8"
                        value={searchTerm}
                        onChangeText={setSearchTerm}
                        autoFocus
                      />
                      {searchTerm.length > 0 && (
                        <TouchableOpacity
                          style={styles.panelColumnSearchClearButton}
                          onPress={() => setSearchTerm('')}
                        >
                          <Ionicons name="close-circle" size={16} color="#94A3B8" />
                        </TouchableOpacity>
                      )}
                    </View>
                  )}
                </View>
                <Text style={[styles.panelTableHeaderText, styles.panelColShopPhone]}>Phone Number</Text>
              </>
            ) : (
              <>
            {selectedRole !== 'buyer' && (
              <View style={[styles.panelColName]}>
                <TouchableOpacity
                  style={styles.panelColumnHeaderContainer}
                  onPress={() => setSearchColumn(searchColumn === 'name' ? null : 'name')}
                >
                  <Text style={styles.panelTableHeaderText}>Name</Text>
                  <Ionicons
                    name="search"
                    size={12}
                    color={searchColumn === 'name' ? '#2563EB' : '#94A3B8'}
                    style={{ marginLeft: 4 }}
                  />
                </TouchableOpacity>
                {searchColumn === 'name' && (
                  <View style={styles.panelColumnSearchWrapper}>
                    <TextInput
                      style={styles.panelColumnSearchInput}
                      placeholder="Type to search..."
                      placeholderTextColor="#94A3B8"
                      value={searchTerm}
                      onChangeText={setSearchTerm}
                      autoFocus
                    />
                    {searchTerm.length > 0 && (
                      <TouchableOpacity
                        style={styles.panelColumnSearchClearButton}
                        onPress={() => setSearchTerm('')}
                      >
                        <Ionicons name="close-circle" size={16} color="#94A3B8" />
                      </TouchableOpacity>
                    )}
                  </View>
                )}
              </View>
            )}
            <View style={[styles.panelColUsername]}>
                <TouchableOpacity
                  style={styles.panelColumnHeaderContainer}
                  onPress={() => setSearchColumn(searchColumn === 'username' ? null : 'username')}
                >
                  <Text style={styles.panelTableHeaderText}>Username</Text>
                  <Ionicons
                    name="search"
                    size={12}
                    color={searchColumn === 'username' ? '#2563EB' : '#94A3B8'}
                    style={{ marginLeft: 4 }}
                  />
                </TouchableOpacity>
                {searchColumn === 'username' && (
                  <View style={styles.panelColumnSearchWrapper}>
                    <TextInput
                      style={styles.panelColumnSearchInput}
                      placeholder="Type to search..."
                      placeholderTextColor="#94A3B8"
                      value={searchTerm}
                      onChangeText={setSearchTerm}
                      autoFocus
                    />
                    {searchTerm.length > 0 && (
                      <TouchableOpacity
                        style={styles.panelColumnSearchClearButton}
                        onPress={() => setSearchTerm('')}
                      >
                        <Ionicons name="close-circle" size={16} color="#94A3B8" />
                      </TouchableOpacity>
                    )}
                  </View>
                )}
              </View>
            <View style={[styles.panelColEmail]}>
              <TouchableOpacity
                style={styles.panelColumnHeaderContainer}
                onPress={() => setSearchColumn(searchColumn === 'email' ? null : 'email')}
              >
                <Text style={styles.panelTableHeaderText}>Email</Text>
                <Ionicons
                  name="search"
                  size={12}
                  color={searchColumn === 'email' ? '#2563EB' : '#94A3B8'}
                  style={{ marginLeft: 4 }}
                />
              </TouchableOpacity>
              {searchColumn === 'email' && (
                <View style={styles.panelColumnSearchWrapper}>
                  <TextInput
                    style={styles.panelColumnSearchInput}
                    placeholder="Type to search..."
                    placeholderTextColor="#94A3B8"
                    value={searchTerm}
                    onChangeText={setSearchTerm}
                    autoFocus
                  />
                  {searchTerm.length > 0 && (
                    <TouchableOpacity
                      style={styles.panelColumnSearchClearButton}
                      onPress={() => setSearchTerm('')}
                    >
                      <Ionicons name="close-circle" size={16} color="#94A3B8" />
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </View>
            <Text style={[styles.panelTableHeaderText, styles.panelColUniversity]}>University</Text>
              </>
            )}
          </View>

          <FlatList
            style={styles.panelList}
            data={filteredUsers}
            keyExtractor={(item) => item.id}
            renderItem={renderUserItem}
            contentContainerStyle={filteredUsers.length === 0 ? styles.panelEmptyListContent : styles.panelListContent}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadUsers(true)} />}
            ListEmptyComponent={
              <View style={styles.panelCenterState}>
                <Text style={styles.panelStateText}>No users found.</Text>
              </View>
            }
          />
        </View>
      )}

      <UserDetailsModal visible={showUserDetails} user={selectedUser} onClose={() => setShowUserDetails(false)} />
    </View>
  );
};

const AdminDashboard = () => {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [activeTab, setActiveTab] = useState<DashboardTab>('Overview');
  const [menuCollapsed, setMenuCollapsed] = useState(false);

  const handleTabPress = (tab: DashboardTab) => {
    setActiveTab(tab);
  };

  useEffect(() => {
    const checkAdminAccess = async () => {
      try {
        // Check sessionStorage authentication flag
        const flag = sessionStorage.getItem('admin_authenticated');
        if (flag !== 'true') {
          router.replace('/admin');
          setChecking(false);
          return;
        }

        // Get current user
        const { data } = await supabase.auth.getUser();
        const user = data?.user;

        if (!user) {
          sessionStorage.removeItem('admin_authenticated');
          router.replace('/admin');
          setChecking(false);
          return;
        }

        // Check if admin is active
        const { data: adminRecord, error } = await supabase
          .from('admins')
          .select('is_active')
          .eq('user_id', user.id)
          .single();

        if (error || !adminRecord) {
          sessionStorage.removeItem('admin_authenticated');
          Alert.alert('Error', 'Admin account not found');
          router.replace('/admin');
          setChecking(false);
          return;
        }

        // Check if admin is active
        if (!adminRecord.is_active) {
          sessionStorage.removeItem('admin_authenticated');
          Alert.alert(
            'Access Denied',
            'Your admin account has been deactivated. Please contact the master admin.'
          );
          router.replace('/admin');
          setChecking(false);
          return;
        }

        // All checks passed
        setAuthorized(true);
        setChecking(false);
      } catch (error) {
        console.error('Error checking admin access:', error);
        sessionStorage.removeItem('admin_authenticated');
        router.replace('/admin');
        setChecking(false);
      }
    };

    checkAdminAccess();
  }, [router]);

  if (checking) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!authorized) return null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Admin Dashboard</Text>
        <AdminProfile />
      </View>

      <View style={styles.contentWrapper}>
        <View style={[styles.sideMenu, menuCollapsed && styles.sideMenuCollapsed]}>
          <TouchableOpacity
            style={[styles.menuToggleButton, menuCollapsed && styles.menuToggleButtonCollapsed]}
            onPress={() => setMenuCollapsed((prev) => !prev)}
          >
            <Ionicons name="menu" size={20} color="#475569" />
            {!menuCollapsed ? <Text style={styles.menuToggleText}>Menu</Text> : null}
          </TouchableOpacity>

          {DASHBOARD_TABS.map((tab) => {
            const isActive = activeTab === tab.label;

            return (
              <TouchableOpacity
                key={tab.label}
                style={[
                  styles.sideMenuItem,
                  menuCollapsed && styles.sideMenuItemCollapsed,
                  isActive && styles.sideMenuItemActive,
                  isActive && menuCollapsed && styles.sideMenuItemActiveCollapsed,
                ]}
                onPress={() => handleTabPress(tab.label)}
              >
                <View
                  style={[
                    styles.sideMenuIconWrap,
                    menuCollapsed && styles.sideMenuIconWrapCollapsed,
                    isActive && styles.sideMenuIconWrapActive,
                  ]}
                >
                  <Ionicons
                    name={isActive ? tab.activeIcon : tab.icon}
                    size={18}
                    color={isActive ? TAB_ACTIVE_COLOR : '#64748B'}
                  />
                </View>
                {!menuCollapsed ? (
                  <>
                    <Text style={[styles.sideMenuText, isActive && styles.sideMenuTextActive]}>{tab.label}</Text>
                    {isActive ? <View style={styles.activeIndicator} /> : null}
                  </>
                ) : null}
                {isActive ? <View style={styles.activeEdge} /> : null}
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.mainContent}>
          {activeTab === 'Users' ? (
            <UsersPanel />
          ) : (
            <>
              <Text style={styles.sectionTitle}>{activeTab}</Text>
              <Text style={styles.sectionSubtitle}>Select a menu tab to manage {activeTab.toLowerCase()}.</Text>
            </>
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    width: '100%',
    paddingHorizontal: 20,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    position: 'relative',
    zIndex: 100,
    elevation: 100,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#0F172A',
  },
  contentWrapper: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
  },
  sideMenu: {
    width: 200,
    borderRightWidth: 1,
    borderRightColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    paddingVertical: 16,
    paddingHorizontal: 8,
  },
  sideMenuCollapsed: {
    width: 72,
    paddingHorizontal: 8,
  },
  menuToggleButton: {
    height: 42,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    alignSelf: 'stretch',
    marginHorizontal: 2,
    marginBottom: 14,
  },
  menuToggleButtonCollapsed: {
    width: 42,
    alignSelf: 'center',
  },
  menuToggleText: {
    marginLeft: 8,
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
  },
  sideMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginHorizontal: 2,
    marginVertical: 4,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    backgroundColor: '#FFFFFF',
    position: 'relative',
    overflow: 'hidden',
  },
  sideMenuItemCollapsed: {
    paddingHorizontal: 10,
    justifyContent: 'center',
  },
  sideMenuItemActive: {
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
  },
  sideMenuItemActiveCollapsed: {
    borderColor: '#FFD8A8',
  },
  sideMenuIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  sideMenuIconWrapCollapsed: {
    marginRight: 0,
  },
  sideMenuIconWrapActive: {
    backgroundColor: '#DBEAFE',
  },
  sideMenuText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
    flex: 1,
  },
  sideMenuTextActive: {
    color: '#1D4ED8',
  },
  activeIndicator: {
    marginLeft: 'auto',
    width: 6,
    height: 6,
    borderRadius: 999,
    backgroundColor: TAB_ACTIVE_COLOR,
  },
  activeEdge: {
    position: 'absolute',
    left: 0,
    top: 10,
    bottom: 10,
    width: 3,
    borderTopRightRadius: 8,
    borderBottomRightRadius: 8,
    backgroundColor: TAB_ACTIVE_COLOR,
  },
  mainContent: {
    flex: 1,
    paddingHorizontal: 24,
    paddingVertical: 24,
  },
  usersPanelContainer: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 15,
    color: '#64748B',
  },
  panelCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    padding: 18,
  },
  panelCardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 6,
  },
  panelCardText: {
    fontSize: 14,
    color: '#64748B',
    lineHeight: 20,
  },
  panelCenterState: {
    minHeight: 220,
    alignItems: 'center',
    justifyContent: 'center',
  },
  panelStateText: {
    marginTop: 8,
    color: '#64748B',
    fontSize: 14,
  },
  panelErrorText: {
    color: '#DC2626',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 4,
  },
  panelListContent: {
    paddingBottom: 18,
  },
  panelList: {
    flex: 1,
  },
  panelEmptyListContent: {
    flexGrow: 1,
  },
  panelTableWrapper: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  panelTableHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    borderBottomWidth: 0,
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  panelTableHeaderText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  panelTableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F4F8',
  },
  panelTableCellText: {
    fontSize: 14,
    color: '#1E293B',
    fontWeight: '500',
  },
  panelColumnContainer: {
    borderRightWidth: 1,
    borderRightColor: '#E2E8F0',
    paddingHorizontal: 12,
    justifyContent: 'center',
  },
  panelColName: {
    flex: 1.8,
  },
  panelColUsername: {
    flex: 1.5,
  },
  panelColEmail: {
    flex: 2,
  },
  panelColUniversity: {
    flex: 1.5,
  },
  panelTotalsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginBottom: 10,
  },
  panelRoleCountChip: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 7,
    paddingHorizontal: 11,
    minWidth: 122,
  },
  panelRoleCountHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  panelRoleCountIcon: {
    marginRight: 5,
  },
  panelRoleCountLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  panelRoleCountValue: {
    fontSize: 17,
    fontWeight: '800',
    color: '#334155',
    textAlign: 'center',
  },
  panelUsersStatCard: {
    minWidth: 128,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    paddingVertical: 7,
    paddingHorizontal: 11,
    alignItems: 'center',
    shadowColor: '#1D4ED8',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  panelUsersStatCardInline: {
    marginLeft: 'auto',
  },
  panelUsersStatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  panelUsersStatIcon: {
    marginRight: 6,
  },
  panelUsersStatLabel: {
    fontSize: 10,
    color: '#1E40AF',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  panelUsersStatValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1D4ED8',
    textAlign: 'center',
  },
  panelFiltersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
    flexWrap: 'wrap',
  },
  panelFilterBar: {
    flexDirection: 'row',
    alignItems: 'stretch',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  panelFilterSegment: {
    borderRadius: 0,
    minHeight: 40,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  panelFilterSegmentMiddle: {
    borderLeftWidth: 1,
    borderLeftColor: '#E2E8F0',
  },
  panelFilterSegmentUniversity: {
    minWidth: 200,
    borderLeftWidth: 1,
    borderLeftColor: '#E2E8F0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  panelFilterSegmentActive: {
    backgroundColor: '#EFF6FF',
  },
  panelFilterButton: {
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  panelFilterButtonActive: {
    borderColor: '#2563EB',
    backgroundColor: '#EFF6FF',
  },
  panelFilterButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
  },
  panelFilterButtonTextActive: {
    color: '#1D4ED8',
  },
  panelUniversityDropdownTrigger: {
    minWidth: 190,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  panelUniversityDropdownTriggerText: {
    flex: 1,
  },
  panelUniversityDropdownMenu: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    marginBottom: 10,
    overflow: 'hidden',
    maxHeight: 220,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  panelUniversityDropdownScroll: {
    maxHeight: 220,
  },
  panelUniversitySearchWrapper: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F4F8',
    backgroundColor: '#FFFFFF',
  },
  panelUniversitySearchInput: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
    color: '#0F172A',
    backgroundColor: '#F8FAFC',
  },
  panelUniversityDropdownOption: {
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F4F8',
  },
  panelUniversityDropdownOptionActive: {
    backgroundColor: '#EFF6FF',
  },
  panelUniversityDropdownOptionText: {
    fontSize: 13,
    color: '#475569',
    fontWeight: '500',
  },
  panelUniversityDropdownOptionTextActive: {
    fontWeight: '700',
    color: '#1D4ED8',
  },
  panelTableRowWithShop: {
    paddingHorizontal: 12,
  },
  panelColShopName: {
    flex: 1.8,
  },
  panelColShopPhone: {
    flex: 1.2,
  },
  panelColumnHeaderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  panelColumnSearchWrapper: {
    paddingTop: 8,
    paddingHorizontal: 0,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  panelColumnSearchInput: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 12,
    color: '#0F172A',
    backgroundColor: '#F9FAFB',
  },
  panelColumnSearchClearButton: {
    position: 'absolute',
    right: 8,
    top: 16,
  },
});

export default AdminDashboard;