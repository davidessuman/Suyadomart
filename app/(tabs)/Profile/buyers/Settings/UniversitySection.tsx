import React from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type Props = {
  styles: any;
  colors: any;
  universitySearch: string;
  setUniversitySearch: (v: string) => void;
  filteredUniversities: string[];
  selectedSchool: string;
  setSelectedSchool: (v: string) => void;
  saveSchool: () => void;
};

export default function UniversitySection({
  styles,
  colors,
  universitySearch,
  setUniversitySearch,
  filteredUniversities,
  selectedSchool,
  setSelectedSchool,
  saveSchool,
}: Props) {
  return (
    <>
      <View style={[styles.searchContainer, { backgroundColor: colors.inputBg, borderColor: colors.border }]}> 
        <Ionicons name="search" size={20} color={colors.textSecondary} style={styles.searchIcon} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder="Search universities..."
          placeholderTextColor={colors.textSecondary}
          value={universitySearch}
          onChangeText={setUniversitySearch}
          autoCapitalize="none"
          returnKeyType="search"
        />
        {universitySearch ? (
          <TouchableOpacity onPress={() => setUniversitySearch('')}>
            <Ionicons name="close-circle" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        ) : null}
      </View>

      <View style={styles.universityListContainer}>
        <FlatList
          data={filteredUniversities}
          keyExtractor={(item) => item}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.universityListContent}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.universityCard,
                {
                  backgroundColor: selectedSchool === item ? colors.primary + '10' : colors.card,
                  borderColor: selectedSchool === item ? colors.primary : colors.border,
                },
              ]}
              onPress={() => setSelectedSchool(item)}
            >
              <View style={styles.universityCardContent}>
                <View style={[styles.universityIcon, { backgroundColor: colors.primary + '15' }]}>
                  <Ionicons
                    name="school"
                    size={20}
                    color={selectedSchool === item ? colors.primary : colors.textSecondary}
                  />
                </View>
                <View style={styles.universityInfo}>
                  <Text
                    style={[
                      styles.universityName,
                      {
                        color: selectedSchool === item ? colors.primary : colors.text,
                        fontWeight: selectedSchool === item ? '600' : '400',
                      },
                    ]}
                  >
                    {item}
                  </Text>
                  {selectedSchool === item && (
                    <Text style={[styles.selectedLabel, { color: colors.success }]}>Currently Selected</Text>
                  )}
                </View>
                {selectedSchool === item && (
                  <View style={[styles.selectedCheck, { backgroundColor: colors.success }]}>
                    <Ionicons name="checkmark" size={18} color="white" />
                  </View>
                )}
              </View>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="search-outline" size={48} color={colors.textSecondary} />
              <Text style={[styles.emptyStateText, { color: colors.textSecondary }]}>No universities found</Text>
              <Text style={[styles.emptyStateSubtext, { color: colors.textSecondary }]}>Try a different search term</Text>
            </View>
          }
        />
      </View>

      {selectedSchool && (
        null
      )}
    </>
  );
}
