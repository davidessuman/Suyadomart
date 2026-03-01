
import React, { useState, useEffect } from 'react';
import EventDetailsModal from './EventDetailsModal';
import EventEditModal from './EventEditModal';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, FlatList, Image, ScrollView, TextInput, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../../../lib/supabase';

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
  STU: 'Sunyani Technical University',
  ASHESI: 'Ashesi University',
  VVU: 'Valley View University',
};
const ACRONYM_STOPWORDS = new Set(['of', 'for', 'and', 'the', 'in', 'at', 'on']);

const getUniversityAcronym = (name: string) =>
  name
    .split(/\s+/)
    .filter((word) => /[A-Za-z]/.test(word[0]) && !ACRONYM_STOPWORDS.has(word.toLowerCase()))
    .map((word) => word[0].toUpperCase())
    .join('');

const normalizeAbbreviationToken = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, '');

type DateFilterType = 'All' | 'Today' | 'Tomorrow' | 'This Week' | 'This Month' | 'Next Month';

const DATE_FILTER_OPTIONS: { label: DateFilterType; icon: keyof typeof Ionicons.glyphMap }[] = [
  { label: 'All', icon: 'apps-outline' },
  { label: 'Today', icon: 'today-outline' },
  { label: 'Tomorrow', icon: 'play-forward-outline' },
  { label: 'This Week', icon: 'calendar-outline' },
  { label: 'This Month', icon: 'calendar-number-outline' },
  { label: 'Next Month', icon: 'arrow-forward-circle-outline' },
];

const EventsPanel = () => {
  const { width } = useWindowDimensions();
  const isMobile = width < 700;
  const columns = width >= 1300 ? 3 : width >= 900 ? 2 : 1;
  const isWideLayout = columns > 1;

  const [activeTab, setActiveTab] = useState<'Events' | 'Announcements'>('Events');
  const [events, setEvents] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<any | null>(null);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<any | null>(null);
  const [editType, setEditType] = useState<'event' | 'announcement' | null>(null);
  const [selectedUniversity, setSelectedUniversity] = useState<string | null>(null);
  const [showUniversityDropdown, setShowUniversityDropdown] = useState(false);
  const [universitySearchTerm, setUniversitySearchTerm] = useState('');
  const [contentSearchTerm, setContentSearchTerm] = useState('');
  const [activeDateFilter, setActiveDateFilter] = useState<DateFilterType>('All');
  const [showDateFilterDropdown, setShowDateFilterDropdown] = useState(false);

  const allUniversityOptions = Array.from(
    new Set(
      [...events, ...announcements]
        .map((item) => item?.university?.trim())
        .filter((university): university is string => typeof university === 'string' && university.trim().length > 0)
    )
  ).sort((first, second) => first.localeCompare(second));

  const filteredUniversityOptions = (() => {
    const query = universitySearchTerm.trim().toLowerCase();
    const normalizedQuery = normalizeAbbreviationToken(query);

    if (!query) {
      return allUniversityOptions;
    }

    const abbreviationMatch = Object.entries(UNIVERSITY_ABBREVIATIONS).find(
      ([abbreviation]) => normalizeAbbreviationToken(abbreviation) === normalizedQuery
    );

    if (abbreviationMatch) {
      const matchedUniversity = abbreviationMatch[1];
      return allUniversityOptions.includes(matchedUniversity) ? [matchedUniversity] : [];
    }

    return allUniversityOptions.filter((university) => {
      const normalizedName = university.toLowerCase();
      const acronym = getUniversityAcronym(university).toLowerCase();
      const normalizedAcronym = normalizeAbbreviationToken(acronym);

      return (
        normalizedName.includes(query) ||
        acronym.includes(query) ||
        normalizedAcronym.includes(normalizedQuery)
      );
    });
  })();

  const normalizedContentSearchTerm = contentSearchTerm.trim().toLowerCase();

  const getEventSearchText = (item: any) => {
    const perDayDescriptions =
      item?.per_day_descriptions && typeof item.per_day_descriptions === 'object'
        ? Object.values(item.per_day_descriptions).join(' ')
        : '';

    return [
      item?.title,
      item?.organizer,
      item?.category,
      item?.university,
      item?.venue,
      item?.platform,
      item?.description,
      item?.date,
      perDayDescriptions,
    ]
      .filter((value) => typeof value === 'string' && value.trim().length > 0)
      .join(' ')
      .toLowerCase();
  };

  const getAnnouncementSearchText = (item: any) =>
    [
      item?.title,
      item?.announced_for,
      item?.category,
      item?.priority,
      item?.university,
      item?.message,
      item?.description,
      item?.content,
    ]
      .filter((value) => typeof value === 'string' && value.trim().length > 0)
      .join(' ')
      .toLowerCase();

  const isDateInActiveFilter = (dateStr?: string) => {
    if (activeDateFilter === 'All') return true;
    if (!dateStr) return false;

    const eventDate = new Date(dateStr);
    if (Number.isNaN(eventDate.getTime())) return false;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    eventDate.setHours(0, 0, 0, 0);

    switch (activeDateFilter) {
      case 'Today':
        return eventDate.toDateString() === today.toDateString();
      case 'Tomorrow': {
        const tomorrow = new Date(today);
        tomorrow.setDate(today.getDate() + 1);
        return eventDate.toDateString() === tomorrow.toDateString();
      }
      case 'This Week': {
        const dayOfWeek = today.getDay();
        const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() + diffToMonday);
        weekStart.setHours(0, 0, 0, 0);

        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        weekEnd.setHours(23, 59, 59, 999);

        return eventDate >= weekStart && eventDate <= weekEnd;
      }
      case 'This Month': {
        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
        const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        monthEnd.setHours(23, 59, 59, 999);

        return eventDate >= monthStart && eventDate <= monthEnd;
      }
      case 'Next Month': {
        const nextMonthStart = new Date(today.getFullYear(), today.getMonth() + 1, 1);
        const nextMonthEnd = new Date(today.getFullYear(), today.getMonth() + 2, 0);
        nextMonthEnd.setHours(23, 59, 59, 999);

        return eventDate >= nextMonthStart && eventDate <= nextMonthEnd;
      }
      default:
        return true;
    }
  };

  const getAnnouncementDates = (item: any): string[] => {
    const rawDates = item?.announcement_dates;
    if (!rawDates) return [];

    if (Array.isArray(rawDates)) {
      return rawDates.filter((date): date is string => typeof date === 'string' && date.length > 0);
    }

    if (typeof rawDates === 'string') {
      try {
        const parsed = JSON.parse(rawDates);
        if (Array.isArray(parsed)) {
          return parsed.filter((date): date is string => typeof date === 'string' && date.length > 0);
        }
      } catch {
        return [];
      }
    }

    return [];
  };

  const filteredEvents = events
    .filter((item) => !selectedUniversity || item.university?.trim() === selectedUniversity)
    .filter((item) => isDateInActiveFilter(item?.date))
    .filter((item) => !normalizedContentSearchTerm || getEventSearchText(item).includes(normalizedContentSearchTerm));

  const filteredAnnouncements = announcements
    .filter((item) => !selectedUniversity || item.university?.trim() === selectedUniversity)
    .filter((item) => {
      if (activeDateFilter === 'All') return true;
      const dates = getAnnouncementDates(item);
      return dates.some((date) => isDateInActiveFilter(date));
    })
    .filter((item) => !normalizedContentSearchTerm || getAnnouncementSearchText(item).includes(normalizedContentSearchTerm));

  const selectedCount = activeTab === 'Events' ? filteredEvents.length : filteredAnnouncements.length;

  useEffect(() => {
    setLoading(true);
    setError(null);
    if (activeTab === 'Events') {
      supabase
        .from('events')
        .select('*')
        .order('date', { ascending: false })
        .then((result: { data: any[] | null; error: any }) => {
          if (result.error) {
            setError('Failed to load events.');
            setEvents([]);
          } else {
            setEvents(result.data || []);
          }
          setLoading(false);
        });
    } else if (activeTab === 'Announcements') {
      supabase
        .from('announcements')
        .select('*')
        .order('created_at', { ascending: false })
        .then((result: { data: any[] | null; error: any }) => {
          if (result.error) {
            setError('Failed to load announcements.');
            setAnnouncements([]);
          } else {
            setAnnouncements(result.data || []);
          }
          setLoading(false);
        });
    }
  }, [activeTab]);

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ flexGrow: 1 }} horizontal={isWideLayout}>
      <View style={[styles.container, isMobile && styles.containerMobile]}>
        <View
          style={{
            marginBottom: 4,
            marginTop: 0,
            alignItems: isMobile ? 'flex-start' : 'center',
            width: '100%',
          }}
        >
          <Text
            style={{
              fontSize: isMobile ? 13 : 15,
              fontWeight: '700',
              color: '#183B56',
              textAlign: isMobile ? 'left' : 'center',
              letterSpacing: 0.05,
              textTransform: 'uppercase',
              width: '100%',
            }}
          >
            {selectedUniversity || 'All Universities'}
          </Text>
        </View>

        <View style={[styles.controlsHeader, isMobile && styles.controlsHeaderMobile]}>
          <View style={[styles.controlsLeft, isMobile && styles.controlsLeftMobile]}>
            <View style={[styles.tabSwitchRow, isMobile && styles.tabSwitchRowMobile]}>
              <TouchableOpacity
                style={[styles.tabButton, styles.tabSwitchButton, isMobile && styles.tabSwitchButtonMobile, activeTab === 'Events' && styles.tabButtonActive]}
                onPress={() => setActiveTab('Events')}
              >
                <Text numberOfLines={1} style={[styles.tabButtonText, activeTab === 'Events' && styles.tabButtonTextActive]}>Events</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tabButton, styles.tabSwitchButton, isMobile && styles.tabSwitchButtonMobile, activeTab === 'Announcements' && styles.tabButtonActive]}
                onPress={() => {
                  setActiveTab('Announcements');
                  setShowUniversityDropdown(false);
                }}
              >
                <Text numberOfLines={1} style={[styles.tabButtonText, activeTab === 'Announcements' && styles.tabButtonTextActive]}>Announcements</Text>
              </TouchableOpacity>
            </View>

            <View style={[styles.filterRow, isMobile && styles.filterRowMobile]}>
              <TouchableOpacity
                style={[styles.universityButton, isMobile && styles.universityButtonMobile]}
                onPress={() => {
                  setShowDateFilterDropdown(false);
                  setShowUniversityDropdown((prev) => !prev);
                  if (showUniversityDropdown) {
                    setUniversitySearchTerm('');
                  }
                }}
              >
                <Ionicons name="school-outline" size={14} color="#1D4ED8" />
                <Text
                  style={styles.universityButtonText}
                  numberOfLines={1}
                >
                  {selectedUniversity || 'University'}
                </Text>
                <Ionicons name={showUniversityDropdown ? 'chevron-up' : 'chevron-down'} size={14} color="#1D4ED8" />
              </TouchableOpacity>

              <View style={[styles.contentSearchWrap, isMobile && styles.contentSearchWrapMobile]}>
                <Ionicons name="search" size={14} color="#64748B" />
                <TextInput
                  style={styles.contentSearchInput}
                  value={contentSearchTerm}
                  onChangeText={setContentSearchTerm}
                />
                {contentSearchTerm.length > 0 ? (
                  <TouchableOpacity onPress={() => setContentSearchTerm('')}>
                    <Ionicons name="close-circle" size={16} color="#94A3B8" />
                  </TouchableOpacity>
                ) : null}
              </View>

              {!isMobile ? (
                <TouchableOpacity
                  style={[styles.dateFilterButton, isMobile && styles.dateFilterButtonMobile]}
                  onPress={() => {
                    setShowUniversityDropdown(false);
                    setShowDateFilterDropdown((prev) => !prev);
                  }}
                >
                  <Ionicons name="funnel-outline" size={14} color="#0F766E" />
                  <Text style={styles.dateFilterButtonText} numberOfLines={1}>
                    {activeDateFilter === 'All' ? 'Filter' : activeDateFilter}
                  </Text>
                  <Ionicons name={showDateFilterDropdown ? 'chevron-up' : 'chevron-down'} size={14} color="#0F766E" />
                </TouchableOpacity>
              ) : null}
            </View>
          </View>

          {isMobile ? (
            <View style={styles.mobileMetaRow}>
              <TouchableOpacity
                style={[styles.dateFilterButton, styles.mobileMetaFilterButton]}
                onPress={() => {
                  setShowUniversityDropdown(false);
                  setShowDateFilterDropdown((prev) => !prev);
                }}
              >
                <Ionicons name="funnel-outline" size={14} color="#0F766E" />
                <Text style={styles.dateFilterButtonText} numberOfLines={1}>
                  {activeDateFilter === 'All' ? 'Filter' : activeDateFilter}
                </Text>
                <Ionicons name={showDateFilterDropdown ? 'chevron-up' : 'chevron-down'} size={14} color="#0F766E" />
              </TouchableOpacity>

              <View style={[styles.selectedCountBadge, styles.selectedCountBadgeMobile, styles.topRightCountBadge, styles.topRightCountBadgeMobile]}>
                <View style={styles.selectedCountTopRow}>
                  <Ionicons name={activeTab === 'Events' ? 'calendar-outline' : 'megaphone-outline'} size={12} color="#1D4ED8" />
                  <Text style={styles.selectedCountLabel}>{activeTab}</Text>
                </View>
                <Text style={styles.selectedCountText}>{selectedCount}</Text>
              </View>
            </View>
          ) : (
            <View style={[styles.selectedCountBadge, styles.topRightCountBadge]}>
              <View style={styles.selectedCountTopRow}>
                <Ionicons name={activeTab === 'Events' ? 'calendar-outline' : 'megaphone-outline'} size={12} color="#1D4ED8" />
                <Text style={styles.selectedCountLabel}>{activeTab}</Text>
              </View>
              <Text style={styles.selectedCountText}>{selectedCount}</Text>
            </View>
          )}
        </View>

        {showUniversityDropdown ? (
          <View style={styles.universityDropdown}>
            <TouchableOpacity
              style={styles.universityOption}
              onPress={() => {
                setSelectedUniversity(null);
                setShowUniversityDropdown(false);
                setUniversitySearchTerm('');
              }}
            >
              <Text style={[styles.universityOptionText, !selectedUniversity && styles.universityOptionTextActive]}>
                All Universities
              </Text>
            </TouchableOpacity>

            <View style={styles.universitySearchWrap}>
              <Ionicons name="search" size={14} color="#64748B" />
              <TextInput
                style={styles.universitySearchInput}
                placeholder="Search university or abbreviation"
                placeholderTextColor="#94A3B8"
                value={universitySearchTerm}
                onChangeText={setUniversitySearchTerm}
              />
              {universitySearchTerm.length > 0 ? (
                <TouchableOpacity onPress={() => setUniversitySearchTerm('')}>
                  <Ionicons name="close-circle" size={16} color="#94A3B8" />
                </TouchableOpacity>
              ) : null}
            </View>

            <ScrollView style={styles.universityDropdownScroll} nestedScrollEnabled>
              {filteredUniversityOptions.map((university) => (
                <TouchableOpacity
                  key={university}
                  style={styles.universityOption}
                  onPress={() => {
                    setSelectedUniversity(university);
                    setShowUniversityDropdown(false);
                    setUniversitySearchTerm('');
                  }}
                >
                  <Text
                    style={[
                      styles.universityOptionText,
                      selectedUniversity === university && styles.universityOptionTextActive,
                    ]}
                    numberOfLines={1}
                  >
                    {university}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        ) : null}

        {showDateFilterDropdown ? (
          <View style={styles.dateFilterDropdown}>
            <View style={styles.dateFilterHeader}>
              <Text style={styles.dateFilterHeaderTitle}>Filter by date</Text>
              {activeDateFilter !== 'All' ? (
                <TouchableOpacity
                  style={styles.dateFilterResetButton}
                  onPress={() => {
                    setActiveDateFilter('All');
                    setShowDateFilterDropdown(false);
                  }}
                >
                  <Text style={styles.dateFilterResetText}>Reset</Text>
                </TouchableOpacity>
              ) : null}
            </View>
            {DATE_FILTER_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.label}
                style={[
                  styles.dateFilterOption,
                  activeDateFilter === option.label && styles.dateFilterOptionActive,
                ]}
                onPress={() => {
                  setActiveDateFilter(option.label);
                  setShowDateFilterDropdown(false);
                }}
              >
                <View style={styles.dateFilterOptionLeft}>
                  <Ionicons
                    name={option.icon}
                    size={14}
                    color={activeDateFilter === option.label ? '#0F766E' : '#475569'}
                  />
                  <Text
                    style={[
                      styles.dateFilterOptionText,
                      activeDateFilter === option.label && styles.dateFilterOptionTextActive,
                    ]}
                  >
                    {option.label}
                  </Text>
                </View>
                {activeDateFilter === option.label ? (
                  <Ionicons name="checkmark" size={16} color="#0F766E" />
                ) : null}
              </TouchableOpacity>
            ))}
          </View>
        ) : null}

        {activeTab === 'Events' ? (
          <View style={{ flex: 1 }}>
            {loading ? (
              <ActivityIndicator size="large" color="#2563EB" style={{ marginTop: 24 }} />
            ) : error ? (
              <Text style={{ color: 'red', marginTop: 24 }}>{error}</Text>
            ) : (
              <FlatList
                data={filteredEvents}
                keyExtractor={(item) => item.id}
                key={`events-${columns}`}
                contentContainerStyle={[
                  filteredEvents.length === 0
                    ? { flex: 1, justifyContent: 'center', alignItems: 'center' }
                    : { paddingBottom: 24, gap: 18 },
                  styles.gridContainer,
                ]}
                numColumns={columns}
                columnWrapperStyle={isWideLayout ? styles.gridRow : undefined}
                renderItem={({ item }) => {
                  const hasPerDayDesc = item.per_day_descriptions && Object.keys(item.per_day_descriptions).length > 0;
                  const hasPerDayTimes = item.per_day_times && Object.keys(item.per_day_times).length > 0;
                  const hasPerDayVenues = item.per_day_venues && Object.keys(item.per_day_venues).length > 0;
                  const showDefaultTime = !hasPerDayTimes;
                  const showDefaultVenue = !hasPerDayVenues;
                  const shouldShowVenue = item.appearance !== 'Virtual Meeting' && item.venue;
                  return (
                    <TouchableOpacity
                      style={[styles.cardLayout, isWideLayout && styles.cardGrid]}
                      activeOpacity={0.85}
                      onPress={() => {
                        setSelectedEvent(item);
                        setSelectedAnnouncement(null);
                        setShowDetailsModal(true);
                      }}
                    >
                      <View style={styles.flyerContainer}>
                        {item.flyer_url && item.flyer_url.startsWith('https://') ? (
                          <Image
                            source={{ uri: item.flyer_url }}
                            style={styles.flyerImage}
                            resizeMode="contain"
                          />
                        ) : (
                          <View style={styles.placeholderFlyer}>
                            <Text style={styles.placeholderText}>NO FLYER</Text>
                          </View>
                        )}
                      </View>
                      <View style={styles.cardContent}>
                        <View style={styles.tagRow}>
                          <View style={[styles.categoryBadge, { backgroundColor: '#2E8BC020' }]}><Text style={[styles.categoryBadgeText, { color: '#2E8BC0' }]}>{item.category}</Text></View>
                          <View style={styles.appearanceBadge}><Text style={styles.appearanceBadgeText}>{item.appearance}</Text></View>
                          {hasPerDayDesc && (
                            <View style={styles.multiDayBadge}><Text style={styles.multiDayBadgeText}>Multi-Day</Text></View>
                          )}
                        </View>
                        <Text style={styles.eventTitle} numberOfLines={1}>{item.title}</Text>
                        <Text style={styles.organizerText} numberOfLines={1}>{item.organizer}</Text>
                        {hasPerDayDesc ? (
                          <>
                            <Text style={styles.footerInfo}>
                              📅 {Object.keys(item.per_day_descriptions).length} days • Starts: {item.date}
                            </Text>
                            {showDefaultTime ? (
                              <Text style={styles.footerInfo}>
                                🕒 {item.start_time} - {item.end_time}
                              </Text>
                            ) : (
                              <Text style={styles.footerInfo}>
                                🕒 Multiple times • See details for each day
                              </Text>
                            )}
                            {showDefaultVenue && shouldShowVenue && (
                              <Text style={styles.footerInfo}>📍 {item.venue}</Text>
                            )}
                            {!showDefaultVenue && item.per_day_venues && item.appearance !== 'Virtual Meeting' && (
                              <Text style={styles.footerInfo}>
                                📍 Different venues for each day
                              </Text>
                            )}
                          </>
                        ) : (
                          <>
                            <Text style={styles.footerInfo}>
                              📅 {item.date}
                              {item.start_time && item.end_time && ` • ${item.start_time} - ${item.end_time}`}
                            </Text>
                            {/* Description removed from card */}
                            {shouldShowVenue && <Text style={styles.footerInfo}>📍 {item.venue}</Text>}
                            {item.platform && (item.appearance === 'Virtual Meeting' || item.appearance === 'Both') && <Text style={styles.footerInfo}>💻 {item.platform}</Text>}
                          </>
                        )}
                      </View>
                    </TouchableOpacity>
                  );
                }}
                ListEmptyComponent={<Text style={{ color: '#64748B', marginTop: 32 }}>No events found for selected university.</Text>}
              />
            )}
          </View>
        ) : (
          <View style={{ flex: 1 }}>
            {loading ? (
              <ActivityIndicator size="large" color="#2563EB" style={{ marginTop: 24 }} />
            ) : error ? (
              <Text style={{ color: 'red', marginTop: 24 }}>{error}</Text>
            ) : (
              <FlatList
                data={filteredAnnouncements}
                keyExtractor={(item) => item.id}
                key={`announcements-${columns}`}
                contentContainerStyle={[
                  filteredAnnouncements.length === 0
                    ? { flex: 1, justifyContent: 'center', alignItems: 'center' }
                    : { paddingBottom: 24, gap: 18 },
                  styles.gridContainer,
                ]}
                numColumns={columns}
                columnWrapperStyle={isWideLayout ? styles.gridRow : undefined}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[styles.cardLayout, isWideLayout && styles.cardGrid]}
                    activeOpacity={0.85}
                    onPress={() => {
                      setSelectedAnnouncement(item);
                      setSelectedEvent(null);
                      setShowDetailsModal(true);
                    }}
                  >
                    <View style={styles.flyerContainer}>
                      {item.image_url && item.image_url.startsWith('https://') ? (
                        <Image
                          source={{ uri: item.image_url }}
                          style={styles.flyerImage}
                          resizeMode="contain"
                        />
                      ) : (
                        <View style={styles.placeholderFlyer}>
                          <Text style={styles.placeholderText}>NO IMAGE</Text>
                        </View>
                      )}
                    </View>
                    <View style={styles.cardContent}>
                      <View style={styles.tagRow}>
                        <View style={[styles.categoryBadge, { backgroundColor: '#2E8BC020' }]}><Text style={[styles.categoryBadgeText, { color: '#2E8BC0' }]}>{item.category}</Text></View>
                        <View style={[styles.appearanceBadge, { backgroundColor: item.priority === 'Urgent' ? '#F87171' : '#F1F5F9' }]}><Text style={[styles.appearanceBadgeText, { color: item.priority === 'Urgent' ? '#B91C1C' : '#334155' }]}>{item.priority}</Text></View>
                      </View>
                      <Text style={styles.eventTitle} numberOfLines={1}>{item.title}</Text>
                      <Text style={styles.organizerText} numberOfLines={1}>{item.announced_for}</Text>
                      <Text style={styles.footerInfo}>
                        📅 {item.announcement_dates ? JSON.parse(item.announcement_dates)[0] : ''}
                        {item.from_time && item.to_time && ` • ${item.from_time} - ${item.to_time}`}
                      </Text>
                      {/* Message removed from card */}
                    </View>
                  </TouchableOpacity>
                )}
                ListEmptyComponent={<Text style={{ color: '#64748B', marginTop: 32 }}>No announcements found for selected university.</Text>}
              />
            )}
          </View>
        )}

        <EventDetailsModal
          visible={showDetailsModal}
          onClose={() => setShowDetailsModal(false)}
          onEdit={(item, type) => {
            setShowDetailsModal(false);
            if (type === 'event') {
              setSelectedEvent(item);
              setSelectedAnnouncement(null);
            } else {
              setSelectedAnnouncement(item);
              setSelectedEvent(null);
            }
            setEditType(type);
            setShowEditModal(true);
          }}
          onDelete={async (item, type) => {
            const table = type === 'event' ? 'events' : 'announcements';
            const { error: deleteError } = await supabase
              .from(table)
              .delete()
              .eq('id', item.id);

            if (deleteError) {
              throw new Error(type === 'event' ? 'Failed to delete event.' : 'Failed to delete announcement.');
            }

            if (type === 'event') {
              setEvents((prev) => prev.filter((row) => row.id !== item.id));
            } else {
              setAnnouncements((prev) => prev.filter((row) => row.id !== item.id));
            }

          }}
          event={selectedEvent}
          announcement={selectedAnnouncement}
        />
        <EventEditModal
          visible={showEditModal}
          onClose={() => setShowEditModal(false)}
          item={editType === 'event' ? selectedEvent : selectedAnnouncement}
          type={editType}
          onSaved={(updatedItem, type) => {
            if (type === 'event') {
              setEvents((prev) => prev.map((row) => (row.id === updatedItem.id ? updatedItem : row)));
              setSelectedEvent(updatedItem);
            } else {
              setAnnouncements((prev) => prev.map((row) => (row.id === updatedItem.id ? updatedItem : row)));
              setSelectedAnnouncement(updatedItem);
            }
          }}
        />
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
    gridContainer: {
      // Only applies on desktop
      flexGrow: 1,
    },
    gridRow: {
      flex: 1,
      justifyContent: 'flex-start',
      gap: 18,
    },
    cardGrid: {
      flex: 1,
      minWidth: 260,
      maxWidth: 320,
      marginHorizontal: 6,
    },
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 24,
  },
  containerMobile: {
    padding: 12,
  },
  tabRow: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  controlsLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  controlsLeftMobile: {
    width: '100%',
    flexDirection: 'column',
    alignItems: 'stretch',
  },
  tabSwitchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  tabSwitchRowMobile: {
    width: '100%',
  },
  tabSwitchButton: {
    minWidth: 130,
  },
  tabSwitchButtonMobile: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  filterRowMobile: {
    width: '100%',
  },
  controlsHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 18,
    gap: 10,
  },
  controlsHeaderMobile: {
    flexDirection: 'column',
    alignItems: 'stretch',
    gap: 8,
  },
  tabRowMobile: {
    gap: 8,
    flex: 1,
  },
  tabButton: {
    minHeight: 38,
    paddingVertical: 8,
    paddingHorizontal: 22,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabButtonActive: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  tabButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#334155',
  },
  tabButtonTextActive: {
    color: '#fff',
  },
  topButtonMobile: {
    flex: 1,
    minWidth: 0,
    paddingHorizontal: 12,
  },
  universityButton: {
    minHeight: 38,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 12,
    paddingVertical: 9,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  universityButtonMobile: {
    flex: 0.9,
    minWidth: 120,
  },
  universityButtonText: {
    flex: 1,
    fontSize: 13,
    color: '#1E3A8A',
    fontWeight: '600',
  },
  dateFilterButton: {
    minHeight: 38,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#99F6E4',
    backgroundColor: '#F0FDFA',
    paddingHorizontal: 12,
    paddingVertical: 9,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minWidth: 120,
  },
  dateFilterButtonMobile: {
    minWidth: 0,
    flex: 0.8,
  },
  mobileMetaRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  mobileMetaFilterButton: {
    flex: 1,
    minWidth: 0,
  },
  dateFilterButtonText: {
    flex: 1,
    fontSize: 13,
    color: '#0F766E',
    fontWeight: '600',
  },
  contentSearchWrap: {
    minHeight: 38,
    minWidth: 220,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#DBEAFE',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  contentSearchWrapMobile: {
    minWidth: 0,
    flex: 1.1,
  },
  contentSearchInput: {
    flex: 1,
    fontSize: 13,
    color: '#0F172A',
    paddingVertical: 0,
    backgroundColor: 'transparent',
    borderWidth: 0,
    outlineWidth: 0,
  },
  selectedCountBadge: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    minHeight: 28,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 60,
  },
  selectedCountBadgeMobile: {
    minWidth: 56,
    paddingHorizontal: 6,
  },
  topRightCountBadge: {
    alignSelf: 'center',
  },
  topRightCountBadgeMobile: {
    alignSelf: 'flex-start',
  },
  selectedCountTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  selectedCountLabel: {
    fontSize: 10,
    color: '#1D4ED8',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  selectedCountText: {
    marginTop: 2,
    fontSize: 16,
    color: '#1D4ED8',
    fontWeight: '700',
    lineHeight: 18,
    textAlign: 'center',
  },
  universityDropdown: {
    marginTop: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#DBEAFE',
    backgroundColor: '#FFFFFF',
    maxHeight: 220,
    overflow: 'hidden',
  },
  universityDropdownScroll: {
    maxHeight: 160,
  },
  dateFilterDropdown: {
    marginTop: 8,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#D1FAE5',
    backgroundColor: '#FFFFFF',
    paddingVertical: 6,
    overflow: 'hidden',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 4,
  },
  dateFilterHeader: {
    paddingHorizontal: 12,
    paddingBottom: 8,
    marginBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#ECFDF5',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dateFilterHeaderTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F766E',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  dateFilterResetButton: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#CCFBF1',
    backgroundColor: '#F0FDFA',
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  dateFilterResetText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F766E',
  },
  dateFilterOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginHorizontal: 6,
    marginVertical: 2,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  dateFilterOptionActive: {
    borderColor: '#99F6E4',
    backgroundColor: '#ECFDF5',
  },
  dateFilterOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dateFilterOptionText: {
    fontSize: 13,
    color: '#334155',
  },
  dateFilterOptionTextActive: {
    color: '#0F766E',
    fontWeight: '700',
  },
  universitySearchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  universitySearchInput: {
    flex: 1,
    fontSize: 13,
    color: '#0F172A',
    paddingVertical: 0,
    backgroundColor: 'transparent',
    borderWidth: 0,
    outlineWidth: 0,
  },
  universityOption: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  universityOptionText: {
    fontSize: 13,
    color: '#334155',
  },
  universityOptionTextActive: {
    color: '#1D4ED8',
    fontWeight: '700',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: '#64748B',
  },
  cardLayout: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 18,
    overflow: 'hidden',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  flyerContainer: {
    width: 110,
    height: 110,
    backgroundColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
    borderTopLeftRadius: 12,
    borderBottomLeftRadius: 12,
    marginRight: 14,
    overflow: 'hidden',
  },
  flyerImage: {
    width: 110,
    height: 110,
    borderRadius: 0,
  },
  placeholderFlyer: {
    width: 110,
    height: 110,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E5E7EB',
  },
  placeholderText: {
    color: '#64748B',
    fontWeight: '600',
    fontSize: 13,
  },
  cardContent: {
    flex: 1,
    paddingVertical: 12,
    paddingRight: 12,
    justifyContent: 'center',
  },
  tagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 6,
  },
  categoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    marginRight: 4,
  },
  categoryBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  appearanceBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    marginRight: 4,
  },
  appearanceBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#334155',
  },
  multiDayBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    backgroundColor: '#FDE68A',
    marginRight: 4,
  },
  multiDayBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#B45309',
  },
  eventTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 2,
  },
  organizerText: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 2,
  },
  footerInfo: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 2,
  },

});

export default EventsPanel;
