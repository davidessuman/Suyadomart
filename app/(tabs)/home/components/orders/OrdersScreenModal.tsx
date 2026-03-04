import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Modal,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { format, isSameDay, isSameMonth, isWithinInterval } from 'date-fns';
import { supabase } from '@/lib/supabase';
import { ProductReviewsSection } from '@/components/ProductReviewsSection';

type SortOption = 'newest' | 'oldest' | 'price-high' | 'price-low' | 'status';
type FilterOption = 'all' | 'pending' | 'processing' | 'completed' | 'cancelled' | 'shipped';

type DateSelection = {
  singleDate?: Date;
  dateRange?: { start: Date; end: Date };
  monthRange?: { start: Date; end: Date };
  year?: number;
  viewMode: 'day' | 'week' | 'month' | 'year';
};

type Product = {
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
};

type OrdersScreenModalProps = {
  isVisible: boolean;
  onClose: () => void;
  onViewProductDetails: (order: any, product: Product) => void;
  showAlert: (title: string, message: string, buttons?: any[]) => void;
  theme: any;
  styles: any;
  supabaseUrl: string;
  getStatusColor: (status: string, theme: any) => string;
  getStatusText: (status: string) => string;
  formatDeliveryOption: (option?: string) => string;
  getCardDisplayMedia: (urls?: string[] | null) => string | undefined;
  getCardDisplayUrl: (urls?: string[] | null) => string;
  isVideoUrl: (url: string) => boolean;
  CalendarFilterComponent: React.ComponentType<{
    isVisible: boolean;
    onClose: () => void;
    onApplyFilter: (selection: DateSelection | null) => void;
    currentSelection: DateSelection | null;
    theme: any;
    styles: any;
  }>;
};

export default function OrdersScreenModal({
  isVisible,
  onClose,
  onViewProductDetails,
  showAlert,
  theme,
  styles,
  supabaseUrl,
  getStatusColor,
  getStatusText,
  formatDeliveryOption,
  getCardDisplayMedia,
  getCardDisplayUrl,
  isVideoUrl,
  CalendarFilterComponent,
}: OrdersScreenModalProps) {
  const { width, height } = useWindowDimensions();
  const isSmallScreen = width < 390;
  const isLargeScreen = width >= 768;
  const isDesktopWide = width >= 1200;
  const modalWidth = isLargeScreen
    ? Math.min(width * (isDesktopWide ? 0.72 : 0.86), 920)
    : '100%';
  const modalHeight = isLargeScreen ? Math.min(height * 0.9, 900) : '97%';
  const contentMaxWidth = isLargeScreen ? (isDesktopWide ? 820 : 760) : undefined;

  const [orders, setOrders] = useState<any[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [shopData, setShopData] = useState<Record<string, { name: string; avatar_url: string | null }>>({});
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);

  const [sortOption, setSortOption] = useState<SortOption>('newest');
  const [filterOption, setFilterOption] = useState<FilterOption>('all');
  const [calendarFilter, setCalendarFilter] = useState<DateSelection | null>(null);
  const [showSortFilterMenu, setShowSortFilterMenu] = useState(false);
  const [showCalendarFilter, setShowCalendarFilter] = useState(false);

  const router = useRouter();
  const requireAuth = useCallback((action: string = 'continue') => {
    showAlert(
      'Login Required',
      `Please log in or sign up to ${action}.`,
      [
        { text: 'Maybe later', style: 'cancel' },
        { text: 'Login / Sign up', onPress: () => router.push('/auth') },
      ],
    );
  }, [showAlert, router]);

  const getCurrentUserId = async () => {
    const { data } = await supabase.auth.getUser();
    return data?.user?.id ?? null;
  };

  const fetchUnreadNotificationCount = async (userId: string) => {
    try {
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

  const markNotificationsAsRead = async (userId: string) => {
    try {
      const { error } = await supabase
        .from('buyer_notifications')
        .update({ is_read: true })
        .eq('user_id', userId)
        .eq('is_read', false);

      if (error) {
        console.error('Error marking notifications as read:', error);
      } else {
        console.log('✅ Notifications marked as read');
        setUnreadNotificationCount(0);
      }
    } catch (error) {
      console.error('Error in markNotificationsAsRead:', error);
    }
  };

  const fetchShopData = useCallback(async (sellerId: string): Promise<{ name: string; avatar_url: string | null }> => {
    try {
      const { data: shopData, error: shopError } = await supabase
        .from('shops')
        .select('name, avatar_url')
        .eq('owner_id', sellerId)
        .single();
      if (shopError) {
        const { data: profileData, error: userError } = await supabase
          .from('user_profiles')
          .select('full_name, avatar_url')
          .eq('id', sellerId)
          .single();
        if (userError) {
          return { name: 'Seller', avatar_url: null };
        }
        return {
          name: profileData?.full_name || 'Seller',
          avatar_url: profileData?.avatar_url || null,
        };
      }
      return {
        name: shopData?.name || 'Shop',
        avatar_url: shopData?.avatar_url || null,
      };
    } catch {
      return { name: 'Seller', avatar_url: null };
    }
  }, []);

  const fetchShopDataForOrders = useCallback(async (ordersList: any[]): Promise<Record<string, { name: string; avatar_url: string | null }>> => {
    const shopDataMap: Record<string, { name: string; avatar_url: string | null }> = {};
    const uniqueSellerIds = new Set<string>();
    ordersList.forEach(order => {
      if (order.seller_id) uniqueSellerIds.add(order.seller_id);
      if (order.order_items && order.order_items.length > 0) {
        order.order_items.forEach((item: any) => {
          if (item.seller_id) uniqueSellerIds.add(item.seller_id);
        });
      }
    });
    const promises = Array.from(uniqueSellerIds).map(async sellerId => {
      const nextShopData = await fetchShopData(sellerId);
      shopDataMap[sellerId] = nextShopData;
    });
    await Promise.all(promises);
    return shopDataMap;
  }, [fetchShopData]);

  const applySortingAndFiltering = useCallback((ordersList: any[]) => {
    let result = [...ordersList];

    if (calendarFilter) {
      result = result.filter(order => {
        const orderDate = new Date(order.created_at);

        if (calendarFilter.singleDate) {
          return isSameDay(orderDate, calendarFilter.singleDate);
        }

        if (calendarFilter.dateRange) {
          return isWithinInterval(orderDate, {
            start: calendarFilter.dateRange.start,
            end: calendarFilter.dateRange.end,
          });
        }

        if (calendarFilter.monthRange) {
          const orderMonth = new Date(orderDate.getFullYear(), orderDate.getMonth(), 1);
          const startMonth = new Date(calendarFilter.monthRange.start.getFullYear(), calendarFilter.monthRange.start.getMonth(), 1);
          const endMonth = new Date(calendarFilter.monthRange.end.getFullYear(), calendarFilter.monthRange.end.getMonth(), 1);

          return orderMonth >= startMonth && orderMonth <= endMonth;
        }

        if (calendarFilter.year) {
          return orderDate.getFullYear() === calendarFilter.year;
        }

        return true;
      });
    }

    if (filterOption !== 'all') {
      result = result.filter(order => order.status === filterOption);
    }

    result.sort((a, b) => {
      const dateA = new Date(a.created_at);
      const dateB = new Date(b.created_at);

      switch (sortOption) {
        case 'newest':
          return dateB.getTime() - dateA.getTime();
        case 'oldest':
          return dateA.getTime() - dateB.getTime();
        case 'price-high':
          return b.total_amount - a.total_amount;
        case 'price-low':
          return a.total_amount - b.total_amount;
        case 'status': {
          const statusOrder = { pending: 0, processing: 1, shipped: 2, completed: 3, cancelled: 4 };
          return (statusOrder[a.status as keyof typeof statusOrder] || 5) -
                 (statusOrder[b.status as keyof typeof statusOrder] || 5);
        }
        default:
          return dateB.getTime() - dateA.getTime();
      }
    });

    return result;
  }, [calendarFilter, filterOption, sortOption]);

  const loadOrders = useCallback(async () => {
    try {
      setLoading(true);
      const userId = await getCurrentUserId();
      if (!userId) {
        requireAuth('view orders');
        onClose();
        return;
      }

      setCurrentUserId(userId);

      await markNotificationsAsRead(userId);

      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (
            *,
            products (
              title,
              media_urls,
              seller_id
            )
          )
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setOrders(data || []);
      const filtered = applySortingAndFiltering(data || []);
      setFilteredOrders(filtered);
      if (data && data.length > 0) {
        const shopDataMap = await fetchShopDataForOrders(data);
        setShopData(shopDataMap);
      }

      const unreadCount = await fetchUnreadNotificationCount(userId);
      setUnreadNotificationCount(unreadCount);
    } catch {
      showAlert('Error', 'Failed to load orders');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [
    applySortingAndFiltering,
    fetchShopDataForOrders,
    onClose,
    requireAuth,
    showAlert,
  ]);

  useEffect(() => {
    if (!isVisible) return;
    loadOrders();

    const channel = supabase
      .channel('buyer-orders-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
        },
        (payload: any) => {
          if (payload.new && (payload.new as any).user_id === currentUserId) {
            loadOrders();
          }
        },
      )
      .subscribe();

    const notificationChannel = supabase
      .channel(`buyer-notifications-${currentUserId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'buyer_notifications',
          filter: `user_id=eq.${currentUserId}`,
        },
        async () => {
          if (currentUserId) {
            const unreadCount = await fetchUnreadNotificationCount(currentUserId);
            setUnreadNotificationCount(unreadCount);
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(notificationChannel);
    };
  }, [isVisible, currentUserId, loadOrders]);

  useEffect(() => {
    if (orders.length > 0) {
      const filtered = applySortingAndFiltering(orders);
      setFilteredOrders(filtered);
    }
  }, [orders, applySortingAndFiltering]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadOrders();
  }, [loadOrders]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const cancelOrder = async (orderId: string) => {
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
      if (order.status !== 'pending') {
        showAlert('Cannot Cancel', 'This order can no longer be cancelled as it has already been accepted by the seller.');
        return;
      }
      const { error } = await supabase
        .from('orders')
        .update({
          status: 'cancelled',
          cancelled_at: new Date().toISOString(),
          cancelled_by: userId,
          updated_at: new Date().toISOString(),
        })
        .eq('id', orderId)
        .eq('status', 'pending');
      if (error) throw error;

      setOrders(prev => prev.map(nextOrder =>
        nextOrder.id === orderId
          ? {
              ...nextOrder,
              status: 'cancelled',
              cancelled_at: new Date().toISOString(),
              cancelled_by: userId,
              updated_at: new Date().toISOString(),
            }
          : nextOrder,
      ));
      setTimeout(() => {
        loadOrders();
      }, 1000);
      showAlert('Success', 'Order cancelled successfully');
    } catch (error: any) {
      showAlert('Error', error.message || 'Failed to cancel order');
    }
  };

  const getShopDataForOrder = (order: any): { name: string; avatar_url: string | null } => {
    if (order.seller_id && shopData[order.seller_id]) {
      return shopData[order.seller_id];
    }
    if (order.order_items && order.order_items.length > 0) {
      const firstItem = order.order_items[0];
      if (firstItem.seller_id && shopData[firstItem.seller_id]) {
        return shopData[firstItem.seller_id];
      }
      if (firstItem.products?.seller_id && shopData[firstItem.products.seller_id]) {
        return shopData[firstItem.products.seller_id];
      }
    }
    return { name: 'Shop', avatar_url: null };
  };

  const getAvatarUrlForOrder = (order: any): string => {
    const nextShopData = getShopDataForOrder(order);

    if (nextShopData.avatar_url) {
      if (nextShopData.avatar_url.startsWith('http')) {
        return nextShopData.avatar_url;
      } else {
        return `${supabaseUrl}/storage/v1/object/public/avatars/${nextShopData.avatar_url}`;
      }
    }

    return `https://ui-avatars.com/api/?name=${encodeURIComponent(nextShopData.name)}&background=FF9900&color=fff`;
  };

  const getProductFromOrder = (order: any): Product => {
    const firstItem = order.order_items?.[0] || order;

    return {
      id: firstItem.product_id || firstItem.id,
      title: firstItem.product_name || firstItem.products?.title || firstItem.title || 'Product',
      description: firstItem.products?.description || '',
      price: firstItem.product_price || firstItem.total_amount || 0,
      original_price: null,
      quantity: firstItem.quantity || 1,
      media_urls: [
        firstItem.product_image_url ||
        firstItem.products?.media_urls?.[0] ||
        firstItem.media_urls?.[0] ||
        'https://ui-avatars.com/api/?name=Product&background=FF9900&color=fff',
      ],
      seller_id: order.seller_id || firstItem.seller_id,
      display_name: getShopDataForOrder(order).name || 'Seller',
      avatar_url: getAvatarUrlForOrder(order),
      university: '',
      hasDiscount: false,
      discountPercent: null,
      isVideo: false,
      score: 0,
      commentCount: 0,
      likeCount: 0,
      shareCount: 0,
      followerCount: 0,
      isLiked: false,
      isFollowed: false,
      inCart: false,
    };
  };

  const formatCalendarFilterText = () => {
    if (!calendarFilter) return '';

    if (calendarFilter.singleDate) {
      return format(calendarFilter.singleDate, 'MMM d, yyyy');
    }

    if (calendarFilter.dateRange) {
      return `${format(calendarFilter.dateRange.start, 'MMM d')} - ${format(calendarFilter.dateRange.end, 'MMM d, yyyy')}`;
    }

    if (calendarFilter.monthRange) {
      if (isSameMonth(calendarFilter.monthRange.start, calendarFilter.monthRange.end)) {
        return format(calendarFilter.monthRange.start, 'MMMM yyyy');
      }
      return `${format(calendarFilter.monthRange.start, 'MMM yyyy')} - ${format(calendarFilter.monthRange.end, 'MMM yyyy')}`;
    }

    if (calendarFilter.year) {
      return `Year: ${calendarFilter.year}`;
    }

    return '';
  };

  const renderOrderItem = ({ item, propsCurrentUserId }: { item: any; propsCurrentUserId?: string | null }) => {
    const firstItem = item.order_items?.[0] || item;
    const possibleMedia = [
      firstItem.product_image_url,
      ...(firstItem.products?.media_urls || []),
      ...(firstItem.media_urls || []),
    ].filter(Boolean) as string[];
    let coverImage = getCardDisplayMedia(possibleMedia) || getCardDisplayUrl(possibleMedia) || 'https://ui-avatars.com/api/?name=Product&background=FF9900&color=fff';
    if (isVideoUrl(coverImage)) {
      const nonVideo = possibleMedia.find(m => !isVideoUrl(m));
      if (nonVideo) coverImage = nonVideo.startsWith('http') ? nonVideo : `${supabaseUrl}/storage/v1/object/public/products/${nonVideo}`;
      else {
        coverImage = 'https://ui-avatars.com/api/?name=Product&background=FF9900&color=fff';
      }
    }

    const productName = firstItem.product_name ||
                       firstItem.products?.title ||
                       firstItem.title ||
                       'Product';

    const nextShopData = getShopDataForOrder(item);
    const avatarUrl = getAvatarUrlForOrder(item);

    const product = getProductFromOrder(item);
    return (
      <View style={[styles.orderCard, {
        backgroundColor: theme.surface,
        shadowColor: theme.shadow,
        width: '100%',
        maxWidth: contentMaxWidth,
        alignSelf: 'center',
      }]}>
        <View style={styles.orderHeader}>
          <View style={styles.orderInfo}>
            <Text style={[styles.orderId, { color: theme.text }]}>Order #{item.id.slice(-8)}</Text>
            <Text style={[styles.orderDate, { color: theme.textTertiary }]}>
              {formatDate(item.created_at)}
            </Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status, theme) }]}>
            <Text style={styles.statusText}>{getStatusText(item.status)}</Text>
          </View>
        </View>
        <View style={styles.orderContent}>
          {coverImage && (
            <Image
              source={{ uri: coverImage }}
              style={[
                styles.orderProductImage,
                isSmallScreen && { width: 68, height: 68 },
                isLargeScreen && { width: 92, height: 92 },
              ]}
              resizeMode="cover"
            />
          )}
          <View style={styles.orderDetails}>
            <Text style={[styles.orderProductTitle, { color: theme.text }]} numberOfLines={2}>
              {productName}
              {item.order_items?.length > 1 && ` +${item.order_items.length - 1} more`}
            </Text>
            <Text style={[styles.orderProductPrice, { color: theme.primary }]}>
              GHS {item.total_amount?.toFixed(2) || '0.00'}
            </Text>
            <View style={styles.sellerInfo}>
              <Image
                source={{ uri: avatarUrl }}
                style={styles.sellerAvatar}
              />
              <Text style={[styles.sellerName, { color: theme.textSecondary }]}>Shop: {nextShopData.name}</Text>
            </View>
            <Text style={[styles.orderDeliveryInfo, { color: theme.textTertiary }]}>
              {formatDeliveryOption(item.delivery_option)} • {item.location || 'No location specified'}
            </Text>
          </View>
        </View>
        <View style={[styles.orderFooter, { borderTopColor: theme.border }]}>
          <Text style={[styles.orderItemsCount, { color: theme.textTertiary }]}>
            {item.order_items?.length || 1} item{item.order_items?.length !== 1 ? 's' : ''}
          </Text>
          <TouchableOpacity
            style={[styles.orderActionButton, { backgroundColor: theme.primary }]}
            onPress={() => {
              onViewProductDetails(item, product);
            }}
          >
            <Ionicons name="eye-outline" size={16} color="#fff" />
            <Text style={styles.orderActionButtonText}>View Details</Text>
          </TouchableOpacity>
          {item.status === 'pending' && (
            <TouchableOpacity
              style={[styles.orderActionButton, styles.cancelOrderButton, { backgroundColor: theme.error }]}
              onPress={() => {
                showAlert(
                  'Cancel Order',
                  'Are you sure you want to cancel this order? This action cannot be undone.',
                  [
                    {
                      text: 'Keep Order',
                      style: 'cancel',
                      onPress: () => {},
                    },
                    {
                      text: 'Yes, Cancel',
                      style: 'destructive',
                      onPress: () => cancelOrder(item.id),
                    },
                  ],
                );
              }}
            >
              <Ionicons name="close-circle" size={16} color="#fff" />
              <Text style={styles.orderActionButtonText}>Cancel Order</Text>
            </TouchableOpacity>
          )}
          {item.status === 'cancelled' && (
            <View style={[styles.orderActionButton, { backgroundColor: theme.textTertiary }]}>
              <Ionicons name="close-circle" size={16} color="#fff" />
              <Text style={styles.orderActionButtonText}>Cancelled</Text>
            </View>
          )}
          {item.status === 'processing' && (
            <View style={[styles.orderActionButton, { backgroundColor: theme.info }]}>
              <Ionicons name="time" size={16} color="#fff" />
              <Text style={styles.orderActionButtonText}>Processing</Text>
            </View>
          )}
          {item.status === 'completed' && propsCurrentUserId && product?.id && (
            <ProductReviewsSection
              productId={product.id}
              currentUserId={propsCurrentUserId}
              theme={theme}
              showAlert={showAlert}
              onRequireAuth={() => showAlert('Login Required', 'Please log in to leave a review.')}
            />
          )}
        </View>
      </View>
    );
  };

  const renderSortFilterMenu = () => {
    if (!showSortFilterMenu) return null;

    const sortOptions = [
      { key: 'newest', label: 'Newest First', icon: 'arrow-down' },
      { key: 'oldest', label: 'Oldest First', icon: 'arrow-up' },
      { key: 'price-high', label: 'Price: High to Low', icon: 'cash' },
      { key: 'price-low', label: 'Price: Low to High', icon: 'cash-outline' },
      { key: 'status', label: 'By Status', icon: 'list' },
    ];

    const filterOptions = [
      { key: 'all', label: 'All Status', icon: 'grid' },
      { key: 'pending', label: 'Pending', icon: 'time' },
      { key: 'processing', label: 'Processing', icon: 'sync' },
      { key: 'completed', label: 'Completed', icon: 'checkmark-circle' },
      { key: 'cancelled', label: 'Cancelled', icon: 'close-circle' },
    ];

    return (
      <Modal
        transparent={true}
        visible={showSortFilterMenu}
        animationType="slide"
        onRequestClose={() => setShowSortFilterMenu(false)}
      >
        <View
          style={[
            styles.sortFilterOverlay,
            {
              backgroundColor: theme.modalOverlay,
              justifyContent: isLargeScreen ? 'center' : 'flex-end',
              alignItems: 'center',
            },
          ]}
        >
          <View
            style={[
              styles.sortFilterContainer,
              {
                backgroundColor: theme.modalBackground,
                width: modalWidth,
                maxWidth: 800,
                height: modalHeight,
                borderRadius: isLargeScreen ? 20 : undefined,
                borderTopLeftRadius: isLargeScreen ? 20 : 20,
                borderTopRightRadius: isLargeScreen ? 20 : 20,
                alignSelf: 'center',
                marginHorizontal: isLargeScreen ? 'auto' : 0,
                left: 0,
                right: 0,
                marginLeft: 'auto',
                marginRight: 'auto',
              },
            ]}
          >
            <View style={[styles.sortFilterHeader, { borderBottomColor: theme.border }]}>
              <Text style={[styles.sortFilterTitle, { color: theme.text }]}>Sort & Filter Orders</Text>
              <TouchableOpacity onPress={() => setShowSortFilterMenu(false)}>
                <Ionicons name="close" size={24} color={theme.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.sortFilterContent}>
              <View style={styles.sortFilterSection}>
                <Text style={[styles.sortFilterSectionTitle, { color: theme.text }]}>Sort By</Text>
                {sortOptions.map(option => (
                  <TouchableOpacity
                    key={option.key}
                    style={[
                      styles.sortFilterOption,
                      { backgroundColor: theme.surface, borderColor: theme.border },
                      sortOption === option.key && { borderColor: theme.primary, backgroundColor: `${theme.primaryLight}20` },
                    ]}
                    onPress={() => {
                      setSortOption(option.key as SortOption);
                    }}
                  >
                    <View style={styles.sortFilterOptionContent}>
                      <Ionicons
                        name={option.icon as any}
                        size={20}
                        color={sortOption === option.key ? theme.primary : theme.textSecondary}
                      />
                      <Text style={[
                        styles.sortFilterOptionText,
                        { color: sortOption === option.key ? theme.primary : theme.text },
                      ]}>
                        {option.label}
                      </Text>
                    </View>
                    {sortOption === option.key && (
                      <Ionicons name="checkmark" size={20} color={theme.primary} />
                    )}
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.sortFilterSection}>
                <Text style={[styles.sortFilterSectionTitle, { color: theme.text }]}>Filter by Status</Text>
                <View style={styles.filterGrid}>
                  {filterOptions.map(option => (
                    <TouchableOpacity
                      key={option.key}
                      style={[
                        styles.filterChip,
                        { backgroundColor: theme.surface },
                        filterOption === option.key && { backgroundColor: getStatusColor(option.key, theme) },
                      ]}
                      onPress={() => setFilterOption(option.key as FilterOption)}
                    >
                      <Ionicons
                        name={option.icon as any}
                        size={16}
                        color={filterOption === option.key ? '#fff' : theme.textSecondary}
                      />
                      <Text style={[
                        styles.filterChipText,
                        { color: filterOption === option.key ? '#fff' : theme.text },
                      ]}>
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.sortFilterSection}>
                <Text style={[styles.sortFilterSectionTitle, { color: theme.text }]}>Date Range</Text>
                <TouchableOpacity
                  style={[styles.calendarFilterButton, { backgroundColor: theme.surface, borderColor: theme.border }]}
                  onPress={() => {
                    setShowSortFilterMenu(false);
                    setShowCalendarFilter(true);
                  }}
                >
                  <Ionicons name="calendar" size={20} color={theme.primary} />
                  <View style={styles.calendarFilterButtonTextContainer}>
                    <Text style={[styles.calendarFilterButtonTitle, { color: theme.text }]}>Select Date Range</Text>
                    <Text style={[styles.calendarFilterButtonSubtitle, { color: theme.textTertiary }]}>
                      {calendarFilter ? formatCalendarFilterText() : 'Tap to select dates'}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={theme.textTertiary} />
                </TouchableOpacity>
              </View>

              <View style={styles.sortFilterActions}>
                <TouchableOpacity
                  style={[styles.resetButton, { backgroundColor: theme.surface, borderColor: theme.border }]}
                  onPress={() => {
                    setSortOption('newest');
                    setFilterOption('all');
                    setCalendarFilter(null);
                  }}
                >
                  <Text style={[styles.resetButtonText, { color: theme.text }]}>Reset All</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.sortApplyButton,
                    {
                      backgroundColor: theme.primary,
                      shadowColor: theme.primary,
                      shadowOffset: { width: 0, height: 4 },
                      shadowOpacity: 0.2,
                      shadowRadius: 8,
                      elevation: 4,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                    },
                  ]}
                  activeOpacity={0.9}
                  onPress={() => setShowSortFilterMenu(false)}
                >
                  <Ionicons name="checkmark-done" size={18} color="#fff" />
                  <Text style={styles.applyButtonText}>Apply Filters</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  };

  const getActiveFilterCount = () => {
    let count = 0;
    if (sortOption !== 'newest') count++;
    if (filterOption !== 'all') count++;
    if (calendarFilter) count++;
    return count;
  };

  if (!isVisible) return null;

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={isVisible}
      onRequestClose={onClose}
    >
      <View
        style={[
          styles.ordersModalContainer,
          {
            backgroundColor: theme.modalOverlay,
            justifyContent: isLargeScreen ? 'center' : 'flex-end',
            alignItems: 'center',
          },
        ]}
      >
        <View
          style={[
            styles.ordersModalContent,
            {
              backgroundColor: theme.modalBackground,
              width: modalWidth,
              maxWidth: 800,
              height: modalHeight,
              borderRadius: isLargeScreen ? 20 : undefined,
              borderTopLeftRadius: isLargeScreen ? 20 : 20,
              borderTopRightRadius: isLargeScreen ? 20 : 20,
              alignSelf: 'center',
              marginHorizontal: isLargeScreen ? 'auto' : 0,
              left: 0,
              right: 0,
              marginLeft: 'auto',
              marginRight: 'auto',
            },
          ]}
        >
          <View style={[styles.ordersModalHeader, { borderBottomColor: theme.border, paddingHorizontal: isSmallScreen ? 10 : (isLargeScreen ? 18 : 15), paddingVertical: isSmallScreen ? 10 : 15 }]}> 
            <TouchableOpacity onPress={onClose} style={styles.ordersCloseButton}>
              <Ionicons name="close" size={28} color={theme.text} />
            </TouchableOpacity>
            <Text style={[styles.ordersModalTitle, { color: theme.text, fontSize: isSmallScreen ? 16 : (isLargeScreen ? 19 : 18), flexShrink: 1 }]} numberOfLines={1}> 
              My Orders ({filteredOrders.length})
              {unreadNotificationCount > 0 && (
                <Text style={[styles.notificationCountBadge, { color: theme.primary }]}> • {unreadNotificationCount} new</Text>
              )}
            </Text>
            <TouchableOpacity
              style={styles.sortFilterButton}
              onPress={() => setShowSortFilterMenu(true)}
            >
              <Ionicons name="options-outline" size={24} color={theme.text} />
              {getActiveFilterCount() > 0 && (
                <View style={[styles.filterBadge, { backgroundColor: theme.primary }]}>
                  <Text style={styles.filterBadgeText}>{getActiveFilterCount()}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          {(filterOption !== 'all' || calendarFilter) && (
            <View style={[styles.filterSummary, { backgroundColor: theme.surface, maxWidth: contentMaxWidth, alignSelf: 'center', width: '100%' }]}> 
              <View style={styles.filterSummaryContent}>
                <Ionicons name="filter" size={16} color={theme.textSecondary} />
                <Text style={[styles.filterSummaryText, { color: theme.text }]}> 
                  {filterOption !== 'all' && `Status: ${filterOption.charAt(0).toUpperCase() + filterOption.slice(1)}`}
                  {filterOption !== 'all' && calendarFilter && ' • '}
                  {calendarFilter && `Date: ${formatCalendarFilterText()}`}
                </Text>
                <TouchableOpacity onPress={() => {
                  setFilterOption('all');
                  setCalendarFilter(null);
                }}>
                  <Text style={[styles.clearFiltersText, { color: theme.primary }]}>Clear</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {loading ? (
            <View style={styles.ordersLoadingContainer}>
              <ActivityIndicator size="large" color={theme.primary} />
              <Text style={[styles.ordersLoadingText, { color: theme.text }]}>Loading orders...</Text>
            </View>
          ) : filteredOrders.length === 0 ? (
            <View style={styles.ordersEmptyState}>
              <Ionicons name="receipt-outline" size={80} color={theme.border} />
              <Text style={[styles.ordersEmptyText, { color: theme.textTertiary }]}> 
                {orders.length === 0 ? 'No orders yet' : 'No orders match your filters'}
              </Text>
              <Text style={[styles.ordersEmptySubtext, { color: theme.textTertiary }]}> 
                {orders.length === 0
                  ? 'Your orders will appear here when you purchase products from sellers'
                  : 'Try changing your filter or sorting options'}
              </Text>
              {orders.length > 0 && (
                <TouchableOpacity
                  style={[styles.clearFiltersButton, { backgroundColor: theme.primary }]}
                  onPress={() => {
                    setFilterOption('all');
                    setCalendarFilter(null);
                  }}
                >
                  <Text style={styles.clearFiltersButtonText}>Clear Filters</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[styles.ordersContinueButton, { backgroundColor: theme.primary }]}
                onPress={onClose}
              >
                <Text style={styles.ordersContinueButtonText}>Continue Shopping</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <FlatList
              data={filteredOrders}
              keyExtractor={item => item.id}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={[
                styles.ordersListContainer,
                {
                  width: '100%',
                  maxWidth: contentMaxWidth,
                  alignSelf: 'center',
                  paddingHorizontal: isSmallScreen ? 10 : (isLargeScreen ? 20 : 16),
                },
              ]}
              renderItem={props => renderOrderItem({ ...props, propsCurrentUserId: currentUserId })}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                  colors={[theme.primary]}
                />
              }
            />
          )}
        </View>
        {renderSortFilterMenu()}
        <CalendarFilterComponent
          isVisible={showCalendarFilter}
          onClose={() => setShowCalendarFilter(false)}
          onApplyFilter={selection => {
            setCalendarFilter(selection);
            setShowCalendarFilter(false);
          }}
          currentSelection={calendarFilter}
          theme={theme}
          styles={styles}
        />
      </View>
    </Modal>
  );
}
