import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  Platform,
  Modal,
  SafeAreaView,
  StatusBar,
  RefreshControl,
  useColorScheme,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { getSelectedCampus } from '@/lib/campus';
import OrderFormModal from './components/OrderFormModal';
import CartModal from './components/CartModal';
import FullImageViewer from './components/FullImageViewer';
import ProductDetailModal from './components/ProductDetailModal';
import ProfessionalCategoriesDrawer from './components/ProfessionalCategoriesDrawer';
import SearchSuggestions from './components/SearchSuggestions';
import AdvancedSearchPanel from './components/AdvancedSearchPanel';
import { categoryStructure } from './components/categoryStructure';
import SellerProfileModal from '../home/components/SellerProfileModal';

// === Helper function to send order notification to buyer ===
const sendOrderNotificationToBuyer = async (orderData: any) => {
  try {
    // Prevent duplicate notifications for the same order/user
    try {
      const { data: existing, error: fetchErr } = await supabase
        .from('buyer_notifications')
        .select('id')
        .eq('order_id', orderData.order_id)
        .eq('user_id', orderData.user_id)
        .eq('type', 'order_placed')
        .limit(1)
        .single();
      if (!fetchErr && existing) {
        // A notification for this order and user already exists — skip inserting duplicate
        return;
      }
    } catch (e) {
      // ignore lookup errors and continue to insert to avoid blocking order flow
      console.warn('Error checking existing buyer notification:', e);
    }

    const { error } = await supabase
      .from('buyer_notifications')
      .insert({
        user_id: orderData.user_id,
        order_id: orderData.order_id,
        type: 'order_placed',
        title: 'Order Placed Successfully',
        message: `Your order #${orderData.order_id.slice(-8)} has been placed successfully.`,
        data: {
          order_id: orderData.order_id,
          total_amount: orderData.total_amount,
          status: 'pending',
          timestamp: new Date().toISOString(),
        },
        is_read: false,
        created_at: new Date().toISOString(),
      });
    if (error) {
      console.warn('Buyer notification insert error:', error);
    }
  } catch (error) {
    console.warn('Error sending notification to buyer:', error);
  }
};

const SUPABASE_URL = 'https://qwujadyqebfypyhfuwfl.supabase.co';
const PRIMARY_COLOR = '#F68B1E';
const LIGHT_BACKGROUND = '#FFFFFF';
const DARK_BACKGROUND = '#121212';
const LIGHT_TEXT = '#333333';
const DARK_TEXT = '#FFFFFF';

// === ALERT BUTTON INTERFACE ===
interface AlertButton {
  text: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive';
}

// === CUSTOM ALERT SYSTEM ===
const CustomAlert = ({ visible, title, message, buttons, onClose, isDark }: any) => {
  if (!visible) return null;

  const textColor = isDark ? DARK_TEXT : LIGHT_TEXT;
  const borderColor = isDark ? '#333' : '#e0e0e0';
  const cardBackground = isDark ? '#1e1e1e' : '#ffffff';

  return (
    <Modal
      transparent={true}
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={[styles.alertOverlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
        <View style={[styles.alertContainer, { backgroundColor: cardBackground, borderColor: borderColor }]}>
          <Text style={[styles.alertTitle, { color: textColor }]}>{title}</Text>
          <Text style={[styles.alertMessage, { color: isDark ? '#ccc' : '#666' }]}>{message}</Text>
          <View style={styles.alertButtons}>
            {buttons.map((button: any, index: number) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.alertButton,
                  index === 0 ? styles.alertButtonPrimary : styles.alertButtonSecondary,
                  index === 0 ? { backgroundColor: PRIMARY_COLOR } : { backgroundColor: cardBackground, borderColor: borderColor }
                ]}
                onPress={() => {
                  button.onPress && button.onPress();
                  onClose();
                }}
              >
                <Text style={[
                  styles.alertButtonText,
                  index === 0 ? { color: '#000' } : { color: textColor }
                ]}>
                  {button.text}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
};

// === INTERFACES ===
interface Product {
  id: string;
  title: string;
  description?: string;
  price: number;
  original_price: number | null;
  quantity?: number;
  media_urls: string[];
  seller_id: string;
  display_name: string;
  avatar_url: string;
  university: string;
  hasDiscount: boolean;
  discountPercent: number | null;
  isVideo: boolean;
  score: number;
  commentCount?: number;
  likeCount?: number;
  shareCount?: number;
  followerCount?: number;
  isLiked?: boolean;
  isFollowed?: boolean;
  inCart?: boolean;
  category: string;
  brand: string | null;
  delivery_option: string;
  is_pre_order?: boolean;
  pre_order_duration?: number;
  pre_order_duration_unit?: 'days' | 'weeks' | 'months';
  sizes_available?: string[];
  colors_available?: string[];
  color_media?: Record<string, string[]>;
  color_stock?: Record<string, number>;
  size_stock?: Record<string, number>;
  sub_category?: string;
  gender?: string;
}

interface CartItem {
  product: Product;
  quantity: number;
  added_at: string;
  selectedColor?: string;
  selectedSize?: string;
}

interface OrderFormData {
  fullName: string;
  phoneNumber: string;
  location: string;
  deliveryOption: 'Meetup / Pickup' | 'Campus Delivery';
  additionalNotes?: string;
  selectedColor?: string;
  selectedSize?: string;
  quantity?: number;
}

interface SearchSuggestion {
  id: string;
  type: 'product' | 'category' | 'shop';
  value: string;
  label: string;
}

type CategorySection = {
  title: string;
  data: Product[];
};

const { width, height } = Dimensions.get('window');

// === UTILITY FUNCTIONS ===
const getCurrentUserId = async () => {
  const { data } = await supabase.auth.getUser();
  return data?.user?.id ?? null;
};

// Get browsing campus (selected on onboarding) + seller status if logged in
const getCurrentUserUniversity = async () => {
  try {
    const selectedCampus = await getSelectedCampus();
    const userId = await getCurrentUserId();

    if (!userId) {
      return selectedCampus ? { university: selectedCampus, is_seller: false } : null;
    }

    const { data, error } = await supabase
      .from('user_profiles')
      .select('university, is_seller')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Error fetching user university:', error);
      return selectedCampus ? { university: selectedCampus, is_seller: false } : null;
    }

    return {
      university: data?.university || selectedCampus || null,
      is_seller: !!data?.is_seller,
    };
  } catch (error) {
    console.error('Error in getCurrentUserUniversity:', error);
    return null;
  }
};

const extractKeywords = (title: string): string[] => {
  const commonWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by']);
  return title
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 2 && !commonWords.has(word))
    .slice(0, 5);
};

// === MEDIA UTILITY FUNCTIONS ===
/**
 * Check if a media URL is a video
 */
const isVideoUrl = (url: string): boolean => {
  if (!url) return false;
  const lowerUrl = url.toLowerCase();
  return lowerUrl.includes('.mp4') || 
         lowerUrl.includes('.mov') || 
         lowerUrl.includes('.avi') ||
         lowerUrl.includes('.webm') ||
         lowerUrl.includes('.wmv');
};

/**
 * Get the media URL for product cards
 * If the first media is a video, returns the next media (usually an image)
 * Otherwise returns the first media
 */
const getCardDisplayMedia = (mediaUrls: string[] | undefined): string | undefined => {
  if (!mediaUrls || mediaUrls.length === 0) return undefined;
  
  // If first media is a video, try to get the next one
  if (isVideoUrl(mediaUrls[0])) {
    // If there's a second media, return it
    if (mediaUrls.length > 1) {
      return mediaUrls[1];
    }
    // If no second media, try to find first non-video
    const imageUrl = mediaUrls.find(url => !isVideoUrl(url));
    return imageUrl || mediaUrls[0];
  }
  
  // First media is not a video, return it
  return mediaUrls[0];
};

const matchesAdminStyleProductSearch = (product: Product, rawQuery: string) => {
  const query = rawQuery.trim().toLowerCase();
  if (!query) return true;

  const title = (product.title || '').toLowerCase();
  const description = (product.description || '').toLowerCase();
  const category = (product.category || '').toLowerCase();
  const subCategory = (product.sub_category || '').toLowerCase();
  const brand = (product.brand || '').toLowerCase();
  const gender = (product.gender || '').toLowerCase();
  const deliveryOption = (product.delivery_option || '').toLowerCase();
  const colors = (product.colors_available || []).join(' ').toLowerCase();
  const sizes = (product.sizes_available || []).join(' ').toLowerCase();
  const quantity = String(product.quantity ?? '').toLowerCase();
  const shopName = (product.display_name || '').toLowerCase();

  return (
    title.includes(query) ||
    description.includes(query) ||
    category.includes(query) ||
    subCategory.includes(query) ||
    brand.includes(query) ||
    gender.includes(query) ||
    deliveryOption.includes(query) ||
    colors.includes(query) ||
    sizes.includes(query) ||
    quantity.includes(query) ||
    shopName.includes(query)
  );
};

// === CART MANAGER ===
const useCart = (
  showAlert: (title: string, message: string, buttons?: AlertButton[]) => void,
  onRequireAuth: (action?: string) => void,
) => {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [cartVisible, setCartVisible] = useState(false);

  useEffect(() => {
    loadCart();
  }, []);

  const loadCart = async () => {
    try {
      const userId = await getCurrentUserId();
      if (!userId) {
        setCartItems([]);
        return;
      }

      const { data, error } = await supabase
        .from('cart_items')
        .select('product_id, quantity, added_at, selected_color, selected_size, products(*)')
        .eq('user_id', userId);

      if (error) throw error;

      const items: CartItem[] = (data || []).map((item: any) => ({
        product: item.products,
        quantity: item.quantity,
        added_at: item.added_at,
        selectedColor: item.selected_color,
        selectedSize: item.selected_size,
      }));

      setCartItems(items);
    } catch (error) {
      console.error('Error loading cart:', error);
      setCartItems([]);
    }
  };

  const saveCart = async (items: CartItem[]) => {
    try {
      const userId = await getCurrentUserId();
      if (!userId) {
        return;
      }

      if (userId) {
        await supabase.from('cart_items').delete().eq('user_id', userId);
        
        const cartItemsToInsert = items.map(item => ({
          user_id: userId,
          product_id: item.product.id,
          quantity: item.quantity,
          selected_color: item.selectedColor || null,
          selected_size: item.selectedSize || null,
          added_at: new Date().toISOString(),
        }));

        if (cartItemsToInsert.length > 0) {
          await supabase.from('cart_items').insert(cartItemsToInsert);
        }
      }
    } catch (error) {
      console.error('Error saving cart:', error);
    }
  };

  const addToCart = async (product: Product, selectedColor?: string, selectedSize?: string, quantity: number = 1) => {
    const userId = await getCurrentUserId();
    if (!userId) {
      onRequireAuth('add items to your cart');
      throw new Error('User not authenticated');
    }

    const existingItemIndex = cartItems.findIndex(item => 
      item.product.id === product.id && 
      item.selectedColor === selectedColor && 
      item.selectedSize === selectedSize
    );
    
    let newCartItems: CartItem[];

    // Prevent duplicate additions - throw error if product already exists
    if (existingItemIndex >= 0) {
      throw new Error('Product is already in cart');
    } else {
      newCartItems = [...cartItems, {
        product,
        quantity,
        selectedColor,
        selectedSize,
        added_at: new Date().toISOString(),
      }];
    }

    setCartItems(newCartItems);
    await saveCart(newCartItems);
    showAlert('Added to Cart', 'Product has been added to your cart successfully!');
    return newCartItems;
  };

  const removeFromCart = async (productId: string, selectedColor?: string, selectedSize?: string) => {
    const userId = await getCurrentUserId();
    if (!userId) {
      onRequireAuth('manage your cart');
      throw new Error('User not authenticated');
    }

    const newCartItems = cartItems.filter(item => 
      !(item.product.id === productId && 
        item.selectedColor === selectedColor && 
        item.selectedSize === selectedSize)
    );
    setCartItems(newCartItems);
    await saveCart(newCartItems);
    showAlert('Removed', 'Product has been removed from your cart');
    return newCartItems;
  };

  const updateQuantity = async (productId: string, quantity: number, selectedColor?: string, selectedSize?: string) => {
    const userId = await getCurrentUserId();
    if (!userId) {
      onRequireAuth('update your cart');
      throw new Error('User not authenticated');
    }

    if (quantity < 1) {
      return removeFromCart(productId, selectedColor, selectedSize);
    }

    const newCartItems = cartItems.map(item =>
      (item.product.id === productId && 
       item.selectedColor === selectedColor && 
       item.selectedSize === selectedSize) 
        ? { ...item, quantity } 
        : item
    );

    setCartItems(newCartItems);
    await saveCart(newCartItems);
    return newCartItems;
  };

  const clearCart = async () => {
    const userId = await getCurrentUserId();
    if (!userId) {
      onRequireAuth('clear your cart');
      throw new Error('User not authenticated');
    }

    setCartItems([]);
    await saveCart([]);
    showAlert('Cart Cleared', 'All items have been removed from your cart');
  };

  const getCartCount = () => {
    return cartItems.reduce((total, item) => total + item.quantity, 0);
  };

  const getCartTotal = () => {
    return cartItems.reduce((total, item) => total + (item.product.price * item.quantity), 0);
  };

  return {
    cartItems,
    cartVisible,
    setCartVisible,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    getCartCount,
    getCartTotal,
    loadCart,
  };
};

// Helper function to format delivery option
const formatDeliveryOption = (option: string): string => {
  const deliveryMap: Record<string, string> = {
    'Meetup / Pickup': 'Meetup / Pickup',
    'Campus Delivery': 'Campus Delivery',
    'Meetup / Pickup and Campus Delivery': 'Campus Delivery and Meetup / Pickup',
    'Remote': 'Remote Service',
    'On-site': 'On-site Service',
    // Legacy values for backward compatibility
    'Meet/pickup': 'Meetup / Pickup',
    'Campus delivery': 'Campus Delivery',
    'pickup': 'Meetup / Pickup',
    'delivery': 'Campus Delivery',
    'campus delivery': 'Campus Delivery',
    'both': 'Campus Delivery and Meetup / Pickup',
    'remote': 'Remote Service',
    'on-site': 'On-site Service',
    'nationwide': 'Nationwide Delivery'
  };
  
  return deliveryMap[option] || option;
};

// === HELPER FUNCTIONS ===
const sendOrderNotificationToSeller = async (orderData: any) => {
  try {
    const { error } = await supabase
      .from('seller_notifications')
      .insert({
        seller_id: orderData.seller_id,
        order_id: orderData.order_id,
        type: 'new_order',
        title: 'New Order Received',
        message: `New order for ${orderData.product_name} from ${orderData.buyer_name}`,
        data: {
          product_name: orderData.product_name,
          product_price: orderData.product_price,
          product_image: orderData.product_image,
          quantity: orderData.quantity,
          total_amount: orderData.total_amount,
          buyer_name: orderData.buyer_name,
          buyer_phone: orderData.buyer_phone,
          delivery_option: orderData.delivery_option,
          location: orderData.location,
          selected_color: orderData.selected_color,
          selected_size: orderData.selected_size,
          timestamp: new Date().toISOString(),
        },
        is_read: false,
        created_at: new Date().toISOString(),
      });
    if (error) throw error;
  } catch (error) {
    console.error('Error sending notification to seller:', error);
  }
};

// === ADVERTISEMENT BANNER ===
const AdvertisementBanner = () => {
  const [currentAd, setCurrentAd] = useState(0);
  const colorScheme = useColorScheme();
  const ads = [
    {
      id: 1,
      image: 'https://images.pexels.com/photos/33008590/pexels-photo-33008590.jpeg',
      title: 'Flash Sale!',
      description: 'Get intouch for amazing deals'
    },
    {
      id: 2,
      image: 'https://images.pexels.com/photos/4439456/pexels-photo-4439456.jpeg',
      title: 'Yor Delivery Choice',
      description: 'We deliver to your location'
    },
    {
      id: 3,
      image: 'https://images.pexels.com/photos/12883028/pexels-photo-12883028.jpeg',
      title: 'New Arrivals',
      description: 'Check out the latest products'
    }
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentAd((prev) => (prev + 1) % ads.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [ads.length]);

  const isDark = colorScheme === 'dark';

  return (
    <View style={[styles.adBannerContainer, { backgroundColor: isDark ? '#1e1e1e' : '#f8f8f8' }]}>
      <Image 
        source={{ uri: ads[currentAd].image }} 
        style={styles.adBannerImage}
        resizeMode="cover"
      />
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.7)']}
        style={styles.adBannerGradient}
      >
        <View style={styles.adBannerContent}>
          <Text style={styles.adBannerTitle}>{ads[currentAd].title}</Text>
          <Text style={styles.adBannerDescription}>{ads[currentAd].description}</Text>
        </View>
      </LinearGradient>
      <View style={styles.adBannerPagination}>
        {ads.map((_, index) => (
          <View 
            key={index} 
            style={[
              styles.adBannerDot, 
              currentAd === index && styles.adBannerDotActive
            ]} 
          />
        ))}
      </View>
    </View>
  );
};

// Helper function to get icons for categories
const getCategoryIcon = (category: string) => {
  const iconMap: Record<string, string> = {
    'fashion': 'shirt-outline',
    'electronics': 'phone-portrait-outline',
    'beauty': 'sparkles-outline',
    'beauty services': 'sparkles-outline',
    'home': 'home-outline',
    'sports': 'basketball-outline',
    'books': 'book-outline',
    'glossary': 'book-outline',
    'food': 'fast-food-outline',
    'services': 'construct-outline',
    'academics': 'school-outline',
    'stationery': 'pencil-outline',
    'gadgets': 'hardware-chip-outline',
    'clothing': 'shirt-outline',
    'accessories': 'glasses-outline',
    'furniture': 'bed-outline',
    'kitchen': 'restaurant-outline',
    'health': 'fitness-outline',
    'transport': 'car-outline',
    'real estate': 'business-outline',
    'jobs': 'briefcase-outline',
  };
  
  const lowerCategory = category.toLowerCase();
  return iconMap[lowerCategory] || 'pricetag-outline';
};

// Helper function to get icons for service sub-categories
const getServiceSubCategoryIcon = (subCategory: string) => {
  const iconMap: Record<string, string> = {
    'tutoring': 'school-outline',
    'photography': 'camera-outline',
    'graphic design': 'color-palette-outline',
    'writing': 'create-outline',
    'delivery': 'bicycle-outline',
    'repair': 'build-outline',
    'fitness training': 'barbell-outline',
    'catering': 'restaurant-outline',
    'beauty services': 'cut-outline',
    'other services': 'ellipsis-horizontal-outline',
  };

  const key = subCategory.toLowerCase();
  return iconMap[key] || 'briefcase-outline';
};

// Helper function to get icons for product sub-categories
const getProductSubCategoryIcon = (mainCategory: string, subCategory: string) => {
  const map: Record<string, Record<string, string>> = {
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
    Other: {
      'Everything else': 'apps-outline',
    },
  };

  return map[mainCategory]?.[subCategory] || 'pricetag-outline';
};

// Helper function to get icons for Beauty Services tertiary types
const getBeautyServiceTypeIcon = (beautyType: string) => {
  const iconMap: Record<string, string> = {
    'makeup application': 'brush-outline',
    'hair services': 'cut-outline',
    'barbering': 'cut-outline',
    'facials & skincare': 'sparkles-outline',
    'nails (manicure/pedicure)': 'hand-left-outline',
    'waxing': 'flame-outline',
    'threading': 'remove-outline',
    'massage & spa': 'water-outline',
    'tattoo': 'brush-outline',
    'piercing': 'aperture-outline',
    'other beauty services': 'ellipsis-horizontal-outline',
  };

  const key = beautyType.toLowerCase();
  return iconMap[key] || 'sparkles-outline';
};

// === MAIN SEARCH SCREEN ===
export default function SearchScreen() {
  const [query, setQuery] = useState('');
  const [sections, setSections] = useState<CategorySection[]>([]);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [trendingProducts, setTrendingProducts] = useState<Product[]>([]);
  const [numColumns, setNumColumns] = useState(() => {
    if (width >= 1024) return 6;
    else if (width >= 768) return 5;
    else if (width >= 600) return 4;
    return 3;
  });
  const params = useLocalSearchParams();
  const [hasHandledProductLink, setHasHandledProductLink] = useState(false);
  
  // NEW: User university and seller status state
  const [userUniversity, setUserUniversity] = useState<string | null>(null);
  const [isUserSeller, setIsUserSeller] = useState<boolean>(false);
  const [userId, setUserId] = useState<string | null>(null);

  // Advanced search state
  const [searchParams, setSearchParams] = useState({
    productName: '',
    category: '',
    shopName: '',
  });
  const [advancedSearchVisible, setAdvancedSearchVisible] = useState(false);

  // Search suggestions state
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Product detail modal state
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [productDetailVisible, setProductDetailVisible] = useState(false);
  const [fullViewerIndex, setFullViewerIndex] = useState(-1);

  // Seller profile modal
  const [sellerProfileVisible, setSellerProfileVisible] = useState(false);
  const [selectedSellerId, setSelectedSellerId] = useState<string>('');

  // Order form modal
  const [orderFormVisible, setOrderFormVisible] = useState(false);
  const [orderForProduct, setOrderForProduct] = useState<Product | null>(null);
  const [orderInitialOptions, setOrderInitialOptions] = useState<{ selectedColor?: string | null; selectedSize?: string | null; quantity?: number | null }>({});
  const [isCartOrder, setIsCartOrder] = useState(false);

  // "See all" modal state
  const [categoryModalVisible, setCategoryModalVisible] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<CategorySection | null>(null);

  // Categories drawer state
  const [categoriesDrawerVisible, setCategoriesDrawerVisible] = useState(false);
  const [allCategories, setAllCategories] = useState<string[]>([]);
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string | null>(null);
  const [selectedSubCategoryFilter, setSelectedSubCategoryFilter] = useState<string | null>(null);

  // Custom Alert system
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertTitle, setAlertTitle] = useState('');
  const [alertMessage, setAlertMessage] = useState('');
  const [alertButtons, setAlertButtons] = useState<any[]>([{ text: 'OK' }]);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const router = useRouter();

  const showAlert = (title: string, message: string, buttons?: any[]) => {
    setAlertTitle(title);
    setAlertMessage(message);
    setAlertButtons(buttons || [{ text: 'OK' }]);
    setAlertVisible(true);
  };

  const requireAuth = (action: string = 'continue') => {
    showAlert(
      'Login Required',
      `Please log in or sign up to ${action}.`,
      [
        { text: 'Maybe later', style: 'cancel' },
        { text: 'Login / Sign up', onPress: () => router.push('/auth') },
      ],
    );
  };

  const hideAlert = () => {
    setAlertVisible(false);
  };

  const scoreAndSortProducts = (products: any[]) => {
    return products;
  };

  const handleHeaderPress = () => {
    setSelectedCategoryFilter(null);
    setSelectedSubCategoryFilter(null);
    setSearchParams({ productName: '', category: '', shopName: '' });
    setShowSuggestions(false);
    loadInitialProducts();
  };

  // Cart hook - pass showAlert to it
  const {
    cartItems,
    cartVisible,
    setCartVisible,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    getCartCount,
    getCartTotal,
    loadCart,
  } = useCart(showAlert, requireAuth);

  const colorScheme = useColorScheme();
  const HORIZONTAL_PADDING = 16;
  const GAP = 12;

  // Fetch user university and seller status on mount
  useEffect(() => {
    const fetchUserInfo = async () => {
      try {
        const currentUserId = await getCurrentUserId();
        setUserId(currentUserId);
        setIsAuthenticated(!!currentUserId);
        
        const userInfo = await getCurrentUserUniversity();
        if (userInfo) {
          setUserUniversity(userInfo.university);
          setIsUserSeller(userInfo.is_seller || false);
        }
      } catch (error) {
        console.error('Error fetching user info:', error);
        setIsAuthenticated(false);
      }
    };
    
    fetchUserInfo();
  }, []);

  // Fetch all categories on mount
  useEffect(() => {
    fetchAllCategories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      if (window.width >= 1024) setNumColumns(6);
      else if (window.width >= 768) setNumColumns(5);
      else if (window.width >= 600) setNumColumns(4);
      else setNumColumns(3);
    });
    return () => subscription?.remove();
  }, []);

  // Fetch search suggestions
  const fetchSearchSuggestions = async (text: string) => {
    if (text.length < 2) {
      setSuggestions([]);
      return;
    }

    try {
      const suggestionsList: SearchSuggestion[] = [];

      // Fetch product name suggestions
      const { data: productData } = await supabase
        .from('products')
        .select('id, title')
        .ilike('title', `%${text}%`)
        .limit(5);

      if (productData) {
        productData.forEach(product => {
          suggestionsList.push({
            id: `product_${product.id}`,
            type: 'product',
            value: product.title,
            label: 'Product',
          });
        });
      }

      // Fetch category suggestions
      const { data: categoryData } = await supabase
        .from('products')
        .select('category')
        .ilike('category', `%${text}%`)
        .limit(5);

      if (categoryData) {
        const uniqueCategories = [...new Set(categoryData.map(item => item.category))];
        uniqueCategories.forEach(category => {
          suggestionsList.push({
            id: `category_${category}`,
            type: 'category',
            value: category,
            label: 'Category',
          });
        });
      }

      // Fetch shop name suggestions
      const { data: shopData } = await supabase
        .from('shops')
        .select('id, name')
        .ilike('name', `%${text}%`)
        .limit(5);

      if (shopData) {
        shopData.forEach(shop => {
          suggestionsList.push({
            id: `shop_${shop.id}`,
            type: 'shop',
            value: shop.name,
            label: 'Shop',
          });
        });
      }

      // Remove duplicates
      const uniqueSuggestions = suggestionsList.filter(
        (suggestion, index, self) =>
          index === self.findIndex(s => s.value === suggestion.value && s.type === suggestion.type)
      );

      setSuggestions(uniqueSuggestions.slice(0, 10));
    } catch (error) {
      console.error('Error fetching suggestions:', error);
    }
  };

  // Debounced search for suggestions
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchSearchSuggestions(query);
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [query]);

  const fetchAllCategories = async () => {
    try {
      // Get categories filtered by university for non-sellers
      let query = supabase
        .from('products')
        .select('category');
      
      // Apply university filter for non-sellers
      if (userUniversity && !isUserSeller) {
        // For buyers, we need to filter products by seller's university
        // This requires a join with user_profiles, which we'll handle in the main product fetch
        // For categories, we'll get all categories that have products from the user's university
        const { data: productsData, error: productsError } = await supabase
          .from('products')
          .select('category, seller_id');

        if (productsError) throw productsError;

        let filteredProducts: { category: string | null; seller_id: string }[] = [];
        if (productsData) {
          const sellerIds = [...new Set(productsData.map((p) => p.seller_id))];

          const { data: sellerProfiles } = await supabase
            .from('user_profiles')
            .select('id, university')
            .in('id', sellerIds);

          filteredProducts = productsData.filter((p) => {
            const sellerProfile = sellerProfiles?.find((sp) => sp.id === p.seller_id);
            return sellerProfile?.university === userUniversity;
          });
        }
        
        if (filteredProducts) {
          const uniqueCategories = Array.from(new Set(filteredProducts.map((item) => item.category).filter(Boolean))) as string[];
          setAllCategories(uniqueCategories.sort());
          return;
        }
      }
      
      // For sellers or when no university filter is needed
      const { data, error } = await query
        .not('category', 'is', null);

      if (error) throw error;

      if (data) {
        const uniqueCategories = Array.from(new Set(data.map(item => item.category).filter(Boolean))) as string[];
        setAllCategories(uniqueCategories.sort());
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  // Update categories when user info changes
  useEffect(() => {
    if (userUniversity !== null) {
      fetchAllCategories();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userUniversity, isUserSeller]);

  const fetchFeaturedProducts = async () => {
    try {
      let query = supabase
        .from('products')
        .select('id, title, description, price, original_price, quantity, media_urls, category, brand, delivery_option, seller_id, created_at, sizes_available, colors_available, color_media, color_stock, size_stock, is_pre_order, pre_order_duration, pre_order_duration_unit')
        .order('created_at', { ascending: false })
        .limit(20); // Fetch more to ensure enough for both sections

      const { data, error } = await query;
      if (error) throw error;

      if (data) {
        const enrichedProducts = await enrichProductsWithSellerInfo(data as any);
        let filteredProducts = enrichedProducts;
        if (userUniversity && !isUserSeller) {
          filteredProducts = enrichedProducts.filter(product => product.university === userUniversity);
        }
        if (isUserSeller && userId) {
          filteredProducts = enrichedProducts.filter(product => product.seller_id === userId || product.university === userUniversity);
        }
        // Ensure at least 7 products
        if (filteredProducts.length < 7) {
          // If not enough, fetch more (remove limit and re-fetch, or just return all we have)
          return filteredProducts;
        }
        return filteredProducts.slice(0, 7);
      }
      return [];
    } catch (error) {
      console.error('Error fetching featured products:', error);
      return [];
    }
  };

  const fetchTrendingProducts = async () => {
    try {
      let query = supabase
        .from('products')
        .select('id, title, description, price, original_price, quantity, media_urls, category, brand, delivery_option, seller_id, created_at, sizes_available, colors_available, color_media, color_stock, size_stock, is_pre_order, pre_order_duration, pre_order_duration_unit')
        .order('created_at', { ascending: false })
        .limit(20); // Fetch more to ensure enough for both sections

      const { data, error } = await query;
      if (error) throw error;

      if (data) {
        const enrichedProducts = await enrichProductsWithSellerInfo(data as any);
        let filteredProducts = enrichedProducts;
        if (userUniversity && !isUserSeller) {
          filteredProducts = enrichedProducts.filter(product => product.university === userUniversity);
        }
        if (isUserSeller && userId) {
          filteredProducts = enrichedProducts.filter(product => product.seller_id === userId || product.university === userUniversity);
        }
        // Ensure at least 7 products, and don't repeat featured
        if (filteredProducts.length < 7) {
          return filteredProducts;
        }
        // Optionally, skip the first 7 (if featured uses those), or just take the next 7
        return filteredProducts.slice(7, 14);
      }
      return [];
    } catch (error) {
      console.error('Error fetching trending products:', error);
      return [];
    }
  };

  const loadInitialProducts = async () => {
    setInitialLoading(true);
    
    // Fetch featured and trending products first
    const [featured, trending] = await Promise.all([
      fetchFeaturedProducts(),
      fetchTrendingProducts()
    ]);

    setFeaturedProducts(featured);
    setTrendingProducts(trending);

    // Fetch all campus products for Home section or filtered products for specific category
    let query = supabase
      .from('products')
      .select('id, title, description, price, original_price, quantity, media_urls, category, brand, delivery_option, seller_id, created_at, sizes_available, colors_available, color_media, color_stock, size_stock, is_pre_order, pre_order_duration, pre_order_duration_unit')
      .order('created_at', { ascending: false });

    // Only apply category filter when a specific category is selected
    if (selectedCategoryFilter) {
      query = query.eq('category', selectedCategoryFilter);
      // If sub-category is selected, filter by sub-category
      if (selectedSubCategoryFilter) {
        query = query.eq('sub_category', selectedSubCategoryFilter);
      }
      query = query.limit(50);
    } else {
      // For Home section, fetch more products (all products from campus)
      query = query.limit(1000);
    }

    const { data } = await query;

    if (data) {
      const enrichedProducts = await enrichProductsWithSellerInfo(data as any);
      
      // Filter by university for non-sellers
      let filteredProducts = enrichedProducts;
      if (userUniversity && !isUserSeller) {
        filteredProducts = enrichedProducts.filter(product => 
          product.university === userUniversity
        );
      }
      
      // If user is seller, include their own products plus products from their university
      if (isUserSeller && userId) {
        filteredProducts = enrichedProducts.filter(product => 
          product.seller_id === userId || product.university === userUniversity
        );
      }
      
      const grouped = groupByCategory(filteredProducts, selectedCategoryFilter);
      setSections(grouped);
    }
    setInitialLoading(false);
  };

  const enrichProductsWithSellerInfo = async (products: any[]): Promise<Product[]> => {
    const sellerIds = [...new Set(products.map(p => p.seller_id))];
    
    const [
      { data: shopsData },
      { data: profilesData }
    ] = await Promise.all([
      supabase.from('shops').select('owner_id, name, avatar_url').in('owner_id', sellerIds),
      supabase.from('user_profiles').select('id, full_name, avatar_url, university, is_seller').in('id', sellerIds),
    ]);

    const shops = shopsData || [];
    const profiles = profilesData || [];

    // Check which products are in cart
    const cartProductIds = cartItems.map(item => item.product.id);

    return products.map(p => {
      const shop = shops.find((s: any) => s.owner_id === p.seller_id);
      const profile = profiles.find((pr: any) => pr.id === p.seller_id);
      
      let avatarUrl;
      if (shop?.avatar_url) {
        avatarUrl = shop.avatar_url.startsWith('http')
          ? shop.avatar_url
          : `${SUPABASE_URL}/storage/v1/object/public/avatars/${shop.avatar_url}`;
      } else if (profile?.avatar_url) {
        avatarUrl = profile.avatar_url.startsWith('http')
          ? profile.avatar_url
          : `${SUPABASE_URL}/storage/v1/object/public/avatars/${profile.avatar_url}`;
      } else {
        avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(shop?.name || profile?.full_name || 'U')}&background=FF9900&color=fff&bold=true`;
      }

      return {
        ...p,
        display_name: shop?.name || profile?.full_name || 'Seller',
        avatar_url: avatarUrl,
        university: profile?.university || 'Campus',
        hasDiscount: p.original_price && p.original_price > p.price,
        discountPercent: p.original_price && p.original_price > p.price
          ? Math.round(((p.original_price - p.price) / p.original_price) * 100)
          : null,
        isVideo: p.media_urls?.[0]?.toLowerCase().includes('.mp4'),
        score: 0,
        commentCount: 0,
        likeCount: 0,
        shareCount: 0,
        followerCount: 0,
        isLiked: false,
        isFollowed: false,
        inCart: cartProductIds.includes(p.id),
      } as Product;
    });
  };

  const fetchProductById = async (productId: string): Promise<Product | null> => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('id, title, description, price, original_price, quantity, media_urls, category, brand, delivery_option, seller_id, created_at, sizes_available, colors_available, color_media, color_stock, size_stock, is_pre_order, pre_order_duration, pre_order_duration_unit')
        .eq('id', productId)
        .single();

      if (error || !data) {
        if (error) {
          console.error('Error fetching product by id:', error);
        }
        return null;
      }

      const [enriched] = await enrichProductsWithSellerInfo([data as any]);
      return enriched || null;
    } catch (err) {
      console.error('Error fetching product by id:', err);
      return null;
    }
  };

  useEffect(() => {
    if (userUniversity !== null) {
      loadInitialProducts();
      loadCart();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCategoryFilter, selectedSubCategoryFilter, userUniversity]);

  useEffect(() => {
    const openLinkedProduct = async () => {
      const productIdParam = params.productId;
      if (!productIdParam || Array.isArray(productIdParam) || hasHandledProductLink) {
        return;
      }

      const allProducts = [
        ...featuredProducts,
        ...trendingProducts,
        ...sections.flatMap(section => section.data),
      ];

      let productToOpen = allProducts.find(p => p.id === productIdParam) || null;

      if (!productToOpen) {
        productToOpen = await fetchProductById(productIdParam);
      }

      if (productToOpen) {
        setSelectedProduct(productToOpen);
        setProductDetailVisible(true);
      }

      setHasHandledProductLink(true);
    };
    openLinkedProduct();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.productId, sections, featuredProducts, trendingProducts, hasHandledProductLink]);

  // Advanced search function
  const advancedSearchProducts = async (params: typeof searchParams) => {
    setLoading(true);
    
    try {
      let queryBuilder = supabase
        .from('products')
        .select('id, title, description, price, original_price, quantity, media_urls, category, brand, delivery_option, seller_id, created_at, sizes_available, colors_available, color_media, color_stock, size_stock, is_pre_order, pre_order_duration, pre_order_duration_unit');

      // Apply category filter if selected
      if (selectedCategoryFilter) {
        queryBuilder = queryBuilder.eq('category', selectedCategoryFilter);
      }

      if (selectedSubCategoryFilter) {
        queryBuilder = queryBuilder.eq('sub_category', selectedSubCategoryFilter);
      }

      queryBuilder = queryBuilder.order('created_at', { ascending: false }).limit(1000);

      const { data } = await queryBuilder;

      if (data) {
        const enrichedProducts = await enrichProductsWithSellerInfo(data as any);
        const productNameQuery = (params.productName || '').trim().toLowerCase();
        const categoryQuery = (params.category || '').trim().toLowerCase();
        const shopNameQuery = (params.shopName || '').trim().toLowerCase();
        
        // Filter by university for non-sellers
        let filteredProducts = enrichedProducts;
        if (userUniversity && !isUserSeller) {
          filteredProducts = enrichedProducts.filter(product => 
            product.university === userUniversity
          );
        }
        
        // If user is seller, include their own products plus products from their university
        if (isUserSeller && userId) {
          filteredProducts = enrichedProducts.filter(product => 
            product.seller_id === userId || product.university === userUniversity
          );
        }

        if (productNameQuery) {
          filteredProducts = filteredProducts.filter((product) =>
            matchesAdminStyleProductSearch(product, productNameQuery)
          );
        }

        if (categoryQuery) {
          filteredProducts = filteredProducts.filter((product) =>
            (product.category || '').toLowerCase().includes(categoryQuery) ||
            (product.sub_category || '').toLowerCase().includes(categoryQuery)
          );
        }

        if (shopNameQuery) {
          filteredProducts = filteredProducts.filter((product) =>
            (product.display_name || '').toLowerCase().includes(shopNameQuery)
          );
        }
        
        const grouped = groupByCategory(filteredProducts, selectedCategoryFilter);
        setSections(grouped);
        
        // Don't show featured/trending when searching
        setFeaturedProducts([]);
        setTrendingProducts([]);
      } else {
        setSections([]);
      }
    } catch (error) {
      console.error('Error searching products:', error);
      setSections([]);
    } finally {
      setLoading(false);
    }
  };

  // Simple search for quick search bar
  const searchProducts = async (text: string) => {
    setLoading(true);
    
    try {
      let queryBuilder = supabase
        .from('products')
        .select('id, title, description, price, original_price, quantity, media_urls, category, brand, delivery_option, seller_id, created_at, sizes_available, colors_available, color_media, color_stock, size_stock, is_pre_order, pre_order_duration, pre_order_duration_unit')
        .order('created_at', { ascending: false })
        .limit(1000);

      if (selectedCategoryFilter) {
        queryBuilder = queryBuilder.eq('category', selectedCategoryFilter);
      }

      if (selectedSubCategoryFilter) {
        queryBuilder = queryBuilder.eq('sub_category', selectedSubCategoryFilter);
      }

      const { data } = await queryBuilder;

      if (data) {
        const enrichedProducts = await enrichProductsWithSellerInfo(data as any);
        
        // Filter by university for non-sellers
        let filteredProducts = enrichedProducts;
        if (userUniversity && !isUserSeller) {
          filteredProducts = enrichedProducts.filter(product => 
            product.university === userUniversity
          );
        }
        
        // If user is seller, include their own products plus products from their university
        if (isUserSeller && userId) {
          filteredProducts = enrichedProducts.filter(product => 
            product.seller_id === userId || product.university === userUniversity
          );
        }

        filteredProducts = filteredProducts.filter((product) =>
          matchesAdminStyleProductSearch(product, text)
        );
        
        const grouped = groupByCategory(filteredProducts, selectedCategoryFilter);
        setSections(grouped);
        
        // Don't show featured/trending when searching
        setFeaturedProducts([]);
        setTrendingProducts([]);
      }
    } catch (error) {
      console.error('Error searching products:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const delay = setTimeout(() => {
      if (query.trim().length >= 2) {
        searchProducts(query.trim());
      } else if (query.trim().length === 0 && !searchParams.productName && !searchParams.category && !searchParams.shopName) {
        // Only load initial products if no advanced search is active
        if (userUniversity !== null) {
          loadInitialProducts();
        }
      }
    }, 500);

    return () => clearTimeout(delay);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, selectedCategoryFilter, selectedSubCategoryFilter, userUniversity]);

  const groupByCategory = (products: Product[], filterCategory: string | null): CategorySection[] => {
    const categoryOrder = [
      'Fashion',
      'Electronics',
      'Beauty',
      'Home',
      'Sports',
      'Books',
      'Food',
      'Services',
      'Other',
    ];

    // If no category filter is selected, show only "All Products" section with all products
    if (!filterCategory) {
      // Shuffle products for All Products section
      const shuffled = [...products];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      return shuffled.length > 0 ? [{ title: 'All Products', data: shuffled }] : [];
    }

    // If a category is selected, group products by that category
    const grouped = products.reduce((acc, product) => {
      const cat = product.category || 'Other';
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(product);
      return acc;
    }, {} as Record<string, Product[]>);

    return categoryOrder
      .filter((cat) => grouped[cat] && grouped[cat].length > 0)
      .map((cat) => ({ title: cat, data: grouped[cat] }));
  };

  const calculateDiscount = (original: number | null, current: number): number | null => {
    if (!original || original <= current) return null;
    return Math.round(((original - current) / original) * 100);
  };

  const handleProductPress = (product: Product) => {
    setSelectedProduct(product);
    setProductDetailVisible(true);
  };

  const handleAddToCart = async (product: Product, selectedColor?: string, selectedSize?: string, quantity: number = 1) => {
    if (!isAuthenticated) {
      requireAuth('add items to your cart');
      return;
    }
    try {
      const newCartItems = await addToCart(product, selectedColor, selectedSize, quantity);
      
      // Update sections to reflect in-cart status (basic check, not color/size specific)
      setSections(prev => prev.map(section => ({
        ...section,
        data: section.data.map(p => 
          p.id === product.id ? { ...p, inCart: true } : p
        )
      })));
      
      // Update featured products
      setFeaturedProducts(prev => prev.map(p => 
        p.id === product.id ? { ...p, inCart: true } : p
      ));
      
      // Update trending products
      setTrendingProducts(prev => prev.map(p => 
        p.id === product.id ? { ...p, inCart: true } : p
      ));
      
      if (selectedProduct && selectedProduct.id === product.id) {
        setSelectedProduct(prev => prev ? { ...prev, inCart: true } : null);
      }
      
      return newCartItems;
    } catch (error: any) {
      if (error.message === 'Product is already in cart') {
        showAlert('Already in Cart', 'This product is already in your cart. You can update the quantity from the cart.');
      } else {
        throw error;
      }
    }
  };

  const handleRemoveFromCart = async (productId: string, selectedColor?: string, selectedSize?: string) => {
    const newCartItems = await removeFromCart(productId, selectedColor, selectedSize);
    
    // Check if any variant of this product is still in cart
    const productStillInCart = newCartItems.some(item => item.product.id === productId);
    
    if (!productStillInCart) {
      setSections(prev => prev.map(section => ({
        ...section,
        data: section.data.map(p => 
          p.id === productId ? { ...p, inCart: false } : p
        )
      })));
      
      // Update featured products
      setFeaturedProducts(prev => prev.map(p => 
        p.id === productId ? { ...p, inCart: false } : p
      ));
      
      // Update trending products
      setTrendingProducts(prev => prev.map(p => 
        p.id === productId ? { ...p, inCart: false } : p
      ));
      
      if (selectedProduct && selectedProduct.id === productId) {
        setSelectedProduct(prev => prev ? { ...prev, inCart: false } : null);
      }
    }
    
    return newCartItems;
  };

  const handleUpdateQuantity = async (productId: string, quantity: number, selectedColor?: string, selectedSize?: string) => {
    return await updateQuantity(productId, quantity, selectedColor, selectedSize);
  };

  const handleClearCart = async () => {
    await clearCart();
    
    setSections(prev => prev.map(section => ({
      ...section,
      data: section.data.map(p => ({ ...p, inCart: false }))
    })));
    
    // Update featured and trending products
    setFeaturedProducts(prev => prev.map(p => ({ ...p, inCart: false })));
    setTrendingProducts(prev => prev.map(p => ({ ...p, inCart: false })));
    
    if (selectedProduct) {
      setSelectedProduct(prev => prev ? { ...prev, inCart: false } : null);
    }
  };

  const handlePlaceOrder = (product: Product, options?: { selectedColor?: string | null; selectedSize?: string | null; quantity?: number | null }) => {
    if (!isAuthenticated) {
      requireAuth('place an order');
      return;
    }
    setOrderForProduct(product);
    setOrderInitialOptions(options || {});
    setIsCartOrder(false);
    setOrderFormVisible(true);
  };

  const handleCartPlaceOrder = () => {
    if (cartItems.length === 0) return;
    if (!isAuthenticated) {
      requireAuth('place an order');
      return;
    }
    setOrderForProduct(null);
    setOrderInitialOptions({});
    setIsCartOrder(true);
    setOrderFormVisible(true);
    setCartVisible(false);
  };

  const handleSubmitOrder = async (orderData: OrderFormData) => {
    try {
      const userId = await getCurrentUserId();
      if (!userId) {
        showAlert('Authentication Required', 'You must be logged in to place an order. Please log in and try again.');
        setOrderFormVisible(false);
        setIsCartOrder(false);
        throw new Error('User is not authenticated. Order placement blocked.');
      }

      // For single product order
      if (!isCartOrder && orderForProduct) {
        const { data: order, error: orderError } = await supabase
          .from('orders')
          .insert({
            user_id: userId,
            seller_id: orderForProduct.seller_id,
            product_id: orderForProduct.id,
            product_name: orderForProduct.title,
            product_price: orderForProduct.price,
            product_image_url: orderForProduct.media_urls[0] || '',
            buyer_name: orderData.fullName,
            phone_number: `+233${orderData.phoneNumber}`,
            location: orderData.location,
            delivery_option: formatDeliveryOption(orderData.deliveryOption),
            additional_notes: orderData.additionalNotes || '',
            total_amount: orderForProduct.price * (orderData.quantity || 1),
            status: 'pending',
            is_cart_order: false,
            selected_color: orderData.selectedColor,
            selected_size: orderData.selectedSize,
            quantity: orderData.quantity || 1,
          })
          .select()
          .single();

        if (orderError) {
          console.error('Order error:', orderError);
          throw new Error(`Failed to create order: ${orderError.message}`);
        }

        // Create order item
        const { error: itemError } = await supabase
          .from('order_items')
          .insert({
            order_id: order.id,
            product_id: orderForProduct.id,
            product_name: orderForProduct.title,
            product_price: orderForProduct.price,
            product_image_url: orderForProduct.media_urls[0] || '',
            quantity: orderData.quantity || 1,
            total_price: orderForProduct.price * (orderData.quantity || 1),
            seller_id: orderForProduct.seller_id,
            color: orderData.selectedColor,
            size: orderData.selectedSize,
          });

        if (itemError) {
          console.warn('Order created but order item failed:', itemError);
        }

        // Send notification

        await sendOrderNotificationToSeller({
          order_id: order.id,
          seller_id: orderForProduct.seller_id,
          product_name: orderForProduct.title,
          product_price: orderForProduct.price,
          product_image: orderForProduct.media_urls[0] || '',
          quantity: orderData.quantity || 1,
          buyer_name: orderData.fullName,
          buyer_phone: `+233${orderData.phoneNumber}`,
          total_amount: orderForProduct.price * (orderData.quantity || 1),
          delivery_option: formatDeliveryOption(orderData.deliveryOption),
          location: orderData.location,
          selected_color: orderData.selectedColor,
          selected_size: orderData.selectedSize,
        });

        // Send notification to buyer
        await sendOrderNotificationToBuyer({
          user_id: userId,
          order_id: order.id,
          total_amount: orderForProduct.price * (orderData.quantity || 1),
          items_count: 1,
        });

        // Close the order form modal first
        setOrderFormVisible(false);
        setOrderForProduct(null);
        
        // Show success alert
        showAlert(
          'Order Successful!',
          `Your order #${order.id.slice(-8)} has been placed successfully. Quantity: ${orderData.quantity || 1} • ` +
          (orderData.selectedSize ? `Size: ${orderData.selectedSize} • ` : '') +
          (orderData.selectedColor ? `Color: ${orderData.selectedColor} • ` : '') +
          `Total: GHS ${(orderForProduct.price * (orderData.quantity || 1)).toFixed(2)}\n\n` +
          `The seller will contact you shortly.\n\nContact seller via the order details in your orders page when seller delays to reach out.`,
          [
            { 
              text: 'OK', 
              onPress: () => {
                // Optional: You can add any additional actions here
              }
            }
          ]
        );

      } else if (isCartOrder) {
        // For cart orders
        if (cartItems.length === 0) {
          showAlert('Empty Cart', 'Your cart is empty. Add products before placing order.');
          throw new Error('Cart is empty');
        }

        // Create an order for each seller
        const sellerGroups = cartItems.reduce((groups, item) => {
          const sellerId = item.product.seller_id;
          if (!groups[sellerId]) {
            groups[sellerId] = [];
          }
          groups[sellerId].push(item);
          return groups;
        }, {} as Record<string, CartItem[]>);

        for (const [sellerId, items] of Object.entries(sellerGroups)) {
          const sellerTotal = items.reduce((total, item) => total + (item.product.price * item.quantity), 0);

          // Create the main order
          const { data: order, error: orderError } = await supabase
            .from('orders')
            .insert({
              user_id: userId,
              seller_id: sellerId,
              buyer_name: orderData.fullName,
              phone_number: `+233${orderData.phoneNumber}`,
              location: orderData.location,
              delivery_option: formatDeliveryOption(orderData.deliveryOption),
              additional_notes: orderData.additionalNotes || '',
              total_amount: sellerTotal,
              status: 'pending',
              is_cart_order: true,
            })
            .select()
            .single();

          if (orderError) {
            console.error('Cart order error:', orderError);
            throw new Error(`Failed to create order: ${orderError.message}`);
          }

          // Create order items for this seller
          const orderItems = items.map(item => ({
            order_id: order.id,
            product_id: item.product.id,
            product_name: item.product.title,
            product_price: item.product.price,
            product_image_url: item.product.media_urls[0] || '',
            quantity: item.quantity,
            total_price: item.product.price * item.quantity,
            seller_id: sellerId,
            color: item.selectedColor,
            size: item.selectedSize,
          }));

          const { error: itemsError } = await supabase
            .from('order_items')
            .insert(orderItems);

          if (itemsError) {
            console.warn('Order items error:', itemsError);
          }

          // Send notification to seller
          await sendOrderNotificationToSeller({
            order_id: order.id,
            seller_id: sellerId,
            product_name: items[0].product.title,
            product_price: items[0].product.price,
            product_image: items[0].product.media_urls[0] || '',
            quantity: items.reduce((total, item) => total + item.quantity, 0),
            buyer_name: orderData.fullName,
            buyer_phone: `+233${orderData.phoneNumber}`,
            total_amount: sellerTotal,
            delivery_option: formatDeliveryOption(orderData.deliveryOption),
            location: orderData.location,
          });

          // Send notification to buyer for each order
          await sendOrderNotificationToBuyer({
            user_id: userId,
            order_id: order.id,
            total_amount: sellerTotal,
            items_count: items.length,
          });
        }

        // Close the order form modal first
        setOrderFormVisible(false);
        setIsCartOrder(false);
        
        // Clear cart after successful order
        await clearCart();
        
        // Show success alert
        showAlert(
          'Order Successful!',
          'Your cart order has been placed successfully. The sellers will contact you shortly.',
          [
            { 
              text: 'OK', 
              onPress: () => {
                // Close cart modal if it's open
                setCartVisible(false);
              }
            }
          ]
        );
      }

      return Promise.resolve();
    } catch (error: any) {
      console.error('Order submission error:', error);
      throw error;
    }
  };

  const handleSelectSimilarProduct = (product: Product) => {
    setSelectedProduct(product);
    setProductDetailVisible(true);
  };

  const handleSelectSuggestion = (suggestion: SearchSuggestion) => {
    setQuery(suggestion.value);
    setShowSuggestions(false);
    
    // Update search params based on suggestion type
    const newParams = { ...searchParams };
    switch (suggestion.type) {
      case 'product':
        newParams.productName = suggestion.value;
        break;
      case 'category':
        newParams.category = suggestion.value;
        break;
      case 'shop':
        newParams.shopName = suggestion.value;
        break;
    }
    setSearchParams(newParams);
    
    // Trigger search
    if (suggestion.type === 'product') {
      searchProducts(suggestion.value);
    } else {
      advancedSearchProducts(newParams);
    }
  };

  const handleApplyAdvancedSearch = () => {
    setAdvancedSearchVisible(false);
    advancedSearchProducts(searchParams);
  };

  const handleClearSearch = () => {
    setQuery('');
    setSearchParams({ productName: '', category: '', shopName: '' });
    setSuggestions([]);
    setShowSuggestions(false);
    loadInitialProducts();
  };

  // Check if product is in cart (with specific color/size)
  const isProductInCart = (productId: string, selectedColor?: string, selectedSize?: string) => {
    return cartItems.some(item => item.product.id === productId);
  };

  const ITEM_WIDTH = (width - HORIZONTAL_PADDING * 2 - GAP * (numColumns - 1)) / numColumns;

  const isDark = colorScheme === 'dark';
  const backgroundColor = isDark ? DARK_BACKGROUND : LIGHT_BACKGROUND;
  const textColor = isDark ? DARK_TEXT : LIGHT_TEXT;
  const cardBackground = isDark ? '#1e1e1e' : '#ffffff';
  const borderColor = isDark ? '#333' : '#e0e0e0';
  const sectionBackground = isDark ? '#252525' : '#fafafa';

  const renderProduct = ({ item }: { item: Product }) => {
    const discount = calculateDiscount(item.original_price, item.price);

    return (
      <TouchableOpacity 
        style={[styles.productCard, { 
          width: ITEM_WIDTH,
          backgroundColor: cardBackground,
          borderColor
        }]} 
        activeOpacity={0.85}
        onPress={() => handleProductPress(item)}
      >
        <View style={[styles.imageContainer, { backgroundColor: isDark ? '#2a2a2a' : '#F5F5F5' }]}>
          <Image
            source={{ uri: getCardDisplayMedia(item.media_urls) || 'https://via.placeholder.com/400' }}
            style={styles.productImage}
            resizeMode="cover"
          />
          {discount && (
            <View style={styles.discountBadge}>
              <Text style={styles.discountText}>-{discount}%</Text>
            </View>
          )}
          {item.inCart && (
            <View style={styles.inCartBadge}>
              <Ionicons name="checkmark" size={12} color="#fff" />
            </View>
          )}
        </View>

        <View style={styles.productInfo}>
          <Text numberOfLines={2} style={[styles.productTitle, { color: textColor }]}>
            {item.title}
          </Text>

          <View style={styles.priceContainer}>
            <Text style={[styles.currentPrice, { color: PRIMARY_COLOR }]}>GH₵ {item.price.toFixed(2)}</Text>
            {item.original_price && item.original_price > item.price && (
              <Text style={[styles.originalPrice, { color: isDark ? '#aaa' : '#999' }]}>
                GH₵ {item.original_price.toFixed(2)}
              </Text>
            )}
          </View>
          
          <View style={styles.productMeta}>
            <Image 
              source={{ uri: item.avatar_url || 'https://ui-avatars.com/api/?name=Seller&background=FF9900&color=fff' }} 
              style={styles.sellerAvatar}
            />
            <Text style={[styles.sellerName, { color: isDark ? '#aaa' : '#666' }]} numberOfLines={1}>
              {item.display_name}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderCategorySection = ({ item }: { item: CategorySection }) => {
    // For Featured Products and Trending Now, render as horizontal scrollable list with "See all"
    if (item.title === 'Featured Products' || item.title === 'Trending Now') {
      return (
        <View style={styles.categorySection}>
          <View style={[styles.sectionHeader, { backgroundColor: sectionBackground }]}>
            <Text style={[styles.sectionTitle, { color: textColor }]}>{item.title}</Text>
            <TouchableOpacity
              onPress={() => {
                setSelectedCategory(item);
                setCategoryModalVisible(true);
              }}
              style={styles.seeAllButton}
            >
              <Text style={[styles.seeAllText, { color: PRIMARY_COLOR }]}>See all ({item.data.length})</Text>
              <Ionicons name="chevron-forward" size={16} color={PRIMARY_COLOR} />
            </TouchableOpacity>
          </View>

          <FlatList
            data={item.data}
            renderItem={renderProduct}
            keyExtractor={(product) => product.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.horizontalList}
            ItemSeparatorComponent={() => <View style={{ width: GAP }} />}
          />
        </View>
      );
    }

    // For Home and category sections, render all products as vertical grid
    return (
      <View style={styles.categorySection}>
        <View style={[styles.sectionHeader, { backgroundColor: sectionBackground }]}>
          <Text style={[styles.sectionTitle, { color: textColor }]}>{item.title}</Text>
          <Text style={[styles.productCount, { color: isDark ? '#aaa' : '#666' }]}>
            {item.data.length} {item.data.length === 1 ? 'product' : 'products'}
          </Text>
        </View>

        <View style={styles.gridContainer}>
          {item.data.map((product, index) => {
            const isLastInRow = (index + 1) % numColumns === 0;
            const isInLastRow = index >= item.data.length - (item.data.length % numColumns || numColumns);
            
            return (
              <View 
                key={product.id} 
                style={[
                  styles.gridItem,
                  { 
                    width: ITEM_WIDTH,
                    marginRight: isLastInRow ? 0 : GAP,
                    marginBottom: isInLastRow ? 0 : GAP,
                  }
                ]}
              >
                {renderProduct({ item: product })}
              </View>
            );
          })}
        </View>
      </View>
    );
  };

  // Create all sections including featured and trending only when not searching
  const allSections = React.useMemo(() => {
    const sectionsArray: CategorySection[] = [];
    
    // Add Featured Products section if we have featured products and not searching and no category filter
    if (featuredProducts.length > 0 && !query && !searchParams.productName && !searchParams.category && !searchParams.shopName && !selectedCategoryFilter) {
      sectionsArray.push({
        title: 'Featured Products',
        data: featuredProducts
      });
    }
    
    // Add Trending Now section if we have trending products and not searching and no category filter
    if (trendingProducts.length > 0 && !query && !searchParams.productName && !searchParams.category && !searchParams.shopName && !selectedCategoryFilter) {
      sectionsArray.push({
        title: 'Trending Now',
        data: trendingProducts
      });
    }
    
    // Add all other category sections
    return [...sectionsArray, ...sections];
  }, [featuredProducts, trendingProducts, sections, query, searchParams, selectedCategoryFilter]);

  // Check if we're currently searching
  const isSearching = query || searchParams.productName || searchParams.category || searchParams.shopName;

  return (
    <View style={[styles.container, { backgroundColor }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={backgroundColor} />
      
      {/* Custom Alert Component */}
      <CustomAlert 
        visible={alertVisible} 
        title={alertTitle} 
        message={alertMessage} 
        buttons={alertButtons}
        onClose={hideAlert}
        isDark={isDark}
      />
      
      {/* Professional Header */}
      <SafeAreaView style={[styles.safeArea, { backgroundColor }]}>
        <View style={[styles.header, { 
          backgroundColor,
          borderBottomColor: borderColor 
        }]}>
          <TouchableOpacity
            activeOpacity={0.8}
            style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', flex: 1, gap: 10 }}
            onPress={handleHeaderPress}
          >
            <View style={styles.headerLeft}>
              <Image 
                source={{ uri: 'https://image2url.com/images/1764506443183-2ff76663-c119-4f05-93b4-d08e42895442.png' }} 
                style={styles.logoImage}
                resizeMode="contain"
              />
            </View>
            
            {/* App Name in Center - Professional Styling */}
            <View style={styles.headerCenter}>
              <Text style={[styles.appName, { 
                color: textColor,
                fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
                fontWeight: '800',
                letterSpacing: 0.5,
                fontSize: 24,
                textShadowColor: PRIMARY_COLOR,
                textShadowOffset: { width: 0, height: 0 },
                textShadowRadius: 10,
              }]}>Suyado Mart</Text>
              <Text style={[styles.appTagline, { 
                color: PRIMARY_COLOR,
                fontSize: 6,
                letterSpacing: 1,
                fontWeight: '600',
                marginTop: 1,
              }]}>PREMIUM SHOPPING EXPERIENCE</Text>
            </View>
          </TouchableOpacity>
          
          <View style={styles.headerRight}>
            <TouchableOpacity 
              style={[styles.cartButton, { backgroundColor: isDark ? '#252525' : '#f8f8f8' }]}
              onPress={() => setCartVisible(true)}
            >
              <Ionicons name="cart-outline" size={26} color={textColor} />
              {getCartCount() > 0 && (
                <View style={styles.cartBadge}>
                  <Text style={styles.cartBadgeText}>{getCartCount()}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>

      {/* Advertisement Banner */}
      <AdvertisementBanner />

      {/* Search Bar with Category Menu Button */}
      <View style={[styles.searchContainer, { 
        backgroundColor,
        borderColor,
        marginHorizontal: width > 600 ? 20 : 12
      }]}>
        <TouchableOpacity 
          style={[styles.categoryMenuButton, { borderRightColor: borderColor }]}
          onPress={() => setCategoriesDrawerVisible(true)}
        >
          <Ionicons name="grid" size={24} color={PRIMARY_COLOR} />
          <Text style={[styles.categoryMenuText, { color: PRIMARY_COLOR }]}>Categories</Text>
        </TouchableOpacity>
        
        <View style={styles.searchInputWrapper}>
          <View style={styles.searchInputContainer}>
            <Ionicons name="search" size={20} color={PRIMARY_COLOR} style={styles.searchIcon} />
            <TextInput
              placeholder="Search products, brands, categories, or shop names..."
              placeholderTextColor={isDark ? '#888' : '#999'}
              value={query}
              onChangeText={setQuery}
              onFocus={() => setShowSuggestions(true)}
              style={[
                styles.searchInput,
                { color: textColor },
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
              underlineColorAndroid="transparent"
              selectionColor={PRIMARY_COLOR}
              cursorColor={PRIMARY_COLOR}
              autoCorrect={false}
              spellCheck={false}
              autoComplete="off"
            />
            {isSearching && (
              <TouchableOpacity onPress={handleClearSearch} style={styles.clearSearchButton}>
                <Ionicons name="close-circle" size={20} color={PRIMARY_COLOR} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        <TouchableOpacity 
          style={[styles.advancedSearchButton, { borderLeftColor: borderColor }]}
          onPress={() => setAdvancedSearchVisible(true)}
        >
          <Ionicons name="options-outline" size={22} color={PRIMARY_COLOR} />
        </TouchableOpacity>
      </View>

      {/* Search Suggestions Component - Rendered at root level */}
      <SearchSuggestions
        visible={showSuggestions}
        suggestions={suggestions}
        onSelectSuggestion={handleSelectSuggestion}
        onClose={() => setShowSuggestions(false)}
        styles={styles}
        PRIMARY_COLOR={PRIMARY_COLOR}
        DARK_BACKGROUND={DARK_BACKGROUND}
        LIGHT_BACKGROUND={LIGHT_BACKGROUND}
        DARK_TEXT={DARK_TEXT}
        LIGHT_TEXT={LIGHT_TEXT}
      />

      {/* Search Status Indicator */}
      {isSearching && (
        <View style={[styles.searchStatusContainer, { 
          backgroundColor: isDark ? '#1e1e1e' : '#f8f8f8',
          borderColor 
        }]}>
          <Text style={[styles.searchStatusText, { color: textColor }]}>
            {query ? `Searching for "${query}"` : 'Advanced search results'}
            {searchParams.category && ` in ${searchParams.category}`}
            {searchParams.shopName && ` from ${searchParams.shopName}`}
          </Text>
          <TouchableOpacity onPress={handleClearSearch}>
            <Ionicons name="close" size={18} color={PRIMARY_COLOR} />
          </TouchableOpacity>
        </View>
      )}

      {/* Category Filter Display */}
      {selectedCategoryFilter && (
        <View style={[styles.categoryFilterContainer, { 
          backgroundColor,
          borderColor 
        }]}>
          <View style={styles.categoryFilterContent}>
            <Ionicons name="filter" size={16} color={PRIMARY_COLOR} />
            <Text style={[styles.categoryFilterText, { color: textColor }]}>
              Showing: <Text style={[styles.categoryFilterValue, { color: PRIMARY_COLOR }]}>{selectedCategoryFilter}</Text>
            </Text>
          </View>
          <TouchableOpacity 
            style={styles.clearFilterButton}
            onPress={() => setSelectedCategoryFilter(null)}
          >
            <Ionicons name="close-circle" size={18} color={PRIMARY_COLOR} />
          </TouchableOpacity>
        </View>
      )}

      {/* Main Content */}
      {loading || initialLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={PRIMARY_COLOR} />
          <Text style={[styles.loadingText, { color: textColor }]}>Loading products...</Text>
        </View>
      ) : allSections.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="search-outline" size={80} color={PRIMARY_COLOR} />
          <Text style={[styles.emptyTitle, { color: textColor }]}>No products found</Text>
          <Text style={[styles.emptySubtitle, { color: textColor }]}>
            {isSearching 
              ? 'Try different keywords or adjust your search criteria'
              : userUniversity 
                ? `No products available in ${userUniversity}${isUserSeller ? ' (including your products)' : ''}`
                : 'No products available in this category'}
          </Text>
          {isSearching && (
            <TouchableOpacity 
              style={styles.clearFilterFullButton}
              onPress={handleClearSearch}
            >
              <Text style={styles.clearFilterFullText}>Clear Search</Text>
            </TouchableOpacity>
          )}
          {selectedCategoryFilter && (
            <TouchableOpacity 
              style={styles.clearFilterFullButton}
              onPress={() => setSelectedCategoryFilter(null)}
            >
              <Text style={styles.clearFilterFullText}>Clear Filter</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <FlatList
          data={allSections}
          renderItem={renderCategorySection}
          keyExtractor={(item) => item.title}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.mainListContent}
          refreshControl={
            <RefreshControl
              refreshing={loading}
              onRefresh={loadInitialProducts}
              colors={[PRIMARY_COLOR]}
              tintColor={PRIMARY_COLOR}
            />
          }
        />
      )}

      {/* Advanced Search Panel */}
      <AdvancedSearchPanel
        visible={advancedSearchVisible}
        onClose={() => setAdvancedSearchVisible(false)}
        searchParams={searchParams}
        onSearchParamsChange={setSearchParams}
        onApplySearch={handleApplyAdvancedSearch}
        categories={allCategories}
        styles={styles}
        PRIMARY_COLOR={PRIMARY_COLOR}
        DARK_BACKGROUND={DARK_BACKGROUND}
        LIGHT_BACKGROUND={LIGHT_BACKGROUND}
        DARK_TEXT={DARK_TEXT}
        LIGHT_TEXT={LIGHT_TEXT}
      />

      {/* Category "See All" Modal */}
      <Modal visible={categoryModalVisible} animationType="slide" onRequestClose={() => setCategoryModalVisible(false)}>
        <SafeAreaView style={[styles.modalContainer, { backgroundColor }]}>
          <View style={[styles.modalHeader, { 
            backgroundColor,
            borderBottomColor: borderColor 
          }]}>
            <TouchableOpacity onPress={() => setCategoryModalVisible(false)}>
              <Ionicons name="arrow-back" size={28} color={textColor} />
            </TouchableOpacity>
            <Text style={[styles.categoryModalTitle, { color: textColor }]}>
              {selectedCategory?.title} ({selectedCategory?.data.length})
            </Text>
            <View style={{ width: 40 }} />
          </View>

          <FlatList
            data={selectedCategory?.data || []}
            renderItem={renderProduct}
            keyExtractor={(item) => item.id}
            numColumns={numColumns}
            contentContainerStyle={styles.modalGridContent}
            columnWrapperStyle={{ justifyContent: 'space-between', paddingHorizontal: 12 }}
            showsVerticalScrollIndicator={false}
          />
        </SafeAreaView>
      </Modal>

      {/* Professional Categories Drawer */}
      <ProfessionalCategoriesDrawer
        visible={categoriesDrawerVisible}
        onClose={() => setCategoriesDrawerVisible(false)}
        categories={allCategories}
        onSelectCategory={setSelectedCategoryFilter}
        onSelectSubCategory={setSelectedSubCategoryFilter}
        selectedCategory={selectedCategoryFilter}
        selectedSubCategory={selectedSubCategoryFilter}
        showAlert={showAlert}
        styles={styles}
        PRIMARY_COLOR={PRIMARY_COLOR}
        DARK_BACKGROUND={DARK_BACKGROUND}
        LIGHT_BACKGROUND={LIGHT_BACKGROUND}
        DARK_TEXT={DARK_TEXT}
        LIGHT_TEXT={LIGHT_TEXT}
        categoryStructure={categoryStructure}
        getCategoryIcon={getCategoryIcon}
        getProductSubCategoryIcon={getProductSubCategoryIcon}
        getServiceSubCategoryIcon={getServiceSubCategoryIcon}
        getBeautyServiceTypeIcon={getBeautyServiceTypeIcon}
      />

      {/* Product Detail Modal */}
      <ProductDetailModal
        isVisible={productDetailVisible}
        onClose={() => {
          setProductDetailVisible(false);
          setSelectedProduct(null);
        }}
        product={selectedProduct}
        onOpenFullViewer={(index) => setFullViewerIndex(index)}
        onSelectSimilarProduct={handleSelectSimilarProduct}
        onAddToCart={handleAddToCart}
        isInCart={isProductInCart}
        onPlaceOrder={handlePlaceOrder}
        onSellerAvatarPress={(product) => {
          if (!product?.seller_id) {
            showAlert('Unavailable', 'Seller profile is unavailable for this product.');
            return;
          }
          setSelectedSellerId(product.seller_id);
          setProductDetailVisible(false);
          setSellerProfileVisible(true);
        }}
        showAlert={showAlert}
        isAuthenticated={isAuthenticated}
        onRequireAuth={requireAuth}
        styles={styles}
        getCurrentUserId={getCurrentUserId}
        formatDeliveryOption={formatDeliveryOption}
        requireAuth={requireAuth}
        getCurrentUserUniversity={getCurrentUserUniversity}
        extractKeywords={extractKeywords}
        getCardDisplayMedia={getCardDisplayMedia}
      />

      {/* Full Image Viewer Modal */}
      <FullImageViewer
        isVisible={fullViewerIndex !== -1}
        onClose={() => setFullViewerIndex(-1)}
        mediaUrls={selectedProduct?.media_urls || []}
        initialIndex={fullViewerIndex}
        theme={{
          background: isDark ? 'rgba(0,0,0,0.98)' : 'rgba(0,0,0,0.98)',
          overlay: 'rgba(0,0,0,0.45)',
        }}
        screenWidth={width}
      />

      {/* Cart Modal */}
      <CartModal
        isVisible={cartVisible}
        onClose={() => setCartVisible(false)}
        cartItems={cartItems}
        onUpdateQuantity={handleUpdateQuantity}
        onRemoveItem={handleRemoveFromCart}
        onClearCart={handleClearCart}
        onViewProduct={handleProductPress}
        onPlaceOrder={handleCartPlaceOrder}
        showAlert={showAlert}
        styles={styles}
        getCardDisplayMedia={getCardDisplayMedia}
      />

      {/* Order Form Modal */}
      <OrderFormModal
        isVisible={orderFormVisible}
        onClose={() => {
          setOrderFormVisible(false);
          setOrderForProduct(null);
        }}
        product={orderForProduct}
        onSubmitOrder={handleSubmitOrder}
        isCartOrder={isCartOrder}
        cartTotal={getCartTotal()}
        showAlert={showAlert}
        cartItems={cartItems}
        initialSelectedColor={orderInitialOptions.selectedColor ?? null}
        initialSelectedSize={orderInitialOptions.selectedSize ?? null}
        styles={styles}
        getCardDisplayMedia={getCardDisplayMedia}
      />

      <SellerProfileModal
        isVisible={sellerProfileVisible}
        onClose={() => {
          setSellerProfileVisible(false);
          setProductDetailVisible(true);
        }}
        sellerId={selectedSellerId}
        onOpenProduct={(product: Product) => {
          setSellerProfileVisible(false);
          setSelectedProduct(product);
          setProductDetailVisible(true);
        }}
        onAddToCart={handleAddToCart as any}
        onPlaceOrder={handlePlaceOrder}
        showAlert={showAlert}
        theme={{
          primary: PRIMARY_COLOR,
          text: textColor,
          textSecondary: isDark ? '#bbb' : '#666',
          textTertiary: isDark ? '#888' : '#999',
          surface: isDark ? '#1e1e1e' : '#ffffff',
          border: borderColor,
          modalOverlay: 'rgba(0,0,0,0.85)',
          modalBackground: backgroundColor,
          background: isDark ? '#121212' : '#f8f8f8',
        }}
        getCurrentUserId={getCurrentUserId}
        getCardDisplayMedia={(urls?: string[] | null) => getCardDisplayMedia(urls ?? undefined)}
        scoreAndSortProducts={scoreAndSortProducts}
      />

    </View>
  );
}

// === STYLES ===
const styles = StyleSheet.create({
  // Custom Alert Styles
  alertOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  alertContainer: {
    borderRadius: 15,
    padding: 20,
    width: '85%',
    maxWidth: 400,
    borderWidth: 1,
  },
  alertTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  alertMessage: {
    fontSize: 16,
    marginBottom: 20,
    textAlign: 'center',
    lineHeight: 22,
  },
  alertButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  alertButton: {
    flex: 1,
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  alertButtonPrimary: {},
  alertButtonSecondary: {
    borderWidth: 1,
  },
  alertButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  alertButtonPrimaryText: {},
  alertButtonSecondaryText: {},

  container: {
    flex: 1,
    backgroundColor: '#fafafaff',
  },
  safeArea: {
    backgroundColor: '#ffffffff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 0 : 0,
    paddingBottom: 5,
    borderBottomWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 1,
    elevation: 3,
  },
  headerLeft: {
    width: 56,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerRight: {
    width: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  logoImage: {
    width: 46,
    height: 40,
  },
  appName: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  appTagline: {
    fontSize: 7,
    letterSpacing: 1,
    fontWeight: '600',
    marginTop: -2,
  },
  cartButton: {
    position: 'relative',
    padding: 8,
    borderRadius: 8,
  },
  cartBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#FF3B30',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  cartBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  
  // Advertisement Banner
  adBannerContainer: {
    height: 100,
    marginTop: 0,
    marginHorizontal: 20,
    borderRadius: 12,
    
    position: 'relative',
  },
  adBannerImage: {
    width: '100%',
    height: '100%',
  },
  adBannerGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '60%',
    justifyContent: 'flex-end',
    padding: 10,
  },
  adBannerContent: {},
  adBannerTitle: {
    color: '#f49003ff',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  adBannerDescription: {
    color: '#fff',
    fontSize: 14,
    opacity: 0.9,
  },
  adBannerPagination: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    flexDirection: 'row',
  },
  adBannerDot: {
    width: 5,
    height: 5,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    marginHorizontal: 3,
  },
  adBannerDotActive: {
    backgroundColor: PRIMARY_COLOR,
    width: 15,
  },
  
  // Search Bar with Category Menu Button
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    marginBottom: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 50,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    position: 'relative',
    zIndex: 999,
  },
  searchInputWrapper: {
    flex: 1,
    position: 'relative',
  },
  categoryMenuButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 12,
    marginRight: 12,
    borderRightWidth: 1,
  },
  categoryMenuText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    lineHeight: 18,
    height: 22,
    paddingVertical: 0,
    paddingRight: 8,
    paddingHorizontal: 0,
    backgroundColor: 'transparent',
    borderWidth: 0,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  clearSearchButton: {
    padding: 4,
  },
  advancedSearchButton: {
    paddingLeft: 12,
    borderLeftWidth: 1,
    marginLeft: 8,
  },
  
  // Search Status Indicator
  searchStatusContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 0,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    zIndex: 1,
  },
  searchStatusText: {
    fontSize: 14,
    flex: 1,
  },
  
  // Search Suggestions
  suggestionsContainer: {
    position: 'absolute',
    top: 70,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 100,
  },
  suggestionsBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  suggestionsListContainer: {
    position: 'absolute',
    top: 170,
    left: 16,
    right: 16,
    borderRadius: 8,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
    maxHeight: 300,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  suggestionContent: {
    flex: 1,
    marginLeft: 12,
  },
  suggestionLabel: {
    fontSize: 12,
    marginBottom: 2,
  },
  suggestionValue: {
    fontSize: 14,
    fontWeight: '500',
  },
  suggestionDivider: {
    height: 1,
    marginHorizontal: 16,
  },
  
  // Advanced Search Panel
  advancedSearchOverlay: {
    flex: 1,
  },
  advancedSearchPanel: {
    marginTop: 80,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    flex: 1,
  },
  advancedSearchHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  advancedSearchTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  advancedSearchCloseButton: {
    padding: 4,
  },
  advancedSearchContent: {
    flex: 1,
    padding: 20,
  },
  advancedSearchFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderTopWidth: 1,
  },
  advancedClearSearchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
  },
  clearSearchText: {
    fontSize: 14,
    marginLeft: 6,
  },
  applySearchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: PRIMARY_COLOR,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  applySearchText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
    marginLeft: 8,
  },
  searchFieldGroup: {
    marginBottom: 24,
  },
  searchFieldLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  searchFieldInput: {
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
  },
  categoriesScroll: {
    flexDirection: 'row',
    marginTop: 8,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
  },
  categoryChipSelected: {
    backgroundColor: PRIMARY_COLOR,
    borderColor: PRIMARY_COLOR,
  },
  categoryChipText: {
    fontSize: 14,
  },
  categoryChipTextSelected: {
    color: '#fff',
    fontWeight: '600',
  },
  searchTips: {
    borderRadius: 8,
    padding: 16,
    marginTop: 20,
    borderWidth: 1,
  },
  searchTipsTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  searchTip: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  searchTipText: {
    fontSize: 14,
    marginLeft: 8,
    flex: 1,
    lineHeight: 20,
  },
  
  // Category Filter Display
  categoryFilterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    marginBottom: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    zIndex: 1,
  },
  categoryFilterContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryFilterText: {
    fontSize: 14,
    marginLeft: 6,
  },
  categoryFilterValue: {
    fontWeight: '600',
  },
  clearFilterButton: {
    padding: 4,
  },
  
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 70,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
  },
  mainListContent: {
    paddingBottom: 20,
  },
  categorySection: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: 'bold',
  },
  productCount: {
    fontSize: 13,
    fontWeight: '500',
  },
  seeAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  seeAllText: {
    fontSize: 14,
    fontWeight: '600',
    marginRight: 4,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  gridItem: {
    // Wrapper for each grid item to handle spacing
  },
  horizontalList: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  productCard: {
    borderRadius: 7,
    overflow: 'hidden',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    borderWidth: 1,
  },
  imageContainer: {
    position: 'relative',
    width: '100%',
    aspectRatio: 1,
  },
  productImage: {
    width: '100%',
    height: '100%',
  },
  discountBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: PRIMARY_COLOR,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    minWidth: 40,
  },
  discountText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  inCartBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#4CAF50',
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
  },
  productInfo: {
    padding: 10,
  },
  productTitle: {
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 18,
    marginBottom: 8,
    height: 36,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  currentPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    marginRight: 8,
  },
  originalPrice: {
    fontSize: 12,
    textDecorationLine: 'line-through',
  },
  productMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sellerAvatar: {
    width: 20,
    height: 20,
    borderRadius: 10,
    marginRight: 6,
  },
  sellerName: {
    fontSize: 12,
    flex: 1,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  clearFilterFullButton: {
    marginTop: 20,
    backgroundColor: PRIMARY_COLOR,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  clearFilterFullText: {
    color: '#FFF',
    fontWeight: '600',
    fontSize: 14,
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  categoryModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  modalGridContent: {
    paddingTop: 16,
    paddingBottom: 30,
  },
  // Product Detail Modal Styles
  modalCenteredView: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalModalView: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: '90%',
    paddingTop: 15,
  },
  modalScrollContent: {
    paddingBottom: 100,
  },
  modalCloseButton: {
    position: 'absolute',
    top: 10,
    right: 15,
    zIndex: 20,
    borderRadius: 15,
    padding: 5,
  },
  modalMediaContainer: {
    position: 'relative',
    marginBottom: 15,
    borderBottomWidth: 1,
  },
  // Modern Color Selection
  colorSelectionContainerModern: {
    position: 'absolute',
    bottom: 10,
    left: 0,
    right: 0,
    paddingHorizontal: 10,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingVertical: 8,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  colorSelectionTitleModern: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 6,
    textAlign: 'center',
  },
  colorSelectionScrollModern: {
    flexDirection: 'row',
  },
  colorSelectionButtonModern: {
    alignItems: 'center',
    marginHorizontal: 5,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 1,
    minWidth: 80,
  },
  colorSelectionButtonActiveModern: {
    backgroundColor: 'rgba(246, 139, 30, 0.3)',
  },
  colorSelectionCircleModern: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginBottom: 4,
  },
  colorSelectionTextModern: {
    fontSize: 11,
    fontWeight: '500',
  },
  modalPaginationDots: {
    position: 'absolute',
    bottom: 60,
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  modalDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4,
  },
  modalActiveDot: {
    backgroundColor: PRIMARY_COLOR,
  },
  modalInactiveDot: {
    backgroundColor: 'rgba(255,255,255,0.4)',
  },
  modalDetailsContainer: {
    padding: 18,
  },
  modalTitle: {
    fontSize: 26,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  modalPriceRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 12,
  },
  modalPrice: {
    fontSize: 20,
    fontWeight: '900',
  },
  modalOldPrice: {
    fontSize: 14,
    textDecorationLine: 'line-through',
    marginLeft: 15,
    marginBottom: 4,
  },
  modalDiscountBadge: {
    backgroundColor: '#FF3B30',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 10,
    marginLeft: 10,
    marginBottom: 4,
  },
  modalDiscountText: {
    color: '#fff',
    fontWeight: '900',
    fontSize: 13,
  },
  // Delivery Info
  deliveryInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    padding: 12,
    marginBottom: 15,
    borderWidth: 1,
  },
  deliveryInfoContent: {
    marginLeft: 12,
    flex: 1,
  },
  deliveryInfoTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  deliveryInfoValue: {
    fontSize: 15,
    fontWeight: 'bold',
  },
  modalVariantSection: {
    marginBottom: 20,
  },
  modalVariantTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  // Modern Color Selection Grid for Modal
  colorSelectionGridModern: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
  },
  colorOptionModernModal: {
    width: 90,
    alignItems: 'center',
    marginHorizontal: 6,
    marginBottom: 12,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  colorOptionModernSelectedModal: {
    backgroundColor: 'rgba(246, 139, 30, 0.1)',
  },
  colorPreviewModernModal: {
    position: 'relative',
    width: 50,
    height: 50,
    borderRadius: 8,
    marginBottom: 6,
    overflow: 'hidden',
  },
  colorPreviewImageModal: {
    width: '100%',
    height: '100%',
  },
  colorCircleModernModal: {
    width: '100%',
    height: '100%',
  },
  colorSelectionCheckModal: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: '#4CAF50',
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
  },
  colorTextModernModal: {
    fontSize: 12,
    marginBottom: 4,
  },
  colorStockTextModal: {
    fontSize: 9,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 2,
  },
  // Modern Size Selection Grid for Modal
  sizeSelectionGridModern: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -5,
  },
  sizeOptionModernModal: {
    width: 65,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    margin: 5,
    position: 'relative',
  },
  sizeOptionModernSelectedModal: {
    backgroundColor: 'rgba(246, 139, 30, 0.1)',
  },
  sizeOptionModernDisabledModal: {
    opacity: 0.6,
  },
  sizeTextModernModal: {
    fontSize: 13,
    fontWeight: '500',
  },
  sizeSelectionIndicatorModal: {
    position: 'absolute',
    top: 4,
    right: 4,
  },
  outOfStockBadgeModal: {
    position: 'absolute',
    bottom: 2,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  outOfStockTextModal: {
    fontSize: 8,
    color: '#FF3B30',
    fontWeight: '600',
  },
  sizeGuideContainerModal: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    padding: 10,
    marginTop: 10,
    borderWidth: 1,
  },
  sizeGuideTextModal: {
    fontSize: 11,
    marginLeft: 8,
    flex: 1,
    lineHeight: 14,
  },
  modalQuantitySection: {
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    borderWidth: 1,
  },
  modalQuantityLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  modalQuantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modalQuantityButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalQuantityDisplay: {
    width: 70,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    marginHorizontal: 12,
  },
  modalQuantityValue: {
    fontSize: 18,
    fontWeight: '600',
  },
  quantityInfoModal: {
    flex: 1,
    marginLeft: 12,
  },
  stockTextModal: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 2,
  },
  pricePerUnitModal: {
    fontSize: 12,
  },
  modalSectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginTop: 15,
    marginBottom: 10,
    borderBottomWidth: 1,
    paddingBottom: 5,
  },
  detailsTabContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    padding: 4,
    gap: 8,
    marginTop: 14,
  },
  detailsTabButton: {
    flex: 1,
    minHeight: 38,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 10,
  },
  detailsTabButtonActive: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 1,
  },
  detailsTabButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  detailsTabButtonTextActive: {
    color: '#fff',
  },
  modalDescription: {
    fontSize: 16,
    lineHeight: 26,
    marginBottom: 20,
  },
  modalSellerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
  },
  modalSellerAvatar: {
    width: 45,
    height: 45,
    borderRadius: 27.5,
    marginRight: 15,
    borderWidth: 2,
    borderColor: PRIMARY_COLOR,
  },
  modalSellerName: {
    fontWeight: '700',
    fontSize: 17,
  },
  modalSellerUniversity: {
    fontSize: 14,
  },
  modalSellerCategory: {
    fontSize: 14,
    marginTop: 4,
    fontWeight: '600',
  },
  modalActionBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    borderTopWidth: 1,
    paddingHorizontal: 15,
    paddingVertical: 12,
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  modalAddToCartButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: PRIMARY_COLOR,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 10,
    flex: 1,
  },
  modalInCartButton: {
    backgroundColor: '#4CAF50',
  },
  modalButtonDisabled: {
    opacity: 0.5,
  },
  modalAddToCartButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
    marginLeft: 8,
  },
  modalPlaceOrderButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FF4081',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 10,
    flex: 1,
  },
  modalPlaceOrderButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
    marginLeft: 8,
  },
  // Enhanced Similar Products Styles
  similarContainer: {
    marginTop: 25,
    paddingTop: 20,
    borderTopWidth: 1,
   marginLeft: 5,
  },
  similarTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    marginLeft: 5,
  },
  similarSubtitle: {
    fontSize: 12,
    marginBottom: 15,
    marginLeft: 5,
  },
  similarLoadingContainer: {
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  similarListContent: {
    paddingHorizontal: 5,
    paddingBottom: 10,
  },
  similarProductCard: {
    width: 160,
    borderRadius: 12,
    marginRight: 12,
    overflow: 'hidden',
    borderWidth: 1,
  },
  similarProductImage: {
    width: '100%',
    height: 140,
  },
  // REMOVED: sameSellerBadge styles
  similarVideoIcon: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
    padding: 5,
    borderRadius: 15,
  },
  similarProductInfo: {
    padding: 10,
    position: 'relative',
  },
  similarProductTitle: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
    height: 36,
  },
  similarMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  similarCategory: {
    fontSize: 11,
    fontWeight: '600',
    flex: 1,
  },
  similarPriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  similarPrice: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  similarOldPrice: {
    fontSize: 11,
    textDecorationLine: 'line-through',
    marginLeft: 6,
  },
  similarDiscountBadge: {
    backgroundColor: '#FF3B30',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 6,
  },
  similarDiscountText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  similarSellerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
  },
  similarSellerAvatar: {
    width: 22,
    height: 22,
    borderRadius: 11,
    marginRight: 6,
    borderWidth: 1,
    borderColor: PRIMARY_COLOR,
  },
  similarSellerName: {
    fontSize: 11,
    flex: 1,
  },
  similarAddToCartButton: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    backgroundColor: PRIMARY_COLOR,
    padding: 6,
    borderRadius: 15,
  },
  // Full Image Viewer
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
  fullViewerMediaSlide: {
    width: width,
    height: height,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  fullViewerMediaImage: {
    width: '100%',
    height: '100%',
  },
  fullViewerPaginationText: {
    position: 'absolute',
    bottom: 30,
    backgroundColor: 'rgba(0,0,0,0.6)',
    color: '#fff',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 10,
    fontSize: 16,
    fontWeight: 'bold',
  },
  // Cart Modal Styles
  cartOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  cartModal: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: '90%',
  },
  cartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
  },
  cartTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
  },
  cartCloseButton: {
    padding: 5,
  },
  cartClearButton: {
    padding: 5,
  },
  cartClearText: {
    color: '#FF3B30',
    fontSize: 14,
  },
  cartEmptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  cartEmptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 10,
  },
  cartEmptyText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 30,
  },
  cartContinueButton: {
    backgroundColor: PRIMARY_COLOR,
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 25,
  },
  cartContinueButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  cartListContent: {
    padding: 15,
  },
  cartItem: {
    flexDirection: 'row',
    borderRadius: 12,
    marginBottom: 12,
    padding: 10,
    borderWidth: 1,
  },
  cartItemImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  cartItemInfo: {
    flex: 1,
    marginLeft: 15,
    justifyContent: 'space-between',
  },
  cartItemTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  cartItemSeller: {
    fontSize: 12,
    marginTop: 2,
  },
  cartItemVariants: {
    marginTop: 5,
  },
  cartVariantTag: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 3,
  },
  cartVariantLabel: {
    fontSize: 12,
    marginRight: 5,
  },
  cartColorPreview: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 5,
  },
  cartVariantValue: {
    fontSize: 12,
    fontWeight: '500',
  },
  cartItemPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 4,
  },
  cartQuantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  cartQuantityButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cartQuantityDisplay: {
    width: 40,
    alignItems: 'center',
  },
  cartQuantityText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  cartRemoveButton: {
    marginLeft: 15,
    padding: 6,
  },
  cartFooter: {
    borderTopWidth: 1,
    padding: 15,
  },
  cartTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  cartTotalLabel: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  cartTotalAmount: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  cartPlaceOrderButton: {
    backgroundColor: '#FF4081',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
  },
  cartPlaceOrderButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
    marginLeft: 8,
  },
  // Order Form Modal Styles - Product Details Section
  productDetailsSection: {
    paddingBottom: 20,
    borderBottomWidth: 2,
    marginBottom: 20,
  },
  productDetailsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  productPreviewContainer: {
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    borderWidth: 1,
  },
  productPreviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  productPreviewTitle: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
    marginRight: 10,
  },
  productPreviewPrice: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  productPreviewContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  productMediaThumbnail: {
    width: 70,
    height: 70,
    borderRadius: 8,
    overflow: 'hidden',
    marginRight: 12,
  },
  productThumbnailImage: {
    width: '100%',
    height: '100%',
  },
  selectedOptionsContainer: {
    flex: 1,
  },
  selectedOptionsRow: {
    marginBottom: 8,
  },
  selectedOptionsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  selectedOptionsTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  selectedOptionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  selectedOptionLabel: {
    fontSize: 13,
    marginRight: 8,
    minWidth: 60,
  },
  selectedColorOption: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  selectedColorCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    marginRight: 6,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  selectedColorText: {
    fontSize: 13,
    fontWeight: '500',
  },
  selectedSizeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  selectedSizeText: {
    fontSize: 13,
    fontWeight: '600',
  },
  quantityBadge: {
    backgroundColor: 'rgba(246, 139, 30, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  quantityValue: {
    fontSize: 13,
    fontWeight: '600',
  },
  selectedOptionsFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  totalPricePreview: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  variantSection: {
    marginBottom: 20,
  },
  variantSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  colorSelectionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
  },
  colorOptionModern: {
    width: 100,
    alignItems: 'center',
    marginHorizontal: 6,
    marginBottom: 12,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  colorOptionModernSelected: {
    backgroundColor: 'rgba(246, 139, 30, 0.1)',
  },
  colorPreviewModern: {
    position: 'relative',
    width: 60,
    height: 60,
    borderRadius: 10,
    marginBottom: 8,
    overflow: 'hidden',
  },
  colorPreviewImage: {
    width: '100%',
    height: '100%',
  },
  colorCircleModern: {
    width: '100%',
    height: '100%',
  },
  colorSelectionCheck: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: '#4CAF50',
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  colorTextModern: {
    fontSize: 13,
    marginBottom: 4,
  },
  colorStockText: {
    fontSize: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 2,
  },
  sizeSelectionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -5,
  },
  sizeOptionModern: {
    width: 70,
    height: 45,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    margin: 5,
    position: 'relative',
  },
  sizeOptionModernSelected: {
    backgroundColor: 'rgba(246, 139, 30, 0.1)',
  },
  sizeOptionModernDisabled: {
    opacity: 0.6,
  },
  sizeTextModern: {
    fontSize: 14,
    fontWeight: '500',
  },
  sizeSelectionIndicator: {
    position: 'absolute',
    top: 4,
    right: 4,
  },
  outOfStockBadge: {
    position: 'absolute',
    bottom: 2,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  outOfStockText: {
    fontSize: 8,
    color: '#FF3B30',
    fontWeight: '600',
  },
  sizeGuideContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
    borderWidth: 1,
  },
  sizeGuideText: {
    fontSize: 12,
    marginLeft: 10,
    flex: 1,
    lineHeight: 16,
  },
  quantitySectionModern: {
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    borderWidth: 1,
  },
  quantityLabelModern: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  quantityControlsModern: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  quantityButtonModern: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityDisplayModern: {
    width: 70,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    marginHorizontal: 12,
  },
  quantityValueModern: {
    fontSize: 18,
    fontWeight: '600',
  },
  quantityInfo: {
    flex: 1,
    marginLeft: 12,
  },
  stockTextModern: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 2,
  },
  pricePerUnit: {
    fontSize: 12,
  },
  totalSummaryContainer: {
    borderRadius: 12,
    padding: 15,
    borderWidth: 1,
  },
  totalSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  totalSummaryLabel: {
    fontSize: 14,
  },
  totalSummaryValue: {
    fontSize: 14,
    fontWeight: '500',
  },
  totalSummaryDivider: {
    height: 1,
    marginVertical: 10,
  },
  finalTotalLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  finalTotalValue: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  // Cart Item Details in Order Form
  cartItemDetail: {
    flexDirection: 'row',
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
  },
  cartDetailImage: {
    width: 70,
    height: 70,
    borderRadius: 8,
    marginRight: 12,
  },
  cartDetailInfo: {
    flex: 1,
    justifyContent: 'space-between',
  },
  cartDetailTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 5,
  },
  variantDetails: {
    marginBottom: 5,
  },
  variantTag: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 3,
  },
  variantLabel: {
    fontSize: 12,
    marginRight: 5,
    fontWeight: '500',
  },
  colorPreview: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 5,
  },
  variantValue: {
    fontSize: 12,
    fontWeight: '500',
  },
  quantityPriceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 5,
  },
  quantityText: {
    fontSize: 14,
    fontWeight: '500',
  },
  priceText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  cartItemSeparator: {
    height: 1,
    marginVertical: 10,
  },
  // Order Form Styles
  orderFormOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  orderFormContainer: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: '85%',
  },
  orderFormHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
  },
  orderFormCloseButton: {
    padding: 5,
  },
  orderFormTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  orderFormContent: {
    flex: 1,
    padding: 20,
  },
  orderFormSection: {
    marginBottom: 25,
  },
  orderFormSectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  formGroup: {
    marginBottom: 20,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  formInput: {
    borderRadius: 10,
    padding: 15,
    fontSize: 16,
    borderWidth: 1,
  },
  phoneInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  countryCodeContainer: {
    padding: 15,
    borderTopLeftRadius: 10,
    borderBottomLeftRadius: 10,
    borderWidth: 1,
    borderRightWidth: 0,
  },
  countryCodeText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  phoneInput: {
    flex: 1,
    borderTopLeftRadius: 0,
    borderBottomLeftRadius: 0,
    borderLeftWidth: 0,
  },
  errorText: {
    color: '#FF3B30',
    fontSize: 12,
    marginTop: 5,
  },
  helperText: {
    fontSize: 12,
    marginTop: 5,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: "top"
  },
  deliveryOption: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
    borderWidth: 1,
  },
  deliveryOptionSelected: {
    borderColor: PRIMARY_COLOR,
    backgroundColor: 'rgba(255, 153, 0, 0.1)',
  },
  deliveryOptionRadio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: PRIMARY_COLOR,
    marginRight: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deliveryOptionRadioSelected: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: PRIMARY_COLOR,
  },
  deliveryOptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  deliveryOptionText: {
    marginLeft: 15,
    flex: 1,
  },
  deliveryOptionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  deliveryOptionDescription: {
    fontSize: 12,
  },
  orderTotalSection: {
    borderRadius: 10,
    padding: 15,
    alignItems: 'center',
    marginVertical: 15,
    borderWidth: 1,
  },
  orderTotalText: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  orderFormFooter: {
    padding: 20,
    borderTopWidth: 1,
  },
  submitOrderButton: {
    backgroundColor: PRIMARY_COLOR,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 18,
    borderRadius: 10,
  },
  submitOrderButtonDisabled: {
    opacity: 0.7,
  },
  submitOrderButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  // Contact Seller Modal Styles
  contactOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  contactModal: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: '85%',
  },
  contactHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
  },
  contactCloseButton: {
    padding: 5,
  },
  contactTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  contactContent: {
    flex: 1,
    padding: 20,
  },
  contactLoading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  contactLoadingText: {
    marginTop: 10,
    fontSize: 16,
  },
  contactUnavailable: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
  },
  contactUnavailableTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 15,
    marginBottom: 10,
  },
  contactUnavailableText: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 25,
  },
  contactContinueButton: {
    backgroundColor: PRIMARY_COLOR,
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 25,
  },
  contactContinueButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  sellerInfoCard: {
    borderRadius: 12,
    padding: 20,
    marginBottom: 25,
    borderWidth: 1,
  },
  contactProductInfo: {
    marginBottom: 15,
    paddingBottom: 15,
    borderBottomWidth: 1,
  },
  productName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 5,
  },
  productPrice: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  phoneInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  phoneNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 10,
    flex: 1,
  },
  sellerNameText: {
    fontSize: 14,
    marginTop: 5,
  },
  copyButton: {
    padding: 8,
    marginLeft: 10,
  },
  contactOptionsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  contactOption: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    padding: 18,
    marginBottom: 12,
    borderWidth: 1,
  },
  whatsappOption: {
    borderLeftWidth: 4,
    borderLeftColor: '#25D366',
  },
  contactIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  contactOptionText: {
    flex: 1,
  },
  contactOptionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  contactOptionDescription: {
    fontSize: 12,
    marginBottom: 2,
  },
  whatsappNote: {
    color: '#25D366',
    fontSize: 11,
    fontStyle: 'italic',
  },
  contactDisclaimer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    padding: 15,
    marginTop: 20,
    borderWidth: 1,
  },
  contactDisclaimerText: {
    fontSize: 12,
    marginLeft: 10,
    flex: 1,
    lineHeight: 16,
  },
  // Professional Categories Drawer Styles
  drawerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  drawerBackdrop: {
    flex: 1,
  },
  drawerContainer: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    width: width * 0.7,
    shadowColor: '#000',
    shadowOffset: { width: -2, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 20,
  },
  drawerHeader: {
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    position: 'relative',
  },
  drawerHeaderContent: {
    marginTop: 10,
  },
  drawerLogoContainer: {
    marginBottom: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  drawerLogo: {
    width: 140,
    height: 50,
    tintColor: '#fff',
  },
  drawerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  drawerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
  },
  drawerCloseButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 30,
    right: 20,
    padding: 8,
    backgroundColor: 'rgba(241, 236, 236, 0.2)',
    borderRadius: 20,
  },
  drawerContent: {
    flex: 1,
    paddingVertical: 20,
  },
  drawerSection: {
    marginBottom: 15,
  },
  sectionHeaderButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    marginBottom: 8,
    borderWidth: 1,
  },
  drawerSectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  sectionContent: {
    paddingHorizontal: 15,
  },
  drawerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 14,
    borderRadius: 10,
    marginBottom: 6,
    borderWidth: 1,
  },
  drawerItemActive: {
    borderColor: PRIMARY_COLOR,
    borderWidth: 1,
  },
  drawerItemIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  drawerItemIconActive: {
    backgroundColor: 'rgba(246, 139, 30, 0.2)',
  },
  drawerItemText: {
    fontSize: 15,
    flex: 1,
    fontWeight: '500',
  },
  drawerItemTextActive: {
    fontWeight: '600',
  },
  categoryCountBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  categoryCountText: {
    fontSize: 11,
    fontWeight: '600',
  },
  clearFilterContainer: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderTopWidth: 1,
    marginTop: 20,
  },
  drawerClearFilterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
  },
  clearFilterText: {
    fontSize: 15,
    fontWeight: '600',
    marginLeft: 8,
  },
});