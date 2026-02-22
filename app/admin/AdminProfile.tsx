import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAlert } from '@/app/alert/AlertProvider';
import AddAdminModal from './AddAdminModal';
import ViewAllAdminsModal from './ViewAllAdminsModal';

const AdminProfile = () => {
  const router = useRouter();
  const { showConfirmation } = useAlert();
  const [menuVisible, setMenuVisible] = useState(false);
  const [adminEmail, setAdminEmail] = useState('Not available');
  const [adminRole, setAdminRole] = useState('Admin');
  const [adminStatus, setAdminStatus] = useState('Active');
  const [adminFullName, setAdminFullName] = useState('');
  const [adminUsername, setAdminUsername] = useState('');
  const [isMasterAdmin, setIsMasterAdmin] = useState(false);
  const [addAdminModalVisible, setAddAdminModalVisible] = useState(false);
  const [adminsMenuVisible, setAdminsMenuVisible] = useState(false);
  const [viewAllAdminsModalVisible, setViewAllAdminsModalVisible] = useState(false);

  const displayName =
    adminFullName && adminFullName.trim().length > 0
      ? adminFullName
      : adminUsername && adminUsername.trim().length > 0
      ? adminUsername
      : adminEmail !== 'Not available' && adminEmail.includes('@')
      ? adminEmail
          .split('@')[0]
          .replace(/[._-]+/g, ' ')
          .replace(/\b\w/g, (char) => char.toUpperCase())
      : 'Administrator';

  const avatarLetter = displayName.charAt(0).toUpperCase() || 'A';

  const handleLogout = async () => {
    showConfirmation({
      title: 'Logout',
      message: 'Are you sure you want to log out?',
      confirmText: 'Logout',
      cancelText: 'Cancel',
      onConfirm: async () => {
        try {
          await supabase.auth.signOut();
        } catch (error) {
          console.error('Error signing out admin:', error);
        } finally {
          try {
            sessionStorage.removeItem('admin_authenticated');
          } catch {
            // Ignore if sessionStorage is unavailable (non-web environments)
          }
          setMenuVisible(false);
          setAdminsMenuVisible(false);
          router.replace('/admin');
        }
      },
    });
  };

  useEffect(() => {
    let isMounted = true;

    const loadAdminProfile = async () => {
      const { data } = await supabase.auth.getUser();
      const user = data?.user;

      if (!user) {
        router.replace('/admin');
        return;
      }

      let nextEmail = user.email ?? 'Not available';
      let nextRole = 'Not set';
      let nextStatus = 'Active';
      let nextFullName = '';
      let nextUsername = '';
      let nextIsMasterAdmin = false;

      const { data: adminRecord } = await supabase
        .from('admins')
        .select('email, role, is_active, full_name, username, is_master_admin')
        .eq('user_id', user.id)
        .single();

      if (adminRecord) {
        if (typeof adminRecord.email === 'string' && adminRecord.email.trim().length > 0) {
          nextEmail = adminRecord.email;
        }

        if (typeof adminRecord.role === 'string' && adminRecord.role.trim().length > 0) {
          nextRole = adminRecord.role;
        }

        if (typeof adminRecord.is_active === 'boolean') {
          nextStatus = adminRecord.is_active ? 'Active' : 'Inactive';
        }

        if (typeof adminRecord.full_name === 'string' && adminRecord.full_name.trim().length > 0) {
          nextFullName = adminRecord.full_name;
        }

        if (typeof adminRecord.username === 'string' && adminRecord.username.trim().length > 0) {
          nextUsername = adminRecord.username;
        }

        if (typeof adminRecord.is_master_admin === 'boolean') {
          nextIsMasterAdmin = adminRecord.is_master_admin;
        }
      }

      if (!isMounted) return;

      setAdminEmail(nextEmail);
      setAdminRole(nextRole);
      setAdminStatus(nextStatus);
      setAdminFullName(nextFullName);
      setAdminUsername(nextUsername);
      setIsMasterAdmin(nextIsMasterAdmin);
    };

    loadAdminProfile();

    return () => {
      isMounted = false;
    };
  }, [router]);

  return (
    <>
      <TouchableOpacity
        style={styles.profileButton}
        activeOpacity={0.85}
        onPress={() => setMenuVisible((prev) => !prev)}
      >
        <View style={styles.profileButtonAvatar}>
          <Text style={styles.profileButtonAvatarText}>{avatarLetter}</Text>
        </View>
        <Text style={styles.profileButtonText}>My Profile</Text>
        <Text style={styles.profileButtonChevron}>{menuVisible ? '▲' : '▼'}</Text>
      </TouchableOpacity>

      {menuVisible && (
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={() => setMenuVisible(false)}
        />
      )}

      {adminsMenuVisible && (
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={() => setAdminsMenuVisible(false)}
        />
      )}

      {menuVisible && (
        <View style={styles.profileMenu}>
          <View style={styles.menuTopRow}>
            <View style={styles.menuAvatar}>
              <Text style={styles.menuAvatarText}>{avatarLetter}</Text>
            </View>
            <View style={styles.menuIdentityBlock}>
              <Text style={styles.menuName}>{displayName}</Text>
              <Text style={styles.menuEmail}>{adminEmail}</Text>
            </View>
          </View>

          <View style={styles.menuDivider} />

          <View style={styles.menuMetaRow}>
            <Text style={styles.menuLabel}>Role</Text>
            <View style={styles.roleBadge}>
              <Text style={styles.roleBadgeText}>{adminRole}</Text>
            </View>
          </View>

          <View style={styles.menuMetaRow}>
            <Text style={styles.menuLabel}>Status</Text>
            <View style={[styles.statusBadge, adminStatus === 'Active' ? styles.statusActive : styles.statusInactive]}>
              <Text style={[styles.statusBadgeText, adminStatus === 'Active' ? styles.statusActiveText : styles.statusInactiveText]}>
                {adminStatus}
              </Text>
            </View>
          </View>

          <View style={styles.menuDivider} />

          <TouchableOpacity
            style={styles.adminsButton}
            activeOpacity={0.8}
            onPress={() => {
              setMenuVisible(false);
              setAdminsMenuVisible(true);
            }}
          >
            <Text style={styles.adminsButtonText}>Admins</Text>
            <Text style={styles.adminsButtonChevron}>▶</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.logoutButton}
            activeOpacity={0.8}
            onPress={handleLogout}
          >
            <Text style={styles.logoutButtonText}>Logout</Text>
          </TouchableOpacity>
        </View>
      )}

      {adminsMenuVisible && (
        <View style={styles.adminsDropdown}>
          <Text style={styles.adminsDropdownTitle}>Admin Management</Text>
          <View style={styles.dropdownDivider} />
          <TouchableOpacity
            style={styles.dropdownItem}
            activeOpacity={0.7}
            onPress={() => {
              setAdminsMenuVisible(false);
              setViewAllAdminsModalVisible(true);
            }}
          >
            <Text style={styles.dropdownItemIcon}>👥</Text>
            <Text style={styles.dropdownItemText}>View all admins</Text>
          </TouchableOpacity>
          
          {isMasterAdmin && (
            <>
              <View style={styles.dropdownDivider} />
              <TouchableOpacity
                style={styles.addAdminDropdownItem}
                activeOpacity={0.8}
                onPress={() => {
                  setAdminsMenuVisible(false);
                  setAddAdminModalVisible(true);
                }}
              >
                <View style={styles.addAdminIconWrapper}>
                  <Text style={styles.addAdminIcon}>+</Text>
                </View>
                <Text style={styles.addAdminText}>Add New Admin</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      )}

      <AddAdminModal
        visible={addAdminModalVisible}
        onClose={() => setAddAdminModalVisible(false)}
        onSuccess={() => {
          // Optionally refresh admin list or show success notification
        }}
      />

      <ViewAllAdminsModal
        visible={viewAllAdminsModalVisible}
        onClose={() => setViewAllAdminsModalVisible(false)}
      />
    </>
  );
};

const styles = StyleSheet.create({
  profileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  profileButtonAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0F172A',
  },
  profileButtonAvatarText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  profileButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
  },
  profileButtonChevron: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 1,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(2, 6, 23, 0.08)',
    zIndex: 10,
  },
  profileMenu: {
    position: 'absolute',
    top: 72,
    right: 20,
    width: 340,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 16,
    zIndex: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.14,
    shadowRadius: 24,
    elevation: 10,
  },
  logoutButton: {
    marginTop: 12,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#F97373',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#DC2626',
  },
  menuTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  menuAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#0F172A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuAvatarText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  menuIdentityBlock: {
    flex: 1,
  },
  menuName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 2,
  },
  menuEmail: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
  },
  menuDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 14,
  },
  menuMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  menuLabel: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '600',
  },
  roleBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: '#EEF2FF',
    borderWidth: 1,
    borderColor: '#DDE4FF',
  },
  roleBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
  },
  statusActive: {
    backgroundColor: '#ECFDF3',
    borderColor: '#C4F1D2',
  },
  statusInactive: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  statusActiveText: {
    color: '#166534',
  },
  statusInactiveText: {
    color: '#991B1B',
  },
  adminsButton: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  adminsButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
  },
  adminsButtonChevron: {
    fontSize: 10,
    color: '#64748B',
  },
  adminsDropdown: {
    position: 'absolute',
    top: 72,
    right: 20,
    width: 280,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
    zIndex: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
  },
  adminsDropdownTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
  dropdownDivider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 8,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
  },
  addAdminDropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: '#0F172A',
    marginTop: 4,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  addAdminIconWrapper: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addAdminIcon: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  addAdminText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  dropdownItemIcon: {
    fontSize: 18,
  },
  dropdownItemText: {
    fontSize: 14,
    color: '#334155',
    fontWeight: '500',
  },
});

export default AdminProfile;
