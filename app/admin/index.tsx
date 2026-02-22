import React, { useState, useRef, useEffect } from 'react';
import { View, Text, Modal, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Image, Animated, Dimensions, useColorScheme } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';

// Helper function to validate email address
function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function formatCountdown(seconds: number) {
  const mins = Math.floor(seconds / 60)
    .toString()
    .padStart(2, '0');
  const secs = (seconds % 60).toString().padStart(2, '0');
  return `${mins}:${secs}`;
}

const AdminPage = () => {
  const [authVisible, setAuthVisible] = useState(true);
  const [adminEmail, setAdminEmail] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState('');
  const [otpCountdown, setOtpCountdown] = useState(0);
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const router = useRouter();

  const { width, height } = Dimensions.get('window');
  const anim1 = useRef(new Animated.Value(0)).current;
  const anim2 = useRef(new Animated.Value(0)).current;
  const anim3 = useRef(new Animated.Value(0)).current;
  const scheme = useColorScheme() || 'light';
  const isDark = scheme === 'dark';
  const colors = {
    bg: isDark ? '#0B0B0B' : '#FFFFFF',
    card: isDark ? '#18181b' : '#fff',
    border: isDark ? 'rgba(255,255,255,0.14)' : '#FF9900',
    text: isDark ? '#fff' : '#1e293b',
    sub: isDark ? '#B7BDC7' : '#64748b',
    inputBg: isDark ? 'rgba(255,255,255,0.08)' : '#f8fafc',
    inputText: isDark ? '#fff' : '#1e293b',
    button: '#FF9900',
    buttonText: '#000',
    error: '#ef4444',
  };

  useEffect(() => {
    if (isAdmin) return;

    const loop1 = Animated.loop(
      Animated.sequence([
        Animated.timing(anim1, { toValue: 1, duration: 6000, useNativeDriver: true }),
        Animated.timing(anim1, { toValue: 0, duration: 6000, useNativeDriver: true }),
      ])
    );
    const loop2 = Animated.loop(
      Animated.sequence([
        Animated.timing(anim2, { toValue: 1, duration: 8000, useNativeDriver: true }),
        Animated.timing(anim2, { toValue: 0, duration: 8000, useNativeDriver: true }),
      ])
    );
    const loop3 = Animated.loop(
      Animated.sequence([
        Animated.timing(anim3, { toValue: 1, duration: 10000, useNativeDriver: true }),
        Animated.timing(anim3, { toValue: 0, duration: 10000, useNativeDriver: true }),
      ])
    );

    loop1.start();
    loop2.start();
    loop3.start();

    return () => {
      loop1.stop();
      loop2.stop();
      loop3.stop();
    };
  }, [anim1, anim2, anim3, isAdmin]);

  useEffect(() => {
    if (!otpSent || isAdmin) return;
    if (otpCountdown <= 0) {
      setAuthError('OTP expired. Redirecting to onboarding...');
      router.replace('/onboarding');
      return;
    }

    const interval = setInterval(() => {
      setOtpCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [otpSent, otpCountdown, isAdmin, router]);

  const handleSendOtp = async () => {
    setAuthLoading(true);
    setAuthError('');
    try {
      const emailToUse = adminEmail.trim().toLowerCase();
      if (!isValidEmail(emailToUse)) {
        setAuthError('Please enter a valid email address.');
        setAuthLoading(false);
        return;
      }

      // Send OTP first, then enforce admin authorization after verify.
      // This avoids pre-auth queries against the admins table, which are blocked by RLS for anon users.
      const { error } = await supabase.auth.signInWithOtp({
        email: emailToUse,
        options: { shouldCreateUser: false },
      });
      if (error) {
        setAuthError('Failed to send OTP.');
        setAuthLoading(false);
        return;
      }
      setOtpSent(true);
      setOtpCountdown(120);
      setAuthError('OTP sent! Check your email for the code.');
    } catch {
      setAuthError('Failed to send OTP. Please try again.');
    }
    setAuthLoading(false);
  };

  const handleVerifyOtp = async () => {
    setAuthLoading(true);
    setAuthError('');
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email: adminEmail,
        token: otp,
        type: 'email',
      });
      if (error || !data?.user) {
        setAuthError('Invalid or expired OTP.');
        setTimeout(() => {
          router.replace('/onboarding');
        }, 1200);
        setAuthLoading(false);
        return;
      }
      // Check admins table for user_id and is_active
      const { data: adminRecord, error: adminError } = await supabase
        .from('admins')
        .select('id, is_active')
        .eq('user_id', data.user.id)
        .single();
      if (adminError || !adminRecord) {
        sessionStorage.removeItem('admin_authenticated');
        setAuthError('Access Denied: Not an admin');
        router.replace('/onboarding');
        setAuthLoading(false);
        return;
      }
      // Check if admin is active
      if (!adminRecord.is_active) {
        sessionStorage.removeItem('admin_authenticated');
        setAuthError('Your admin account has been deactivated. Contact the master admin.');
        setTimeout(() => {
          router.replace('/onboarding');
        }, 3000);
        setAuthLoading(false);
        return;
      }
      sessionStorage.setItem('admin_authenticated', 'true');
      setIsAdmin(true);
      setAuthVisible(false);
      setAuthError('');
      router.replace('/admin/dashboard');
    } catch {
      setAuthError('Failed to verify OTP. Please try again.');
    }
    setAuthLoading(false);
  };

  if (!isAdmin) {
    return (
      <Modal visible={authVisible} animationType="fade" transparent>
        <View style={[styles.modalOverlay, { backgroundColor: isDark ? 'rgba(11,11,11,0.85)' : 'rgba(30,41,59,0.75)' }] }>
          {/* Animated colorful blobs and gradient */}
          <View style={StyleSheet.absoluteFill} pointerEvents="none">
            <LinearGradient
              colors={isDark ? ['#0B0B0B', '#121212', '#0B0B0B'] : ['#FFFFFF', '#FFF6EC', '#FFFFFF']}
              style={StyleSheet.absoluteFillObject}
            />
            <Animated.View
              style={[styles.blob, {
                backgroundColor: '#FFB347',
                opacity: 0.35,
                width: width * 0.8,
                height: width * 0.8,
                top: -width * 0.2,
                left: -width * 0.2,
                transform: [
                  { scale: anim1.interpolate({ inputRange: [0, 1], outputRange: [1, 1.15] }) },
                  { rotate: anim1.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '20deg'] }) },
                ],
              }]} />
            <Animated.View
              style={[styles.blob, {
                backgroundColor: '#6DD5FA',
                opacity: 0.28,
                width: width * 0.7,
                height: width * 0.7,
                bottom: -width * 0.15,
                right: -width * 0.1,
                transform: [
                  { scale: anim2.interpolate({ inputRange: [0, 1], outputRange: [1, 1.12] }) },
                  { rotate: anim2.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '-15deg'] }) },
                ],
              }]} />
            <Animated.View
              style={[styles.blob, {
                backgroundColor: '#FF5F6D',
                opacity: 0.22,
                width: width * 0.6,
                height: width * 0.6,
                top: height * 0.45,
                left: width * 0.15,
                transform: [
                  { scale: anim3.interpolate({ inputRange: [0, 1], outputRange: [1, 1.18] }) },
                  { rotate: anim3.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '12deg'] }) },
                ],
              }]} />
          </View>
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }] }>
            <Image source={{ uri: 'https://image2url.com/images/1764506443183-2ff76663-c119-4f05-93b4-d08e42895442.png' }} style={styles.logo} />
            <Text style={[styles.title, { color: colors.text }]}>Admin Portal</Text>
            <Text style={[styles.subtitle, { color: colors.sub }]}>Sign in to access the dashboard</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.inputBg, color: colors.inputText }]}
              placeholder="Admin Email"
              value={adminEmail}
              onChangeText={setAdminEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              editable={!authLoading && !otpSent}
              placeholderTextColor="#b0b0b0"
            />
            {otpSent && (
              <>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.inputBg, color: colors.inputText }]}
                  placeholder="Enter OTP"
                  value={otp}
                  onChangeText={setOtp}
                  keyboardType="number-pad"
                  maxLength={6}
                  editable={!authLoading}
                  placeholderTextColor="#b0b0b0"
                />
                <Text style={[styles.countdownText, { color: colors.sub }]}>OTP expires in {formatCountdown(otpCountdown)}</Text>
              </>
            )}
            {authError ? <Text style={styles.error}>{authError}</Text> : null}
            <View style={{ width: '100%', marginTop: 8 }}>
              {!otpSent ? (
                <TouchableOpacity
                  style={[
                    styles.primaryButton,
                    { backgroundColor: (authLoading || !isValidEmail(adminEmail)) ? '#FFD580' : colors.button, opacity: (authLoading || !isValidEmail(adminEmail)) ? 0.7 : 1 }
                  ]}
                  onPress={handleSendOtp}
                  disabled={authLoading || !isValidEmail(adminEmail)}
                >
                  {authLoading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={[styles.primaryButtonText, { color: colors.buttonText, opacity: (authLoading || !isValidEmail(adminEmail)) ? 0.6 : 1 }]}>Send OTP</Text>
                  )}
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={[styles.primaryButton, { backgroundColor: colors.button }]}
                  onPress={handleVerifyOtp}
                  disabled={authLoading || otp.length !== 6}
                >
                  {authLoading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={[styles.primaryButtonText, { color: colors.buttonText }]}>Verify OTP</Text>
                  )}
                </TouchableOpacity>
              )}
              <TouchableOpacity onPress={() => router.replace('/onboarding')} style={styles.cancelBtn}>
                <Text style={[styles.cancelText, { color: colors.sub }]}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text style={{ fontSize: 24, fontWeight: 'bold' }}>Admin Control Panel</Text>
      <Text style={{ fontSize: 16, marginTop: 12 }}>Login to access the dashboard.</Text>
    </View>
  );
};

const styles = StyleSheet.create({
    blob: {
      position: 'absolute',
      borderRadius: 9999,
    },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(30, 41, 59, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 24,
    paddingVertical: 36,
    paddingHorizontal: 32,
    width: 350,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 12,
    borderWidth: 2,
    borderColor: '#FF9900',
  },
  logo: {
    width: 64,
    height: 64,
    borderRadius: 16,
    marginBottom: 16,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 15,
    color: '#64748b',
    marginBottom: 24,
    fontWeight: '500',
    textAlign: 'center',
  },
  input: {
    width: '100%',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
    fontSize: 16,
    backgroundColor: '#f8fafc',
    color: '#1e293b',
  },
  primaryButton: {
    backgroundColor: '#FF9900',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    width: '100%',
    marginBottom: 8,
    shadowColor: '#FF9900',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 2,
  },
  primaryButtonText: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 17,
    letterSpacing: 0.2,
  },
  error: {
    color: '#ef4444',
    marginBottom: 8,
    fontWeight: '500',
    textAlign: 'center',
  },
  cancelBtn: {
    marginTop: 2,
    alignSelf: 'center',
  },
  cancelText: {
    color: '#64748b',
    fontSize: 15,
    fontWeight: '500',
    marginTop: 2,
  },
  countdownText: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: -6,
    marginBottom: 12,
    alignSelf: 'flex-start',
  },
});

export default AdminPage;