import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Dimensions,
  Platform,
  Image,
  useColorScheme,
  StatusBar,
} from 'react-native';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import {
  scale,
  verticalScale,
  moderateScale,
} from 'react-native-size-matters';
import { useRouter } from 'expo-router';

const { width, height } = Dimensions.get('window');

// High-quality Ecommerce background (minimalist)
const BACKGROUND_URI = 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?q=80&w=2070&auto=format&fit=crop';
const LOCAL_LOGO = require('../assets/images/logo.png');

export default function OnboardingScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  // Dynamic Colors based on Mode
  const theme = {
    background: isDark ? '#0F0F0F' : '#F8F9FA',
    text: isDark ? '#FFFFFF' : '#1A1A1A',
    subtext: isDark ? '#A0A0A0' : '#666666',
    accent: '#007AFF', // Modern Blue
    card: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)',
    border: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
  };

  const finish = async () => {
    try {
      await AsyncStorage.setItem('hasSeenOnboarding', 'true');
      router.replace('/auth');
    } catch (error) {
      console.error("Failed to save onboarding status", error);
      router.replace('/auth');
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      
      {/* Background Image with Overlay */}
      <View style={styles.backgroundContainer}>
        <Image
          source={{ uri: BACKGROUND_URI }}
          style={StyleSheet.absoluteFillObject}
          resizeMode="cover"
        />
        <View style={[styles.overlay, { backgroundColor: isDark ? 'rgba(0,0,0,0.7)' : 'rgba(255,255,255,0.8)' }]} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {/* Top Header Section */}
        <View style={styles.header}>
          <Image source={LOCAL_LOGO} style={styles.logoImage} resizeMode="contain" />
          <Text style={[styles.title, { color: theme.text }]}>Suyado Mart</Text>
          <Text style={[styles.subtitle, { color: theme.accent }]}>Premium Campus Marketplace</Text>
        </View>

        {/* Feature Cards */}
        <View style={styles.features}>
          <FeatureItem 
            theme={theme}
            icon="bag-handle-outline" 
            title="Smart Shopping" 
            desc="Find the best deals from your fellow students." 
          />
          <FeatureItem 
            theme={theme}
            icon="flash-outline" 
            title="Fast Selling" 
            desc="List your items in under 30 seconds." 
          />
          <FeatureItem 
            theme={theme}
            icon="shield-checkmark-outline" 
            title="Verified Users" 
            desc="Trade safely within your trusted community." 
          />
        </View>

        {/* Action Section */}
        <View style={styles.footerContainer}>
          <Pressable 
            style={({ pressed }) => [
              styles.button,
              { backgroundColor: theme.accent },
              pressed && { opacity: 0.9, transform: [{ scale: 0.97 }] }
            ]} 
            onPress={finish}
          >
            <Text style={styles.buttonText}>Get Started</Text>
            
          </Pressable>

        </View>
      </ScrollView>
    </View>
  );
}

// ──────────────────────────────────────────────────────────────
// Sub-Components
// ──────────────────────────────────────────────────────────────

function FeatureItem({ icon, title, desc, theme }: any) {
  return (
    <View style={[styles.featureCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <View style={[styles.iconContainer, { backgroundColor: theme.accent + '20' }]}>
        <Ionicons name={icon} size={scale(22)} color={theme.accent} />
      </View>
      <View style={styles.featureTextContent}>
        <Text style={[styles.featureTitle, { color: theme.text }]}>{title}</Text>
        <Text style={[styles.featureDesc, { color: theme.subtext }]}>{desc}</Text>
      </View>
    </View>
  );
}

// ──────────────────────────────────────────────────────────────
// Styles
// ──────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1 },
  backgroundContainer: { ...StyleSheet.absoluteFillObject },
  overlay: { ...StyleSheet.absoluteFillObject },

  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: scale(24),
    paddingTop: verticalScale(60),
    paddingBottom: verticalScale(40),
    justifyContent: 'space-between',
  },

  header: {
    alignItems: 'center',
    marginBottom: verticalScale(30),
  },

  logoImage: {
    width: scale(80),
    height: scale(80),
    marginBottom: verticalScale(15),
  },

  title: {
    fontSize: moderateScale(32),
    fontWeight: '900',
    letterSpacing: -0.5,
  },

  subtitle: {
    fontSize: moderateScale(14),
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginTop: 5,
  },

  features: {
    gap: verticalScale(15),
  },

  featureCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: moderateScale(16),
    borderRadius: moderateScale(20),
    borderWidth: 1,
    ...Platform.select({
        ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 10 },
        android: { elevation: 2 }
    })
  },

  iconContainer: {
    width: scale(45),
    height: scale(45),
    borderRadius: moderateScale(14),
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: scale(15),
  },

  featureTextContent: { flex: 1 },

  featureTitle: {
    fontSize: moderateScale(16),
    fontWeight: '700',
    marginBottom: 2,
  },

  featureDesc: {
    fontSize: moderateScale(13),
    lineHeight: 18,
  },

  footerContainer: {
    marginTop: verticalScale(40),
    alignItems: 'center',
  },

  button: {
    width: '50%',
    flexDirection: 'row',
    height: verticalScale(56),
    borderRadius: moderateScale(16),
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
  },

  buttonText: {
    color: '#FFFFFF',
    fontSize: moderateScale(17),
    fontWeight: '700',
  },

  skipButton: {
    marginTop: verticalScale(20),
    padding: 10,
  },

  skipText: {
    fontSize: moderateScale(14),
    fontWeight: '500',
  },
});