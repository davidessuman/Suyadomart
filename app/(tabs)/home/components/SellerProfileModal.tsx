import React, { useEffect, useState } from 'react';
import {
  Modal,
  View,
  TouchableOpacity,
  Text,
  Image,
  FlatList,
  ActivityIndicator,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';

const SUPABASE_URL = 'https://qwujadyqebfypyhfuwfl.supabase.co';

interface Product {
  id: string;
  title: string;
  description?: string;
  price: number;
  original_price: number | null;
  quantity?: number;
  media_urls: string[];
  seller_id?: string;
  display_name?: string;
  avatar_url?: string;
  university?: string;
  hasDiscount?: boolean;
  discountPercent?: number | null;
  isVideo?: boolean;
  score?: number;
}

type SellerProfileModalProps = {
  isVisible: boolean;
  onClose: () => void;
  sellerId: string;
  onOpenProduct: (product: any) => void;
  onAddToCart: (product: any) => Promise<void>;
  onPlaceOrder: (product: any, options?: { selectedColor?: string | null; selectedSize?: string | null; quantity?: number | null }) => void;
  showAlert: (title: string, message: string, buttons?: any[]) => void;
  theme: any;
  getCurrentUserId: () => Promise<string | null>;
  getCardDisplayMedia: (urls?: string[] | null) => string | undefined;
  scoreAndSortProducts: (products: any[]) => Product[];
};

const SellerProfileModal: React.FC<SellerProfileModalProps> = ({
  isVisible,
  onClose,
  sellerId,
  onOpenProduct,
  onAddToCart,
  onPlaceOrder,
  showAlert,
  theme, getCurrentUserId,
  getCardDisplayMedia,
  scoreAndSortProducts,
}) => {
  const router = useRouter();
  const { width, height } = useWindowDimensions();
  const isLargeScreen = width >= 768;
  const modalWidth = isLargeScreen ? Math.min(width * 0.8, 800) : '100%';
  const modalHeight = isLargeScreen ? Math.min(height * 0.9, 900) : '97%';
  const contentWidth = isLargeScreen ? Math.min(width * 0.8, 800) : width;
  const HORIZONTAL_PADDING = 16;
  const GAP = 12;
  const NUM_COLUMNS = contentWidth >= 1000 ? 4 : contentWidth >= 720 ? 3 : 2;
  const ITEM_WIDTH = (contentWidth - HORIZONTAL_PADDING * 2 - GAP * (NUM_COLUMNS - 1)) / NUM_COLUMNS;
  const [seller, setSeller] = useState<any>({
    display_name: '',
    avatar_url: '',
    university: '',
    totalFollowers: 0,
    totalProducts: 0,
    totalLikes: 0,
  });
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [profilePhotoVisible, setProfilePhotoVisible] = useState(false);

  const requireAuth = (action: string = 'continue') => {
    showAlert('Login Required', `Please log in or sign up to ${action}.`, [
      { text: 'Maybe later', style: 'cancel' },
      { text: 'Login / Sign up', onPress: () => router.push('/auth') },
    ]);
  };

  useEffect(() => {
    if (!isVisible || !sellerId) return;
    const fetchData = async () => {
      try {
        const { data: shop } = (await supabase
          .from('shops')
          .select('name, avatar_url')
          .eq('owner_id', sellerId)
          .single()) as { data: { name?: string; avatar_url?: string } | null };
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('full_name, avatar_url, university')
          .eq('id', sellerId)
          .single();
        const { data: rawProducts } = await supabase
          .from('products')
          .select('id, title, description, price, original_price, quantity, media_urls')
          .eq('seller_id', sellerId)
          .order('created_at', { ascending: false });

        const { count: totalFollowers } = await supabase
          .from('shop_follows')
          .select('*', { count: 'exact', head: true })
          .eq('shop_owner_id', sellerId);

        let totalLikes = 0;
        if (rawProducts && rawProducts.length > 0) {
          const productIds = rawProducts.map((p) => p.id);
          const { count: likeCount } = await supabase
            .from('product_likes')
            .select('*', { count: 'exact', head: true })
            .in('product_id', productIds);
          totalLikes = likeCount || 0;
        }

        const scored = scoreAndSortProducts(rawProducts || []);
        const enriched = scored.map((p) => {
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
            avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(shop?.name || profile?.full_name || 'S')}&background=FF9900&color=fff`;
          }
          return {
            ...p,
            display_name: shop?.name || profile?.full_name || 'Seller',
            avatar_url: avatarUrl,
            university: profile?.university || 'Campus',
            hasDiscount: p.original_price && p.original_price > p.price,
            discountPercent:
              p.original_price && p.original_price > p.price
                ? Math.round(((p.original_price - p.price) / p.original_price) * 100)
                : null,
            isVideo: p.media_urls?.[0]?.toLowerCase().includes('.mp4'),
          } as Product;
        });
        let sellerAvatarUrl;
        if (shop?.avatar_url) {
          sellerAvatarUrl = shop.avatar_url.startsWith('http')
            ? shop.avatar_url
            : `${SUPABASE_URL}/storage/v1/object/public/avatars/${shop.avatar_url}`;
        } else if (profile?.avatar_url) {
          sellerAvatarUrl = profile.avatar_url.startsWith('http')
            ? profile.avatar_url
            : `${SUPABASE_URL}/storage/v1/object/public/avatars/${profile.avatar_url}`;
        } else {
          sellerAvatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(shop?.name || profile?.full_name || 'S')}&background=FF9900&color=fff`;
        }
        setSeller({
          display_name: shop?.name || profile?.full_name || 'Seller',
          avatar_url: sellerAvatarUrl,
          university: profile && !Array.isArray(profile) ? profile.university : 'Campus',
          totalFollowers: totalFollowers || 0,
          totalProducts: enriched.length || 0,
          totalLikes: totalLikes || 0,
        });
        setProducts(enriched);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [isVisible, sellerId, scoreAndSortProducts]);

  const handleAddToCart = async (product: Product) => {
    const userId = await getCurrentUserId();
    if (!userId) {
      requireAuth('add items to your cart');
      return;
    }

    try {
      await onAddToCart(product);
      showAlert('Success', 'Product added to cart!');
    } catch {
      showAlert('Sorry', 'Product is already in cart');
    }
  };

  if (!isVisible) return null;

  return (
    <Modal animationType="slide" transparent={true} visible={isVisible} onRequestClose={onClose}>
      <View
        style={[
          styles.sellerProfileOverlay,
          {
            backgroundColor: theme.modalOverlay,
            justifyContent: isLargeScreen ? 'center' : 'flex-end',
            alignItems: 'center',
          },
        ]}
      >
        <View
          style={[
            styles.sellerProfileModal,
            {
              backgroundColor: theme.modalBackground,
              width: modalWidth,
              maxWidth: 800,
              height: modalHeight,
              borderRadius: isLargeScreen ? 20 : undefined,
              borderTopLeftRadius: isLargeScreen ? 20 : 20,
              borderTopRightRadius: isLargeScreen ? 20 : 20,
              alignSelf: 'center',
              marginHorizontal: 'auto',
              left: 0,
              right: 0,
              marginLeft: 'auto',
              marginRight: 'auto',
            },
          ]}
        >
          <View style={[styles.sellerProfileHeader, { borderBottomColor: theme.border }]}>
            <TouchableOpacity onPress={onClose} style={styles.sellerProfileCloseButton}>
              <Ionicons name="close" size={24} color={theme.text} />
            </TouchableOpacity>
            <Text style={[styles.sellerProfileTitle, { color: theme.text }]}>Seller Profile</Text>
            <View style={{ width: 34 }} />
          </View>
          {loading ? (
            <View style={styles.sellerProfileLoading}>
              <ActivityIndicator size="large" color={theme.primary} />
              <Text style={[styles.sellerProfileLoadingText, { color: theme.text }]}>Loading seller information...</Text>
            </View>
          ) : (
            <View style={styles.sellerProfileContainer}>
              <View style={[styles.sellerInfoSection, { backgroundColor: theme.surface, borderBottomColor: theme.border }, isLargeScreen && styles.sellerInfoSectionLarge]}> 
                <View style={[styles.sellerIdentityBlock, isLargeScreen && styles.sellerIdentityBlockLarge]}>
                  <TouchableOpacity onPress={() => setProfilePhotoVisible(true)}>
                    <Image source={{ uri: seller.avatar_url }} style={[styles.sellerProfileAvatar, { borderColor: theme.primary }]} />
                  </TouchableOpacity>
                  <View style={[styles.sellerIdentityText, isLargeScreen && styles.sellerIdentityTextLarge]}>
                    <Text style={[styles.sellerProfileName, { color: theme.text }]} numberOfLines={1}>{seller.display_name}</Text>
                    <Text style={[styles.sellerProfileUniversity, { color: theme.textTertiary }]} numberOfLines={1}>{seller.university}</Text>
                  </View>
                </View>

                <View style={[styles.sellerStatsContainer, { borderColor: theme.border }, isLargeScreen && styles.sellerStatsContainerLarge]}> 
                  <View style={styles.sellerStatItem}>
                    <Ionicons name="people-outline" size={14} color={theme.primary} />
                    <Text style={[styles.sellerStatNumber, { color: theme.primary }]}>{seller.totalFollowers}</Text>
                    <Text style={[styles.sellerStatLabel, { color: theme.textSecondary }]}>Followers</Text>
                  </View>
                  <View style={[styles.sellerStatDivider, { backgroundColor: theme.border }]} />
                  <View style={styles.sellerStatItem}>
                    <Ionicons name="cube-outline" size={14} color={theme.primary} />
                    <Text style={[styles.sellerStatNumber, { color: theme.primary }]}>{seller.totalProducts}</Text>
                    <Text style={[styles.sellerStatLabel, { color: theme.textSecondary }]}>Products</Text>
                  </View>
                  <View style={[styles.sellerStatDivider, { backgroundColor: theme.border }]} />
                  <View style={styles.sellerStatItem}>
                    <Ionicons name="heart-outline" size={14} color={theme.primary} />
                    <Text style={[styles.sellerStatNumber, { color: theme.primary }]}>{seller.totalLikes}</Text>
                    <Text style={[styles.sellerStatLabel, { color: theme.textSecondary }]}>Likes</Text>
                  </View>
                </View>
              </View>

              {products.length === 0 ? (
                <View style={styles.sellerEmptyProducts}>
                  <Ionicons name="grid-outline" size={60} color={theme.textTertiary} />
                  <Text style={[styles.sellerEmptyProductsText, { color: theme.text }]}>No products yet</Text>
                  <Text style={[styles.sellerEmptyProductsSubtext, { color: theme.textSecondary }]}>This seller hasn&apos;t listed any products</Text>
                </View>
              ) : (
                <FlatList
                  key={`seller-products-${NUM_COLUMNS}`}
                  data={products}
                  numColumns={NUM_COLUMNS}
                  keyExtractor={(item) => item.id}
                  contentContainerStyle={styles.sellerProductsGrid}
                  columnWrapperStyle={styles.sellerProductsRow}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={[styles.sellerProductCard, { width: ITEM_WIDTH, backgroundColor: theme.surface, borderColor: theme.border }]}
                      activeOpacity={0.85}
                      onPress={() => onOpenProduct(item)}
                    >
                      <View style={[styles.sellerImageContainer, { backgroundColor: theme.background }]}>
                        <Image
                          source={{ uri: getCardDisplayMedia(item.media_urls) || 'https://via.placeholder.com/400' }}
                          style={styles.sellerProductCardImage}
                          resizeMode="cover"
                        />
                        {item.hasDiscount && item.discountPercent ? (
                          <View style={[styles.sellerDiscountBadge, { backgroundColor: theme.primary }]}>
                            <Text style={styles.sellerDiscountText}>-{item.discountPercent}%</Text>
                          </View>
                        ) : null}
                        {item.isVideo ? (
                          <View style={styles.sellerVideoIcon}>
                            <Ionicons name="play" size={12} color="#fff" />
                          </View>
                        ) : null}
                      </View>
                      <View style={styles.sellerProductInfo}>
                        <Text style={[styles.sellerProductTitle, { color: theme.text }]} numberOfLines={2}>
                          {item.title}
                        </Text>

                        <View style={styles.sellerPriceContainer}>
                          <Text style={[styles.sellerCurrentPrice, { color: theme.primary }]}>GHS {item.price.toFixed(2)}</Text>
                          {item.original_price && item.original_price > item.price ? (
                            <Text style={[styles.sellerOriginalPrice, { color: theme.textTertiary }]}>GHS {item.original_price.toFixed(2)}</Text>
                          ) : null}
                        </View>

                        <View style={styles.sellerMetaRow}>
                          <Image
                            source={{ uri: item.avatar_url || seller.avatar_url || 'https://ui-avatars.com/api/?name=Seller&background=FF9900&color=fff' }}
                            style={styles.sellerMetaAvatar}
                          />
                          <Text style={[styles.sellerMetaName, { color: theme.textSecondary }]} numberOfLines={1}>
                            {item.display_name || seller.display_name}
                          </Text>
                        </View>

                        <View style={styles.sellerProductGridActions}>
                          <TouchableOpacity
                            style={[styles.sellerProductGridCartButton, { backgroundColor: theme.primary }]}
                            onPress={(e) => {
                              e.stopPropagation();
                              handleAddToCart(item);
                            }}
                          >
                            <Ionicons name="cart-outline" size={16} color="#fff" />
                            <Text style={styles.sellerActionButtonText}>Cart</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[styles.sellerProductGridOrderButton, { backgroundColor: '#FF4081' }]}
                            onPress={(e) => {
                              e.stopPropagation();
                              onPlaceOrder(item);
                            }}
                          >
                            <Ionicons name="bag-check" size={16} color="#fff" />
                            <Text style={styles.sellerActionButtonText}>Order</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    </TouchableOpacity>
                  )}
                />
              )}
            </View>
          )}
        </View>
      </View>

      <Modal animationType="fade" transparent={true} visible={profilePhotoVisible} onRequestClose={() => setProfilePhotoVisible(false)}>
        <View style={[styles.profilePhotoOverlay, { backgroundColor: 'rgba(0,0,0,0.9)' }]}>
          <TouchableOpacity
            style={styles.profilePhotoCloseButton}
            onPress={() => setProfilePhotoVisible(false)}
            activeOpacity={0.9}
          >
            <Ionicons name="close" size={22} color="#fff" />
            <Text style={styles.profilePhotoCloseText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={() => setProfilePhotoVisible(false)}>
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
              <Image source={{ uri: seller.avatar_url }} style={{ width: 300, height: 300, borderRadius: 20 }} resizeMode="cover" />
            </View>
          </TouchableOpacity>
        </View>
      </Modal>
    </Modal>
  );
};

export default SellerProfileModal;

const styles = StyleSheet.create({
  sellerProfileOverlay: { flex: 1, justifyContent: 'flex-end' },

  sellerProfileModal: { borderTopLeftRadius: 20, borderTopRightRadius: 20, height: '97%' },

  sellerProfileHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1 },

  sellerProfileCloseButton: { padding: 5 },

  sellerProfileTitle: { fontSize: 16, fontWeight: '700' },

  sellerProfileLoading: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  sellerProfileLoadingText: { marginTop: 10, fontSize: 16 },

  sellerProfileContainer: { flex: 1 },

  sellerInfoSection: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    gap: 10,
  },

  sellerInfoSectionLarge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 14,
    paddingHorizontal: 16,
  },

  sellerIdentityBlock: {
    alignItems: 'center',
    justifyContent: 'center',
  },

  sellerIdentityBlockLarge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },

  sellerIdentityText: {
    alignItems: 'center',
  },

  sellerIdentityTextLarge: {
    alignItems: 'flex-start',
    minWidth: 0,
    flexShrink: 1,
  },

  sellerProfileAvatar: { width: 72, height: 72, borderRadius: 36, borderWidth: 2, marginBottom: 6 },

  sellerProfileName: { fontSize: 18, fontWeight: '700', marginBottom: 2, textAlign: 'center' },

  sellerProfileUniversity: { fontSize: 13, textAlign: 'center' },

  sellerStatsContainer: {
    flexDirection: 'row',
    alignItems: 'stretch',
    justifyContent: 'space-between',
    width: '100%',
    borderWidth: 1,
    borderRadius: 10,
    overflow: 'hidden',
  },

  sellerStatsContainerLarge: {
    width: 360,
    maxWidth: '52%',
    minWidth: 280,
    flexShrink: 0,
    alignSelf: 'center',
  },

  sellerStatItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    gap: 2,
  },

  sellerStatDivider: {
    width: 1,
  },

  sellerStatNumber: { fontSize: 16, fontWeight: '700' },

  sellerStatLabel: { fontSize: 12, marginTop: 2 },

  sellerEmptyProducts: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },

  sellerEmptyProductsText: { fontSize: 18, marginTop: 20 },

  sellerEmptyProductsSubtext: { fontSize: 14, marginTop: 10, textAlign: 'center' },

  sellerProductsGrid: { paddingHorizontal: 16, paddingVertical: 14, paddingBottom: 24 },

  sellerProductsRow: { justifyContent: 'flex-start', gap: 12 },

  sellerProductCard: {
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 14,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    borderWidth: 1,
  },

  sellerImageContainer: {
    position: 'relative',
    width: '100%',
    aspectRatio: 1.1,
  },

  sellerProductCardImage: { width: '100%', height: '100%' },

  sellerDiscountBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 8,
    minWidth: 40,
  },

  sellerDiscountText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: 'bold',
    textAlign: 'center',
  },

  sellerVideoIcon: { position: 'absolute', top: 10, right: 10, backgroundColor: 'rgba(0,0,0,0.6)', padding: 6, borderRadius: 20 },

  sellerProductInfo: { padding: 10 },

  sellerProductTitle: { fontSize: 14, fontWeight: '700', lineHeight: 18, marginBottom: 8, minHeight: 36 },

  sellerPriceContainer: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 8, flexWrap: 'wrap' },

  sellerCurrentPrice: { fontSize: 17, fontWeight: 'bold', marginRight: 8 },

  sellerOriginalPrice: { fontSize: 12, textDecorationLine: 'line-through' },

  sellerMetaRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },

  sellerMetaAvatar: { width: 20, height: 20, borderRadius: 10, marginRight: 6 },

  sellerMetaName: { fontSize: 12, flex: 1 },

  sellerProductGridActions: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4, gap: 8 },

  sellerProductGridCartButton: { paddingVertical: 8, borderRadius: 10, flex: 1, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 4 },

  sellerProductGridOrderButton: { paddingVertical: 8, borderRadius: 10, flex: 1, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 4 },

  sellerActionButtonText: { color: '#fff', fontSize: 12, fontWeight: '700' },

  profilePhotoOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  profilePhotoCloseButton: {
    position: 'absolute',
    top: 55,
    right: 20,
    zIndex: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 18,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },

  profilePhotoCloseText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  // Availability Badge on feed
});
