// app/(tabs)/index.tsx — COMPLETE UPDATED CODE WITH UNIVERSITY FILTERING
import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  StatusBar,
  useWindowDimensions,
  FlatList,
  Modal,
  Dimensions,
  useColorScheme,
  Appearance,
} from 'react-native';
import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter, useLocalSearchParams, usePathname } from 'expo-router';
// ...existing code...

import { getSelectedCampus } from '@/lib/campus';
import ProductDetailModal from './components/ProductDetailModal';
import HomeOrderProductDetailModal from './components/orders/OrderProductDetailModal';
import OrdersScreenModal from './components/orders/OrdersScreenModal';
import OrderFormModal from './components/orders/OrderFormModal';
import ProductFeedCard from './components/ProductFeedCard';
import SimilarProductsSection from './components/SimilarProductsSection';
import CartModal from './components/CartModal';
import SellerProfileModal from './components/SellerProfileModal';
import ProductMediaView from './components/ProductMediaView';
import CommentsModal from './components/CommentsModal';
import FullImageViewer from './components/FullImageViewer';
import ShareModal from './components/ShareModal';
import ContactSellerModal from './components/ContactSellerModal';
import CalendarFilter from './components/CalendarFilter';

const SUPABASE_URL = 'https://qwujadyqebfypyhfuwfl.supabase.co';
const PAGE_SIZE = 10;
const screenWidth = Dimensions.get('window').width;
const screenHeight = Dimensions.get('window').height;

// === COLOR THEMES ===
const lightTheme = {
  background: '#FFFFFF',
  surface: '#F8F9FA',
  card: '#FFFFFF',
  text: '#121212',
  textSecondary: '#666666',
  textTertiary: '#999999',
  border: '#E0E0E0',
  primary: '#FF9900',
  primaryLight: '#FFCC80',
  error: '#FF3B30',
  success: '#34C759',
  warning: '#FF9500',
  info: '#007AFF',
  shadow: 'rgba(0,0,0,0.1)',
  overlay: 'rgba(255,255,255,0.9)',
  modalBackground: '#FFFFFF',
  modalOverlay: 'rgba(0,0,0,0.5)',
  gradientStart: 'rgba(255,255,255,0)',
  gradientEnd: 'rgba(255,255,255,0.9)',
};

const darkTheme = {
  background: '#121212',
  surface: '#1E1E1E',
  card: '#1E1E1E',
  text: '#FFFFFF',
  textSecondary: '#BBBBBB',
  textTertiary: '#888888',
  border: '#333333',
  primary: '#FF9900',
  primaryLight: '#FFB74D',
  error: '#FF3B30',
  success: '#34C759',
  warning: '#FF9500',
  info: '#007AFF',
  shadow: 'rgba(0,0,0,0.3)',
  overlay: 'rgba(0,0,0,0.7)',
  modalBackground: '#1E1E1E',
  modalOverlay: 'rgba(0,0,0,0.85)',
  gradientStart: 'rgba(0,0,0,0)',
  gradientEnd: 'rgba(0,0,0,0.8)',
};

// === PRODUCT INTERFACE ===
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
  isShared?: boolean;
  isFollowed?: boolean;
  inCart?: boolean;
  category?: string;
  created_at?: string;
  color_media?: Record<string, string[]>;
  selectedSize?: string | null;
  selectedColor?: string | null;
  is_trending?: boolean;
  is_featured?: boolean;
  colors_available?: string[];
  sizes_available?: string[];
  color_stock?: Record<string, string>;
  size_stock?: Record<string, string>;
  isFromSameSeller?: boolean;
  similarityScore?: number;
  delivery_option?: string;
  is_pre_order?: boolean;
  pre_order_duration?: number;
  pre_order_duration_unit?: string;
}

interface CartItem {
  product: Product;
  quantity: number;
  added_at: string;
  selectedSize?: string | null;
  selectedColor?: string | null;
}

interface OrderFormData {
  fullName: string;
  phoneNumber: string;
  location: string;
  deliveryOption: 'Meetup / Pickup' | 'Campus Delivery';
  additionalNotes?: string;
  selectedColor?: string | null;
  selectedSize?: string | null;
  quantity?: number | null;
}

// === HELPER FUNCTIONS FOR MEDIA HANDLING ===
const isVideoUrl = (url: string): boolean => {
  if (!url) return false;
  const lowerUrl = url.toLowerCase();
  return lowerUrl.includes('.mp4') || 
         lowerUrl.includes('.mov') || 
         lowerUrl.includes('.avi') ||
         lowerUrl.includes('.webm') ||
         lowerUrl.includes('.wmv');
};

const getCardDisplayUrl = (urls?: string[] | null) => {
  const arr = (urls || []).map(u => u.startsWith('http') ? u : `${SUPABASE_URL}/storage/v1/object/public/products/${u}`);
  // prefer first non-video image
  const image = arr.find(a => !isVideoUrl(a));
  return image || arr[0] || 'https://via.placeholder.com/400';
};

const getCardDisplayMedia = (urls?: string[] | null): string | undefined => {
  const arr = (urls || []).map(u => u.startsWith('http') ? u : `${SUPABASE_URL}/storage/v1/object/public/products/${u}`);
  if (!arr || arr.length === 0) return undefined;
  
  // If first media is a video, try to get the second one
  if (isVideoUrl(arr[0])) {
    // If there's a second media, return it
    if (arr.length > 1) {
      return arr[1];
    }
    // If no second media, try to find first non-video
    const imageUrl = arr.find(url => !isVideoUrl(url));
    return imageUrl || arr[0];
  }
  
  // First media is not a video, return it
  return arr[0];
};

// Format delivery option for display
const formatDeliveryOption = (option?: string): string => {
  if (!option) return 'Not specified';
  
  const deliveryMap: Record<string, string> = {
    'Meetup / Pickup': 'Meetup / Pickup',
    'Campus Delivery': 'Campus Delivery',
    'Both': 'Meetup / Pickup & Campus Delivery',
    'Remote': 'Remote Service',
    'On-site': 'On-site Service',
    // Legacy values for backward compatibility
    'pickup': 'Meetup / Pickup',
    'delivery': 'Campus Delivery',
    'campus delivery': 'Campus Delivery',
    'both': 'Meetup / Pickup & Campus Delivery',
    'remote': 'Remote Service',
    'on-site': 'On-site Service',
    'nationwide': 'Nationwide Delivery'
  };
  
  return deliveryMap[option] || option;
};

// Helper functions for order status
const getStatusColor = (status: string, theme: any) => {
  switch (status) {
    case 'pending': return theme.warning;
    case 'processing': return theme.info;
    case 'completed': return theme.success;
    case 'cancelled': return theme.error;
    case 'shipped': return '#302e9fff';
    default: return theme.textTertiary;
  }
};

const getStatusText = (status: string) => {
  switch (status) {
    case 'pending': return 'Pending Review';
    case 'processing': return 'Processing';
    case 'completed': return 'Completed';
    case 'cancelled': return 'Cancelled';
    default: return status;
  }
};

// === CUSTOM ALERT SYSTEM ===
const CustomAlert = ({ visible, title, message, buttons, onClose, theme }: any) => {
  if (!visible) return null;

  return (
    <Modal
      transparent={true}
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={[styles.alertOverlay, { backgroundColor: theme.modalOverlay }]}>
        <View style={[styles.alertContainer, { backgroundColor: theme.modalBackground, borderColor: theme.border }]}>
          <Text style={[styles.alertTitle, { color: theme.text }]}>{title}</Text>
          <Text style={[styles.alertMessage, { color: theme.textSecondary }]}>{message}</Text>
          <View style={styles.alertButtons}>
            {buttons.map((button: any, index: number) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.alertButton,
                  index === 0 ? styles.alertButtonPrimary : styles.alertButtonSecondary,
                  index === 0 ? { backgroundColor: theme.primary } : { backgroundColor: theme.surface, borderColor: theme.border }
                ]}
                onPress={() => {
                  button.onPress && button.onPress();
                  onClose();
                }}
              >
                <Text style={[
                  styles.alertButtonText,
                  index === 0 ? styles.alertButtonPrimaryText : styles.alertButtonSecondaryText,
                  index === 0 ? { color: '#000' } : { color: theme.text }
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

// === UTILITY FUNCTIONS ===
const getCurrentUserId = async () => {
  const { data } = await supabase.auth.getUser();
  return data?.user?.id ?? null;
};

const scoreAndSortProducts = (products: any[]): Product[] => {
  // Randomize products fully, boost by user activity and order products
  // Example user activity: likes, shares, views, orders
  // If product has user activity, boost its score
  const scored = products.map(p => {
    let score = Math.random();
    // Boost for user activity
    if (p.isLiked) score += 2;
    if (p.isShared) score += 1.5;
    if (p.likeCount) score += Math.min(p.likeCount * 0.1, 2);
    if (p.shareCount) score += Math.min(p.shareCount * 0.1, 1);
    if (p.view_count) score += Math.min(p.view_count * 0.01, 1);
    if (p.orderCount) score += Math.min(p.orderCount * 0.2, 2);
    // Boost for discounted products
    if (p.original_price && p.original_price > p.price) {
      const discountRatio = (p.original_price - p.price) / p.original_price;
      score += discountRatio * 5;
    }
    return {
      ...p,
      score,
      hasDiscount: p.original_price && p.original_price > p.price,
      discountPercent: p.original_price && p.original_price > p.price
        ? Math.round(((p.original_price - p.price) / p.original_price) * 100)
        : null,
      isVideo: p.media_urls?.[0]?.toLowerCase().includes('.mp4'),
    } as Product;
  });
  // Shuffle the array for full randomization
  for (let i = scored.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [scored[i], scored[j]] = [scored[j], scored[i]];
  }
  // Sort by score descending
  scored.sort((a, b) => b.score - a.score);

  // Interleave products to avoid consecutive same seller
  const interleaved: Product[] = [];
  const sellerBuckets: { [sellerId: string]: Product[] } = {};
  scored.forEach(p => {
    if (!sellerBuckets[p.seller_id]) sellerBuckets[p.seller_id] = [];
    sellerBuckets[p.seller_id].push(p);
  });
  const sellerIds = Object.keys(sellerBuckets);
  let index = 0;
  while (interleaved.length < scored.length) {
    for (const sellerId of sellerIds) {
      if (sellerBuckets[sellerId][index]) {
        interleaved.push(sellerBuckets[sellerId][index]);
      }
    }
    index++;
  }

  // Prevent more than two consecutive products from the same category or seller
  const finalFeed: Product[] = [];
  for (let i = 0; i < interleaved.length; i++) {
    const current = interleaved[i];
    const last1 = finalFeed[finalFeed.length - 1];
    const last2 = finalFeed[finalFeed.length - 2];
    // Prevent more than two consecutive from same category
    if (
      last1 && last2 &&
      last1.category === current.category &&
      last2.category === current.category
    ) {
      let swapIndex = i + 1;
      while (swapIndex < interleaved.length && interleaved[swapIndex].category === current.category) {
        swapIndex++;
      }
      if (swapIndex < interleaved.length) {
        [interleaved[i], interleaved[swapIndex]] = [interleaved[swapIndex], interleaved[i]];
      }
    }
    // Prevent more than two consecutive from same seller
    if (
      last1 && last2 &&
      last1.seller_id === current.seller_id &&
      last2.seller_id === current.seller_id
    ) {
      let swapIndex = i + 1;
      while (swapIndex < interleaved.length && interleaved[swapIndex].seller_id === current.seller_id) {
        swapIndex++;
      }
      if (swapIndex < interleaved.length) {
        [interleaved[i], interleaved[swapIndex]] = [interleaved[swapIndex], interleaved[i]];
      }
    }
    finalFeed.push(interleaved[i]);
  }

  // Personalization: boost categories user interacts with
  // Trending/featured/new products mixing
  // After two new products, show some older products
  const newProducts = finalFeed.filter(p => {
    const daysSinceUpload = (Date.now() - new Date(p.created_at ?? 0).getTime()) / (1000 * 60 * 60 * 24);
    return daysSinceUpload < 3;
  });
  const olderProducts = finalFeed.filter(p => {
    const daysSinceUpload = (Date.now() - new Date(p.created_at ?? 0).getTime()) / (1000 * 60 * 60 * 24);
    return daysSinceUpload >= 3;
  });
  // Mix trending/featured
  const trending = finalFeed.filter(p => p.is_trending);
  const featured = finalFeed.filter(p => p.is_featured);
  // Personalization: boost categories (example: userPreferredCategories)
  // This is a placeholder, replace with actual user preference
  const userPreferredCategories = ['Fashion', 'Electronics'];
  const personalized = finalFeed.filter(p => !!p.category && userPreferredCategories.includes(p.category));

  // Build the final feed
  let mixedFeed: Product[] = [];
  // Add two new products
  mixedFeed = mixedFeed.concat(newProducts.slice(0, 2));
  // Add trending/featured/personalized
  mixedFeed = mixedFeed.concat(trending.slice(0, 2));
  mixedFeed = mixedFeed.concat(featured.slice(0, 2));
  mixedFeed = mixedFeed.concat(personalized.slice(0, 2));
  // Add older products
  mixedFeed = mixedFeed.concat(olderProducts.slice(0, 6));
  // Fill up with remaining products, avoiding duplicates
  const usedIds = new Set(mixedFeed.map(p => p.id));
  mixedFeed = mixedFeed.concat(finalFeed.filter(p => !usedIds.has(p.id)));
  return mixedFeed;
};

// === CART MANAGER ===
const useCart = () => {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [cartVisible, setCartVisible] = useState(false);

  useEffect(() => {
    loadCart();
  }, []);

  const loadCart = async () => {
    try {
      const userId = await getCurrentUserId();
      if (!userId) {
        const savedCart = localStorage.getItem('cart');
        if (savedCart) {
          setCartItems(JSON.parse(savedCart));
        }
        return;
      }
      const { data, error } = await supabase
        .from('cart_items')
        .select('product_id, quantity, added_at, products(*)')
        .eq('user_id', userId);
      if (error) throw error;
      const items: CartItem[] = (data || []).map((item: any) => ({
        product: item.products,
        quantity: item.quantity,
        added_at: item.added_at,
      }));
      setCartItems(items);
    } catch (error) {
      console.error('Error loading cart:', error);
      const savedCart = localStorage.getItem('cart');
      if (savedCart) {
        setCartItems(JSON.parse(savedCart));
      }
    }
  };

  const saveCart = async (items: CartItem[]) => {
    try {
      localStorage.setItem('cart', JSON.stringify(items));
     
      const userId = await getCurrentUserId();
      if (userId) {
        await supabase.from('cart_items').delete().eq('user_id', userId);
       
        const cartItemsToInsert = items.map(item => ({
          user_id: userId,
          product_id: item.product.id,
          quantity: item.quantity,
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

  const addToCart = async (product: Product) => {
    const existingItemIndex = cartItems.findIndex(item => item.product.id === product.id);
    let newCartItems: CartItem[];
    
    // Prevent duplicate additions - throw error if product already exists
    if (existingItemIndex >= 0) {
      throw new Error('Product is already in cart');
    } else {
      newCartItems = [...cartItems, {
        product,
        quantity: 1,
        added_at: new Date().toISOString(),
      }];
    }
    
    setCartItems(newCartItems);
    await saveCart(newCartItems);
    return newCartItems;
  };

  const removeFromCart = async (productId: string) => {
    const newCartItems = cartItems.filter(item => item.product.id !== productId);
    setCartItems(newCartItems);
    await saveCart(newCartItems);
    return newCartItems;
  };

  const updateQuantity = async (productId: string, quantity: number) => {
    if (quantity < 1) {
      return removeFromCart(productId);
    }
    const newCartItems = cartItems.map(item =>
      item.product.id === productId ? { ...item, quantity } : item
    );
    setCartItems(newCartItems);
    await saveCart(newCartItems);
    return newCartItems;
  };

  const clearCart = async () => {
    setCartItems([]);
    await saveCart([]);
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

// === Helper function to send order notification to seller ===
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
          timestamp: new Date().toISOString(),
        },
        is_read: false,
        created_at: new Date().toISOString(),
      });
    if (error) {
      console.warn('Notification insert error (non-critical):', error);
    }
  } catch (error) {
    console.warn('Error sending notification to seller (non-critical):', error);
  }
};

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

// === MAIN SCREEN ===
export default function BuyerScreen() {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const pathname = usePathname();
  const params = useLocalSearchParams();
  const FEED_ITEM_HEIGHT = height;
  
  // Detect system color scheme
  const colorScheme = useColorScheme();
  const [theme, setTheme] = useState(colorScheme === 'dark' ? darkTheme : lightTheme);
  
  // Listen for system theme changes
  useEffect(() => {
    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      setTheme(colorScheme === 'dark' ? darkTheme : lightTheme);
    });
    
    return () => subscription.remove();
  }, []);
  
  // Update theme when colorScheme changes
  useEffect(() => {
    setTheme(colorScheme === 'dark' ? darkTheme : lightTheme);
  }, [colorScheme]);

  // State
  const [productFromQuery, setProductFromQuery] = useState<Product | null>(null);
  const [checkingQuery, setCheckingQuery] = useState(false);
  const [hasCheckedQuery, setHasCheckedQuery] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [commentsVisible, setCommentsVisible] = useState(false);
  const [sellerProfileVisible, setSellerProfileVisible] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedSellerId, setSelectedSellerId] = useState<string>('');
  const [fullViewerIndex, setFullViewerIndex] = useState(-1);
  const [fullViewerMediaUrls, setFullViewerMediaUrls] = useState<string[]>([]);
  const [orderFormVisible, setOrderFormVisible] = useState(false);
  const [orderForProduct, setOrderForProduct] = useState<Product | null>(null);
  const [orderInitialOptions, setOrderInitialOptions] = useState<{ selectedColor?: string | null; selectedSize?: string | null; quantity?: number | null } | null>(null);
  const [isCartOrder, setIsCartOrder] = useState(false);
  const [ordersModalVisible, setOrdersModalVisible] = useState(false);
  const [contactSellerVisible, setContactSellerVisible] = useState(false);
  const [contactSellerProduct, setContactSellerProduct] = useState<Product | null>(null);
  
  const [orderProductModalVisible, setOrderProductModalVisible] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [selectedOrderProduct, setSelectedOrderProduct] = useState<Product | null>(null);
  
  const [modalFromCart, setModalFromCart] = useState(false);
  const [modalFromSellerProfile, setModalFromSellerProfile] = useState(false);
  
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);
  const [userUniversity, setUserUniversity] = useState<string | null>(null);
  
  // Custom Alert State
  const [alert, setAlert] = useState({
    visible: false,
    title: '',
    message: '',
    buttons: [{ text: 'OK', onPress: () => {} }]
  });
  
  const videoRefs = useRef<{ [key: string]: any }>({});
  const [currentlyPlayingId, setCurrentlyPlayingId] = useState<string | null>(null);
  
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
  } = useCart();

  // Pause all videos when tab loses focus
  useFocusEffect(
    useCallback(() => {
      // Tab is focused - resume is handled by individual components
      return () => {
        // Tab is blurred - pause all videos
        Object.values(videoRefs.current).forEach(ref => {
          if (ref && typeof ref.pauseAsync === 'function') {
            ref.pauseAsync().catch(() => {});
          }
        });
      };
    }, [])
  );

  // Custom Alert Functions
  const showAlert = (title: string, message: string, buttons = [{ text: 'OK', onPress: () => {} }]) => {
    setAlert({
      visible: true,
      title,
      message,
      buttons
    });
  };

  const requireAuth = (action: string = 'continue') => {
    showAlert(
      'Login Required',
      `Please sign up or log in to ${action}.`,
      [
        { text: 'Maybe later', onPress: () => {} },
        { text: 'Login / Sign up', onPress: () => router.push('/auth') },
      ],
    );
  };

  const hideAlert = () => {
    setAlert(prev => ({ ...prev, visible: false }));
  };

  // Load selected campus (university) on mount
  useEffect(() => {
    const loadUserUniversity = async () => {
      try {
        const university = await getCurrentUserUniversity();
        setUserUniversity(university);
      } catch (error) {
        console.error('Error loading user university:', error);
      }
    };
    loadUserUniversity();
  }, []);

  const fetchUnreadNotificationCount = async () => {
    try {
      const userId = await getCurrentUserId();
      if (!userId) return 0;
      
      const { count, error } = await supabase
        .from('buyer_notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('is_read', false);
      
      if (error) {
        console.error('Error fetching unread notifications:', error);
        return 0;
      }
      
      return count || 0;
    } catch (error) {
      console.error('Error fetching unread notifications:', error);
      return 0;
    }
  };

  useEffect(() => {
    const loadNotificationCount = async () => {
      const count = await fetchUnreadNotificationCount();
      setUnreadNotificationCount(count);
    };
    
    loadNotificationCount();
    
    const loadSubscription = async () => {
      const userId = await getCurrentUserId();
      if (userId) {
        const channel = supabase
          .channel(`buyer-notifications-${userId}`)
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'buyer_notifications',
              filter: `user_id=eq.${userId}`
            },
            async () => {
              const newCount = await fetchUnreadNotificationCount();
              setUnreadNotificationCount(newCount);
            }
          )
          .subscribe();
        
        return () => {
          supabase.removeChannel(channel);
        };
      }
    };
    
    const cleanup = loadSubscription();
    return () => {
      if (cleanup && typeof cleanup.then === 'function') {
        cleanup.then(cleanupFn => cleanupFn && cleanupFn());
      }
    };
  }, []);

  useEffect(() => {
    const checkQueryParams = async () => {
      if (hasCheckedQuery) return;
     
      if (params.productId && typeof params.productId === 'string') {
        setCheckingQuery(true);
       
        try {
          const existingProduct = products.find(p => p.id === params.productId);
         
          if (existingProduct) {
            setProductFromQuery(existingProduct);
            setSelectedProduct(existingProduct);
            setModalFromCart(false);
            setTimeout(() => setModalVisible(true), 800);
          } else {
            const { data: productData, error } = await supabase
              .from('products')
              .select(`
                id, title, description, price, original_price, quantity,
                media_urls, seller_id, created_at,
                delivery_option, is_pre_order, pre_order_duration, pre_order_duration_unit,
                user_profiles(full_name, avatar_url, university),
                shops(name, avatar_url)
              `)
              .eq('id', params.productId)
              .single();
             
            if (error) {
              console.error('Error fetching product:', error);
              return;
            }
           
            if (productData) {
              // Explicitly type shop and profile to avoid 'never' type
              type ShopType = { name?: string; avatar_url?: string } | null | undefined;
              type ProfileType = { full_name?: string; avatar_url?: string; university?: string } | null | undefined;
              const shop = productData.shops as ShopType | ShopType[];
              const profile = productData.user_profiles as ProfileType;
             
              let avatarUrl;
              if (Array.isArray(shop) ? shop[0]?.avatar_url : (shop as ShopType)?.avatar_url) {
                const avatar = Array.isArray(shop) ? shop[0]?.avatar_url : (shop as ShopType)?.avatar_url;
                avatarUrl = avatar && avatar.startsWith('http')
                  ? avatar
                  : `${SUPABASE_URL}/storage/v1/object/public/avatars/${avatar}`;
              } else if (profile?.avatar_url) {
                avatarUrl = profile.avatar_url.startsWith('http')
                  ? profile.avatar_url
                  : `${SUPABASE_URL}/storage/v1/object/public/avatars/${profile.avatar_url}`;
              } else {
                const shopName = Array.isArray(shop) ? shop[0]?.name : (shop as ShopType)?.name;
                avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(shopName || profile?.full_name || 'U')}&background=FF9900&color=fff&bold=true`;
              }
             
              const shopName = Array.isArray(shop) ? shop[0]?.name : shop?.name;

              const product: Product = {
                ...productData,
                display_name: shopName || profile?.full_name || 'Verified Seller',
                avatar_url: avatarUrl,
                university: profile?.university || 'Campus',
                hasDiscount: productData.original_price && productData.original_price > productData.price,
                discountPercent: productData.original_price && productData.original_price > productData.price
                  ? Math.round(((productData.original_price - productData.price) / productData.original_price) * 100)
                  : null,
                isVideo: productData.media_urls?.[0]?.toLowerCase().includes('.mp4'),
                score: 0,
                commentCount: 0,
                likeCount: 0,
                shareCount: 0,
                followerCount: 0,
                isLiked: false,
                isShared: false,
                isFollowed: false,
                inCart: false,
              };
             
              setProductFromQuery(product);
              setSelectedProduct(product);
              setModalFromCart(false);
             
              setProducts(prev => {
                if (!prev.some(p => p.id === product.id)) {
                  return [...prev, product];
                }
                return prev;
              });
             
              setTimeout(() => {
                setModalVisible(true);
              }, 1000);
            }
          }
        } catch (err) {
          console.error('Error in checkQueryParams:', err);
        } finally {
          setCheckingQuery(false);
          setHasCheckedQuery(true);
        }
      }
    };
   
    const timer = setTimeout(() => {
      checkQueryParams();
    }, 1500);
   
    return () => clearTimeout(timer);
  }, [params.productId, products, hasCheckedQuery]);

  const openModal = (product: Product, fromCart = false, fromSellerProfile = false) => {
    setSelectedProduct(product);
    setModalFromCart(fromCart);
    setModalFromSellerProfile(fromSellerProfile);
    setModalVisible(true);
  };

  const openFullViewer = (mediaUrls: string[], index: number) => {
    setFullViewerMediaUrls(mediaUrls || []);
    setFullViewerIndex(index);
  };
 
  const openComments = (product: Product) => {
    setSelectedProduct(product);
    setCommentsVisible(true);
  };
 
  const openSellerProfile = (id: string) => {
    setSelectedSellerId(id);
    setSellerProfileVisible(true);
  };
 
  const openProductFromSeller = (product: Product) => {
    openModal(product, false, true);
    setSellerProfileVisible(false);
  };
  
  const handleViewProductDetails = (order: any, product: Product) => {
    setSelectedOrder(order);
    setSelectedOrderProduct(product);
    setOrdersModalVisible(false);
    setOrderProductModalVisible(true);
  };

  const handleCancelOrder = async (orderId: string) => {
    try {
      const userId = await getCurrentUserId();
      if (!userId) {
        showAlert('Error', 'User not found');
        return;
      }
      
      const { data: order, error: fetchError } = await supabase
        .from('orders')
        .select('status')
        .eq('id', orderId)
        .single();
      
      if (fetchError) throw fetchError;
      
      if (order.status === 'cancelled') {
        showAlert('Error', 'This order has already been cancelled');
        return;
      }
      
      if (order.status !== 'pending' && order.status !== 'processing') {
        showAlert('Cannot Cancel', 'This order can no longer be cancelled.');
        return;
      }
      
      const { error } = await supabase
        .from('orders')
        .update({
          status: 'cancelled',
          cancelled_at: new Date().toISOString(),
          cancelled_by: userId,
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId)
        .in('status', ['pending', 'processing']);
      
      if (error) throw error;
      
      showAlert('Success', 'Order cancelled successfully');
      setOrderProductModalVisible(false);
    } catch (error: any) {
      showAlert('Error', error.message || 'Failed to cancel order');
    }
  };

  const handleSelectSimilarProduct = (product: Product) => {
    openModal(product, false, false);
  };

  const handleAddToCart = async (product: Product) => {
    try {
      const userId = await getCurrentUserId();
      if (!userId) {
        requireAuth('add items to your cart');
        return;
      }

      await addToCart(product);
    } catch (error: any) {
      if (String(error?.message || '').toLowerCase().includes('not authenticated')) {
        requireAuth('add items to your cart');
        return;
      }
      showAlert('Error', error?.message || 'Failed to add product to cart');
      return;
    }
   
    setProducts(prev => prev.map(p =>
      p.id === product.id ? { ...p, inCart: true } : p
    ));
   
    if (selectedProduct && selectedProduct.id === product.id) {
      setSelectedProduct(prev => prev ? { ...prev, inCart: true } : null);
    }
   
    if (productFromQuery && productFromQuery.id === product.id) {
      setProductFromQuery(prev => prev ? { ...prev, inCart: true } : null);
    }
   
    // Do not return cart items here to match expected handler signature (Promise<void>)
  };

  const handleRemoveFromCart = async (productId: string) => {
    try {
      const userId = await getCurrentUserId();
      if (!userId) {
        requireAuth('manage your cart');
        return;
      }

      await removeFromCart(productId);
    } catch (error: any) {
      if (String(error?.message || '').toLowerCase().includes('not authenticated')) {
        requireAuth('manage your cart');
        return;
      }
      showAlert('Error', error?.message || 'Failed to remove item from cart');
      return;
    }
   
    setProducts(prev => prev.map(p =>
      p.id === productId ? { ...p, inCart: false } : p
    ));
   
    // Do not return cart items to align with expected handler types
  };

  const handleUpdateQuantity = async (productId: string, quantity: number) => {
    try {
      const userId = await getCurrentUserId();
      if (!userId) {
        requireAuth('update your cart');
        return;
      }

      await updateQuantity(productId, quantity);
    } catch (error: any) {
      if (String(error?.message || '').toLowerCase().includes('not authenticated')) {
        requireAuth('update your cart');
        return;
      }
      showAlert('Error', error?.message || 'Failed to update quantity');
    }
    // no return value to match expected Promise<void> signature
  };

  const handleClearCart = async () => {
    try {
      const userId = await getCurrentUserId();
      if (!userId) {
        requireAuth('clear your cart');
        return;
      }

      await clearCart();
    } catch (error: any) {
      if (String(error?.message || '').toLowerCase().includes('not authenticated')) {
        requireAuth('clear your cart');
        return;
      }
      showAlert('Error', error?.message || 'Failed to clear cart');
      return;
    }
   
    setProducts(prev => prev.map(p => ({ ...p, inCart: false })));
   
    if (selectedProduct) {
      setSelectedProduct(prev => prev ? { ...prev, inCart: false } : null);
    }
  };

  const handlePlaceOrder = async (
    product: Product,
    options?: { selectedColor?: string | null; selectedSize?: string | null; quantity?: number | null },
  ) => {
    const userId = await getCurrentUserId();
    if (!userId) {
      requireAuth('place an order');
      return;
    }

    setOrderForProduct(product);
    setIsCartOrder(false);
    setOrderInitialOptions(options || null);
    setOrderFormVisible(true);
  };

  const handleCartPlaceOrder = async () => {
    const userId = await getCurrentUserId();
    if (!userId) {
      requireAuth('place an order');
      return;
    }

    if (cartItems.length === 0) return;
    setOrderForProduct(null);
    setIsCartOrder(true);
    setOrderFormVisible(true);
    setCartVisible(false);
  };

  const handleSubmitOrder = async (orderData: OrderFormData) => {
    try {
      const userId = await getCurrentUserId();
      if (!userId) {
        requireAuth('place an order');
        throw new Error('Please log in to place an order');
      }
      
      if (!orderData.fullName.trim()) {
        throw new Error('Please enter your full name');
      }
      if (!orderData.phoneNumber.trim()) {
        throw new Error('Please enter your phone number');
      }
      if (!orderData.location.trim()) {
        throw new Error('Please enter your location');
      }
      
      let phoneNumber = orderData.phoneNumber;
      if (phoneNumber.startsWith('0')) {
        phoneNumber = '+233' + phoneNumber.substring(1);
      } else if (!phoneNumber.startsWith('+')) {
        phoneNumber = '+233' + phoneNumber;
      }
      
      if (isCartOrder) {
        if (cartItems.length === 0) {
          throw new Error('Cart is empty');
        }

        // Group cart items by seller
        const sellerGroups = cartItems.reduce((groups, item) => {
          const sellerId = item.product.seller_id;
          if (!groups[sellerId]) {
            groups[sellerId] = [];
          }
          groups[sellerId].push(item);
          return groups;
        }, {} as Record<string, typeof cartItems>);

        for (const [sellerId, items] of Object.entries(sellerGroups)) {
          const sellerTotal = items.reduce((total, item) => total + (item.product.price * item.quantity), 0);

          // Create the main order for this seller
          const { data: order, error: orderError } = await supabase
            .from('orders')
            .insert({
              user_id: userId,
              seller_id: sellerId,
              buyer_name: orderData.fullName,
              phone_number: phoneNumber,
              location: orderData.location,
              delivery_option: orderData.deliveryOption,
              additional_notes: orderData.additionalNotes || '',
              total_amount: sellerTotal,
              status: 'pending',
              is_cart_order: true,
              selected_color: null,
              selected_size: null,
              quantity: null,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
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
            product_image_url: getCardDisplayUrl(item.product.media_urls) || null,
            quantity: item.quantity,
            total_price: item.product.price * item.quantity,
            seller_id: sellerId,
            size: item.selectedSize || item.product.selectedSize || null,
            color: item.selectedColor || item.product.selectedColor || null,
            created_at: new Date().toISOString(),
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
            product_name: items.length > 1 ? `${items.length} items` : items[0].product.title,
            product_price: sellerTotal,
            product_image: getCardDisplayUrl(items[0]?.product.media_urls) || null,
            quantity: items.reduce((total, item) => total + item.quantity, 0),
            buyer_name: orderData.fullName,
            buyer_phone: phoneNumber,
            total_amount: sellerTotal,
            delivery_option: orderData.deliveryOption,
            location: orderData.location,
            items: items.map(item => ({
              name: item.product.title,
              quantity: item.quantity,
              size: item.product.selectedSize,
              color: item.product.selectedColor,
              price: item.product.price,
              total: item.product.price * item.quantity,
            })),
          });

          // Send notification to buyer for each order
          await sendOrderNotificationToBuyer({
            user_id: userId,
            order_id: order.id,
            total_amount: sellerTotal,
            items_count: items.length,
          });
        }

        await clearCart();
        setOrderFormVisible(false);
        setCartVisible(false);
        showAlert(
          'Order Successful!',
          'Your cart order has been placed successfully. The sellers will contact you shortly.',
          [
            { 
              text: 'OK', 
              onPress: () => {
                if (ordersModalVisible) {
                  // Optional: Refresh orders list
                }
              }
            }
          ]
        );
      } else if (orderForProduct) {
        // For single product order, calculate total with quantity
        const quantity = orderData.quantity || 1;
        const totalAmount = orderForProduct.price * quantity;
        
        const { data: order, error: orderError } = await supabase
          .from('orders')
          .insert({
            user_id: userId,
            seller_id: orderForProduct.seller_id,
            product_id: orderForProduct.id,
            product_name: orderForProduct.title,
            product_price: orderForProduct.price,
            product_image_url: getCardDisplayUrl(orderForProduct.media_urls) || null,
            buyer_name: orderData.fullName,
            phone_number: phoneNumber,
            location: orderData.location,
            delivery_option: orderData.deliveryOption,
            additional_notes: orderData.additionalNotes || '',
            total_amount: totalAmount,
            status: 'pending',
            is_cart_order: false,
            // Store selected size, color, and quantity at order level
            selected_color: orderData.selectedColor || null,
            selected_size: orderData.selectedSize || null,
            quantity: quantity,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .select()
          .single();
          
        if (orderError) {
          console.error('Single order error:', orderError);
          throw new Error(`Failed to create order: ${orderError.message}`);
        }
        
        const orderItemData = {
          order_id: order.id,
          product_id: orderForProduct.id,
          product_name: orderForProduct.title,
          product_price: orderForProduct.price,
          product_image_url: getCardDisplayUrl(orderForProduct.media_urls) || null,
          quantity: quantity,
          total_price: totalAmount,
          seller_id: orderForProduct.seller_id,
          size: orderData.selectedSize || null,
          color: orderData.selectedColor || null,
          created_at: new Date().toISOString(),
        };
        
        const { error: itemsError } = await supabase
          .from('order_items')
          .insert(orderItemData);
          
        if (itemsError) {
          console.error('Order item insert error:', itemsError);
          await supabase.from('orders').delete().eq('id', order.id);
          throw new Error('Failed to create order item. Please try again.');
        }
        
        // Update product stock if not a service
        if (orderForProduct.category !== 'Services') {
          // Fetch current product to get stock info
          const { data: productData } = await supabase
            .from('products')
            .select('*')
            .eq('id', orderForProduct.id)
            .single();
          
          if (productData) {
            let updateData: any = {};
            
            // Handle size-specific stock
            if (orderData.selectedSize && productData.sizes_available?.includes(orderData.selectedSize)) {
              const sizeStock = productData.size_stock || {};
              const currentQty = parseInt(sizeStock[orderData.selectedSize] || '0');
              const newQty = Math.max(0, currentQty - quantity);
              
              updateData.size_stock = {
                ...sizeStock,
                [orderData.selectedSize]: newQty.toString(),
              };
            }
            // Handle color-specific stock
            else if (orderData.selectedColor && productData.colors_available?.includes(orderData.selectedColor)) {
              const colorStock = productData.color_stock || {};
              const currentQty = parseInt(colorStock[orderData.selectedColor] || '0');
              const newQty = Math.max(0, currentQty - quantity);
              
              updateData.color_stock = {
                ...colorStock,
                [orderData.selectedColor]: newQty.toString(),
              };
            }
            // Handle general stock
            else {
              const currentQty = productData.quantity || 0;
              updateData.quantity = Math.max(0, currentQty - quantity);
            }
            
            // Update product stock
            await supabase
              .from('products')
              .update(updateData)
              .eq('id', orderForProduct.id);
          }
        }
        
        try {
          await sendOrderNotificationToSeller({
            order_id: order.id,
            seller_id: orderForProduct.seller_id,
            product_name: orderForProduct.title,
            product_price: orderForProduct.price,
            product_image: getCardDisplayUrl(orderForProduct.media_urls) || null,
            quantity: quantity,
            size: orderData.selectedSize,
            color: orderData.selectedColor,
            buyer_name: orderData.fullName,
            buyer_phone: phoneNumber,
            total_amount: totalAmount,
            delivery_option: orderData.deliveryOption,
            location: orderData.location,
          });
        } catch (notifError) {
          console.warn('Notification error:', notifError);
        }
        
        try {
          await sendOrderNotificationToBuyer({
            user_id: userId,
            order_id: order.id,
            total_amount: totalAmount,
            items_count: 1,
          });
          
          const newCount = await fetchUnreadNotificationCount();
          setUnreadNotificationCount(newCount);
        } catch (notifError) {
          console.warn('Buyer notification error:', notifError);
        }
        
        setOrderFormVisible(false);
        setModalVisible(false);
        setSellerProfileVisible(false);
        
        showAlert(
          'Order Successful!',
          `Your order #${order.id.slice(-8)} has been placed successfully. ` +
          `Quantity: ${quantity} • ` +
          (orderData.selectedSize ? `Size: ${orderData.selectedSize} • ` : '') +
          (orderData.selectedColor ? `Color: ${orderData.selectedColor} • ` : '') +
          `Total: GHS ${totalAmount.toFixed(2)}\n\n` +
          `The seller will contact you shortly.\n\nContact seller via the order details in your orders page when seller delays to reach out.`,
          [
            { 
              text: 'OK', 
              onPress: () => {
                if (ordersModalVisible) {
                  // Optional: Refresh orders list
                }
              }
            }
          ]
        );
      } else {
        throw new Error('No product selected for order');
      }
      
    } catch (error: any) {
      console.error('Order submission error:', error);
      
      showAlert(
        'Order Failed',
        error.message || 'Failed to submit order. Please try again.'
      );
      
      throw error;
    }
  };

  const handleShare = async (product: Product, platform: string) => {
    const userId = await getCurrentUserId();
   
    if (!userId) {
      requireAuth('share');
      return;
    }
    try {
      return Promise.resolve();
    } catch (error) {
      console.error('Share recording error:', error);
      showAlert('Error', 'Failed to record share');
      return;
    }
  };

  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (!viewableItems.length) return;
   
    // Pause all videos first
    Object.values(videoRefs.current).forEach(v => {
      if (v && typeof v.pauseAsync === 'function') {
        v.pauseAsync();
      }
    });
   
    const visibleItem = viewableItems[0]?.item;
    if (visibleItem?.isVideo && videoRefs.current[visibleItem.id]) {
      try {
        // Restart video from beginning when returning to it
        const videoRef = videoRefs.current[visibleItem.id];
        videoRef.setPositionAsync(0).then(() => {
          videoRef.playAsync();
        }).catch(() => {
          // If setPositionAsync fails, just play from current position
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

  // Get selected campus university (works even when not logged in)
  // Get campus: if authenticated, use profile; else use AsyncStorage
  const getCurrentUserUniversity = async () => {
    try {
      const { data } = await supabase.auth.getUser();
      const userId = data?.user?.id;
      if (userId) {
        // Authenticated: get campus from profile
        const { data: profile, error } = await supabase
          .from('user_profiles')
          .select('university')
          .eq('id', userId)
          .single();
        if (!error && profile?.university) {
          return profile.university;
        }
      }
      // Not authenticated or no profile campus: fallback to AsyncStorage
      return await getSelectedCampus();
    } catch (error) {
      console.error('Error in getCurrentUserUniversity:', error);
      return null;
    }
  };

  const loadProducts = useCallback(async (currentPage: number) => {
    if (!hasMore && currentPage > 0) return;

    // Skip university gating on onboarding/auth/bravexyz00 routes so we don't show alerts there
    const skipUniversityCheck = pathname?.includes('onboarding') || pathname?.includes('auth') || pathname?.includes('bravexyz00');
    if (skipUniversityCheck) {
      setLoadingInitial(false);
      setLoadingMore(false);
      return;
    }

    try {
      if (currentPage === 0) {
        setLoadingInitial(true);
      } else {
        setLoadingMore(true);
      }
      const from = currentPage * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      
      // Get current user's university first
      const currentUserUniversity = await getCurrentUserUniversity();
      const currentUserId = await getCurrentUserId();
      
      if (!currentUserUniversity) {
        router.replace('/onboarding');
        setLoadingInitial(false);
        setLoadingMore(false);
        return;
      }
      
      console.log('📚 Current user university:', currentUserUniversity);
      console.log('👤 Current user ID:', currentUserId);
      
      // Fetch products only from sellers in the same university
      // OR products from the current user (if they're a seller)
      let query = supabase
        .from('products')
        .select('id, title, description, price, original_price, quantity, media_urls, seller_id, created_at, delivery_option, is_pre_order, pre_order_duration, pre_order_duration_unit')
        .range(from, to)
        .order('created_at', { ascending: false });
      
      // Apply university filter
      // Get seller profiles to filter by university
      const { data: sellerProfiles, error: profilesError } = await supabase
        .from('user_profiles')
        .select('id, university')
        .eq('university', currentUserUniversity);
      
      if (profilesError) {
        console.error('Error fetching seller profiles:', profilesError);
        throw profilesError;
      }
      
      const sameUniversitySellerIds = sellerProfiles?.map(profile => profile.id) || [];
      console.log('🎓 Sellers in same university:', sameUniversitySellerIds.length);
      
      // If current user is a seller, include their products too
      const allSellerIds = [...sameUniversitySellerIds];
      
      if (allSellerIds.length === 0) {
        console.log('⚠️ No sellers found in your university');
        setProducts([]);
        setHasMore(false);
        setLoadingInitial(false);
        setLoadingMore(false);
        return;
      }
      
      query = query.in('seller_id', allSellerIds);
      
      const { data: rawProducts, error } = await query;
      
      if (error) throw error;
      if (!rawProducts?.length) { 
        setHasMore(false); 
        setLoadingInitial(false); 
        setLoadingMore(false); 
        return; 
      }
      
      console.log('✅ Products found for current university:', rawProducts.length);
      
      const productIds = rawProducts.map(p => p.id);
      const sellerIds = [...new Set(rawProducts.map(p => p.seller_id))];
      const userId = currentUserId;
      
      // Fetch ALL related data including share counts from product_shares table
      const [
        { data: likesData },
        { data: sharesData },  // This gets share counts from product_shares table
        { data: commentsData },
        { data: followsData },
        userLikesRes,
        userFollowsRes,
        { data: cartData },
        { data: userSharesRes },  // Check if current user has shared these products
      ] = await Promise.all([
        supabase.from('product_likes').select('product_id').in('product_id', productIds),
        supabase.from('product_shares').select('product_id').in('product_id', productIds), // Count shares from product_shares
        supabase.from('product_comments').select('product_id').in('product_id', productIds),
        supabase.from('shop_follows').select('shop_owner_id').in('shop_owner_id', sellerIds),
        userId ? supabase.from('product_likes').select('product_id').eq('user_id', userId).in('product_id', productIds) : { data: [] },
        userId ? supabase.from('shop_follows').select('shop_owner_id').eq('follower_id', userId).in('shop_owner_id', sellerIds) : { data: [] },
        userId ? supabase.from('cart_items').select('product_id').eq('user_id', userId).in('product_id', productIds) : { data: [] },
        userId ? supabase.from('product_shares').select('product_id').eq('user_id', userId).in('product_id', productIds) : { data: [] }, // Check user's shares
      ]);
      
      // Count shares from product_shares table
      const shareCounts = (sharesData || []).reduce((acc: any, s: any) => ({ 
        ...acc, 
        [s.product_id]: (acc[s.product_id] || 0) + 1 
      }), {});
      
      const userShares = ((userSharesRes as any)?.data || userSharesRes || []).map((s: any) => s.product_id);
      const userLikes = ((userLikesRes as any)?.data || userLikesRes || []).map((l: any) => l.product_id);
      const userFollows = ((userFollowsRes as any)?.data || userFollowsRes || []).map((f: any) => f.shop_owner_id);
      const cartProductIds = (cartData || []).map(c => c.product_id);
      
      const likeCounts = (likesData || []).reduce((acc: any, l: any) => ({ ...acc, [l.product_id]: (acc[l.product_id] || 0) + 1 }), {});
      const commentCounts = (commentsData || []).reduce((acc: any, c: any) => ({ ...acc, [c.product_id]: (acc[c.product_id] || 0) + 1 }), {});
      const followerCounts = (followsData || []).reduce((acc: any, f: any) => ({ ...acc, [f.shop_owner_id]: (acc[f.shop_owner_id] || 0) + 1 }), {});
      
      // Use scoreAndSortProducts to fairly/randomly sort products, boosting older and discounted items
      const scored = scoreAndSortProducts(rawProducts);
      
      // Get seller info
      const [shopsRes, profilesRes] = await Promise.all([
        supabase.from('shops').select('owner_id, name, avatar_url').in('owner_id', sellerIds),
        supabase.from('user_profiles').select('id, full_name, avatar_url, university').in('id', sellerIds),
      ]);
      
      const shops = shopsRes.data || [];
      const profiles = profilesRes.data || [];
      
      // Enrich products with all counts including share count from product_shares
      // Filter products so only those from sellers whose profile university matches the selected campus are shown
      const filteredProducts = scored.filter(p => {
        const profile = profiles.find((pr: any) => pr.id === p.seller_id);
        return profile?.university === currentUserUniversity;
      });

      const enriched: Product[] = filteredProducts.map(p => {
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
          display_name: shop?.name || profile?.full_name || 'Verified Seller',
          avatar_url: avatarUrl,
          university: profile?.university || 'Campus',
          commentCount: commentCounts[p.id] || 0,
          likeCount: likeCounts[p.id] || 0,
          shareCount: shareCounts[p.id] || 0, // Now from product_shares table
          followerCount: followerCounts[p.seller_id] || 0,
          isLiked: userLikes.includes(p.id),
          isShared: userShares.includes(p.id), // Track if user shared
          isFollowed: userFollows.includes(p.seller_id),
          inCart: cartProductIds.includes(p.id),
        } as Product;
      });

      setProducts(prev => currentPage === 0 ? enriched : [...prev, ...enriched]);
      setHasMore(filteredProducts.length === PAGE_SIZE);
      setPage(currentPage + 1);
    } catch (err) {
      console.error('Load products error:', err);
    } finally {
      setLoadingInitial(false);
      setLoadingMore(false);
    }
  }, [hasMore, pathname]);

  useEffect(() => {
    loadProducts(0);
    loadCart();
  }, []);

  useEffect(() => {
    const channel = supabase.channel('realtime-product-counts');
    
    // Listen for product_shares changes (UPDATED)
    channel.on('postgres_changes', { 
      event: 'INSERT', 
      schema: 'public', 
      table: 'product_shares' 
    }, (payload: any) => {
      const productId = payload.new?.product_id;
      const userId = payload.new?.user_id;
      if (!productId) return;
      
      // Only update real-time if it's not from the current user (to avoid double increment from optimistic update)
      getCurrentUserId().then(currentUserId => {
        if (userId !== currentUserId) {
          setProducts(prev => prev.map(p => 
            p.id === productId ? { ...p, shareCount: (p.shareCount || 0) + 1 } : p
          ));
        }
      });
    });
    
    channel.on('postgres_changes', { 
      event: 'DELETE', 
      schema: 'public', 
      table: 'product_shares' 
    }, (payload: any) => {
      const productId = payload.old?.product_id;
      const userId = payload.old?.user_id;
      if (!productId) return;
      
      // Only update real-time if it's not from the current user (to avoid double decrement from optimistic update)
      getCurrentUserId().then(currentUserId => {
        if (userId !== currentUserId) {
          setProducts(prev => prev.map(p => 
            p.id === productId ? { ...p, shareCount: Math.max((p.shareCount || 1) - 1, 0) } : p
          ));
        }
      });
    });
    
    // Keep existing listeners
    channel.on('postgres_changes', { event: '*', schema: 'public', table: 'product_likes' }, (payload: any) => {
      const newRow = payload.new;
      const oldRow = payload.old;
      const productId = newRow?.product_id ?? oldRow?.product_id;
      const userId = newRow?.user_id ?? oldRow?.user_id;
      if (!productId) return;
      const delta = payload.eventType === 'INSERT' || payload.event === 'INSERT' ? 1 : (payload.eventType === 'DELETE' || payload.event === 'DELETE' ? -1 : 0);
      if (delta === 0) return;
      // Only update real-time if it's not from the current user (to avoid double increment from optimistic update)
      getCurrentUserId().then(currentUserId => {
        if (userId !== currentUserId) {
          setProducts(prev => prev.map(p => p.id === productId ? { ...p, likeCount: Math.max((p.likeCount || 0) + delta, 0) } : p));
        }
      });
    });
    
    channel.on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'product_comments' }, (payload: any) => {
      const productId = payload.new?.product_id;
      if (!productId) return;
      setProducts(prev => prev.map(p => p.id === productId ? { ...p, commentCount: (p.commentCount || 0) + 1 } : p));
    });
    
    channel.on('postgres_changes', { event: '*', schema: 'public', table: 'shop_follows' }, (payload: any) => {
      const shopOwnerId = payload.new?.shop_owner_id ?? payload.old?.shop_owner_id;
      if (!shopOwnerId) return;
      const delta = payload.eventType === 'INSERT' || payload.event === 'INSERT' ? 1 : (payload.eventType === 'DELETE' || payload.event === 'DELETE' ? -1 : 0);
      if (delta === 0) return;
      setProducts(prev => prev.map(p => p.seller_id === shopOwnerId ? { ...p, followerCount: Math.max((p.followerCount || 0) + delta, 0) } : p));
    });
    
    channel.subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleLoadMore = () => { if (!loadingMore && hasMore) loadProducts(page); };

  useEffect(() => {
    return () => {
      Object.values(videoRefs.current).forEach(v => {
        if (v && typeof v.unloadAsync === 'function') {
          v.unloadAsync();
        }
      });
      videoRefs.current = {};
    };
  }, []);

  if (checkingQuery) {
    return (
      <View style={[styles.center, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
        <Text style={{ color: theme.text, marginTop: 20, fontSize: 16 }}>
          Loading shared product...
        </Text>
      </View>
    );
  }

  if (loadingInitial) {
    return (
      <View style={[styles.center, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <StatusBar barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'} translucent backgroundColor="transparent" />
      
      {/* Custom Alert Component */}
      <CustomAlert
        visible={alert.visible}
        title={alert.title}
        message={alert.message}
        buttons={alert.buttons}
        onClose={hideAlert}
        theme={theme}
      />
      
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <TouchableOpacity
          style={styles.headerIcon}
          onPress={async () => {
            const userId = await getCurrentUserId();
            if (!userId) {
              requireAuth('view your orders');
              return;
            }

            setOrdersModalVisible(true);
            // Clear notification count when viewing orders
            if (userId) {
              await supabase
                .from('buyer_notifications')
                .update({ is_read: true })
                .eq('user_id', userId)
                .eq('is_read', false);
              setUnreadNotificationCount(0);
            }
          }}
        >
          <Ionicons 
            name="receipt-outline" 
            size={24} 
            color={colorScheme === 'dark' ? theme.text : '#FF6600'} 
          />
          {unreadNotificationCount > 0 && (
            <View style={[styles.ordersBadge, { backgroundColor: theme.error }]}>
              <Text style={styles.ordersBadgeText}>
                {unreadNotificationCount > 99 ? '99+' : unreadNotificationCount}
              </Text>
            </View>
          )}
        </TouchableOpacity>
       
        <TouchableOpacity
          style={styles.headerIcon}
          onPress={async () => {
            const userId = await getCurrentUserId();
            if (!userId) {
              requireAuth('view your cart');
              return;
            }
            setCartVisible(true);
          }}
        >
          <Ionicons 
            name="cart-outline" 
            size={24} 
            color={colorScheme === 'dark' ? theme.text : '#FF6600'} 
          />
          {getCartCount() > 0 && (
            <View style={[styles.cartBadge, { backgroundColor: theme.primary }]}>
              <Text style={styles.cartBadgeText}>{getCartCount()}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>
      <FlatList
        data={products}
        renderItem={({ item }) => (
          <ProductFeedCard
            item={item}
            ITEM_HEIGHT={FEED_ITEM_HEIGHT}
            width={width}
            insets={insets}
            openModal={openModal}
            openComments={openComments}
            openSellerProfile={openSellerProfile}
            videoRef={(ref) => {
              if (ref) videoRefs.current[item.id] = ref;
              else delete videoRefs.current[item.id];
            }}
            setProducts={setProducts as any}
            onAddToCart={handleAddToCart as any}
            onPlaceOrder={handlePlaceOrder}
            onShare={handleShare}
            showAlert={showAlert}
            theme={theme}
            styles={styles}
            getCurrentUserId={getCurrentUserId}
            getCardDisplayUrl={getCardDisplayUrl}
            ShareModalComponent={ShareModal}
          />
        )}
        keyExtractor={item => item.id}
        pagingEnabled
        snapToAlignment="start"
        snapToInterval={FEED_ITEM_HEIGHT}
        decelerationRate="fast"
        showsVerticalScrollIndicator={false}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        ListFooterComponent={loadingMore ? (
          <View style={styles.loadingFooter}>
            <ActivityIndicator size="small" color={theme.primary} />
            <Text style={[styles.loadingFooterText, { color: theme.textSecondary }]}>Loading more...</Text>
          </View>
        ) : null}
        ListEmptyComponent={!loadingInitial ? (
          <View style={[styles.emptyState, { backgroundColor: theme.background }]}>
            <Ionicons name="search-outline" size={80} color={theme.primary} />
            <Text style={[styles.emptyTitle, { color: theme.text }]}>No products found</Text>
            <Text style={[styles.emptySubtitle, { color: theme.textSecondary }]}>
              {userUniversity
                ? `No products available in ${userUniversity}`
                : 'No products available at your campus'}
            </Text>
          </View>
        ) : null}
        getItemLayout={(_, index) => ({ length: FEED_ITEM_HEIGHT, offset: FEED_ITEM_HEIGHT * index, index })}
      />
      
      <ProductDetailModal
        isVisible={modalVisible}
        onClose={() => {
          setModalVisible(false);
          if (params.productId) {
            router.setParams({});
            setProductFromQuery(null);
          }
        }}
        product={selectedProduct || productFromQuery}
        onOpenFullViewer={(index) => openFullViewer((selectedProduct || productFromQuery)?.media_urls || [], index)}
        onSelectSimilarProduct={handleSelectSimilarProduct as any}
        onAddToCart={handleAddToCart as any}
        isInCart={() => cartItems.some(item => item.product.id === (selectedProduct?.id || productFromQuery?.id))}
        cartItems={cartItems}
        onPlaceOrder={handlePlaceOrder}
        fromCart={modalFromCart}
        fromSellerProfile={modalFromSellerProfile}
        showAlert={showAlert}
        theme={theme}
        getCurrentUserId={getCurrentUserId}
        getCardDisplayUrl={getCardDisplayUrl}
        formatDeliveryOption={formatDeliveryOption}
        onOpenSellerProfile={openSellerProfile}
        SimilarProductsSectionComponent={SimilarProductsSection as any}
      />
      
      <CommentsModal 
        isVisible={commentsVisible} 
        onClose={() => setCommentsVisible(false)} 
        product={selectedProduct}
        showAlert={showAlert}
        theme={theme}
        getCurrentUserId={getCurrentUserId}
      />
      <FullImageViewer 
        isVisible={fullViewerIndex !== -1} 
        onClose={() => setFullViewerIndex(-1)} 
        mediaUrls={fullViewerMediaUrls} 
        initialIndex={fullViewerIndex}
        theme={theme}
        screenWidth={screenWidth}
      />
      
      <SellerProfileModal
        isVisible={sellerProfileVisible}
        onClose={() => setSellerProfileVisible(false)}
        sellerId={selectedSellerId}
        onOpenProduct={openProductFromSeller as any}
        onAddToCart={handleAddToCart as any}
        onPlaceOrder={handlePlaceOrder}
        showAlert={showAlert}
        theme={theme}
        getCurrentUserId={getCurrentUserId}
        getCardDisplayMedia={getCardDisplayMedia}
        scoreAndSortProducts={scoreAndSortProducts}
      />
      
      <CartModal
        isVisible={cartVisible}
        onClose={() => setCartVisible(false)}
        cartItems={cartItems}
        onUpdateQuantity={handleUpdateQuantity as any}
        onRemoveItem={handleRemoveFromCart as any}
        onClearCart={handleClearCart}
        onViewProduct={(product, fromCart) => openModal(product, fromCart, false)}
        onPlaceOrder={handleCartPlaceOrder}
        showAlert={showAlert}
        theme={theme}
        getCardDisplayUrl={getCardDisplayUrl}
      />

     <OrderFormModal
       isVisible={orderFormVisible}
       onClose={() => setOrderFormVisible(false)}
       product={orderForProduct}
       onSubmitOrder={handleSubmitOrder}
       isCartOrder={isCartOrder}
       cartTotal={getCartTotal()}
       cartItems={cartItems} // Add this prop
       showAlert={showAlert}
       initialSelectedColor={orderInitialOptions?.selectedColor ?? null}
       initialSelectedSize={orderInitialOptions?.selectedSize ?? null}
       initialQuantity={orderInitialOptions?.quantity ?? null}
       theme={theme}
       styles={styles}
     />
     
      {/* Using the fixed OrderProductDetailModal component */}
      <HomeOrderProductDetailModal
        isVisible={orderProductModalVisible}
        onClose={() => {
          setOrderProductModalVisible(false);
          setSelectedOrder(null);
          setSelectedOrderProduct(null);
        }}
        product={selectedOrderProduct}
        order={selectedOrder}
        onOpenFullViewer={(mediaUrls, index) => openFullViewer(mediaUrls, index)}
        onContactSeller={() => {
          if (selectedOrderProduct) {
            setContactSellerProduct(selectedOrderProduct);
          }
          setOrderProductModalVisible(false);
          setContactSellerVisible(true);
        }}
        onCancelOrder={handleCancelOrder}
        showAlert={showAlert}
        theme={theme}
        getStatusColor={getStatusColor}
        getStatusText={getStatusText}
        formatDeliveryOption={formatDeliveryOption}
        ProductMediaViewComponent={ProductMediaView as any}
      />
     
      <OrdersScreenModal
        isVisible={ordersModalVisible}
        onClose={() => setOrdersModalVisible(false)}
        onViewProductDetails={handleViewProductDetails}
        showAlert={showAlert}
        theme={theme}
        styles={styles}
        supabaseUrl={SUPABASE_URL}
        getStatusColor={getStatusColor}
        getStatusText={getStatusText}
        formatDeliveryOption={formatDeliveryOption}
        getCardDisplayMedia={getCardDisplayMedia}
        getCardDisplayUrl={getCardDisplayUrl}
        isVideoUrl={isVideoUrl}
        CalendarFilterComponent={CalendarFilter}
      />
     
      <ContactSellerModal
        isVisible={contactSellerVisible}
        onClose={() => {
          setContactSellerVisible(false);
          if (selectedOrder) {
            setOrderProductModalVisible(true);
          } else {
            setModalVisible(true);
          }
        }}
        product={contactSellerProduct}
        order={selectedOrder}
        onReopenProductModal={() => {
          if (selectedOrder) {
            setOrderProductModalVisible(true);
          } else {
            setModalVisible(true);
          }
        }}
        showAlert={showAlert}
        theme={theme}
        getStatusText={getStatusText}
        formatDeliveryOption={formatDeliveryOption}
      />
    </View>
  );
}

// === ALL STYLES ===
const styles = StyleSheet.create({
  // Alert Styles
  alertOverlay: {flex: 1,justifyContent: 'center',alignItems: 'center',zIndex: 9999,},
  alertContainer: {borderRadius: 15,padding: 20,width: '85%',maxWidth: 400,borderWidth: 1,},
  alertTitle: {fontSize: 20,fontWeight: 'bold',marginBottom: 10,textAlign: 'center',},
  alertMessage: {fontSize: 16,marginBottom: 20,textAlign: 'center',lineHeight: 22,},
  alertButtons: {flexDirection: 'row',justifyContent: 'space-between',gap: 10,},
  alertButton: {flex: 1,padding: 14,borderRadius: 10,alignItems: 'center',},
  alertButtonPrimary: { // Background color set dynamically
},
  alertButtonSecondary: {borderWidth: 1,},
  alertButtonText: {fontSize: 16,fontWeight: '600',},
  alertButtonPrimaryText: {
    // Color set dynamically
  },
  alertButtonSecondaryText: {
    // Color set dynamically
  },
  // Calendar Filter Styles
  calendarOverlay: {flex: 1,justifyContent: 'flex-end',},
  calendarContainer: {borderTopLeftRadius: 20,borderTopRightRadius: 20,height: '85%',},
  calendarHeader: {flexDirection: 'row',justifyContent: 'space-between',alignItems: 'center',padding: 15,borderBottomWidth: 1,},
  calendarCloseButton: {padding: 5,},
  calendarTitle: {fontSize: 18,fontWeight: 'bold',},
  calendarContent: {flex: 1,},
  quickFiltersContainer: {padding: 15,borderBottomWidth: 1,borderBottomColor: 'rgba(0,0,0,0.1)',},
  sectionTitle: {fontSize: 16,fontWeight: 'bold',marginBottom: 10,},
  quickFiltersGrid: {flexDirection: 'row',gap: 10,marginBottom: 5,},
  quickFilterButton: { flex: 1, flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 10, justifyContent: 'center', gap: 8,},
  quickFilterActive: {
    // Background color set dynamically
  },
  quickFilterText: {fontSize: 14,fontWeight: '600',},
  viewModeContainer: {padding: 15,borderBottomWidth: 1,borderBottomColor: 'rgba(0,0,0,0.1)',},
  viewModeButtons: {flexDirection: 'row',gap: 10,},
  viewModeButton: {
    flex: 1,
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  viewModeButtonActive: {
    // Background color set dynamically
  },
  viewModeButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  selectionDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    margin: 15,
    borderRadius: 10,
    borderWidth: 1,
    gap: 10,
  },
  selectionText: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  calendarNavigation: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  currentDateText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  calendarViewContainer: {
    padding: 15,
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  calendarWeekday: {
    width: '14.28%',
    textAlign: 'center',
    paddingVertical: 10,
    fontSize: 12,
    fontWeight: '600',
  },
  calendarDay: {
    width: '14.28%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    marginVertical: 2,
  },
  calendarDayOtherMonth: {
    opacity: 0.3,
  },
  calendarDaySelected: {
    // Background color set dynamically
  },
  calendarDayToday: {
    borderWidth: 2,
  },
  calendarDayText: {
    fontSize: 12,
    fontWeight: '600',
  },
  calendarDaySelectedText: {
    color: '#fff',
  },
  weekViewContainer: {
    padding: 10,
  },
  weekRangeText: {
    textAlign: 'center',
    fontSize: 14,
    marginBottom: 15,
  },
  weekSelector: {
    padding: 15,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 15,
  },
  weekSelected: {
    // Background color set dynamically
  },
  weekSelectorText: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  weekDaysGrid: {
    flexDirection: 'row',
    gap: 5,
  },
  weekDay: {
    flex: 1,
    padding: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  weekDaySelected: {
    // Background color set dynamically
  },
  weekDayToday: {
    borderWidth: 2,
  },
  weekDayName: {
    fontSize: 12,
    marginBottom: 5,
  },
  weekDayNumber: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  weekDaySelectedText: {
    color: '#fff',
  },
  monthViewContainer: {
    padding: 10,
  },
  yearSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
    paddingHorizontal: 20,
  },
  yearText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  monthRangeSelector: {
    padding: 15,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 15,
  },
  monthRangeSelected: {
    // Background color set dynamically
  },
  monthRangeText: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  monthsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'center',
  },
  monthCell: {
    width: '23%',
    aspectRatio: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 10,
    marginVertical: 5,
  },
  monthCellSelected: {
    // Background color set dynamically
  },
  monthCellCurrent: {
    borderWidth: 2,
  },
  monthText: {
    fontSize: 14,
    fontWeight: '600',
  },
  monthCellSelectedText: {
    color: '#fff',
  },
  yearViewContainer: {
    padding: 10,
  },
  yearNavigation: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
    paddingHorizontal: 20,
  },
  yearRangeText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  yearQuickFilter: {
    padding: 15,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 15,
  },
  yearQuickFilterSelected: {
    // Background color set dynamically
  },
  yearQuickFilterText: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  yearsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'center',
  },
  yearCell: {
    width: '30%',
    aspectRatio: 2,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 10,
    marginVertical: 5,
  },
  yearCellSelected: {
    // Background color set dynamically
  },
  yearCellCurrent: {
    borderWidth: 2,
  },
  yearCellText: {
    fontSize: 16,
    fontWeight: '600',
  },
  yearCellSelectedText: {
    color: '#fff',
  },
  instructions: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    margin: 15,
    borderRadius: 10,
    gap: 10,
  },
  instructionsText: {
    fontSize: 12,
    flex: 1,
    lineHeight: 16,
  },
  calendarActions: {
    flexDirection: 'row',
    padding: 15,
    borderTopWidth: 1,
    gap: 10,
  },
  calendarButton: {
    flex: 1,
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  cancelButton: {
    borderWidth: 1,
  },
  applyButton: {
    // Background color set dynamically
  },
  calendarButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  
  // Loading
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingFooter: { height: 60, justifyContent: 'center', alignItems: 'center' },
  loadingFooterText: { fontSize: 14, marginTop: 5 },
  
  // Empty State
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 100 },
  emptyTitle: { fontSize: 18, fontWeight: '600', marginTop: 16 },
  emptySubtitle: { fontSize: 14, marginTop: 8, textAlign: 'center', paddingHorizontal: 40 },
  
  // Header
  header: { position: 'absolute', top: 20, left: 0, right: 0, zIndex: 100, flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 15, paddingBottom: 10,  },
  headerIcon: { padding: 5, position: 'relative' },
  cartBadge: { position: 'absolute', top: -5, right: -5, borderRadius: 10, minWidth: 20, height: 20, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 4 },
  cartBadgeText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  ordersBadge: {  position: 'absolute',  top: -5,  right: -5,  borderRadius: 10,  minWidth: 20,  height: 20,  justifyContent: 'center',  alignItems: 'center', paddingHorizontal: 4, zIndex: 10,},
  ordersBadgeText: { color: '#fff', fontSize: 10, fontWeight: 'bold',},
  
  // Left Sidebar
  leftSidebar: { marginTop: 90,position: 'absolute',left: 12,zIndex: 10,alignItems: 'center',},
  leftSidebarItem: {marginBottom: 20,alignItems: 'center',},
  leftSidebarText: {fontSize: 13,marginTop: 4,fontWeight: '600',textShadowColor: 'rgba(0,0,0,0.7)',textShadowRadius: 6,},
  // Feed Card
  mediaContainer: {
    ...StyleSheet.absoluteFillObject, zIndex: 1, justifyContent: 'center', alignItems: 'center',backgroundColor: '#000',},
  mainMediaImage: { width: '100%', height: '100%',alignSelf: 'center',},
  videoStyle: {width: '100%',height: '100%',alignSelf: 'center',},
  videoWrapper: {flex: 1,width: '100%',justifyContent: 'center',alignItems: 'center',backgroundColor: '#000',},
  doubleTapHeart: { position: 'absolute', opacity: 0.9 },
  gradientOverlay: { position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 2 },
  
  // Right Sidebar
  rightSidebar: { position: 'absolute', right: 12, zIndex: 10, alignItems: 'center' },
  sidebarItem: { marginBottom: 25, alignItems: 'center' },
  avatarBorder: { borderWidth: 2, borderRadius: 30, padding: 1.5 },
  sidebarAvatar: { width: 45, height: 45, borderRadius: 22.5, backgroundColor: '#000' },
  followButton: { position: 'absolute', bottom: -15, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8, borderWidth: 1 },
  followText: { fontSize: 10, fontWeight: 'bold' },
  followingText: { fontSize: 10, fontWeight: 'bold' },
  shadowIcon: { textShadowColor: 'rgba(0,0,0,0.7)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 6 },
  sidebarText: { fontSize: 13, marginTop: 4, fontWeight: '600', textShadowColor: 'rgba(0,0,0,0.7)', textShadowRadius: 6 },
  discountBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 15, marginBottom: 25 },
  discountText: { color: '#fff', fontWeight: '900', fontSize: 14 },
  
  // Product Separators & Boundaries
  productSeparator: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 5,
    zIndex: 100,
  },
  topGradientFade: {
    position: 'absolute',
    top: 5,
    left: 0,
    right: 0,
    height: 60,
    zIndex: 99,
  },
  bottomProductMarker: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 50,
    zIndex: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 8,
  },
  swipeIndicator: {
    width: 40,
    height: 4,
    borderRadius: 2,
    marginBottom: 6,
    opacity: 0.6,
  },
  swipeText: {
    fontSize: 11,
    fontWeight: '600',
    opacity: 0.7,
  },
  
  // Bottom Info - Modern Card Design
  bottomInfoContainer: { position: 'absolute', left: 5, zIndex: 10, marginBottom: 10 },
  productInfoCard: {
    backgroundColor: '#FFFFFFCC',
    borderRadius: 9,
    padding: 10,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  productCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
  },
  productLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
  },
  titleTeaser: { fontSize: 15, fontWeight: '600', marginBottom: 6, lineHeight: 14 },
  userInfoColumn: { flexDirection: 'column', alignItems: 'flex-start', marginBottom: 6 },
  username: { fontWeight: '700', fontSize: 15, letterSpacing: 0.3 },
  universityText: { fontSize: 14, fontWeight: '500', marginTop: 2 },
  viewProductButton: { 
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start', 
    paddingHorizontal: 16, 
    paddingVertical: 10, 
    borderRadius: 12, 
    marginTop: 4,
  },
  viewProductButtonText: { fontWeight: '700', fontSize: 14, letterSpacing: 0.3 },
  
  // Product Detail Modal
  modalCenteredView: { flex: 1, justifyContent: 'flex-end' },
  modalModalView: { borderTopLeftRadius: 20, borderTopRightRadius: 20, height: '90%', paddingTop: 15 },
  modalScrollContent: { paddingBottom: 100 },
  modalCloseButton: { position: 'absolute', top: 10, right: 15, zIndex: 20, borderRadius: 15, padding: 5 },
  modalMediaContainer: { position: 'relative', marginBottom: 15, borderBottomWidth: 1 },
  modalVideoOverlay: { position: 'absolute', top: '50%', left: '50%', transform: [{ translateX: -30 }, { translateY: -30 }], zIndex: 10 },
  tiktokPlayButton: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', alignItems: 'center' },
  tiktokPlayButtonSmall: { width: 56, height: 56, borderRadius: 28, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', alignItems: 'center' },
  tiktokPlayThumbnailOverlay: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, justifyContent: 'center', alignItems: 'center' },
  mediaCounterBadge: { position: 'absolute', bottom: 12, right: 12, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, zIndex: 5 },
  mediaCounterText: { fontSize: 12, fontWeight: '600' },
  modalPaginationDots: { position: 'absolute', bottom: 10, width: '100%', flexDirection: 'row', justifyContent: 'center' },
  modalDot: { width: 8, height: 8, borderRadius: 4, marginHorizontal: 4 },
  modalActiveDot: {
    // Background color set dynamically
  },
  modalInactiveDot: {
    // Background color set dynamically
  },
  modalDetailsContainer: { padding: 18 },
  modalTitle: { fontSize: 26, fontWeight: 'bold', marginBottom: 15 },
  modalPriceRow: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 20 },
  modalCurrency: { fontSize: 18, fontWeight: '600' },
  modalPrice: { fontSize: 36, fontWeight: '900' },
  modalOldPrice: { fontSize: 18, textDecorationLine: 'line-through', marginLeft: 15, marginBottom: 4 },
  modalDiscountBadge: {
    backgroundColor: '#FF3B30',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 10,
    marginLeft: 10,
    marginBottom: 4,
    maxWidth: 60,
    alignSelf: 'flex-start',
  },
  modalDiscountText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  modalSectionTitle: { fontSize: 20, fontWeight: '700', marginTop: 15, marginBottom: 10, borderBottomWidth: 1, paddingBottom: 5 },
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
  modalDescription: { fontSize: 16, lineHeight: 26, marginBottom: 20 },
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
  modalSellerInfo: { flexDirection: 'row', alignItems: 'center', marginTop: 20, paddingTop: 20, borderTopWidth: 1 },
  modalSellerAvatar: { width: 45, height: 45, borderRadius: 27.5, marginRight: 15, borderWidth: 2 },
  modalSellerTextContainer: { flex: 1, marginLeft: 15 },
  modalSellerName: { fontWeight: '700', fontSize: 17 },
  modalSellerUniversity: { fontSize: 14 },
  modalActionBar: { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', borderTopWidth: 1, paddingHorizontal: 15, paddingVertical: 12,justifyContent: 'space-between',alignItems: 'center',},
  modalContactButton: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 15,paddingVertical: 12,borderRadius: 10,flex: 1,marginRight: 8,},
  modalContactButtonText: { fontWeight: 'bold', fontSize: 14, marginLeft: 6 },
  modalAddToCartButton: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 12,paddingVertical: 12,borderRadius: 10,marginHorizontal: 4,minWidth: 100,},
  modalInCartButton: { backgroundColor: '#4CAF50' },
  modalAddToCartButtonText: { fontWeight: 'bold', fontSize: 14, marginLeft: 6 },
  modalPlaceOrderButton: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 15,paddingVertical: 12,borderRadius: 10,flex: 1,marginLeft: 8,},
  modalPlaceOrderButtonText: { fontWeight: 'bold', fontSize: 14, marginLeft: 6 },
  
  // Modal Loading
  modalLoadingContainer: {flex: 1,justifyContent: 'center',alignItems: 'center',padding: 40,},
  modalLoadingText: {fontSize: 16,marginTop: 20,},
  
  // Order Status Badge
  orderStatusBadge: {alignSelf: 'flex-start',paddingHorizontal: 12,paddingVertical: 6,borderRadius: 6,marginBottom: 15,},
  orderStatusText: {color: '#fff',fontSize: 12,fontWeight: '600',},
  // Order Information Section
  orderInfoSection: {marginTop: 20,paddingTop: 20,borderTopWidth: 1,},
  orderInfoRow: {flexDirection: 'row',alignItems: 'center',marginBottom: 12,flexWrap: 'wrap',},
  orderInfoLabel: {fontSize: 14,marginLeft: 8,marginRight: 4,width: 70,},
  orderInfoValue: {fontSize: 14,flex: 1,flexWrap: 'wrap',},
  // Cancel Order Button
  modalCancelOrderButton: {flexDirection: 'row',justifyContent: 'center',alignItems: 'center',paddingHorizontal: 15,paddingVertical: 12,borderRadius: 10,flex: 1,marginLeft: 8,},
  modalCancelOrderButtonText: {color: '#fff',fontWeight: 'bold',fontSize: 14,marginLeft: 6,},
  // Full Image/Video Viewer
  fullViewerContainer: { flex: 1 },
  fullViewerCloseButton: { position: 'absolute', top: 40, left: 20, zIndex: 10, padding: 10, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 25 },
  fullViewerMediaSlide: { width: screenWidth, height: screenHeight, justifyContent: 'center', alignItems: 'center' },
  fullViewerMediaImage: { width: '100%', height: '100%' },
  fullViewerPaginationText: { position: 'absolute', bottom: 30, color: '#fff', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 10, fontSize: 16, fontWeight: 'bold' },
  
  // Comments Modal
  commentsCenteredView: { flex: 1, justifyContent: 'flex-end' },
  commentsModalView: { borderTopLeftRadius: 20, borderTopRightRadius: 20, height: '90%' },
  commentsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 15, borderBottomWidth: 1, marginTop: 10 },
  commentsTitle: { fontSize: 18, fontWeight: 'bold' },
  commentsCommentContainer: { flexDirection: 'row', paddingVertical: 12, paddingHorizontal: 15, borderBottomWidth: 1 },
  commentsCommentAvatar: { width: 38, height: 38, borderRadius: 19, marginRight: 12, borderWidth: 1.5 },
  commentsCommentContent: { flex: 1 },
  commentsCommentUser: { fontWeight: 'bold', fontSize: 14.5 },
  commentsCommentTime: { fontSize: 12 },
  commentsCommentText: { fontSize: 15, marginTop: 2, lineHeight: 20 },
  commentsEmptyText: { textAlign: 'center', marginTop: 30, fontSize: 16 },
  commentsInputContainer: { flexDirection: 'row', alignItems: 'center', padding: 15, borderTopWidth: 1 },
  commentsInput: { flex: 1, borderRadius: 25, paddingHorizontal: 18, paddingVertical: 12, fontSize: 16, maxHeight: 100 },
  commentsSubmitButton: { marginLeft: 10, width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center' },
  
  // Availability Badge on feed
  availabilityBadge: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
    zIndex: 20,
  },
  availabilityBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  
  // Similar Products
  similarContainer: {marginTop: 25,paddingTop: 20,borderTopWidth: 1,},
  similarTitle: {fontSize: 18,fontWeight: 'bold',marginBottom: 15,marginLeft: 5,},
  similarLoadingContainer: {height: 200,justifyContent: 'center',alignItems: 'center',},
  similarLoadingText: { fontSize: 14,marginTop: 10,},
  similarNoneText: {fontSize: 14,textAlign: 'center',paddingVertical: 20,fontStyle: 'italic',},
  similarListContent: {paddingHorizontal: 5,paddingBottom: 10,},
  similarProductCard: {width: 160,borderRadius: 12,marginRight: 12,overflow: 'hidden',borderWidth: 1,},
  similarProductImage: {width: '100%',height: 140,},
  similarProductPlaceholder: {justifyContent: 'center',alignItems: 'center',},
  similarVideoIcon: {position: 'absolute',top: 8,right: 8,backgroundColor: 'rgba(0,0,0,0.6)',padding: 5,borderRadius: 15,},
  similarProductInfo: {padding: 10,position: 'relative',},
  similarProductTitle: {fontSize: 13,fontWeight: '600',marginBottom: 8,height: 36,},
  similarPriceRow: {flexDirection: 'row',alignItems: 'center',marginBottom: 8,},
  similarCurrency: {fontSize: 10,fontWeight: '600',},
  similarPrice: {fontSize: 16,fontWeight: 'bold',},
  similarOldPrice: {fontSize: 11,textDecorationLine: 'line-through',marginLeft: 6,},
  similarDiscountBadge: {paddingHorizontal: 6,paddingVertical: 2,borderRadius: 10,marginLeft: 6,},
  similarDiscountText: {color: '#f19603ff',fontSize: 10,fontWeight: 'bold',},
  similarSellerRow: {flexDirection: 'row',alignItems: 'center',marginTop: 5,},
  similarSellerAvatar: {width: 22,height: 22,borderRadius: 11,marginRight: 6,borderWidth: 1,},
  similarSellerName: {fontSize: 11,flex: 1,},
  similarAddToCartButton: {position: 'absolute',bottom: 10,right: 10,padding: 6,borderRadius: 15, },
  
  // Cart Modal
  cartOverlay: { flex: 1, justifyContent: 'flex-end' },
  cartModal: { borderTopLeftRadius: 20, borderTopRightRadius: 20, height: '90%' },
  cartHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 15, borderBottomWidth: 1 },
  cartTitle: { fontSize: 18, fontWeight: 'bold', flex: 1, textAlign: 'center' },
  cartCloseButton: { padding: 5 },
  cartClearButton: { padding: 5 },
  cartClearText: { fontSize: 14 },
  cartEmptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20 },
  cartEmptyTitle: { fontSize: 24, fontWeight: 'bold', marginTop: 20, marginBottom: 10 },
  cartEmptyText: { fontSize: 16, textAlign: 'center', marginBottom: 30 },
  cartContinueButton: { paddingHorizontal: 30, paddingVertical: 12, borderRadius: 25 },
  cartContinueButtonText: { fontWeight: 'bold', fontSize: 16 },
  cartListContent: { padding: 15 },
  cartItem: { flexDirection: 'row', borderRadius: 12, marginBottom: 12, padding: 10 },
  cartItemImage: { width: 80, height: 80, borderRadius: 8 },
  cartItemInfo: { flex: 1, marginLeft: 15, justifyContent: 'space-between' },
  cartItemTitle: { fontSize: 14, fontWeight: '600' },
  cartItemSeller: { fontSize: 12, marginTop: 2 },
  cartItemPrice: { fontSize: 16, fontWeight: 'bold', marginTop: 4 },
  cartQuantityContainer: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  cartQuantityButton: { width: 30, height: 30, borderRadius: 15, justifyContent: 'center', alignItems: 'center' },
  cartQuantityDisplay: { width: 40, alignItems: 'center' },
  cartQuantityText: { fontSize: 16, fontWeight: 'bold' },
  cartRemoveButton: { marginLeft: 15, padding: 6 },
  cartFooter: { borderTopWidth: 1, padding: 15 },
  cartTotalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  cartTotalLabel: { fontSize: 18, fontWeight: 'bold' },
  cartTotalAmount: { fontSize: 22, fontWeight: 'bold' },
  cartPlaceOrderButton: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', padding: 16, borderRadius: 12 },
  cartPlaceOrderButtonText: { fontWeight: 'bold', fontSize: 16, marginLeft: 8 },
  
  // Share Modal
  shareOverlay: {flex: 1,justifyContent: 'flex-end',},
  shareContainer: {borderTopLeftRadius: 20,borderTopRightRadius: 20,padding: 20,paddingBottom: 30, },
  shareHeader: {flexDirection: 'row',justifyContent: 'space-between',alignItems: 'center',marginBottom: 20,},
  shareTitle: {fontSize: 18,fontWeight: 'bold',},
  shareProductPreview: {flexDirection: 'row',borderRadius: 12,padding: 12,marginBottom: 15,alignItems: 'center',},
  sharePreviewImage: {width: 60,height: 60,borderRadius: 8,marginRight: 12,},
  sharePreviewPlaceholder: {justifyContent: 'center',alignItems: 'center',},
  sharePreviewInfo: {flex: 1,},
  shareProductTitle: {fontSize: 16,fontWeight: '600',marginBottom: 5,},
  shareProductPrice: {fontSize: 18,fontWeight: 'bold',marginBottom: 5,},
  shareSourceText: {fontSize: 10,marginTop: 2,},
  productLinkContainer: {borderRadius: 12,padding: 15,marginBottom: 15,borderWidth: 1},
  productLinkLabel: {fontSize: 14,fontWeight: 'bold',marginBottom: 8,},
  productLinkExample: {fontSize: 11,marginBottom: 5,fontFamily: 'monospace',},
  productLinkButton: {flexDirection: 'row',alignItems: 'center',padding: 12,borderRadius: 8,marginBottom: 8,},
  productLinkText: {fontSize: 13,flex: 1,},
  shareInstructions: {fontSize: 12,textAlign: 'center',marginBottom: 20,fontStyle: 'italic',paddingHorizontal: 20,},
  shareNote: {fontSize: 10,textAlign: 'center',marginTop: 10,paddingHorizontal: 20,},
  shareDiscountBadge: {paddingHorizontal: 8,paddingVertical: 3,borderRadius: 6,alignSelf: 'flex-start',  marginTop: 4,},
  shareDiscountText: {color: '#fff',fontSize: 10,fontWeight: 'bold',},
  shareGrid: {flexDirection: 'row',flexWrap: 'wrap',justifyContent: 'space-between',marginBottom: 20,},
  shareOption: {alignItems: 'center',width: '30%',marginBottom: 20,},
  shareIconContainer: {width: 60,height: 60,borderRadius: 30,justifyContent: 'center',alignItems: 'center',marginBottom: 8,},
  shareOptionText: {fontSize: 12,textAlign: 'center',},
  moreOptionsButton: {flexDirection: 'row',alignItems: 'center',justifyContent: 'center',padding: 15,borderRadius: 10,},
  moreOptionsText: {color: '#fff',fontSize: 16,fontWeight: 'bold',marginLeft: 10,},
  // Order Form Modal
  orderFormOverlay: {flex: 1,justifyContent: 'flex-end',},
  orderFormContainer: {borderTopLeftRadius: 20,borderTopRightRadius: 20,height: '85%',},
  orderFormHeader: {flexDirection: 'row',justifyContent: 'space-between',alignItems: 'center',padding: 15,borderBottomWidth: 1,},
  orderFormCloseButton: { padding: 5 },
  orderFormTitle: {fontSize: 18,fontWeight: 'bold',},
  orderFormContent: {flex: 1,padding: 20,},
  orderFormSection: {marginBottom: 25,},
  orderFormSectionTitle: {fontSize: 16,fontWeight: 'bold',marginBottom: 15,},
  formGroup: {marginBottom: 20,},
  formLabel: {fontSize: 14,fontWeight: '600',marginBottom: 8,},
  formInput: {borderRadius: 10,padding: 15,fontSize: 16,borderWidth: 1,},
  phoneInputContainer: {flexDirection: 'row',alignItems: 'center',},
  countryCodeContainer: {padding: 15,borderTopLeftRadius: 10,borderBottomLeftRadius: 10,borderWidth: 1,borderRightWidth: 0,marginRight: -1,},
  countryCodeText: {fontSize: 16,fontWeight: 'bold',},
  phoneInput: {flex: 1,borderTopLeftRadius: 0,borderBottomLeftRadius: 0,borderLeftWidth: 0,},
  errorText: {fontSize: 12,marginTop: 5,},
  helperText: {fontSize: 12,marginTop: 5,},
  textArea: {minHeight: 100,textAlignVertical: 'top',},
  deliveryOption: {flexDirection: 'row',alignItems: 'center',borderRadius: 10,padding: 15,marginBottom: 10,borderWidth: 1,},
  deliveryOptionSelected: {},
  deliveryOptionRadio: {width: 24,height: 24,borderRadius: 12,borderWidth: 2,marginRight: 15,justifyContent: 'center',alignItems: 'center',},
  deliveryOptionRadioSelected: {width: 12,height: 12,borderRadius: 6,},
  deliveryOptionContent: {flexDirection: 'row',alignItems: 'center',flex: 1,},
  deliveryOptionText: {marginLeft: 15,flex: 1,},
  deliveryOptionTitle: {fontSize: 16,fontWeight: 'bold',marginBottom: 2,},
  deliveryOptionDescription: {fontSize: 12,},
  orderTotalSection: {borderRadius: 10,padding: 15,alignItems: 'center',marginVertical: 15,},
  orderTotalText: {fontSize: 20,fontWeight: 'bold',},
  orderFormFooter: {padding: 20,borderTopWidth: 1,},
  submitOrderButton: {flexDirection: 'row',justifyContent: 'center',alignItems: 'center', padding: 18,borderRadius: 10,},
  submitOrderButtonDisabled: {opacity: 0.7,},
  submitOrderLoading: {flexDirection: 'row',alignItems: 'center',},
  submitOrderButtonText: {color: '#fff',fontSize: 16,fontWeight: 'bold',marginLeft: 10,},
  // Orders Modal Styles
  ordersModalContainer: {flex: 1,justifyContent: 'flex-end',},
  ordersModalContent: {borderTopLeftRadius: 20,borderTopRightRadius: 20,height: '90%',},
  ordersModalHeader: {flexDirection: 'row',justifyContent: 'space-between',alignItems: 'center',padding: 15,borderBottomWidth: 1,},
  ordersCloseButton: { padding: 5 },
  ordersModalTitle: {fontSize: 18,fontWeight: 'bold',},
  ordersLoadingContainer: {flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20,},
  ordersLoadingText: {marginTop: 10,fontSize: 16,},
  ordersEmptyState: {flex: 1,justifyContent: 'center',alignItems: 'center',paddingHorizontal: 40,},
  ordersEmptyText: {marginTop: 12,fontSize: 16,fontWeight: '600',},
  ordersEmptySubtext: {marginTop: 8,textAlign: 'center',lineHeight: 20,},
  ordersContinueButton: {paddingHorizontal: 30,paddingVertical: 12,borderRadius: 25,marginTop: 20,},
  ordersContinueButtonText: {color: '#fff',fontWeight: 'bold',fontSize: 16,},
  ordersListContainer: {padding: 16,},
  orderCard: { borderRadius: 12,marginBottom: 12,padding: 16,shadowOffset: { width: 0, height: 2 },shadowOpacity: 0.1,shadowRadius: 4,elevation: 3,},
  orderHeader: {flexDirection: 'row',justifyContent: 'space-between',alignItems: 'center',marginBottom: 12,},
  orderInfo: {flex: 1,},
  orderId: {fontSize: 16,fontWeight: 'bold',marginBottom: 2,},
  orderDate: {fontSize: 12,},
  statusBadge: {paddingHorizontal: 12,paddingVertical: 6,borderRadius: 6,},
  statusText: {color: '#fff',fontSize: 12,fontWeight: '600',},
  orderContent: {flexDirection: 'row',marginBottom: 12,},
  orderProductImage: {width: 80,height: 80,borderRadius: 8,marginRight: 12,},
  orderDetails: {flex: 1,},
  orderProductTitle: {fontSize: 16,fontWeight: '600',marginBottom: 4,},
  orderProductPrice: {fontSize: 18,fontWeight: 'bold',marginBottom: 8,},
  sellerInfo: {flexDirection: 'row',alignItems: 'center',marginBottom: 8,},
  sellerAvatar: {width: 30,height: 30,borderRadius: 15,marginRight: 8,},
  sellerName: {fontSize: 14,fontWeight: '600',},
  orderDeliveryInfo: {fontSize: 12,},
  orderFooter: {flexDirection: 'row',justifyContent: 'space-between',alignItems: 'center',borderTopWidth: 1,paddingTop: 12,},
  orderItemsCount: { fontSize: 12, },
  orderActionButton: {flexDirection: 'row',alignItems: 'center',paddingHorizontal: 12,paddingVertical: 6,borderRadius: 6,minWidth: 120,justifyContent: 'center',gap: 6,},
  cancelOrderButton: {},
  orderActionButtonText: {color: '#fff',fontSize: 12,fontWeight: '600',},
  notificationCountBadge: {fontSize: 14,fontWeight: '600',},
  // Calendar Filter Button in Sort/Filter Menu
  calendarFilterButton: {flexDirection: 'row',alignItems: 'center',padding: 15,borderRadius: 10,borderWidth: 1,gap: 12,},
  calendarFilterButtonTextContainer: {flex: 1,},
  calendarFilterButtonTitle: {fontSize: 14,fontWeight: '600',marginBottom: 2,},
  calendarFilterButtonSubtitle: {fontSize: 12,},
  // Contact Seller Modal Styles
  contactOverlay: {flex: 1,justifyContent: 'flex-end',},
  contactModal: {borderTopLeftRadius: 20,borderTopRightRadius: 20,height: '85%',},
  contactHeader: {flexDirection: 'row',justifyContent: 'space-between',alignItems: 'center',padding: 15,borderBottomWidth: 1,},
  contactCloseButton: { padding: 5 },
  contactTitle: {fontSize: 18,fontWeight: 'bold',},
  contactContent: {flex: 1,},
  contactLoading: {flex: 1,justifyContent: 'center',alignItems: 'center',padding: 20,},
  contactLoadingText: {marginTop: 10,fontSize: 16,},
  contactUnavailable: {flex: 1,justifyContent: 'center',alignItems: 'center',paddingHorizontal: 30,},
  contactUnavailableTitle: {fontSize: 20,fontWeight: 'bold',marginTop: 15,marginBottom: 10,},
  contactUnavailableText: {fontSize: 16,textAlign: 'center',lineHeight: 22,marginBottom: 25,},
  contactUnavailableSubtext: {fontSize: 14,textAlign: 'center',marginBottom: 25,},
  contactContinueButton: {paddingHorizontal: 30,paddingVertical: 12,borderRadius: 25,marginTop: 20,},
  contactContinueButtonText: {fontWeight: 'bold',fontSize: 16,},
  sellerInfoCard: {borderRadius: 12,padding: 20,marginBottom: 25,width: '100%',},
  productInfo: {marginBottom: 15,paddingBottom: 15,borderBottomWidth: 1,},
  productName: { fontSize: 16,fontWeight: '600',marginBottom: 5,},
  productPrice: {fontSize: 18,fontWeight: 'bold',},
  sellerDisplayInfo: {flexDirection: 'row',alignItems: 'center',marginVertical: 15,paddingVertical: 15,borderTopWidth: 1,borderBottomWidth: 1,},
  sellerAvatarContainer: {marginRight: 15,},
  sellerContactAvatar: {width: 60,height: 60,borderRadius: 30,borderWidth: 2,},
  sellerContactAvatarPlaceholder: {width: 60,height: 60,borderRadius: 30,justifyContent: 'center',alignItems: 'center',borderWidth: 2,},
  sellerTextInfo: {flex: 1,},
  sellerNameText: {fontSize: 16,fontWeight: '600',flex: 1,},
  sellerShopVerified: {fontSize: 12,marginTop: 4,},
  sellerShopStatus: {fontSize: 12,marginTop: 4,},
  phoneInfo: {flexDirection: 'row',alignItems: 'center',marginTop: 10,paddingTop: 10,borderTopWidth: 1,},
  phoneNumber: {fontSize: 18,fontWeight: 'bold',marginLeft: 10,flex: 1,},
  copyButton: {padding: 8,marginLeft: 10,},
  shopLocationInfo: {flexDirection: 'row',alignItems: 'center',marginTop: 10,paddingTop: 10,borderTopWidth: 1,},
  shopLocationText: {fontSize: 14,marginLeft: 8,flex: 1,},
  shopDescription: {marginTop: 10,paddingTop: 10,borderTopWidth: 1,},
  shopDescriptionText: {fontSize: 14,lineHeight: 20,},
  contactOptionsTitle: {fontSize: 16,fontWeight: 'bold',marginBottom: 15,marginTop: 10,},
  contactOption: {flexDirection: 'row',alignItems: 'center',borderRadius: 12,padding: 18,marginBottom: 12,},
  whatsappOption: {borderLeftWidth: 4,},
  callOption: {borderLeftWidth: 4,},
  contactIconContainer: {width: 50,height: 50,borderRadius: 25,justifyContent: 'center',alignItems: 'center',marginRight: 15,},
  contactOptionText: {flex: 1,},
  contactOptionTitle: {fontSize: 16,fontWeight: 'bold',marginBottom: 2,},
  contactOptionDescription: { fontSize: 12, marginBottom: 2, },
  whatsappNote: {fontSize: 11,fontStyle: 'italic',},
  callNote: {fontSize: 11,fontStyle: 'italic',},
  contactDisclaimer: {flexDirection: 'row', alignItems: 'center', borderRadius: 8, padding: 15, marginTop: 20, marginBottom: 30,},
  contactDisclaimerText: {fontSize: 12,marginLeft: 10,flex: 1,lineHeight: 16,},
  // Sort and Filter Menu Styles
  sortFilterOverlay: {flex: 1,justifyContent: 'flex-end',},
  sortFilterContainer: {borderTopLeftRadius: 20,borderTopRightRadius: 20,height: '85%',},
  sortFilterHeader: {flexDirection: 'row',justifyContent: 'space-between',alignItems: 'center',padding: 15,borderBottomWidth: 1,},
  sortFilterTitle: {fontSize: 18,fontWeight: 'bold',},
  sortFilterContent: {flex: 1,paddingHorizontal: 15,},
  sortFilterSection: {marginBottom: 25,},
  sortFilterSectionTitle: {fontSize: 16,fontWeight: 'bold',marginBottom: 15,},
  sortFilterOption: {flexDirection: 'row',justifyContent: 'space-between',alignItems: 'center',padding: 15,borderRadius: 10,marginBottom: 10,borderWidth: 1,},
  sortFilterOptionContent: {flexDirection: 'row',alignItems: 'center',flex: 1, },
  sortFilterOptionText: {fontSize: 14,marginLeft: 12,fontWeight: '600',},
  filterGrid: {flexDirection: 'row',flexWrap: 'wrap',gap: 10,},
  filterChip: {flexDirection: 'row',alignItems: 'center',paddingHorizontal: 12,paddingVertical: 8,borderRadius: 20,gap: 6,},
  filterChipText: {fontSize: 12,fontWeight: '600',},
  periodGrid: {flexDirection: 'row',flexWrap: 'wrap',gap: 10,},
  periodChip: {flexDirection: 'row',alignItems: 'center',paddingHorizontal: 12,paddingVertical: 10,borderRadius: 20,borderWidth: 1,gap: 6,},
  periodChipText: {fontSize: 12,fontWeight: '600',},
  sortFilterActions: {flexDirection: 'row',justifyContent: 'space-between',marginTop: 20,marginBottom: 30,gap: 15,},
  resetButton: {flex: 1,padding: 15,borderRadius: 10,alignItems: 'center',borderWidth: 1,},
  resetButtonText: {fontSize: 14,fontWeight: '600',},
  sortApplyButton: {flex: 1,padding: 15,borderRadius: 10,alignItems: 'center',},
  applyButtonText: {color: '#fff',fontSize: 14,fontWeight: '600',},
  sortFilterButton: {padding: 5,position: 'relative',},
  filterBadge: {position: 'absolute',top: -5,right: -5,borderRadius: 10,minWidth: 18,height: 18,justifyContent: 'center',alignItems: 'center',paddingHorizontal: 4,},
  filterBadgeText: {color: '#fff',fontSize: 10,fontWeight: 'bold',},
  filterSummary: {padding: 10,marginHorizontal: 16,marginTop: 10,borderRadius: 10,},
  filterSummaryContent: {flexDirection: 'row',alignItems: 'center',justifyContent: 'space-between',},
  filterSummaryText: {fontSize: 12, flex: 1, marginLeft: 8, marginRight: 12,},
  clearFiltersText: {fontSize: 12,fontWeight: '600',},
  clearFiltersButton: {paddingHorizontal: 20,paddingVertical: 10,borderRadius: 20,marginTop: 10,marginBottom: 20,},
  clearFiltersButtonText: {color: '#fff',fontSize: 14,fontWeight: '600',
  },
  // Add these to your existing styles
similarSubtitle: {
  fontSize: 12,
  marginBottom: 15,
  marginLeft: 5,
  fontStyle: 'italic',
},
sameSellerBadge: {
  position: 'absolute',
  top: 8,
  left: 8,
  paddingHorizontal: 6,
  paddingVertical: 2,
  borderRadius: 4,
},
sameSellerBadgeText: {
  color: '#fff',
  fontSize: 9,
  fontWeight: 'bold',
},
similarSellerInfo: {
  flex: 1,
  marginLeft: 6,
},
similarSellerType: {
  marginTop: 2,
},
// Add these to your existing styles
mediaGalleryContainer: {
  position: 'relative',
  marginBottom: 2,
},
mediaPaginationDots: {
  position: 'absolute',
  bottom: 10,
  width: '100%',
  flexDirection: 'row',
  justifyContent: 'center',
  zIndex: 10,
},
mediaDot: {
  width: 8,
  height: 8,
  borderRadius: 4,
  marginHorizontal: 4,
},
mediaActiveDot: {
  // Background color set dynamically
},
mediaInactiveDot: {
  // Background color set dynamically
},

colorMediaNavigation: {
  padding: 16,
  backgroundColor: 'rgba(0,0,0,0.05)',
},
colorNavTitle: {
  fontSize: 14,
  fontWeight: '600',
  marginBottom: 12,
},
colorNavChips: {
  flexDirection: 'row',
},
colorNavChip: {
  flexDirection: 'row',
  alignItems: 'center',
  paddingHorizontal: 16,
  paddingVertical: 10,
  borderRadius: 20,
  marginRight: 12,
  borderWidth: 1,
  borderColor: 'transparent',
  gap: 6,
},
colorNavChipSelected: {
  borderWidth: 2,
},
colorNavChipText: {
  fontSize: 14,
  fontWeight: '500',
},
colorNavChipTextSelected: {
  fontWeight: 'bold',
},

priceStockRow: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: 20,
},
priceContainer: {
  flexDirection: 'row',
  alignItems: 'flex-end',
  flexWrap: 'wrap',
  flex: 1,
},
stockStatusBadge: {
  flexDirection: 'row',
  alignItems: 'center',
  paddingHorizontal: 12,
  paddingVertical: 8,
  borderRadius: 20,
  gap: 6,
},
stockStatusText: {
  color: '#fff',
  fontSize: 12,
  fontWeight: '600',
  marginLeft: 4,
},

sizeSelectionSection: {
  padding: 16,
  borderRadius: 12,
  marginBottom: 12,
},
colorSelectionSection: {
  padding: 16,
  borderRadius: 12,
  marginBottom: 12,
},
sectionHeader: {
  flexDirection: 'row',
  alignItems: 'center',
  marginBottom: 12,
  gap: 8,
  flexWrap: 'wrap',
},
productSectionTitle: {
  fontSize: 16,
  fontWeight: '600',
},
stockLabel: {
  fontSize: 12,
  fontStyle: 'italic',
},
sizeChips: {
  flexDirection: 'row',
},
colorChips: {
  flexDirection: 'row',
},
sizeChip: {
  paddingHorizontal: 20,
  paddingVertical: 12,
  borderRadius: 10,
  marginRight: 12,
  borderWidth: 1,
  borderColor: 'transparent',
  alignItems: 'center',
  minWidth: 100,
},
sizeChipSelected: {
  borderWidth: 2,
},
sizeChipOutOfStock: {
  opacity: 0.7,
},
sizeChipText: {
  fontSize: 14,
  fontWeight: '600',
  marginBottom: 4,
},
sizeChipTextSelected: {
  fontWeight: 'bold',
},
sizeStockText: {
  fontSize: 11,
},
colorChip: {
  paddingHorizontal: 20,
  paddingVertical: 12,
  borderRadius: 10,
  marginRight: 12,
  borderWidth: 1,
  borderColor: 'transparent',
  alignItems: 'center',
  minWidth: 100,
},
colorChipSelected: {
  borderWidth: 2,
},
colorChipOutOfStock: {
  opacity: 0.7,
},
colorChipText: {
  fontSize: 14,
  fontWeight: '600',
  marginBottom: 4,
},
colorChipTextSelected: {
  fontWeight: 'bold',
},
colorStockText: {
  fontSize: 11,
},

selectedOptionsSummary: {
  padding: 16,
  borderRadius: 12,
  marginBottom: 16,
},
selectedOptionsTitle: {
  fontSize: 14,
  fontWeight: '600',
  marginBottom: 8,
},
selectedOptionsRow: {
  flexDirection: 'row',
  alignItems: 'center',
  flexWrap: 'wrap',
  gap: 8,
},
selectedOptionChip: {
  paddingHorizontal: 12,
  paddingVertical: 8,
  borderRadius: 20,
},
selectedOptionText: {
  color: '#fff',
  fontSize: 12,
  fontWeight: '600',
},
availableStockText: {
  fontSize: 12,
  fontWeight: '600',
  marginLeft: 'auto',
},
  productPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  productPreviewImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 12,
  },
  productPreviewInfo: {
    flex: 1,
  },
  productPreviewTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  productPreviewPrice: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  selectionGroup: {
    marginBottom: 20,
  },
  selectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  selectionOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  selectionOption: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    minWidth: 80,
  },
  selectionOptionSelected: {
    borderWidth: 2,
  },
  selectionOptionDisabled: {
    opacity: 0.5,
  },
  selectionOptionText: {
    fontSize: 14,
    fontWeight: '500',
  },
  selectionOptionTextSelected: {
    fontWeight: 'bold',
  },
  stockLabelSmall: {
    fontSize: 10,
    marginTop: 2,
  },
  quantitySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  quantityButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  quantityDisplay: {
    width: 50,
    height: 40,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  stockText: {
    fontSize: 12,
    marginLeft: 'auto',
  },
  cartSummary: {
    borderRadius: 10,
    overflow: 'hidden',
  },
  cartSummaryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  cartSummaryItemInfo: {
    flex: 1,
    marginRight: 12,
  },
  cartSummaryItemTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  cartSummaryItemQty: {
    fontSize: 12,
  },
  cartSummaryItemPrice: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  orderSummaryText: {
    fontSize: 12,
    marginTop: 4,
  },
  
  // Order Details New Styles
  colorMediaSection: {
    marginBottom: 16,
  },
  colorMediaTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    paddingHorizontal: 16,
  },
  selectedOptionsContainer: {
    borderRadius: 10,
    padding: 16,
    marginBottom: 20,
  },
  selectedOptionsTitleCompact: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
  },
  selectedOptionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  selectedOptionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  selectedOptionLabel: {
    fontSize: 12,
    marginRight: 4,
  },
  selectedOptionValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  orderItemsSection: {
    marginTop: 20,
    paddingTop: 20,
  },
  orderItemCard: {
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  orderItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  orderItemTitle: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
    marginRight: 12,
  },
  orderItemPrice: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  orderItemDetails: {
    gap: 4,
  },
  orderItemDetail: {
    fontSize: 12,
  },
  // Add these styles to your styles object:
colorMediaHeader: {
  flexDirection: 'row',
  alignItems: 'center',
  marginBottom: 12,
  paddingHorizontal: 16,
  flexWrap: 'wrap',
  gap: 8,
},
colorIndicator: {
  paddingHorizontal: 8,
  paddingVertical: 4,
  borderRadius: 4,
  marginLeft: 'auto',
},
colorIndicatorText: {
  color: '#fff',
  fontSize: 10,
  fontWeight: 'bold',
},
colorMediaBadge: {
  position: 'absolute',
  top: 16,
  left: 16,
  paddingHorizontal: 10,
  paddingVertical: 6,
  borderRadius: 6,
  zIndex: 10,
},
colorMediaBadgeText: {
  color: '#fff',
  fontSize: 12,
  fontWeight: 'bold',
},
// Add these to your styles object
productImageContainer: {
  position: 'relative',
  marginRight: 12,
},
imageNavButton: {
  position: 'absolute',
  top: '50%',
  transform: [{ translateY: -12 }],
  padding: 8,
  borderRadius: 20,
  zIndex: 10,
},
prevImageButton: {
  left: 8,
},
nextImageButton: {
  right: 8,
},
imageCounter: {
  position: 'absolute',
  bottom: 8,
  right: 8,
  paddingHorizontal: 8,
  paddingVertical: 4,
  borderRadius: 12,
  zIndex: 10,
},
imageCounterText: {
  color: '#fff',
  fontSize: 12,
  fontWeight: '600',
},
colorIndicatorContainer: {
  marginTop: 8,
},
colorIndicatorLabel: {
  fontSize: 12,
  marginBottom: 4,
},
colorIndicatorChip: {
  paddingHorizontal: 8,
  paddingVertical: 4,
  borderRadius: 12,
  alignSelf: 'flex-start',
},

colorMediaCount: {
  fontSize: 10,
  marginTop: 2,
},
colorOptionContent: {
  flexDirection: 'row',
  alignItems: 'center',
},
colorMediaIcon: {
  marginLeft: 6,
},
profilePhotoOverlay: {
  flex: 1,
  justifyContent: 'center',
  alignItems: 'center',
},
});