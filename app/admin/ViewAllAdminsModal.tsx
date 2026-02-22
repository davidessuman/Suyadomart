import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { supabase } from '@/lib/supabase';
import EditAdminModal from './EditAdminModal';

interface Admin {
  id: string;
  user_id: string;
  email: string;
  role: string;
  full_name: string | null;
  username: string | null;
  is_active: boolean;
  is_master_admin: boolean;
}

interface ViewAllAdminsModalProps {
  visible: boolean;
  onClose: () => void;
}

const ViewAllAdminsModal: React.FC<ViewAllAdminsModalProps> = ({ visible, onClose }) => {
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isMasterAdmin, setIsMasterAdmin] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState<Admin | null>(null);

  useEffect(() => {
    if (visible) {
      loadCurrentUser();
      loadAdmins();
    }
  }, [visible]);

  const loadCurrentUser = async () => {
    try {
      const { data } = await supabase.auth.getUser();
      const user = data?.user;

      if (!user) return;

      setCurrentUserId(user.id);

      const { data: adminRecord } = await supabase
        .from('admins')
        .select('is_master_admin')
        .eq('user_id', user.id)
        .single();

      if (adminRecord) {
        setIsMasterAdmin(adminRecord.is_master_admin || false);
      }
    } catch (error) {
      console.error('Error loading current user:', error);
    }
  };

  const loadAdmins = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('admins')
        .select('id, email, role, full_name, username, is_active, is_master_admin, user_id')
        .order('is_master_admin', { ascending: false })
        .order('email', { ascending: true });

      if (error) throw error;

      setAdmins(data || []);
    } catch (error) {
      console.error('Error loading admins:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEditAdmin = (admin: Admin) => {
    setSelectedAdmin(admin);
    setEditModalVisible(true);
  };

  const handleEditSuccess = () => {
    loadAdmins();
  };

  const getDisplayName = (admin: Admin): string => {
    if (admin.full_name && admin.full_name.trim().length > 0) {
      return admin.full_name;
    }
    if (admin.username && admin.username.trim().length > 0) {
      return admin.username;
    }
    // Fallback to formatted email
    if (admin.email && admin.email.includes('@')) {
      return admin.email
        .split('@')[0]
        .replace(/[._-]+/g, ' ')
        .replace(/\b\w/g, (char) => char.toUpperCase());
    }
    return 'Unknown';
  };

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>All Admins</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Content */}
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#0F172A" />
              <Text style={styles.loadingText}>Loading admins...</Text>
            </View>
          ) : (
            <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
              {/* Table Header */}
              <View style={styles.tableHeader}>
                <Text style={[styles.tableHeaderText, styles.nameColumn]}>Name</Text>
                <Text style={[styles.tableHeaderText, styles.emailColumn]}>Email</Text>
                <Text style={[styles.tableHeaderText, styles.roleColumn]}>Role</Text>
                <Text style={[styles.tableHeaderText, styles.statusColumn]}>Status</Text>
                {isMasterAdmin && (
                  <Text style={[styles.tableHeaderText, styles.actionsColumn]}>Actions</Text>
                )}
              </View>

              {/* Table Body */}
              {admins.length === 0 ? (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyStateIcon}>👥</Text>
                  <Text style={styles.emptyStateText}>No admins found</Text>
                </View>
              ) : (
                admins.map((admin, index) => (
                  <View
                    key={admin.id}
                    style={[
                      styles.tableRow,
                      index % 2 === 0 && styles.tableRowEven,
                      admin.is_master_admin && styles.masterAdminRow,
                    ]}
                  >
                    <View style={styles.nameColumn}>
                      <Text style={styles.nameText} numberOfLines={1}>
                        {getDisplayName(admin)}
                      </Text>
                      {admin.is_master_admin && (
                        <View style={styles.masterBadge}>
                          <Text style={styles.masterBadgeText}>MASTER</Text>
                        </View>
                      )}
                    </View>
                    <Text style={[styles.cellText, styles.emailColumn]} numberOfLines={1}>
                      {admin.email}
                    </Text>
                    <View style={styles.roleColumn}>
                      <View style={styles.rolePill}>
                        <Text style={styles.rolePillText}>{admin.role || 'Not set'}</Text>
                      </View>
                    </View>
                    <View style={styles.statusColumn}>
                      <View style={[styles.statusBadge, admin.is_active ? styles.statusActive : styles.statusInactive]}>
                        <Text style={[styles.statusText, admin.is_active ? styles.statusActiveText : styles.statusInactiveText]}>
                          {admin.is_active ? 'Active' : 'Inactive'}
                        </Text>
                      </View>
                    </View>
                    {isMasterAdmin && (
                      <View style={styles.actionsColumn}>
                        {admin.user_id !== currentUserId && (
                          <TouchableOpacity
                            style={styles.editButton}
                            onPress={() => handleEditAdmin(admin)}
                          >
                            <Text style={styles.editButtonText}>✏️ Edit</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    )}
                  </View>
                ))
              )}
            </ScrollView>
          )}

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>Total Admins: {admins.length}</Text>
            <TouchableOpacity style={styles.doneButton} onPress={onClose}>
              <Text style={styles.doneButtonText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <EditAdminModal
        visible={editModalVisible}
        admin={selectedAdmin}
        onClose={() => {
          setEditModalVisible(false);
          setSelectedAdmin(null);
        }}
        onSuccess={handleEditSuccess}
      />
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    width: '100%',
    maxWidth: 900,
    maxHeight: '90%',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.3,
    shadowRadius: 40,
    elevation: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#0F172A',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    fontSize: 18,
    color: '#64748B',
    fontWeight: '600',
  },
  loadingContainer: {
    padding: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 15,
    color: '#64748B',
    fontWeight: '500',
  },
  scrollView: {
    flex: 1,
  },
  tableHeader: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingVertical: 14,
    backgroundColor: '#F8FAFC',
    borderBottomWidth: 2,
    borderBottomColor: '#E2E8F0',
  },
  tableHeaderText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tableRow: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    alignItems: 'center',
  },
  tableRowEven: {
    backgroundColor: '#FAFBFC',
  },
  masterAdminRow: {
    backgroundColor: '#FEF9F5',
    borderLeftWidth: 3,
    borderLeftColor: '#F59E0B',
  },
  nameColumn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  emailColumn: {
    flex: 2.5,
  },
  roleColumn: {
    flex: 1.5,
  },
  statusColumn: {
    flex: 1,
  },
  actionsColumn: {
    flex: 1,
    alignItems: 'center',
  },
  editButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#EEF2FF',
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  editButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4338CA',
  },
  nameText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0F172A',
  },
  cellText: {
    fontSize: 14,
    color: '#475569',
    fontWeight: '500',
  },
  masterBadge: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FCD34D',
  },
  masterBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#92400E',
    letterSpacing: 0.5,
  },
  rolePill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: '#EEF2FF',
    borderWidth: 1,
    borderColor: '#DDE4FF',
  },
  rolePillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
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
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  statusActiveText: {
    color: '#166534',
  },
  statusInactiveText: {
    color: '#991B1B',
  },
  emptyState: {
    padding: 60,
    alignItems: 'center',
  },
  emptyStateIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#94A3B8',
    fontWeight: '500',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 18,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  footerText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },
  doneButton: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#0F172A',
  },
  doneButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

export default ViewAllAdminsModal;
