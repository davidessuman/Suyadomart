import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  ScrollView,
  Image,
  useColorScheme,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface AlertButton {
  text: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive';
}

const ProfessionalCategoriesDrawer: React.FC<{
  visible: boolean;
  onClose: () => void;
  categories: string[];
  onSelectCategory: (category: string | null) => void;
  onSelectSubCategory: (subCategory: string | null) => void;
  selectedCategory: string | null;
  selectedSubCategory: string | null;
  showAlert: (title: string, message: string, buttons?: AlertButton[]) => void;
  styles: any;
  PRIMARY_COLOR: string;
  DARK_BACKGROUND: string;
  LIGHT_BACKGROUND: string;
  DARK_TEXT: string;
  LIGHT_TEXT: string;
  categoryStructure: Record<string, string[]>;
  getCategoryIcon: (category: string) => any;
  getProductSubCategoryIcon: (mainCategory: string, subCategory: string) => any;
  getServiceSubCategoryIcon: (subCategory: string) => any;
  getBeautyServiceTypeIcon: (beautyType: string) => any;
}> = ({
  visible,
  onClose,
  categories,
  onSelectCategory,
  onSelectSubCategory,
  selectedCategory,
  selectedSubCategory,
  showAlert,
  styles,
  PRIMARY_COLOR,
  DARK_BACKGROUND,
  LIGHT_BACKGROUND,
  DARK_TEXT,
  LIGHT_TEXT,
  categoryStructure,
  getCategoryIcon,
  getProductSubCategoryIcon,
  getServiceSubCategoryIcon,
  getBeautyServiceTypeIcon,
}) => {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    products: true,
    services: true,
  });
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});
  const colorScheme = useColorScheme();

  React.useEffect(() => {
    if (visible) {
      setExpandedSections({
        products: true,
        services: true,
      });
      if (selectedCategory) {
        setExpandedCategories({ [selectedCategory]: true });
      }
    }
  }, [visible, selectedCategory]);

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const toggleCategory = (category: string) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [category]: !prev[category],
    }));
  };

  const productCategories = ['Fashion', 'Electronics', 'Beauty', 'Home', 'Sports', 'Books', 'Food', 'Glossary', 'Other'];
  const serviceCategories = [
    'Tutoring',
    'Photography',
    'Graphic Design',
    'Writing',
    'Delivery',
    'Repair',
    'Fitness Training',
    'Catering',
    'Beauty Services',
    'Other Services',
  ];

  if (!visible) return null;

  const isDark = colorScheme === 'dark';
  const backgroundColor = isDark ? DARK_BACKGROUND : LIGHT_BACKGROUND;
  const textColor = isDark ? DARK_TEXT : LIGHT_TEXT;
  const cardBackground = isDark ? '#1e1e1e' : '#ffffff';
  const borderColor = isDark ? '#333' : '#e0e0e0';

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.drawerOverlay}>
        <TouchableOpacity style={styles.drawerBackdrop} onPress={onClose} />
        <View style={[styles.drawerContainer, { backgroundColor }]}>
          <View style={[styles.drawerHeader, { backgroundColor: PRIMARY_COLOR }]}>
            <View style={styles.drawerHeaderContent}>
              <View style={styles.drawerLogoContainer}>
                <Image
                  source={{ uri: 'https://image2url.com/images/1764506443183-2ff76663-c119-4f05-93b4-d08e42895442.png' }}
                  style={styles.drawerLogo}
                  resizeMode="contain"
                />
              </View>
              <Text style={styles.drawerTitle}>Categories</Text>
              <Text style={styles.drawerSubtitle}>Select a category to filter products</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.drawerCloseButton}>
              <Ionicons name="close" size={15} color="#ec0b0bff" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.drawerContent} showsVerticalScrollIndicator={false}>
            <View style={styles.drawerSection}>
              <TouchableOpacity
                style={[
                  styles.drawerItem,
                  !selectedCategory && styles.drawerItemActive,
                  {
                    backgroundColor: cardBackground,
                    borderColor,
                    marginBottom: 12,
                  },
                ]}
                onPress={() => {
                  onSelectCategory(null);
                  onClose();
                }}
              >
                <View style={[styles.drawerItemIconContainer, !selectedCategory && styles.drawerItemIconActive]}>
                  <Ionicons name="apps" size={22} color={!selectedCategory ? PRIMARY_COLOR : textColor} />
                </View>
                <Text style={[styles.drawerItemText, !selectedCategory && styles.drawerItemTextActive, { color: textColor }]}>
                  All Categories
                </Text>
                {!selectedCategory && <Ionicons name="checkmark-circle" size={20} color={PRIMARY_COLOR} />}
              </TouchableOpacity>
            </View>

            <View style={styles.drawerSection}>
              <TouchableOpacity
                style={[
                  styles.sectionHeaderButton,
                  {
                    backgroundColor: isDark ? '#252525' : '#f9f9f9',
                    borderColor,
                  },
                ]}
                onPress={() => toggleSection('products')}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Ionicons name="cart" size={20} color={PRIMARY_COLOR} style={{ marginRight: 8 }} />
                  <Text style={[styles.drawerSectionTitle, { color: textColor }]}>PRODUCTS</Text>
                </View>
                <Ionicons
                  name={expandedSections.products ? 'chevron-up' : 'chevron-down'}
                  size={20}
                  color={PRIMARY_COLOR}
                />
              </TouchableOpacity>

              {expandedSections.products && (
                <View style={styles.sectionContent}>
                  {productCategories.map((category) => {
                    const isSelected = selectedCategory === category;
                    const isCategoryExpanded = expandedCategories[category];
                    const subCategories = categoryStructure[category as keyof typeof categoryStructure] || [];

                    return (
                      <View key={category}>
                        <View>
                          <View style={{ flexDirection: 'row', gap: 8 }}>
                            <TouchableOpacity
                              style={[
                                styles.drawerItem,
                                isSelected && !selectedSubCategory && styles.drawerItemActive,
                                {
                                  backgroundColor: cardBackground,
                                  borderColor,
                                  flex: 1,
                                },
                              ]}
                              onPress={() => {
                                onSelectCategory(category);
                                onSelectSubCategory(null);
                                onClose();
                              }}
                            >
                              <View
                                style={[
                                  styles.drawerItemIconContainer,
                                  isSelected && !selectedSubCategory && styles.drawerItemIconActive,
                                ]}
                              >
                                <Ionicons
                                  name={getCategoryIcon(category)}
                                  size={20}
                                  color={isSelected && !selectedSubCategory ? PRIMARY_COLOR : textColor}
                                />
                              </View>
                              <Text
                                style={[
                                  styles.drawerItemText,
                                  isSelected && !selectedSubCategory && styles.drawerItemTextActive,
                                  { color: textColor },
                                ]}
                              >
                                {category}
                              </Text>
                              {isSelected && !selectedSubCategory && (
                                <Ionicons name="checkmark-circle" size={20} color={PRIMARY_COLOR} style={{ marginLeft: 'auto' }} />
                              )}
                            </TouchableOpacity>

                            {subCategories.length > 0 && (
                              <TouchableOpacity
                                style={[
                                  styles.drawerItem,
                                  {
                                    backgroundColor: cardBackground,
                                    borderColor,
                                    paddingHorizontal: 12,
                                    width: 50,
                                  },
                                ]}
                                onPress={() => toggleCategory(category)}
                              >
                                <Ionicons
                                  name={isCategoryExpanded ? 'chevron-up' : 'chevron-down'}
                                  size={20}
                                  color={PRIMARY_COLOR}
                                  style={{ marginLeft: 'auto', marginRight: 'auto' }}
                                />
                              </TouchableOpacity>
                            )}
                          </View>
                        </View>

                        {isCategoryExpanded && subCategories.length > 0 && (
                          <View style={{ paddingLeft: 30 }}>
                            {subCategories.map((subCategory) => {
                              const isSubSelected = selectedCategory === category && selectedSubCategory === subCategory;
                              return (
                                <TouchableOpacity
                                  key={subCategory}
                                  style={[
                                    styles.drawerItem,
                                    isSubSelected && styles.drawerItemActive,
                                    {
                                      backgroundColor: cardBackground,
                                      borderColor,
                                      marginLeft: 10,
                                    },
                                  ]}
                                  onPress={() => {
                                    onSelectCategory(category);
                                    onSelectSubCategory(subCategory);
                                    onClose();
                                  }}
                                >
                                  <View style={[styles.drawerItemIconContainer, isSubSelected && styles.drawerItemIconActive]}>
                                    <Ionicons
                                      name={getProductSubCategoryIcon(category, subCategory)}
                                      size={16}
                                      color={isSubSelected ? PRIMARY_COLOR : textColor}
                                    />
                                  </View>
                                  <Text
                                    style={[
                                      styles.drawerItemText,
                                      isSubSelected && styles.drawerItemTextActive,
                                      { color: textColor, fontSize: 13 },
                                    ]}
                                  >
                                    {subCategory}
                                  </Text>
                                  {isSubSelected && <Ionicons name="checkmark-circle" size={18} color={PRIMARY_COLOR} />}
                                </TouchableOpacity>
                              );
                            })}
                          </View>
                        )}
                      </View>
                    );
                  })}
                </View>
              )}
            </View>

            <View style={styles.drawerSection}>
              <TouchableOpacity
                style={[
                  styles.sectionHeaderButton,
                  {
                    backgroundColor: isDark ? '#252525' : '#f9f9f9',
                    borderColor,
                  },
                ]}
                onPress={() => toggleSection('services')}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Ionicons name="briefcase" size={20} color={PRIMARY_COLOR} style={{ marginRight: 8 }} />
                  <Text style={[styles.drawerSectionTitle, { color: textColor }]}>SERVICES</Text>
                </View>
                <Ionicons
                  name={expandedSections.services ? 'chevron-up' : 'chevron-down'}
                  size={20}
                  color={PRIMARY_COLOR}
                />
              </TouchableOpacity>

              {expandedSections.services && (
                <View style={styles.sectionContent}>
                  {serviceCategories.map((subCategory) => {
                    const isSubSelected = selectedCategory === 'Services' && selectedSubCategory === subCategory;
                    const isBeautyServices = subCategory === 'Beauty Services';
                    const beautyServiceTypes = [
                      'Makeup Application',
                      'Hair Services',
                      'Barbering',
                      'Facials & Skincare',
                      'Nails (Manicure/Pedicure)',
                      'Waxing',
                      'Threading',
                      'Massage & Spa',
                      'Tattoo',
                      'Piercing',
                      'Other Beauty Services',
                    ];

                    return (
                      <View key={subCategory}>
                        {isBeautyServices ? (
                          <>
                            <View style={{ flexDirection: 'row', gap: 8 }}>
                              <TouchableOpacity
                                style={[
                                  styles.drawerItem,
                                  isSubSelected && !expandedCategories['Beauty Services Tertiary'] && styles.drawerItemActive,
                                  {
                                    backgroundColor: cardBackground,
                                    borderColor,
                                    flex: 1,
                                  },
                                ]}
                                onPress={() => {
                                  onSelectCategory('Services');
                                  onSelectSubCategory(subCategory);
                                  onClose();
                                }}
                              >
                                <View
                                  style={[
                                    styles.drawerItemIconContainer,
                                    isSubSelected && !expandedCategories['Beauty Services Tertiary'] && styles.drawerItemIconActive,
                                  ]}
                                >
                                  <Ionicons
                                    name={getServiceSubCategoryIcon(subCategory)}
                                    size={16}
                                    color={isSubSelected && !expandedCategories['Beauty Services Tertiary'] ? PRIMARY_COLOR : textColor}
                                  />
                                </View>
                                <Text
                                  style={[
                                    styles.drawerItemText,
                                    isSubSelected && !expandedCategories['Beauty Services Tertiary'] && styles.drawerItemTextActive,
                                    { color: textColor, fontSize: 13 },
                                  ]}
                                >
                                  {subCategory}
                                </Text>
                                {isSubSelected && !expandedCategories['Beauty Services Tertiary'] && (
                                  <Ionicons name="checkmark-circle" size={18} color={PRIMARY_COLOR} style={{ marginLeft: 'auto' }} />
                                )}
                              </TouchableOpacity>

                              <TouchableOpacity
                                style={[
                                  styles.drawerItem,
                                  {
                                    backgroundColor: cardBackground,
                                    borderColor,
                                    paddingHorizontal: 12,
                                    width: 50,
                                  },
                                ]}
                                onPress={() => toggleCategory('Beauty Services Tertiary')}
                              >
                                <Ionicons
                                  name={expandedCategories['Beauty Services Tertiary'] ? 'chevron-up' : 'chevron-down'}
                                  size={20}
                                  color={PRIMARY_COLOR}
                                  style={{ marginLeft: 'auto', marginRight: 'auto' }}
                                />
                              </TouchableOpacity>
                            </View>

                            {expandedCategories['Beauty Services Tertiary'] && (
                              <View style={{ paddingLeft: 30 }}>
                                {beautyServiceTypes.map((beautyType) => {
                                  const isTertiarySelected = selectedCategory === 'Services' && selectedSubCategory === beautyType;
                                  return (
                                    <TouchableOpacity
                                      key={beautyType}
                                      style={[
                                        styles.drawerItem,
                                        isTertiarySelected && styles.drawerItemActive,
                                        {
                                          backgroundColor: cardBackground,
                                          borderColor,
                                        },
                                      ]}
                                      onPress={() => {
                                        onSelectCategory('Services');
                                        onSelectSubCategory(beautyType);
                                        onClose();
                                      }}
                                    >
                                      <View
                                        style={[
                                          styles.drawerItemIconContainer,
                                          isTertiarySelected && styles.drawerItemIconActive,
                                        ]}
                                      >
                                        <Ionicons
                                          name={getBeautyServiceTypeIcon(beautyType)}
                                          size={12}
                                          color={isTertiarySelected ? PRIMARY_COLOR : textColor}
                                        />
                                      </View>
                                      <Text
                                        style={[
                                          styles.drawerItemText,
                                          isTertiarySelected && styles.drawerItemTextActive,
                                          { color: textColor, fontSize: 12 },
                                        ]}
                                      >
                                        {beautyType}
                                      </Text>
                                      {isTertiarySelected && <Ionicons name="checkmark-circle" size={16} color={PRIMARY_COLOR} />}
                                    </TouchableOpacity>
                                  );
                                })}
                              </View>
                            )}
                          </>
                        ) : (
                          <TouchableOpacity
                            style={[
                              styles.drawerItem,
                              isSubSelected && styles.drawerItemActive,
                              {
                                backgroundColor: cardBackground,
                                borderColor,
                              },
                            ]}
                            onPress={() => {
                              onSelectCategory('Services');
                              onSelectSubCategory(subCategory);
                              onClose();
                            }}
                          >
                            <View style={[styles.drawerItemIconContainer, isSubSelected && styles.drawerItemIconActive]}>
                              <Ionicons
                                name={getServiceSubCategoryIcon(subCategory)}
                                size={16}
                                color={isSubSelected ? PRIMARY_COLOR : textColor}
                              />
                            </View>
                            <Text
                              style={[
                                styles.drawerItemText,
                                isSubSelected && styles.drawerItemTextActive,
                                { color: textColor, fontSize: 13 },
                              ]}
                            >
                              {subCategory}
                            </Text>
                            {isSubSelected && <Ionicons name="checkmark-circle" size={18} color={PRIMARY_COLOR} />}
                          </TouchableOpacity>
                        )}
                      </View>
                    );
                  })}
                </View>
              )}
            </View>

            {(selectedCategory || selectedSubCategory) && (
              <View style={[styles.clearFilterContainer, { borderTopColor: borderColor }]}>
                <TouchableOpacity
                  style={[
                    styles.drawerClearFilterButton,
                    {
                      backgroundColor: cardBackground,
                      borderColor: '#FF3B30',
                    },
                  ]}
                  onPress={() => {
                    onSelectCategory(null);
                    onSelectSubCategory(null);
                    onClose();
                  }}
                >
                  <Ionicons name="close-circle" size={20} color="#FF3B30" />
                  <Text style={styles.clearFilterText}>Clear Filter</Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

export default ProfessionalCategoriesDrawer;
