import React from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  useColorScheme,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type SearchSuggestion = {
  id: string;
  type: 'product' | 'category' | 'shop';
  value: string;
  label: string;
};

const SearchSuggestions: React.FC<{
  visible: boolean;
  suggestions: SearchSuggestion[];
  onSelectSuggestion: (suggestion: SearchSuggestion) => void;
  onClose: () => void;
  styles: any;
  PRIMARY_COLOR: string;
  DARK_BACKGROUND: string;
  LIGHT_BACKGROUND: string;
  DARK_TEXT: string;
  LIGHT_TEXT: string;
}> = ({
  visible,
  suggestions,
  onSelectSuggestion,
  onClose,
  styles,
  PRIMARY_COLOR,
  DARK_BACKGROUND,
  LIGHT_BACKGROUND,
  DARK_TEXT,
  LIGHT_TEXT,
}) => {
  const colorScheme = useColorScheme();

  if (!visible || suggestions.length === 0) return null;

  const getIconName = (type: string) => {
    switch (type) {
      case 'product': return 'pricetag-outline';
      case 'category': return 'grid-outline';
      case 'shop': return 'storefront-outline';
      default: return 'search-outline';
    }
  };

  const getIconColor = (type: string) => {
    switch (type) {
      case 'product': return '#4CAF50';
      case 'category': return '#2196F3';
      case 'shop': return '#FF9800';
      default: return PRIMARY_COLOR;
    }
  };

  const isDark = colorScheme === 'dark';
  const backgroundColor = isDark ? DARK_BACKGROUND : LIGHT_BACKGROUND;
  const textColor = isDark ? DARK_TEXT : LIGHT_TEXT;
  const borderColor = isDark ? '#333' : '#e0e0e0';

  return (
    <View style={styles.suggestionsContainer}>
      <TouchableOpacity
        style={styles.suggestionsBackdrop}
        activeOpacity={1}
        onPress={onClose}
      />
      <View style={[styles.suggestionsListContainer, {
        backgroundColor,
        borderColor
      }]}>
        <FlatList
          data={suggestions}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.suggestionItem}
              onPress={() => onSelectSuggestion(item)}
            >
              <Ionicons
                name={getIconName(item.type) as any}
                size={20}
                color={getIconColor(item.type)}
              />
              <View style={styles.suggestionContent}>
                <Text style={[styles.suggestionLabel, { color: textColor }]}>{item.label}</Text>
                <Text style={[styles.suggestionValue, { color: textColor }]} numberOfLines={1}>
                  {item.value}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={PRIMARY_COLOR} />
            </TouchableOpacity>
          )}
          ItemSeparatorComponent={() => <View style={[styles.suggestionDivider, { backgroundColor: borderColor }]} />}
        />
      </View>
    </View>
  );
};

export default SearchSuggestions;
