import React, { useMemo, useState, useRef, useEffect } from 'react';
import {
  FlatList,
  Image,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
  useColorScheme,
  Animated,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { GHANA_UNIVERSITIES } from '@/constants/campuses';
import { useSelectedCampus } from '@/app/hooks/useSelectedCampus';

const PRIMARY = '#FF9900';
const LOGO_URL = 'https://image2url.com/images/1764506443183-2ff76663-c119-4f05-93b4-d08e42895442.png';

// Add a mapping of common abbreviations to university names
const UNIVERSITY_ABBREVIATIONS: Record<string, string> = {
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

export default function OnboardingScreen() {
  const { width, height } = Dimensions.get('window');
  const anim1 = useRef(new Animated.Value(0)).current;
  const anim2 = useRef(new Animated.Value(0)).current;
  const anim3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim1, { toValue: 1, duration: 6000, useNativeDriver: true }),
        Animated.timing(anim1, { toValue: 0, duration: 6000, useNativeDriver: true }),
      ])
    ).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim2, { toValue: 1, duration: 8000, useNativeDriver: true }),
        Animated.timing(anim2, { toValue: 0, duration: 8000, useNativeDriver: true }),
      ])
    ).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim3, { toValue: 1, duration: 10000, useNativeDriver: true }),
        Animated.timing(anim3, { toValue: 0, duration: 10000, useNativeDriver: true }),
      ])
    ).start();
  }, [anim1, anim2, anim3]);

  const router = useRouter();
  const scheme = useColorScheme() || 'light';
  const isDark = scheme === 'dark';

  const { campus, save } = useSelectedCampus();
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<string>(campus || '');
  const [saving, setSaving] = useState(false);

  const colors = {
    bg: isDark ? '#0B0B0B' : '#FFFFFF',
    text: isDark ? '#FFFFFF' : '#101828',
    sub: isDark ? '#B7BDC7' : '#667085',
    card: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(16,24,40,0.04)',
    border: isDark ? 'rgba(255,255,255,0.14)' : 'rgba(16,24,40,0.12)',
    inputBg: isDark ? 'rgba(255,255,255,0.08)' : '#FFFFFF',
  };

  // Helper to get acronym from university name, skipping stopwords
  const ACRONYM_STOPWORDS = new Set(['of', 'for', 'and', 'the', 'in', 'at', 'on']);
  function getAcronym(name: string) {
    return name
      .split(/\s+/)
      .filter((w) => /[A-Za-z]/.test(w[0]) && !ACRONYM_STOPWORDS.has(w.toLowerCase()))
      .map((w) => w[0].toUpperCase())
      .join('');
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
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
  }, [search]);

  const onContinue = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      await save(selected);
      // After saving campus, navigate and trigger refresh
      router.replace({ pathname: '/(tabs)', params: { refresh: '1' } });
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={[styles2.root, { backgroundColor: colors.bg }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {/* Animated colorful blobs */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <LinearGradient
          colors={isDark ? ['#0B0B0B', '#121212', '#0B0B0B'] : ['#FFFFFF', '#FFF6EC', '#FFFFFF']}
          style={StyleSheet.absoluteFillObject}
        />
        <Animated.View
          style={[
            styles2.blob,
            {
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
            },
          ]}
        />
        <Animated.View
          style={[
            styles2.blob,
            {
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
            },
          ]}
        />
        <Animated.View
          style={[
            styles2.blob,
            {
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
            },
          ]}
        />
      </View>

      {/* Main content */}
      <View style={styles2.header}>
        <View style={{ alignItems: 'center', width: '100%' }}>
          <Image source={{ uri: LOGO_URL }} style={styles2.logo} />
        </View>
        <Text style={[styles2.title, { color: colors.text, textAlign: 'center' }]}>Choose your university</Text>
        <Text style={[styles2.subtitle, { color: colors.sub, textAlign: 'center' }]}>We’ll show products, search results, and events for this university.</Text>
      </View>
      <View style={styles2.searchWrap}>
        <View style={[styles2.searchBox, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
          <Ionicons name="search" size={18} color={colors.sub} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search university"
            placeholderTextColor={colors.sub}
            style={[styles2.searchInput, { color: colors.text }]}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {!!search && (
            <Pressable onPress={() => setSearch('')} hitSlop={10}>
              <Ionicons name="close-circle" size={18} color={colors.sub} />
            </Pressable>
          )}
        </View>
      </View>
      <FlatList
        data={filtered}
        keyExtractor={(item) => item}
        contentContainerStyle={styles2.listContent}
        renderItem={({ item }) => {
          const isSelected = item === selected;
          const acronym = getAcronym(item);
          return (
            <Pressable
              onPress={() => setSelected(item)}
              style={[
                styles2.row,
                { backgroundColor: colors.card, borderColor: isSelected ? PRIMARY : colors.border },
              ]}
            >
              <View style={styles2.rowLeft}>
                <Ionicons name="school" size={18} color={isSelected ? PRIMARY : colors.sub} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles2.rowText, { color: colors.text }]} numberOfLines={2}>
                    {item}
                  </Text>
                  <Text style={{ color: colors.sub, fontSize: 12, marginTop: 2 }}>
                    {acronym}
                  </Text>
                </View>
              </View>
              <Ionicons
                name={isSelected ? 'radio-button-on' : 'radio-button-off'}
                size={20}
                color={isSelected ? PRIMARY : colors.sub}
              />
            </Pressable>
          );
        }}
      />
      <View style={styles2.footer}>
        <Pressable
          onPress={onContinue}
          disabled={!selected || saving}
          style={({ pressed }) => [
            styles2.cta,
            { backgroundColor: !selected || saving ? `${PRIMARY}66` : PRIMARY },
            pressed && selected && !saving ? { transform: [{ scale: 0.99 }] } : null,
          ]}
        >
          <Text style={styles2.ctaText}>{saving ? 'Saving…' : 'Continue'}</Text>
          <Ionicons name="arrow-forward" size={18} color="#000" />
        </Pressable>
        <Text style={[styles2.hint, { color: colors.sub }]}>You can change this later from Profile.</Text>
      </View>
    </View>
  );
}

const styles2 = StyleSheet.create({
  root: {
    flex: 1,
    paddingTop: 0,
    paddingHorizontal: 0,
  },
  header: {
    paddingTop: 60,
    paddingBottom: 24,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  logo: {
    width: 80,
    height: 80,
    marginBottom: 12,
    borderRadius: 20,
    backgroundColor: '#fff',
    alignSelf: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#888',
    marginBottom: 0,
  },
  searchWrap: {
    paddingHorizontal: 24,
    marginBottom: 8,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginBottom: 0,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    marginLeft: 8,
    paddingVertical: 4,
  },
  listContent: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  rowText: {
    fontSize: 16,
    marginLeft: 10,
    flex: 1,
    fontWeight: '500',
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 32,
    alignItems: 'center',
  },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 24,
    marginBottom: 8,
    backgroundColor: PRIMARY,
    width: '100%',
  },
  ctaText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '800',
    marginRight: 8,
  },
  hint: {
    marginTop: 10,
    textAlign: 'center',
    fontSize: 12,
  },
  blob: {
    position: 'absolute',
    borderRadius: 9999,
  },
});

