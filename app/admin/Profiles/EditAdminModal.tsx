import React, { useState } from 'react';
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
import { useAlert } from '@/app/alert/AlertProvider';

interface Admin {
  id: string;
  user_id?: string;
  email: string;
  role: string;
  full_name: string | null;
  username: string | null;
  is_active: boolean;
  is_master_admin: boolean;
}

interface EditAdminModalProps {
  visible: boolean;
  admin: Admin | null;
  onClose: () => void;
  onSuccess: () => void;
}

const EditAdminModal: React.FC<EditAdminModalProps> = ({ visible, admin, onClose, onSuccess }) => {
  const [role, setRole] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [loading, setLoading] = useState(false);
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [rolePickerVisible, setRolePickerVisible] = useState(false);
  const [rolesLoading, setRolesLoading] = useState(false);
  const [roleOptions, setRoleOptions] = useState<string[]>([]);
  const { showAlert } = useAlert();

  React.useEffect(() => {
    if (admin) {
      setRole(admin.role || '');
      setIsActive(admin.is_active);
    }
  }, [admin]);

  React.useEffect(() => {
    if (!visible) return;

    const loadRoleOptions = async () => {
      setRolesLoading(true);
      try {
        const { data, error } = await supabase
          .from('admins')
          .select('role')
          .not('role', 'is', null);

        if (error) throw error;

        const roles = Array.from(
          new Set(
            (data || [])
              .map((item) => (typeof item.role === 'string' ? item.role.trim() : ''))
              .filter((item) => item.length > 0)
          )
        ).sort((a, b) => a.localeCompare(b));

        if (admin?.role && admin.role.trim().length > 0 && !roles.includes(admin.role.trim())) {
          roles.unshift(admin.role.trim());
        }

        setRoleOptions(roles);
      } catch (error) {
        console.error('Error loading role options:', error);
        setRoleOptions(admin?.role ? [admin.role] : []);
      } finally {
        setRolesLoading(false);
      }
    };

    loadRoleOptions();
  }, [visible, admin?.role]);

  const handleUpdate = async () => {
    if (!admin) return;

    if (!role || role.trim().length === 0) {
      showAlert({
        title: 'Error',
        message: 'Role cannot be empty',
        type: 'error',
      });
      return;
    }

    setLoading(true);
    try {
      console.log('Calling update_admin_record function...');

      // Call stored procedure instead of direct update
      const { data, error } = await supabase.rpc('update_admin_record', {
        p_admin_id: admin.id,
        p_role: role.trim(),
        p_is_active: isActive,
      });

      console.log('Update response:', { data, error });

      if (error) {
        console.error('Update error details:', error);
        throw error;
      }

      showAlert({
        title: 'Success',
        message: 'Admin updated successfully',
        type: 'success',
      });
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error updating admin:', error);
      showAlert({
        title: 'Error',
        message: error.message || 'Failed to update admin. Check console for details.',
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = () => {
    if (!admin) return;
    setConfirmVisible(true);
  };

  if (!admin) return null;

  const displayName =
    admin.full_name && admin.full_name.trim().length > 0
      ? admin.full_name
      : admin.username && admin.username.trim().length > 0
      ? admin.username
      : admin.email.split('@')[0];

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.headerTitle}>Edit Admin</Text>
              <Text style={styles.headerSubtitle}>{displayName}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Content */}
          <View style={styles.content}>
            {/* Email (Read-only) */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Email</Text>
              <View style={styles.readOnlyField}>
                <Text style={styles.readOnlyText}>{admin.email}</Text>
              </View>
            </View>

            {/* Role Input */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Role *</Text>
              <TouchableOpacity
                style={styles.roleSelector}
                onPress={() => setRolePickerVisible(true)}
                activeOpacity={0.85}
              >
                <Text style={[styles.roleSelectorText, !role && styles.roleSelectorPlaceholder]}>
                  {role || 'Select a role'}
                </Text>
                {rolesLoading ? (
                  <ActivityIndicator size="small" color="#64748B" />
                ) : (
                  <Text style={styles.roleSelectorChevron}>▾</Text>
                )}
              </TouchableOpacity>
            </View>

            {/* Status Toggle */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Status</Text>
              <View style={styles.toggleContainer}>
                <TouchableOpacity
                  style={[styles.toggleButton, isActive && styles.toggleButtonActive]}
                  onPress={() => setIsActive(true)}
                >
                  <Text style={[styles.toggleButtonText, isActive && styles.toggleButtonTextActive]}>
                    Active
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.toggleButton, !isActive && styles.toggleButtonInactive]}
                  onPress={() => setIsActive(false)}
                >
                  <Text style={[styles.toggleButtonText, !isActive && styles.toggleButtonTextInactive]}>
                    Inactive
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Master Admin Warning */}
            {admin.is_master_admin && (
              <View style={styles.warningBox}>
                <Text style={styles.warningIcon}>⚠️</Text>
                <Text style={styles.warningText}>
                  This is a master admin. You cannot remove their master status.
                </Text>
              </View>
            )}
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <View style={styles.actionButtons}>
              <TouchableOpacity style={styles.cancelButton} onPress={onClose} disabled={loading}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.saveButton}
                onPress={handleUpdate}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.saveButtonText}>Save Changes</Text>
                )}
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.deleteButton}
              onPress={handleDelete}
              disabled={loading}
            >
              <Text style={styles.deleteButtonText}>🗑️ Remove Admin</Text>
            </TouchableOpacity>
          </View>
        </View>

        {confirmVisible && (
          <View style={styles.confirmOverlay}>
            <View style={styles.confirmCard}>
              <Text style={styles.confirmTitle}>Delete Admin</Text>
              <Text style={styles.confirmMessage}>
                Are you sure you want to remove {displayName} as an admin? This action cannot be undone.
              </Text>
              <View style={styles.confirmButtons}>
                <TouchableOpacity
                  style={[styles.confirmButton, styles.confirmCancelButton]}
                  onPress={() => setConfirmVisible(false)}
                  disabled={loading}
                >
                  <Text style={[styles.confirmButtonText, styles.confirmCancelText]}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.confirmButton, styles.confirmDeleteButton]}
                  onPress={async () => {
                    if (!admin) return;
                    setLoading(true);
                    try {
                      const { error } = await supabase.rpc('delete_admin_record', {
                        p_admin_id: admin.id,
                      });

                      if (error) throw error;

                      setConfirmVisible(false);
                      showAlert({
                        title: 'Success',
                        message: `Admin ${displayName} removed successfully`,
                        type: 'success',
                      });
                      onSuccess();
                      onClose();
                    } catch (error: any) {
                      console.error('Error deleting admin:', error);
                      showAlert({
                        title: 'Error',
                        message:
                          error.message ||
                          'Failed to remove admin. Make sure you are logged in as a master admin.',
                        type: 'error',
                      });
                    } finally {
                      setLoading(false);
                    }
                  }}
                  disabled={loading}
                >
                  <Text style={[styles.confirmButtonText, styles.confirmDeleteText]}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        <Modal
          visible={rolePickerVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setRolePickerVisible(false)}
        >
          <View style={styles.rolePickerOverlay}>
            <View style={styles.rolePickerCard}>
              <View style={styles.rolePickerHeader}>
                <Text style={styles.rolePickerTitle}>Select Role</Text>
                <TouchableOpacity
                  style={styles.rolePickerCloseButton}
                  onPress={() => setRolePickerVisible(false)}
                >
                  <Text style={styles.rolePickerCloseText}>✕</Text>
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.rolePickerList} showsVerticalScrollIndicator={false}>
                {roleOptions.length === 0 ? (
                  <View style={styles.rolePickerEmptyState}>
                    <Text style={styles.rolePickerEmptyText}>No roles found in admins table.</Text>
                  </View>
                ) : (
                  roleOptions.map((option) => {
                    const isSelected = option === role;
                    return (
                      <TouchableOpacity
                        key={option}
                        style={[styles.roleOption, isSelected && styles.roleOptionSelected]}
                        onPress={() => {
                          setRole(option);
                          setRolePickerVisible(false);
                        }}
                      >
                        <Text style={[styles.roleOptionText, isSelected && styles.roleOptionTextSelected]}>
                          {option}
                        </Text>
                        {isSelected ? <Text style={styles.roleOptionCheck}>✓</Text> : null}
                      </TouchableOpacity>
                    );
                  })
                )}
              </ScrollView>
            </View>
          </View>
        </Modal>
      </View>
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
    maxWidth: 500,
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
  headerSubtitle: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 2,
    fontWeight: '500',
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
  content: {
    padding: 24,
  },
  fieldGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 8,
  },
  readOnlyField: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  readOnlyText: {
    fontSize: 15,
    color: '#64748B',
    fontWeight: '500',
  },
  roleSelector: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  roleSelectorText: {
    fontSize: 15,
    color: '#0F172A',
    fontWeight: '500',
    flex: 1,
  },
  roleSelectorPlaceholder: {
    color: '#94A3B8',
  },
  roleSelectorChevron: {
    fontSize: 16,
    color: '#64748B',
    marginLeft: 8,
  },
  toggleContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
  },
  toggleButtonActive: {
    backgroundColor: '#ECFDF3',
    borderColor: '#10B981',
  },
  toggleButtonInactive: {
    backgroundColor: '#FEF2F2',
    borderColor: '#EF4444',
  },
  toggleButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },
  toggleButtonTextActive: {
    color: '#166534',
  },
  toggleButtonTextInactive: {
    color: '#991B1B',
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FCD34D',
    borderRadius: 8,
    padding: 12,
    marginTop: 4,
  },
  warningIcon: {
    fontSize: 18,
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    color: '#92400E',
    fontWeight: '500',
  },
  footer: {
    padding: 24,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  deleteButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#DC2626',
    borderWidth: 1,
    borderColor: '#B91C1C',
    marginTop: 18,
    alignItems: 'center',
  },
  deleteButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#475569',
  },
  saveButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#0F172A',
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  confirmOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  confirmCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 24,
  },
  confirmTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  confirmMessage: {
    fontSize: 14,
    color: '#4B5563',
    marginBottom: 18,
  },
  confirmButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  confirmButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 999,
    borderWidth: 1,
  },
  confirmCancelButton: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E5E7EB',
  },
  confirmDeleteButton: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  confirmButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  confirmCancelText: {
    color: '#4B5563',
  },
  confirmDeleteText: {
    color: '#B91C1C',
  },
  rolePickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  rolePickerCard: {
    width: '100%',
    maxWidth: 420,
    maxHeight: '70%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 24,
  },
  rolePickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  rolePickerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  rolePickerCloseButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rolePickerCloseText: {
    fontSize: 15,
    color: '#64748B',
    fontWeight: '700',
  },
  rolePickerList: {
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  roleOption: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  roleOptionSelected: {
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
  },
  roleOptionText: {
    fontSize: 14,
    color: '#334155',
    fontWeight: '600',
  },
  roleOptionTextSelected: {
    color: '#1D4ED8',
    fontWeight: '700',
  },
  roleOptionCheck: {
    fontSize: 14,
    color: '#1D4ED8',
    fontWeight: '800',
  },
  rolePickerEmptyState: {
    paddingVertical: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rolePickerEmptyText: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
    textAlign: 'center',
  },
});

export default EditAdminModal;
