import React, { useEffect, useState } from 'react';
import { SafeAreaView, View, Text, FlatList, TouchableOpacity, ActivityIndicator, StyleSheet, useColorScheme, Image, TextInput, Alert, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import type { Session } from '@supabase/supabase-js';
import { useRouter } from 'expo-router';

import SellerProfileModal from '../../home/components/SellerProfileModal';
import ProductDetailModal from '../../home/components/ProductDetailModal';
import OrderFormModal from '../../home/components/orders/OrderFormModal';
import { useCart } from '../../../cart/CartProvider';
import { useAlert } from '@/app/alert/AlertProvider';
import FullImageViewer from '../../home/components/FullImageViewer';
const SUPABASE_URL = 'https://qwujadyqebfypyhfuwfl.supabase.co';

type FollowedSellersProps = {
  onClose?: () => void;
  embedded?: boolean;
};

export default function FollowedSellersScreen({ onClose, embedded = false }: FollowedSellersProps) {
  const router = useRouter();
  const colorScheme = useColorScheme() || 'light';
  const isDark = colorScheme === 'dark';
  const colors = {
    background: isDark ? '#0f172a' : '#f8fafc',
    card: isDark ? '#0b1220' : '#ffffff',
    text: isDark ? '#fff' : '#010917',
    textSecondary: isDark ? '#9aa6bd' : '#4b5563',
    border: isDark ? '#1f2937' : '#e5e7eb',
    primary: '#FF9900',
    modalBg: isDark ? '#0b1220' : '#ffffff',
  };

  const [loading, setLoading] = useState(true);
  const [followed, setFollowed] = useState<any[]>([]);
  const [unfollowing, setUnfollowing] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sellerProfileVisible, setSellerProfileVisible] = useState(false);
  const [selectedSellerId, setSelectedSellerId] = useState<string | null>(null);
  const [productModalVisible, setProductModalVisible] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);
  const [fullViewerIndex, setFullViewerIndex] = useState(-1);
  const [fullViewerMediaUrls, setFullViewerMediaUrls] = useState<string[]>([]);
  const { width } = useWindowDimensions();

  // Order modal state (declare hooks before any early returns)
  const [orderFormVisible, setOrderFormVisible] = useState(false);
  const [orderForProduct, setOrderForProduct] = useState<any | null>(null);
  const [isCartOrder, setIsCartOrder] = useState(false);
  const [orderInitialOptions, setOrderInitialOptions] = useState<{ selectedColor?: string | null; selectedSize?: string | null; quantity?: number | null } | null>(null);

  // Hooks used by the component must be declared before any early returns
  const alertCtx = useAlert();
  const cart = useCart();

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const userId = (session as Session | null)?.user?.id;
        if (!userId) {
          setFollowed([]);
          return;
        }

        // Get owner IDs the user follows
        const { data: follows, error: followsError } = await supabase
          .from('shop_follows')
          .select('shop_owner_id')
          .eq('follower_id', userId);

        if (followsError) {
          console.error('Load shop_follows error', followsError);
          if (mounted) setFollowed([]);
          return;
        }

        const ownerIds = (follows || []).map((r: any) => r.shop_owner_id).filter(Boolean);
        if (ownerIds.length === 0) {
          if (mounted) setFollowed([]);
          return;
        }

        // Load shops whose owner_id is in the followed ownerIds
        const { data: shops, error: shopsError } = await supabase
          .from('shops')
          .select('id, owner_id, name, description, avatar_url, banner_url, is_open')
          .in('owner_id', ownerIds);

        if (shopsError) {
          console.error('Load shops error', shopsError);
          if (mounted) setFollowed([]);
        } else {
          // Also load seller avatars from user_profiles and merge
          const { data: profiles, error: profilesError } = await supabase
            .from('user_profiles')
            .select('id, avatar_url')
            .in('id', ownerIds);

          if (profilesError) {
            console.error('Load user_profiles error', profilesError);
          }

          const profilesById: Record<string, any> = {};
          (profiles || []).forEach((p: any) => { profilesById[p.id] = p; });

          const mapped = (shops || []).map((s: any) => {
            const shopAvatar = s.avatar_url;
            const profileAvatar = profilesById[s.owner_id]?.avatar_url;
            let sellerAvatarUrl: string | null = null;

            if (shopAvatar) {
              sellerAvatarUrl = shopAvatar.startsWith('http')
                ? shopAvatar
                : `${SUPABASE_URL}/storage/v1/object/public/avatars/${shopAvatar}`;
            } else if (profileAvatar) {
              sellerAvatarUrl = profileAvatar.startsWith('http')
                ? profileAvatar
                : `${SUPABASE_URL}/storage/v1/object/public/avatars/${profileAvatar}`;
            } else {
              sellerAvatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(s.name || 'S')}&background=FF9900&color=fff`;
            }

            return {
              ...s,
              sellerAvatar: sellerAvatarUrl,
            };
          });

          if (mounted) setFollowed(mapped);
        }
      } catch (e) {
        console.error(e);
        if (mounted) setFollowed([]);
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => { mounted = false; };
  }, []);

  if (loading) {
    const Root: any = embedded ? View : SafeAreaView;
    return (
      <Root style={[styles.container, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 24 }} />
      </Root>
    );
  }

  const Root: any = embedded ? View : SafeAreaView;

  // Theme and helpers for SellerProfileModal
  const sellerModalTheme = {
    // Full viewer should use opaque background
    background: '#000',
    overlay: 'rgba(0,0,0,0.95)',
    modalOverlay: 'rgba(0,0,0,0.95)',
    modalBackground: colors.modalBg,
    border: colors.border,
    text: colors.text,
    textSecondary: colors.textSecondary,
    textTertiary: colors.textSecondary,
    primary: colors.primary,
    surface: colors.card,
  };

  // Alert theme to ensure alert card/button colors match Home/Search
  const alertTheme = {
    modalOverlay: 'rgba(0,0,0,0.95)',
    modalBackground: '#000', // card background black
    card: '#000',
    border: '#111',
    text: '#fff', // white text
    textSecondary: '#ddd',
    primary: '#FF9900', // orange OK button
    surface: '#000',
  };

  const getCurrentUserId = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return (session as Session | null)?.user?.id || null;
  };

  const getCardDisplayMedia = (urls?: string[] | null) => {
    if (!urls || urls.length === 0) return undefined;
    const arr = urls.map(u => u.startsWith('http') ? u : `${SUPABASE_URL}/storage/v1/object/public/products/${u}`);
    return arr[0];
  };

  const getCardDisplayUrl = (urls?: string[] | null) => getCardDisplayMedia(urls) || 'https://via.placeholder.com/400';

  const scoreAndSortProducts = (products: any[]) => products || [];

  const showAlert = (title: string, message: string, buttons?: any[]) => {
    // Map simple title heuristics to alert types
    const t = String(title || '').toLowerCase();
    let type: any = 'info';
    if (t.includes('success')) type = 'success';
    else if (t.includes('error') || t.includes('sorry')) type = 'error';
    else if (t.includes('already') || t.includes('warning')) type = 'warning';
    alertCtx.showAlert({ title, message, type, theme: alertTheme });
  };

  const openProduct = (product: any, fromSellerProfile: boolean = true) => {
    setSelectedProduct(product || null);
    setProductModalVisible(true);
  };

  const openFullViewer = (mediaUrls: string[] = [], index: number = 0) => {
    setFullViewerMediaUrls(mediaUrls || []);
    setFullViewerIndex(typeof index === 'number' ? index : 0);
  };

  const handleCartAdd = async (p: any, selectedColor?: string, selectedSize?: string, quantity?: number) => {
    try {
      await cart.addToCart(p, selectedColor, selectedSize, quantity);
      showAlert('Success', 'Product added to cart!');
      return;
    } catch (err: any) {
      const msg = (err && (err.message || String(err))) || 'Failed to add product to cart';
      if (String(msg).toLowerCase().includes('already in cart')) {
        // Friendly message, not treated as generic error
        showAlert('Already in Cart', 'This product is already in your cart. You can update the quantity from the cart.');
        return;
      }
      showAlert('Error', msg || 'Failed to add product to cart');
      return;
    }
  };

  // Order modal handlers (state declared above)
  const requireAuth = (action: string = 'continue') => {
    showAlert('Login Required', `Please log in or sign up to ${action}.`, [
      { text: 'Maybe later', style: 'cancel' },
      { text: 'Login / Sign up', onPress: () => router.push('/auth') },
    ]);
  };

  const handlePlaceOrder = async (product: any, options?: { selectedColor?: string | null; selectedSize?: string | null; quantity?: number | null }) => {
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

  const sendOrderNotificationToBuyer = async (orderData: any) => {
    try {
      try {
        const { data: existing, error: fetchErr } = await supabase
          .from('buyer_notifications')
          .select('id')
          .eq('order_id', orderData.order_id)
          .eq('user_id', orderData.user_id)
          .eq('type', 'order_placed')
          .limit(1)
          .single();
        if (!fetchErr && existing) return;
      } catch (e) {
        // ignore
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
      if (error) console.warn('Buyer notification insert error:', error);
    } catch (error) {
      console.warn('Error sending notification to buyer:', error);
    }
  };

  const handleSubmitOrder = async (orderData: any) => {
    try {
      const userId = await getCurrentUserId();
      if (!userId) {
        requireAuth('place an order');
        throw new Error('Please log in to place an order');
      }

      if (!orderData.fullName.trim()) throw new Error('Please enter your full name');
      if (!orderData.phoneNumber.trim()) throw new Error('Please enter your phone number');
      if (!orderData.location.trim()) throw new Error('Please enter your location');

      let phoneNumber = orderData.phoneNumber;
      if (phoneNumber.startsWith('0')) phoneNumber = '+233' + phoneNumber.substring(1);
      else if (!phoneNumber.startsWith('+')) phoneNumber = '+233' + phoneNumber;

      if (!isCartOrder && orderForProduct) {
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

        const { error: itemsError } = await supabase.from('order_items').insert(orderItemData);
        if (itemsError) {
          console.error('Order item insert error:', itemsError);
          await supabase.from('orders').delete().eq('id', order.id);
          throw new Error('Failed to create order item. Please try again.');
        }

        // Update stock if applicable
        if (orderForProduct.category !== 'Services') {
          const { data: productData } = await supabase.from('products').select('*').eq('id', orderForProduct.id).single();
          if (productData) {
            let updateData: any = {};
            if (orderData.selectedSize && productData.sizes_available?.includes(orderData.selectedSize)) {
              const sizeStock = productData.size_stock || {};
              const currentQty = parseInt(sizeStock[orderData.selectedSize] || '0');
              const newQty = Math.max(0, currentQty - quantity);
              updateData.size_stock = { ...sizeStock, [orderData.selectedSize]: newQty.toString() };
            } else if (orderData.selectedColor && productData.colors_available?.includes(orderData.selectedColor)) {
              const colorStock = productData.color_stock || {};
              const currentQty = parseInt(colorStock[orderData.selectedColor] || '0');
              const newQty = Math.max(0, currentQty - quantity);
              updateData.color_stock = { ...colorStock, [orderData.selectedColor]: newQty.toString() };
            } else {
              const currentQty = productData.quantity || 0;
              updateData.quantity = Math.max(0, currentQty - quantity);
            }

            await supabase.from('products').update(updateData).eq('id', orderForProduct.id);
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
          await sendOrderNotificationToBuyer({ user_id: userId, order_id: order.id, total_amount: totalAmount });
        } catch (notifError) {
          console.warn('Buyer notification error:', notifError);
        }

        setOrderFormVisible(false);
        setProductModalVisible(false);
        setSellerProfileVisible(false);

        showAlert(
          'Order Successful!',
          `Your order #${order.id.slice(-8)} has been placed successfully. Quantity: ${quantity} • Total: GHS ${totalAmount.toFixed(2)}\n\nThe seller will contact you shortly.`,
        );
      } else {
        throw new Error('No product selected for order');
      }
    } catch (error: any) {
      console.error('Order submission error:', error);
      showAlert('Order Failed', error.message || 'Failed to submit order. Please try again.');
      throw error;
    }
  };

  return (
    <Root style={[styles.container, { backgroundColor: colors.background }]}> 
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        {embedded ? (
          <View style={styles.headerBack} />
        ) : (
          <TouchableOpacity onPress={() => (onClose ? onClose() : router.back())} style={styles.headerBack}>
            <Ionicons name="arrow-back" size={22} color={colors.text} />
          </TouchableOpacity>
        )}

        <Text style={[styles.title, { color: colors.text }]}>
          Followed Sellers{followed && followed.length ? ` (${followed.length})` : ''}
        </Text>

        {embedded ? (
          <TouchableOpacity onPress={() => (onClose ? onClose() : router.back())} style={styles.headerClose}>
            <Ionicons name="close" size={22} color={colors.text} />
          </TouchableOpacity>
        ) : (
          <View style={styles.headerClose} />
        )}
      </View>

      {followed.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>You&apos;re not following any sellers yet.</Text>
          <TouchableOpacity
            onPress={() => {
              if (onClose) onClose();
              router.replace('/(tabs)');
            }}
            style={[styles.browseButton, { backgroundColor: colors.primary }]}
          > 
            <Text style={{ color: 'white', fontWeight: '700' }}>Browse Sellers</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={{ flex: 1 }}>
          <View style={[styles.searchContainer, { borderColor: colors.border, backgroundColor: colors.card }]}> 
            <TextInput
              placeholder="Search followed sellers"
              placeholderTextColor={colors.textSecondary}
              value={searchQuery}
              onChangeText={setSearchQuery}
              style={[styles.searchInput, { color: colors.text }]}
            />
            {searchQuery ? (
              <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearButton}>
                <Ionicons name="close" size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            ) : null}
          </View>

          <FlatList
            data={followed.filter((f) => (f.name || '').toLowerCase().includes(searchQuery.toLowerCase()))}
          keyExtractor={(item, idx) => item?.id || item?.name || String(idx)}
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 16, flexGrow: 1 }}
          renderItem={({ item }) => (
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}> 
              <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }} onPress={() => { setSelectedSellerId(item.owner_id); setSellerProfileVisible(true); }}>
                {item?.sellerAvatar ? (
                  <Image source={{ uri: item.sellerAvatar }} style={styles.avatar} />
                ) : (
                  <View style={[styles.avatar, { backgroundColor: colors.border, justifyContent: 'center', alignItems: 'center' }]}>
                    <Ionicons name="person-circle" size={28} color={colors.textSecondary} />
                  </View>
                )}
                <Text style={{ color: colors.text, fontWeight: '700' }}>{item?.name || 'Shop'}</Text>
              </TouchableOpacity>

              <View style={{ marginLeft: 12 }}>
                <TouchableOpacity
                  onPress={async () => {
                    // prevent double clicks
                    if (unfollowing.includes(item.owner_id)) return;
                    setUnfollowing((s) => [...s, item.owner_id]);
                    try {
                      const { data: { session } } = await supabase.auth.getSession();
                      const userId = (session as Session | null)?.user?.id;
                      if (!userId) throw new Error('Not authenticated');

                      const { error } = await supabase
                        .from('shop_follows')
                        .delete()
                        .eq('shop_owner_id', item.owner_id)
                        .eq('follower_id', userId);

                      if (error) {
                        console.error('Unfollow error', error);
                      } else {
                        setFollowed((prev) => prev.filter((p) => p.owner_id !== item.owner_id));
                      }
                    } catch (err) {
                      console.error(err);
                    } finally {
                      setUnfollowing((s) => s.filter((id) => id !== item.owner_id));
                    }
                  }}
                  style={[styles.unfollowButton, { borderColor: colors.border }]}
                  disabled={unfollowing.includes(item.owner_id)}
                >
                  {unfollowing.includes(item.owner_id) ? (
                    <ActivityIndicator size="small" color={colors.primary} />
                  ) : (
                    <Text style={[styles.unfollowText, { color: colors.primary }]}>Unfollow</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}
          />
          <FullImageViewer
            isVisible={fullViewerIndex !== -1}
            onClose={() => setFullViewerIndex(-1)}
            mediaUrls={fullViewerMediaUrls}
            initialIndex={fullViewerIndex}
            theme={sellerModalTheme}
            screenWidth={width}
          />
          <OrderFormModal
            isVisible={orderFormVisible}
            onClose={() => setOrderFormVisible(false)}
            product={orderForProduct}
            onSubmitOrder={handleSubmitOrder}
            isCartOrder={isCartOrder}
            cartTotal={0}
            cartItems={[]}
            showAlert={showAlert}
            initialSelectedColor={orderInitialOptions?.selectedColor ?? null}
            initialSelectedSize={orderInitialOptions?.selectedSize ?? null}
            initialQuantity={orderInitialOptions?.quantity ?? null}
            theme={sellerModalTheme}
          />
        </View>
      )}
          <SellerProfileModal
            isVisible={sellerProfileVisible}
            onClose={() => setSellerProfileVisible(false)}
            sellerId={selectedSellerId || ''}
            onOpenProduct={(product: any) => openProduct(product, true)}
            onAddToCart={handleCartAdd}
            onPlaceOrder={handlePlaceOrder}
            showAlert={showAlert}
            theme={sellerModalTheme}
            getCurrentUserId={getCurrentUserId}
            getCardDisplayMedia={getCardDisplayMedia}
            scoreAndSortProducts={scoreAndSortProducts}
          />

          <ProductDetailModal
            isVisible={productModalVisible}
            onClose={() => setProductModalVisible(false)}
            product={selectedProduct}
            onOpenFullViewer={(index: number) => openFullViewer((selectedProduct?.media_urls || []), index)}
            onSelectSimilarProduct={(p: any) => { setSelectedProduct(p); }}
            onAddToCart={handleCartAdd}
            isInCart={() => false}
            cartItems={[]}
            onPlaceOrder={handlePlaceOrder}
            fromCart={false}
            fromSellerProfile={true}
            showAlert={showAlert}
            theme={sellerModalTheme}
            getCurrentUserId={getCurrentUserId}
            getCardDisplayUrl={getCardDisplayUrl}
            formatDeliveryOption={(opt?: string) => opt || 'Not specified'}
            onOpenSellerProfile={(sellerId: string) => { setSelectedSellerId(sellerId); setSellerProfileVisible(true); setProductModalVisible(false); }}
            SimilarProductsSectionComponent={(() => null) as any}
          />
    </Root>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, paddingVertical: 14, borderBottomWidth: 1 },
  headerBack: { width: 44, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 22, fontWeight: '800', textAlign: 'center', flex: 1, letterSpacing: 0.2 },
  headerClose: { width: 44, justifyContent: 'center', alignItems: 'center' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 32 },
  emptyText: { fontSize: 18, marginBottom: 18, textAlign: 'center', lineHeight: 26, maxWidth: '85%', color: '#6b7280' },
  browseButton: { paddingHorizontal: 20, paddingVertical: 12, borderRadius: 14, minWidth: 160, alignItems: 'center', elevation: 3, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 8 },
  card: { padding: 16, borderRadius: 14, borderWidth: 0, marginBottom: 14, elevation: 2, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } },
  avatar: { width: 56, height: 56, borderRadius: 28, marginRight: 14, borderWidth: 0 },
  unfollowButton: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 12, borderWidth: 0, minWidth: 84, alignItems: 'center', justifyContent: 'center' },
  unfollowText: { fontWeight: '800' },
  searchContainer: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 14, borderWidth: 0, margin: 16, elevation: 2, shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 8, backgroundColor: 'transparent' },
  searchInput: { flex: 1, paddingVertical: 8, paddingHorizontal: 12, fontSize: 16 },
  clearButton: { marginLeft: 8, padding: 6 },
});
