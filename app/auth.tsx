'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'react-hot-toast';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  ScrollView, 
  StyleSheet, 
  ImageBackground, 
  KeyboardAvoidingView, 
  Platform, 
  Modal, 
  TouchableWithoutFeedback,
  useColorScheme,
  useWindowDimensions,
  StatusBar 
} from 'react-native';
import { MaterialIcons, MaterialCommunityIcons, Feather } from '@expo/vector-icons';

// ──────────────────────────────────────────────────────────────
// Images & Config
// ──────────────────────────────────────────────────────────────
const LOGO_URL = 'https://image2url.com/images/1764506443183-2ff76663-c119-4f05-93b4-d08e42895442.png';
const BACKGROUND_IMAGE_URL = 'https://images.pexels.com/photos/1087727/pexels-photo-1087727.jpeg';
const DARK_BACKGROUND_IMAGE_URL = 'https://images.pexels.com/photos/33545/sunrise-phu-quoc-island-ocean.jpg';

const GHANA_UNIVERSITIES = [
  'University of Ghana',
  'Kwame Nkrumah University of Science and Technology',
  'University of Cape Coast',
  'University of Education, Winneba',
  'University for Development Studies',
  'University of Energy and Natural Resources',
  'University of Mines and Technology',
  'University of Health and Allied Sciences',
  'Ghana Institute of Management and Public Administration',
  'University of Professional Studies, Accra',
  'Accra Technical University',
  'Kumasi Technical University',
  'Takoradi Technical University',
  'Ho Technical University',
  'Cape Coast Technical University',
  'Bolgatanga Technical University',
  'Koforidua Technical University',
  'Tamale Technical University',
  'Sunyani Technical University',
  'Regent University College of Science and Technology',
  'Ashesi University',
  'Central University',
  'Valley View University',
  'Pentecost University',
  'Methodist University College Ghana',
  'Presbyterian University College, Ghana',
  'Catholic University College of Ghana',
  'Christian Service University College',
  'Wisconsin International University College, Ghana',
  'Lancaster University Ghana',
  'Academic City University College',
  'Radford University College',
].sort();

// ──────────────────────────────────────────────────────────────
// Password Strength
// ──────────────────────────────────────────────────────────────
const PASSWORD_REQUIREMENTS = [
  { key: 'length', label: '8+ Characters' },
  { key: 'uppercase', label: 'Uppercase (A-Z)' },
  { key: 'lowercase', label: 'Lowercase (a-z)' },
  { key: 'number', label: 'Number (0-9)' },
  { key: 'special', label: 'Special Char (!@#...)' },
];

const checkPasswordStrength = (password: string) => {
  const checks: Record<string, boolean> = {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /\d/.test(password),
    special: /[!@#$%^&*(),.?":{}|<>]/.test(password),
  };

  const passed = Object.values(checks).filter(Boolean).length;
  let strength = 'Weak', color = '#ef4444', width = '25%';

  if (passed >= 5) { strength = 'Strong'; color = '#10b981'; width = '100%'; }
  else if (passed >= 4) { strength = 'Good'; color = '#f59e0b'; width = '75%'; }
  else if (passed >= 3) { strength = 'Fair'; color = '#f97316'; width = '50%'; }

  return { strength, color, width, checks, passed };
};

// Username validation
const validateUsername = (username: string) => {
  const trimmed = username.trim();
  if (trimmed.length < 3) return { valid: false, message: 'Username must be at least 3 characters' };
  if (trimmed.length > 20) return { valid: false, message: 'Username must be less than 20 characters' };
  return { valid: true, message: '' };
};

// ──────────────────────────────────────────────────────────────
// Main Component
// ──────────────────────────────────────────────────────────────
const AuthPage = () => {
  const router = useRouter();
  const colorScheme = useColorScheme() || 'light';
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [university, setUniversity] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendTimer, setResendTimer] = useState(0);
  const [strength, setStrength] = useState<any>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [universitySearch, setUniversitySearch] = useState('');
  const [showUniversityModal, setShowUniversityModal] = useState(false);
  const [isForgot, setIsForgot] = useState(false);
  const [forgotStep, setForgotStep] = useState<'request' | 'verify' | 'reset'>('request');
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotOtp, setForgotOtp] = useState('');
  const [forgotNewPassword, setForgotNewPassword] = useState('');
  const [forgotConfirmPassword, setForgotConfirmPassword] = useState('');
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [showForgotConfirmPassword, setShowForgotConfirmPassword] = useState(false);
  const [forgotResendTimer, setForgotResendTimer] = useState(0);

  const isDarkMode = colorScheme === 'dark';
  const { width: screenWidth } = useWindowDimensions();
  const contentWidth = Math.max(Math.min(screenWidth - 40, 520), 280);

  // Colors based on theme
  const colors = {
    primary: '#ef4444',
    primaryLight: '#fca5a5',
    primaryDark: '#dc2626',
    background: isDarkMode ? '#0f172a' : '#ffffff',
    card: isDarkMode ? '#1e293b' : 'rgba(255, 255, 255, 0.95)',
    text: isDarkMode ? '#f1f5f9' : '#1f2937',
    textSecondary: isDarkMode ? '#94a3b8' : '#6b7280',
    border: isDarkMode ? '#334155' : '#d1d5db',
    inputBg: isDarkMode ? '#1e293b' : '#f9fafb',
    errorBg: isDarkMode ? '#7f1d1d' : '#fee2e2',
    errorText: isDarkMode ? '#fecaca' : '#b91c1c',
    success: isDarkMode ? '#34d399' : '#10b981',
    warning: isDarkMode ? '#fbbf24' : '#f59e0b',
    overlay: isDarkMode ? 'rgba(15, 23, 42, 0.9)' : 'rgba(0, 0, 0, 0.7)',
    modalBg: isDarkMode ? '#1e293b' : '#ffffff',
    modalOverlay: isDarkMode ? 'rgba(0, 0, 0, 0.8)' : 'rgba(0, 0, 0, 0.5)',
    selectedUniversityBg: isDarkMode ? '#064e3b' : '#d1fae5',
    selectedUniversityText: isDarkMode ? '#a7f3d0' : '#065f46',
    passwordStrengthBg: isDarkMode ? '#1e293b' : '#f9fafb',
    divider: isDarkMode ? '#334155' : '#e5e7eb',
  };

  const resetForm = () => {
    setEmail('');
    setUsername('');
    setPassword('');
    setConfirmPassword('');
    setUniversity('');
    setOtp('');
    setOtpSent(false);
    setError(null);
    setResendTimer(0);
    setStrength(null);
    setUsernameAvailable(null);
    setUniversitySearch('');
    setIsForgot(false);
    setForgotStep('request');
    setForgotEmail('');
    setForgotOtp('');
    setForgotNewPassword('');
    setForgotConfirmPassword('');
    setShowForgotPassword(false);
    setShowForgotConfirmPassword(false);
    setForgotResendTimer(0);
  };

  // Timer
  useEffect(() => {
    if (resendTimer > 0) {
      const t = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
      return () => clearTimeout(t);
    }
  }, [resendTimer]);

  useEffect(() => {
    if (forgotResendTimer > 0) {
      const t = setTimeout(() => setForgotResendTimer(forgotResendTimer - 1), 1000);
      return () => clearTimeout(t);
    }
  }, [forgotResendTimer]);

  // Password strength
  useEffect(() => {
    if (!isLogin && password) setStrength(checkPasswordStrength(password));
    else setStrength(null);
  }, [password, isLogin]);

  // Check username availability against the username column
  useEffect(() => {
    const checkUsername = async () => {
      if (!username || isLogin) return;
      
      const validation = validateUsername(username);
      if (!validation.valid) {
        setUsernameAvailable(false);
        setError(validation.message);
        return;
      }

      setCheckingUsername(true);
      try {
        // Check if username exists in the username column
        const { data, error } = await supabase
          .from('user_profiles')
          .select('id')
          .eq('username', username)
          .maybeSingle();

        if (error) throw error;
        
        if (data) {
          setUsernameAvailable(false);
          setError('Username already taken. Please choose another.');
        } else {
          setUsernameAvailable(true);
          setError(null);
        }
      } catch (err) {
        console.error('Error checking username:', err);
      } finally {
        setCheckingUsername(false);
      }
    };

    const debounce = setTimeout(checkUsername, 500);
    return () => clearTimeout(debounce);
  }, [username, isLogin]);

  // Abbreviation mapping (copied from onboarding)
  const UNIVERSITY_ABBREVIATIONS = {
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

  // Helper to get acronym from university name, skipping stopwords
  const ACRONYM_STOPWORDS = new Set(['of', 'for', 'and', 'the', 'in', 'at', 'on']);
  function getAcronym(name) {
    return name
      .split(/\s+/)
      .filter((w) => /[A-Za-z]/.test(w[0]) && !ACRONYM_STOPWORDS.has(w.toLowerCase()))
      .map((w) => w[0].toUpperCase())
      .join('');
  }

  const filteredUniversities = useMemo(() => {
    const q = universitySearch.trim().toLowerCase();
    if (!q) return GHANA_UNIVERSITIES;
    // Check if the search matches a known abbreviation
    const abbrMatch = Object.entries(UNIVERSITY_ABBREVIATIONS).find(
      ([abbr, name]) => abbr.toLowerCase() === q
    );
    if (abbrMatch) {
      return [abbrMatch[1]];
    }
    return GHANA_UNIVERSITIES.filter((u) => {
      const name = u.toLowerCase();
      const acronym = getAcronym(u).toLowerCase();
      return name.includes(q) || acronym.includes(q);
    });
  }, [universitySearch]);

  const isEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)

  // ──────── Step 1: Send OTP ────────
  const handleSubmitCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (!isEmail(email)) {
      setError('Please use a valid Email address (e.g. name@gmail.com)');
      setLoading(false);
      return;
    }

    if (!isLogin && !usernameAvailable) {
      setError('Please choose an available username');
      setLoading(false);
      return;
    }

    try {
      await AsyncStorage.setItem('otp_pending', 'true');

      if (isLogin) {
        // Login flow: password + OTP
        const { error: pwError } = await supabase.auth.signInWithPassword({ email, password });
        if (pwError) throw pwError;

        const { error: otpError } = await supabase.auth.signInWithOtp({
          email,
          options: { emailRedirectTo: window.location.origin },
        });
        if (otpError) throw otpError;
      } else {
        // Signup flow
        if (password !== confirmPassword) throw new Error('Passwords do not match');
        if (!strength || !['Good', 'Strong'].includes(strength.strength))
          throw new Error('Password must be Good or Strong');
        if (!university) throw new Error('Please select your university');
        if (!username || !usernameAvailable) throw new Error('Please choose a valid username');

        const { error } = await supabase.auth.signInWithOtp({
          email,
          options: {
            shouldCreateUser: true,
            emailRedirectTo: window.location.origin,
            data: {
              username: username, // Store username in auth metadata
              university: university,
            }
          },
        });
        if (error) throw error;
      }

      setOtpSent(true);
      setResendTimer(120);
      toast.success(isLogin ? 'OTP sent!' : 'Check your email to continue', {
        style: {
          background: isDarkMode ? '#1e293b' : '#ffffff',
          color: isDarkMode ? '#f1f5f9' : '#1f2937',
        },
        iconTheme: {
          primary: colors.primary,
          secondary: isDarkMode ? '#1e293b' : '#ffffff',
        },
      });
    } catch (err: any) {
      await AsyncStorage.removeItem('otp_pending');
      setError(err.message);
      toast.error(err.message, {
        style: {
          background: isDarkMode ? '#1e293b' : '#ffffff',
          color: isDarkMode ? '#f1f5f9' : '#1f2937',
        },
        iconTheme: {
          primary: colors.errorText,
          secondary: isDarkMode ? '#1e293b' : '#ffffff',
        },
      });
    } finally {
      setLoading(false);
    }
  };

  // ──────── Step 2: Verify OTP & Finalize ────────
  const verifyOtp = async () => {
    if (otp.length !== 6) {
      setError('Enter the full 6-digit code');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token: otp,
        type: 'email',
      });

      if (error) throw error;

      if (data.session && data.user) {
        if (!isLogin) {
          // Save profile data with username in the username column
          const { error: profileError } = await supabase
            .from('user_profiles')
            .upsert({
              id: data.user.id,
              username: username, // Save to username column
              university: university,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            });

          if (profileError) {
            console.error('Failed to save profile:', profileError);
            throw profileError;
          }

          // Set password
          const { error: pwdError } = await supabase.auth.updateUser({
            password,
          });
          if (pwdError) throw pwdError;

          toast.success('Account created successfully!', {
            style: {
              background: isDarkMode ? '#1e293b' : '#ffffff',
              color: isDarkMode ? '#f1f5f9' : '#1f2937',
            },
            iconTheme: {
              primary: colors.success,
              secondary: isDarkMode ? '#1e293b' : '#ffffff',
            },
          });
        } else {
          toast.success('Welcome back!', {
            style: {
              background: isDarkMode ? '#1e293b' : '#ffffff',
              color: isDarkMode ? '#f1f5f9' : '#1f2937',
            },
            iconTheme: {
              primary: colors.success,
              secondary: isDarkMode ? '#1e293b' : '#ffffff',
            },
          });
        }

        await AsyncStorage.removeItem('otp_pending');
        router.replace('/(tabs)');
        resetForm();
      } else {
        toast.success('Email verified! You can now log in.', {
          style: {
            background: isDarkMode ? '#1e293b' : '#ffffff',
            color: isDarkMode ? '#f1f5f9' : '#1f2937',
          },
          iconTheme: {
            primary: colors.success,
            secondary: isDarkMode ? '#1e293b' : '#ffffff',
          },
        });
        setIsLogin(true);
        setOtpSent(false);
      }
    } catch (err: any) {
      setError(err.message || 'Invalid or expired OTP');
      toast.error(err.message || 'Invalid or expired OTP', {
        style: {
          background: isDarkMode ? '#1e293b' : '#ffffff',
          color: isDarkMode ? '#f1f5f9' : '#1f2937',
        },
        iconTheme: {
          primary: colors.errorText,
          secondary: isDarkMode ? '#1e293b' : '#ffffff',
        },
      });
    } finally {
      setLoading(false);
    }
  };

  // ──────── Forgot Password ────────
  const handleForgotPassword = async () => {
    setIsForgot(true);
    setForgotStep('request');
    setForgotEmail(email); // prefill if already typed
    setForgotOtp('');
    setForgotNewPassword('');
    setForgotConfirmPassword('');
    setError(null);
  };

  const submitForgotEmail = async () => {
    if (!forgotEmail || !isEmail(forgotEmail)) {
      setError('Enter a valid email to reset your password');
      return;
    }

    setLoading(true);
    try {
      // Set flag to prevent auto-redirect during password reset
      await AsyncStorage.setItem('password_reset_flow', 'true');

      const { error } = await supabase.auth.signInWithOtp({
        email: forgotEmail,
        options: {
          emailRedirectTo: window.location.origin,
          shouldCreateUser: false,
        },
      });

      if (error) throw error;

      setForgotStep('verify');
      setForgotResendTimer(120);
      toast.success('OTP sent to your email', {
        style: {
          background: isDarkMode ? '#1e293b' : '#ffffff',
          color: isDarkMode ? '#f1f5f9' : '#1f2937',
        },
        iconTheme: {
          primary: colors.success,
          secondary: isDarkMode ? '#1e293b' : '#ffffff',
        },
      });
    } catch (err: any) {
      setError(err.message || 'Unable to send OTP');
      toast.error(err.message || 'Unable to send OTP', {
        style: {
          background: isDarkMode ? '#1e293b' : '#ffffff',
          color: isDarkMode ? '#f1f5f9' : '#1f2937',
        },
        iconTheme: {
          primary: colors.errorText,
          secondary: isDarkMode ? '#1e293b' : '#ffffff',
        },
      });
    } finally {
      setLoading(false);
    }
  };

  const resendForgotOtp = async () => {
    if (!forgotEmail || !isEmail(forgotEmail)) return;

    const { error } = await supabase.auth.signInWithOtp({
      email: forgotEmail,
      options: {
        emailRedirectTo: window.location.origin,
        shouldCreateUser: false,
      },
    });

    if (error) {
      toast.error(error.message, {
        style: {
          background: isDarkMode ? '#1e293b' : '#ffffff',
          color: isDarkMode ? '#f1f5f9' : '#1f2937',
        },
        iconTheme: {
          primary: colors.errorText,
          secondary: isDarkMode ? '#1e293b' : '#ffffff',
        },
      });
    } else {
      setForgotResendTimer(120);
      toast.success('New OTP sent!', {
        style: {
          background: isDarkMode ? '#1e293b' : '#ffffff',
          color: isDarkMode ? '#f1f5f9' : '#1f2937',
        },
        iconTheme: {
          primary: colors.success,
          secondary: isDarkMode ? '#1e293b' : '#ffffff',
        },
      });
    }
  };

  const verifyForgotOtp = async () => {
    if (forgotOtp.length !== 6) {
      setError('Enter the full 6-digit code');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email: forgotEmail,
        token: forgotOtp,
        type: 'email',
      });

      if (error) throw error;

      // Store session temporarily for password reset but don't activate it yet
      if (data.session) {
        await AsyncStorage.setItem('temp_reset_session', JSON.stringify(data.session));
      }

      setForgotStep('reset');
      toast.success('Email verified! Set a new password.', {
        style: {
          background: isDarkMode ? '#1e293b' : '#ffffff',
          color: isDarkMode ? '#f1f5f9' : '#1f2937',
        },
        iconTheme: {
          primary: colors.success,
          secondary: isDarkMode ? '#1e293b' : '#ffffff',
        },
      });
    } catch (err: any) {
      setError(err.message || 'Invalid or expired OTP');
      toast.error(err.message || 'Invalid or expired OTP', {
        style: {
          background: isDarkMode ? '#1e293b' : '#ffffff',
          color: isDarkMode ? '#f1f5f9' : '#1f2937',
        },
        iconTheme: {
          primary: colors.errorText,
          secondary: isDarkMode ? '#1e293b' : '#ffffff',
        },
      });
    } finally {
      setLoading(false);
    }
  };

  const submitForgotReset = async () => {
    if (!forgotNewPassword || forgotNewPassword !== forgotConfirmPassword) {
      setError('Passwords must match');
      return;
    }

    const strengthCheck = checkPasswordStrength(forgotNewPassword);
    if (!['Good', 'Strong'].includes(strengthCheck.strength)) {
      setError('Choose a stronger password (Good or Strong)');
      return;
    }

    setLoading(true);
    try {
      // Retrieve the stored session and set it to update the password
      const storedSession = await AsyncStorage.getItem('temp_reset_session');
      if (!storedSession) {
        throw new Error('Session expired. Please try again.');
      }

      const session = JSON.parse(storedSession);
      const { data: sessionData, error: sessionError } = await supabase.auth.setSession(session);
      
      if (sessionError) throw sessionError;

      // Wait a moment for the session to be fully set
      await new Promise(resolve => setTimeout(resolve, 500));

      const { error } = await supabase.auth.updateUser({
        password: forgotNewPassword,
      });

      if (error) throw error;

      // Clear the temporary session and password reset flag
      await AsyncStorage.removeItem('temp_reset_session');
      await AsyncStorage.removeItem('password_reset_flow');

      // Sign out after password reset
      await supabase.auth.signOut();

      toast.success('Password updated! You can log in now.', {
        style: {
          background: isDarkMode ? '#1e293b' : '#ffffff',
          color: isDarkMode ? '#f1f5f9' : '#1f2937',
        },
        iconTheme: {
          primary: colors.success,
          secondary: isDarkMode ? '#1e293b' : '#ffffff',
        },
      });

      setIsForgot(false);
      setForgotStep('request');
      setForgotEmail('');
      setForgotOtp('');
      setForgotNewPassword('');
      setForgotConfirmPassword('');
      setShowForgotPassword(false);
      setShowForgotConfirmPassword(false);
      setForgotResendTimer(0);
      setIsLogin(true);
    } catch (err: any) {
      setError(err.message || 'Unable to update password');
      toast.error(err.message || 'Unable to update password', {
        style: {
          background: isDarkMode ? '#1e293b' : '#ffffff',
          color: isDarkMode ? '#f1f5f9' : '#1f2937',
        },
        iconTheme: {
          primary: colors.errorText,
          secondary: isDarkMode ? '#1e293b' : '#ffffff',
        },
      });
    } finally {
      setLoading(false);
    }
  };

  // ──────── Resend OTP ────────
  const resendOtp = async () => {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin },
    });

    if (error) {
      toast.error(error.message, {
        style: {
          background: isDarkMode ? '#1e293b' : '#ffffff',
          color: isDarkMode ? '#f1f5f9' : '#1f2937',
        },
        iconTheme: {
          primary: colors.errorText,
          secondary: isDarkMode ? '#1e293b' : '#ffffff',
        },
      });
    } else {
      setResendTimer(60);
      toast.success('New OTP sent!', {
        style: {
          background: isDarkMode ? '#1e293b' : '#ffffff',
          color: isDarkMode ? '#f1f5f9' : '#1f2937',
        },
        iconTheme: {
          primary: colors.success,
          secondary: isDarkMode ? '#1e293b' : '#ffffff',
        },
      });
    }
  };

  // ──────── Styles ────────
  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    background: {
      flex: 1,
      justifyContent: 'center',
      padding: 20,
    },
    overlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: colors.overlay,
    },
    content: {
      alignSelf: 'center',
      width: contentWidth,
    },
    card: {
      width: '100%',
      backgroundColor: colors.card,
      borderRadius: 20,
      padding: 24,
      shadowColor: isDarkMode ? '#000' : '#000',
      shadowOffset: {
        width: 0,
        height: 10,
      },
      shadowOpacity: isDarkMode ? 0.3 : 0.1,
      shadowRadius: 20,
      elevation: 10,
      borderWidth: 1,
      borderColor: isDarkMode ? colors.border : 'rgba(255, 255, 255, 0.2)',
    },
    logoContainer: {
      alignItems: 'center',
      marginBottom: 24,
    },
    logoWrapper: {
      width: 70,
      height: 70,
      borderRadius: 35,
      backgroundColor: isDarkMode ? '#334155' : '#f9fafb',
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 12,
      overflow: 'hidden',
    },
    logo: {
      width: 56,
      height: 56,
      resizeMode: 'contain',
    },
    title: {
      fontSize: 24,
      fontWeight: '800',
      color: colors.text,
      textAlign: 'center',
    },
    subtitle: {
      fontSize: 14,
      color: colors.textSecondary,
      textAlign: 'center',
      marginTop: 4,
    },
    errorContainer: {
      backgroundColor: colors.errorBg,
      borderWidth: 1,
      borderColor: isDarkMode ? '#7f1d1d' : '#fecaca',
      borderRadius: 12,
      padding: 12,
      marginBottom: 20,
      flexDirection: 'row',
      alignItems: 'center',
    },
    errorText: {
      color: colors.errorText,
      fontSize: 13,
      marginLeft: 8,
      flex: 1,
    },
    inputContainer: {
      marginBottom: 16,
    },
    inputLabel: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 8,
      flexDirection: 'row',
      alignItems: 'center',
    },
    inputWrapper: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.inputBg,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      overflow: 'hidden',
      width: '100%',
    },
    input: {
      flex: 1,
      paddingHorizontal: 10,
      paddingVertical: 14,
      fontSize: 15,
      color: colors.text,
      minWidth: 0, // allow shrink on small screens so icons stay visible
    },
    icon: {
      paddingHorizontal: 12,
    },
    eyeIcon: {
      paddingHorizontal: 10,
    },
    passwordStrengthContainer: {
      backgroundColor: colors.passwordStrengthBg,
      borderRadius: 12,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: 16,
    },
    strengthHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
    },
    strengthLabel: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.text,
    },
    strengthValue: {
      fontSize: 13,
      fontWeight: '700',
    },
    strengthBar: {
      height: 6,
      backgroundColor: colors.divider,
      borderRadius: 3,
      marginBottom: 12,
      overflow: 'hidden',
    },
    strengthFill: {
      height: '100%',
      borderRadius: 3,
    },
    requirementsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      marginHorizontal: -4,
    },
    requirementItem: {
      flexDirection: 'row',
      alignItems: 'center',
      width: '50%',
      paddingHorizontal: 4,
      marginBottom: 8,
    },
    requirementDot: {
      width: 16,
      height: 16,
      borderRadius: 8,
      marginRight: 6,
      justifyContent: 'center',
      alignItems: 'center',
    },
    requirementText: {
      fontSize: 12,
    },
    universityButton: {
      backgroundColor: colors.inputBg,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      padding: 14,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    universityButtonText: {
      fontSize: 15,
      color: colors.text,
      flex: 1,
    },
    selectedUniversity: {
      backgroundColor: colors.selectedUniversityBg,
      borderColor: colors.success,
      padding: 12,
      borderRadius: 12,
      marginTop: 8,
      flexDirection: 'row',
      alignItems: 'center',
    },
    selectedUniversityText: {
      color: colors.selectedUniversityText,
      fontSize: 13,
      marginLeft: 8,
      flex: 1,
    },
    primaryButton: {
      backgroundColor: colors.primary,
      borderRadius: 12,
      padding: 16,
      alignItems: 'center',
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: isDarkMode ? 0.5 : 0.3,
      shadowRadius: 8,
      elevation: 8,
    },
    primaryButtonDisabled: {
      backgroundColor: isDarkMode ? '#475569' : '#9ca3af',
      opacity: 0.7,
    },
    primaryButtonText: {
      color: 'white',
      fontSize: 16,
      fontWeight: '600',
    },
    otpInput: {
      fontSize: 32,
      fontWeight: '700',
      textAlign: 'center',
      letterSpacing: 20,
      padding: 16,
      backgroundColor: colors.inputBg,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      marginBottom: 20,
      color: colors.text,
    },
    divider: {
      flexDirection: 'row',
      alignItems: 'center',
      marginVertical: 24,
    },
    dividerLine: {
      flex: 1,
      height: 1,
      backgroundColor: colors.divider,
    },
    dividerText: {
      paddingHorizontal: 16,
      fontSize: 12,
      color: colors.textSecondary,
    },
    switchButton: {
      alignItems: 'center',
      padding: 12,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.primary,
      backgroundColor: 'transparent',
    },
    switchButtonText: {
      color: colors.primary,
      fontSize: 15,
      fontWeight: '600',
    },
    footer: {
      paddingTop: 16,
      borderTopWidth: 1,
      borderTopColor: colors.divider,
    },
    footerText: {
      fontSize: 11,
      color: colors.textSecondary,
      textAlign: 'center',
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: colors.modalOverlay,
      justifyContent: 'flex-end',
    },
    modalContent: {
      backgroundColor: colors.modalBg,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      maxHeight: '80%',
    },
    modalHeader: {
      padding: 20,
      borderBottomWidth: 1,
      borderBottomColor: colors.divider,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.text,
    },
    searchContainer: {
      paddingHorizontal: 20,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.divider,
    },
    searchInput: {
      backgroundColor: colors.inputBg,
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 12,
      fontSize: 15,
      paddingLeft: 40,
      color: colors.text,
    },
    searchIcon: {
      position: 'absolute',
      left: 12,
      top: 12,
      zIndex: 1,
    },
    universityList: {
      maxHeight: 400,
    },
    universityItem: {
      paddingHorizontal: 20,
      paddingVertical: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.divider,
    },
    universityItemText: {
      fontSize: 15,
      color: colors.text,
    },
    loadingContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
    },
    loadingSpinner: {
      width: 20,
      height: 20,
      borderRadius: 10,
      borderWidth: 2,
      borderColor: '#ffffff30',
      borderTopColor: 'white',
    },
    forgotPasswordButton: {
      marginTop: 12,
      alignSelf: 'center',
    },
    forgotPasswordText: {
      color: colors.primary,
      fontSize: 14,
      fontWeight: '600',
    },
    otpHeader: {
      alignItems: 'center',
      marginBottom: 24,
    },
    otpIconContainer: {
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: isDarkMode ? '#7f1d1d' : '#fef2f2',
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 16,
    },
  });

  // ──────── Render ────────
  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <StatusBar 
        barStyle={isDarkMode ? 'light-content' : 'dark-content'}
        backgroundColor="transparent"
        translucent
      />
      <ImageBackground
        source={{ uri: isDarkMode ? DARK_BACKGROUND_IMAGE_URL : BACKGROUND_IMAGE_URL }}
        style={styles.background}
        resizeMode="cover"
      >
        <View style={styles.overlay} />
        <ScrollView 
          style={styles.content}
          contentContainerStyle={{ paddingVertical: 20 }}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.card}>
            {/* Logo Header */}
            <View style={styles.logoContainer}>
              <View style={styles.logoWrapper}>
                <ImageBackground
                  source={{ uri: LOGO_URL }}
                  style={styles.logo}
                  resizeMode="contain"
                />
              </View>
              <Text style={styles.title}>Suyado Mart</Text>
              <Text style={styles.subtitle}>
                {otpSent ? 'Secure Verification' : isLogin ? 'Welcome!!' : 'Join Our Community'}
              </Text>
            </View>

            {/* Error Alert */}
            {error && (
              <View style={styles.errorContainer}>
                <MaterialIcons name="error-outline" size={20} color={colors.errorText} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            {/* Step 1: Credentials */}
            {!otpSent && !isForgot ? (
              <View>
                {/* Email */}
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>
                    <MaterialIcons name="email" size={14} color={colors.text} /> Email Address
                  </Text>
                  <View style={styles.inputWrapper}>
                    <MaterialIcons name="email" size={20} color={colors.textSecondary} style={styles.icon} />
                    <TextInput
                      placeholder="*********@gmail.com"
                      placeholderTextColor={colors.textSecondary}
                      value={email}
                      onChangeText={setEmail}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      editable={!loading}
                      style={styles.input}
                    />
                  </View>
                  {email && !isEmail(email) && (
                    <Text style={{ color: colors.primary, fontSize: 12, marginTop: 4 }}>
                      Please use a valid Email address
                    </Text>
                  )}
                </View>

                {/* Username (Signup only) */}
                {!isLogin && (
                  <View style={styles.inputContainer}>
                    <Text style={styles.inputLabel}>
                      <MaterialIcons name="person" size={14} color={colors.text} /> Username
                    </Text>
                    <View style={[
                      styles.inputWrapper,
                      usernameAvailable === false && { borderColor: colors.primary, backgroundColor: isDarkMode ? '#7f1d1d' : '#fef2f2' },
                      usernameAvailable === true && { borderColor: colors.success, backgroundColor: isDarkMode ? '#064e3b' : '#f0fdf4' }
                    ]}>
                      <MaterialIcons name="person" size={20} color={colors.textSecondary} style={styles.icon} />
                      <TextInput
                        placeholder="Choose a unique username"
                        placeholderTextColor={colors.textSecondary}
                        value={username}
                        onChangeText={(text) => setUsername(text.toLowerCase())}
                        autoCapitalize="none"
                        editable={!loading}
                        style={styles.input}
                      />
                      {username && (
                        checkingUsername ? (
                          <View style={{ paddingRight: 12 }}>
                            <View style={{ width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: colors.border, borderTopColor: colors.primary }} />
                          </View>
                        ) : usernameAvailable === true ? (
                          <MaterialIcons name="check-circle" size={20} color={colors.success} style={styles.icon} />
                        ) : usernameAvailable === false ? (
                          <MaterialIcons name="error" size={20} color={colors.primary} style={styles.icon} />
                        ) : null
                      )}
                    </View>
                    <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 4 }}>
                      {username && usernameAvailable === false && (
                        <Text style={{ color: colors.primary }}>Username already taken. Please try another.</Text>
                      )}
                      {username && usernameAvailable === true && (
                        <Text style={{ color: colors.success }}>Username available!</Text>
                      )}
                      {!username && '3-20 characters.'}
                    </Text>
                  </View>
                )}

                {/* Password */}
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>
                    <MaterialIcons name="lock" size={14} color={colors.text} /> Password
                  </Text>
                  <View style={styles.inputWrapper}>
                    <MaterialIcons name="lock" size={20} color={colors.textSecondary} style={styles.icon} />
                    <TextInput
                      placeholder="Enter your password"
                      placeholderTextColor={colors.textSecondary}
                      value={password}
                      onChangeText={setPassword}
                      secureTextEntry={!showPassword}
                      editable={!loading}
                      style={styles.input}
                    />
                    <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
                      <MaterialIcons 
                        name={showPassword ? "visibility-off" : "visibility"} 
                        size={20} 
                        color={colors.textSecondary} 
                      />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Password Strength (Signup only) */}
                {!isLogin && password && strength && (
                  <View style={styles.passwordStrengthContainer}>
                    <View style={styles.strengthHeader}>
                      <Text style={styles.strengthLabel}>Password Strength</Text>
                      <Text style={[styles.strengthValue, { color: strength.color }]}>
                        {strength.strength}
                      </Text>
                    </View>
                    <View style={styles.strengthBar}>
                      <View style={[styles.strengthFill, { width: strength.width, backgroundColor: strength.color }]} />
                    </View>
                    <View style={styles.requirementsGrid}>
                      {PASSWORD_REQUIREMENTS.map(req => {
                        const met = strength.checks[req.key];
                        return (
                          <View key={req.key} style={styles.requirementItem}>
                            <View style={[styles.requirementDot, { backgroundColor: met ? colors.selectedUniversityBg : colors.inputBg }]}>
                              {met ? (
                                <MaterialIcons name="check" size={12} color={colors.success} />
                              ) : (
                                <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: colors.textSecondary }} />
                              )}
                            </View>
                            <Text style={[styles.requirementText, { color: met ? colors.selectedUniversityText : colors.textSecondary }]}>
                              {req.label}
                            </Text>
                          </View>
                        );
                      })}
                    </View>
                  </View>
                )}

                {/* Confirm Password (Signup only) */}
                {!isLogin && (
                  <View style={styles.inputContainer}>
                    <Text style={styles.inputLabel}>Confirm Password</Text>
                    <View style={[
                      styles.inputWrapper,
                      confirmPassword && password !== confirmPassword && { 
                        borderColor: colors.primary, 
                        backgroundColor: isDarkMode ? '#7f1d1d' : '#fef2f2' 
                      }
                    ]}>
                      <TextInput
                        placeholder="Re-enter your password"
                        placeholderTextColor={colors.textSecondary}
                        value={confirmPassword}
                        onChangeText={setConfirmPassword}
                        secureTextEntry={!showConfirmPassword}
                        editable={!loading}
                        style={styles.input}
                      />
                      <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)} style={styles.eyeIcon}>
                        <MaterialIcons 
                          name={showConfirmPassword ? "visibility-off" : "visibility"} 
                          size={20} 
                          color={colors.textSecondary} 
                        />
                      </TouchableOpacity>
                    </View>
                    {confirmPassword && password !== confirmPassword && (
                      <Text style={{ color: colors.primary, fontSize: 12, marginTop: 4 }}>
                        Passwords do not match
                      </Text>
                    )}
                  </View>
                )}

                {/* University (Signup only) */}
                {!isLogin && (
                  <View style={styles.inputContainer}>
                    <Text style={styles.inputLabel}>
                      <MaterialCommunityIcons name="school" size={14} color={colors.text} /> University
                    </Text>
                    <TouchableOpacity
                      style={styles.universityButton}
                      onPress={() => setShowUniversityModal(true)}
                      disabled={loading}
                    >
                      <Text style={styles.universityButtonText}>
                        {university || 'Search your university...'}
                      </Text>
                      <Feather name="search" size={20} color={colors.textSecondary} />
                    </TouchableOpacity>
                    {university && (
                      <View style={styles.selectedUniversity}>
                        <MaterialCommunityIcons name="check-circle" size={16} color={colors.success} />
                        <Text style={styles.selectedUniversityText}>
                          Selected: {university}
                        </Text>
                      </View>
                    )}
                  </View>
                )}

                {/* Submit Button */}
                <TouchableOpacity
                  onPress={handleSubmitCredentials}
                  disabled={
                    loading || 
                    (!isLogin && (
                      !university || 
                      password !== confirmPassword || 
                      !strength || 
                      !['Good', 'Strong'].includes(strength.strength) ||
                      !usernameAvailable
                    ))
                  }
                  style={[
                    styles.primaryButton,
                    (loading || (!isLogin && (!university || password !== confirmPassword || !strength || !['Good', 'Strong'].includes(strength.strength) || !usernameAvailable))) && 
                    styles.primaryButtonDisabled
                  ]}
                >
                  {loading ? (
                    <View style={styles.loadingContainer}>
                      <View style={styles.loadingSpinner} />
                      <Text style={styles.primaryButtonText}>Processing...</Text>
                    </View>
                  ) : (
                    <Text style={styles.primaryButtonText}>
                      {isLogin ? 'Log In →' : 'Create Account →'}
                    </Text>
                  )}
                </TouchableOpacity>

                {isLogin && !isForgot && (
                  <TouchableOpacity onPress={handleForgotPassword} style={styles.forgotPasswordButton}>
                    <Text style={styles.forgotPasswordText}>Forgot password?</Text>
                  </TouchableOpacity>
                )}
              </View>
            ) : !otpSent && isForgot ? (
              <View>
                {forgotStep === 'request' && (
                  <>
                    <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: 12 }}>
                      Reset your password
                    </Text>
                    <Text style={{ fontSize: 14, color: colors.textSecondary, marginBottom: 12 }}>
                      Enter the email linked to your account and we will send you a 6-digit code.
                    </Text>

                    <View style={styles.inputContainer}>
                      <Text style={styles.inputLabel}>
                        <MaterialIcons name="email" size={14} color={colors.text} /> Email Address
                      </Text>
                      <View style={styles.inputWrapper}>
                        <MaterialIcons name="email" size={20} color={colors.textSecondary} style={styles.icon} />
                        <TextInput
                          placeholder="*********@gmail.com"
                          placeholderTextColor={colors.textSecondary}
                          value={forgotEmail}
                          onChangeText={setForgotEmail}
                          keyboardType="email-address"
                          autoCapitalize="none"
                          editable={!loading}
                          style={styles.input}
                        />
                      </View>
                    </View>

                    <TouchableOpacity
                      onPress={submitForgotEmail}
                      disabled={loading}
                      style={[styles.primaryButton, loading && styles.primaryButtonDisabled]}
                    >
                      {loading ? (
                        <View style={styles.loadingContainer}>
                          <View style={styles.loadingSpinner} />
                          <Text style={styles.primaryButtonText}>Sending code...</Text>
                        </View>
                      ) : (
                        <Text style={styles.primaryButtonText}>Send OTP →</Text>
                      )}
                    </TouchableOpacity>
                  </>
                )}

                {forgotStep === 'verify' && (
                  <>
                    <View style={styles.otpHeader}>
                      <View style={styles.otpIconContainer}>
                        <MaterialIcons name="email" size={32} color={colors.primary} />
                      </View>
                      <Text style={{ fontSize: 20, fontWeight: '700', color: colors.text, marginBottom: 8 }}>
                        Verify your email
                      </Text>
                      <Text style={{ fontSize: 14, color: colors.textSecondary, textAlign: 'center' }}>
                        Enter the 6-digit code sent to
                      </Text>
                      <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text, marginTop: 4 }}>
                        {forgotEmail}
                      </Text>
                    </View>

                    <TextInput
                      placeholder="000000"
                      placeholderTextColor={colors.textSecondary}
                      value={forgotOtp}
                      onChangeText={(text) => setForgotOtp(text.replace(/\D/g, '').slice(0, 6))}
                      keyboardType="number-pad"
                      maxLength={6}
                      autoFocus
                      editable={!loading}
                      style={styles.otpInput}
                    />

                    <TouchableOpacity
                      onPress={verifyForgotOtp}
                      disabled={loading || forgotOtp.length !== 6}
                      style={[
                        styles.primaryButton,
                        (loading || forgotOtp.length !== 6) && styles.primaryButtonDisabled
                      ]}
                    >
                      {loading ? (
                        <View style={styles.loadingContainer}>
                          <View style={styles.loadingSpinner} />
                          <Text style={styles.primaryButtonText}>Verifying...</Text>
                        </View>
                      ) : (
                        <Text style={styles.primaryButtonText}>Verify code →</Text>
                      )}
                    </TouchableOpacity>

                    <View style={{ alignItems: 'center', marginTop: 16 }}>
                      <TouchableOpacity onPress={resendForgotOtp} disabled={loading || forgotResendTimer > 0}>
                        <Text style={{ 
                          color: forgotResendTimer > 0 ? colors.textSecondary : colors.primary, 
                          fontSize: 14, 
                          fontWeight: '600' 
                        }}>
                          {forgotResendTimer > 0 ? `Resend code in ${forgotResendTimer}s` : 'Resend code'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </>
                )}

                {forgotStep === 'reset' && (
                  <>
                    <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: 12 }}>
                      Create a new password
                    </Text>
                    <Text style={{ fontSize: 14, color: colors.textSecondary, marginBottom: 12 }}>
                      Use a strong password (Good or Strong).
                    </Text>

                    <View style={styles.inputContainer}>
                      <Text style={styles.inputLabel}>
                        <MaterialIcons name="lock" size={14} color={colors.text} /> New Password
                      </Text>
                      <View style={styles.inputWrapper}>
                        <MaterialIcons name="lock" size={20} color={colors.textSecondary} style={styles.icon} />
                        <TextInput
                          placeholder="Enter new password"
                          placeholderTextColor={colors.textSecondary}
                          value={forgotNewPassword}
                          onChangeText={setForgotNewPassword}
                          secureTextEntry={!showForgotPassword}
                          editable={!loading}
                          style={styles.input}
                        />
                        <TouchableOpacity onPress={() => setShowForgotPassword(!showForgotPassword)} style={styles.eyeIcon}>
                          <MaterialIcons 
                            name={showForgotPassword ? 'visibility-off' : 'visibility'}
                            size={20}
                            color={colors.textSecondary}
                          />
                        </TouchableOpacity>
                      </View>
                    </View>

                    <View style={styles.inputContainer}>
                      <Text style={styles.inputLabel}>Confirm Password</Text>
                      <View style={styles.inputWrapper}>
                        <TextInput
                          placeholder="Re-enter new password"
                          placeholderTextColor={colors.textSecondary}
                          value={forgotConfirmPassword}
                          onChangeText={setForgotConfirmPassword}
                          secureTextEntry={!showForgotConfirmPassword}
                          editable={!loading}
                          style={styles.input}
                        />
                        <TouchableOpacity onPress={() => setShowForgotConfirmPassword(!showForgotConfirmPassword)} style={styles.eyeIcon}>
                          <MaterialIcons 
                            name={showForgotConfirmPassword ? 'visibility-off' : 'visibility'}
                            size={20}
                            color={colors.textSecondary}
                          />
                        </TouchableOpacity>
                      </View>
                      {forgotConfirmPassword && forgotNewPassword !== forgotConfirmPassword && (
                        <Text style={{ color: colors.primary, fontSize: 12, marginTop: 4 }}>
                          Passwords do not match
                        </Text>
                      )}
                    </View>

                    <TouchableOpacity
                      onPress={submitForgotReset}
                      disabled={loading || !forgotNewPassword || !forgotConfirmPassword || forgotNewPassword !== forgotConfirmPassword}
                      style={[
                        styles.primaryButton,
                        (loading || !forgotNewPassword || !forgotConfirmPassword || forgotNewPassword !== forgotConfirmPassword) && styles.primaryButtonDisabled
                      ]}
                    >
                      {loading ? (
                        <View style={styles.loadingContainer}>
                          <View style={styles.loadingSpinner} />
                          <Text style={styles.primaryButtonText}>Updating...</Text>
                        </View>
                      ) : (
                        <Text style={styles.primaryButtonText}>Update password →</Text>
                      )}
                    </TouchableOpacity>
                  </>
                )}

                <TouchableOpacity
                  onPress={async () => {
                    setIsForgot(false);
                    setForgotStep('request');
                    setForgotEmail('');
                    setForgotOtp('');
                    setForgotNewPassword('');
                    setForgotConfirmPassword('');
                    setShowForgotPassword(false);
                    setShowForgotConfirmPassword(false);
                    setForgotResendTimer(0);
                    setError(null);
                    // Clear password reset flag
                    await AsyncStorage.removeItem('password_reset_flow');
                  }}
                  style={{ alignItems: 'center', marginTop: 20 }}
                >
                  <Text style={{ color: colors.textSecondary, fontSize: 14, fontWeight: '500' }}>
                    ← Back to login
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              /* Step 2: OTP Verification */
              <View>
                <View style={styles.otpHeader}>
                  <View style={styles.otpIconContainer}>
                    <MaterialIcons name="email" size={32} color={colors.primary} />
                  </View>
                  <Text style={{ fontSize: 20, fontWeight: '700', color: colors.text, marginBottom: 8 }}>
                    Verify Your Email
                  </Text>
                  <Text style={{ fontSize: 14, color: colors.textSecondary, textAlign: 'center' }}>
                    Enter the 6-digit code sent to
                  </Text>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text, marginTop: 4 }}>
                    {email}
                  </Text>
                </View>

                {/* OTP Input */}
                <TextInput
                  placeholder="000000"
                  placeholderTextColor={colors.textSecondary}
                  value={otp}
                  onChangeText={(text) => setOtp(text.replace(/\D/g, '').slice(0, 6))}
                  keyboardType="number-pad"
                  maxLength={6}
                  autoFocus
                  editable={!loading}
                  style={styles.otpInput}
                />

                {/* Verify Button */}
                <TouchableOpacity
                  onPress={verifyOtp}
                  disabled={loading || otp.length < 6}
                  style={[
                    styles.primaryButton,
                    (loading || otp.length < 6) && styles.primaryButtonDisabled
                  ]}
                >
                  {loading ? (
                    <View style={styles.loadingContainer}>
                      <View style={styles.loadingSpinner} />
                      <Text style={styles.primaryButtonText}>Verifying...</Text>
                    </View>
                  ) : (
                    <Text style={styles.primaryButtonText}>Verify & Continue →</Text>
                  )}
                </TouchableOpacity>

                {/* Resend OTP */}
                <View style={{ alignItems: 'center', marginTop: 16 }}>
                  <TouchableOpacity
                    onPress={resendOtp}
                    disabled={loading || resendTimer > 0}
                  >
                    <Text style={{ 
                      color: resendTimer > 0 ? colors.textSecondary : colors.primary, 
                      fontSize: 14, 
                      fontWeight: '600' 
                    }}>
                      {resendTimer > 0 ? `Resend code in ${resendTimer}s` : 'Resend verification code'}
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Back Button */}
                <TouchableOpacity
                  onPress={() => {
                    setOtpSent(false);
                    setOtp('');
                    setResendTimer(0);
                    AsyncStorage.removeItem('otp_pending');
                  }}
                  style={{ alignItems: 'center', marginTop: 20 }}
                >
                  <Text style={{ color: colors.textSecondary, fontSize: 14, fontWeight: '500' }}>
                    ← Use different email
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Divider & Switch Mode */}
            {!otpSent && (
              <>
                <View style={styles.divider}>
                  <View style={styles.dividerLine} />
                  <Text style={styles.dividerText}>Or continue with</Text>
                  <View style={styles.dividerLine} />
                </View>

                <TouchableOpacity
                  onPress={() => {
                    setIsLogin(!isLogin);
                    resetForm();
                  }}
                  disabled={loading}
                  style={styles.switchButton}
                >
                  <Text style={styles.switchButtonText}>
                    {isLogin ? 'Create new account' : 'Log in to existing account'}
                  </Text>
                </TouchableOpacity>
              </>
            )}

            {/* Footer */}
            {!otpSent && (
              <View style={styles.footer}>
                <Text style={styles.footerText}>
                  By continuing, you agree to our Terms of Service and Privacy Policy
                </Text>
              </View>
            )}
          </View>
        </ScrollView>
      </ImageBackground>

      {/* University Selection Modal */}
      <Modal
        visible={showUniversityModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowUniversityModal(false)}
      >
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <TouchableWithoutFeedback onPress={() => setShowUniversityModal(false)}>
            <View style={styles.modalOverlay}>
              <TouchableWithoutFeedback>
                <View style={styles.modalContent}>
                  <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>Select University</Text>
                    <TouchableOpacity onPress={() => setShowUniversityModal(false)}>
                      <MaterialIcons name="close" size={24} color={colors.textSecondary} />
                    </TouchableOpacity>
                  </View>
                  <View style={styles.searchContainer}>
                    <View style={{ position: 'relative' }}>
                      <MaterialIcons name="search" size={20} color={colors.textSecondary} style={styles.searchIcon} />
                      <TextInput
                        placeholder="Search universities..."
                        placeholderTextColor={colors.textSecondary}
                        value={universitySearch}
                        onChangeText={setUniversitySearch}
                        style={styles.searchInput}
                        autoFocus
                      />
                    </View>
                  </View>
                  <ScrollView style={styles.universityList}>
                    {filteredUniversities.map((uni) => (
                      <TouchableOpacity
                        key={uni}
                        style={styles.universityItem}
                        onPress={() => {
                          setUniversity(uni);
                          setShowUniversityModal(false);
                        }}
                      >
                        <Text style={styles.universityItemText}>{uni}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </Modal>
    </KeyboardAvoidingView>
  );
};

export default AuthPage;