import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import UserDetailsModal from './UserDetailsModal';

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

const AdminUsersDashboard = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState<'seller' | 'buyer' | null>(null);
  const [selectedUniversity, setSelectedUniversity] = useState<string | null>(null);
  const [showUniversityDropdown, setShowUniversityDropdown] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [showUserDetails, setShowUserDetails] = useState(false);
  const [searchColumn, setSearchColumn] = useState<'name' | 'username' | 'email' | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const universityOptions = Array.from(
    new Set(users.map((user) => user.university?.trim()).filter((value): value is string => Boolean(value)))
  ).sort((first, second) => first.localeCompare(second));

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
      }
    }

    return true;
  });

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

  const renderUserItem = ({ item, index }: { item: UserProfile; index: number }) => {
    const name = item.full_name || item.username || item.email || 'Unnamed user';
    // Only show shop columns when specifically filtering by seller
    const showShopColumns = selectedRole === 'seller';
    // Hide username only when specifically filtering by seller
    const hideUsername = selectedRole === 'seller';

    return (
      <TouchableOpacity
        style={[
          styles.tableRow,
          index % 2 === 0 ? styles.tableRowEven : styles.tableRowOdd,
        ]}
        onPress={() => {
          setSelectedUser(item);
          setShowUserDetails(true);
        }}
      >
        <View style={[styles.colName, styles.columnContainer]}>
          <Text style={styles.tableCellText} numberOfLines={1}>
            {name}
          </Text>
        </View>
        {!hideUsername && (
          <View style={[styles.colUsername, styles.columnContainer]}>
            <Text style={styles.tableCellText} numberOfLines={1}>
              {item.username || '-'}
            </Text>
          </View>
        )}
        <View style={[styles.colEmail, styles.columnContainer]}>
          <Text style={styles.tableCellText} numberOfLines={1}>
            {item.email || '-'}
          </Text>
        </View>
        <View style={[styles.colUniversity, styles.columnContainer]}>
          <Text style={styles.tableCellText} numberOfLines={1}>
            {item.university || '-'}
          </Text>
        </View>
        {showShopColumns && (
          <>
            <View style={[styles.colShopName, styles.columnContainer]}>
              <Text style={styles.tableCellText} numberOfLines={1}>
                {item.shop_name || '-'}
              </Text>
            </View>
            <View style={[styles.colShopPhone, styles.columnContainer]}>
              <Text style={styles.tableCellText} numberOfLines={1}>
                {item.shop_phone || '-'}
              </Text>
            </View>
          </>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.filtersRow}>
        <TouchableOpacity
          style={[styles.filterButton, selectedRole === null && styles.filterButtonActive]}
          onPress={() => setSelectedRole(null)}
        >
          <Text style={[styles.filterButtonText, selectedRole === null && styles.filterButtonTextActive]}>
            All
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterButton, selectedRole === 'seller' && styles.filterButtonActive]}
          onPress={() => setSelectedRole((prev) => (prev === 'seller' ? null : 'seller'))}
        >
          <Text style={[styles.filterButtonText, selectedRole === 'seller' && styles.filterButtonTextActive]}>
            Sellers
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterButton, selectedRole === 'buyer' && styles.filterButtonActive]}
          onPress={() => setSelectedRole((prev) => (prev === 'buyer' ? null : 'buyer'))}
        >
          <Text style={[styles.filterButtonText, selectedRole === 'buyer' && styles.filterButtonTextActive]}>
            Buyers
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterButton, styles.universityDropdownTrigger, showUniversityDropdown && styles.filterButtonActive]}
          onPress={() => setShowUniversityDropdown((prev) => !prev)}
        >
          <Text
            style={[styles.filterButtonText, styles.universityDropdownTriggerText, showUniversityDropdown && styles.filterButtonTextActive]}
            numberOfLines={1}
          >
            {selectedUniversity || 'University'}
          </Text>
          <Ionicons name={showUniversityDropdown ? 'chevron-up' : 'chevron-down'} size={14} color="#475569" />
        </TouchableOpacity>
      </View>

      {showUniversityDropdown ? (
        <View style={styles.universityDropdownMenu}>
          <ScrollView style={styles.universityDropdownScroll} nestedScrollEnabled>
            <TouchableOpacity
              style={[
                styles.universityDropdownOption,
                !selectedUniversity && styles.universityDropdownOptionActive,
              ]}
              onPress={() => {
                setSelectedUniversity(null);
                setShowUniversityDropdown(false);
              }}
            >
              <Text
                style={[
                  styles.universityDropdownOptionText,
                  !selectedUniversity && styles.universityDropdownOptionTextActive,
                ]}
              >
                All Universities
              </Text>
            </TouchableOpacity>

            {universityOptions.map((university) => (
              <TouchableOpacity
                key={university}
                style={[
                  styles.universityDropdownOption,
                  selectedUniversity === university && styles.universityDropdownOptionActive,
                ]}
                onPress={() => {
                  setSelectedUniversity(university);
                  setShowUniversityDropdown(false);
                }}
              >
                <Text
                  style={[
                    styles.universityDropdownOptionText,
                    selectedUniversity === university && styles.universityDropdownOptionTextActive,
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

      <Text style={styles.totalUsersText}>Total users: {filteredUsers.length}</Text>

      {loading ? (
        <View style={styles.centerState}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={styles.stateText}>Loading users...</Text>
        </View>
      ) : errorMessage ? (
        <View style={styles.centerState}>
          <Text style={styles.errorText}>{errorMessage}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => loadUsers()}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.tableWrapper}>
          <View style={styles.tableHeaderRow}>
            <View style={[styles.colName]}>
              <TouchableOpacity
                style={styles.columnHeaderContainer}
                onPress={() => setSearchColumn(searchColumn === 'name' ? null : 'name')}
              >
                <Text style={styles.tableHeaderText}>Name</Text>
                {searchColumn === 'name' && (
                  <Ionicons name="search" size={12} color="#2563EB" style={{ marginLeft: 4 }} />
                )}
              </TouchableOpacity>
              {searchColumn === 'name' && (
                <View style={styles.columnSearchWrapper}>
                  <TextInput
                    style={styles.columnSearchInput}
                    placeholder="Type to search..."
                    placeholderTextColor="#94A3B8"
                    value={searchTerm}
                    onChangeText={setSearchTerm}
                    autoFocus
                  />
                  {searchTerm.length > 0 && (
                    <TouchableOpacity
                      style={styles.columnSearchClearButton}
                      onPress={() => setSearchTerm('')}
                    >
                      <Ionicons name="close-circle" size={16} color="#94A3B8" />
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </View>
            {selectedRole !== 'seller' && (
              <View style={[styles.colUsername]}>
                <TouchableOpacity
                  style={styles.columnHeaderContainer}
                  onPress={() => setSearchColumn(searchColumn === 'username' ? null : 'username')}
                >
                  <Text style={styles.tableHeaderText}>Username</Text>
                  {searchColumn === 'username' && (
                    <Ionicons name="search" size={12} color="#2563EB" style={{ marginLeft: 4 }} />
                  )}
                </TouchableOpacity>
                {searchColumn === 'username' && (
                  <View style={styles.columnSearchWrapper}>
                    <TextInput
                      style={styles.columnSearchInput}
                      placeholder="Type to search..."
                      placeholderTextColor="#94A3B8"
                      value={searchTerm}
                      onChangeText={setSearchTerm}
                      autoFocus
                    />
                    {searchTerm.length > 0 && (
                      <TouchableOpacity
                        style={styles.columnSearchClearButton}
                        onPress={() => setSearchTerm('')}
                      >
                        <Ionicons name="close-circle" size={16} color="#94A3B8" />
                      </TouchableOpacity>
                    )}
                  </View>
                )}
              </View>
            )}
            <View style={[styles.colEmail]}>
              <TouchableOpacity
                style={styles.columnHeaderContainer}
                onPress={() => setSearchColumn(searchColumn === 'email' ? null : 'email')}
              >
                <Text style={styles.tableHeaderText}>Email</Text>
                {searchColumn === 'email' && (
                  <Ionicons name="search" size={12} color="#2563EB" style={{ marginLeft: 4 }} />
                )}
              </TouchableOpacity>
              {searchColumn === 'email' && (
                <View style={styles.columnSearchWrapper}>
                  <TextInput
                    style={styles.columnSearchInput}
                    placeholder="Type to search..."
                    placeholderTextColor="#94A3B8"
                    value={searchTerm}
                    onChangeText={setSearchTerm}
                    autoFocus
                  />
                  {searchTerm.length > 0 && (
                    <TouchableOpacity
                      style={styles.columnSearchClearButton}
                      onPress={() => setSearchTerm('')}
                    >
                      <Ionicons name="close-circle" size={16} color="#94A3B8" />
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </View>
            <Text style={[styles.tableHeaderText, styles.colUniversity]}>University</Text>
            {selectedRole === 'seller' && (
              <>
                <Text style={[styles.tableHeaderText, styles.colShopName]}>Shop Name</Text>
                <Text style={[styles.tableHeaderText, styles.colShopPhone]}>Shop Phone</Text>
              </>
            )}
          </View>

          <FlatList
            style={styles.list}
            data={filteredUsers}
            keyExtractor={(item) => item.id}
            renderItem={renderUserItem}
            contentContainerStyle={filteredUsers.length === 0 ? styles.emptyListContent : styles.listContent}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadUsers(true)} />}
            ListEmptyComponent={
              <View style={styles.centerState}>
                <Text style={styles.stateText}>No users found.</Text>
              </View>
            }
          />
        </View>
      )}

      <UserDetailsModal visible={showUserDetails} user={selectedUser} onClose={() => setShowUserDetails(false)} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F0F4F8',
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  list: {
    flex: 1,
  },
  centerState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stateText: {
    marginTop: 8,
    color: '#64748B',
    fontSize: 14,
  },
  errorText: {
    color: '#DC2626',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 4,
  },
  listContent: {
    paddingBottom: 18,
  },
  emptyListContent: {
    flexGrow: 1,
  },
  tableWrapper: {
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
  tableHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  tableHeaderText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F4F8',
  },
  tableRowEven: {
    backgroundColor: '#FFFFFF',
  },
  tableRowOdd: {
    backgroundColor: '#F8FAFC',
  },
  tableCellText: {
    fontSize: 14,
    color: '#1E293B',
    fontWeight: '500',
  },
  columnContainer: {
    borderRightWidth: 1,
    borderRightColor: '#E2E8F0',
    paddingHorizontal: 12,
    justifyContent: 'center',
  },
  colName: {
    flex: 1.8,
  },
  colUsername: {
    flex: 1.5,
  },
  colEmail: {
    flex: 2,
  },
  colUniversity: {
    flex: 1.5,
  },
  retryButton: {
    marginTop: 10,
    backgroundColor: '#2563EB',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  totalUsersText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 12,
  },
  filtersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
    flexWrap: 'wrap',
  },
  filterButton: {
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
  filterButtonActive: {
    borderColor: '#2563EB',
    backgroundColor: '#EFF6FF',
  },
  filterButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
  },
  filterButtonTextActive: {
    color: '#1D4ED8',
  },
  universityDropdownTrigger: {
    minWidth: 190,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  universityDropdownTriggerText: {
    flex: 1,
  },
  universityDropdownMenu: {
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
  universityDropdownScroll: {
    maxHeight: 220,
  },
  universityDropdownOption: {
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F4F8',
  },
  universityDropdownOptionActive: {
    backgroundColor: '#EFF6FF',
  },
  universityDropdownOptionText: {
    fontSize: 13,
    color: '#475569',
    fontWeight: '500',
  },
  universityDropdownOptionTextActive: {
    fontWeight: '700',
    color: '#1D4ED8',
  },
  tableRowWithShop: {
    paddingHorizontal: 12,
  },
  colShopName: {
    flex: 1.8,
  },
  colShopPhone: {
    flex: 1.2,
  },
  columnHeaderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  columnSearchWrapper: {
    paddingTop: 8,
    paddingHorizontal: 0,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  columnSearchInput: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 12,
    color: '#0F172A',
    backgroundColor: '#F9FAFB',
  },
  columnSearchClearButton: {
    position: 'absolute',
    right: 8,
    top: 16,
  },
});

export default AdminUsersDashboard;
