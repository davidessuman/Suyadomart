import React, { useEffect, useState } from 'react';
import { AppAlertProvider } from './AppAlertProvider';
import { CartProvider } from './cart/CartProvider';
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from '@react-navigation/native';
import { useColorScheme, View, Image, StyleSheet, ActivityIndicator } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { supabase } from '@/lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ──────────────────────────────────────────────────────────────
// Assets
// ──────────────────────────────────────────────────────────────
const BACKGROUND_URI = 'https://images.pexels.com/photos/952670/pexels-photo-952670.jpeg';
const LOCAL_LOGO = require('../assets/images/logo.png'); 

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const router = useRouter();
  const segments = useSegments();

  const [session, setSession] = useState<any>(null);
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState<boolean | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const initializeApp = async () => {
      try {
        // 1. Load Onboarding Status
        const onboardingValue = await AsyncStorage.getItem('hasSeenOnboarding');
        setHasSeenOnboarding(onboardingValue === 'true');

        // 2. Load Session
        const { data: { session } } = await supabase.auth.getSession();
        setSession(session);
      } catch (e) {
        console.error("Init error:", e);
      } finally {
        // 3. Splash delay
        setTimeout(() => {
          setIsReady(true); 
        }, 1500);
      }
    };

    initializeApp();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  // ──────────────────────────────────────────────────────────────
  // Routing Logic
  // ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isReady) return; 

    const performNavigation = async () => {
      const inOnboarding = segments[0] === 'onboarding';
      const inAuth = segments[0] === 'auth';
      const inTabs = segments[0] === '(tabs)';
      const otpPending = await AsyncStorage.getItem('otp_pending');
      const passwordResetFlow = await AsyncStorage.getItem('password_reset_flow');

      // 1. Authenticated User
      if (session) {
        // Don't auto-redirect if in password reset flow
        if (passwordResetFlow === 'true') {
          if (!inAuth) router.replace('/auth');
          return;
        }
        if (otpPending === 'true') {
          if (!inAuth) router.replace('/auth');
          return;
        }
        // Go to Home immediately
        if (!inTabs) router.replace('/(tabs)');
        return;
      }

      // 2. Unauthenticated User
      if (!hasSeenOnboarding) {
        // CRITICAL FIX:
        // If local state says they haven't seen onboarding, but they are trying to access Auth,
        // let's double-check Storage. They might have JUST clicked "Get Started".
        if (inAuth) {
            const checkAgain = await AsyncStorage.getItem('hasSeenOnboarding');
            if (checkAgain === 'true') {
                setHasSeenOnboarding(true); // Update state so we don't check again
                return; // Allow them to stay on /auth
            }
        }

        // If truly hasn't seen it, force back to onboarding
        if (!inOnboarding) router.replace('/onboarding');
        return;
      }

      // 3. Has seen onboarding, but not logged in -> Go to Auth
      if (!inAuth) router.replace('/auth');
    };

    performNavigation();
  }, [isReady, session, hasSeenOnboarding, segments]);

  // ──────────────────────────────────────────────────────────────
  // SHOW SPLASH SCREEN INSTEAD OF NULL
  // ──────────────────────────────────────────────────────────────
  if (!isReady) {
    return <LoadingSplashScreen />;
  }

  return (
    <AppAlertProvider>
      <CartProvider>
        <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="onboarding" />
            <Stack.Screen name="auth" />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
          </Stack>
          <StatusBar style="auto" />
        </ThemeProvider>
      </CartProvider>
    </AppAlertProvider>
  );
}

// ──────────────────────────────────────────────────────────────
// Custom Splash Screen Component
// ──────────────────────────────────────────────────────────────
function LoadingSplashScreen() {
  return (
    <View style={styles.splashContainer}>
      {/* Background Image */}
      <Image
        source={{ uri: BACKGROUND_URI }}
        style={StyleSheet.absoluteFillObject}
        resizeMode="cover"
      />
      
      {/* Dark Overlay */}
      <View style={styles.splashOverlay} />

      {/* Content */}
      <View style={styles.splashContent}>
        <Image 
          source={LOCAL_LOGO} 
          style={styles.splashLogo} 
          resizeMode="contain" 
        />
        <ActivityIndicator size="large" color="#ffffff" style={{ marginTop: 20 }} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  splashContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  splashOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)', 
  },
  splashContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  splashLogo: {
    width: 200,
    height: 200,
  }
});