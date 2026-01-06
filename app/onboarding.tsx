import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Dimensions,
  Platform,
  useColorScheme,
  StatusBar,
  FlatList,
  Animated,
  Easing,
  Image,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import {
  scale,
  verticalScale,
  moderateScale,
} from 'react-native-size-matters';
import { useRouter } from 'expo-router';

const { width, height } = Dimensions.get('window');

// App Logo - Same as search page
const APP_LOGO_URL = 'https://image2url.com/images/1764506443183-2ff76663-c119-4f05-93b4-d08e42895442.png';

// App Brand Colors - matching the main app
const PRIMARY_COLOR = '#F68B1E';
const SECONDARY_COLOR = '#2D3748';

// Onboarding Pages Data
const ONBOARDING_PAGES = [
  {
    id: '1',
    icon: 'storefront',
    title: 'Welcome to Suyado Mart',
    subtitle: 'Your Campus Marketplace',
    description: 'Discover amazing deals from fellow students and sell your items with ease.',
    gradient: ['#F68B1E', '#FF9F40'],
    accentColor: '#F68B1E',
  },
  {
    id: '2',
    icon: 'flash',
    title: 'Buy & Sell Instantly',
    subtitle: 'Lightning Fast Transactions',
    description: 'List your items in seconds and connect with buyers instantly on campus.',
    gradient: ['#FF9F40', '#FFB366'],
    accentColor: '#FF9F40',
  },
  {
    id: '3',
    icon: 'shield-checkmark',
    title: 'Safe & Secure',
    subtitle: 'Trusted Community',
    description: 'Trade with confidence within your verified campus community.',
    gradient: ['#2D3748', '#4A5568'],
    accentColor: '#4A5568',
  },
  {
    id: '4',
    icon: 'calendar',
    title: 'Campus Events',
    subtitle: 'Never Miss Out',
    description: 'Discover and attend exciting campus events, from sales to meetups and more.',
    gradient: ['#F68B1E', '#FFA54D'],
    accentColor: '#F68B1E',
  },
  {
    id: '5',
    icon: 'rocket',
    title: 'Ready to Start?',
    subtitle: 'Join the Revolution',
    description: 'Experience the future of campus commerce. Start buying and selling today!',
    gradient: ['#FF9F40', '#F68B1E'],
    accentColor: '#F68B1E',
  },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const flatListRef = useRef<FlatList>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollX = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const rocketIconX = useRef(new Animated.Value(0)).current;
  const rocketIconY = useRef(new Animated.Value(0)).current;
  const rocketIconRotate = useRef(new Animated.Value(0)).current;
  const rocketIconScale = useRef(new Animated.Value(1)).current;
  const [rocketAnimating, setRocketAnimating] = useState(false);
  const [rocketOverlayVisible, setRocketOverlayVisible] = useState(false);
  const [rocketStart, setRocketStart] = useState({ x: 0, y: 0 });
  const [buttonLayout, setButtonLayout] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const [iconLayout, setIconLayout] = useState<{ x: number; y: number; width: number; height: number } | null>(null);

  useEffect(() => {
    // Entrance animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 40,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const theme = {
    background: isDark ? '#0A0A0A' : '#FFFFFF',
    text: isDark ? '#FFFFFF' : '#1A1A1A',
    subtext: isDark ? '#B0B0B0' : '#6B7280',
    cardBg: isDark ? '#1A1A1A' : '#F9FAFB',
  };

  const rocketRotation = rocketIconRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '-45deg'],
  });

  const navigateToAuth = async () => {
    try {
      await AsyncStorage.setItem('hasSeenOnboarding', 'true');
      router.replace('/auth');
    } catch (error) {
      console.error('Failed to save onboarding status', error);
      router.replace('/auth');
    }
  };

  const launchRocketAndFinish = () => {
    if (rocketAnimating) return;

    const rocketSize = 32;
    const iconCenterX = iconLayout && buttonLayout
      ? buttonLayout.x + iconLayout.x + iconLayout.width / 2
      : buttonLayout
      ? buttonLayout.x + buttonLayout.width * 0.7
      : width / 2;
    const iconCenterY = iconLayout && buttonLayout
      ? buttonLayout.y + iconLayout.y + iconLayout.height / 2
      : buttonLayout
      ? buttonLayout.y + buttonLayout.height / 2
      : height - 120;

    setRocketStart({ x: iconCenterX - rocketSize / 2, y: iconCenterY - rocketSize / 2 });
    rocketIconX.setValue(0);
    rocketIconY.setValue(0);
    rocketIconRotate.setValue(0);
    rocketIconScale.setValue(1);
    setRocketOverlayVisible(true);
    setRocketAnimating(true);

    Animated.parallel([
      Animated.timing(rocketIconX, {
        toValue: width - iconCenterX + 140,
        duration: 1600,
        easing: Easing.inOut(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(rocketIconY, {
        toValue: -(iconCenterY + height * 0.5),
        duration: 1600,
        easing: Easing.inOut(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(rocketIconRotate, {
        toValue: 1,
        duration: 1600,
        easing: Easing.inOut(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.sequence([
        Animated.timing(rocketIconScale, {
          toValue: 1.35,
          duration: 800,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(rocketIconScale, {
          toValue: 0.6,
          duration: 800,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
    ]).start(async () => {
      setRocketAnimating(false);
      setRocketOverlayVisible(false);
      await navigateToAuth();
    });
  };

  const handleNext = () => {
    if (currentIndex < ONBOARDING_PAGES.length - 1) {
      flatListRef.current?.scrollToIndex({
        index: currentIndex + 1,
        animated: true,
      });
    } else {
      launchRocketAndFinish();
    }
  };

  const handleSkip = () => {
    navigateToAuth();
  };

  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems.length > 0) {
      setCurrentIndex(viewableItems[0].index || 0);
    }
  }).current;

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 50,
  }).current;

  return (
    <View style={styles.root}>
      {/* Animated Gradient Background */}
      <LinearGradient
        colors={
          isDark
            ? ['#0F0F0F', '#1A1A2E', '#16213E', '#0F0F0F']
            : ['#FFFFFF', '#F0F4F8', '#E8EEF7', '#FFFFFF']
        }
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />

      {/* Floating Background Shapes */}
      <View style={StyleSheet.absoluteFillObject}>
        <FloatingBlob
          size={300}
          color={ONBOARDING_PAGES[currentIndex].accentColor + '15'}
          top={-50}
          left={-100}
          duration={8000}
        />
        <FloatingBlob
          size={250}
          color={ONBOARDING_PAGES[currentIndex].accentColor + '10'}
          bottom={-80}
          right={-80}
          duration={10000}
        />
        <FloatingBlob
          size={200}
          color={ONBOARDING_PAGES[currentIndex].accentColor + '12'}
          top={height / 2 - 100}
          right={-50}
          duration={9000}
        />
      </View>

      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        translucent
        backgroundColor="transparent"
      />

      {/* Skip Button */}
      {currentIndex < ONBOARDING_PAGES.length - 1 && (
        <Animated.View
          style={[
            styles.skipContainer,
            {
              opacity: fadeAnim,
            },
          ]}
        >
          <Pressable onPress={handleSkip} style={styles.skipButton}>
            <Text style={[styles.skipText, { color: theme.subtext }]}>Skip</Text>
          </Pressable>
        </Animated.View>
      )}

      {/* Onboarding Pages */}
      <Animated.View
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        <FlatList
          ref={flatListRef}
          data={ONBOARDING_PAGES}
          keyExtractor={(item) => item.id}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          bounces={false}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { x: scrollX } } }],
            { useNativeDriver: false }
          )}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
          renderItem={({ item, index }) => (
            <OnboardingPage
              page={item}
              index={index}
              scrollX={scrollX}
              theme={theme}
              isDark={isDark}
            />
          )}
        />
      </Animated.View>

      {/* Bottom Section */}
      <Animated.View
        style={[
          styles.bottomSection,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        {/* Pagination Dots */}
        <View style={styles.pagination}>
          {ONBOARDING_PAGES.map((_, index) => {
            const inputRange = [
              (index - 1) * width,
              index * width,
              (index + 1) * width,
            ];

            const dotWidth = scrollX.interpolate({
              inputRange,
              outputRange: [8, 24, 8],
              extrapolate: 'clamp',
            });

            const opacity = scrollX.interpolate({
              inputRange,
              outputRange: [0.3, 1, 0.3],
              extrapolate: 'clamp',
            });

            return (
              <Animated.View
                key={index}
                style={[
                  styles.dot,
                  {
                    width: dotWidth,
                    opacity,
                    backgroundColor: ONBOARDING_PAGES[currentIndex].accentColor,
                  },
                ]}
              />
            );
          })}
        </View>

        {/* Get Started Button */}
        <Pressable
          onPress={launchRocketAndFinish}
          onLayout={({ nativeEvent }) => setButtonLayout(nativeEvent.layout)}
          style={({ pressed }) => [
            styles.nextButton,
            pressed && styles.nextButtonPressed,
          ]}
        >
          <LinearGradient
            colors={ONBOARDING_PAGES[currentIndex].gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.gradientButton}
          >
            <Text style={styles.nextButtonText}>Get Started</Text>
            <View
              style={styles.rocketIconWrapper}
              onLayout={({ nativeEvent }) => setIconLayout(nativeEvent.layout)}
            >
              <Ionicons
                name="rocket"
                size={moderateScale(20)}
                color="#FFFFFF"
              />
            </View>
          </LinearGradient>
        </Pressable>
      </Animated.View>
      {rocketOverlayVisible && (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.rocketOverlay,
            {
              left: rocketStart.x,
              top: rocketStart.y,
              transform: [
                { translateX: rocketIconX },
                { translateY: rocketIconY },
                { rotate: rocketRotation },
                { scale: rocketIconScale },
              ],
            },
          ]}
        >
          <LinearGradient
            colors={['#F68B1E', '#FF9F40']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.rocketOverlayGradient}
          >
            <Ionicons name="rocket" size={26} color="#FFFFFF" />
          </LinearGradient>
        </Animated.View>
      )}
    </View>
  );
}

// ──────────────────────────────────────────────────────────────
// OnboardingPage Component
// ──────────────────────────────────────────────────────────────

interface OnboardingPageProps {
  page: typeof ONBOARDING_PAGES[0];
  index: number;
  scrollX: Animated.Value;
  theme: any;
  isDark: boolean;
}

function OnboardingPage({ page, index, scrollX, theme, isDark }: OnboardingPageProps) {
  const inputRange = [(index - 1) * width, index * width, (index + 1) * width];
  
  // Icon animations
  const iconScale = useRef(new Animated.Value(0)).current;
  const iconRotate = useRef(new Animated.Value(0)).current;
  const iconPulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Entry animation
    Animated.spring(iconScale, {
      toValue: 1,
      tension: 40,
      friction: 6,
      useNativeDriver: true,
    }).start();

    // Continuous pulse animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(iconPulse, {
          toValue: 1.05,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(iconPulse, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Subtle rotation animation for icons (not logo)
    if (index !== 0) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(iconRotate, {
            toValue: 1,
            duration: 8000,
            useNativeDriver: true,
          }),
          Animated.timing(iconRotate, {
            toValue: 0,
            duration: 8000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }
  }, []);

  const rotation = iconRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '10deg'],
  });

  const scale = scrollX.interpolate({
    inputRange,
    outputRange: [0.8, 1, 0.8],
    extrapolate: 'clamp',
  });

  const opacity = scrollX.interpolate({
    inputRange,
    outputRange: [0, 1, 0],
    extrapolate: 'clamp',
  });

  return (
    <View style={{ width, height: '100%' }}>
      <View
        style={[
          styles.pageContainer,
          {
            opacity,
          },
        ]}
      >
        {/* Animated Icon with Gradient Background */}
        <Animated.View 
          style={[
            styles.iconSection,
            {
              transform: [
                { scale: Animated.multiply(iconScale, iconPulse) },
                { rotate: index === 0 ? '0deg' : rotation },
              ],
            },
          ]}
        >
        {index === 0 ? (
          // Show app logo on first page
          <View style={styles.logoContainer}>
            <Image
              source={{ uri: APP_LOGO_URL }}
              style={styles.appLogo}
              resizeMode="contain"
            />
          </View>
        ) : (
          // Show gradient icons on other pages
          <LinearGradient
            colors={[...page.gradient, page.gradient[0] + '80']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.iconGradientWrapper}
          >
            <View style={[styles.iconInnerCircle, { backgroundColor: theme.background }]}>
              <LinearGradient
                colors={page.gradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.iconGradient}
              >
                <Ionicons name={page.icon as any} size={moderateScale(70)} color="#FFFFFF" />
              </LinearGradient>
            </View>
          </LinearGradient>
        )}

        {/* Floating Particles */}
        <FloatingParticles color={page.accentColor} />
      </Animated.View>

      {/* Content */}
      <View style={styles.textSection}>
        <Text style={[styles.pageTitle, { color: theme.text }]}>{page.title}</Text>
        <LinearGradient
          colors={page.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.subtitleGradient}
        >
          <Text style={styles.pageSubtitle}>{page.subtitle}</Text>
        </LinearGradient>
        <Text style={[styles.pageDescription, { color: theme.subtext }]}>
          {page.description}
        </Text>
      </View>

      {/* Feature Highlights */}
      <View style={styles.featuresContainer}>
        {index === 0 && (
          <>
            <FeatureBadge icon="cart" text="Easy Shopping" color={page.accentColor} theme={theme} />
            <FeatureBadge icon="pricetag" text="Best Deals" color={page.accentColor} theme={theme} />
          </>
        )}
        {index === 1 && (
          <>
            <FeatureBadge icon="time" text="Quick Listing" color={page.accentColor} theme={theme} />
            <FeatureBadge icon="chatbubbles" text="Instant Chat" color={page.accentColor} theme={theme} />
            <FeatureBadge icon="trending-up" text="Smart Pricing" color={page.accentColor} theme={theme} />
          </>
        )}
        {index === 2 && (
          <>
            <FeatureBadge icon="lock-closed" text="Secure Payment" color={page.accentColor} theme={theme} />
            <FeatureBadge icon="checkmark-circle" text="Verified Sellers" color={page.accentColor} theme={theme} />
            <FeatureBadge icon="star" text="Rated System" color={page.accentColor} theme={theme} />
          </>
        )}
        {index === 3 && (
          <>
            <FeatureBadge icon="ticket" text="Event Dates" color={page.accentColor} theme={theme} />
            <FeatureBadge icon="location" text="Campus Venues" color={page.accentColor} theme={theme} />
            <FeatureBadge icon="videocam" text="Virtual" color={page.accentColor} theme={theme} />
            <FeatureBadge icon="people" text="Meetups" color={page.accentColor} theme={theme} />
          </>
        )}
        {index === 4 && (
          <>
            <FeatureBadge icon="flash" text="Quick Start" color={page.accentColor} theme={theme} />
            <FeatureBadge icon="notifications" text="Live Updates" color={page.accentColor} theme={theme} />
            <FeatureBadge icon="heart" text="Save Favorites" color={page.accentColor} theme={theme} />
          </>
        )}
      </View>
    </View>
    </View>
  );
}

// ──────────────────────────────────────────────────────────────
// Feature Badge Component
// ──────────────────────────────────────────────────────────────

function FeatureBadge({ icon, text, color, theme }: any) {
  return (
    <View style={[styles.featureBadge, { backgroundColor: theme.cardBg }]}>
      <Ionicons name={icon} size={moderateScale(16)} color={color} />
      <Text style={[styles.featureBadgeText, { color: theme.text }]}>{text}</Text>
    </View>
  );
}

// ──────────────────────────────────────────────────────────────
// Floating Particles Component
// ──────────────────────────────────────────────────────────────

function FloatingParticles({ color }: { color: string }) {
  const particle1 = useRef(new Animated.Value(0)).current;
  const particle2 = useRef(new Animated.Value(0)).current;
  const particle3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const createAnimation = (animValue: Animated.Value, delay: number) => {
      return Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(animValue, {
            toValue: 1,
            duration: 3000,
            useNativeDriver: true,
          }),
          Animated.timing(animValue, {
            toValue: 0,
            duration: 3000,
            useNativeDriver: true,
          }),
        ])
      );
    };

    createAnimation(particle1, 0).start();
    createAnimation(particle2, 1000).start();
    createAnimation(particle3, 2000).start();
  }, []);

  const createParticleStyle = (animValue: Animated.Value, offset: number) => ({
    ...styles.particle,
    backgroundColor: color + '30',
    transform: [
      {
        translateY: animValue.interpolate({
          inputRange: [0, 1],
          outputRange: [0, -50],
        }),
      },
      {
        translateX: animValue.interpolate({
          inputRange: [0, 1],
          outputRange: [0, offset],
        }),
      },
    ],
    opacity: animValue.interpolate({
      inputRange: [0, 0.5, 1],
      outputRange: [0, 1, 0],
    }),
  });

  return (
    <>
      <Animated.View style={createParticleStyle(particle1, 30)} />
      <Animated.View style={createParticleStyle(particle2, -30)} />
      <Animated.View style={createParticleStyle(particle3, 50)} />
    </>
  );
}

// ──────────────────────────────────────────────────────────────
// Floating Blob Component for Background
// ──────────────────────────────────────────────────────────────

function FloatingBlob({
  size,
  color,
  top,
  bottom,
  left,
  right,
  duration,
}: {
  size: number;
  color: string;
  top?: number;
  bottom?: number;
  left?: number;
  right?: number;
  duration: number;
}) {
  const animValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(animValue, {
          toValue: 1,
          duration: duration,
          useNativeDriver: true,
        }),
        Animated.timing(animValue, {
          toValue: 0,
          duration: duration,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [duration]);

  const translateY = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 30],
  });

  const scale = animValue.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [1, 1.1, 1],
  });

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
          top,
          bottom,
          left,
          right,
          transform: [{ translateY }, { scale }],
        },
      ]}
    />
  );
}

// ──────────────────────────────────────────────────────────────
// Styles
// ──────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  skipContainer: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? verticalScale(50) : verticalScale(35),
    right: scale(20),
    zIndex: 10,
  },
  skipButton: {
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(8),
  },
  skipText: {
    fontSize: moderateScale(15),
    fontWeight: '600',
  },
  content: {
    flex: 1,
    width: '100%',
  },
  pageContainer: {
    paddingHorizontal: scale(20),
    paddingTop: height < 700 ? 30 : (width > 768 ? 40 : (Platform.OS === 'ios' ? verticalScale(70) : verticalScale(50))),
    paddingBottom: height < 700 ? 80 : (width > 768 ? 100 : verticalScale(240)),
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
  },
  iconSection: {
    marginBottom: height < 700 ? verticalScale(10) : verticalScale(15),
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoContainer: {
    width: height < 700 ? 100 : (width > 768 ? 140 : scale(180)),
    height: height < 700 ? 100 : (width > 768 ? 140 : scale(180)),
    alignItems: 'center',
    justifyContent: 'center',
  },
  appLogo: {
    width: '100%',
    height: '100%',
  },
  iconGradientWrapper: {
    width: height < 700 ? 100 : (width > 768 ? 140 : scale(180)),
    height: height < 700 ? 100 : (width > 768 ? 140 : scale(180)),
    borderRadius: height < 700 ? 50 : (width > 768 ? 70 : scale(90)),
    padding: scale(6),
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
      },
      android: { elevation: 10 },
    }),
  },
  iconInnerCircle: {
    flex: 1,
    borderRadius: scale(84),
    padding: scale(6),
  },
  iconGradient: {
    flex: 1,
    borderRadius: scale(78),
    justifyContent: 'center',
    alignItems: 'center',
  },
  particle: {
    position: 'absolute',
    width: scale(10),
    height: scale(10),
    borderRadius: scale(5),
  },
  textSection: {
    alignItems: 'center',
    marginBottom: height < 700 ? 8 : (width > 768 ? 10 : verticalScale(15)),
    width: '100%',
    maxWidth: 600,
  },
  pageTitle: {
    fontSize: height < 700 ? moderateScale(22) : moderateScale(28),
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: height < 700 ? verticalScale(6) : verticalScale(8),
    letterSpacing: -0.5,
    paddingHorizontal: scale(10),
  },
  subtitleGradient: {
    paddingHorizontal: scale(16),
    paddingVertical: height < 700 ? verticalScale(4) : verticalScale(6),
    borderRadius: moderateScale(20),
    marginBottom: height < 700 ? verticalScale(6) : verticalScale(10),
  },
  pageSubtitle: {
    fontSize: height < 700 ? moderateScale(10) : moderateScale(12),
    fontWeight: '700',
    color: '#FFFFFF',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  pageDescription: {
    fontSize: height < 700 ? moderateScale(13) : moderateScale(15),
    textAlign: 'center',
    lineHeight: height < 700 ? moderateScale(18) : moderateScale(22),
    paddingHorizontal: scale(15),
  },
  featuresContainer: {
    flexDirection: 'row',
    flexWrap: width > 768 ? 'nowrap' : 'wrap',
    justifyContent: 'center',
    gap: scale(10),
    marginTop: height < 700 ? 6 : (width > 768 ? 8 : verticalScale(12)),
    paddingHorizontal: scale(10),
    marginBottom: height < 700 ? 6 : (width > 768 ? 8 : verticalScale(10)),
    width: '100%',
    maxWidth: width > 768 ? 800 : 600,
  },
  featureBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: scale(14),
    paddingVertical: height < 700 ? verticalScale(6) : verticalScale(8),
    borderRadius: moderateScale(20),
    gap: scale(6),
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: { elevation: 3 },
    }),
  },
  featureBadgeText: {
    fontSize: moderateScale(12),
    fontWeight: '600',
  },
  bottomSection: {
    paddingHorizontal: scale(25),
    paddingBottom: Platform.OS === 'ios' ? verticalScale(40) : verticalScale(25),
    alignItems: 'center',
  },
  pagination: {
    flexDirection: 'row',
    gap: scale(8),
    marginBottom: verticalScale(25),
  },
  dot: {
    height: scale(8),
    borderRadius: scale(4),
  },
  nextButton: {
    width: width > 768 ? '40%' : '100%',
    maxWidth: width > 768 ? 400 : 500,
    height: width > 768 ? 50 : verticalScale(56),
    borderRadius: width > 768 ? 25 : moderateScale(28),
    overflow: 'visible',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
      },
      android: { elevation: 8 },
    }),
  },
  nextButtonPressed: {
    transform: [{ scale: 0.98 }],
  },
  gradientButton: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: scale(10),
  },
  rocketIconWrapper: {
    width: moderateScale(22),
    height: moderateScale(22),
    justifyContent: 'center',
    alignItems: 'center',
  },
  rocketOverlay: {
    position: 'absolute',
    width: 48,
    height: 48,
    zIndex: 1000,
  },
  rocketOverlayGradient: {
    flex: 1,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#F68B1E',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 12,
    elevation: 12,
  },
  nextButtonText: {
    color: '#FFFFFF',
    fontSize: moderateScale(17),
    fontWeight: '700',
  },
});