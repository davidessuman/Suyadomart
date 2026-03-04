import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  StyleSheet,
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
  seller_id: string;
  display_name: string;
  avatar_url: string;
  university: string;
  hasDiscount: boolean;
  discountPercent: number | null;
  isVideo: boolean;
  category?: string;
  created_at?: string;
  commentCount?: number;
  likeCount?: number;
  shareCount?: number;
  followerCount?: number;
  isLiked?: boolean;
  isFollowed?: boolean;
  inCart?: boolean;
  isFromSameSeller?: boolean;
  similarityScore?: number;
}

interface CartItem {
  product: Product;
  quantity: number;
}

type SimilarProductsSectionProps = {
  product: Product;
  onProductSelect: (product: Product) => void;
  onAddToCart: (product: Product) => Promise<void>;
  cartItems?: CartItem[];
  showAlert: (title: string, message: string, buttons?: any[]) => void;
  theme: any;
};

const isVideoUrl = (url: string): boolean => {
  if (!url) return false;
  const lowerUrl = url.toLowerCase();
  return (
    lowerUrl.includes('.mp4') ||
    lowerUrl.includes('.mov') ||
    lowerUrl.includes('.avi') ||
    lowerUrl.includes('.webm') ||
    lowerUrl.includes('.wmv')
  );
};

const getCardDisplayMedia = (urls?: string[] | null): string | undefined => {
  const arr = (urls || []).map((u) =>
    u.startsWith('http') ? u : `${SUPABASE_URL}/storage/v1/object/public/products/${u}`,
  );
  if (!arr || arr.length === 0) return undefined;

  if (isVideoUrl(arr[0])) {
    if (arr.length > 1) {
      return arr[1];
    }
    const imageUrl = arr.find((url) => !isVideoUrl(url));
    return imageUrl || arr[0];
  }

  return arr[0];
};

const getCurrentUserId = async () => {
  const { data } = await supabase.auth.getUser();
  return data?.user?.id ?? null;
};

const extractKeywords = (title: string): string[] => {
  const commonWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by']);
  return title
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter((word) => word.length > 2 && !commonWords.has(word))
    .slice(0, 5);
};

const SimilarProductsSection: React.FC<SimilarProductsSectionProps> = ({
  product,
  onProductSelect,
  onAddToCart,
  cartItems = [],
  showAlert,
  theme,
}) => {
  const router = useRouter();
  const [similarProducts, setSimilarProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

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

  const fetchSimilarProducts = useCallback(async () => {
    console.log('Fetching similar products for:', product.id, product.title);
    setLoading(true);
    setSimilarProducts([]);

    try {
      const { data: currentProduct, error: productError } = await supabase
        .from('products')
        .select('category, title, description')
        .eq('id', product.id)
        .single();

      if (productError) {
        console.error('Error fetching current product:', productError);
        setLoading(false);
        return;
      }

      if (!currentProduct) {
        console.log('Current product not found');
        setLoading(false);
        return;
      }

      const currentCategory = currentProduct.category;
      const currentTitle = currentProduct.title;

      console.log('Current product category:', currentCategory);
      console.log('Current product title:', currentTitle);

      const keywords = extractKeywords(currentTitle);
      console.log('Extracted keywords:', keywords);

      if (!currentCategory && keywords.length === 0) {
        console.log('No category or keywords to find similar products');
        setLoading(false);
        return;
      }

      const conditions = [];

      if (currentCategory) {
        conditions.push(`category.eq.${currentCategory}`);
      }

      if (keywords.length > 0) {
        const titleConditions = keywords.map((keyword) => `title.ilike.%${keyword}%`);
        conditions.push(`or(${titleConditions.join(',')})`);
      }

      if (conditions.length === 0) {
        console.log('No conditions for similar products');
        setLoading(false);
        return;
      }

      let filterString = '';
      if (conditions.length === 1) {
        filterString = conditions[0];
      } else {
        filterString = `or(${conditions.join(',')})`;
      }

      console.log('Filter string:', filterString);

      const { data: similarProductsData, error: similarError } = await supabase
        .from('products')
        .select('id, title, description, price, original_price, quantity, media_urls, seller_id, category, created_at')
        .neq('id', product.id)
        .or(filterString)
        .limit(12)
        .order('created_at', { ascending: false });

      if (similarError) {
        console.error('Error fetching similar products:', similarError);
        setLoading(false);
        return;
      }

      console.log('Raw similar products found:', similarProductsData?.length || 0);

      if (!similarProductsData || similarProductsData.length === 0) {
        console.log('No similar products found');
        setLoading(false);
        return;
      }

      const filteredSimilarProducts = similarProductsData.filter((productItem) => {
        const sameCategory = currentCategory && productItem.category === currentCategory;

        let similarTitle = false;
        if (keywords.length > 0) {
          const productTitleLower = productItem.title.toLowerCase();
          similarTitle = keywords.some((keyword) => productTitleLower.includes(keyword.toLowerCase()));
        }

        return sameCategory || similarTitle;
      });

      console.log('Filtered similar products:', filteredSimilarProducts.length);

      if (filteredSimilarProducts.length === 0) {
        console.log('No products match the similarity criteria');
        setLoading(false);
        return;
      }

      const uniqueProductsMap = new Map();
      filteredSimilarProducts.forEach((productItem) => {
        if (!uniqueProductsMap.has(productItem.id)) {
          uniqueProductsMap.set(productItem.id, productItem);
        }
      });

      const uniqueProducts: any[] = Array.from(uniqueProductsMap.values());
      const sellerIds = [...new Set(uniqueProducts.map((p) => p.seller_id))];

      console.log('Fetching seller info for:', sellerIds.length, 'sellers');

      const [{ data: shopsData }, { data: profilesData }] = await Promise.all([
        supabase.from('shops').select('owner_id, name, avatar_url').in('owner_id', sellerIds),
        supabase.from('user_profiles').select('id, full_name, avatar_url, university').in('id', sellerIds),
      ]);

      const shops = shopsData || [];
      const profiles = profilesData || [];

      const enriched: (Product & { isFromSameSeller?: boolean; similarityScore: number })[] = uniqueProducts.map((productItem) => {
        const shop = shops.find((s: any) => s.owner_id === productItem.seller_id);
        const profile = profiles.find((pr: any) => pr.id === productItem.seller_id);

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

        const isFromSameSeller = productItem.seller_id === product.seller_id;
        let similarityScore = 0;

        if (currentCategory && productItem.category === currentCategory) {
          similarityScore += 2;
        }

        if (isFromSameSeller) {
          similarityScore += 1.5;
        }

        if (keywords.length > 0) {
          const productTitleLower = productItem.title.toLowerCase();
          const keywordMatches = keywords.filter((keyword) => productTitleLower.includes(keyword.toLowerCase())).length;
          similarityScore += (keywordMatches / keywords.length) * 1.0;
        }

        const daysOld =
          (Date.now() - new Date(productItem.created_at).getTime()) / (1000 * 60 * 60 * 24);
        similarityScore += Math.max(0, 1 - daysOld / 30) * 0.5;

        return {
          ...productItem,
          display_name: (shop as any)?.name || profile?.full_name || 'Seller',
          avatar_url: avatarUrl,
          university: profile?.university || 'Campus',
          hasDiscount: productItem.original_price && productItem.original_price > productItem.price,
          discountPercent:
            productItem.original_price && productItem.original_price > productItem.price
              ? Math.round(((productItem.original_price - productItem.price) / productItem.original_price) * 100)
              : null,
          isVideo: productItem.media_urls?.[0]?.toLowerCase().includes('.mp4'),
          commentCount: 0,
          likeCount: 0,
          shareCount: 0,
          followerCount: 0,
          isLiked: false,
          isFollowed: false,
          inCart: false,
          isFromSameSeller,
          similarityScore,
        };
      });

      enriched.sort((a, b) => b.similarityScore - a.similarityScore);
      const topProducts = enriched.slice(0, 8);

      console.log('Setting similar products:', topProducts.length);
      console.log(
        'Similarity scores:',
        topProducts.map((p) => ({
          title: p.title.substring(0, 30),
          category: p.category,
          sameSeller: p.isFromSameSeller,
          score: p.similarityScore?.toFixed(2),
        })),
      );

      setSimilarProducts(topProducts);
    } catch (err) {
      console.error('Error fetching similar products:', err);
      setSimilarProducts([]);
    } finally {
      setLoading(false);
    }
  }, [product.id, product.seller_id, product.title]);

  useEffect(() => {
    const fetchData = async () => {
      await fetchSimilarProducts();
    };

    fetchData();
  }, [product.id, fetchSimilarProducts]);

  const handleAddToCart = async (productItem: Product) => {
    const userId = await getCurrentUserId();
    if (!userId) {
      requireAuth('add items to your cart');
      return;
    }

    try {
      await onAddToCart(productItem);
      showAlert('Success', 'Product added to cart!');
    } catch (error: any) {
      if (error.message === 'Product is already in cart') {
        showAlert('Already in Cart', 'This product is already in your cart. You can update the quantity from the cart.');
      } else {
        showAlert('Sorry', 'Product is already in cart');
      }
    }
  };

  if (loading) {
    return (
      <View style={[styles.similarContainer, { borderTopColor: theme.border }]}>
        <Text style={[styles.similarTitle, { color: theme.text }]}>Similar Products</Text>
        <View style={styles.similarLoadingContainer}>
          <ActivityIndicator size="small" color={theme.primary} />
          <Text style={[styles.similarLoadingText, { color: theme.textSecondary }]}>Finding similar products...</Text>
        </View>
      </View>
    );
  }

  if (similarProducts.length === 0) {
    return null;
  }

  return (
    <View style={[styles.similarContainer, { borderTopColor: theme.border }]}>
      <Text style={[styles.similarTitle, { color: theme.text }]}> Other Products you might like </Text>
      <FlatList
        data={similarProducts}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.similarListContent}
        keyExtractor={(item) => `similar-${item.id}`}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[
              styles.similarProductCard,
              {
                backgroundColor: theme.surface,
                borderColor: theme.border,
                borderLeftWidth: item.isFromSameSeller ? 3 : 0,
                borderLeftColor: item.isFromSameSeller ? theme.primary : 'transparent',
              },
            ]}
            onPress={() => onProductSelect(item)}
          >
            {getCardDisplayMedia(item.media_urls) ? (
              <Image source={{ uri: getCardDisplayMedia(item.media_urls) }} style={styles.similarProductImage} resizeMode="cover" />
            ) : (
              <View style={[styles.similarProductImage, styles.similarProductPlaceholder, { backgroundColor: theme.card }]}>
                <Ionicons name="image-outline" size={30} color={theme.textTertiary} />
              </View>
            )}

            {item.isVideo && (
              <View style={styles.similarVideoIcon}>
                <Ionicons name="play" size={16} color="#fff" />
              </View>
            )}

            {item.isFromSameSeller && (
              <View style={[styles.sameSellerBadge, { backgroundColor: theme.primary }]}>
                <Text style={styles.sameSellerBadgeText}>Same seller</Text>
              </View>
            )}

            <View style={styles.similarProductInfo}>
              <Text style={[styles.similarProductTitle, { color: theme.text }]} numberOfLines={2}>
                {item.title}
              </Text>
              <View style={styles.similarPriceRow}>
                <Text style={[styles.similarPrice, { color: theme.primary }]}>
                  <Text style={[styles.similarCurrency, { color: theme.primary }]}>GHS</Text> {Number(item.price).toFixed(2)}
                </Text>
                {item.hasDiscount && (
                  <>
                    <Text style={[styles.similarOldPrice, { color: theme.textTertiary }]}>GHS {Number(item.original_price).toFixed(2)}</Text>
                    <View style={styles.similarDiscountBadge}>
                      <Text style={styles.similarDiscountText}>-{item.discountPercent}%</Text>
                    </View>
                  </>
                )}
              </View>
              <View style={styles.similarSellerRow}>
                <Image
                  source={{ uri: item.avatar_url }}
                  style={[styles.similarSellerAvatar, { borderColor: item.isFromSameSeller ? theme.primary : theme.border }]}
                />
                <View style={styles.similarSellerInfo}>
                  <Text style={[styles.similarSellerName, { color: theme.textSecondary }]} numberOfLines={1}>
                    {item.display_name}
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                style={[
                  styles.similarAddToCartButton,
                  {
                    backgroundColor: (() => {
                      const isInCart = cartItems.some((cartItem) => cartItem.product.id === item.id);
                      return isInCart ? theme.textTertiary : theme.primary;
                    })(),
                  },
                ]}
                onPress={(e) => {
                  e.stopPropagation();
                  const isInCart = cartItems.some((cartItem) => cartItem.product.id === item.id);
                  if (!isInCart) {
                    handleAddToCart(item);
                  } else {
                    showAlert('Already in Cart', 'This product is already in your cart.');
                  }
                }}
                disabled={cartItems.some((cartItem) => cartItem.product.id === item.id)}
              >
                <Ionicons
                  name={cartItems.some((cartItem) => cartItem.product.id === item.id) ? 'checkmark-circle' : 'cart-outline'}
                  size={16}
                  color="#fff"
                />
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  similarContainer: { marginTop: 25, paddingTop: 20, borderTopWidth: 1 },
  similarTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15, marginLeft: 5 },
  similarLoadingContainer: { height: 200, justifyContent: 'center', alignItems: 'center' },
  similarLoadingText: { fontSize: 14, marginTop: 10 },
  similarListContent: { paddingHorizontal: 5, paddingBottom: 10 },
  similarProductCard: { width: 160, borderRadius: 12, marginRight: 12, overflow: 'hidden', borderWidth: 1 },
  similarProductImage: { width: '100%', height: 140 },
  similarProductPlaceholder: { justifyContent: 'center', alignItems: 'center' },
  similarVideoIcon: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
    padding: 5,
    borderRadius: 15,
  },
  similarProductInfo: { padding: 10, position: 'relative' },
  similarProductTitle: { fontSize: 13, fontWeight: '600', marginBottom: 8, height: 36 },
  similarPriceRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  similarCurrency: { fontSize: 10, fontWeight: '600' },
  similarPrice: { fontSize: 16, fontWeight: 'bold' },
  similarOldPrice: { fontSize: 11, textDecorationLine: 'line-through', marginLeft: 6 },
  similarDiscountBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 10, marginLeft: 6 },
  similarDiscountText: { color: '#f19603ff', fontSize: 10, fontWeight: 'bold' },
  similarSellerRow: { flexDirection: 'row', alignItems: 'center', marginTop: 5 },
  similarSellerAvatar: { width: 22, height: 22, borderRadius: 11, marginRight: 6, borderWidth: 1 },
  similarSellerInfo: { flex: 1, marginLeft: 6 },
  similarSellerName: { fontSize: 11, flex: 1 },
  similarAddToCartButton: { position: 'absolute', bottom: 10, right: 10, padding: 6, borderRadius: 15 },
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
});

export default SimilarProductsSection;