import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { supabase } from '@/lib/supabase';

interface AddAdminModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const AddAdminModal: React.FC<AddAdminModalProps> = ({ visible, onClose, onSuccess }) => {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [emailVerified, setEmailVerified] = useState(false);
  const [verifiedUserId, setVerifiedUserId] = useState<string | null>(null);
  const [verifiedFullName, setVerifiedFullName] = useState<string | null>(null);

  const isValidEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const handleVerifyEmail = async () => {
    setError('');
    setSuccess('');

    // Validation
    if (!email.trim()) {
      setError('Email is required');
      return;
    }
    if (!isValidEmail(email)) {
      setError('Please enter a valid email address');
      return;
    }

    setLoading(true);

    try {
      // Check if email already exists in admins table
      const { data: existingAdmin } = await supabase
        .from('admins')
        .select('id')
        .ilike('email', email.trim())
        .single();

      if (existingAdmin) {
        setError('This email is already registered as an admin');
        setLoading(false);
        return;
      }

      // Check if user exists and is authenticated by looking up in user_profiles
      const { data: userProfile } = await supabase
        .from('user_profiles')
        .select('id, email, full_name')
        .ilike('email', email.trim())
        .single();

      if (!userProfile) {
        setError('No authenticated user found with this email. The user must create an account first.');
        setLoading(false);
        return;
      }

      // Email verified successfully
      setEmailVerified(true);
      setVerifiedUserId(userProfile.id);
      setVerifiedFullName(userProfile.full_name || null);
      setSuccess('Email verified! Now add a role for this admin.');
      setLoading(false);
    } catch (err) {
      console.error('Error verifying email:', err);
      setError('An unexpected error occurred while verifying email');
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    setError('');
    setSuccess('');

    if (!emailVerified || !verifiedUserId) {
      setError('Please verify the email first');
      return;
    }

    if (!role.trim()) {
      setError('Role is required');
      return;
    }

    setLoading(true);

    try {
      // Call stored procedure to insert new admin (RLS policy will verify current user is master admin)
      const { data, error: insertError } = await supabase.rpc('insert_admin_record', {
        p_user_id: verifiedUserId,
        p_email: email.trim().toLowerCase(),
        p_role: role.trim(),
      });

      if (insertError) {
        console.error('Insert error:', insertError);
        setError('Failed to add admin. You may not have permission to perform this action.');
        setLoading(false);
        return;
      }

      setSuccess('Admin added successfully!');
      
      // Reset form
      setTimeout(() => {
        setEmail('');
        setRole('');
        setEmailVerified(false);
        setVerifiedUserId(null);
        setVerifiedFullName(null);
        setSuccess('');
        setLoading(false);
        onSuccess?.();
        onClose();
      }, 1500);
    } catch (err) {
      console.error('Error adding admin:', err);
      setError('An unexpected error occurred');
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setEmail('');
      setRole('');
      setEmailVerified(false);
      setVerifiedUserId(null);
      setVerifiedFullName(null);
      setError('');
      setSuccess('');
      onClose();
    }
  };

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <View style={styles.header}>
            <Text style={styles.title}>Add New Admin</Text>
            <TouchableOpacity onPress={handleClose} disabled={loading} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.form} showsVerticalScrollIndicator={false}>
            <Text style={styles.description}>
              {!emailVerified
                ? 'Enter the email address of the user you want to make an admin. The user must already have an account.'
                : 'Email verified! Now assign a role to this admin.'}
            </Text>

            <Text style={styles.label}>
              Email <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={[styles.input, emailVerified && styles.inputDisabled]}
              placeholder="admin@example.com"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              editable={!loading && !emailVerified}
              placeholderTextColor="#94A3B8"
            />

            {emailVerified && (
              <>
                <Text style={styles.label}>
                  Role <Text style={styles.required}>*</Text>
                </Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g., Content Manager, Support Admin, Developer"
                  value={role}
                  onChangeText={setRole}
                  editable={!loading}
                  placeholderTextColor="#94A3B8"
                />
              </>
            )}

            {error ? <Text style={styles.errorText}>{error}</Text> : null}
            {success ? <Text style={styles.successText}>{success}</Text> : null}
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.cancelButton, loading && styles.buttonDisabled]}
              onPress={handleClose}
              disabled={loading}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            
            {!emailVerified ? (
              <TouchableOpacity
                style={[styles.submitButton, loading && styles.buttonDisabled]}
                onPress={handleVerifyEmail}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.submitButtonText}>Add Email</Text>
                )}
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.submitButton, (loading || !role.trim()) && styles.buttonDisabled]}
                onPress={handleSubmit}
                disabled={loading || !role.trim()}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.submitButtonText}>Add Admin</Text>
                )}
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modal: {
    width: '100%',
    maxWidth: 500,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.25,
    shadowRadius: 40,
    elevation: 20,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  title: {
    fontSize: 20,
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
  form: {
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  description: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 16,
    lineHeight: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 8,
    marginTop: 12,
  },
  required: {
    color: '#EF4444',
  },
  input: {
    width: '100%',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    backgroundColor: '#F8FAFC',
    color: '#0F172A',
  },
  inputDisabled: {
    backgroundColor: '#F1F5F9',
    color: '#94A3B8',
  },
  errorText: {
    color: '#EF4444',
    fontSize: 13,
    fontWeight: '600',
    marginTop: 16,
    textAlign: 'center',
  },
  successText: {
    color: '#10B981',
    fontSize: 13,
    fontWeight: '600',
    marginTop: 16,
    textAlign: 'center',
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 24,
    paddingBottom: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#475569',
  },
  submitButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#0F172A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
});

export default AddAdminModal;
