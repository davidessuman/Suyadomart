import React from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  ScrollView,
  useColorScheme,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const AdvancedSearchPanel: React.FC<{
  visible: boolean;
  onClose: () => void;
  searchParams: {
    productName: string;
    category: string;
    shopName: string;
  };
  onSearchParamsChange: (params: {
    productName: string;
    category: string;
    shopName: string;
  }) => void;
  onApplySearch: () => void;
  categories: string[];
  styles: any;
  PRIMARY_COLOR: string;
  DARK_BACKGROUND: string;
  LIGHT_BACKGROUND: string;
  DARK_TEXT: string;
  LIGHT_TEXT: string;
}> = ({
  visible,
  onClose,
  searchParams,
  onSearchParamsChange,
  onApplySearch,
  categories,
  styles,
  PRIMARY_COLOR,
  DARK_BACKGROUND,
  LIGHT_BACKGROUND,
  DARK_TEXT,
  LIGHT_TEXT,
}) => {
  const colorScheme = useColorScheme();

  if (!visible) return null;

  const isDark = colorScheme === 'dark';
  const backgroundColor = isDark ? DARK_BACKGROUND : LIGHT_BACKGROUND;
  const textColor = isDark ? DARK_TEXT : LIGHT_TEXT;
  const borderColor = isDark ? '#333' : '#e0e0e0';
  const inputBackground = isDark ? '#252525' : '#f8f8f8';
  const chipBackground = isDark ? '#1e1e1e' : '#ffffff';

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={[styles.advancedSearchOverlay, { backgroundColor: 'rgba(0,0,0,0.7)' }]}>
        <View style={[styles.advancedSearchPanel, { backgroundColor }]}>
          <View style={[styles.advancedSearchHeader, { backgroundColor: PRIMARY_COLOR }]}>
            <Text style={styles.advancedSearchTitle}>Specific Product Search</Text>
            <TouchableOpacity onPress={onClose} style={styles.advancedSearchCloseButton}>
              <Ionicons name="close" size={24} color="#fff" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.advancedSearchContent}>
            <View style={styles.searchFieldGroup}>
              <Text style={[styles.searchFieldLabel, { color: textColor }]}>Product Name</Text>
              <TextInput
                style={[
                  styles.searchFieldInput,
                  {
                    backgroundColor: inputBackground,
                    borderColor,
                    color: textColor,
                  },
                ]}
                placeholder="Enter product name"
                value={searchParams.productName}
                onChangeText={(text) => onSearchParamsChange({ ...searchParams, productName: text })}
                placeholderTextColor={isDark ? '#888' : '#999'}
              />
            </View>

            <View style={styles.searchFieldGroup}>
              <Text style={[styles.searchFieldLabel, { color: textColor }]}>Category</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoriesScroll}>
                <TouchableOpacity
                  style={[
                    styles.categoryChip,
                    !searchParams.category && styles.categoryChipSelected,
                    {
                      backgroundColor: chipBackground,
                      borderColor,
                    },
                  ]}
                  onPress={() => onSearchParamsChange({ ...searchParams, category: '' })}
                >
                  <Text
                    style={[
                      styles.categoryChipText,
                      !searchParams.category && styles.categoryChipTextSelected,
                      {
                        color: !searchParams.category ? '#fff' : textColor,
                      },
                    ]}
                  >
                    All Categories
                  </Text>
                </TouchableOpacity>
                {categories.slice(0, 10).map((category) => (
                  <TouchableOpacity
                    key={category}
                    style={[
                      styles.categoryChip,
                      searchParams.category === category && styles.categoryChipSelected,
                      {
                        backgroundColor: chipBackground,
                        borderColor,
                      },
                    ]}
                    onPress={() => onSearchParamsChange({ ...searchParams, category })}
                  >
                    <Text
                      style={[
                        styles.categoryChipText,
                        searchParams.category === category && styles.categoryChipTextSelected,
                        {
                          color: searchParams.category === category ? '#fff' : textColor,
                        },
                      ]}
                    >
                      {category}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <View style={styles.searchFieldGroup}>
              <Text style={[styles.searchFieldLabel, { color: textColor }]}>Shop Name</Text>
              <TextInput
                style={[
                  styles.searchFieldInput,
                  {
                    backgroundColor: inputBackground,
                    borderColor,
                    color: textColor,
                  },
                ]}
                placeholder="Enter shop name"
                value={searchParams.shopName}
                onChangeText={(text) => onSearchParamsChange({ ...searchParams, shopName: text })}
                placeholderTextColor={isDark ? '#888' : '#999'}
              />
            </View>

            <View
              style={[
                styles.searchTips,
                {
                  backgroundColor: isDark ? '#1e1e1e' : '#f8f8f8',
                  borderColor,
                },
              ]}
            >
              <Text style={[styles.searchTipsTitle, { color: textColor }]}>Search Tips:</Text>
              <View style={styles.searchTip}>
                <Ionicons name="information-circle-outline" size={16} color={PRIMARY_COLOR} />
                <Text style={[styles.searchTipText, { color: textColor }]}>You can search by product name, category, or shop name individually</Text>
              </View>
              <View style={styles.searchTip}>
                <Ionicons name="information-circle-outline" size={16} color={PRIMARY_COLOR} />
                <Text style={[styles.searchTipText, { color: textColor }]}>Combine search criteria for more precise results</Text>
              </View>
              <View style={styles.searchTip}>
                <Ionicons name="information-circle-outline" size={16} color={PRIMARY_COLOR} />
                <Text style={[styles.searchTipText, { color: textColor }]}>Leave fields blank to search across all products</Text>
              </View>
            </View>
          </ScrollView>

          <View style={[styles.advancedSearchFooter, { borderTopColor: borderColor }]}>
            <TouchableOpacity
              style={[styles.advancedClearSearchButton, { backgroundColor: isDark ? '#252525' : '#f8f8f8' }]}
              onPress={() => onSearchParamsChange({ productName: '', category: '', shopName: '' })}
            >
              <Ionicons name="close-circle" size={20} color={textColor} />
              <Text style={[styles.clearSearchText, { color: textColor }]}>Clear All</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.applySearchButton} onPress={onApplySearch}>
              <Ionicons name="search" size={20} color="#fff" />
              <Text style={styles.applySearchText}>Search Product</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default AdvancedSearchPanel;
