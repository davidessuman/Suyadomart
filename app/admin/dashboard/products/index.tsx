import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  LayoutChangeEvent,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import ProductDetailsMenu, { AdminDashboardProduct } from './ProductDetailsMenu';
import EditProductMenu from './EditProductMenu';
import SellerShopModal from '../users/SellerShopModal';

const SUPABASE_URL = 'https://qwujadyqebfypyhfuwfl.supabase.co';
const GRID_GAP = 12;
const GRID_HORIZONTAL_PADDING = 24;
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

const categoryStructure: Record<string, string[]> = {
  Fashion: ['Dresses', 'Tops & Shirts', 'Trousers & Jeans', 'Skirts', 'Jackets', 'Footwear', 'Bags', 'Watches', 'Jewelry', 'Accessories', 'Underwears', 'Other Fashion'],
  Electronics: ['Phones', 'Laptops', 'Tablets', 'Headphones', 'Chargers', 'Gaming', 'Accessories', 'Other Electronics'],
  Beauty: ['Skincare', 'Makeup', 'Hair Care', 'Fragrance', 'Tools'],
  Home: ['Furniture', 'Decor', 'Kitchen', 'Bedding', 'Appliances'],
  Sports: ['Gym Wear', 'Jersey', 'Equipment', 'Footwear', 'Accessories'],
  Books: ['Textbooks', 'Novels', 'Magazines', 'Comics'],
  Food: ['Snacks', 'Drinks', 'Fast Food', 'Homemade Meals'],
  Glossary: ['Ingredients', 'Spices & Herbs', 'Condiments & Sauces', 'Packaged Food Products', 'Other Glossary'],
  Services: ['Tutoring', 'Photography', 'Graphic Design', 'Writing', 'Delivery', 'Repair', 'Fitness Training', 'Catering', 'Beauty Services', 'Other Services'],
  Other: ['Everything else'],
};

const getCategoryIcon = (category: string) => {
  const iconMap: Record<string, keyof typeof Ionicons.glyphMap> = {
    Fashion: 'shirt-outline',
    Electronics: 'phone-portrait-outline',
    Beauty: 'sparkles-outline',
    Home: 'home-outline',
    Sports: 'barbell-outline',
    Books: 'book-outline',
    Food: 'fast-food-outline',
    Glossary: 'library-outline',
    Services: 'briefcase-outline',
    Other: 'apps-outline',
  };

  return iconMap[category] || 'apps-outline';
};

const getProductSubCategoryIcon = (mainCategory: string, subCategory: string) => {
  const map: Record<string, Record<string, keyof typeof Ionicons.glyphMap>> = {
    Fashion: {
      'Dresses': 'rose-outline',
      'Tops & Shirts': 'shirt-outline',
      'Trousers & Jeans': 'walk-outline',
      'Skirts': 'woman-outline',
      'Jackets': 'shield-outline',
      'Footwear': 'footsteps-outline',
      'Bags': 'bag-handle-outline',
      'Watches': 'watch-outline',
      'Jewelry': 'diamond-outline',
      'Accessories': 'glasses-outline',
      'Underwears': 'body-outline',
      'Other Fashion': 'ellipsis-horizontal-outline',
    },
    Electronics: {
      'Phones': 'phone-portrait-outline',
      'Laptops': 'laptop-outline',
      'Tablets': 'tablet-portrait-outline',
      'Headphones': 'headset-outline',
      'Chargers': 'battery-charging-outline',
      'Gaming': 'game-controller-outline',
      'Accessories': 'hardware-chip-outline',
      'Other Electronics': 'ellipsis-vertical-outline',
    },
    Beauty: {
      'Skincare': 'body-outline',
      'Makeup': 'brush-outline',
      'Hair Care': 'cut-outline',
      'Fragrance': 'flask-outline',
      'Tools': 'hammer-outline',
    },
    Home: {
      'Furniture': 'bed-outline',
      'Decor': 'color-palette-outline',
      'Kitchen': 'restaurant-outline',
      'Bedding': 'layers-outline',
      'Appliances': 'flash-outline',
    },
    Sports: {
      'Gym Wear': 'fitness-outline',
      'Jersey': 'football-outline',
      'Equipment': 'basketball-outline',
      'Footwear': 'tennisball-outline',
      'Accessories': 'medal-outline',
    },
    Books: {
      'Textbooks': 'school-outline',
      'Novels': 'book-outline',
      'Magazines': 'newspaper-outline',
      'Comics': 'happy-outline',
    },
    Food: {
      'Snacks': 'ice-cream-outline',
      'Drinks': 'cafe-outline',
      'Fast Food': 'fast-food-outline',
      'Homemade Meals': 'nutrition-outline',
    },
    Glossary: {
      'Ingredients': 'leaf-outline',
      'Spices & Herbs': 'flower-outline',
      'Condiments & Sauces': 'water-outline',
      'Packaged Food Products': 'cube-outline',
      'Other Glossary': 'list-outline',
    },
    Services: {
      'Tutoring': 'school-outline',
      'Photography': 'camera-outline',
      'Graphic Design': 'color-palette-outline',
      'Writing': 'create-outline',
      'Delivery': 'bicycle-outline',
      'Repair': 'construct-outline',
      'Fitness Training': 'barbell-outline',
      'Catering': 'restaurant-outline',
      'Beauty Services': 'cut-outline',
      'Other Services': 'ellipsis-horizontal-outline',
    },
    Other: {
      'Everything else': 'apps-outline',
    },
  };

  return map[mainCategory]?.[subCategory] || 'pricetag-outline';
};

const getCardDisplayMedia = (mediaUrls: string[] | undefined): string | undefined => {
  if (!mediaUrls || mediaUrls.length === 0) return undefined;

  const isVideo = (url: string) => {
    const lower = (url || '').toLowerCase();
    return lower.includes('.mp4') || lower.includes('.mov') || lower.includes('.avi') || lower.includes('.webm');
  };

  if (isVideo(mediaUrls[0]) && mediaUrls.length > 1) {
    const firstImage = mediaUrls.find((url) => !isVideo(url));
    return firstImage || mediaUrls[1];
  }

  return mediaUrls[0];
};

const toPublicProductUrl = (url?: string) => {
  if (!url) return 'https://via.placeholder.com/400';
  if (url.startsWith('http')) return url;
  return `${SUPABASE_URL}/storage/v1/object/public/products/${url}`;
};

const toPublicAvatarUrl = (url?: string) => {
  if (!url) return 'https://ui-avatars.com/api/?name=Seller&background=FF9900&color=fff';
  if (url.startsWith('http')) return url;
  return `${SUPABASE_URL}/storage/v1/object/public/avatars/${url}`;
};

const calculateDiscount = (original: number | null, current: number): number | null => {
  if (!original || original <= current) return null;
  return Math.round(((original - current) / original) * 100);
};

type AdminProductsPageProps = {
  enableHorizontalScroll?: boolean;
};

type SellerUser = {
  id: string;
  full_name: string | null;
  username: string | null;
  email: string | null;
  shop_name?: string | null;
};

const AdminProductsPage = ({ enableHorizontalScroll = false }: AdminProductsPageProps) => {
  const { width: windowWidth } = useWindowDimensions();
  const [containerWidth, setContainerWidth] = useState(0);
  const [products, setProducts] = useState<AdminDashboardProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<AdminDashboardProduct | null>(null);
  const [detailsVisible, setDetailsVisible] = useState(false);
  const [selectedUniversity, setSelectedUniversity] = useState<string | null>(null);
  const [showUniversityDropdown, setShowUniversityDropdown] = useState(false);
  const [universitySearchTerm, setUniversitySearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedSubCategory, setSelectedSubCategory] = useState<string | null>(null);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});
  const [productSearchTerm, setProductSearchTerm] = useState('');
  const [isProductSearchFocused, setIsProductSearchFocused] = useState(false);
  const [editVisible, setEditVisible] = useState(false);
  const [editingProduct, setEditingProduct] = useState<AdminDashboardProduct | null>(null);
  const [selectedSellerForShop, setSelectedSellerForShop] = useState<SellerUser | null>(null);
  const [showSellerShop, setShowSellerShop] = useState(false);

  const availableWidth = useMemo(() => {
    const measured = containerWidth > 0 ? containerWidth : windowWidth;
    return Math.max(measured - GRID_HORIZONTAL_PADDING * 2, 0);
  }, [containerWidth, windowWidth]);

  const numColumns = useMemo(() => {
    if (availableWidth >= 1280) return 7;
    if (availableWidth >= 1024) return 6;
    if (availableWidth >= 768) return 5;
    if (availableWidth >= 560) return 4;
    return 2;
  }, [availableWidth]);

  const loadProducts = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setErrorMessage(null);

    const { data, error } = await supabase
      .from('products')
      .select('id, seller_id, title, description, price, original_price, media_urls, color_media, color_stock, category, sub_category, gender, brand, delivery_option, quantity, sizes_available, colors_available, is_pre_order, pre_order_duration, pre_order_duration_unit, is_service, created_at')
      .order('created_at', { ascending: false });

    if (error) {
      setErrorMessage(error.message || 'Unable to load products right now.');
      setProducts([]);
    } else {
      const rawProducts = (data as AdminDashboardProduct[]) || [];

      if (rawProducts.length === 0) {
        setProducts([]);
      } else {
        const sellerIds = Array.from(
          new Set(rawProducts.map((item) => item.seller_id).filter((value): value is string => Boolean(value)))
        );

        const { data: sellerProfiles } = await supabase
          .from('user_profiles')
          .select('id, full_name, username, avatar_url, university')
          .in('id', sellerIds);

        const { data: shopsData } = await supabase
          .from('shops')
          .select('owner_id, name')
          .in('owner_id', sellerIds);

        const profileMap = new Map(
          (sellerProfiles || []).map((profile: any) => [
            profile.id,
            {
              display_name: profile.full_name || profile.username || 'Seller',
              avatar_url: profile.avatar_url || undefined,
              university: profile.university || null,
            },
          ])
        );

        const shopsMap = new Map(
          (shopsData || []).map((shop: any) => [shop.owner_id, shop.name || null])
        );

        const enrichedProducts = rawProducts.map((item) => {
          const seller = profileMap.get(item.seller_id);
          return {
            ...item,
            display_name: seller?.display_name || 'Seller',
            avatar_url: seller?.avatar_url,
            university: seller?.university || null,
            shop_name: shopsMap.get(item.seller_id) || null,
          };
        });

        setProducts(enrichedProducts);
      }
    }

    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const cardWidth = useMemo(() => {
    if (!availableWidth) return 0;
    const rawWidth = (availableWidth - GRID_GAP * (numColumns - 1)) / numColumns;
    const baseWidth = Math.max(Math.floor(rawWidth), 100);
    if (!enableHorizontalScroll) return baseWidth;
    return Math.max(baseWidth, 120);
  }, [availableWidth, enableHorizontalScroll, numColumns]);

  const gridContentWidth = useMemo(() => {
    if (!cardWidth || !numColumns) return availableWidth;
    return numColumns * cardWidth + GRID_GAP * (numColumns - 1) + 24;
  }, [availableWidth, cardWidth, numColumns]);

  const handleContainerLayout = (event: LayoutChangeEvent) => {
    const measuredWidth = event.nativeEvent.layout.width;
    if (measuredWidth > 0 && measuredWidth !== containerWidth) {
      setContainerWidth(measuredWidth);
    }
  };

  const universityOptions = useMemo(() => {
    return Array.from(
      new Set(
        products
          .map((item) => item.university?.trim())
          .filter((value): value is string => Boolean(value))
      )
    ).sort((a, b) => a.localeCompare(b));
  }, [products]);

  const categoryOptions = useMemo(() => Object.keys(categoryStructure), []);

  const filteredUniversityOptions = useMemo(() => {
    const query = universitySearchTerm.trim().toLowerCase();
    const normalizedQuery = normalizeAbbreviationToken(query);

    if (!query) {
      return universityOptions;
    }

    const abbreviationMatch = Object.entries(UNIVERSITY_ABBREVIATIONS).find(
      ([abbreviation]) => normalizeAbbreviationToken(abbreviation) === normalizedQuery
    );

    if (abbreviationMatch) {
      const matchedUniversity = abbreviationMatch[1];
      return universityOptions.includes(matchedUniversity) ? [matchedUniversity] : [];
    }

    return universityOptions.filter((university) => {
      const normalizedName = university.toLowerCase();
      const acronym = getUniversityAcronym(university).toLowerCase();
      const normalizedAcronym = normalizeAbbreviationToken(acronym);

      return (
        normalizedName.includes(query) ||
        acronym.includes(query) ||
        normalizedAcronym.includes(normalizedQuery)
      );
    });
  }, [universityOptions, universitySearchTerm]);

  const filteredProducts = useMemo(() => {
    const query = productSearchTerm.trim().toLowerCase();

    return products.filter((item) => {
      if (selectedUniversity && (item.university?.trim() || null) !== selectedUniversity) {
        return false;
      }

      if (selectedCategory && (item.category?.trim() || null) !== selectedCategory) {
        return false;
      }

      if (selectedSubCategory && (item.sub_category?.trim() || null) !== selectedSubCategory) {
        return false;
      }

      if (query) {
        const title = (item.title || '').toLowerCase();
        const description = (item.description || '').toLowerCase();
        const category = (item.category || '').toLowerCase();
        const subCategory = (item.sub_category || '').toLowerCase();
        const brand = (item.brand || '').toLowerCase();
        const gender = (item.gender || '').toLowerCase();
        const deliveryOption = (item.delivery_option || '').toLowerCase();
        const colors = (item.colors_available || []).join(' ').toLowerCase();
        const sizes = (item.sizes_available || []).join(' ').toLowerCase();
        const quantity = String(item.quantity ?? '').toLowerCase();
        const shopName = (item.shop_name || '').toLowerCase();

        if (
          !title.includes(query) &&
          !description.includes(query) &&
          !category.includes(query) &&
          !subCategory.includes(query) &&
          !brand.includes(query) &&
          !gender.includes(query) &&
          !deliveryOption.includes(query) &&
          !colors.includes(query) &&
          !sizes.includes(query) &&
          !quantity.includes(query) &&
          !shopName.includes(query)
        ) {
          return false;
        }
      }

      return true;
    });
  }, [productSearchTerm, products, selectedCategory, selectedSubCategory, selectedUniversity]);

  const renderProduct = ({ item, index }: { item: AdminDashboardProduct; index: number }) => {
    const discount = calculateDiscount(item.original_price, Number(item.price));

    return (
      <TouchableOpacity
        activeOpacity={0.88}
        onPress={() => {
          setSelectedProduct(item);
          setDetailsVisible(true);
        }}
        style={[
          styles.card,
          {
            width: cardWidth,
          },
        ]}
      >
        <View style={styles.imageWrap}>
          <Image
            source={{ uri: toPublicProductUrl(getCardDisplayMedia(item.media_urls)) }}
            style={styles.image}
            resizeMode="cover"
          />
          {discount ? (
            <View style={styles.discountBadge}>
              <Text style={styles.discountText}>-{discount}%</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.cardBody}>
          <Text numberOfLines={2} style={styles.cardTitle}>
            {item.title}
          </Text>

          <View style={styles.priceRow}>
            <Text style={styles.priceText}>GH₵ {Number(item.price).toFixed(2)}</Text>
            {item.original_price && Number(item.original_price) > Number(item.price) ? (
              <Text style={styles.originalPrice}>GH₵ {Number(item.original_price).toFixed(2)}</Text>
            ) : null}
          </View>

          <View style={styles.metaRow}>
            <Image source={{ uri: toPublicAvatarUrl(item.avatar_url) }} style={styles.sellerAvatar} />
            <Text numberOfLines={1} style={styles.sellerName}>
              {item.display_name || 'Seller'}
            </Text>
          </View>

          <View style={styles.metaSecondaryRow}>
            <Text numberOfLines={1} style={styles.metaText}>
              {item.category}
            </Text>
            <Text style={styles.dot}>•</Text>
            <Text numberOfLines={1} style={styles.metaText}>
              {item.quantity ?? 0} left
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const openEditModal = (product: AdminDashboardProduct) => {
    setEditingProduct(product);
    setDetailsVisible(false);
    setEditVisible(true);
  };

  const closeEditModal = () => {
    setEditVisible(false);
    setEditingProduct(null);
  };

  if (loading) {
    return (
      <View style={styles.stateWrap}>
        <ActivityIndicator size="large" color="#2563EB" />
        <Text style={styles.stateText}>Loading products...</Text>
      </View>
    );
  }

  if (errorMessage) {
    return (
      <View style={styles.stateWrap}>
        <Ionicons name="alert-circle-outline" size={28} color="#DC2626" />
        <Text style={styles.errorText}>{errorMessage}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => loadProducts()}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container} onLayout={handleContainerLayout}>
      <View style={styles.header}>
        <View style={styles.headerTopRow}>
          <View style={styles.universityFilterWrap}>
            <View style={styles.universityFilterRow}>
              <TouchableOpacity
                style={styles.categoryButton}
                activeOpacity={0.88}
                onPress={() => {
                  setShowCategoryDropdown((prev) => !prev);
                  setShowUniversityDropdown(false);
                  if (!showCategoryDropdown && selectedCategory) {
                    setExpandedCategories({ [selectedCategory]: true });
                  }
                }}
              >
                <Ionicons name="pricetag-outline" size={14} color="#1D4ED8" />
                <Text numberOfLines={1} style={styles.categoryButtonText}>
                  {selectedSubCategory || selectedCategory || 'All Categories'}
                </Text>
                <Ionicons name={showCategoryDropdown ? 'chevron-up' : 'chevron-down'} size={14} color="#1D4ED8" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.universityButton}
                activeOpacity={0.88}
                onPress={() => {
                  setShowUniversityDropdown((prev) => !prev);
                  setShowCategoryDropdown(false);
                  if (showUniversityDropdown) {
                    setUniversitySearchTerm('');
                  }
                }}
              >
                <Ionicons name="school-outline" size={14} color="#1D4ED8" />
                <Text numberOfLines={1} style={styles.universityButtonText}>
                  {selectedUniversity || 'University'}
                </Text>
                <Ionicons name={showUniversityDropdown ? 'chevron-up' : 'chevron-down'} size={14} color="#1D4ED8" />
              </TouchableOpacity>

              <View style={styles.selectedCountBadge}>
                <View style={styles.selectedCountTopRow}>
                  <Ionicons name="cube-outline" size={12} color="#1D4ED8" />
                  <Text style={styles.selectedCountLabel}>Products</Text>
                </View>
                <Text style={styles.selectedCountText}>{filteredProducts.length}</Text>
              </View>
            </View>

            {showCategoryDropdown ? (
              <View style={styles.categoryDropdown}>
                <TouchableOpacity
                  style={[styles.categoryOption, !selectedCategory && styles.categoryOptionActive]}
                  onPress={() => {
                    setSelectedCategory(null);
                    setSelectedSubCategory(null);
                    setShowCategoryDropdown(false);
                  }}
                >
                  <View style={[styles.categoryOptionIconWrap, !selectedCategory && styles.categoryOptionIconWrapActive]}>
                    <Ionicons name="apps-outline" size={16} color={!selectedCategory ? '#2563EB' : '#475569'} />
                  </View>
                  <Text style={[styles.categoryOptionText, !selectedCategory && styles.categoryOptionTextActive]}>
                    All Categories
                  </Text>
                  {!selectedCategory ? <Ionicons name="checkmark-circle" size={16} color="#2563EB" /> : null}
                </TouchableOpacity>

                <ScrollView style={styles.categoryDropdownScroll} nestedScrollEnabled>
                  {categoryOptions.map((category) => {
                    const isSelected = selectedCategory === category;
                    const isExpanded = !!expandedCategories[category];
                    const subCategories = categoryStructure[category] || [];
                    return (
                      <View key={category}>
                        <View style={styles.categoryOptionRow}>
                          <TouchableOpacity
                            style={[styles.categoryOption, styles.categoryMainOption, isSelected && !selectedSubCategory && styles.categoryOptionActive]}
                            onPress={() => {
                              setSelectedCategory(category);
                              setSelectedSubCategory(null);
                              setShowCategoryDropdown(false);
                            }}
                          >
                            <View style={[styles.categoryOptionIconWrap, isSelected && !selectedSubCategory && styles.categoryOptionIconWrapActive]}>
                              <Ionicons
                                name={getCategoryIcon(category)}
                                size={16}
                                color={isSelected && !selectedSubCategory ? '#2563EB' : '#475569'}
                              />
                            </View>
                            <Text numberOfLines={1} style={[styles.categoryOptionText, isSelected && !selectedSubCategory && styles.categoryOptionTextActive]}>
                              {category}
                            </Text>
                            {isSelected && !selectedSubCategory ? <Ionicons name="checkmark-circle" size={16} color="#2563EB" /> : null}
                          </TouchableOpacity>

                          {subCategories.length > 0 ? (
                            <TouchableOpacity
                              style={styles.categoryToggleButton}
                              onPress={() =>
                                setExpandedCategories((prev) => ({
                                  ...prev,
                                  [category]: !prev[category],
                                }))
                              }
                            >
                              <Ionicons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={16} color="#2563EB" />
                            </TouchableOpacity>
                          ) : null}
                        </View>

                        {isExpanded && subCategories.length > 0 ? (
                          <View style={styles.subCategoryWrap}>
                            {subCategories.map((subCategory) => {
                              const isSubSelected = isSelected && selectedSubCategory === subCategory;

                              return (
                                <TouchableOpacity
                                  key={`${category}-${subCategory}`}
                                  style={[styles.categoryOption, styles.subCategoryOption, isSubSelected && styles.categoryOptionActive]}
                                  onPress={() => {
                                    setSelectedCategory(category);
                                    setSelectedSubCategory(subCategory);
                                    setShowCategoryDropdown(false);
                                  }}
                                >
                                  <View style={[styles.categoryOptionIconWrap, isSubSelected && styles.categoryOptionIconWrapActive]}>
                                    <Ionicons
                                      name={getProductSubCategoryIcon(category, subCategory)}
                                      size={14}
                                      color={isSubSelected ? '#2563EB' : '#475569'}
                                    />
                                  </View>
                                  <Text numberOfLines={1} style={[styles.categoryOptionText, isSubSelected && styles.categoryOptionTextActive, styles.subCategoryText]}>
                                    {subCategory}
                                  </Text>
                                  {isSubSelected ? <Ionicons name="checkmark-circle" size={16} color="#2563EB" /> : null}
                                </TouchableOpacity>
                              );
                            })}
                          </View>
                        ) : null}
                      </View>
                    );
                  })}
                </ScrollView>
              </View>
            ) : null}

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
                      numberOfLines={1}
                      style={[
                        styles.universityOptionText,
                        selectedUniversity === university && styles.universityOptionTextActive,
                      ]}
                    >
                      {university}
                    </Text>
                  </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            ) : null}
          </View>

          <View style={styles.productSearchWrap}>
            <View style={[styles.searchIconWrap, isProductSearchFocused && styles.searchIconWrapFocused]}>
              <Ionicons name="search" size={14} color={isProductSearchFocused ? '#1D4ED8' : '#64748B'} />
            </View>
            <TextInput
              style={[
                styles.productSearchInput,
                isProductSearchFocused && styles.productSearchInputFocused,
                Platform.OS === 'web'
                  ? ({
                      outlineWidth: 0,
                      outlineStyle: 'none',
                      boxShadow: 'none',
                      WebkitAppearance: 'none',
                      backgroundColor: 'transparent',
                    } as any)
                  : null,
              ]}
              placeholder="Search product"
              placeholderTextColor="#94A3B8"
              value={productSearchTerm}
              onChangeText={setProductSearchTerm}
              onFocus={() => setIsProductSearchFocused(true)}
              onBlur={() => setIsProductSearchFocused(false)}
              underlineColorAndroid="transparent"
              selectionColor="#1D4ED8"
              cursorColor="#1D4ED8"
              autoCorrect={false}
              spellCheck={false}
              autoComplete="off"
            />
            {productSearchTerm.length > 0 ? (
              <TouchableOpacity onPress={() => setProductSearchTerm('')}>
                <Ionicons name="close-circle" size={16} color="#94A3B8" />
              </TouchableOpacity>
            ) : null}
          </View>

          <View style={styles.totalProductsBadge}>
            <View style={styles.totalProductsTopRow}>
              <Ionicons name="business-outline" size={12} color="#64748B" />
              <Text style={styles.totalProductsLabel}>All Universities</Text>
            </View>
            <Text style={styles.totalProductsValue}>{products.length}</Text>
          </View>
        </View>

      </View>

      <ScrollView
        horizontal={enableHorizontalScroll}
        showsHorizontalScrollIndicator={enableHorizontalScroll}
        bounces={enableHorizontalScroll}
        contentContainerStyle={enableHorizontalScroll ? styles.horizontalScrollContent : undefined}
      >
        <View style={styles.fullWidth}>
          <FlatList
            data={filteredProducts}
            keyExtractor={(item) => item.id}
            key={numColumns}
            numColumns={numColumns}
            renderItem={renderProduct}
            contentContainerStyle={[
              filteredProducts.length === 0 ? styles.emptyContent : styles.listContent,
              enableHorizontalScroll && { minWidth: gridContentWidth },
            ]}
            columnWrapperStyle={numColumns > 1 ? styles.gridRow : undefined}
            showsVerticalScrollIndicator
            nestedScrollEnabled
            scrollEventThrottle={16}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadProducts(true)} />}
            ListEmptyComponent={
              <View style={styles.emptyWrap}>
                <Ionicons name="cube-outline" size={34} color="#94A3B8" />
                <Text style={styles.emptyTitle}>No products found</Text>
                <Text style={styles.emptySubtitle}>
                  {selectedUniversity
                    ? `No products found for ${selectedUniversity}.`
                    : 'Products from the Supabase table will appear here.'}
                </Text>
              </View>
            }
          />
        </View>
      </ScrollView>

      <ProductDetailsMenu
        visible={detailsVisible}
        product={selectedProduct}
        onEdit={openEditModal}
        onViewShop={(product) => {
          if (!product.seller_id) return;

          setSelectedSellerForShop({
            id: product.seller_id,
            full_name: product.display_name || null,
            username: product.display_name || null,
            email: null,
            shop_name: product.shop_name || null,
          });
          setShowSellerShop(true);
        }}
        onClose={() => {
          setDetailsVisible(false);
          setSelectedProduct(null);
        }}
      />

      <EditProductMenu
        visible={editVisible}
        product={editingProduct}
        categoryStructure={categoryStructure}
        onClose={closeEditModal}
        onSaved={(updatedProduct) => {
          setProducts((prev) => prev.map((item) => (item.id === updatedProduct.id ? updatedProduct : item)));
          setSelectedProduct(updatedProduct);
          setEditVisible(false);
          setEditingProduct(null);
          setDetailsVisible(true);
        }}
        onDeleted={(deletedProductId) => {
          setProducts((prev) => prev.filter((item) => item.id !== deletedProductId));
          setSelectedProduct(null);
          setEditVisible(false);
          setEditingProduct(null);
          setDetailsVisible(false);
        }}
      />

      <SellerShopModal
        visible={showSellerShop}
        seller={selectedSellerForShop}
        onClose={() => {
          setShowSellerShop(false);
          setSelectedSellerForShop(null);
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 0,
    paddingBottom: 12,
    zIndex: 20,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  productSearchWrap: {
    flex: 1,
    minWidth: 220,
    maxWidth: 360,
    minHeight: 42,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 9,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  searchIconWrap: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
  },
  searchIconWrapFocused: {
    backgroundColor: '#DBEAFE',
  },
  productSearchInput: {
    flex: 1,
    fontSize: 13,
    lineHeight: 16,
    height: 20,
    color: '#0F172A',
    paddingVertical: 0,
    paddingHorizontal: 0,
    backgroundColor: 'transparent',
    borderWidth: 0,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  productSearchInputFocused: {
    color: '#0F172A',
  },
  universityFilterWrap: {
    flex: 1,
    maxWidth: 420,
  },
  universityFilterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  categoryButton: {
    minHeight: 38,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 10,
    paddingVertical: 9,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  categoryButtonText: {
    fontSize: 13,
    color: '#1E3A8A',
    fontWeight: '600',
    maxWidth: 110,
  },
  categoryDropdown: {
    marginTop: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#DBEAFE',
    backgroundColor: '#FFFFFF',
    maxHeight: 240,
    overflow: 'hidden',
  },
  categoryDropdownScroll: {
    maxHeight: 180,
  },
  categoryOptionRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 8,
    paddingHorizontal: 8,
    paddingTop: 8,
    paddingBottom: 4,
  },
  categoryMainOption: {
    marginBottom: 0,
    flex: 1,
  },
  categoryToggleButton: {
    width: 40,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#DBEAFE',
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryOption: {
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  subCategoryWrap: {
    paddingLeft: 28,
    paddingRight: 8,
    paddingBottom: 6,
    gap: 6,
  },
  subCategoryOption: {
    marginBottom: 0,
    borderRadius: 8,
  },
  categoryOptionActive: {
    backgroundColor: '#EFF6FF',
  },
  categoryOptionIconWrap: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryOptionIconWrapActive: {
    backgroundColor: '#DBEAFE',
  },
  categoryOptionText: {
    flex: 1,
    fontSize: 13,
    color: '#334155',
    fontWeight: '500',
  },
  categoryOptionTextActive: {
    color: '#1D4ED8',
    fontWeight: '700',
  },
  subCategoryText: {
    fontSize: 12,
  },
  universityButton: {
    flex: 1,
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
  universityButtonText: {
    flex: 1,
    fontSize: 13,
    color: '#1E3A8A',
    fontWeight: '600',
  },
  selectedCountBadge: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 10,
    paddingVertical: 7,
    minHeight: 42,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 74,
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
  totalProductsBadge: {
    minWidth: 132,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 7,
    alignItems: 'center',
    minHeight: 42,
    justifyContent: 'center',
  },
  totalProductsTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  totalProductsLabel: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  totalProductsValue: {
    marginTop: 1,
    fontSize: 16,
    color: '#0F172A',
    fontWeight: '700',
    lineHeight: 18,
    textAlign: 'center',
  },
  listContent: {
    paddingHorizontal: 0,
    paddingBottom: 20,
  },
  horizontalScrollContent: {
    minWidth: '100%',
  },
  fullWidth: {
    width: '100%',
  },
  gridRow: {
    justifyContent: 'flex-start',
    gap: GRID_GAP,
    paddingHorizontal: 12,
    marginBottom: GRID_GAP,
  },
  card: {
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    marginBottom: 0,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 2,
  },
  imageWrap: {
    width: '100%',
    aspectRatio: 1.25,
    backgroundColor: '#E2E8F0',
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  discountBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: '#F68B1E',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  discountText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  cardBody: {
    padding: 7,
  },
  cardTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0F172A',
    lineHeight: 15,
    height: 30,
    marginBottom: 5,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  priceText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#F68B1E',
    marginRight: 6,
  },
  originalPrice: {
    fontSize: 10,
    color: '#94A3B8',
    textDecorationLine: 'line-through',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaSecondaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
  },
  metaText: {
    flexShrink: 1,
    fontSize: 11,
    color: '#64748B',
  },
  sellerAvatar: {
    width: 18,
    height: 18,
    borderRadius: 9,
    marginRight: 5,
  },
  sellerName: {
    fontSize: 11,
    color: '#64748B',
    flex: 1,
  },
  dot: {
    marginHorizontal: 6,
    color: '#94A3B8',
  },
  stateWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    gap: 12,
  },
  stateText: {
    fontSize: 14,
    color: '#64748B',
  },
  errorText: {
    fontSize: 14,
    color: '#DC2626',
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 4,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#2563EB',
  },
  retryText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  emptyContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  emptyWrap: {
    alignItems: 'center',
  },
  emptyTitle: {
    marginTop: 10,
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  emptySubtitle: {
    marginTop: 6,
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
  },
  editOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.58)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  editCard: {
    width: '100%',
    maxWidth: 720,
    maxHeight: '92%',
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
  },
  editHeader: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
  },
  editTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  editCloseButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E2E8F0',
  },
  editContent: {
    flex: 1,
  },
  editContentContainer: {
    padding: 16,
    gap: 12,
  },
  editField: {
    gap: 6,
  },
  editLabel: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.2,
  },
  editInput: {
    minHeight: 42,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 14,
    color: '#0F172A',
  },
  editInputMultiline: {
    minHeight: 96,
  },
  editSelectButton: {
    minHeight: 42,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 9,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  editSelectButtonDisabled: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
  },
  editSelectButtonLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  editSelectButtonText: {
    flex: 1,
    fontSize: 13,
    color: '#0F172A',
    fontWeight: '600',
  },
  editSelectPlaceholderText: {
    color: '#94A3B8',
    fontWeight: '500',
  },
  editSelectDropdown: {
    marginTop: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#DBEAFE',
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
  },
  editSelectDropdownScroll: {
    maxHeight: 190,
  },
  editSelectOption: {
    minHeight: 38,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  editSelectOptionActive: {
    backgroundColor: '#EFF6FF',
  },
  editSelectOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  editSelectOptionText: {
    fontSize: 13,
    color: '#334155',
    flex: 1,
  },
  editSelectOptionTextActive: {
    color: '#2563EB',
    fontWeight: '700',
  },
  editRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  editFieldHalf: {
    flex: 1,
  },
  editActions: {
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 10,
    backgroundColor: '#F8FAFC',
  },
  editCancelButton: {
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
  },
  editCancelText: {
    color: '#334155',
    fontSize: 13,
    fontWeight: '700',
  },
  editSaveButton: {
    minWidth: 136,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
    backgroundColor: '#2563EB',
    paddingHorizontal: 16,
  },
  editSaveText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
});

export default AdminProductsPage;
