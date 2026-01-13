// app/(tabs)/Profile/seller.tsx — WITH PROFESSIONAL PROFILE DESIGN
import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { useAlert } from '../../alert/AlertProvider';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Image,
  ActivityIndicator, SafeAreaView, Dimensions, TextInput,
  Modal, KeyboardAvoidingView, Platform, FlatList,
  RefreshControl, useColorScheme, Linking, StatusBar,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter, useFocusEffect } from 'expo-router';
import { supabase } from '@/lib/supabase';
import * as ImagePicker from 'expo-image-picker';
import { format } from 'date-fns';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ClipboardExpo from 'expo-clipboard';
import ResponsiveVideo from '../../components/ResponsiveVideo';
import { Video, ResizeMode } from 'expo-av';

const { width, height } = Dimensions.get('window');
const SUPABASE_URL = 'https://qwujadyqebfypyhfuwfl.supabase.co';
// const isTablet = width >= 768;
const isDesktop = width >= 1024;
// Color scheme definitions
const lightColors = {
  primary: '#FF9900',
  primaryLight: '#FFB84D',
  primaryDark: '#E68A00',
  background: '#FFFFFF',
  card: '#FFFFFF',
  text: '#1A1A1A',
  textSecondary: '#666666',
  textTertiary: '#999999',
  border: '#EEEEEE',
  inputBackground: '#F8F9FA',
  inputBorder: '#E1E1E1',
  success: '#34C759',
  successLight: '#D4F5DE',
  error: '#FF3B30',
  errorLight: '#FFE5E5',
  warning: '#FFA500',
  info: '#007AFF',
  infoLight: '#D1EBFF',
  shadow: '#000000',
  modalOverlay: 'rgba(0, 0, 0, 0.5)',
  placeholder: '#999999',
  disabled: '#CCCCCC',
  chipBackground: '#F0F2F5',
  chipActiveBackground: '#FFF9F0',
  chipActiveBorder: '#FF9900',
  statusPending: '#FFA500',
  statusProcessing: '#007AFF',
  statusCompleted: '#34C759',
  statusCancelled: '#FF3B30',
  statusShipped: '#5856D6',
  statusDefault: '#8E8E93',
  gradientStart: '#FF9900',
  gradientEnd: '#FF6B00',
};

const darkColors = {
  primary: '#FF9900',
  primaryLight: '#FFB84D',
  primaryDark: '#E68A00',
  background: '#121212',
  card: '#1E1E1E',
  text: '#FFFFFF',
  textSecondary: '#B0B0B0',
  textTertiary: '#888888',
  border: '#333333',
  inputBackground: '#2A2A2A',
  inputBorder: '#404040',
  success: '#30D158',
  successLight: '#1E3A29',
  error: '#FF453A',
  errorLight: '#3A1E1E',
  warning: '#FF9F0A',
  info: '#0A84FF',
  infoLight: '#1A2A3A',
  shadow: '#000000',
  modalOverlay: 'rgba(0, 0, 0, 0.7)',
  placeholder: '#666666',
  disabled: '#555555',
  chipBackground: '#2C2C2E',
  chipActiveBackground: '#3A2E1E',
  chipActiveBorder: '#FF9900',
  statusPending: '#FF9F0A',
  statusProcessing: '#0A84FF',
  statusCompleted: '#30D158',
  statusCancelled: '#FF453A',
  statusShipped: '#5E5CE6',
  statusDefault: '#636366',
  gradientStart: '#FF9900',
  gradientEnd: '#FF6B00',
};

// Ghana Universities List
const GHANA_UNIVERSITIES = [
  'University of Ghana', 
  'Kwame Nkrumah University of Science and Technology', 
  'University of Cape Coast',
  'University of Education, Winneba', 
  'University for Development Studies', 
  'University of Energy and Natural Resources',
  'University of Mines and Technology', 
  'University of Health and Allied Sciences', 
  'Ghana Institute of Management and Public Administration',
  'Accra Technical University', 
  'Kumasi Technical University', 
  'Takoradi Technical University', 
  'Ho Technical University',
  'Cape Coast Technical University', 
  'Bolgatanga Technical University', 
  'Koforidua Technical University', 
  'Tamale Technical University',
  'Sunyani Technical University', 
  'Regent University College of Science and Technology', 
  'Ashesi University', 
  'Central University',
  'Valley View University', 
  'Pentecost University', 
  'Methodist University College Ghana', 
  'Presbyterian University College, Ghana',
  'Catholic University College of Ghana', 
  'Christian Service University College', 
  'Wisconsin International University College, Ghana',
  'Lancaster University Ghana', 
  'Academic City University College', 
  'Radford University College'
];

// ==================== CUSTOM ALERT SYSTEM ====================
type AlertType = 'info' | 'success' | 'error' | 'warning' | 'confirm';

interface AlertData {
  id: string;
  title: string;
  message: string;
  type: AlertType;
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
  onClose?: () => void;
}



// Size options
const sizeOptions = {
  womenDresses: ['UK 6', 'UK 8', 'UK 10', 'UK 12', 'UK 14', 'UK 16', 'UK 18'],
  womenClothing: ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
  menClothing: ['S', 'M', 'L', 'XL', 'XXL', 'XXXL'],
  menPants: Array.from({ length: 16 }, (_, i) => `${28 + i * 2}`),
  womenPants: ['24', '25', '26', '27', '28', '29', '30', '31', '32', '33', '34'],
  shoes: ['35','36','37','38','39','40','41','42','43','44','45','46','47','48'],
};

// Electronics brands
const electronicsBrands: Record<string, string[]> = {
  Phones: ['Apple', 'Samsung', 'Google', 'Xiaomi', 'Oppo', 'Vivo', 'Tecno', 'Infinix', 'Huawei', 'OnePlus', 'Nokia', 'Realme', 'Other'],
  Laptops: ['Apple', 'Dell', 'HP', 'Lenovo', 'Asus', 'Acer', 'MSI', 'Microsoft Surface', 'Razer', 'Alienware', 'Toshiba', 'Other'],
  Tablets: ['Apple', 'Samsung', 'Lenovo', 'Huawei', 'Amazon', 'Microsoft', 'Xiaomi', 'Other'],
  Headphones: ['Apple', 'Sony', 'Bose', 'JBL', 'Sennheiser', 'Beats', 'Anker', 'Boat', 'Skullcandy', 'Audio-Technica', 'Other'],
  Chargers: ['Anker', 'Belkin', 'Samsung', 'Apple', 'Baseus', 'UGreen', 'Spigen', 'Other'],
  Gaming: ['PlayStation', 'Xbox', 'Nintendo', 'Razer', 'Logitech', 'SteelSeries', 'Corsair', 'Other'],
  Accessories: ['Spigen', 'OtterBox', 'UAG', 'Anker', 'Baseus', 'Ringke', 'ESR', 'Other'],
  'Other Electronics': [],
};

// Category structure - UPDATED WITH SERVICES
const categoryStructure = {
  Fashion: ['Dresses', 'Tops & Shirts', 'Pants & Jeans', 'Skirts', 'Jackets', 'Footwear', 'Bags', 'Watches', 'Jewelry', 'Accessories', 'Other Fashion'],
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

type MainCategory = keyof typeof categoryStructure;
type SubCategory = typeof categoryStructure[MainCategory][number];

// Helper functions for order status
const getStatusColor = (status: string, themeColors: any) => {
  switch (status) {
    case 'pending':
      return themeColors.statusPending;
    case 'processing':
      return themeColors.statusProcessing;
    case 'completed':
      return themeColors.statusCompleted;
    case 'cancelled':
      return themeColors.statusCancelled;
    case 'shipped':
      return themeColors.statusShipped;
    default:
      return themeColors.statusDefault;
  }
};

const getStatusText = (status: string) => {
  switch (status) {
    case 'pending':
      return 'Pending';
    case 'processing':
      return 'Processing';
    case 'completed':
      return 'Completed';
    case 'cancelled':
      return 'Cancelled';
    case 'shipped':
      return 'Shipped';
    default:
      return status;
  }
};

// Helper function for delivery text
// In your getDeliveryText function (around line 836)
const getDeliveryText = (option: string, isService: boolean) => {
  if (isService) {
    switch (option) {
      case 'Meetup / Pickup':
        return 'Meetup / Pickup';
      case 'Remote':
        return 'Remote Service';
      case 'On-site':
        return 'On-site Service';
      case 'Both':
        return 'Remote & On-site Available';
      // Legacy values for backward compatibility
      case 'pickup':
      case 'Meetup/pickup':
        return 'Meetup / Pickup';
      case 'remote':
        return 'Remote Service';
      case 'on-site':
        return 'On-site Service';
      case 'both':
        return 'Remote & On-site Available';
      default:
        return option;
    }
  } else {
    switch (option) {
      case 'Meetup / Pickup':
        return 'Meetup / Pickup';
      case 'Campus Delivery':
        return 'Campus Delivery';
      case 'Both':
        return 'Campus Delivery and Meetup / Pickup';
      // Legacy values for backward compatibility
      case 'pickup':
      case 'Meetup/pickup':
        return 'Meetup / Pickup';
      case 'campus delivery':
        return 'Campus Delivery';
      case 'both':
        return 'Campus Delivery and Meetup / Pickup';
      default:
        return option;
    }
  }
};

const normalizeDeliveryOptionForDb = (option: string | null | undefined, isService: boolean): string => {
  const normalized = (option || '').trim();
  if (!normalized) return 'Meetup / Pickup';

  const lower = normalized.toLowerCase();

  // Accept legacy DB values and map them to the NEW stored values you want.
  if (lower === 'pickup') return 'Meetup / Pickup';
  if (lower === 'campus delivery') return 'Campus Delivery';
  if (lower === 'both') return 'Meetup / Pickup and Campus Delivery';
  if (lower === 'remote') return 'remote';
  if (lower === 'on-site') return 'on-site';

  // If we already have a desired new stored value, keep it.
  if (
    normalized === 'Meetup / Pickup' ||
    normalized === 'Campus Delivery' ||
    normalized === 'Meetup / Pickup and Campus Delivery' ||
    normalized === 'remote' ||
    normalized === 'on-site'
  ) {
    return normalized;
  }

  // Map UI/legacy labels -> canonical DB values
  switch (normalized) {
    case 'Meetup / Pickup':
    case 'Meetup/pickup':
      return 'Meetup / Pickup';
    case 'Campus Delivery':
      return 'Campus Delivery';
    case 'Remote':
      return 'remote';
    case 'On-site':
      return 'on-site';
    case 'Both':
      return 'Meetup / Pickup and Campus Delivery';
    default:
      // Last-resort: best-effort mapping.
      if (isService) {
        if (lower.includes('remote')) return 'remote';
        if (lower.includes('on-site') || lower.includes('onsite')) return 'on-site';
        if (lower.includes('both')) return 'Meetup / Pickup and Campus Delivery';
        return 'Meetup / Pickup';
      }

      if (lower.includes('campus') || lower.includes('delivery')) return 'Campus Delivery';
      if (lower.includes('both')) return 'Meetup / Pickup and Campus Delivery';
      if (lower.includes('pick')) return 'Meetup / Pickup';
      return normalized;
  }
};

const deliveryOptionToUi = (option: string | null | undefined, isService: boolean): string => {
  const normalized = normalizeDeliveryOptionForDb(option, isService);
  switch (normalized) {
    case 'Meetup / Pickup':
      return 'Meetup / Pickup';
    case 'Campus Delivery':
      return 'Campus Delivery';
    case 'remote':
      return 'Remote';
    case 'on-site':
      return 'On-site';
    case 'Meetup / Pickup and Campus Delivery':
      return 'Both';
    default:
      return 'Meetup / Pickup';
  }
};

// Helper function to parse location into university and additional parts
const parseLocation = (location: string, university: string) => {
  if (!location || !university) return { universityPart: university || '', additionalPart: location || '' };
  
  if (location.startsWith(university + ' - ')) {
    return {
      universityPart: university,
      additionalPart: location.substring((university + ' - ').length)
    };
  }
  
  // If location doesn't start with university, treat entire location as additional
  return {
    universityPart: university,
    additionalPart: location
  };
};

// === MEDIA UTILITY FUNCTIONS (kept in sync with Home/Search behavior) ===
const formatProductMediaUrl = (url?: string): string | undefined => {
  if (!url) return undefined;
  if (
    url.startsWith('http') ||
    url.startsWith('file:') ||
    url.startsWith('content:') ||
    url.startsWith('asset:')
  ) {
    return url;
  }
  return `${SUPABASE_URL}/storage/v1/object/public/products/${url}`;
};

const isVideoUrl = (url?: string): boolean => {
  if (!url) return false;
  const clean = url.split('?')[0].toLowerCase();
  return clean.endsWith('.mp4') || clean.endsWith('.mov') || clean.endsWith('.m4v') || clean.endsWith('.webm');
};

// Helper function to get media indices for a specific color
const getMediaIndicesForColor = (color: string, product: any) => {
  if (!product || !product.media_urls || !product.color_media) return [];
  
  const colorSpecificMedia = product.color_media[color] || [];
  const indices = [];
  
  for (let i = 0; i < product.media_urls.length; i++) {
    if (colorSpecificMedia.includes(product.media_urls[i])) {
      indices.push(i);
    }
  }
  
  return indices;
};

// Get product image for order item - color-specific, image-only (no video)
const getOrderItemImage = (item: any) => {
  const product = item.products;
  const color = item.color;
  
  // If color is assigned and color_media exists
  if (color && product?.color_media?.[color]) {
    const colorMedia = product.color_media[color];
    // Find first non-video image in color-specific media
    const colorImage = colorMedia.find((url: string) => !url.toLowerCase().includes('.mp4'));
    if (colorImage) return colorImage;
  }
  
  // Fallback: find first non-video image from all media
  if (product?.media_urls?.length > 0) {
    const imageUrl = product.media_urls.find((url: string) => !url.toLowerCase().includes('.mp4'));
    if (imageUrl) return imageUrl;
  }
  
  // Last resort: use product_image_url or placeholder
  return item.product_image_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(item.product_name || 'Product')}&background=FF9900&color=fff`;
};

// Professional Avatar Component
const ProfessionalAvatar = ({ uri, name, size = 120, onPress }: { uri: string, name: string, size?: number, onPress?: () => void }) => {
  const colorScheme = useColorScheme();
  const themeColors = colorScheme === 'dark' ? darkColors : lightColors;
  
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8} style={profAvatarStyles.container}>
      <View style={[profAvatarStyles.outerRing, { 
        width: size + 12, 
        height: size + 12,
        borderColor: themeColors.primaryLight,
        backgroundColor: 'transparent',
      }]}>
        <View style={[profAvatarStyles.innerRing, { 
          width: size + 8, 
          height: size + 8,
          borderColor: themeColors.primary,
        }]}>
          <Image
            source={{ uri }}
            style={[profAvatarStyles.avatar, { 
              width: size, 
              height: size,
              borderRadius: size / 2,
            }]}
            resizeMode="cover"
          />
        </View>
      </View>
      <View style={[profAvatarStyles.editButton, { backgroundColor: themeColors.primary }]}>
        <Ionicons name="camera" size={16} color="#FFFFFF" />
      </View>
    </TouchableOpacity>
  );
};

const profAvatarStyles = StyleSheet.create({
  container: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  outerRing: {
    borderRadius: 1000,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  innerRing: {
    borderRadius: 1000,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  avatar: {
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  editButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
});

// Stats Card Component
const StatsCard = ({ value, label, icon, themeColors }: { value: string, label: string, icon: string, themeColors: any }) => {
  return (
    <View style={[profStatsStyles.card, { 
      backgroundColor: themeColors.card,
      shadowColor: themeColors.shadow,
    }]}>
      <View style={[profStatsStyles.iconContainer, { backgroundColor: themeColors.primary + '15' }]}>
        <Ionicons name={icon as any} size={24} color={themeColors.primary} />
      </View>
      <Text style={[profStatsStyles.value, { color: themeColors.text }]}>{value}</Text>
      <Text style={[profStatsStyles.label, { color: themeColors.textSecondary }]}>{label}</Text>
    </View>
  );
};

const profStatsStyles = StyleSheet.create({
  card: {
    flex: 1,
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    marginHorizontal: 6,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  value: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  label: {
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
  },
});

// Info Row Component
const InfoRow = ({ icon, label, value, themeColors }: { icon: string, label: string, value: string, themeColors: any }) => {
  return (
    <View style={[profInfoStyles.row, { backgroundColor: themeColors.inputBackground }]}>
      <View style={[profInfoStyles.iconContainer, { backgroundColor: themeColors.primary + '20' }]}>
        <Ionicons name={icon as any} size={20} color={themeColors.primary} />
      </View>
      <View style={profInfoStyles.textContainer}>
        <Text style={[profInfoStyles.label, { color: themeColors.textSecondary }]}>{label}</Text>
        <Text style={[profInfoStyles.value, { color: themeColors.text }]}>{value}</Text>
      </View>
    </View>
  );
};

const profInfoStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  label: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  value: {
    fontSize: 16,
    fontWeight: '600',
  },
});

// Action Button Component
const ActionButton = ({ 
  icon, 
  label, 
  onPress, 
  variant = 'primary',
  themeColors 
}: { 
  icon: string, 
  label: string, 
  onPress: () => void, 
  variant?: 'primary' | 'secondary' | 'outline',
  themeColors: any 
}) => {
  const getButtonStyle = () => {
    switch (variant) {
      case 'secondary':
        return { backgroundColor: themeColors.inputBackground, borderColor: themeColors.border };
      case 'outline':
        return { backgroundColor: 'transparent', borderColor: themeColors.primary };
      default:
        return { backgroundColor: themeColors.primary, borderColor: themeColors.primary };
    }
  };

  const getTextStyle = () => {
    switch (variant) {
      case 'secondary':
        return { color: themeColors.text };
      case 'outline':
        return { color: themeColors.primary };
      default:
        return { color: '#FFFFFF' };
    }
  };

  return (
    <TouchableOpacity
      style={[
        profActionStyles.button,
        getButtonStyle(),
        { borderWidth: variant === 'outline' ? 1.5 : 0 }
      ]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Ionicons 
        name={icon as any} 
        size={20} 
        color={variant === 'outline' ? themeColors.primary : variant === 'secondary' ? themeColors.text : '#FFFFFF'} 
      />
      <Text style={[profActionStyles.buttonText, getTextStyle()]}>{label}</Text>
    </TouchableOpacity>
  );
};

const profActionStyles = StyleSheet.create({
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    marginHorizontal: 6,
    gap: 8,
  },
  buttonText: {
    fontSize: 15,
    fontWeight: '600',
  },
});

// ==================== MAIN COMPONENT ====================
function SellerDashboardContent() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const themeColors = colorScheme === 'dark' ? darkColors : lightColors;
  const { showAlert, showConfirmation } = useAlert(); // Use custom alert system

  
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [shop, setShop] = useState<any>(null);
  const [avatarUrl, setAvatarUrl] = useState('');
  const [productCount, setProductCount] = useState(0);
  const [followerCount, setFollowerCount] = useState(0);
  const [totalLikes, setTotalLikes] = useState(0);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingShopName, setEditingShopName] = useState('');
  const [editingFullName, setEditingFullName] = useState('');
  const [editingPhone, setEditingPhone] = useState('');
  const [editingLocation, setEditingLocation] = useState('');
  const [editingUniversity, setEditingUniversity] = useState('');
  const [editingLocationAdditional, setEditingLocationAdditional] = useState('');
  const [editingUsername, setEditingUsername] = useState('');
  const [saving, setSaving] = useState(false);
  const [addProductModal, setAddProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [selectedMedia, setSelectedMedia] = useState<{ uri: string; type: 'image' | 'video' }[]>([]);
  const [posting, setPosting] = useState(false);
  const [title, setTitle] = useState('');
  const [originalPrice, setOriginalPrice] = useState('');
  const [sellingPrice, setSellingPrice] = useState('');
  const [mainCategory, setMainCategory] = useState<MainCategory | ''>('');
  const [subCategory, setSubCategory] = useState<SubCategory | ''>('');
  const [tertiaryCategory, setTertiaryCategory] = useState<string>('');
  const [productGender, setProductGender] = useState<'Men' | 'Women' | 'Unisex' | 'Kids' | 'Others' | ''>('');
  const [selectedSizes, setSelectedSizes] = useState<string[]>([]);
  const [sizeStock, setSizeStock] = useState<Record<string, string>>({});
  const [generalStock, setGeneralStock] = useState('');
  const [productColors, setProductColors] = useState<string[]>([]);
  const [colorStock, setColorStock] = useState<Record<string, string>>({}); // NEW: Color-specific stock
  const [newColor, setNewColor] = useState('');
  const [brand, setBrand] = useState('');
  const [deliveryOption, setDeliveryOption] = useState<string>('');
  const [isPreOrder, setIsPreOrder] = useState(false);
  const [preOrderDuration, setPreOrderDuration] = useState('');
  const [preOrderDurationUnit, setPreOrderDurationUnit] = useState<'days' | 'weeks' | 'months'>('days');
  const [description, setDescription] = useState('');
  const [productDetailModal, setProductDetailModal] = useState(false);
  const [selectedProductDetail, setSelectedProductDetail] = useState<any>(null);
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0);
  const [selectedColorForMedia, setSelectedColorForMedia] = useState<string>('');
  const [colorMediaModalVisible, setColorMediaModalVisible] = useState(false);
  const [colorMediaAssignments, setColorMediaAssignments] = useState<Record<string, string[]>>({});
  // Full media viewer state
  const [fullViewerVisible, setFullViewerVisible] = useState(false);
  const [fullViewerIndex, setFullViewerIndex] = useState(-1);
  const [fullViewerMediaUrls, setFullViewerMediaUrls] = useState<string[]>([]);
  // Profile photo menu state
  const [profilePhotoMenuVisible, setProfilePhotoMenuVisible] = useState(false);
  const [actionSheetVisible, setActionSheetVisible] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [ordersModalVisible, setOrdersModalVisible] = useState(false);
  const [orders, setOrders] = useState<any[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [pendingOrdersCount, setPendingOrdersCount] = useState(0);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [orderDetailVisible, setOrderDetailVisible] = useState(false);
  const [refreshingOrders, setRefreshingOrders] = useState(false);
  const [contactOptionsVisible, setContactOptionsVisible] = useState(false);
  const [selectedBuyerPhone, setSelectedBuyerPhone] = useState('');
  const [selectedBuyerName, setSelectedBuyerName] = useState('');
  const [selectedOrderForWhatsApp, setSelectedOrderForWhatsApp] = useState<any>(null);
  
  // University Dropdown States
  const [showUniversityDropdown, setShowUniversityDropdown] = useState(false);
  const [universitySearch, setUniversitySearch] = useState('');
  const [filteredUniversities, setFilteredUniversities] = useState(GHANA_UNIVERSITIES);

  // Helper functions
  const fallbackAvatar = (name: string) => `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=FF9900&color=fff&size=300&bold=true&rounded=true`;

  // University Filter Function
  const filterUniversities = (searchText: string) => {
    setUniversitySearch(searchText);
    if (searchText.trim() === '') {
      setFilteredUniversities(GHANA_UNIVERSITIES);
    } else {
      const filtered = GHANA_UNIVERSITIES.filter(university =>
        university.toLowerCase().includes(searchText.toLowerCase())
      );
      setFilteredUniversities(filtered);
    }
  };

  // Handle University Selection
  const handleUniversitySelect = (university: string) => {
    setEditingUniversity(university);
    // Update location with new university and existing additional info
    const newLocation = university + (editingLocationAdditional ? ' - ' + editingLocationAdditional : '');
    setEditingLocation(newLocation);
    setShowUniversityDropdown(false);
    setUniversitySearch('');
    setFilteredUniversities(GHANA_UNIVERSITIES);
  };

  // Handle Location Additional Changes
  const handleLocationAdditionalChange = (text: string) => {
    setEditingLocationAdditional(text);
    // Update the full location display
    if (editingUniversity) {
      setEditingLocation(`${editingUniversity} - ${text}`.trim());
    } else {
      setEditingLocation(text);
    }
  };

  // Generate WhatsApp message with order details
  const generateWhatsAppMessage = (order: any, product?: any) => {
    const orderId = order.id.slice(-8);
    const orderDate = format(new Date(order.created_at), 'MMM d, yyyy');
    const orderTotal = order.total_amount.toFixed(2);
    const buyerName = order.buyer_name || 'Customer';
    
    // Get product details
    const firstItem = order.order_items?.[0] || order;
    const productName = firstItem.product_name || firstItem.products?.title || 'Product';
    const productPrice = firstItem.product_price || order.total_amount;
    const quantity = firstItem.quantity || 1;
    const productImage = firstItem.product_image_url || firstItem.products?.media_urls?.[0];
    const productLink = productImage ? `Product Image: ${productImage}` : '';
    
    // Construct message
    let message = `Hello ${buyerName}! 👋\n\n`;
    message += `Regarding your order #${orderId} from ${orderDate}:\n\n`;
    message += `📦 *Order Details:*\n`;
    message += `• Product: ${productName}\n`;
    message += `• Quantity: ${quantity}\n`;
    message += `• Price per unit: GHS ${productPrice}\n`;
    message += `• Total: GHS ${orderTotal}\n\n`;
    
    if (productLink) {
      message += `${productLink}\n\n`;
    }
    
    message += `📍 *Delivery Info:*\n`;
    message += `• Method: ${getDeliveryText(order.delivery_option, firstItem.products?.category === 'Services' || order.is_service)}\n`;
    message += `• Location: ${order.location}\n\n`;
    
    message += `🛒 *Order Status:* ${getStatusText(order.status)}\n\n`;
    message += `Please let me know if you have any questions about your order!\n\n`;
    message += `Best regards,\n${shop?.name || 'Seller'}`;
    
    return message;
  };

  // Helper functions for phone number actions
  const handleWhatsAppChat = async (phoneNumber: string, order?: any) => {
    try {
      // Store order for WhatsApp message
      if (order) {
        setSelectedOrderForWhatsApp(order);
      }
      
      // Use the exact phone number format as displayed (with country code)
      let cleanNumber = phoneNumber.replace(/\s+/g, '');
      
      // WhatsApp expects numbers in international format without +
      if (cleanNumber.startsWith('+')) {
        cleanNumber = cleanNumber.substring(1);
      }
      
      // Generate message if we have order details
      let message = '';
      if (selectedOrderForWhatsApp) {
        message = generateWhatsAppMessage(selectedOrderForWhatsApp);
      }
      
      // WhatsApp URL format with message
      const whatsappUrl = `whatsapp://send?phone=${cleanNumber}${message ? `&text=${encodeURIComponent(message)}` : ''}`;
      
      // Try to open WhatsApp
      const canOpen = await Linking.canOpenURL(whatsappUrl);
      
      if (canOpen) {
        await Linking.openURL(whatsappUrl);
      } else {
        // If WhatsApp is not installed, open web version
        const webWhatsappUrl = `https://wa.me/${cleanNumber}${message ? `?text=${encodeURIComponent(message)}` : ''}`;
        await Linking.openURL(webWhatsappUrl);
      }
      
      // Clear the stored order after sending
      if (order) {
        setTimeout(() => setSelectedOrderForWhatsApp(null), 1000);
      }
    } catch (error) {
      console.error('Error opening WhatsApp:', error);
      showAlert({
        title: 'Error',
        message: 'Could not open WhatsApp. Please make sure WhatsApp is installed.',
        type: 'error'
      });
    }
  };

  const handlePhoneCall = async (phoneNumber: string) => {
    try {
      // Use the exact phone number format as displayed (with country code)
      const phoneUrl = `tel:${phoneNumber}`;
      
      const canOpen = await Linking.canOpenURL(phoneUrl);
      
      if (canOpen) {
        await Linking.openURL(phoneUrl);
      } else {
        showAlert({
          title: 'Error',
          message: 'Could not open phone dialer.',
          type: 'error'
        });
      }
    } catch (error) {
      console.error('Error opening phone dialer:', error);
      showAlert({
        title: 'Error',
        message: 'Could not make phone call.',
        type: 'error'
      });
    }
  };

  const handleCopyNumber = async (phoneNumber: string) => {
    try {
      await ClipboardExpo.setStringAsync(phoneNumber);
      showAlert({
        title: 'Copied!',
        message: 'Phone number copied to clipboard',
        type: 'success'
      });
    } catch (error) {
      console.error('Error copying number:', error);
      showAlert({
        title: 'Error',
        message: 'Could not copy phone number',
        type: 'error'
      });
    }
  };

  // Function to open contact options
  const openContactOptions = (phoneNumber: string, buyerName: string, order?: any) => {
    setSelectedBuyerPhone(phoneNumber);
    setSelectedBuyerName(buyerName);
    if (order) {
      setSelectedOrderForWhatsApp(order);
    }
    setContactOptionsVisible(true);
  };

  // Memoized calculations
  const availableSizes = useMemo((): readonly string[] => {
    if (!mainCategory || !subCategory || !productGender) return [];
    const isFashion = mainCategory === 'Fashion';
    const isSports = mainCategory === 'Sports';
    if (subCategory === 'Dresses' && productGender === 'Women') return sizeOptions.womenDresses;
    if (isFashion && ['Tops & Shirts', 'Jackets', 'Skirts'].includes(subCategory)) {
      return productGender === 'Men' ? sizeOptions.menClothing : sizeOptions.womenClothing;
    }
    if (subCategory === 'Pants & Jeans') return productGender === 'Men' ? sizeOptions.menPants : sizeOptions.womenPants;
    if (isSports && ['Gym Wear', 'Jersey'].includes(subCategory)) return productGender === 'Men' ? sizeOptions.menClothing : sizeOptions.womenClothing;
    if (subCategory === 'Footwear') return sizeOptions.shoes;
    return [];
  }, [mainCategory, subCategory, productGender]);

  const sizeSectionTitle = useMemo(() => {
    if (subCategory === 'Dresses') return 'Dress Size (UK) *';
    if (subCategory === 'Pants & Jeans') return 'Waist Size (inches) *';
    if (subCategory === 'Footwear') return 'Shoe Size (EU) *';
    return 'Available Sizes *';
  }, [subCategory]);

  const isFashionOrSports = mainCategory === 'Fashion' || mainCategory === 'Sports';
  const isElectronics = mainCategory === 'Electronics';
  const isService = mainCategory === 'Services';
  const requiresSizes = isFashionOrSports && availableSizes.length > 0;
  const requiresBrand = isElectronics && subCategory && electronicsBrands[subCategory]?.length > 0;

  // UPDATED: Calculate total stock including color stock
  const totalStock = useMemo(() => {
    if (isService) return 0;
    
    if (requiresSizes) {
      return Object.values(sizeStock).reduce((sum, val) => sum + (parseInt(val) || 0), 0);
    } else if (productColors.length > 0) {
      // If colors exist, use color stock
      return Object.values(colorStock).reduce((sum, val) => sum + (parseInt(val) || 0), 0);
    } else {
      // Use general stock if no colors
      return parseInt(generalStock) || 0;
    }
  }, [sizeStock, generalStock, requiresSizes, productColors, colorStock, isService]);

  const discountPercent = useMemo(() => {
    if (!originalPrice || !sellingPrice) return null;
    const orig = parseFloat(originalPrice);
    const sell = parseFloat(sellingPrice);
    return orig > sell && orig > 0 ? Math.round(((orig - sell) / orig) * 100) : null;
  }, [originalPrice, sellingPrice]);

  // Delivery options based on product type - UPDATED: Removed nationwide shipping
  const deliveryOptions = useMemo(() => {
  return isService
    ? ['Meetup / Pickup', 'Remote', 'On-site', 'Both']
    : ['Meetup / Pickup', 'Campus Delivery', 'Both'];
}, [isService]);

  // WORKING LOGOUT FUNCTION - UPDATED WITH CUSTOM ALERT
  const handleLogout = async () => {
    showConfirmation({
      title: 'Log Out',
      message: 'Are you sure you want to log out?',
      confirmText: 'Log Out',
      cancelText: 'Cancel',
      onConfirm: async () => {
        try {
          console.log('🚪 Starting logout process...');
          
          // 1. Sign out from Supabase
          const { error } = await supabase.auth.signOut();
          
          if (error) {
            console.error('❌ Supabase sign out error:', error);
            showAlert({
              title: 'Error',
              message: 'Failed to log out. Please try again.',
              type: 'error'
            });
            return;
          }
          
          console.log('✅ Supabase sign out successful');
          
          // 2. Clear ALL AsyncStorage
          const allKeys = await AsyncStorage.getAllKeys();
          await AsyncStorage.multiRemove(allKeys);
          console.log('✅ AsyncStorage cleared completely');
          
          // 3. Reset all state
          setSession(null);
          setProfile(null);
          setShop(null);
          setAvatarUrl('');
          setProductCount(0);
          setFollowerCount(0);
          setTotalLikes(0);
          
          // 4. Force navigation to auth with timestamp to prevent caching
          const timestamp = Date.now();
          console.log(`📤 Navigating to auth with timestamp: ${timestamp}`);
          
          // Navigate to auth with replace
          router.replace({
            pathname: '/auth',
            params: { logout: 'true', timestamp: timestamp.toString() }
          });
          
        } catch (error: any) {
          console.error('💥 Unexpected logout error:', error);
          showAlert({
            title: 'Error',
            message: 'Failed to log out. Please try again.',
            type: 'error'
          });
          
          // Even if error, try to navigate to auth
          router.replace('/auth');
        }
      },
    });
  };

  // Auth state listener
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔐 Auth state changed:', event);
        
        if (event === 'SIGNED_OUT') {
          console.log('👤 User signed out via auth state change');
          setSession(null);
          
          // If we're still on seller page after logout, redirect to auth
          if (router.pathname?.includes('/seller')) {
            console.log('Redirecting to auth from auth state change');
            router.replace('/auth');
          }
        } else if (event === 'SIGNED_IN') {
          console.log('👤 User signed in');
          setSession(session);
        } else if (event === 'INITIAL_SESSION') {
          setSession(session);
        }
      }
    );
    return () => subscription.unsubscribe();
  }, []);

  // Check session on mount
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      console.log('📱 Session on mount:', session?.user?.email);
      setSession(session);
      
      if (!session) {
        console.log('❌ No session found, redirecting to auth...');
        router.replace('/auth');
      }
    };
    
    checkSession();
  }, []);

  // ORDERS FUNCTIONS - UPDATED WITH buyer_name AND STOCK DECREASE
  const loadOrders = useCallback(async () => {
    if (!session?.user?.id) return;
    
    try {
      setOrdersLoading(true);
      console.log('📦 Loading orders for seller:', session.user.id);
      
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          order_items(
            *,
            products(*)
          ),
          buyer:user_profiles!orders_user_id_fkey(avatar_url)
        `)
        .eq('seller_id', session.user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Error loading orders:', error);
        throw error;
      }
      
      console.log('✅ Orders loaded:', data?.length);
      if (data && data.length > 0) {
        console.log('🔍 First order buyer_name:', data[0].buyer_name);
      }
      
      setOrders(data || []);
      
      const pendingCount = (data || []).filter(order =>
        order.status === 'pending'
      ).length;
      setPendingOrdersCount(pendingCount);
    } catch (error) {
      console.error('Error loading orders:', error);
      showAlert({
        title: 'Error',
        message: 'Failed to load orders',
        type: 'error'
      });
    } finally {
      setOrdersLoading(false);
      setRefreshingOrders(false);
    }
  }, [session?.user?.id]);

  // Real-time subscription for orders
  useEffect(() => {
    if (!session?.user?.id) return;
    const channel = supabase
      .channel(`seller-orders:${session.user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `seller_id=eq.${session.user.id}`
        },
        () => {
          loadOrders();
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [session?.user?.id, loadOrders]);

  // UPDATED: Function to decrease stock when order is completed
  const decreaseStock = async (orderId: string, orderItems: any[]) => {
    try {
      for (const item of orderItems) {
        const productId = item.product_id;
        const quantity = item.quantity || 1;
        const size = item.size;
        const color = item.color;

        // Fetch current product
        const { data: product, error: fetchError } = await supabase
          .from('products')
          .select('*')
          .eq('id', productId)
          .single();

        if (fetchError) throw fetchError;

        let updateData: any = {};

        if (product.sizes_available && product.sizes_available.length > 0 && size) {
          // Update size-specific stock
          const sizeStock = product.size_stock || {};
          const currentQty = parseInt(sizeStock[size] || '0');
          const newQty = Math.max(0, currentQty - quantity);
          
          updateData.size_stock = {
            ...sizeStock,
            [size]: newQty.toString()
          };
          
          // Also update general quantity if it exists
          if (product.quantity) {
            updateData.quantity = Math.max(0, product.quantity - quantity);
          }
        } else if (product.colors_available && product.colors_available.length > 0 && color) {
          // Update color-specific stock
          const colorStock = product.color_stock || {};
          const currentQty = parseInt(colorStock[color] || '0');
          const newQty = Math.max(0, currentQty - quantity);
          
          updateData.color_stock = {
            ...colorStock,
            [color]: newQty.toString()
          };
          
          // Also update general quantity if it exists
          if (product.quantity) {
            updateData.quantity = Math.max(0, product.quantity - quantity);
          }
        } else {
          // Update general stock
          const currentQty = product.quantity || 0;
          updateData.quantity = Math.max(0, currentQty - quantity);
        }

        // Update product stock
        const { error: updateError } = await supabase
          .from('products')
          .update(updateData)
          .eq('id', productId);

        if (updateError) throw updateError;
      }
      
      console.log('✅ Stock decreased successfully for order:', orderId);
    } catch (error) {
      console.error('❌ Error decreasing stock:', error);
      throw error;
    }
  };

  const updateOrderStatus = async (orderId: string, status: string) => {
    try {
      const { data: order, error: fetchError } = await supabase
        .from('orders')
        .select('*, order_items(*)')
        .eq('id', orderId)
        .single();

      if (fetchError) throw fetchError;

      if (order.status === 'cancelled') {
        showAlert({
          title: 'Error',
          message: 'This order has been cancelled and cannot be updated.',
          type: 'error'
        });
        return;
      }

      const { error } = await supabase
        .from('orders')
        .update({
          status,
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId);

      if (error) throw error;
      
      // If order is being marked as completed, decrease stock
      if (status === 'completed') {
        try {
          await decreaseStock(orderId, order.order_items || []);
          console.log('✅ Stock decreased for completed order');
        } catch (stockError) {
          console.error('Error decreasing stock:', stockError);
          // Don't show error to user, just log it
        }
      }
      
      showAlert({
        title: 'Success',
        message: `Order marked as ${getStatusText(status)}`,
        type: 'success'
      });
      loadOrders();
      
      if (status === 'completed' || status === 'cancelled') {
        setPendingOrdersCount(prev => Math.max(prev - 1, 0));
      }
      
      if (orderDetailVisible && selectedOrder?.id === orderId) {
        setOrderDetailVisible(false);
      }
    } catch (error: any) {
      showAlert({
        title: 'Error',
        message: error.message || 'Failed to update order',
        type: 'error'
      });
    }
  };

  const onRefreshOrders = useCallback(() => {
    setRefreshingOrders(true);
    loadOrders();
  }, [loadOrders]);

  // Render order item
  const renderOrderItem = ({ item }: { item: any }) => {
    const firstItem = item.order_items?.[0] || item;
    const coverImage = firstItem.product_image_url || firstItem.products?.media_urls?.[0];
    const productName = firstItem.product_name || firstItem.products?.title || 'Product';
    
    // UPDATED: Use buyer_name instead of full_name
    const buyerName = item.buyer_name || 'Customer';
    const buyerAvatar = item.buyer?.avatar_url ||
      `https://ui-avatars.com/api/?name=${encodeURIComponent(buyerName)}&background=FF9900&color=fff`;
    
    return (
      <TouchableOpacity
        style={[styles.orderCard, { backgroundColor: themeColors.card }]}
        onPress={() => {
          setSelectedOrder(item);
          setOrderDetailVisible(true);
        }}
        activeOpacity={0.7}
      >
        <View style={styles.orderHeader}>
          <View style={styles.orderInfo}>
            <Text style={[styles.orderId, { color: themeColors.text }]}>Order #{item.id.slice(-8)}</Text>
            <Text style={[styles.orderDate, { color: themeColors.textSecondary }]}>
              {format(new Date(item.created_at), 'MMM d, yyyy • h:mm a')}
            </Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status, themeColors) }]}>
            <Text style={styles.statusText}>{getStatusText(item.status)}</Text>
          </View>
        </View>
        <View style={styles.orderContent}>
          {coverImage && (
            <Image
              source={{ uri: coverImage }}
              style={styles.productImage}
              resizeMode="cover"
            />
          )}
          
          <View style={styles.orderDetails}>
            <Text style={[styles.productTitle, { color: themeColors.text }]} numberOfLines={2}>
              {productName}
              {item.order_items?.length > 1 && ` +${item.order_items.length - 1} more`}
            </Text>
            
            <Text style={[styles.productPrice, { color: themeColors.primary }]}>
              GHS {item.total_amount.toFixed(2)}
            </Text>
            
            <View style={styles.buyerInfo}>
              <Image
                source={{ uri: buyerAvatar }}
                style={styles.buyerAvatar}
              />
              <View style={styles.buyerTextInfo}>
                {/* UPDATED: Use buyer_name */}
                <Text style={[styles.buyerName, { color: themeColors.text }]}>{buyerName}</Text>
                <Text style={[styles.buyerContact, { color: themeColors.textSecondary }]}>Phone: {item.phone_number}</Text>
              </View>
              
              {/* Contact Buyer Button */}
              <TouchableOpacity
                style={[styles.contactBuyerButton, { backgroundColor: themeColors.primary }]}
                onPress={(e) => {
                  e.stopPropagation();
                  openContactOptions(item.phone_number, buyerName, item);
                }}
              >
                <Ionicons name="chatbubble-ellipses-outline" size={18} color="#fff" />
                <Text style={styles.contactBuyerButtonText}>Contact</Text>
              </TouchableOpacity>
            </View>
            <Text style={[styles.deliveryInfo, { color: themeColors.textSecondary }]}>
              {getDeliveryText(item.delivery_option, firstItem.products?.category === 'Services' || item.is_service)} • {item.location}
            </Text>
          </View>
        </View>
        <View style={[styles.orderFooter, { borderTopColor: themeColors.border }]}>
          <Text style={[styles.itemsCount, { color: themeColors.textSecondary }]}>
            {item.order_items?.length || 1} item{item.order_items?.length !== 1 ? 's' : ''}
          </Text>
          <View style={styles.actionButtons}>
            {item.status === 'pending' && (
              <>
                <TouchableOpacity
                  style={[styles.actionButton, styles.acceptButton]}
                  onPress={(e) => {
                    e.stopPropagation();
                    updateOrderStatus(item.id, 'processing');
                  }}
                >
                  <Text style={styles.actionButtonText}>Accept</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionButton, styles.rejectButton]}
                  onPress={(e) => {
                    e.stopPropagation();
                    updateOrderStatus(item.id, 'cancelled');
                  }}
                >
                  <Text style={styles.actionButtonText}>Reject</Text>
                </TouchableOpacity>
              </>
            )}
            {item.status === 'processing' && (
              <TouchableOpacity
                style={[styles.actionButton, styles.completeButton]}
                onPress={(e) => {
                  e.stopPropagation();
                  updateOrderStatus(item.id, 'completed');
                }}
              >
                <Text style={styles.actionButtonText}>Complete</Text>
              </TouchableOpacity>
            )}
            {item.status === 'cancelled' && (
              <View style={[styles.actionButton, { backgroundColor: themeColors.statusDefault }]}>
                <Text style={styles.actionButtonText}>Cancelled</Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // Contact Options Modal
  const renderContactOptionsModal = () => (
    <Modal
      visible={contactOptionsVisible}
      transparent
      animationType="fade"
      onRequestClose={() => setContactOptionsVisible(false)}
      statusBarTranslucent
    >
      <View style={[styles.contactOptionsOverlay, { backgroundColor: 'rgba(0, 0, 0, 0.7)' }]}>
        <View style={[styles.contactOptionsContainer, { backgroundColor: themeColors.card }]}>
          <View style={[styles.contactOptionsHeader, { borderBottomColor: themeColors.border }]}>
            <Text style={[styles.contactOptionsTitle, { color: themeColors.text }]}>Contact Buyer</Text>
            <Text style={[styles.contactOptionsSubtitle, { color: themeColors.textSecondary }]}>
              {selectedBuyerName}
            </Text>
            <Text style={[styles.contactOptionsPhone, { color: themeColors.text }]}>
              {selectedBuyerPhone}
            </Text>
          </View>
          
          <View style={styles.contactOptionsList}>
            <TouchableOpacity
              style={[styles.contactOption, { backgroundColor: '#25D366' }]}
              onPress={() => {
                handleWhatsAppChat(selectedBuyerPhone, selectedOrderForWhatsApp);
                setContactOptionsVisible(false);
              }}
            >
              <View style={styles.contactOptionIconContainer}>
                <Ionicons name="logo-whatsapp" size={28} color="#fff" />
              </View>
              <View style={styles.contactOptionTextContainer}>
                <Text style={styles.contactOptionTitle}>WhatsApp</Text>
                <Text style={styles.contactOptionDescription}>Send message with order details</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={themeColors.textSecondary} />
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.contactOption, { backgroundColor: themeColors.success }]}
              onPress={() => {
                handlePhoneCall(selectedBuyerPhone);
                setContactOptionsVisible(false);
              }}
            >
              <View style={styles.contactOptionIconContainer}>
                <Ionicons name="call-outline" size={28} color="#fff" />
              </View>
              <View style={styles.contactOptionTextContainer}>
                <Text style={styles.contactOptionTitle}>Phone Call</Text>
                <Text style={styles.contactOptionDescription}>Call buyer directly</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={themeColors.textSecondary} />
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.contactOption, { backgroundColor: themeColors.info }]}
              onPress={() => {
                handleCopyNumber(selectedBuyerPhone);
                setContactOptionsVisible(false);
              }}
            >
              <View style={styles.contactOptionIconContainer}>
                <Ionicons name="copy-outline" size={28} color="#fff" />
              </View>
              <View style={styles.contactOptionTextContainer}>
                <Text style={styles.contactOptionTitle}>Copy Number</Text>
                <Text style={styles.contactOptionDescription}>Copy phone number to clipboard</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={themeColors.textSecondary} />
            </TouchableOpacity>
          </View>
          
          <TouchableOpacity
            style={[styles.contactOptionsCancel, { backgroundColor: themeColors.inputBackground }]}
            onPress={() => setContactOptionsVisible(false)}
          >
            <Text style={[styles.contactOptionsCancelText, { color: themeColors.text }]}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  // Order Detail Modal
  const renderOrderDetailModal = () => (
    <Modal
      visible={orderDetailVisible}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setOrderDetailVisible(false)}
    >
      <SafeAreaView style={[styles.modalContainer, { backgroundColor: themeColors.modalOverlay }]}>
        <View style={[styles.modalContent, { backgroundColor: themeColors.card }]}>
          <View style={[styles.modalHeader, { borderBottomColor: themeColors.border }]}>
            <TouchableOpacity
              onPress={() => setOrderDetailVisible(false)}
              style={styles.closeButton}
            >
              <Ionicons name="close" size={24} color={themeColors.text} />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: themeColors.text }]}>Order Details</Text>
            <View style={{ width: 40 }} />
          </View>
          {selectedOrder && (
            <ScrollView style={styles.detailContent}>
              <View style={styles.detailSection}>
                <Text style={[styles.sectionTitle, { color: themeColors.text }]}>Order Information</Text>
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: themeColors.textSecondary }]}>Order ID:</Text>
                  <Text style={[styles.detailValue, { color: themeColors.text }]}>{selectedOrder.id.slice(-8)}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: themeColors.textSecondary }]}>Date:</Text>
                  <Text style={[styles.detailValue, { color: themeColors.text }]}>
                    {format(new Date(selectedOrder.created_at), 'MMMM d, yyyy • h:mm a')}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: themeColors.textSecondary }]}>Status:</Text>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(selectedOrder.status, themeColors) }]}>
                    <Text style={styles.statusText}>{getStatusText(selectedOrder.status)}</Text>
                  </View>
                </View>
              </View>
              <View style={styles.detailSection}>
                <Text style={[styles.sectionTitle, { color: themeColors.text }]}>Buyer Information</Text>
                <View style={[styles.buyerDetail, { backgroundColor: themeColors.inputBackground }]}>
                  <Image
                    source={{
                      uri: selectedOrder.buyer?.avatar_url ||
                      `https://ui-avatars.com/api/?name=${encodeURIComponent(
                        selectedOrder.buyer_name || 'Buyer'
                      )}&background=FF9900&color=fff`
                    }}
                    style={styles.avatar}
                  />
                  <View style={styles.buyerContactInfo}>
                    {/* UPDATED: Use buyer_name */}
                    <Text style={[styles.buyerNameDetail, { color: themeColors.text }]}>
                      {selectedOrder.buyer_name || 'Buyer'}
                    </Text>
                    <Text style={[styles.buyerPhone, { color: themeColors.textSecondary }]}>{selectedOrder.phone_number}</Text>
                    <Text style={[styles.buyerLocation, { color: themeColors.textSecondary }]}>{selectedOrder.location}</Text>
                  </View>
                </View>
                
                {/* Contact Buyer Button in Detail View */}
                <TouchableOpacity
                  style={[styles.contactBuyerButtonDetail, { backgroundColor: themeColors.primary }]}
                  onPress={() => openContactOptions(selectedOrder.phone_number, selectedOrder.buyer_name || 'Buyer', selectedOrder)}
                >
                  <Ionicons name="chatbubble-ellipses-outline" size={22} color="#fff" />
                  <Text style={styles.contactBuyerButtonText}>Contact Buyer</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.detailSection}>
                <Text style={[styles.sectionTitle, { color: themeColors.text }]}>Delivery Information</Text>
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: themeColors.textSecondary }]}>Method:</Text>
                  <Text style={[styles.detailValue, { color: themeColors.text }]}>
                    {getDeliveryText(selectedOrder.delivery_option, selectedOrder.order_items?.[0]?.products?.category === 'Services' || selectedOrder.is_service)}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: themeColors.textSecondary }]}>Location:</Text>
                  <Text style={[styles.detailValue, { color: themeColors.text }]}>{selectedOrder.location}</Text>
                </View>
                {selectedOrder.additional_notes && (
                  <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, { color: themeColors.textSecondary }]}>Notes:</Text>
                    <Text style={[styles.detailValue, { color: themeColors.text }]}>{selectedOrder.additional_notes}</Text>
                  </View>
                )}
              </View>
              <View style={styles.detailSection}>
                <Text style={[styles.sectionTitle, { color: themeColors.text }]}>Order Items</Text>
                {selectedOrder.order_items?.map((item: any, index: number) => (
                  <View key={index} style={[styles.orderItemDetail, { borderBottomColor: themeColors.border }]}>
                    <Image
                      source={{ uri: getOrderItemImage(item) }}
                      style={styles.itemImage}
                    />
                    <View style={styles.itemInfo}>
                      <Text style={[styles.itemTitle, { color: themeColors.text }]}>{item.product_name || item.products?.title}</Text>
                      <Text style={[styles.itemPrice, { color: themeColors.primary }]}>GHS {item.product_price || item.total_price}</Text>
                      <Text style={[styles.itemQuantity, { color: themeColors.textSecondary }]}>Quantity: {item.quantity}</Text>
                      {item.size && <Text style={[styles.itemSize, { color: themeColors.textSecondary }]}>Size: {item.size}</Text>}
                      {item.color && <Text style={[styles.itemColor, { color: themeColors.textSecondary }]}>Color: {item.color}</Text>}
                    </View>
                  </View>
                )) || (
                  <View style={[styles.orderItemDetail, { borderBottomColor: themeColors.border }]}>
                    <Image
                      source={{ uri: selectedOrder.product_image_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedOrder.product_name || 'Product')}&background=FF9900&color=fff` }}
                      style={styles.itemImage}
                    />
                    <View style={styles.itemInfo}>
                      <Text style={[styles.itemTitle, { color: themeColors.text }]}>{selectedOrder.product_name}</Text>
                      <Text style={[styles.itemPrice, { color: themeColors.primary }]}>GHS {selectedOrder.product_price || selectedOrder.total_amount}</Text>
                      <Text style={[styles.itemQuantity, { color: themeColors.textSecondary }]}>Quantity: 1</Text>
                    </View>
                  </View>
                )}
              </View>
              <View style={styles.detailSection}>
                <Text style={[styles.sectionTitle, { color: themeColors.text }]}>Payment Summary</Text>
                <View style={styles.summaryRow}>
                  <Text style={[styles.summaryLabel, { color: themeColors.textSecondary }]}>Subtotal:</Text>
                  <Text style={[styles.summaryValue, { color: themeColors.text }]}>GHS {selectedOrder.total_amount.toFixed(2)}</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={[styles.summaryLabel, { color: themeColors.textSecondary }]}>Delivery Fee:</Text>
                  <Text style={[styles.summaryValue, { color: themeColors.text }]}>GHS 0.00</Text>
                </View>
                <View style={[styles.summaryRow, styles.totalRow, { borderTopColor: themeColors.border }]}>
                  <Text style={[styles.totalLabel, { color: themeColors.text }]}>Total:</Text>
                  <Text style={[styles.totalValue, { color: themeColors.primary }]}>GHS {selectedOrder.total_amount.toFixed(2)}</Text>
                </View>
              </View>
              {selectedOrder.status === 'cancelled' && selectedOrder.cancelled_at && (
                <View style={styles.detailSection}>
                  <Text style={[styles.sectionTitle, { color: themeColors.text }]}>Cancellation Details</Text>
                  <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, { color: themeColors.textSecondary }]}>Cancelled At:</Text>
                    <Text style={[styles.detailValue, { color: themeColors.text }]}>
                      {format(new Date(selectedOrder.cancelled_at), 'MMMM d, yyyy • h:mm a')}
                    </Text>
                  </View>
                  {selectedOrder.cancelled_by && (
                    <View style={styles.detailRow}>
                      <Text style={[styles.detailLabel, { color: themeColors.textSecondary }]}>Cancelled By:</Text>
                      <Text style={[styles.detailValue, { color: themeColors.text }]}>
                        {selectedOrder.cancelled_by === session?.user?.id ? 'You' : 'Buyer'}
                      </Text>
                    </View>
                  )}
                </View>
              )}
              <View style={styles.actionButtonsDetail}>
                {selectedOrder.status === 'pending' && (
                  <>
                    <TouchableOpacity
                      style={[styles.actionButtonLarge, styles.acceptButton]}
                      onPress={() => updateOrderStatus(selectedOrder.id, 'processing')}
                    >
                      <Ionicons name="checkmark-circle" size={20} color="#fff" />
                      <Text style={styles.actionButtonLargeText}>Accept Order</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionButtonLarge, styles.rejectButton]}
                      onPress={() => updateOrderStatus(selectedOrder.id, 'cancelled')}
                    >
                      <Ionicons name="close-circle" size={20} color="#fff" />
                      <Text style={styles.actionButtonLargeText}>Reject Order</Text>
                    </TouchableOpacity>
                  </>
                )}
                
                {selectedOrder.status === 'processing' && (
                  <TouchableOpacity
                    style={[styles.actionButtonLarge, styles.completeButton]}
                    onPress={() => updateOrderStatus(selectedOrder.id, 'completed')}
                  >
                    <Ionicons name="checkmark-done-circle" size={20} color="#fff" />
                    <Text style={styles.actionButtonLargeText}>Mark as Completed</Text>
                  </TouchableOpacity>
                )}
                {selectedOrder.status === 'cancelled' && (
                  <View style={[styles.actionButtonLarge, { backgroundColor: themeColors.statusDefault }]}>
                    <Ionicons name="close-circle" size={20} color="#fff" />
                    <Text style={styles.actionButtonLargeText}>Order Cancelled</Text>
                  </View>
                )}
              </View>
            </ScrollView>
          )}
        </View>
      </SafeAreaView>
    </Modal>
  );

  // Orders Modal
  const renderOrdersModal = () => (
    ordersModalVisible && (
      <View style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 9998,
        backgroundColor: themeColors.modalOverlay,
        justifyContent: 'flex-end',
      }}>
        <SafeAreaView style={[styles.ordersContainer, { backgroundColor: themeColors.background, flex: 1 }]}> 
          <View style={[styles.ordersHeader, { borderBottomColor: themeColors.border }]}> 
            <TouchableOpacity style={styles.closeButton} onPress={() => setOrdersModalVisible(false)}>
              <Ionicons name="close" size={28} color={themeColors.text} />
            </TouchableOpacity>
            <Text style={[styles.ordersTitle, { color: themeColors.text }]}>Orders ({orders.length})</Text>
            {pendingOrdersCount > 0 && (
              <View style={[styles.notificationBadgeHeader, { backgroundColor: themeColors.error }]}> 
                <Text style={styles.notificationTextHeader}>{pendingOrdersCount}</Text>
              </View>
            )}
          </View>
          {ordersLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={themeColors.primary} />
              <Text style={{ marginTop: 10, color: themeColors.textSecondary }}>Loading orders...</Text>
            </View>
          ) : orders.length === 0 ? (
            <View style={styles.emptyStateContainer}>
              <Ionicons name="receipt-outline" size={80} color={themeColors.textTertiary} />
              <Text style={[styles.emptyStateText, { color: themeColors.textSecondary }]}>No orders yet</Text>
              <Text style={{ color: themeColors.textTertiary, marginTop: 8, textAlign: 'center' }}>
                When buyers purchase your products,{"\n"}their orders will appear here
              </Text>
            </View>
          ) : (
            <FlatList
              data={orders}
              keyExtractor={(item) => item.id}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.ordersListContainer}
              renderItem={renderOrderItem}
              refreshControl={
                <RefreshControl
                  refreshing={refreshingOrders}
                  onRefresh={onRefreshOrders}
                  colors={[themeColors.primary]}
                />
              }
            />
          )}
        </SafeAreaView>
      </View>
    )
  );

  // NEW: Color Media Assignment Modal
  const renderColorMediaModal = () => {
    if (!selectedColorForMedia) return null;
    
    const assignedMedia = colorMediaAssignments[selectedColorForMedia] || [];
    
    return (
      <Modal visible={colorMediaModalVisible} animationType="slide" transparent>
        <SafeAreaView style={[styles.colorMediaOverlay, { backgroundColor: themeColors.modalOverlay }]}>
          <View style={[styles.colorMediaContainer, { backgroundColor: themeColors.card }]}>
            <View style={[styles.colorMediaHeader, { borderBottomColor: themeColors.border }]}>
              <Text style={[styles.colorMediaTitle, { color: themeColors.text }]}>
                Assign Media to "{selectedColorForMedia}"
              </Text>
              <TouchableOpacity onPress={() => setColorMediaModalVisible(false)}>
                <Ionicons name="close" size={24} color={themeColors.text} />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.colorMediaContent}>
              <Text style={[styles.colorMediaDescription, { color: themeColors.textSecondary }]}>
                Select which media (images/videos) should be shown when customers select "{selectedColorForMedia}" color.
              </Text>
              
              <View style={styles.mediaSelectionGrid}>
                {selectedMedia.map((media, index) => {
                  const isAssigned = assignedMedia.includes(media.uri);
                  
                  return (
                    <TouchableOpacity
                      key={index}
                      style={[
                        styles.mediaSelectItem,
                        { borderColor: themeColors.border },
                        isAssigned && [styles.mediaSelectItemSelected, { borderColor: themeColors.primary }]
                      ]}
                      onPress={() => {
                        const newAssignments = { ...colorMediaAssignments };
                        if (isAssigned) {
                          // Remove from assignments
                          newAssignments[selectedColorForMedia] = assignedMedia.filter(url => url !== media.uri);
                        } else {
                          // Add to assignments
                          newAssignments[selectedColorForMedia] = [...assignedMedia, media.uri];
                        }
                        setColorMediaAssignments(newAssignments);
                      }}
                    >
                      {media.type === 'video' ? (
                        <ResponsiveVideo
                          uri={media.uri}
                          autoPlay={false}
                          controls={false}
                          containerStyle={[styles.mediaSelectThumbnail, { borderRadius: 12 }]}
                        />
                      ) : (
                        <Image
                          source={{ uri: media.uri }}
                          style={styles.mediaSelectThumbnail}
                          resizeMode="cover"
                        />
                      )}
                      
                      {media.type === 'video' && (
                        <View style={styles.videoIndicator}>
                          <Ionicons name="videocam" size={12} color="#fff" />
                        </View>
                      )}
                      
                      {isAssigned && (
                        <View style={styles.selectedCheckmark}>
                          <Ionicons name="checkmark-circle" size={24} color={themeColors.primary} />
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
              
              <Text style={[styles.assignedCount, { color: themeColors.textSecondary }]}>
                {assignedMedia.length} media assigned to {selectedColorForMedia}
              </Text>
            </ScrollView>
            
            <View style={[styles.colorMediaFooter, { borderTopColor: themeColors.border }]}>
              <TouchableOpacity
                style={[styles.colorMediaDoneButton, { backgroundColor: themeColors.primary }]}
                onPress={() => setColorMediaModalVisible(false)}
              >
                <Text style={styles.colorMediaDoneText}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      </Modal>
    );
  };

  // Action Sheet Modal
  const renderActionSheet = () => (
    <Modal visible={actionSheetVisible} transparent animationType="slide" onRequestClose={() => setActionSheetVisible(false)}>
      <TouchableOpacity style={[styles.actionSheetOverlay, { backgroundColor: themeColors.modalOverlay }]} activeOpacity={1} onPress={() => setActionSheetVisible(false)}>
        <View style={[styles.actionSheetContainer, { backgroundColor: themeColors.card }]}>
          <TouchableOpacity style={styles.actionSheetButton} onPress={() => { setActionSheetVisible(false); selectedProduct && openAddProduct(selectedProduct); }}>
            <Ionicons name="pencil-outline" size={22} color={themeColors.text} />
            <Text style={[styles.actionSheetButtonText, { color: themeColors.text }]}>Edit Product</Text>
          </TouchableOpacity>
          <View style={[styles.actionSheetDivider, { backgroundColor: themeColors.border }]} />
          <TouchableOpacity style={[styles.actionSheetButton, styles.deleteButtonAction]} onPress={() => { setActionSheetVisible(false); selectedProduct && confirmDeleteProduct(); }}>
            <Ionicons name="trash-outline" size={22} color={themeColors.error} />
            <Text style={[styles.actionSheetButtonText, styles.deleteText, { color: themeColors.error }]}>Delete Product</Text>
          </TouchableOpacity>
          <View style={[styles.actionSheetDivider, { backgroundColor: themeColors.border }]} />
          <TouchableOpacity style={[styles.actionSheetCancelButton, { backgroundColor: themeColors.inputBackground }]} onPress={() => { setActionSheetVisible(false); setSelectedProduct(null); }}>
            <Text style={[styles.actionSheetCancelText, { color: themeColors.info }]}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );

  // Product Detail Modal - UPDATED WITH COLOR-MEDIA NAVIGATION
  const renderProductDetailModal = () => {
    if (!selectedProductDetail) return null;
    
    const hasSizes = selectedProductDetail.sizes_available?.length > 0;
    const sizeStock = selectedProductDetail.size_stock || {};
    const colorStock = selectedProductDetail.color_stock || {};
    const hasColors = selectedProductDetail.colors_available?.length > 0;
    const colorMedia = selectedProductDetail.color_media || {};
    
    // Desktop responsiveness - match search page style
    const isLargeScreen = width >= 768;
    const maxModalWidth = isLargeScreen ? Math.min(width * 0.8, 800) : '100%';
    const mediaWidth = isLargeScreen ? Math.min(width * 0.6, 600) : width * 0.9;
    const mediaHeight = mediaWidth * 0.7;
    
    // Calculate total stock based on available stock types
    const totalStock = () => {
      if (hasSizes) {
        return Object.values(sizeStock).reduce((sum: any, val: any) => sum + (parseInt(val) || 0), 0);
      } else if (hasColors) {
        return Object.values(colorStock).reduce((sum: any, val: any) => sum + (parseInt(val) || 0), 0);
      } else {
        return selectedProductDetail.quantity || 0;
      }
    };
    
    const availableStock = Math.max(totalStock(), 0);
    
    return (
      <Modal visible={productDetailModal} animationType="slide" presentationStyle={isDesktop ? "formSheet" : "pageSheet"} onRequestClose={() => setProductDetailModal(false)}>
        <SafeAreaView style={[styles.productDetailContainer, { backgroundColor: themeColors.background }]}>
          <View style={[styles.productDetailHeader, { borderBottomColor: themeColors.border }]}>
            <TouchableOpacity style={styles.closeButton} onPress={() => setProductDetailModal(false)}>
              <Ionicons name="close" size={28} color={themeColors.text} />
            </TouchableOpacity>
            <Text style={[styles.productDetailTitle, { color: themeColors.text }]}>Product Details</Text>
            <View style={{ width: 28 }} />
          </View>
          <ScrollView style={styles.productDetailContent} showsVerticalScrollIndicator={false} contentContainerStyle={isLargeScreen ? { alignItems: 'center' } : {}}>
            {/* Media Gallery Section - UPDATED TO SHOW COLOR-SPECIFIC MEDIA */}
            <View style={styles.mediaGalleryContainer}>
              {isVideoUrl(selectedProductDetail.media_urls?.[currentMediaIndex]) ? (
                <TouchableOpacity 
                  style={[
                    styles.mainMedia, 
                    { 
                      backgroundColor: '#000', 
                      justifyContent: 'center', 
                      alignItems: 'center',
                      width: isLargeScreen ? mediaWidth : '100%',
                      height: isLargeScreen ? mediaHeight : 350,
                    }
                  ]}
                  activeOpacity={0.9}
                  onPress={() => { 
                    setFullViewerMediaUrls(selectedProductDetail.media_urls || []);
                    setFullViewerIndex(currentMediaIndex); 
                    setFullViewerVisible(true); 
                  }}
                >
                  {/* Video for display */}
                  <ResponsiveVideo
                    uri={formatProductMediaUrl(selectedProductDetail.media_urls?.[currentMediaIndex]) || ''}
                    autoPlay={false}
                    controls
                    containerStyle={{ width: '100%', height: '100%', borderRadius: 16 }}
                  />
                  
                  {/* Play Button Overlay */}
                  <View 
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      justifyContent: 'center',
                      alignItems: 'center',
                      backgroundColor: 'rgba(0,0,0,0.3)'
                    }}
                  >
                    <View style={{
                      backgroundColor: 'rgba(255,255,255,0.95)',
                      width: 70,
                      height: 70,
                      borderRadius: 35,
                      justifyContent: 'center',
                      alignItems: 'center',
                      shadowColor: '#000',
                      shadowOffset: { width: 0, height: 4 },
                      shadowOpacity: 0.4,
                      shadowRadius: 6,
                      elevation: 8
                    }}>
                      <Ionicons name="play" size={32} color={themeColors.primary} />
                    </View>
                  </View>
                  
                  {/* Video Badge */}
                  <View style={{
                    position: 'absolute',
                    top: 12,
                    right: 12,
                    backgroundColor: 'rgba(0,0,0,0.75)',
                    paddingHorizontal: 10,
                    paddingVertical: 6,
                    borderRadius: 6,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6
                  }}>
                    <Ionicons name="videocam" size={14} color="#fff" />
                    <Text style={{ color: '#fff', fontSize: 11, fontWeight: '600' }}>VIDEO</Text>
                  </View>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  activeOpacity={0.9}
                  onPress={() => { 
                    setFullViewerMediaUrls(selectedProductDetail.media_urls || []);
                    setFullViewerIndex(currentMediaIndex); 
                    setFullViewerVisible(true); 
                  }}
                  style={isLargeScreen ? { width: mediaWidth, height: mediaHeight } : { width: '100%', height: 350 }}
                >
                  <Image
                    source={{ uri: formatProductMediaUrl(selectedProductDetail.media_urls?.[currentMediaIndex]) }}
                    style={styles.mainMedia}
                    resizeMode="contain"
                  />
                </TouchableOpacity>
              )}
              
              {/* Color Selection for Media - UPDATED: Added color press navigation */}
              {selectedProductDetail.colors_available?.length > 0 && (
                <View style={styles.colorMediaSelector}>
                  <Text style={[styles.colorMediaSelectorTitle, { color: themeColors.text }]}>
                    View media by color:
                  </Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.colorChipsHorizontal}>
                    {selectedProductDetail.colors_available.map((color: string, index: number) => {
                      const colorSpecificMedia = colorMedia[color] || [];
                      const hasColorMedia = colorSpecificMedia.length > 0;
                      const colorQty = colorStock[color] || 0;
                      const isOutOfStock = parseInt(colorQty) === 0;
                      const colorMediaIndices = getMediaIndicesForColor(color, selectedProductDetail);
                      
                      return (
                        <TouchableOpacity
                          key={index}
                          style={[
                            styles.colorChipMedia,
                            { backgroundColor: themeColors.inputBackground },
                            hasColorMedia && [styles.colorChipMediaHasMedia, { borderColor: themeColors.primary }],
                            isOutOfStock && { backgroundColor: themeColors.errorLight }
                          ]}
                          onPress={() => {
                            if (hasColorMedia && colorMediaIndices.length > 0) {
                              // Show the first media for this color
                              setCurrentMediaIndex(colorMediaIndices[0]);
                            } else {
                              // If no specific media, show first media
                              setCurrentMediaIndex(0);
                            }
                          }}
                        >
                          <Text style={[
                            styles.colorChipMediaText,
                            { color: themeColors.text },
                            hasColorMedia && [styles.colorChipMediaTextActive, { color: themeColors.primary }],
                            isOutOfStock && { color: themeColors.error }
                          ]}>
                            {color}
                            {hasColorMedia && <Text style={styles.colorMediaCount}> • {colorSpecificMedia.length}</Text>}
                          </Text>
                          {hasColorMedia && (
                            <Ionicons name="images" size={14} color={isOutOfStock ? themeColors.error : themeColors.primary} />
                          )}
                          {isOutOfStock && (
                            <Ionicons name="close-circle" size={14} color={themeColors.error} />
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>
              )}
              
              {/* Media Thumbnails */}
              {selectedProductDetail.media_urls?.length > 1 && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.thumbnailScroll}>
                  {selectedProductDetail.media_urls.map((url: string, index: number) => {
                    // Check which color this media belongs to
                    const colorForMedia = Object.keys(colorMedia).find(color => 
                      colorMedia[color]?.includes(url)
                    );
                    const isActive = index === currentMediaIndex;
                    
                    return (
                      <TouchableOpacity
                        key={index}
                        style={[
                          styles.thumbnailContainer,
                          isActive && [styles.activeThumbnail, { borderColor: themeColors.primary }],
                          colorForMedia && [styles.thumbnailWithColor, { borderColor: colorForMedia ? themeColors.primary : themeColors.border }]
                        ]}
                        onPress={() => setCurrentMediaIndex(index)}
                      >
                        {isVideoUrl(url) ? (
                          <View style={styles.videoThumbnailWrapper}>
                            <ResponsiveVideo
                              uri={formatProductMediaUrl(url) || ''}
                              autoPlay={false}
                              controls={false}
                              containerStyle={[styles.thumbnailImage, { borderRadius: 10 }]}
                            />
                            <View style={styles.videoOverlay}>
                              <Ionicons name="play" size={16} color="#fff" />
                            </View>
                          </View>
                        ) : (
                          <Image source={{ uri: formatProductMediaUrl(url) }} style={styles.thumbnailImage} resizeMode="cover" />
                        )}
                        
                        {colorForMedia && (
                          <View style={[styles.colorIndicator, { backgroundColor: isActive ? themeColors.primary : themeColors.textSecondary }]}>
                            <Text style={styles.colorIndicatorText}>{colorForMedia.charAt(0)}</Text>
                          </View>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              )}
            </View>

            {/* Product Info Section */}
            <View style={[styles.productInfoCard, { backgroundColor: themeColors.card }]}>
              <View style={styles.productHeader}>
                <Text style={[styles.productTitle, { color: themeColors.text }]}>{selectedProductDetail.title}</Text>
                <View style={styles.priceContainer}>
                  <Text style={[styles.sellingPrice, { color: themeColors.text }]}>GHS {selectedProductDetail.price}</Text>
                  {selectedProductDetail.original_price > selectedProductDetail.price && (
                    <>
                      <Text style={[styles.originalPrice, { color: themeColors.textTertiary }]}>
                        GHS {selectedProductDetail.original_price}
                      </Text>
                      <View style={[styles.discountBadge, { backgroundColor: themeColors.error }]}>
                        <Text style={styles.discountText}>
                          -{Math.round(((selectedProductDetail.original_price - selectedProductDetail.price) / selectedProductDetail.original_price) * 100)}%
                        </Text>
                      </View>
                    </>
                  )}
                </View>
              </View>

              {/* Stock Information */}
              {selectedProductDetail.category !== 'Services' && (
                <View style={[styles.stockCard, { backgroundColor: availableStock > 0 ? themeColors.inputBackground : themeColors.errorLight }]}>
                  <View style={styles.stockHeader}>
                    <Ionicons name="cube-outline" size={20} color={availableStock > 0 ? themeColors.primary : themeColors.error} />
                    <Text style={[styles.stockTitle, { color: availableStock > 0 ? themeColors.text : themeColors.error }]}>
                      Stock Information
                    </Text>
                  </View>
                  <View style={styles.stockDetails}>
                    <View style={styles.stockItem}>
                      <Text style={[styles.stockLabel, { color: availableStock > 0 ? themeColors.textSecondary : themeColors.error }]}>
                        Total Available:
                      </Text>
                      <Text style={[
                        styles.stockValue, 
                        { 
                          color: availableStock > 0 ? themeColors.primary : themeColors.error, 
                          fontWeight: 'bold' 
                        }
                      ]}>
                        {availableStock > 0 ? `${availableStock} ${availableStock === 1 ? 'unit' : 'units'}` : 'Out of stock'}
                      </Text>
                    </View>
                  </View>
                </View>
              )}

              {/* Category & Details */}
              <View style={styles.detailsSection}>
                <View style={[styles.detailItem, { borderBottomColor: themeColors.border }]}>
                  <Text style={[styles.detailLabel, { color: themeColors.textSecondary }]}>Category</Text>
                  <Text style={[styles.detailValue, { color: themeColors.text }]}>
                    {selectedProductDetail.category}{selectedProductDetail.sub_category ? ` • ${selectedProductDetail.sub_category}` : ''}
                  </Text>
                </View>
                
                {selectedProductDetail.brand && (
                  <View style={[styles.detailItem, { borderBottomColor: themeColors.border }]}>
                    <Text style={[styles.detailLabel, { color: themeColors.textSecondary }]}>Brand</Text>
                    <Text style={[styles.detailValue, { color: themeColors.text }]}>{selectedProductDetail.brand}</Text>
                  </View>
                )}
                
                {selectedProductDetail.gender && selectedProductDetail.category !== 'Services' && (
                  <View style={[styles.detailItem, { borderBottomColor: themeColors.border }]}>
                    <Text style={[styles.detailLabel, { color: themeColors.textSecondary }]}>For</Text>
                    <Text style={[styles.detailValue, { color: themeColors.text }]}>{selectedProductDetail.gender}</Text>
                  </View>
                )}
              </View>

              {/* Size Information */}
              {hasSizes && (
                <View style={[styles.sizeSection, { backgroundColor: themeColors.inputBackground }]}>
                  <View style={styles.sectionHeader}>
                    <Ionicons name="resize-outline" size={20} color={themeColors.primary} />
                    <Text style={[styles.sectionTitle, { color: themeColors.text }]}>Available Sizes & Quantities</Text>
                  </View>
                  <View style={styles.sizeGrid}>
                    {selectedProductDetail.sizes_available.map((size: string, index: number) => {
                      const sizeQty = sizeStock[size] || 0;
                      return (
                        <View key={index} style={[styles.sizeItem, { backgroundColor: themeColors.card }]}>
                          <Text style={[styles.sizeLabel, { color: themeColors.text }]}>{size}</Text>
                          <View style={[styles.sizeQtyBadge, { backgroundColor: sizeQty > 0 ? themeColors.success : themeColors.error }]}>
                            <Text style={styles.sizeQtyText}>
                              {sizeQty > 0 ? `${sizeQty} available` : 'Out of stock'}
                            </Text>
                          </View>
                        </View>
                      );
                    })}
                  </View>
                </View>
              )}

              {/* Colors with Quantity - UPDATED TO SHOW QUANTITY AND MEDIA NAVIGATION */}
              {selectedProductDetail.colors_available?.length > 0 && selectedProductDetail.category !== 'Services' && (
                <View style={[styles.colorSection, { backgroundColor: themeColors.inputBackground }]}>
                  <View style={styles.sectionHeader}>
                    <Ionicons name="color-palette-outline" size={20} color={themeColors.primary} />
                    <Text style={[styles.sectionTitle, { color: themeColors.text }]}>Available Colors & Quantities</Text>
                  </View>
                  <View style={styles.colorChips}>
                    {selectedProductDetail.colors_available.map((color: string, index: number) => {
                      const colorSpecificMedia = colorMedia[color] || [];
                      const hasColorMedia = colorSpecificMedia.length > 0;
                      const colorQty = colorStock[color] || 0;
                      const isOutOfStock = parseInt(colorQty) === 0;
                      const colorMediaIndices = getMediaIndicesForColor(color, selectedProductDetail);
                      
                      return (
                        <TouchableOpacity
                          key={index}
                          style={[
                            styles.colorChipWithQty,
                            { backgroundColor: themeColors.card },
                            isOutOfStock && { backgroundColor: themeColors.errorLight }
                          ]}
                          onPress={() => {
                            if (hasColorMedia && colorMediaIndices.length > 0) {
                              // Show the first media for this color
                              setCurrentMediaIndex(colorMediaIndices[0]);
                            } else {
                              // If no specific media, show first media
                              setCurrentMediaIndex(0);
                            }
                          }}
                        >
                          <View style={styles.colorChipHeader}>
                            <Text style={[
                              styles.colorText,
                              { color: themeColors.text },
                              isOutOfStock && { color: themeColors.error }
                            ]}>
                              {color}
                            </Text>
                            
                            {/* Quantity Badge */}
                            <View style={[
                              styles.colorQtyBadge,
                              { backgroundColor: isOutOfStock ? themeColors.error : themeColors.primary }
                            ]}>
                              <Text style={styles.colorQtyText}>
                                {isOutOfStock ? 'Out of stock' : `${colorQty} available`}
                              </Text>
                            </View>
                          </View>
                          
                          {hasColorMedia && (
                            <View style={[styles.colorMediaInfo, { backgroundColor: isOutOfStock ? themeColors.error + '20' : themeColors.primary + '20' }]}>
                              <Ionicons name="images" size={12} color={isOutOfStock ? themeColors.error : themeColors.primary} />
                              <Text style={[
                                styles.colorMediaCountBadge,
                                { color: isOutOfStock ? themeColors.error : themeColors.primary }
                              ]}>
                                {colorSpecificMedia.length}
                              </Text>
                            </View>
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              )}

              {/* Delivery Information */}
              <View style={[styles.deliverySection, { backgroundColor: themeColors.inputBackground }]}>
                <View style={styles.sectionHeader}>
                  <Ionicons name="car-outline" size={20} color={themeColors.primary} />
                  <Text style={[styles.sectionTitle, { color: themeColors.text }]}>Delivery Options</Text>
                </View>
                <View style={[styles.deliveryOption, { backgroundColor: themeColors.card }]}>
                  <Ionicons 
                    name={
                      selectedProductDetail.delivery_option === 'Meetup / Pickup' || selectedProductDetail.delivery_option === 'pickup' ? 'location-outline' : 
                      selectedProductDetail.delivery_option === 'Campus Delivery' || selectedProductDetail.delivery_option === 'campus delivery' ? 'school-outline' :
                      selectedProductDetail.delivery_option === 'Both' || selectedProductDetail.delivery_option === 'both' ? 'options-outline' :
                      selectedProductDetail.delivery_option === 'Remote' || selectedProductDetail.delivery_option === 'remote' ? 'laptop-outline' :
                      selectedProductDetail.delivery_option === 'On-site' || selectedProductDetail.delivery_option === 'on-site' ? 'home-outline' : 'checkmark-circle-outline'
                    }
                    size={24} 
                    color={themeColors.primary} 
                  />
                  <View style={styles.deliveryInfo}>
                    <Text style={[styles.deliveryTitle, { color: themeColors.text }]}>
                      {getDeliveryText(selectedProductDetail.delivery_option, selectedProductDetail.category === 'Services')}
                    </Text>
                    <Text style={[styles.deliveryDescription, { color: themeColors.textSecondary }]}>
                      {selectedProductDetail.category === 'Services' 
                        ? (selectedProductDetail.delivery_option === 'Both' || selectedProductDetail.delivery_option === 'both')
                          ? 'Available for both remote and on-site service'
                          : (selectedProductDetail.delivery_option === 'Meetup / Pickup' || selectedProductDetail.delivery_option === 'pickup')
                          ? 'Meetup at agreed location'
                          : 'Service provided as specified'
                        : (selectedProductDetail.delivery_option === 'Both' || selectedProductDetail.delivery_option === 'both')
                        ? 'Available for both meetup/pickup and campus delivery'
                        : 'Standard delivery option'}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Product Availability - Pre-Order/Stock Information */}
              {selectedProductDetail.category !== 'Services' && (
                <View style={[styles.availabilitySection, { backgroundColor: themeColors.inputBackground }]}>
                  <View style={styles.sectionHeader}>
                    <Ionicons 
                      name={selectedProductDetail.is_pre_order ? 'time-outline' : 'checkmark-circle-outline'} 
                      size={20} 
                      color={themeColors.primary} 
                    />
                    <Text style={[styles.sectionTitle, { color: themeColors.text }]}>Product Availability</Text>
                  </View>
                  <View style={[styles.availabilityOption, { backgroundColor: themeColors.card }]}>
                    <Ionicons 
                      name={selectedProductDetail.is_pre_order ? 'time-outline' : 'checkmark-circle-outline'} 
                      size={24} 
                      color={selectedProductDetail.is_pre_order ? themeColors.warning : themeColors.success} 
                    />
                    <View style={styles.availabilityInfo}>
                      <Text style={[styles.availabilityTitle, { color: themeColors.text }]}>
                        {selectedProductDetail.is_pre_order ? 'Pre-Order' : 'In Stock'}
                      </Text>
                      <Text style={[styles.availabilityDescription, { color: themeColors.textSecondary }]}>
                        {selectedProductDetail.is_pre_order 
                          ? `Arrives in ${selectedProductDetail.pre_order_duration} ${selectedProductDetail.pre_order_duration_unit}`
                          : 'Available for immediate delivery'}
                      </Text>
                    </View>
                  </View>
                </View>
              )}

              {/* Description */}
              {selectedProductDetail.description && (
                <View style={[styles.descriptionSection, { backgroundColor: themeColors.inputBackground }]}>
                  <View style={styles.sectionHeader}>
                    <Ionicons name="document-text-outline" size={20} color={themeColors.primary} />
                    <Text style={[styles.sectionTitle, { color: themeColors.text }]}>Description</Text>
                  </View>
                  <Text style={[styles.descriptionText, { color: themeColors.text }]}>
                    {selectedProductDetail.description}
                  </Text>
                </View>
              )}

              {/* Action Buttons */}
              <View style={styles.actionButtonsContainer}>
                <TouchableOpacity 
                  style={[styles.actionButton, styles.editButton, { backgroundColor: themeColors.primary }]}
                  onPress={() => { 
                    setProductDetailModal(false); 
                    setTimeout(() => openAddProduct(selectedProductDetail), 300); 
                  }}
                >
                  <Ionicons name="pencil-outline" size={20} color="#fff" />
                  <Text style={styles.actionButtonText}>Edit Product</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.actionButton, styles.deleteButton, { backgroundColor: themeColors.error }]}
                  onPress={() => { 
                    setProductDetailModal(false); 
                    setTimeout(() => { 
                      setSelectedProduct(selectedProductDetail); 
                      confirmDeleteProduct(); 
                    }, 300); 
                  }}
                >
                  <Ionicons name="trash-outline" size={20} color="#fff" />
                  <Text style={styles.actionButtonText}>Delete Product</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    );
  };

  // PRODUCTS LIST COMPONENT
  const ProductsList = React.memo(({ sellerId, refreshTrigger }: { sellerId: string; refreshTrigger: number }) => {
    const colorScheme = useColorScheme();
    const themeColors = colorScheme === 'dark' ? darkColors : lightColors;
    const [products, setProducts] = useState<any[]>([]);
    const [loadingList, setLoadingList] = useState(true);
    const [viewMode, setViewMode] = useState<'grid' | 'feed'>('grid'); // Toggle between grid and full-screen feed
    const videoRefs = useRef<{ [key: string]: any }>({});
    const [currentlyPlayingId, setCurrentlyPlayingId] = useState<string | null>(null);

    const loadProducts = useCallback(async () => {
      if (!sellerId) return;
      try {
        setLoadingList(true);
        const { data, error } = await supabase.from('products').select('*').eq('seller_id', sellerId).order('created_at', { ascending: false });
        if (error) throw error;
        setProducts(data || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingList(false);
      }
    }, [sellerId]);

    useEffect(() => { loadProducts(); }, [loadProducts, refreshTrigger]);
    useFocusEffect(useCallback(() => { loadProducts(); }, [loadProducts]));

    // Video feed viewability handler
    const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
      if (!viewableItems.length || viewMode !== 'feed') return;
     
      // Pause all videos first
      Object.values(videoRefs.current).forEach(v => {
        if (v && typeof v.pauseAsync === 'function') {
          v.pauseAsync();
        }
      });
     
      const visibleItem = viewableItems[0]?.item;
      const isVideoItem = visibleItem?.media_urls?.[0]?.includes('.mp4');
      
      if (isVideoItem && videoRefs.current[visibleItem.id]) {
        try {
          // Restart video from beginning when returning to it
          const videoRef = videoRefs.current[visibleItem.id];
          videoRef.setPositionAsync(0).then(() => {
            videoRef.playAsync();
          }).catch(() => {
            videoRef.playAsync();
          });
          setCurrentlyPlayingId(visibleItem.id);
        } catch (error) {
          console.error('Error playing video:', error);
        }
      } else {
        setCurrentlyPlayingId(null);
      }
    }).current;

    const viewabilityConfig = useRef({
      itemVisiblePercentThreshold: 70,
      minimumViewTime: 300,
    }).current;

    if (loadingList) return <View style={{ padding: 50, alignItems: 'center' }}><ActivityIndicator size="large" color={themeColors.primary} /></View>;

    if (products.length === 0) return (
      <View style={styles.emptyStateContainer}>
        <Ionicons name="storefront-outline" size={80} color={themeColors.textTertiary} />
        <Text style={[styles.emptyStateText, { color: themeColors.textSecondary }]}>No products yet</Text>
        <Text style={{ color: themeColors.textTertiary, marginTop: 8 }}>Tap "+ Add Product" to start selling!</Text>
      </View>
    );

    // Check if there are video products
    const hasVideos = products.some(p => p.media_urls?.[0]?.includes('.mp4'));

    const renderProductItem = ({ item }: { item: any }) => {
      // FIX: Find first non-video image, or use video if all media are videos
      const cover = item.media_urls?.find((url: string) => !url.includes('.mp4')) || item.media_urls?.[0];
      const hasDiscount = item.original_price && item.original_price > item.price;
      const discount = hasDiscount ? Math.round(((item.original_price - item.price) / item.original_price) * 100) : null;
      
      // Calculate total stock
      const totalStock = () => {
        if (item.sizes_available?.length > 0) {
          const sizeStock = item.size_stock || {};
          return Object.values(sizeStock).reduce((sum: any, val: any) => sum + (parseInt(val) || 0), 0);
        } else if (item.colors_available?.length > 0) {
          const colorStock = item.color_stock || {};
          return Object.values(colorStock).reduce((sum: any, val: any) => sum + (parseInt(val) || 0), 0);
        } else {
          return item.quantity || 0;
        }
      };
      
      const stock = totalStock();
      const isServiceItem = item.category === 'Services';
      const isOutOfStock = stock <= 0 && !isServiceItem;

      return (
        <TouchableOpacity 
          style={[
            styles.productListItem, 
            { backgroundColor: themeColors.card },
            isOutOfStock && { opacity: 0.7 }
          ]} 
          onPress={() => { setSelectedProductDetail(item); setCurrentMediaIndex(0); setProductDetailModal(true); }}
        >
          <View style={styles.productListContent}>
            {isServiceItem && (
              <View style={styles.serviceBadge}>
                <Ionicons name="construct-outline" size={12} color="#fff" />
                <Text style={styles.serviceBadgeText}>Service</Text>
              </View>
            )}
            
            {isOutOfStock && (
              <View style={styles.outOfStockOverlay}>
                <Text style={styles.outOfStockText}>Out of Stock</Text>
              </View>
            )}
            
            {cover ? (cover.includes('.mp4') ? (
              <View style={styles.productImageContainer}>
                <ResponsiveVideo
                  uri={cover}
                  autoPlay={false}
                  controls
                  containerStyle={[styles.productListImage, { borderRadius: 16 }]}
                />
                <View style={styles.playIcon}><Ionicons name="play-circle" size={40} color="#fff" /></View>
              </View>
            ) : (
              <Image source={{ uri: cover }} style={styles.productListImage} />
            )) : (
              <View style={[styles.productListImage, styles.noImagePlaceholder, { backgroundColor: themeColors.inputBackground }]}><Ionicons name="image-outline" size={40} color={themeColors.textTertiary} /></View>
            )}
       
            <View style={styles.productListInfo}>
              <Text style={[styles.productListTitle, { color: themeColors.text }]} numberOfLines={2}>{item.title}</Text>
              <View style={styles.productListPriceRow}>
                <Text style={[styles.productListPrice, { color: themeColors.text }]}>GHS {item.price}</Text>
                {hasDiscount && <>
                  <Text style={[styles.productListOriginalPrice, { color: themeColors.textTertiary }]}>GHS {item.original_price}</Text>
                  <View style={[styles.productListDiscountTag, { backgroundColor: themeColors.error }]}><Text style={styles.productListDiscountText}>-{discount}%</Text></View>
                </>}
              </View>
              
              <Text style={[styles.productListCategory, { color: themeColors.textSecondary }]}>{item.category}{item.sub_category ? ` • ${item.sub_category}` : ''}</Text>
              
              {/* Display color quantities if available */}
              {item.colors_available && !isServiceItem && (
                <View style={styles.colorQuantityDisplay}>
                  <Text style={[styles.productListColors, { color: themeColors.textSecondary }]}>
                    Colors: {item.colors_available.slice(0, 2).map(color => {
                      const colorQty = item.color_stock?.[color] || 0;
                      const isColorOutOfStock = parseInt(colorQty) === 0;
                      return (
                        <Text key={color} style={[isColorOutOfStock && { color: themeColors.error }]}>
                          {color} ({colorQty}){item.colors_available.indexOf(color) < Math.min(1, item.colors_available.length - 1) ? ', ' : ''}
                        </Text>
                      );
                    })}
                    {item.colors_available.length > 2 && ` +${item.colors_available.length - 2} more`}
                  </Text>
                </View>
              )}
              
              {/* Stock Status */}
              {!isServiceItem && (
                <Text style={[
                  styles.stockStatusText,
                  { color: isOutOfStock ? themeColors.error : themeColors.success }
                ]}>
                  {isOutOfStock ? 'Out of stock' : `${stock} available`}
                </Text>
              )}
              
              {isServiceItem && (
                <Text style={[styles.serviceDeliveryText, { color: themeColors.textSecondary }]}>
                  {getDeliveryText(item.delivery_option, true)}
                </Text>
              )}
            </View>
          </View>
          <TouchableOpacity style={styles.productListMenuButton} onPress={(e) => { e.stopPropagation(); setSelectedProduct(item); setActionSheetVisible(true); }}>
            <Ionicons name="ellipsis-vertical" size={20} color={themeColors.textSecondary} />
          </TouchableOpacity>
        </TouchableOpacity>
      );
    };

    // Feed Item Component - extracted to avoid hooks in render function
    const FeedItemComponent = ({ item, index }: { item: any; index: number }) => {
      const [isPlaying, setIsPlaying] = useState(currentlyPlayingId === item.id);
      const [isBuffering, setIsBuffering] = useState(false);
      const localVideoRef = useRef<any>(null);
      const isVideoItem = item.media_urls?.[0]?.includes('.mp4');

      // Update playing state when currentlyPlayingId changes
      useEffect(() => {
        setIsPlaying(currentlyPlayingId === item.id);
      }, [currentlyPlayingId, item.id]);

      // Prepare video URI with proper formatting
      const videoUri = item.media_urls?.[0] 
        ? (item.media_urls[0].startsWith('http') 
            ? item.media_urls[0] 
            : `${SUPABASE_URL}/storage/v1/object/public/products/${item.media_urls[0]}`)
        : null;

      return (
        <View style={{ height, width, backgroundColor: themeColors.background }}>
          <TouchableOpacity 
            activeOpacity={1} 
            style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
            onPress={async () => {
              if (!isVideoItem) return;
              try {
                if (localVideoRef.current && typeof localVideoRef.current.getStatusAsync === 'function') {
                  const status: any = await localVideoRef.current.getStatusAsync();
                  if (status.isPlaying) {
                    await localVideoRef.current.pauseAsync();
                    setIsPlaying(false);
                  } else {
                    await localVideoRef.current.playAsync();
                    setIsPlaying(true);
                  }
                }
              } catch (e) {
                // ignore
              }
            }}
          >
            {isVideoItem ? (
              <View style={{ flex: 1, backgroundColor: '#000', width: '100%' }}>
                <View style={{ width: '100%', flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                  {videoUri && (
                    <Video
                      source={{ uri: videoUri }}
                      style={{ width: '100%', height: '100%' }}
                      resizeMode={ResizeMode.CONTAIN}
                      isLooping
                      shouldPlay={isPlaying}
                      useNativeControls={false}
                      ref={(ref: any) => { 
                        localVideoRef.current = ref; 
                        if (ref) videoRefs.current[item.id] = ref;
                        else delete videoRefs.current[item.id];
                      }}
                      onPlaybackStatusUpdate={(status: any) => {
                        setIsBuffering(!!status.isBuffering);
                        setIsPlaying(!!status.isPlaying);
                      }}
                      progressUpdateIntervalMillis={500}
                    />
                  )}

                  {isBuffering && (
                    <View style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, justifyContent: 'center', alignItems: 'center' }}>
                      <ActivityIndicator size="large" color={themeColors.primary} />
                    </View>
                  )}

                  {!isPlaying && !isBuffering && (
                    <View style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, justifyContent: 'center', alignItems: 'center' }} pointerEvents="none">
                      <View style={{
                        width: 80,
                        height: 80,
                        borderRadius: 40,
                        backgroundColor: 'rgba(255, 255, 255, 0.9)',
                        justifyContent: 'center',
                        alignItems: 'center',
                      }}>
                        <Ionicons name="play" size={34} color={themeColors.primary} />
                      </View>
                    </View>
                  )}
                </View>
              </View>
            ) : (
              <Image
                source={{ uri: item.media_urls?.[0] || 'https://via.placeholder.com/400' }}
                style={{ width: '100%', height: '100%' }}
                resizeMode="contain"
              />
            )}
          </TouchableOpacity>

          {/* Product Info Overlay */}
          <View style={{
            position: 'absolute',
            bottom: 20,
            left: 20,
            right: 20,
            backgroundColor: `${themeColors.background}E6`,
            borderRadius: 16,
            padding: 16,
            borderWidth: 1,
            borderColor: themeColors.border,
          }}>
            <Text style={{ color: themeColors.text, fontSize: 18, fontWeight: 'bold' }} numberOfLines={2}>
              {item.title}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
              <Text style={{ color: themeColors.text, fontSize: 20, fontWeight: 'bold' }}>
                GHS {item.price}
              </Text>
              {item.original_price && item.original_price > item.price && (
                <>
                  <Text style={{ color: themeColors.textTertiary, fontSize: 14, marginLeft: 8, textDecorationLine: 'line-through' }}>
                    GHS {item.original_price}
                  </Text>
                  <View style={{ backgroundColor: themeColors.error, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, marginLeft: 8 }}>
                    <Text style={{ color: '#fff', fontSize: 12, fontWeight: 'bold' }}>
                      -{Math.round(((item.original_price - item.price) / item.original_price) * 100)}%
                    </Text>
                  </View>
                </>
              )}
            </View>
            <TouchableOpacity 
              style={{
                marginTop: 12,
                backgroundColor: themeColors.primary,
                paddingVertical: 12,
                paddingHorizontal: 20,
                borderRadius: 12,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              onPress={() => { setSelectedProductDetail(item); setCurrentMediaIndex(0); setProductDetailModal(true); }}
            >
              <Ionicons name="eye" size={16} color="#fff" style={{ marginRight: 6 }} />
              <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>View Details</Text>
            </TouchableOpacity>
          </View>

          {/* View Mode Toggle Button */}
          <TouchableOpacity
            style={{
              position: 'absolute',
              top: 60,
              right: 20,
              backgroundColor: `${themeColors.background}CC`,
              paddingVertical: 8,
              paddingHorizontal: 12,
              borderRadius: 20,
              flexDirection: 'row',
              alignItems: 'center',
              borderWidth: 1,
              borderColor: themeColors.border,
            }}
            onPress={() => setViewMode('grid')}
          >
            <Ionicons name="grid-outline" size={20} color={themeColors.text} />
            <Text style={{ color: themeColors.text, marginLeft: 6, fontSize: 12 }}>Grid</Text>
          </TouchableOpacity>
        </View>
      );
    };

    // Memoized component to prevent unnecessary re-renders
    const MemoizedFeedItem = React.memo(FeedItemComponent);

    // Render function using memoized component
    const renderFeedItem = ({ item, index }: { item: any; index: number }) => {
      return <MemoizedFeedItem item={item} index={index} />;
    };

    return (
      <>
        <FlatList 
          data={products} 
          renderItem={renderProductItem} 
          keyExtractor={(item) => item.id} 
          contentContainerStyle={styles.productsListContainer} 
          showsVerticalScrollIndicator={false}
        />
      </>
    );
  });

  ProductsList.displayName = 'ProductsList';

  // LOAD SELLER DATA
  const loadSellerData = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        console.log('❌ No session found, redirecting to auth');
        router.replace('/auth');
        return;
      }
      setSession(session);

      const [{ data: profileData }, { data: shopData }] = await Promise.all([
        supabase.from('user_profiles').select('full_name, avatar_url, university, username').eq('id', session.user.id).single(),
        supabase.from('shops').select('name, phone, location').eq('owner_id', session.user.id).single(),
      ]);

      setProfile(profileData); setShop(shopData);
      
      // Parse location to extract additional part if needed
      if (shopData?.location && profileData?.university) {
        const parsed = parseLocation(shopData.location, profileData.university);
        setEditingLocationAdditional(parsed.additionalPart);
      }
      
      // Set username
      if (profileData?.username) {
        setEditingUsername(profileData.username);
      }
      
      // Get product count
      const { count: productCountRes } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true })
        .eq('seller_id', session.user.id);

      // Count followers
      const { count: followerCountRes } = await supabase
        .from('shop_follows')
        .select('*', { count: 'exact', head: true })
        .eq('shop_owner_id', session.user.id);

      // Get IDs of all seller products
      const { data: sellerProducts } = await supabase
        .from('products')
        .select('id')
        .eq('seller_id', session.user.id);
      const productIds = sellerProducts?.map(p => p.id) || [];

      // Count total likes across all seller products
      const { count: totalLikesRes } = await supabase
        .from('product_likes')
        .select('*', { count: 'exact', head: true })
        .in('product_id', productIds);

      setProductCount(productCountRes || 0);
      setFollowerCount(followerCountRes || 0);
      setTotalLikes(totalLikesRes || 0);

      if (profileData?.avatar_url) {
        const { data } = await supabase.storage.from('avatars').createSignedUrl(profileData.avatar_url, 3600);
        setAvatarUrl(data?.signedUrl || fallbackAvatar(profileData.full_name || 'Seller'));
      } else setAvatarUrl(fallbackAvatar(shopData?.name || profileData?.full_name || 'Seller'));
      
      // Load orders when seller data loads
      loadOrders();
    } catch (error) { 
      console.error('Error loading seller data:', error); 
    }
    finally { setLoading(false); }
  }, [loadOrders, router]);

  useEffect(() => { loadSellerData(); }, [loadSellerData]);

  const uploadProfilePhoto = async () => {
    if (!session?.user) return;
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      
      if (result.canceled || !result.assets?.[0]) return;
      
      const uri = result.assets[0].uri;
      const fileExt = uri.split('.').pop()?.toLowerCase() || 'jpg';
      const filePath = `${session.user.id}/avatar.${fileExt}`;
      const response = await fetch(uri);
      const blob = await response.blob();
      
      const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, blob, { upsert: true });
      if (uploadError) throw uploadError;
      
      await supabase.from('user_profiles').update({ avatar_url: filePath }).eq('id', session.user.id);
      showAlert({
        title: 'Success',
        message: 'Profile photo updated!',
        type: 'success'
      });
      setProfilePhotoMenuVisible(false);
      loadSellerData();
    } catch (err: any) { 
      showAlert({
        title: 'Upload Failed',
        message: err.message || 'Please try again',
        type: 'error'
      });
    }
  };

  const removeProfilePhoto = async () => {
    if (!session?.user) return;
    try {
      await supabase.from('user_profiles').update({ avatar_url: null }).eq('id', session.user.id);
      showAlert({
        title: 'Success',
        message: 'Profile photo removed!',
        type: 'success'
      });
      setProfilePhotoMenuVisible(false);
      loadSellerData();
    } catch (err: any) {
      showAlert({
        title: 'Failed',
        message: err.message || 'Could not remove profile photo',
        type: 'error'
      });
    }
  };

  const handleProfilePhotoPress = () => {
    setProfilePhotoMenuVisible(true);
  };

  const renderProfilePhotoMenu = () => (
    <Modal
      visible={profilePhotoMenuVisible}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setProfilePhotoMenuVisible(false)}
    >
      <SafeAreaView style={[styles.actionSheetOverlay, { backgroundColor: themeColors.modalOverlay }]}>
        <View style={[styles.actionSheetContainer, { backgroundColor: themeColors.card }]}>
          <View style={[styles.actionSheetHeader, { borderBottomColor: themeColors.border }]}>
            <Text style={[styles.actionSheetTitle, { color: themeColors.text }]}>Profile Photo</Text>
            <TouchableOpacity onPress={() => setProfilePhotoMenuVisible(false)}>
              <Ionicons name="close" size={24} color={themeColors.text} />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.actionSheetContent}>
            {avatarUrl && (
              <TouchableOpacity
                style={[styles.photoMenuButton, { backgroundColor: themeColors.inputBackground }]}
                onPress={() => {
                  setFullViewerMediaUrls([avatarUrl]);
                  setFullViewerIndex(0);
                  setFullViewerVisible(true);
                  setProfilePhotoMenuVisible(false);
                }}
                activeOpacity={0.7}
              >
                <View style={styles.photoMenuIconContainer}>
                  <Ionicons name="eye" size={20} color={themeColors.primary} />
                </View>
                <View style={styles.photoMenuTextContainer}>
                  <Text style={[styles.photoMenuTitle, { color: themeColors.text }]}>View Photo</Text>
                  <Text style={[styles.photoMenuSubtitle, { color: themeColors.textSecondary }]}>Preview your profile photo</Text>
                </View>
              </TouchableOpacity>
            )}
            
            <TouchableOpacity
              style={[styles.photoMenuButton, { backgroundColor: themeColors.inputBackground, marginTop: avatarUrl ? 12 : 0 }]}
              onPress={() => {
                setProfilePhotoMenuVisible(false);
                uploadProfilePhoto();
              }}
              activeOpacity={0.7}
            >
              <View style={styles.photoMenuIconContainer}>
                <Ionicons name="cloud-upload" size={20} color={themeColors.primary} />
              </View>
              <View style={styles.photoMenuTextContainer}>
                <Text style={[styles.photoMenuTitle, { color: themeColors.text }]}>{avatarUrl ? 'Change Photo' : 'Upload Photo'}</Text>
                <Text style={[styles.photoMenuSubtitle, { color: themeColors.textSecondary }]}>{avatarUrl ? 'Select a new photo' : 'Add your profile photo'}</Text>
              </View>
            </TouchableOpacity>
            
            {avatarUrl && (
              <TouchableOpacity
                style={[styles.photoMenuButton, styles.photoMenuButtonDanger, { marginTop: 12 }]}
                onPress={() => {
                  setProfilePhotoMenuVisible(false);
                  showConfirmation({
                    title: 'Remove Photo',
                    message: 'Are you sure you want to remove your profile photo?',
                    confirmText: 'Remove',
                    cancelText: 'Cancel',
                    onConfirm: removeProfilePhoto
                  });
                }}
                activeOpacity={0.7}
              >
                <View style={[styles.photoMenuIconContainer, { backgroundColor: 'rgba(255, 59, 48, 0.1)' }]}>
                  <Ionicons name="trash" size={20} color={themeColors.error} />
                </View>
                <View style={styles.photoMenuTextContainer}>
                  <Text style={[styles.photoMenuTitle, { color: themeColors.error }]}>Remove Photo</Text>
                  <Text style={[styles.photoMenuSubtitle, { color: themeColors.error, opacity: 0.7 }]}>Delete your profile photo</Text>
                </View>
              </TouchableOpacity>
            )}
          </ScrollView>
        </View>
      </SafeAreaView>
    </Modal>
  );

  const openEditProfile = () => {
    setEditingShopName(shop?.name || ''); 
    setEditingFullName(profile?.full_name || '');
    setEditingPhone(shop?.phone?.replace('+233', '0') || ''); 
    setEditingUsername(profile?.username || '');
    
    // Initialize with existing university
    const currentUniversity = profile?.university || '';
    setEditingUniversity(currentUniversity);
    
    // Parse existing location to extract university and additional parts
    const currentLocation = shop?.location || '';
    
    if (currentLocation && currentUniversity) {
      // Check if location already contains the university
      if (currentLocation.startsWith(currentUniversity + ' - ')) {
        // Extract additional part after university and hyphen
        const additional = currentLocation.substring((currentUniversity + ' - ').length);
        setEditingLocationAdditional(additional);
      } else if (currentLocation === currentUniversity) {
        // If location is exactly the university, no additional part
        setEditingLocationAdditional('');
      } else {
        // If location doesn't start with university, treat entire location as additional
        setEditingLocationAdditional(currentLocation);
      }
    } else {
      setEditingLocationAdditional(currentLocation);
    }
    
    // Update the full location display
    setEditingLocation(currentUniversity ? 
      `${currentUniversity} - ${editingLocationAdditional || ''}`.trim() : 
      editingLocationAdditional
    );
    
    setEditModalVisible(true);
    setShowUniversityDropdown(false);
    setUniversitySearch('');
    setFilteredUniversities(GHANA_UNIVERSITIES);
  };

  const saveProfileChanges = async () => {
    if (!session?.user) return;
    
    // Validate required fields
    if (!editingUniversity.trim()) {
      showAlert({
        title: 'Required Field',
        message: 'Please select your university',
        type: 'warning'
      });
      return;
    }
    
    setSaving(true);
    try {
      const updates = [];
      
      // Build complete location string
      const completeLocation = editingUniversity.trim() + 
        (editingLocationAdditional.trim() ? ' - ' + editingLocationAdditional.trim() : '');
      
      // Update shop name if changed
      if (editingShopName !== shop?.name) {
        updates.push(
          supabase.from('shops').update({ name: editingShopName.trim() }).eq('owner_id', session.user.id)
        );
      }
      
      // Update user profile (full name, username and university)
      const profileUpdates: any = {};
      if (editingFullName !== profile?.full_name) {
        profileUpdates.full_name = editingFullName.trim();
      }
      if (editingUsername !== profile?.username) {
        profileUpdates.username = editingUsername.trim();
      }
      if (editingUniversity !== profile?.university) {
        profileUpdates.university = editingUniversity.trim();
      }
      
      if (Object.keys(profileUpdates).length > 0) {
        updates.push(
          supabase.from('user_profiles').update(profileUpdates).eq('id', session.user.id)
        );
      }
      
      // Update phone if changed
      if (editingPhone !== (shop?.phone?.replace('+233', '0') || '')) {
        const cleanPhone = editingPhone.replace(/\D/g, '');
        const formatted = cleanPhone.startsWith('233') ? `+${cleanPhone}` : `+233${cleanPhone.replace(/^0/, '')}`;
        updates.push(
          supabase.from('shops').update({ phone: formatted }).eq('owner_id', session.user.id)
        );
      }
      
      // Update location with complete string
      if (completeLocation !== shop?.location) {
        updates.push(
          supabase.from('shops').update({ location: completeLocation }).eq('owner_id', session.user.id)
        );
      }
      
      // Execute all updates
      if (updates.length > 0) {
        await Promise.all(updates);
      }
      
      showAlert({
        title: 'Saved!',
        message: 'Your profile has been updated.',
        type: 'success'
      });
      setEditModalVisible(false); 
      loadSellerData();
    } catch (error: any) { 
      showAlert({
        title: 'Error',
        message: error.message || 'Failed to save changes',
        type: 'error'
      });
    } finally { 
      setSaving(false); 
    }
  };

  const openAddProduct = async (product?: any) => {
    if (product) {
      const { data: fullProduct, error } = await supabase.from('products').select('*').eq('id', String(product.id)).single();
      if (error || !fullProduct) { 
        showAlert({
          title: 'Error',
          message: 'Failed to load product details',
          type: 'error'
        });
        return; 
      }
      setEditingProduct(fullProduct);
      setTitle(fullProduct.title || '');
      setOriginalPrice(fullProduct.original_price?.toString() || '');
      setSellingPrice(fullProduct.price?.toString() || '');
      setMainCategory(fullProduct.category || '');
      setSubCategory(fullProduct.sub_category || '');
      setProductGender(fullProduct.gender || '');
      setSelectedSizes(fullProduct.sizes_available || []);
      setSizeStock(fullProduct.size_stock || {});
      setGeneralStock(fullProduct.quantity?.toString() || '');
      setProductColors(fullProduct.colors_available || []);
      setColorStock(fullProduct.color_stock || {}); // Load color stock
      setBrand(fullProduct.brand || '');
      setDeliveryOption(deliveryOptionToUi(fullProduct.delivery_option, fullProduct.category === 'Services'));
      setIsPreOrder(fullProduct.is_pre_order || false);
      setPreOrderDuration(fullProduct.pre_order_duration?.toString() || '');
      setPreOrderDurationUnit(fullProduct.pre_order_duration_unit || 'days');
      setDescription(fullProduct.description || '');
      setSelectedMedia((fullProduct.media_urls || []).map((url: string) => ({ 
        uri: url, 
        type: url.includes('.mp4') ? 'video' as const : 'image' as const 
      })));
      
      // Load color media assignments
      setColorMediaAssignments(fullProduct.color_media || {});
    } else {
      setEditingProduct(null);
      setSelectedMedia([]);
      setTitle('');
      setOriginalPrice('');
      setSellingPrice('');
      setMainCategory('');
      setSubCategory('');
      setProductGender('');
      setSelectedSizes([]);
      setSizeStock({});
      setGeneralStock('');
      setProductColors([]);
      setColorStock({}); // Reset color stock
      setNewColor('');
      setBrand('');
      setDeliveryOption('Meetup / Pickup');
      setDescription('');
      setColorMediaAssignments({});
    }
    setAddProductModal(true);
  };

  const closeAddProductModal = () => {
    setAddProductModal(false);
    setEditingProduct(null);
    setSelectedMedia([]);
    setTitle('');
    setOriginalPrice('');
    setSellingPrice('');
    setMainCategory('');
    setSubCategory('');
    setProductGender('');
    setSelectedSizes([]);
    setSizeStock({});
    setGeneralStock('');
    setProductColors([]);
    setColorStock({}); // Reset color stock
    setNewColor('');
    setBrand('');
    setDeliveryOption('Meetup / Pickup');
    setIsPreOrder(false);
    setPreOrderDuration('');
    setPreOrderDurationUnit('days');
    setDescription('');
    setColorMediaAssignments({});
    setSelectedColorForMedia('');
    setColorMediaModalVisible(false);
  };

  const pickMedia = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      allowsMultipleSelection: true,
      quality: 0.8,
    });
    
    if (result.canceled || !result.assets) return;

    const newMedia = result.assets.map(asset => ({ 
      uri: asset.uri, 
      type: asset.type || 'image'
    }));
    
    setSelectedMedia(prev => [...prev, ...newMedia].slice(0, 10));
  };

  const removeMedia = (index: number) => setSelectedMedia(prev => prev.filter((_, i) => i !== index));

  const addColor = () => { 
    if (newColor.trim() && !productColors.includes(newColor.trim())) { 
      setProductColors(prev => [...prev, newColor.trim()]); 
      // Initialize color stock to empty string
      setColorStock(prev => ({ ...prev, [newColor.trim()]: '' }));
      setNewColor(''); 
    } 
  };

  const removeColor = (color: string) => {
    setProductColors(prev => prev.filter(c => c !== color));
    // Remove color stock
    const newStock = { ...colorStock };
    delete newStock[color];
    setColorStock(newStock);
    // Remove color media assignments for removed color
    const newAssignments = { ...colorMediaAssignments };
    delete newAssignments[color];
    setColorMediaAssignments(newAssignments);
  };

  const toggleSize = (size: string) => {
    setSelectedSizes(prev => prev.includes(size) ? prev.filter(s => s !== size) : [...prev, size]);
    if (sizeStock[size]) { 
      const newStock = { ...sizeStock }; 
      delete newStock[size]; 
      setSizeStock(newStock); 
    }
  };

  const updateSizeStock = (size: string, value: string) => 
    setSizeStock(prev => ({ ...prev, [size]: value.replace(/[^0-9]/g, '') }));

  // NEW: Update color stock
  const updateColorStock = (color: string, value: string) =>
    setColorStock(prev => ({ ...prev, [color]: value.replace(/[^0-9]/g, '') }));

  const confirmDeleteProduct = () => {
    if (!selectedProduct) {
      showAlert({
        title: 'Error',
        message: 'No product selected.',
        type: 'error'
      });
      return;
    }
    
    showConfirmation({
      title: 'Delete Product',
      message: `Are you sure you want to delete "${selectedProduct.title}"?`,
      confirmText: 'Delete',
      cancelText: 'Cancel',
      onConfirm: () => deleteProduct(selectedProduct)
    });
  };

  const deleteProduct = async (productToDelete: any) => {
    if (!productToDelete?.id) {
      showAlert({
        title: 'Error',
        message: 'No product selected',
        type: 'error'
      });
      return;
    }
    
    try {
      const { error: deleteError } = await supabase.from('products').delete().eq('id', productToDelete.id);
      if (deleteError) throw deleteError;
  
      const mediaUrls = productToDelete.media_urls || [];
      if (mediaUrls.length > 0) {
        const filesToDelete = mediaUrls.map(url => url.match(/\/products\/(.+)$/)?.[1]).filter(Boolean);
        if (filesToDelete.length > 0) await supabase.storage.from('products').remove(filesToDelete);
      }
  
      showAlert({
        title: 'Success!',
        message: 'Product deleted successfully!',
        type: 'success'
      });
      setSelectedProduct(null);
      setRefreshTrigger(prev => prev + 1);
      loadSellerData();
    } catch (error: any) {
      showAlert({
        title: 'Deletion Failed',
        message: error.message || 'Failed to delete product',
        type: 'error'
      });
    }
  };

  // Function to open color media assignment modal
  const openColorMediaAssignment = (color: string) => {
    setSelectedColorForMedia(color);
    setColorMediaModalVisible(true);
  };

  // FIXED: Save product function - Now always sets quantity field
  const saveProduct = async () => {
    // Validation checks with specific alert messages
    if (!title.trim()) {
      showAlert({
        title: 'Required',
        message: 'Product title is required',
        type: 'warning'
      });
      return;
    }
    
    if (!sellingPrice.trim() || isNaN(Number(sellingPrice))) {
      showAlert({
        title: 'Required',
        message: 'Valid selling price required',
        type: 'warning'
      });
      return;
    }
    
    if (selectedMedia.length === 0 && !editingProduct) {
      showAlert({
        title: 'Required',
        message: 'Add at least one photo or video',
        type: 'warning'
      });
      return;
    }
   
    if (!editingProduct) {
      if (!mainCategory) {
        showAlert({
          title: 'Required',
          message: 'Please select a main category',
          type: 'warning'
        });
        return;
      }
     
      if (mainCategory === 'Services') {
        // Services have different requirements
        if (!subCategory) {
          showAlert({
            title: 'Required',
            message: 'Please select a service type',
            type: 'warning'
          });
          return;
        }
      } else if (mainCategory !== 'Other') {
        if (!subCategory) {
          showAlert({
            title: 'Required',
            message: 'Please select a sub-category',
            type: 'warning'
          });
          return;
        }
        
        if (isFashionOrSports && !productGender) {
          showAlert({
            title: 'Required',
            message: 'Please select who this product is for',
            type: 'warning'
          });
          return;
        }
        
        if (requiresSizes && selectedSizes.length === 0) {
          showAlert({
            title: 'Required',
            message: 'Please select at least one size',
            type: 'warning'
          });
          return;
        }
        
        if (requiresSizes && selectedSizes.some(s => !sizeStock[s] || parseInt(sizeStock[s]) <= 0)) {
          showAlert({
            title: 'Required',
            message: 'Enter stock (>0) for each selected size',
            type: 'warning'
          });
          return;
        }
        
        // Validate color stock if colors exist
        if (productColors.length > 0 && productColors.some(color => {
          const qty = colorStock[color];
          return !qty || parseInt(qty) <= 0;
        })) {
          showAlert({
            title: 'Required',
            message: 'Enter stock (>0) for each selected color',
            type: 'warning'
          });
          return;
        }
        
        if (!requiresSizes && productColors.length === 0 && (!generalStock || parseInt(generalStock) <= 0)) {
          showAlert({
            title: 'Required',
            message: 'Please enter available stock quantity',
            type: 'warning'
          });
          return;
        }
        
        if (requiresBrand && !brand) {
          showAlert({
            title: 'Required',
            message: 'Please select a brand',
            type: 'warning'
          });
          return;
        }
      }
    } else {
      // Editing existing product - validate color stock if colors exist
      if (productColors.length > 0 && productColors.some(color => {
        const qty = colorStock[color];
        // Only validate if the color has stock field (could be empty for new colors)
        return colorStock.hasOwnProperty(color) && (!qty || parseInt(qty) < 0);
      })) {
        showAlert({
          title: 'Required',
          message: 'Enter valid stock (≥0) for each color',
          type: 'warning'
        });
        return;
      }
    }
   
    setPosting(true);
   
    try {
      let finalMediaUrls: string[] = [];
     
      if (editingProduct) {
        // Update existing product
        finalMediaUrls = selectedMedia.filter(m => m.uri.startsWith('http')).map(m => m.uri);
       
        // Upload new media
        for (const media of selectedMedia.filter(m => !m.uri.startsWith('http'))) {
          try {
            const fileExt = media.type === 'video' ? 'mp4' : (media.uri.split('.').pop()?.toLowerCase() || 'jpg');
            const fileName = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
            const filePath = `${session!.user.id}/products/${editingProduct.id}/${fileName}`;
            const response = await fetch(media.uri);
            const blob = await response.blob();
            const { error: uploadError } = await supabase.storage.from('products').upload(filePath, blob, { upsert: true });
            if (uploadError) throw uploadError;
            const { data: { publicUrl } } = supabase.storage.from('products').getPublicUrl(filePath);
            finalMediaUrls.push(publicUrl);
          } catch (uploadError) {
            console.error('Error uploading new media:', uploadError);
          }
        }
       
        // Delete old media that were removed
        const oldUrls = editingProduct.media_urls || [];
        const urlsToDelete = oldUrls.filter((url: string) => !finalMediaUrls.includes(url));
        for (const url of urlsToDelete) {
          try {
            const path = url.match(/\/products\/(.+)$/);
            if (path?.[1]) await supabase.storage.from('products').remove([path[1]]);
          } catch (err) {
            console.error('Error deleting old media:', err);
          }
        }
      } else {
        // Create new product - FIXED: Calculate total quantity properly
        const totalQuantity = isService ? 0 : totalStock;
        
        // Validation for pre-order
        if (!isService && isPreOrder && (!preOrderDuration || parseInt(preOrderDuration) <= 0)) {
          showAlert({
            title: 'Required',
            message: 'Please specify the pre-order duration',
            type: 'warning'
          });
          return;
        }
        
        const productData: any = {
          title: title.trim(),
          price: parseFloat(sellingPrice),
          original_price: originalPrice ? parseFloat(originalPrice) : null,
          category: mainCategory === 'Other' ? 'Other' : mainCategory,
          sub_category: mainCategory === 'Other' ? null : subCategory,
          gender: isFashionOrSports && !isService ? productGender : null,
          sizes_available: requiresSizes ? selectedSizes : null,
          size_stock: requiresSizes ? Object.fromEntries(Object.entries(sizeStock).filter(([_, v]) => parseInt(v as string) > 0)) : null,
          // FIX: Always set quantity field, not just when no colors or sizes
          quantity: totalQuantity,
          brand: isElectronics ? brand : null,
          colors_available: productColors.length > 0 && !isService ? productColors : null,
          color_stock: productColors.length > 0 ? Object.fromEntries(Object.entries(colorStock).filter(([_, v]) => parseInt(v as string) > 0)) : null,
          // FIX: Set empty color_media initially, will be updated after upload
          color_media: {},
          delivery_option: normalizeDeliveryOptionForDb(deliveryOption, isService),
          is_pre_order: isService ? false : isPreOrder,
          pre_order_duration: isService || !isPreOrder ? null : parseInt(preOrderDuration),
          pre_order_duration_unit: isService || !isPreOrder ? null : preOrderDurationUnit,
          description: description.trim() || null,
          is_service: isService,
          media_urls: [],
          seller_id: session!.user.id,
        };
       
        const { data: newProduct, error: insertError } = await supabase
          .from('products')
          .insert(productData)
          .select()
          .single();
       
        if (insertError) throw insertError;
       
        // Upload media for new product and create mapping for color_media
        const mediaUrlMapping: Record<string, string> = {}; // Map from local URI to uploaded URL
        for (const media of selectedMedia) {
          try {
            const fileExt = media.type === 'video' ? 'mp4' : (media.uri.split('.').pop()?.toLowerCase() || 'jpg');
            const fileName = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
            const filePath = `${session!.user.id}/products/${newProduct.id}/${fileName}`;
           
            const response = await fetch(media.uri);
            const blob = await response.blob();
            const { error: uploadError } = await supabase.storage.from('products').upload(filePath, blob, { upsert: true });
            if (uploadError) throw uploadError;
           
            const { data: { publicUrl } } = supabase.storage.from('products').getPublicUrl(filePath);
            finalMediaUrls.push(publicUrl);
            // Store mapping from local URI to uploaded URL
            mediaUrlMapping[media.uri] = publicUrl;
          } catch (uploadError) {
            console.error('Error uploading media:', uploadError);
            throw uploadError;
          }
        }
       
        // FIX: Update color_media with the uploaded URLs instead of local URIs
        const updatedColorMedia: Record<string, string[]> = {};
        Object.keys(colorMediaAssignments).forEach(color => {
          updatedColorMedia[color] = colorMediaAssignments[color].map(localUri => 
            mediaUrlMapping[localUri] || localUri
          );
        });
       
        // Update product with media URLs and color_media
        const { error: updateError } = await supabase
          .from('products')
          .update({ media_urls: finalMediaUrls, color_media: updatedColorMedia })
          .eq('id', newProduct.id);
       
        if (updateError) throw updateError;
       
        showAlert({
          title: 'Success!',
          message: 'Your product is now live!',
          type: 'success'
        });
        closeAddProductModal();
        setRefreshTrigger(prev => prev + 1);
        loadSellerData();
        return;
      }
     
      // For editing existing product - FIXED: Calculate total quantity properly
      const totalQuantity = isService ? 0 : totalStock;
      
      // Validation for pre-order
      if (!isService && isPreOrder && (!preOrderDuration || parseInt(preOrderDuration) <= 0)) {
        showAlert({
          title: 'Required',
          message: 'Please specify the pre-order duration',
          type: 'warning'
        });
        return;
      }
      
      const productData: any = {
        title: title.trim(),
        price: parseFloat(sellingPrice),
        original_price: originalPrice ? parseFloat(originalPrice) : null,
        category: mainCategory === 'Other' ? 'Other' : mainCategory,
        sub_category: mainCategory === 'Other' ? null : subCategory,
        gender: isFashionOrSports && !isService ? productGender : null,
        sizes_available: requiresSizes ? selectedSizes : null,
        size_stock: requiresSizes ? Object.fromEntries(Object.entries(sizeStock).filter(([_, v]) => parseInt(v as string) > 0)) : null,
        // FIX: Always set quantity field
        quantity: totalQuantity,
        brand: isElectronics ? brand : null,
        colors_available: productColors.length > 0 && !isService ? productColors : null,
        color_stock: productColors.length > 0 ? Object.fromEntries(Object.entries(colorStock).filter(([_, v]) => parseInt(v as string) > 0)) : null,
        // FIX: Include color_media assignments
        color_media: colorMediaAssignments,
        delivery_option: normalizeDeliveryOptionForDb(deliveryOption, isService),
        is_pre_order: isService ? false : isPreOrder,
        pre_order_duration: isService || !isPreOrder ? null : parseInt(preOrderDuration),
        pre_order_duration_unit: isService || !isPreOrder ? null : preOrderDurationUnit,
        description: description.trim() || null,
        media_urls: finalMediaUrls,
      };
     
      if (editingProduct) {
        const { error } = await supabase.from('products').update(productData).eq('id', editingProduct.id);
        if (error) throw error;
        showAlert({
          title: 'Success',
          message: 'Product updated successfully!',
          type: 'success'
        });
        closeAddProductModal();
        setRefreshTrigger(prev => prev + 1);
        loadSellerData();
      }
    } catch (err: any) {
      showAlert({
        title: 'Failed',
        message: err.message || 'Could not save product',
        type: 'error'
      });
    } finally {
      setPosting(false);
    }
  };

  if (loading) return (
    <SafeAreaView style={[styles.loadingContainer, { backgroundColor: themeColors.background }]}>
      <ActivityIndicator size="large" color={themeColors.primary} />
    </SafeAreaView>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: themeColors.background }]}>
      {/* Header with logout button */}
      <Stack.Screen
        options={{
          title: shop?.name || 'Seller Dashboard',
          headerTitleStyle: { fontWeight: 'bold', color: themeColors.text },
          headerStyle: { backgroundColor: themeColors.card },
          headerTintColor: themeColors.text,
          headerRight: () => (
            <TouchableOpacity
              onPress={handleLogout}
              style={[styles.headerLogoutButton, { backgroundColor: themeColors.error + '1A' }]}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="log-out-outline" size={24} color={themeColors.error} />
            </TouchableOpacity>
          ),
        }}
      />
     
      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Professional Profile Header */}
        <View style={[styles.profileHeader, { backgroundColor: themeColors.card }]}>
          <View style={styles.profileTopSection}>
            <ProfessionalAvatar 
              uri={avatarUrl} 
              name={profile?.full_name || shop?.name || 'Seller'}
              size={120}
              onPress={handleProfilePhotoPress}
            />
            
            <View style={styles.profileInfoSection}>
              <Text style={[styles.profileName, { color: themeColors.text }]}>
                {profile?.full_name || 'Your Name'}
              </Text>
              <Text style={[styles.profileShopName, { color: themeColors.primary }]}>
                {shop?.name || 'My Campus Shop'}
              </Text>
              
              {profile?.username && (
                <View style={[styles.usernameBadge, { backgroundColor: themeColors.primary + '15' }]}>
                  <Ionicons name="at-circle-outline" size={14} color={themeColors.primary} />
                  <Text style={[styles.usernameText, { color: themeColors.primary }]}>
                    {profile.username}
                  </Text>
                </View>
              )}
              
              <View style={styles.verificationBadge}>
                <Ionicons name="shield-checkmark" size={16} color={themeColors.success} />
                <Text style={[styles.verificationText, { color: themeColors.success }]}>
                  Campus Seller
                </Text>
              </View>
            </View>
          </View>

          {/* Stats Section */}
          <View style={styles.statsSection}>
            <StatsCard 
              value={productCount.toString()}
              label="Products"
              icon="cube-outline"
              themeColors={themeColors}
            />
            <StatsCard 
              value={followerCount.toString()}
              label="Followers"
              icon="people-outline"
              themeColors={themeColors}
            />
            <StatsCard 
              value={totalLikes.toString()}
              label="Likes"
              icon="heart-outline"
              themeColors={themeColors}
            />
          </View>
        </View>

        {/* Info Section */}
        <View style={styles.infoSection}>
          <Text style={[styles.sectionTitle, { color: themeColors.text }]}>Profile Information</Text>
          
          <InfoRow 
            icon="school-outline"
            label="University"
            value={profile?.university || 'Select your university'}
            themeColors={themeColors}
          />
          
          <InfoRow 
            icon="location-outline"
            label="Campus Location"
            value={shop?.location || 'Add your campus location'}
            themeColors={themeColors}
          />
          
          {shop?.phone && (
            <InfoRow 
              icon="call-outline"
              label="Contact Number"
              value={shop.phone}
              themeColors={themeColors}
            />
          )}
          
          <InfoRow 
            icon="calendar-outline"
            label="Member Since"
            value={format(new Date(session?.user?.created_at || Date.now()), 'MMM yyyy')}
            themeColors={themeColors}
          />
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtonsSection}>
          <View style={styles.actionButtonsRow}>
            <ActionButton 
              icon="create-outline"
              label="Edit Profile"
              onPress={openEditProfile}
              variant="secondary"
              themeColors={themeColors}
            />
            <ActionButton 
              icon="add-circle-outline"
              label="Add Product"
              onPress={() => openAddProduct()}
              variant="primary"
              themeColors={themeColors}
            />
          </View>
          
          {/* Orders Button with Notification Badge */}
          <TouchableOpacity
            style={[styles.ordersActionButton, { backgroundColor: themeColors.inputBackground, borderColor: themeColors.border }]}
            onPress={() => {
              setOrdersModalVisible(true);
              loadOrders();
            }}
          >
            <View style={styles.ordersActionButtonContent}>
              <View style={styles.ordersActionButtonLeft}>
                <View style={[styles.ordersIconContainer, { backgroundColor: themeColors.primary + '20' }]}>
                  <Ionicons name="cart-outline" size={24} color={themeColors.primary} />
                </View>
                <View>
                  <Text style={[styles.ordersActionButtonTitle, { color: themeColors.text }]}>Orders</Text>
                  <Text style={[styles.ordersActionButtonSubtitle, { color: themeColors.textSecondary }]}>
                    Manage customer orders
                  </Text>
                </View>
              </View>
              
              <View style={styles.ordersActionButtonRight}>
                {pendingOrdersCount > 0 && (
                  <View style={[styles.notificationBadgeLarge, { backgroundColor: themeColors.error }]}>
                    <Text style={styles.notificationTextLarge}>{pendingOrdersCount}</Text>
                  </View>
                )}
                <Ionicons name="chevron-forward" size={20} color={themeColors.textSecondary} />
              </View>
            </View>
          </TouchableOpacity>
        </View>

        {/* Products Section */}
        <View style={styles.productsSection}>
          <View style={styles.productsHeader}>
            <Text style={[styles.sectionTitle, { color: themeColors.text }]}>Your Products</Text>
            <TouchableOpacity
              style={[styles.viewAllButton, { backgroundColor: themeColors.primary + '15' }]}
              onPress={() => {
                // Scroll to products
              }}
            >
              <Text style={[styles.viewAllButtonText, { color: themeColors.primary }]}>View All</Text>
              <Ionicons name="arrow-forward" size={16} color={themeColors.primary} />
            </TouchableOpacity>
          </View>
          <ProductsList sellerId={session?.user.id!} refreshTrigger={refreshTrigger} />
        </View>
       
        <View style={{ height: 30 }} />
      </ScrollView>
      
      {/* Render all modals */}
      {renderActionSheet()}
      {renderProductDetailModal()}
      {renderOrdersModal()}
      {renderOrderDetailModal()}
      {renderContactOptionsModal()}
      {renderColorMediaModal()}
      {renderProfilePhotoMenu()}
      {/* Full media viewer */}
      <FullImageViewer
        isVisible={fullViewerVisible}
        onClose={() => { setFullViewerVisible(false); setFullViewerIndex(-1); setFullViewerMediaUrls([]); }}
        mediaUrls={fullViewerMediaUrls.length > 0 ? fullViewerMediaUrls : selectedProductDetail?.media_urls || []}
        initialIndex={fullViewerIndex}
      />
     
      {/* Add Product Modal - Custom Overlay Implementation */}
      {addProductModal && (
        <View style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 9998,
          backgroundColor: themeColors.modalOverlay,
        }}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1, backgroundColor: themeColors.background }}>
          <View style={[styles.modalHeader, { backgroundColor: themeColors.card, borderBottomColor: themeColors.border }]}>
            <TouchableOpacity onPress={closeAddProductModal}><Text style={[styles.cancelText, { color: themeColors.textSecondary }]}>Cancel</Text></TouchableOpacity>
            <Text style={[styles.modalTitle, { color: themeColors.text }]}>{editingProduct ? 'Edit Product' : 'New Listing'}</Text>
            <TouchableOpacity onPress={saveProduct} disabled={posting}><Text style={[styles.publishText, posting && { opacity: 0.5 }, { color: themeColors.primary }]}>{posting ? 'Saving...' : editingProduct ? 'Update' : 'Publish'}</Text></TouchableOpacity>
          </View>
          <ScrollView style={[styles.formScroll, { backgroundColor: themeColors.background }]} showsVerticalScrollIndicator={false}>
            <View style={[styles.sectionContainer, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
              <View style={styles.sectionHeaderRow}><Text style={[styles.sectionTitle, { color: themeColors.text }]}>Photos & Videos *</Text><Text style={[styles.sectionSubtitle, { color: themeColors.textSecondary }]}>{selectedMedia.length}/10</Text></View>
              <Text style={{ fontSize: 13, color: themeColors.textSecondary, marginBottom: 10 }}>First item is cover • Videos supported</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.mediaRow}>
                <TouchableOpacity style={[styles.addMediaBox, { borderColor: themeColors.primary, backgroundColor: themeColors.inputBackground }]} onPress={pickMedia}><Ionicons name="camera" size={28} color={themeColors.primary} /><Text style={[styles.addMediaText, { color: themeColors.primary }]}>Add Media</Text></TouchableOpacity>
                {selectedMedia.map((item, index) => (
                  <View key={index} style={styles.mediaItemContainer}>
                    {item.type === 'video' ? (
                      <ResponsiveVideo
                        uri={item.uri}
                        autoPlay={false}
                        controls={false}
                        containerStyle={[styles.formMediaThumbnail, { borderRadius: 16 }]}
                      />
                    ) : (
                      <Image source={{ uri: item.uri }} style={styles.formMediaThumbnail} />
                    )}
                    {index === 0 && <View style={[styles.coverBadge, { backgroundColor: 'rgba(0,0,0,0.6)' }]}><Text style={styles.coverBadgeText}>COVER</Text></View>}
                    {item.type === 'video' && <>
                      <View style={styles.videoPlayIcon}><Ionicons name="play-circle" size={40} color="#fff" /></View>
                      <View style={[styles.videoBadge, { backgroundColor: 'rgba(0,0,0,0.7)' }]}><Ionicons name="videocam" size={16} color="#fff" /><Text style={{ color: '#fff', fontSize: 10, marginLeft: 4 }}>VIDEO</Text></View>
                    </>}
                    <TouchableOpacity style={[styles.removeMediaBtn, { backgroundColor: themeColors.error }]} onPress={() => removeMedia(index)}><Ionicons name="close-circle" size={22} color="#fff" /></TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
            </View>
            <View style={[styles.sectionContainer, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
              <Text style={[styles.inputLabel, { color: themeColors.text }]}>Product Title *</Text>
              <TextInput style={[styles.proInput, { backgroundColor: themeColors.inputBackground, borderColor: themeColors.inputBorder, color: themeColors.text }]} placeholder={isService ? "e.g., Professional Photography Services" : "e.g., iPhone 14 Pro Max 256GB"} value={title} onChangeText={setTitle} maxLength={80} placeholderTextColor={themeColors.placeholder} />
              <Text style={[styles.charCount, { color: themeColors.textSecondary }]}>{title.length}/80</Text>
              <Text style={[styles.inputLabel, { color: themeColors.text }]}>Description (Optional)</Text>
              <TextInput
                style={[styles.proInput, styles.textArea, { backgroundColor: themeColors.inputBackground, borderColor: themeColors.inputBorder, color: themeColors.text }]}
                placeholder={isService ? "Describe your service, experience, what's included..." : "Condition, specs, what's included..."}
                value={description}
                onChangeText={setDescription}
                multiline
                placeholderTextColor={themeColors.placeholder}
              />
            </View>
            <View style={[styles.sectionContainer, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
              <Text style={[styles.sectionTitle, { color: themeColors.text }]}>Pricing</Text>
              <View style={styles.rowInputs}>
                <View style={{ flex: 1 }}><Text style={[styles.inputLabel, { color: themeColors.text }]}>{isService ? 'Service Price *' : 'Selling Price *'}</Text>
                  <View style={[styles.currencyInput, { backgroundColor: themeColors.inputBackground, borderColor: themeColors.inputBorder }]}><Text style={[styles.currencyPrefix, { color: themeColors.textSecondary }]}>GHS</Text><TextInput style={[styles.currencyInputField, { color: themeColors.text }]} value={sellingPrice} onChangeText={setSellingPrice} keyboardType="numeric" placeholder="0.00" placeholderTextColor={themeColors.placeholder} /></View>
                </View>
                <View style={{ flex: 1, marginLeft: 15 }}><Text style={[styles.inputLabel, { color: themeColors.text }]}>Original Price</Text>
                  <View style={[styles.currencyInput, { backgroundColor: themeColors.inputBackground, borderColor: themeColors.inputBorder }]}><Text style={[styles.currencyPrefix, { color: themeColors.textSecondary }]}>GHS</Text><TextInput style={[styles.currencyInputField, { color: themeColors.textSecondary }]} value={originalPrice} onChangeText={setOriginalPrice} keyboardType="numeric" placeholder="Optional" placeholderTextColor={themeColors.placeholder} /></View>
                </View>
              </View>
              {discountPercent !== null && <View style={[styles.discountBadge, { backgroundColor: themeColors.error }]}><Ionicons name="pricetag" size={14} color="#fff" /><Text style={styles.discountText}>{discountPercent}% OFF</Text></View>}
            </View>
            <View style={[styles.sectionContainer, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
              <Text style={[styles.sectionTitle, { color: themeColors.text }]}>Main Category *</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 10 }}>
                {Object.keys(categoryStructure).map((cat) => (
                  <TouchableOpacity key={cat} style={[styles.categoryChip, mainCategory === cat && [styles.categoryChipActive, { backgroundColor: themeColors.chipActiveBackground, borderColor: themeColors.chipActiveBorder }], { backgroundColor: themeColors.chipBackground }]} onPress={() => { setMainCategory(cat as MainCategory); setSubCategory(''); setTertiaryCategory(''); setProductGender(''); setSelectedSizes([]); setSizeStock({}); setGeneralStock(''); setBrand(''); setProductColors([]); setColorStock({}); setColorMediaAssignments({}); }}>
                    <Text style={[styles.categoryText, mainCategory === cat && [styles.categoryTextActive, { color: themeColors.primary }], { color: themeColors.text }]}>{cat}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
            {mainCategory && mainCategory !== 'Other' && (
              <View style={[styles.sectionContainer, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
                <Text style={[styles.sectionTitle, { color: themeColors.text }]}>{mainCategory === 'Fashion' || mainCategory === 'Sports' ? 'Item Type *' : mainCategory === 'Services' ? 'Service Type *' : 'Sub-category *'}</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 10 }}>
                  {categoryStructure[mainCategory].map((sub) => (
                    <TouchableOpacity key={sub} style={[styles.categoryChip, subCategory === sub && [styles.categoryChipActive, { backgroundColor: themeColors.chipActiveBackground, borderColor: themeColors.chipActiveBorder }], { backgroundColor: themeColors.chipBackground }]} onPress={() => { setSubCategory(sub); setTertiaryCategory(''); setSelectedSizes([]); setSizeStock({}); setGeneralStock(''); setBrand(''); setProductColors([]); setColorStock({}); setColorMediaAssignments({}); }}>
                      <Text style={[styles.categoryText, subCategory === sub && [styles.categoryTextActive, { color: themeColors.primary }], { color: themeColors.text }]}>{sub}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
            {subCategory === 'Beauty Services' && (
              <View style={[styles.sectionContainer, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
                <Text style={[styles.sectionTitle, { color: themeColors.text }]}>Beauty Service Type *</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 10 }}>
                  {['Makeup Application', 'Hair Services', 'Barbering', 'Facials & Skincare', 'Nails (Manicure/Pedicure)', 'Waxing', 'Threading', 'Massage & Spa', 'Tattoo', 'Piercing', 'Other Beauty Services'].map((tertiary) => (
                    <TouchableOpacity key={tertiary} style={[styles.categoryChip, tertiaryCategory === tertiary && [styles.categoryChipActive, { backgroundColor: themeColors.chipActiveBackground, borderColor: themeColors.chipActiveBorder }], { backgroundColor: themeColors.chipBackground }]} onPress={() => { setTertiaryCategory(tertiary); }}>
                      <Text style={[styles.categoryText, tertiaryCategory === tertiary && [styles.categoryTextActive, { color: themeColors.primary }], { color: themeColors.text }]}>{tertiary}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
            {isFashionOrSports && !isService && (
              <View style={[styles.sectionContainer, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
                <Text style={[styles.sectionTitle, { color: themeColors.text }]}>Who is this for? *</Text>
                <View style={styles.radioGroup}>
                  {(['Men', 'Women', 'Unisex', 'Kids', 'Others'] as const).map((g) => (
                    <TouchableOpacity key={g} style={styles.radioRow} onPress={() => { setProductGender(g); setSelectedSizes([]); setSizeStock({}); }}>
                      <Ionicons name={productGender === g ? "radio-button-on" : "radio-button-off"} size={24} color={productGender === g ? themeColors.primary : themeColors.textSecondary} />
                      <Text style={[styles.radioText, { color: themeColors.text }]}>{g}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}
            {requiresBrand && (
              <View style={[styles.sectionContainer, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
                <Text style={[styles.sectionTitle, { color: themeColors.text }]}>Brand *</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 10 }}>
                  {electronicsBrands[subCategory].map((b) => (
                    <TouchableOpacity key={b} style={[styles.categoryChip, brand === b && [styles.categoryChipActive, { backgroundColor: themeColors.chipActiveBackground, borderColor: themeColors.chipActiveBorder }], { backgroundColor: themeColors.chipBackground }]} onPress={() => setBrand(b)}>
                      <Text style={[styles.categoryText, brand === b && [styles.categoryTextActive, { color: themeColors.primary }], { color: themeColors.text }]}>{b}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
            {!requiresSizes && mainCategory && !isService && productColors.length === 0 && (
              <View style={[styles.sectionContainer, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
                <Text style={[styles.sectionTitle, { color: themeColors.text }]}>Available Stock *</Text>
                <View style={styles.rowBetween}>
                  <Text style={[styles.inputLabel, { color: themeColors.text }]}>How many units do you have?</Text>
                  <View style={[styles.qtyInput, { borderColor: themeColors.inputBorder, backgroundColor: themeColors.inputBackground }]}>
                    <TextInput
                      style={{ textAlign: 'center', fontSize: 18, fontWeight: '600', color: themeColors.text }}
                      placeholder="1"
                      keyboardType="number-pad"
                      value={generalStock}
                      onChangeText={(v) => setGeneralStock(v.replace(/[^0-9]/g, ''))}
                      placeholderTextColor={themeColors.placeholder}
                    />
                  </View>
                </View>
              </View>
            )}
            {requiresSizes && (
              <View style={[styles.sectionContainer, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
                <Text style={[styles.sectionTitle, { color: themeColors.text }]}>{sizeSectionTitle}</Text>
                <View style={styles.sizeGrid}>
                  {availableSizes.map(size => (
                    <View key={size} style={{ alignItems: 'center', marginBottom: 16 }}>
                      <TouchableOpacity style={[styles.sizeCircle, selectedSizes.includes(size) && [styles.sizeCircleActive, { backgroundColor: themeColors.primary, borderColor: themeColors.primary }], { borderColor: themeColors.inputBorder }]} onPress={() => toggleSize(size)}>
                        <Text style={[styles.sizeText, selectedSizes.includes(size) && styles.sizeTextActive, { color: selectedSizes.includes(size) ? '#fff' : themeColors.text }]}>{size}</Text>
                      </TouchableOpacity>
                      {selectedSizes.includes(size) && <TextInput style={[styles.stockInput, { borderColor: themeColors.inputBorder, backgroundColor: themeColors.inputBackground, color: themeColors.text }]} placeholder="0" keyboardType="number-pad" value={sizeStock[size] || ''} onChangeText={(v) => updateSizeStock(size, v)} placeholderTextColor={themeColors.placeholder} />}
                    </View>
                  ))}
                </View>
              </View>
            )}
            {totalStock > 0 && !isService && <View style={[styles.sectionContainer, { backgroundColor: themeColors.chipActiveBackground, borderColor: themeColors.border }]}><Text style={{ fontSize: 17, fontWeight: 'bold', color: themeColors.primary }}>Total Available: {totalStock} {totalStock === 1 ? 'item' : 'items'}</Text></View>}
            {!isService && (
              <View style={[styles.sectionContainer, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
                <Text style={[styles.sectionTitle, { color: themeColors.text }]}>Colors with Quantities (Optional)</Text>
                <View style={{ marginBottom: 10 }}>
                  <View style={[styles.tagInputContainer, { backgroundColor: themeColors.inputBackground, borderColor: themeColors.inputBorder }]}>
                    <TextInput 
                      style={{ flex: 1, color: themeColors.text }} 
                      placeholder="Add color (e.g. Black)..." 
                      value={newColor} 
                      onChangeText={setNewColor} 
                      onSubmitEditing={addColor} 
                      placeholderTextColor={themeColors.placeholder} 
                    />
                    <TouchableOpacity onPress={addColor}>
                      <Ionicons name="add-circle" size={28} color={themeColors.primary}/>
                    </TouchableOpacity>
                  </View>
                  <View style={styles.tagContainer}>
                    {productColors.map(c => {
                      const assignedMediaCount = (colorMediaAssignments[c] || []).length;
                      const colorQty = colorStock[c] || '';
                      const isOutOfStock = colorQty === '0';
                      
                      return (
                        <View key={c} style={styles.colorWithQtyContainer}>
                          <TouchableOpacity onPress={() => removeColor(c)} style={[
                            styles.tag, 
                            { backgroundColor: themeColors.inputBackground },
                            isOutOfStock && { backgroundColor: themeColors.errorLight }
                          ]}>
                            <Text style={[
                              styles.tagText, 
                              { color: themeColors.text },
                              isOutOfStock && { color: themeColors.error }
                            ]}>
                              {c}
                            </Text>
                            <Ionicons name="close" size={14} color={isOutOfStock ? themeColors.error : themeColors.textSecondary} />
                          </TouchableOpacity>
                          
                          {/* Color Quantity Input */}
                          <View style={[styles.colorQtyInputContainer, { borderColor: themeColors.inputBorder }]}>
                            <TextInput
                              style={[
                                styles.colorQtyInput,
                                { color: themeColors.text },
                                isOutOfStock && { color: themeColors.error }
                              ]}
                              placeholder="Qty"
                              keyboardType="number-pad"
                              value={colorQty}
                              onChangeText={(v) => updateColorStock(c, v)}
                              placeholderTextColor={themeColors.placeholder}
                            />
                          </View>
                          
                          {selectedMedia.length > 0 && (
                            <TouchableOpacity
                              style={[
                                styles.assignMediaButton, 
                                { backgroundColor: assignedMediaCount > 0 ? themeColors.success : themeColors.primary }
                              ]}
                              onPress={() => openColorMediaAssignment(c)}
                            >
                              <Ionicons name="images" size={16} color="#fff" />
                              <Text style={styles.assignMediaButtonText}>
                                {assignedMediaCount > 0 ? `${assignedMediaCount}` : 'Assign'}
                              </Text>
                            </TouchableOpacity>
                          )}
                        </View>
                      );
                    })}
                  </View>
                </View>
                {productColors.length > 0 && (
                  <Text style={[styles.inputHint, { color: themeColors.textSecondary, marginTop: 8 }]}>
                    Enter quantity for each color. Leave as 0 or empty if out of stock.
                  </Text>
                )}
              </View>
            )}
            <View style={[styles.sectionContainer, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
              <Text style={[styles.sectionTitle, { color: themeColors.text }]}>{isService ? 'Service Delivery' : 'Delivery Method'}</Text>
              <View style={styles.radioGroup}>
                {deliveryOptions.map((opt) => (
                  <TouchableOpacity key={opt} style={styles.radioRow} onPress={() => setDeliveryOption(opt)}>
                    <Ionicons name={deliveryOption === opt ? "radio-button-on" : "radio-button-off"} size={24} color={deliveryOption === opt ? themeColors.primary : themeColors.textSecondary} />
                    <Text style={[styles.radioText, { color: themeColors.text }]}>
                      {opt === 'Both' ? (isService ? 'Both (Remote & On-site)' : 'Campus Delivery and Meetup / Pickup') : opt}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            
            {!isService && (
              <View style={[styles.sectionContainer, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
                <Text style={[styles.sectionTitle, { color: themeColors.text }]}>Product Availability *</Text>
                
                {/* Pre-order Toggle */}
                <View style={styles.radioGroup}>
                  <TouchableOpacity style={styles.radioRow} onPress={() => { setIsPreOrder(false); setPreOrderDuration(''); }}>
                    <Ionicons name={!isPreOrder ? "radio-button-on" : "radio-button-off"} size={24} color={!isPreOrder ? themeColors.primary : themeColors.textSecondary} />
                    <Text style={[styles.radioText, { color: themeColors.text }]}>In Stock - Available Now</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity style={styles.radioRow} onPress={() => setIsPreOrder(true)}>
                    <Ionicons name={isPreOrder ? "radio-button-on" : "radio-button-off"} size={24} color={isPreOrder ? themeColors.primary : themeColors.textSecondary} />
                    <Text style={[styles.radioText, { color: themeColors.text }]}>Pre-Order</Text>
                  </TouchableOpacity>
                </View>
                
                {/* Pre-order Duration Input */}
                {isPreOrder && (
                  <View style={{ marginTop: 15, paddingTop: 15, borderTopWidth: 1, borderTopColor: themeColors.border }}>
                    <Text style={[styles.inputLabel, { color: themeColors.text, marginBottom: 10 }]}>How long will it take to arrive? *</Text>
                    <View style={styles.rowInputs}>
                      <View style={{ flex: 1, marginRight: 10 }}>
                        <TextInput
                          style={[styles.proInput, { backgroundColor: themeColors.inputBackground, borderColor: themeColors.inputBorder, color: themeColors.text }]}
                          placeholder="e.g., 2"
                          keyboardType="number-pad"
                          value={preOrderDuration}
                          onChangeText={(v) => setPreOrderDuration(v.replace(/[^0-9]/g, ''))}
                          placeholderTextColor={themeColors.placeholder}
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <ScrollView 
                          horizontal 
                          showsHorizontalScrollIndicator={false}
                          style={{ maxHeight: 50 }}
                        >
                          {(['days', 'weeks', 'months'] as const).map((unit) => (
                            <TouchableOpacity
                              key={unit}
                              style={[
                                styles.categoryChip,
                                preOrderDurationUnit === unit && [
                                  styles.categoryChipActive,
                                  { backgroundColor: themeColors.chipActiveBackground, borderColor: themeColors.chipActiveBorder }
                                ],
                                { backgroundColor: themeColors.chipBackground }
                              ]}
                              onPress={() => setPreOrderDurationUnit(unit)}
                            >
                              <Text style={[
                                styles.categoryText,
                                preOrderDurationUnit === unit && [
                                  styles.categoryTextActive,
                                  { color: themeColors.primary }
                                ],
                                { color: themeColors.text }
                              ]}>
                                {unit === 'days' ? 'Days' : unit === 'weeks' ? 'Weeks' : 'Months'}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </ScrollView>
                      </View>
                    </View>
                    <Text style={[styles.inputHint, { color: themeColors.textSecondary, marginTop: 8 }]}>
                      Example: 2 weeks means customers will receive their order in 2 weeks
                    </Text>
                  </View>
                )}
              </View>
            )}
            <View style={{ height: 150 }} />
          </ScrollView>
        </KeyboardAvoidingView>
        </View>
      )}
     
      {/* Edit Profile Modal with Integrated University Dropdown */}
      <Modal visible={editModalVisible} animationType="slide" presentationStyle={isDesktop ? "formSheet" : "pageSheet"}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <SafeAreaView style={[styles.modalContainer, { backgroundColor: themeColors.background }]}>
            <View style={[styles.modalHeader, { backgroundColor: themeColors.card, borderBottomColor: themeColors.border }]}>
              <TouchableOpacity onPress={() => {
                setEditModalVisible(false);
                setShowUniversityDropdown(false);
                setUniversitySearch('');
                setFilteredUniversities(GHANA_UNIVERSITIES);
              }}>
                <Ionicons name="close" size={28} color={themeColors.text} />
              </TouchableOpacity>
              <Text style={[styles.modalTitle, { color: themeColors.text }]}>Edit Profile</Text>
              <TouchableOpacity onPress={saveProfileChanges} disabled={saving}>
                <Text style={[styles.publishText, saving && { opacity: 0.5 }, { color: themeColors.primary }]}>
                  {saving ? 'Saving...' : 'Done'}
                </Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={{ padding: 20 }} showsVerticalScrollIndicator={false}>
              <View style={[styles.sectionContainer, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
                <Text style={[styles.inputLabel, { color: themeColors.text }]}>Shop Name</Text>
                <TextInput 
                  style={[styles.proInput, { backgroundColor: themeColors.inputBackground, borderColor: themeColors.inputBorder, color: themeColors.text }]} 
                  value={editingShopName} 
                  onChangeText={setEditingShopName} 
                  placeholder="Your shop name" 
                  placeholderTextColor={themeColors.placeholder}
                />
              </View>
              
              <View style={[styles.sectionContainer, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
                <Text style={[styles.inputLabel, { color: themeColors.text }]}>Full Name</Text>
                <TextInput 
                  style={[styles.proInput, { backgroundColor: themeColors.inputBackground, borderColor: themeColors.inputBorder, color: themeColors.text }]} 
                  value={editingFullName} 
                  onChangeText={setEditingFullName} 
                  placeholder="Your full name" 
                  placeholderTextColor={themeColors.placeholder}
                />
              </View>

              <View style={[styles.sectionContainer, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
                <Text style={[styles.inputLabel, { color: themeColors.text }]}>Username</Text>
                <TextInput 
                  style={[styles.proInput, { backgroundColor: themeColors.inputBackground, borderColor: themeColors.inputBorder, color: themeColors.text }]} 
                  value={editingUsername} 
                  onChangeText={setEditingUsername} 
                  placeholder="Your username" 
                  placeholderTextColor={themeColors.placeholder}
                />
                <Text style={[styles.inputHint, { color: themeColors.textSecondary }]}>
                  This will be displayed as @{editingUsername || 'username'} on your profile
                </Text>
              </View>
              
              <View style={[styles.sectionContainer, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
                <Text style={[styles.inputLabel, { color: themeColors.text }]}>Phone Number</Text>
                <TextInput 
                  style={[styles.proInput, { backgroundColor: themeColors.inputBackground, borderColor: themeColors.inputBorder, color: themeColors.text }]} 
                  value={editingPhone} 
                  onChangeText={setEditingPhone} 
                  placeholder="0241234567" 
                  keyboardType="phone-pad" 
                  placeholderTextColor={themeColors.placeholder}
                />
              </View>
              
              <View style={[styles.sectionContainer, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
                <Text style={[styles.inputLabel, { color: themeColors.text }]}>University *</Text>
                <TouchableOpacity
                  style={[styles.universitySelector, { backgroundColor: themeColors.inputBackground, borderColor: themeColors.inputBorder }]}
                  onPress={() => {
                    setShowUniversityDropdown(!showUniversityDropdown);
                    setUniversitySearch('');
                    setFilteredUniversities(GHANA_UNIVERSITIES);
                  }}
                >
                  <Text style={[editingUniversity ? styles.universitySelectedText : styles.universityPlaceholderText, { color: editingUniversity ? themeColors.text : themeColors.placeholder }]}>
                    {editingUniversity || 'Select your university'}
                  </Text>
                  <Ionicons 
                    name={showUniversityDropdown ? "chevron-up" : "chevron-down"} 
                    size={20} 
                    color={themeColors.textSecondary} 
                  />
                </TouchableOpacity>
                
                {showUniversityDropdown && (
                  <View style={[styles.universityDropdown, { backgroundColor: themeColors.card, borderColor: themeColors.inputBorder }]}>
                    <View style={[styles.searchInputContainer, { backgroundColor: themeColors.inputBackground }]}>
                      <Ionicons name="search" size={20} color={themeColors.textSecondary} />
                      <TextInput
                        style={[styles.searchInput, { color: themeColors.text }]}
                        placeholder="Search universities..."
                        placeholderTextColor={themeColors.placeholder}
                        value={universitySearch}
                        onChangeText={filterUniversities}
                        autoFocus
                      />
                      {universitySearch.length > 0 && (
                        <TouchableOpacity
                          onPress={() => {
                            setUniversitySearch('');
                            setFilteredUniversities(GHANA_UNIVERSITIES);
                          }}
                        >
                          <Ionicons name="close-circle" size={20} color={themeColors.textSecondary} />
                        </TouchableOpacity>
                      )}
                    </View>
                    
                    <FlatList
                      data={filteredUniversities}
                      keyExtractor={(item) => item}
                      showsVerticalScrollIndicator={true}
                      style={styles.universityDropdownList}
                      contentContainerStyle={styles.universityListContainer}
                      renderItem={({ item }) => (
                        <TouchableOpacity
                          style={[
                            styles.universityItem,
                            editingUniversity === item && [styles.universityItemSelected, { backgroundColor: themeColors.chipActiveBackground }],
                            { borderBottomColor: themeColors.border }
                          ]}
                          onPress={() => handleUniversitySelect(item)}
                        >
                          <Text style={[
                            styles.universityItemText,
                            editingUniversity === item && [styles.universityItemTextSelected, { color: themeColors.primary }],
                            { color: themeColors.text }
                          ]}>
                            {item}
                          </Text>
                          {editingUniversity === item && (
                            <Ionicons name="checkmark" size={20} color={themeColors.primary} />
                          )}
                        </TouchableOpacity>
                      )}
                      ListEmptyComponent={
                        <View style={styles.emptyUniversityContainer}>
                          <Ionicons name="school-outline" size={40} color={themeColors.textTertiary} />
                          <Text style={[styles.emptyUniversityText, { color: themeColors.textSecondary }]}>No universities found</Text>
                          <Text style={{ color: themeColors.textTertiary, marginTop: 4, textAlign: 'center', fontSize: 12 }}>
                            Try a different search term
                          </Text>
                        </View>
                      }
                    />
                  </View>
                )}
              </View>
              
              <View style={[styles.sectionContainer, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
                <Text style={[styles.inputLabel, { color: themeColors.text }]}>Location on Campus *</Text>
                
                {/* University Part (non-editable) */}
                {editingUniversity && (
                  <View style={[styles.universityDisplayContainer, { backgroundColor: themeColors.inputBackground, borderColor: themeColors.inputBorder }]}>
                    <Text style={[styles.universityDisplayText, { color: themeColors.text }]}>
                      {editingUniversity} - 
                    </Text>
                    <View style={styles.locationInputContainer}>
                      <TextInput
                        style={[styles.proInput, styles.locationAdditionalInput, { color: themeColors.text }]}
                        value={editingLocationAdditional}
                        onChangeText={handleLocationAdditionalChange}
                        placeholder="e.g., Diaspora Hall, Room 205"
                        placeholderTextColor={themeColors.placeholder}
                      />
                    </View>
                </View>
                )}
                
                {/* If no university selected yet */}
                {!editingUniversity && (
                  <TextInput
                    style={[styles.proInput, { backgroundColor: themeColors.inputBackground, borderColor: themeColors.inputBorder, color: themeColors.text }]}
                    value={editingLocationAdditional}
                    onChangeText={handleLocationAdditionalChange}
                    placeholder="First select a university above"
                    placeholderTextColor={themeColors.placeholder}
                    editable={false}
                  />
                )}
                
                <Text style={[styles.inputHint, { color: themeColors.textSecondary }]}>
                  {editingUniversity 
                    ? `Specific location details (e.g., Diaspora Hall, Room 205)`
                    : 'Please select a university first'
                  }
                </Text>
              </View>
            </ScrollView>
          </SafeAreaView>
        </KeyboardAvoidingView>
      </Modal>

    </SafeAreaView>
  );
}

// ==================== MAIN EXPORT ====================
export default function SellerDashboard() {
  return (
    <View style={{ flex: 1 }}>
      <SellerDashboardContent />
    </View>
  );
}
// Full screen media viewer used by seller page
const FullImageViewer: React.FC<{
  isVisible: boolean;
  onClose: () => void;
  mediaUrls: string[];
  initialIndex: number;
}> = ({ isVisible, onClose, mediaUrls, initialIndex }) => {
  const [currentIndex, setCurrentIndex] = useState(Math.max(0, initialIndex || 0));
  const listRef = useRef<FlatList<any> | null>(null);
  const videoRefs = useRef<Record<number, any>>({});
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();

  const formattedMedia = useMemo(
    () => (mediaUrls || []).map((u) => formatProductMediaUrl(u) || u),
    [mediaUrls]
  );

  const clampedInitialIndex = Math.min(
    Math.max(0, initialIndex ?? 0),
    Math.max(0, formattedMedia.length - 1)
  );

  useEffect(() => {
    if (isVisible && formattedMedia.length > 0) {
      setCurrentIndex(clampedInitialIndex);
      setTimeout(() => {
        listRef.current?.scrollToIndex({ index: clampedInitialIndex, animated: false });
      }, 50);
    }
  }, [isVisible, clampedInitialIndex, formattedMedia]);

  // Pause videos that are not currently visible
  useEffect(() => {
    Object.keys(videoRefs.current).forEach(key => {
      const index = parseInt(key);
      const videoRef = videoRefs.current[index];
      if (videoRef && index !== currentIndex) {
        videoRef.pauseAsync?.().catch(() => {});
      }
    });
  }, [currentIndex]);

  if (!isVisible || !formattedMedia?.length) return null;

  return (
    <Modal animationType="fade" transparent={true} visible={isVisible} onRequestClose={onClose}>
      <StatusBar hidden />
      <View style={viewerStyles.fullViewerContainer}>
        <TouchableOpacity style={viewerStyles.fullViewerCloseButton} onPress={onClose}>
          <Ionicons name="close" size={36} color="#fff" />
        </TouchableOpacity>

        <FlatList
          ref={listRef}
          style={{ width: screenWidth, height: screenHeight }}
          data={formattedMedia}
          horizontal
          pagingEnabled
          snapToInterval={screenWidth}
          snapToAlignment="center"
          decelerationRate="fast"
          disableIntervalMomentum
          bounces={false}
          overScrollMode="never"
          showsHorizontalScrollIndicator={false}
          keyExtractor={(_, i) => i.toString()}
          getItemLayout={(_, i) => ({ length: screenWidth, offset: screenWidth * i, index: i })}
          onScrollToIndexFailed={(info) => {
            // Fallback: approximate scroll then retry.
            const offset = info.index * screenWidth;
            listRef.current?.scrollToOffset({ offset, animated: false });
            setTimeout(() => listRef.current?.scrollToIndex({ index: info.index, animated: false }), 50);
          }}
          onMomentumScrollEnd={(e) => setCurrentIndex(Math.round(e.nativeEvent.contentOffset.x / screenWidth))}
          renderItem={({ item: url, index }) => {
            const isVideo = isVideoUrl(url);
            const containerMaxWidth = Math.min(screenWidth * 0.9, 1200);
            const containerMaxHeight = Math.min(screenHeight * 0.9, 1200);
            
            return (
              <View style={{ 
                width: screenWidth,
                height: screenHeight,
                backgroundColor: '#000', 
                justifyContent: 'center', 
                alignItems: 'center',
              }}>
                <View style={{ 
                  width: containerMaxWidth, 
                  height: containerMaxHeight, 
                  justifyContent: 'center', 
                  alignItems: 'center',
                }}>
                  {isVideo ? (
                    <Video
                      ref={(ref) => {
                        if (ref) videoRefs.current[index] = ref;
                        else delete videoRefs.current[index];
                      }}
                      source={{ uri: url }}
                      style={{ width: '100%', height: '100%' }}
                      resizeMode={ResizeMode.CONTAIN}
                      isLooping
                      shouldPlay={currentIndex === index}
                      useNativeControls
                    />
                  ) : (
                    <Image source={{ uri: url }} style={{ width: '100%', height: '100%' }} resizeMode="contain" />
                  )}
                </View>
              </View>
            );
          }}
        />
        
        {formattedMedia.length > 1 && (
          <Text style={viewerStyles.fullViewerPaginationText}>
            {currentIndex + 1} / {formattedMedia.length}
          </Text>
        )}
      </View>
    </Modal>
  );
};

// Full viewer styles used by FullImageViewer
const viewerStyles = StyleSheet.create({
  fullViewerContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  fullViewerCloseButton: {
    position: 'absolute',
    top: 40,
    left: 20,
    zIndex: 10,
    padding: 10,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 25,
  },
  fullViewerPaginationText: {
    position: 'absolute',
    bottom: 30,
    right: 20,
    backgroundColor: 'rgba(0,0,0,0.6)',
    color: '#fff',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 10,
    fontSize: 16,
    fontWeight: 'bold',
  },
});

// STYLES - Professional Profile Design with Updated Styles for Color Media
const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scrollContent: { paddingBottom: 30 },

  // Action Sheet (Profile Photo Menu)
  actionSheetOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  actionSheetContainer: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    overflow: 'hidden',
  },
  actionSheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
  },
  actionSheetTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  actionSheetContent: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  photoMenuButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 0,
  },
  photoMenuIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 159, 64, 0.1)',
    marginRight: 16,
  },
  photoMenuTextContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  photoMenuTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  photoMenuSubtitle: {
    fontSize: 13,
    fontWeight: '400',
  },
  photoMenuButtonDanger: {
    backgroundColor: 'rgba(255, 59, 48, 0.05)',
  },
  actionSheetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    gap: 12,
  },
  actionSheetButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
  deleteButtonAction: {
    paddingVertical: 16,
  },
  deleteText: {
    fontWeight: '600',
  },
  actionSheetDivider: {
    height: 1,
  },
  actionSheetCancelButton: {
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
    borderRadius: 12,
  },
  actionSheetCancelText: {
    fontSize: 16,
    fontWeight: '600',
  },
 
  // Header Logout Button
  headerLogoutButton: {
    marginRight: 15,
    padding: 8,
    borderRadius: 8,
  },
 
  // Professional Profile Header
  profileHeader: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 4,
    borderBottomRightRadius: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -1 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  profileTopSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  profileInfoSection: {
    flex: 1,
    marginLeft: 20,
  },
  profileName: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  profileShopName: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  usernameBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 8,
    gap: 4,
  },
  usernameText: {
    fontSize: 12,
    fontWeight: '600',
  },
  verificationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  verificationText: {
    fontSize: 12,
    fontWeight: '500',
  },
 
  // Stats Section
  statsSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 0,
  },
 
  // Info Section
  infoSection: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 1,
  },
 
  // Action Buttons Section
  actionButtonsSection: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  ordersActionButton: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    marginTop: 8,
  },
  ordersActionButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  ordersActionButtonLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  ordersIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  ordersActionButtonTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  ordersActionButtonSubtitle: {
    fontSize: 13,
  },
  ordersActionButtonRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  notificationBadgeLarge: {
    borderRadius: 10,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
    marginRight: 12,
  },
  notificationTextLarge: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
 
  // Products Section
  productsSection: {
    padding: 20,
  },
  productsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 4,
  },
  viewAllButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
 
  // Existing product styles
  divider: { height: 1, marginVertical: 10 },
  productsListContainer: { padding: 16 },
  productListItem: {
    borderRadius: 12,
    marginBottom: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    position: 'relative',
  },
  productListContent: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  productImageContainer: { position: 'relative' },
  productListImage: { width: 80, height: 80, borderRadius: 8, marginRight: 12 },
  noImagePlaceholder: { justifyContent: 'center', alignItems: 'center' },
  playIcon: { position: 'absolute', top: '50%', left: '50%', transform: [{ translateX: -20 }, { translateY: -20 }] },
  productListInfo: { flex: 1 },
  productListTitle: { fontSize: 16, fontWeight: '600', marginBottom: 4 },
  productListPriceRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4, flexWrap: 'wrap' },
  productListPrice: { fontSize: 18, fontWeight: 'bold', marginRight: 8 },
  productListOriginalPrice: { fontSize: 14, textDecorationLine: 'line-through', marginRight: 8 },
  productListDiscountTag: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  productListDiscountText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  productListCategory: { fontSize: 12, marginBottom: 2 },
  
  // Color quantity display
  colorQuantityDisplay: {
    marginBottom: 4,
  },
  productListColors: {
    fontSize: 12,
  },
  stockStatusText: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  
  // Out of stock overlay
  outOfStockOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 59, 48, 0.1)',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  outOfStockText: {
    backgroundColor: '#FF3B30',
    color: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    fontSize: 12,
    fontWeight: 'bold',
  },
  
  productListMenuButton: { padding: 8 },
 
  // Service Badge
  serviceBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
    zIndex: 1,
  },
  serviceBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  serviceDeliveryText: {
    fontSize: 12,
    marginTop: 4,
  },
 
  // Order Card Styles
  orderCard: {
    borderRadius: 12,
    marginBottom: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  orderInfo: {
    flex: 1,
  },
  orderId: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  orderDate: {
    fontSize: 12,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#fff',
  },
  orderContent: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  productImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 12,
  },
  orderDetails: {
    flex: 1,
  },
  productTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  productPrice: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  buyerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  buyerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 10,
  },
  buyerTextInfo: {
    flex: 1,
  },
  buyerName: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  buyerContact: {
    fontSize: 12,
  },
  deliveryInfo: {
    fontSize: 12,
  },
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    paddingTop: 12,
  },
  itemsCount: {
    fontSize: 12,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    minWidth: 60,
    alignItems: 'center',
  },
  acceptButton: {
    backgroundColor: '#28A745',
  },
  rejectButton: {
    backgroundColor: '#DC3545',
  },
  completeButton: {
    backgroundColor: '#FF9900',
  },
  
  // Contact Buyer Button in Order List
  contactBuyerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    gap: 6,
    marginLeft: 8,
  },
  contactBuyerButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  
  // Contact Buyer Button in Detail View
  contactBuyerButtonDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    gap: 10,
    marginTop: 12,
  },
 
  actionButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
 
  // Order Detail Modal
  modalContainer: {
    flex: 1,
  },
  modalContent: {
    flex: 1,
    marginTop: 50,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  detailContent: {
    flex: 1,
    padding: 16,
  },
  detailSection: {
    marginBottom: 24,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 14,
    flex: 1,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '500',
    flex: 2,
    textAlign: 'right',
  },
  buyerDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    padding: 12,
    borderRadius: 10,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  buyerContactInfo: {
    flex: 1,
  },
  buyerNameDetail: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  buyerPhone: {
    fontSize: 15,
    marginBottom: 2,
  },
  buyerLocation: {
    fontSize: 14,
    fontStyle: 'italic',
  },
  
  // Contact Options Modal Styles
  contactOptionsOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  contactOptionsContainer: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  contactOptionsHeader: {
    padding: 20,
    alignItems: 'center',
    borderBottomWidth: 1,
  },
  contactOptionsTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  contactOptionsSubtitle: {
    fontSize: 16,
    marginBottom: 8,
  },
  contactOptionsPhone: {
    fontSize: 18,
    fontWeight: '600',
  },
  contactOptionsList: {
    padding: 16,
  },
  contactOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  contactOptionIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  contactOptionTextContainer: {
    flex: 1,
  },
  contactOptionTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  contactOptionDescription: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  contactOptionsCancel: {
    padding: 18,
    alignItems: 'center',
    borderTopWidth: 1,
  },
  contactOptionsCancelText: {
    fontSize: 17,
    fontWeight: '600',
  },
  
  orderItemDetail: {
    flexDirection: 'row',
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  itemImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 12,
  },
  itemInfo: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  itemPrice: {
    fontSize: 14,
    marginBottom: 2,
  },
  itemQuantity: {
    fontSize: 12,
    marginBottom: 2,
  },
  itemSize: {
    fontSize: 12,
  },
  itemColor: {
    fontSize: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 14,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '500',
  },
  totalRow: {
    borderTopWidth: 1,
    paddingTop: 8,
    marginTop: 8,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  actionButtonsDetail: {
    marginTop: 24,
    gap: 12,
  },
  actionButtonLarge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 10,
    gap: 8,
  },
  actionButtonLargeText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
 
  // Notification badge in header
  notificationBadgeHeader: {
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  notificationTextHeader: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
 
  // Empty state
  emptyStateContainer: {
    width: '100%',
    alignItems: 'center',
    paddingVertical: 80
  },
  emptyStateText: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: '600'
  },
 
  // PRODUCT DETAIL MODAL STYLES - WITH COLOR QUANTITY DISPLAY
  productDetailContainer: { 
    flex: 1 
  },
  productDetailHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingHorizontal: 16, 
    paddingVertical: 14, 
    borderBottomWidth: 1 
  },
  closeButton: { 
    padding: 4 
  },
  productDetailTitle: { 
    fontSize: 17, 
    fontWeight: '700' 
  },
  productDetailContent: { 
    flex: 1 
  },
  
  // Media Gallery with Color Selection
  mediaGalleryContainer: {
    padding: 16,
    alignItems: 'center',
  },
  mainMedia: {
      width: '100%',
      height: 350,
    borderRadius: 16,
    backgroundColor: '#f5f5f5',
  },
  colorMediaSelector: {
    marginTop: 12,
    marginBottom: 12,
  },
  colorMediaSelectorTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  colorChipsHorizontal: {
    flexDirection: 'row',
  },
  colorChipMedia: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: 'transparent',
    gap: 6,
  },
  colorChipMediaHasMedia: {
    borderWidth: 2,
  },
  colorChipMediaText: {
    fontSize: 13,
    fontWeight: '500',
  },
  colorChipMediaTextActive: {
    fontWeight: 'bold',
  },
  colorMediaCount: {
    fontSize: 11,
    opacity: 0.8,
  },
  
  thumbnailScroll: {
    marginTop: 8,
    paddingVertical: 8,
  },
  thumbnailContainer: {
    width: 70,
    height: 70,
    borderRadius: 8,
    marginRight: 8,
    borderWidth: 2,
    borderColor: 'transparent',
    overflow: 'hidden',
    position: 'relative',
  },
  activeThumbnail: {
    borderColor: '#FF9900',
  },
  thumbnailWithColor: {
    borderWidth: 2,
  },
  videoThumbnailWrapper: {
    position: 'relative',
    width: '100%',
    height: '100%',
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
    borderRadius: 6,
  },
  videoOverlay: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 8,
    padding: 4,
  },
  
  // Color Indicator
  colorIndicator: {
    position: 'absolute',
    top: 4,
    left: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FF9900',
  },
  colorIndicatorText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  
  // Product Info Card
  productInfoCard: {
    padding: 20,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginTop: -20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 10,
  },
  productHeader: {
    marginBottom: 20,
  },
  productTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 12,
    lineHeight: 30,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 12,
  },
  sellingPrice: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  originalPrice: {
    fontSize: 20,
    textDecorationLine: 'line-through',
  },
  discountBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  discountText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  
  // Stock Card
  stockCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  stockHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  stockTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  stockDetails: {
    paddingLeft: 4,
  },
  stockItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  stockLabel: {
    fontSize: 14,
  },
  stockValue: {
    fontSize: 16,
  },
  
  // Details Section
  detailsSection: {
    marginBottom: 20,
  },
  detailItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  detailLabel: {
    fontSize: 14,
    flex: 1,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '500',
    flex: 2,
    textAlign: 'right',
  },
  
  // Size Section
  sizeSection: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  sizeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  sizeItem: {
    flexDirection: 'column',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    width: '30%',
    minWidth: 80,
  },
  sizeLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  sizeQtyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  sizeQtyText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  
  // Color Section with Quantity
  colorSection: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  colorChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  colorChipWithQty: {
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
    width: '100%',
  },
  colorChipHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  colorText: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  colorQtyBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  colorQtyText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  colorMediaInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    gap: 4,
    alignSelf: 'flex-start',
  },
  colorMediaCountBadge: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  
  // Delivery Section
  deliverySection: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  deliveryOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 10,
    gap: 16,
  },
  deliveryInfo: {
    flex: 1,
  },
  deliveryTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  deliveryDescription: {
    fontSize: 14,
  },
  
  // Description Section
  descriptionSection: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  descriptionText: {
    fontSize: 15,
    lineHeight: 22,
    marginTop: 8,
  },
  
  // Action Buttons
  actionButtonsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  editButton: {},
  deleteButton: {},
 
  // NEW: Color Media Modal Styles
  colorMediaOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  colorMediaContainer: {
    width: '100%',
    maxWidth: 500,
    maxHeight: '80%',
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  colorMediaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  colorMediaTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
    marginRight: 16,
  },
  colorMediaContent: {
    padding: 20,
    maxHeight: 400,
  },
  colorMediaDescription: {
    fontSize: 14,
    marginBottom: 16,
    lineHeight: 20,
  },
  mediaSelectionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'center',
  },
  mediaSelectItem: {
    width: 100,
    height: 100,
    borderRadius: 10,
    borderWidth: 2,
    overflow: 'hidden',
    position: 'relative',
  },
  mediaSelectItemSelected: {
    borderWidth: 3,
  },
  mediaSelectThumbnail: {
    width: '100%',
    height: '100%',
  },
  videoIndicator: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 12,
    paddingHorizontal: 6,
    paddingVertical: 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  selectedCheckmark: {
    position: 'absolute',
    top: 6,
    left: 6,
  },
  assignedCount: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 16,
    textAlign: 'center',
  },
  colorMediaFooter: {
    padding: 16,
    borderTopWidth: 1,
  },
  colorMediaDoneButton: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  colorMediaDoneText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
 
  // Add Product Modal Styles - UPDATED WITH COLOR QUANTITY INPUT
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1 },
  cancelText: { fontSize: 16 },
  publishText: { fontSize: 16, fontWeight: 'bold' },
  formScroll: { flex: 1 },
  sectionContainer: { marginTop: 12, paddingVertical: 16, paddingHorizontal: 16, borderTopWidth: 1, borderBottomWidth: 1 },
  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  sectionSubtitle: { fontSize: 14 },
  mediaRow: { flexDirection: 'row' },
  addMediaBox: { width: 100, height: 100, borderRadius: 8, borderWidth: 1, borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  addMediaText: { marginTop: 4, fontWeight: '600' },
  mediaItemContainer: { position: 'relative', marginRight: 12 },
  formMediaThumbnail: { width: 100, height: 100, borderRadius: 8, backgroundColor: '#eee' },
  coverBadge: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingVertical: 4, borderBottomLeftRadius: 8, borderBottomRightRadius: 8, alignItems: 'center' },
  coverBadgeText: { color: '#fff', fontSize: 10, fontWeight: 'bold', textTransform: 'uppercase' },
  videoPlayIcon: { position: 'absolute', top: '50%', left: '50%', transform: [{ translateX: -20 }, { translateY: -20 }] },
  videoBadge: { position: 'absolute', top: 8, right: 8, borderRadius: 12, paddingHorizontal: 8, paddingVertical: 4, flexDirection: 'row', alignItems: 'center' },
  removeMediaBtn: { position: 'absolute', top: -6, right: -6, borderRadius: 12 },
  inputLabel: { fontSize: 14, fontWeight: '600', marginBottom: 6 },
  proInput: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 12, fontSize: 16 },
  textArea: { minHeight: 100, textAlignVertical: 'top' },
  charCount: { alignSelf: 'flex-end', fontSize: 12, marginTop: 4, marginBottom: 12 },
  rowInputs: { flexDirection: 'row', marginBottom: 10 },
  currencyInput: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 8, paddingHorizontal: 12 },
  currencyPrefix: { fontSize: 16, marginRight: 4, fontWeight: '500' },
  currencyInputField: { flex: 1, paddingVertical: 12, fontSize: 16, fontWeight: '600' },
  discountBadge: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4, gap: 4, marginTop: 10 },
  discountText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  qtyInput: { width: 100, height: 50, borderWidth: 1.5, borderRadius: 12, justifyContent: 'center' },
  categoryChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, marginRight: 8, borderWidth: 1, borderColor: 'transparent' },
  categoryChipActive: { borderColor: '#FF9900' },
  categoryText: { fontSize: 14 },
  categoryTextActive: { fontWeight: 'bold' },
  tagInputContainer: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8 },
  tagContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  colorWithQtyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    width: '100%',
    marginBottom: 8,
  },
  tag: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingHorizontal: 10, 
    paddingVertical: 6, 
    borderRadius: 6, 
    gap: 6,
    flex: 1,
  },
  tagText: { fontSize: 14 },
  colorQtyInputContainer: {
    borderWidth: 1,
    borderRadius: 6,
    width: 70,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  colorQtyInput: {
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '600',
    width: '100%',
    height: '100%',
  },
  assignMediaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 6,
    gap: 4,
  },
  assignMediaButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  sizeGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 12, marginTop: 10 },
  sizeCircle: { paddingHorizontal: 18, paddingVertical: 10, borderRadius: 20, borderWidth: 1.5, minWidth: 70, alignItems: 'center' },
  sizeCircleActive: { borderColor: '#FF9900' },
  sizeText: { fontSize: 14, fontWeight: '600' },
  sizeTextActive: { color: '#fff', fontWeight: 'bold' },
  stockInput: { marginTop: 8, width: 70, borderWidth: 1.5, borderRadius: 10, paddingVertical: 8, textAlign: 'center', fontSize: 15, fontWeight: '600' },
  radioGroup: { gap: 16 },
  radioRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  radioText: { fontSize: 16 },

  // Input Hint
  inputHint: {
    fontSize: 12,
    marginTop: 6,
    fontStyle: 'italic',
  },

  // University Dropdown Styles
  universitySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 14,
  },
  universitySelectedText: {
    fontSize: 16,
    flex: 1,
  },
  universityPlaceholderText: {
    fontSize: 16,
    flex: 1,
  },
  universityDropdown: {
    marginTop: 8,
    borderRadius: 8,
    borderWidth: 1,
    maxHeight: 250,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
    paddingVertical: 4,
  },
  universityDropdownList: {
    maxHeight: 200,
  },
  universityListContainer: {
    paddingBottom: 8,
  },
  universityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  universityItemSelected: {
    backgroundColor: '#fff9f0',
  },
  universityItemText: {
    fontSize: 16,
    flex: 1,
    marginRight: 10,
  },
  universityItemTextSelected: {
    fontWeight: '600',
  },
  emptyUniversityContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    paddingHorizontal: 16,
  },
  emptyUniversityText: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: '600',
  },

  // University Display Container for Location
  universityDisplayContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minHeight: 48,
  },
  universityDisplayText: {
    fontSize: 16,
    fontWeight: '600',
    marginRight: 8,
  },
  locationInputContainer: {
    flex: 1,
  },
  locationAdditionalInput: {
    borderWidth: 0,
    backgroundColor: 'transparent',
    paddingHorizontal: 0,
    paddingVertical: 0,
    fontSize: 16,
  },

  // Orders Modal
  ordersContainer: { flex: 1 },
  ordersHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1
  },
  ordersTitle: { fontSize: 17, fontWeight: '700' },
  ordersListContainer: { padding: 16 },
});