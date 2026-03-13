import React, { useState } from 'react';
import { ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { createStyles, LIGHT_COLORS, SearchSuggestion } from '../index';

export const SearchBar = ({
  searchQuery,
  setSearchQuery,
  suggestions,
  onSelectSuggestion,
  onClearSearch,
  colors,
  placeholder = 'Search events by title or organizer...',
}: {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  suggestions: SearchSuggestion[];
  onSelectSuggestion: (suggestion: SearchSuggestion) => void;
  onClearSearch: () => void;
  colors: typeof LIGHT_COLORS;
  placeholder?: string;
}) => {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const styles = createStyles(colors);

  const handleSelectSuggestion = (suggestion: SearchSuggestion) => {
    onSelectSuggestion(suggestion);
    setShowSuggestions(false);
  };

  return (
    <View style={[styles.searchContainer, { zIndex: 1000 }]}>
      <View style={styles.searchInputWrapper}>
        <View style={styles.searchIconContainer}>
          <Text style={styles.searchIcon}>🔍</Text>
        </View>

        <TextInput
          style={styles.searchInput}
          value={searchQuery}
          onChangeText={(text) => {
            setSearchQuery(text);
            setShowSuggestions(text.length > 0);
          }}
          placeholder={placeholder}
          placeholderTextColor={colors.textTertiary}
          onFocus={() => setShowSuggestions(searchQuery.length > 0)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
        />

        {searchQuery.length > 0 && (
          <TouchableOpacity
            style={styles.clearSearchButton}
            onPress={() => {
              setSearchQuery('');
              onClearSearch();
              setShowSuggestions(false);
            }}
          >
            <Text style={styles.clearSearchIcon}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {showSuggestions && suggestions.length > 0 && (
        <View style={styles.suggestionsContainer}>
          <ScrollView
            style={styles.suggestionsList}
            nestedScrollEnabled={true}
            showsVerticalScrollIndicator={false}
          >
            {suggestions.map((suggestion) => {
              const icon = suggestion.type === 'title' ? '📅'
                : suggestion.type === 'organizer' ? '👥'
                : suggestion.type === 'announcementTitle' ? '📢'
                : '🎯';
              const subtitleLabel = suggestion.type === 'title' ? 'Event'
                : suggestion.type === 'organizer' ? 'Organizer'
                : suggestion.type === 'announcementTitle' ? 'Announcement'
                : 'Audience';
              return (
                <TouchableOpacity
                  key={`${suggestion.id}-${suggestion.type}`}
                  style={styles.suggestionItem}
                  onPress={() => handleSelectSuggestion(suggestion)}
                >
                  <View style={styles.suggestionIconContainer}>
                    <Text style={styles.suggestionIcon}>{icon}</Text>
                  </View>
                  <View style={styles.suggestionContent}>
                    <Text style={styles.suggestionTitle} numberOfLines={1}>
                      {suggestion.title}
                    </Text>
                    <Text style={styles.suggestionSubtitle} numberOfLines={1}>
                      {subtitleLabel} • {suggestion.organizer}
                    </Text>
                  </View>
                  <Text style={styles.suggestionArrow}>→</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
          <View style={styles.suggestionsFooter}>
            <Text style={styles.suggestionsFooterText}>
              {suggestions.length} suggestion{suggestions.length !== 1 ? 's' : ''} found
            </Text>
          </View>
        </View>
      )}
    </View>
  );
};

    export default SearchBar;