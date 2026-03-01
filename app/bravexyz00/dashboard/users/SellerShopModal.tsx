import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import ProductDetailsMenu, { AdminDashboardProduct } from '../products/ProductDetailsMenu';
import EditProductMenu from '../products/EditProductMenu';

const SUPABASE_URL = 'https://qwujadyqebfypyhfuwfl.supabase.co';

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

type SellerUser = {
  id: string;
  full_name: string | null;
  username: string | null;
  email: string | null;
  shop_name?: string | null;
  shop_phone?: string | null;
};

type SellerProduct = {
  id: string;
  seller_id: string;
  title: string;
  description: string | null;
  price: number;
  original_price: number | null;
  media_urls: string[] | null;
  category: string | null;
  quantity: number | null;
  created_at: string;
};

type Order = {
  id: string;
  order_number: number;
  buyer_name: string;
  phone_number: string;
  location: string;
  product_name: string;
  product_price: number;
  product_image_url: string | null;
  quantity: number | null;
  selected_color: string | null;
  selected_size: string | null;
  total_amount: number;
  status: string;
  delivery_option: string;
  created_at: string;
  is_cart_order: boolean;
};

type OrderItemWithOrderRow = {
  order_id: string;
  product_name: string | null;
  product_price: number | null;
  product_image_url: string | null;
  quantity: number | null;
  color: string | null;
  size: string | null;
  created_at: string;
  orders:
    | {
        id: string;
        order_number: number;
        buyer_name: string;
        phone_number: string;
        location: string;
        total_amount: number;
        status: string;
        delivery_option: string;
        created_at: string;
        is_cart_order: boolean;
      }
    | {
        id: string;
        order_number: number;
        buyer_name: string;
        phone_number: string;
        location: string;
        total_amount: number;
        status: string;
        delivery_option: string;
        created_at: string;
        is_cart_order: boolean;
      }[]
    | null;
};

type AdminOrderRow = {
  id: string;
  order_number: number;
  buyer_name: string;
  phone_number: string;
  location: string;
  product_name: string | null;
  product_price: number | null;
  product_image_url: string | null;
  quantity: number | null;
  selected_color: string | null;
  selected_size: string | null;
  total_amount: number;
  status: string;
  delivery_option: string;
  created_at: string;
  is_cart_order: boolean;
};

type ShopStats = {
  totalProducts: number;
  totalOrders: number;
  pendingOrders: number;
  processingOrders: number;
  completedOrders: number;
};

interface SellerShopModalProps {
  visible: boolean;
  seller: SellerUser | null;
  onClose: () => void;
}

const toPublicProductUrl = (url?: string) => {
  if (!url) return 'https://via.placeholder.com/400';
  if (url.startsWith('http')) return url;
  return `${SUPABASE_URL}/storage/v1/object/public/products/${url}`;
};

const getCardDisplayMedia = (mediaUrls: string[] | null | undefined): string | undefined => {
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

const calculateDiscount = (original: number | null, current: number): number | null => {
  if (!original || original <= current) return null;
  return Math.round(((original - current) / original) * 100);
};

const SellerShopModal = ({ visible, seller, onClose }: SellerShopModalProps) => {
  const { width } = useWindowDimensions();
  const isMobile = width < 700;

  const [products, setProducts] = useState<SellerProduct[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [stats, setStats] = useState<ShopStats>({
    totalProducts: 0,
    totalOrders: 0,
    pendingOrders: 0,
    processingOrders: 0,
    completedOrders: 0,
  });
  const [activeTab, setActiveTab] = useState<'products' | 'orders'>('products');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<AdminDashboardProduct | null>(null);
  const [detailsVisible, setDetailsVisible] = useState(false);
  const [editVisible, setEditVisible] = useState(false);
  const [editingProduct, setEditingProduct] = useState<AdminDashboardProduct | null>(null);

  const calculateStats = useCallback(() => {
    const totalProducts = products.length;
    const totalOrders = orders.length;
    const pendingOrders = orders.filter(o => o.status === 'pending').length;
    const processingOrders = orders.filter(o => o.status === 'processing').length;
    const completedOrders = orders.filter(o => o.status === 'completed').length;

    setStats({
      totalProducts,
      totalOrders,
      pendingOrders,
      processingOrders,
      completedOrders,
    });
  }, [products, orders]);

  const loadAllData = useCallback(
    async (isRefresh = false) => {
      if (!seller?.id) return;

      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setErrorMessage(null);

      const [productsRes, adminOrdersRes, ordersRes, orderItemsRes] = await Promise.all([
        supabase
          .from('products')
          .select('id, seller_id, title, description, price, original_price, media_urls, category, quantity, created_at')
          .eq('seller_id', seller.id)
          .order('created_at', { ascending: false }),
        supabase.rpc('admin_get_seller_orders', { p_seller_id: seller.id }),
        supabase
          .from('orders')
          .select('id, order_number, buyer_name, phone_number, location, product_name, product_price, product_image_url, quantity, selected_color, selected_size, total_amount, status, delivery_option, created_at, is_cart_order')
          .eq('seller_id', seller.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('order_items')
          .select(`
            order_id,
            product_name,
            product_price,
            product_image_url,
            quantity,
            color,
            size,
            created_at,
            orders!inner(
              id,
              order_number,
              buyer_name,
              phone_number,
              location,
              total_amount,
              status,
              delivery_option,
              created_at,
              is_cart_order
            )
          `)
          .eq('seller_id', seller.id)
          .order('created_at', { ascending: false }),
      ]);

      if (productsRes.error || (adminOrdersRes.error && ordersRes.error && orderItemsRes.error)) {
        setErrorMessage('Unable to load shop data.');
        setProducts([]);
        setOrders([]);
      } else {
        const adminOrders = ((adminOrdersRes.data as AdminOrderRow[]) || []).map((row) => ({
          id: row.id,
          order_number: row.order_number,
          buyer_name: row.buyer_name,
          phone_number: row.phone_number,
          location: row.location,
          product_name: row.product_name || 'Order item',
          product_price: Number(row.product_price || 0),
          product_image_url: row.product_image_url || null,
          quantity: row.quantity ?? null,
          selected_color: row.selected_color || null,
          selected_size: row.selected_size || null,
          total_amount: Number(row.total_amount || 0),
          status: row.status,
          delivery_option: row.delivery_option,
          created_at: row.created_at,
          is_cart_order: Boolean(row.is_cart_order),
        } as Order));

        const directOrders = ((ordersRes.data as Order[]) || []).map((order) => ({
          ...order,
          product_name: order.product_name || 'Order item',
          product_price: Number(order.product_price || 0),
          product_image_url: order.product_image_url || null,
          quantity: order.quantity ?? null,
          selected_color: order.selected_color || null,
          selected_size: order.selected_size || null,
          total_amount: Number(order.total_amount || 0),
        }));

        const itemBasedOrders = ((orderItemsRes.data as OrderItemWithOrderRow[]) || [])
          .map((row) => {
            const linkedOrder = Array.isArray(row.orders) ? row.orders[0] : row.orders;
            if (!linkedOrder) return null;
            return {
              id: linkedOrder.id,
              order_number: linkedOrder.order_number,
              buyer_name: linkedOrder.buyer_name,
              phone_number: linkedOrder.phone_number,
              location: linkedOrder.location,
              product_name: row.product_name || 'Cart item',
              product_price: Number(row.product_price || 0),
              product_image_url: row.product_image_url || null,
              quantity: row.quantity ?? null,
              selected_color: row.color || null,
              selected_size: row.size || null,
              total_amount: Number(linkedOrder.total_amount || 0),
              status: linkedOrder.status,
              delivery_option: linkedOrder.delivery_option,
              created_at: linkedOrder.created_at,
              is_cart_order: Boolean(linkedOrder.is_cart_order),
            } as Order;
          })
          .filter((order): order is Order => Boolean(order));

        const mergedOrdersMap = new Map<string, Order>();

        adminOrders.forEach((order) => {
          mergedOrdersMap.set(order.id, order);
        });

        directOrders.forEach((order) => {
          mergedOrdersMap.set(order.id, order);
        });

        itemBasedOrders.forEach((order) => {
          const existing = mergedOrdersMap.get(order.id);

          if (!existing) {
            mergedOrdersMap.set(order.id, order);
            return;
          }

          if (!existing.product_name || existing.product_name === 'Order item') {
            mergedOrdersMap.set(order.id, {
              ...existing,
              product_name: order.product_name,
              product_price: order.product_price,
              product_image_url: order.product_image_url,
              quantity: order.quantity,
              selected_color: order.selected_color,
              selected_size: order.selected_size,
            });
          }
        });

        const mergedOrders = Array.from(mergedOrdersMap.values()).sort(
          (first, second) => new Date(second.created_at).getTime() - new Date(first.created_at).getTime()
        );

        setProducts((productsRes.data as SellerProduct[]) || []);
        setOrders(mergedOrders);
      }

      setLoading(false);
      setRefreshing(false);
    },
    [seller?.id]
  );

  useEffect(() => {
    if (visible && seller?.id) {
      loadAllData();
    }
  }, [loadAllData, seller?.id, visible]);

  useEffect(() => {
    calculateStats();
  }, [calculateStats]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return { bg: '#FEF3C7', text: '#92400E', border: '#FDE047' };
      case 'processing':
        return { bg: '#DBEAFE', text: '#1E40AF', border: '#93C5FD' };
      case 'shipped':
        return { bg: '#E0E7FF', text: '#4338CA', border: '#A5B4FC' };
      case 'completed':
        return { bg: '#D1FAE5', text: '#065F46', border: '#6EE7B7' };
      case 'cancelled':
        return { bg: '#FEE2E2', text: '#991B1B', border: '#FCA5A5' };
      default:
        return { bg: '#F1F5F9', text: '#475569', border: '#CBD5E1' };
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const renderOrder = ({ item }: { item: Order }) => {
    const statusColors = getStatusColor(item.status);

    return (
      <View style={styles.orderCard}>
        <View style={styles.orderHeader}>
          <View style={styles.orderHeaderLeft}>
            <Text style={styles.orderNumber}>Order #{item.order_number}</Text>
            <View style={[styles.statusBadge, { backgroundColor: statusColors.bg, borderColor: statusColors.border }]}>
              <Text style={[styles.statusText, { color: statusColors.text }]}>{item.status.toUpperCase()}</Text>
            </View>
          </View>
          <Text style={styles.orderDate}>{formatDate(item.created_at)}</Text>
        </View>

        <View style={styles.orderBody}>
          <View style={styles.orderProductSection}>
            {item.product_image_url && (
              <Image
                source={{ uri: toPublicProductUrl(item.product_image_url) }}
                style={styles.orderProductImage}
                resizeMode="cover"
              />
            )}
            <View style={styles.orderProductInfo}>
              <Text style={styles.orderProductName} numberOfLines={2}>{item.product_name}</Text>
              <View style={styles.orderProductMeta}>
                {item.quantity && (
                  <Text style={styles.orderMetaText}>Qty: {item.quantity}</Text>
                )}
                {item.selected_color && (
                  <>
                    <Text style={styles.orderMetaDot}>•</Text>
                    <Text style={styles.orderMetaText}>Color: {item.selected_color}</Text>
                  </>
                )}
                {item.selected_size && (
                  <>
                    <Text style={styles.orderMetaDot}>•</Text>
                    <Text style={styles.orderMetaText}>Size: {item.selected_size}</Text>
                  </>
                )}
              </View>
            </View>
          </View>

          <View style={styles.orderDivider} />

          <View style={styles.orderCustomerSection}>
            <View style={styles.orderInfoRow}>
              <Ionicons name="person-outline" size={16} color="#64748B" />
              <Text style={styles.orderInfoText}>{item.buyer_name}</Text>
            </View>
            <View style={styles.orderInfoRow}>
              <Ionicons name="call-outline" size={16} color="#64748B" />
              <Text style={styles.orderInfoText}>{item.phone_number}</Text>
            </View>
            <View style={styles.orderInfoRow}>
              <Ionicons name="location-outline" size={16} color="#64748B" />
              <Text style={styles.orderInfoText} numberOfLines={1}>{item.location}</Text>
            </View>
            <View style={styles.orderInfoRow}>
              <Ionicons name="car-outline" size={16} color="#64748B" />
              <Text style={styles.orderInfoText}>{item.delivery_option}</Text>
            </View>
          </View>

          <View style={styles.orderDivider} />

          <View style={styles.orderFooter}>
            <Text style={styles.orderTotalLabel}>Total Amount</Text>
            <Text style={styles.orderTotalAmount}>GH₵ {Number(item.total_amount).toFixed(2)}</Text>
          </View>

          <View style={styles.orderActionsRow}>
            {item.status === 'pending' && (
              <>
                <TouchableOpacity
                  style={[styles.orderActionButton, styles.acceptActionButton, updatingOrderId === item.id && styles.orderActionButtonDisabled]}
                  onPress={() => updateOrderStatus(item.id, 'processing')}
                  disabled={updatingOrderId === item.id}
                >
                  <Text style={styles.orderActionButtonText}>Accept</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.orderActionButton, styles.rejectActionButton, updatingOrderId === item.id && styles.orderActionButtonDisabled]}
                  onPress={() => updateOrderStatus(item.id, 'cancelled')}
                  disabled={updatingOrderId === item.id}
                >
                  <Text style={styles.orderActionButtonText}>Reject</Text>
                </TouchableOpacity>
              </>
            )}

            {item.status === 'processing' && (
              <TouchableOpacity
                style={[styles.orderActionButton, styles.completeActionButton, updatingOrderId === item.id && styles.orderActionButtonDisabled]}
                onPress={() => updateOrderStatus(item.id, 'completed')}
                disabled={updatingOrderId === item.id}
              >
                <Text style={styles.orderActionButtonText}>Complete</Text>
              </TouchableOpacity>
            )}

            {updatingOrderId === item.id && (
              <View style={styles.orderActionLoadingWrap}>
                <ActivityIndicator size="small" color="#2563EB" />
              </View>
            )}
          </View>
        </View>
      </View>
    );
  };

  const updateOrderStatus = useCallback(
    async (orderId: string, status: 'pending' | 'processing' | 'completed' | 'cancelled' | 'shipped') => {
      const currentOrder = orders.find((order) => order.id === orderId);

      if (!currentOrder) return;

      if (currentOrder.status === 'cancelled') {
        Alert.alert('Cannot update', 'This order is cancelled and cannot be changed.');
        return;
      }

      try {
        setUpdatingOrderId(orderId);

        const { error: rpcError } = await supabase.rpc('admin_update_order_status', {
          p_order_id: orderId,
          p_status: status,
        });

        if (rpcError) {
          const { error: fallbackError } = await supabase
            .from('orders')
            .update({
              status,
              updated_at: new Date().toISOString(),
            })
            .eq('id', orderId)
            .neq('status', 'cancelled');

          if (fallbackError) {
            throw fallbackError;
          }
        }

        setOrders((previousOrders) =>
          previousOrders.map((order) =>
            order.id === orderId
              ? {
                  ...order,
                  status,
                }
              : order
          )
        );
      } catch (error: any) {
        Alert.alert('Update failed', error?.message || 'Failed to update order status.');
      } finally {
        setUpdatingOrderId(null);
      }
    },
    [orders]
  );

  const renderProduct = ({ item }: { item: SellerProduct }) => {
    const discount = calculateDiscount(item.original_price, Number(item.price));

    const mappedProduct: AdminDashboardProduct = {
      id: item.id,
      seller_id: item.seller_id,
      title: item.title,
      description: item.description,
      price: Number(item.price),
      original_price: item.original_price !== null ? Number(item.original_price) : null,
      media_urls: item.media_urls || [],
      color_media: null,
      color_stock: null,
      category: item.category || 'Other',
      sub_category: null,
      gender: null,
      brand: null,
      delivery_option: 'Campus Delivery',
      quantity: item.quantity,
      sizes_available: null,
      colors_available: null,
      is_pre_order: false,
      pre_order_duration: null,
      pre_order_duration_unit: null,
      is_service: false,
      created_at: item.created_at,
      university: null,
      display_name: seller?.full_name || seller?.username || seller?.email || 'Seller',
      avatar_url: undefined,
      shop_name: seller?.shop_name || null,
    };

    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.88}
        onPress={() => {
          setSelectedProduct(mappedProduct);
          setDetailsVisible(true);
        }}
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
          <Text style={styles.cardTitle} numberOfLines={2}>
            {item.title}
          </Text>

          <View style={styles.priceRow}>
            <Text style={styles.priceText}>GH₵ {Number(item.price).toFixed(2)}</Text>
            {item.original_price && Number(item.original_price) > Number(item.price) ? (
              <Text style={styles.originalPrice}>GH₵ {Number(item.original_price).toFixed(2)}</Text>
            ) : null}
          </View>

          <View style={styles.metaRow}>
            <Text style={styles.metaText} numberOfLines={1}>
              {item.category || 'Uncategorized'}
            </Text>
            <Text style={styles.dot}>•</Text>
            <Text style={styles.metaText}>{item.quantity ?? 0} left</Text>
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

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={[styles.container, isMobile && { width: '98%', maxWidth: undefined, borderRadius: 10, paddingHorizontal: 0 }]}>
          {/* Header */}
          <View style={[styles.header, isMobile && styles.headerMobile]}>
            <View style={styles.headerLeft}>
              <View style={styles.shopIcon}>
                <Ionicons name="storefront-outline" size={28} color="#2563EB" />
              </View>
              <View style={styles.headerTextWrap}>
                <Text style={[styles.headerTitle, isMobile && styles.headerTitleMobile]} numberOfLines={1}>
                  {seller?.shop_name || seller?.full_name || 'Seller Shop'}
                </Text>
                <Text style={[styles.headerSubtitle, isMobile && styles.headerSubtitleMobile]} numberOfLines={1}>
                  {seller?.email || ''}
                </Text>
                <Text style={[styles.headerSubtitle, isMobile && styles.headerSubtitleMobile]} numberOfLines={1}>
                  {seller?.shop_phone ? `Phone: ${seller.shop_phone}` : ''}
                </Text>
              </View>
            </View>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Ionicons name="close" size={22} color="#64748B" />
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={styles.stateWrap}>
              <ActivityIndicator size="large" color="#2563EB" />
              <Text style={styles.stateText}>Loading shop data...</Text>
            </View>
          ) : errorMessage ? (
            <View style={styles.stateWrap}>
              <Ionicons name="alert-circle-outline" size={32} color="#DC2626" />
              <Text style={styles.errorText}>{errorMessage}</Text>
              <TouchableOpacity style={styles.retryButton} onPress={() => loadAllData()}>
                <Text style={styles.retryText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <ScrollView
              style={styles.scrollView}
              showsVerticalScrollIndicator={false}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadAllData(true)} />}
            >
              {/* Statistics Section */}
              <View style={styles.statsSection}>
                <View style={styles.statsGrid}>
                  <View style={[styles.statCard, { backgroundColor: '#EFF6FF', borderColor: '#BFDBFE' }]}>
                    <Ionicons name="cube-outline" size={24} color="#2563EB" />
                    <Text style={styles.statValue}>{stats.totalProducts}</Text>
                    <Text style={styles.statLabel}>Products</Text>
                  </View>

                  <View style={[styles.statCard, { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' }]}>
                    <Ionicons name="receipt-outline" size={24} color="#16A34A" />
                    <Text style={styles.statValue}>{stats.totalOrders}</Text>
                    <Text style={styles.statLabel}>Total Orders</Text>
                  </View>

                  <View style={[styles.statCard, { backgroundColor: '#FEF3C7', borderColor: '#FDE047' }]}>
                    <Ionicons name="time-outline" size={24} color="#CA8A04" />
                    <Text style={styles.statValue}>{stats.pendingOrders}</Text>
                    <Text style={styles.statLabel}>Pending</Text>
                  </View>

                  <View style={[styles.statCard, { backgroundColor: '#DBEAFE', borderColor: '#93C5FD' }]}>
                    <Ionicons name="sync-outline" size={24} color="#1E40AF" />
                    <Text style={styles.statValue}>{stats.processingOrders}</Text>
                    <Text style={styles.statLabel}>Processing</Text>
                  </View>

                  <View style={[styles.statCard, { backgroundColor: '#D1FAE5', borderColor: '#6EE7B7' }]}>
                    <Ionicons name="checkmark-circle-outline" size={24} color="#059669" />
                    <Text style={styles.statValue}>{stats.completedOrders}</Text>
                    <Text style={styles.statLabel}>Completed</Text>
                  </View>
                </View>
              </View>

              {/* Tabs Section */}
              <View style={styles.tabsSection}>
                <TouchableOpacity
                  style={[styles.tab, activeTab === 'products' && styles.activeTab]}
                  onPress={() => setActiveTab('products')}
                >
                  <Ionicons
                    name="cube-outline"
                    size={18}
                    color={activeTab === 'products' ? '#2563EB' : '#64748B'}
                  />
                  <Text style={[styles.tabText, activeTab === 'products' && styles.activeTabText]}>
                    Products ({products.length})
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.tab, activeTab === 'orders' && styles.activeTab]}
                  onPress={() => setActiveTab('orders')}
                >
                  <Ionicons
                    name="receipt-outline"
                    size={18}
                    color={activeTab === 'orders' ? '#2563EB' : '#64748B'}
                  />
                  <Text style={[styles.tabText, activeTab === 'orders' && styles.activeTabText]}>
                    Orders ({orders.length})
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Content Section */}
              <View style={styles.contentSection}>
                {activeTab === 'products' ? (
                  products.length === 0 ? (
                    <View style={styles.emptyState}>
                      <Ionicons name="cube-outline" size={48} color="#CBD5E1" />
                      <Text style={styles.emptyStateText}>No products found</Text>
                    </View>
                  ) : (
                    <View style={styles.productsGrid}>
                      {products.map((item) => (
                        <View key={item.id} style={styles.productWrapper}>
                          {renderProduct({ item })}
                        </View>
                      ))}
                    </View>
                  )
                ) : orders.length === 0 ? (
                  <View style={styles.emptyState}>
                    <Ionicons name="receipt-outline" size={48} color="#CBD5E1" />
                    <Text style={styles.emptyStateText}>No orders found</Text>
                  </View>
                ) : (
                  <View style={styles.ordersContainer}>
                    {orders.map((item) => (
                      <View key={item.id}>{renderOrder({ item })}</View>
                    ))}
                  </View>
                )}
              </View>
            </ScrollView>
          )}
        </View>
      </View>

      <ProductDetailsMenu
        visible={detailsVisible}
        product={selectedProduct}
        onEdit={openEditModal}
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
          setProducts((prev) =>
            prev.map((item) =>
              item.id === updatedProduct.id
                ? {
                    ...item,
                    title: updatedProduct.title,
                    description: updatedProduct.description,
                    price: Number(updatedProduct.price),
                    original_price:
                      updatedProduct.original_price !== null
                        ? Number(updatedProduct.original_price)
                        : null,
                    media_urls: updatedProduct.media_urls || [],
                    category: updatedProduct.category || item.category,
                    quantity: updatedProduct.quantity,
                  }
                : item
            )
          );
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
    </Modal>
  );
};

const styles = StyleSheet.create({
  headerContactText: {
    fontSize: 12,
    color: '#64748B',
    marginRight: 2,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  container: {
    width: '100%',
    maxWidth: 1200,
    height: '90%',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  header: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingHorizontal: 24,
    paddingVertical: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flex: 1,
  },
  shopIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#64748B',
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollView: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  statsSection: {
    paddingHorizontal: 20,
    paddingVertical: 24,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    flex: 1,
    minWidth: 140,
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 16,
    alignItems: 'center',
    gap: 8,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#0F172A',
  },
  statLabel: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
  },
  tabsSection: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingTop: 16,
    gap: 8,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: 'transparent',
  },
  activeTab: {
    backgroundColor: '#EFF6FF',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },
  activeTabText: {
    color: '#2563EB',
  },
  contentSection: {
    padding: 20,
  },
  productsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  productWrapper: {
    width: '24%',
    minWidth: 160,
  },
  card: {
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  imageWrap: {
    width: '100%',
    aspectRatio: 1.2,
    backgroundColor: '#F1F5F9',
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
    backgroundColor: '#DC2626',
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
    paddingHorizontal: 10,
    paddingVertical: 10,
    gap: 7,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0F172A',
    minHeight: 34,
    lineHeight: 17,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  priceText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#16A34A',
  },
  originalPrice: {
    fontSize: 12,
    color: '#94A3B8',
    textDecorationLine: 'line-through',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaText: {
    flex: 1,
    fontSize: 11,
    color: '#64748B',
  },
  dot: {
    marginHorizontal: 4,
    color: '#94A3B8',
    fontSize: 11,
  },
  ordersContainer: {
    gap: 16,
  },
  orderCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 3,
  },
  orderHeader: {
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 20,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  orderHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  orderNumber: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1.5,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  orderDate: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
  },
  orderBody: {
    padding: 20,
  },
  orderProductSection: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 16,
  },
  orderProductImage: {
    width: 80,
    height: 80,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
  },
  orderProductInfo: {
    flex: 1,
    gap: 8,
  },
  orderProductName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0F172A',
    lineHeight: 22,
  },
  orderProductMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  orderMetaText: {
    fontSize: 13,
    color: '#64748B',
  },
  orderMetaDot: {
    marginHorizontal: 8,
    color: '#CBD5E1',
    fontSize: 13,
  },
  orderDivider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 16,
  },
  orderCustomerSection: {
    gap: 12,
  },
  orderInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  orderInfoText: {
    flex: 1,
    fontSize: 14,
    color: '#475569',
  },
  orderFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    marginHorizontal: -20,
    marginBottom: -20,
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  orderActionsRow: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  orderActionButton: {
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    minWidth: 88,
    alignItems: 'center',
  },
  acceptActionButton: {
    backgroundColor: '#16A34A',
  },
  rejectActionButton: {
    backgroundColor: '#DC2626',
  },
  completeActionButton: {
    backgroundColor: '#CA8A04',
  },
  orderActionButtonDisabled: {
    opacity: 0.65,
  },
  orderActionButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  orderActionLoadingWrap: {
    marginLeft: 2,
  },
  orderTotalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },
  orderTotalAmount: {
    fontSize: 20,
    fontWeight: '700',
    color: '#16A34A',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 12,
  },
  emptyStateText: {
    fontSize: 15,
    color: '#94A3B8',
    fontWeight: '500',
  },
  stateWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 40,
  },
  stateText: {
    fontSize: 15,
    color: '#64748B',
    textAlign: 'center',
  },
  errorText: {
    fontSize: 15,
    color: '#DC2626',
    textAlign: 'center',
    fontWeight: '500',
  },
  retryButton: {
    marginTop: 8,
    backgroundColor: '#DC2626',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
  },
  retryText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  headerMobile: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 14,
    gap: 8,
  },
  headerTitleMobile: {
    fontSize: 16,
  },
  headerSubtitleMobile: {
    fontSize: 12,
  },
});

export default SellerShopModal;
