import React, { useEffect, useState } from 'react';
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
import AppAlertProvider from './AppAlertProvider';
import { getSelectedCampus } from '@/lib/campus';

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
  const [selectedCampus, setSelectedCampus] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const initializeApp = async () => {
      try {
        // 1. Load Onboarding Status
        const onboardingValue = await AsyncStorage.getItem('hasSeenOnboarding');
        setHasSeenOnboarding(onboardingValue === 'true');

        // 1b. Load Selected Campus (university)
        const campus = await getSelectedCampus();
        setSelectedCampus(campus);

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

      // RootLayout reads selectedCampus on mount, but onboarding can update it later.
      // Re-check storage here so navigation updates immediately (web otherwise needs refresh).
      let effectiveCampus = selectedCampus;
      if (!effectiveCampus) {
        effectiveCampus = await getSelectedCampus();
        if (effectiveCampus !== selectedCampus) {
          setSelectedCampus(effectiveCampus);
        }
      }

      // Campus selection is required before browsing.
      // Allow /auth without campus ONLY when OTP is pending.
      if (!effectiveCampus) {
        if (otpPending === 'true') {
          if (!inAuth) router.replace('/auth');
          return;
        }
        if (!inOnboarding) router.replace('/onboarding');
        return;
      }

      // 1. Authenticated User
      if (session) {
        if (otpPending === 'true') {
          if (!inAuth) router.replace('/auth');
          return;
        }
        // If they are still on onboarding, move to Home.
        if (inOnboarding) {
          router.replace('/(tabs)');
          return;
        }

        // Default landing is tabs, but don't force-navigate away from auth.
        if (!inTabs && !inAuth) router.replace('/(tabs)');
        return;
      }

      // 2. Unauthenticated User
      // Unauthenticated users can browse tabs once campus is selected.
      // Keep hasSeenOnboarding for backward compatibility only.
      if (!hasSeenOnboarding) {
        setHasSeenOnboarding(true);
      }

      // If they somehow remain on onboarding after selecting a campus, move to tabs.
      if (inOnboarding) {
        router.replace('/(tabs)');
      }
    };

    performNavigation();
  }, [isReady, session, hasSeenOnboarding, selectedCampus, segments]);

  // ──────────────────────────────────────────────────────────────
  // SHOW SPLASH SCREEN INSTEAD OF NULL
  // ──────────────────────────────────────────────────────────────
  if (!isReady) {
    return <LoadingSplashScreen />;
  }

  return (
    <AppAlertProvider>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="onboarding" />
          <Stack.Screen name="auth" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
        </Stack>
        <StatusBar style="auto" />
      </ThemeProvider>
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