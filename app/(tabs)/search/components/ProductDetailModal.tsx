import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  ScrollView,
  Image,
  FlatList,
  useWindowDimensions,
  useColorScheme,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ProductReviewsSection } from '@/components/ProductReviewsSection';
import { supabase } from '@/lib/supabase';
import ProductMediaView from './ProductMediaView';

const PRIMARY_COLOR = '#F68B1E';
const LIGHT_BACKGROUND = '#FFFFFF';
const DARK_BACKGROUND = '#121212';
const LIGHT_TEXT = '#333333';
const DARK_TEXT = '#FFFFFF';
const SUPABASE_URL = 'https://qwujadyqebfypyhfuwfl.supabase.co';

const EnhancedSimilarProductsSection: React.FC<{
  product: any;
  onProductSelect: (product: any) => void;
  onAddToCart: (product: any) => Promise<any>;
  extractKeywords: (title: string) => string[];
  getCurrentUserUniversity: () => Promise<any>;
  getCurrentUserId: () => Promise<string | null>;
  getCardDisplayMedia: (mediaUrls: string[] | undefined) => string | undefined;
  isInCart: (productId: string, selectedColor?: string, selectedSize?: string) => boolean;
  showAlert: (title: string, message: string, buttons?: any[]) => void;
  onRequireAuth: (action?: string) => void;
  styles: any;
}> = ({ product, onProductSelect, onAddToCart, extractKeywords, getCurrentUserUniversity, getCurrentUserId, getCardDisplayMedia, isInCart, showAlert, onRequireAuth, styles }) => {
  const [similarProducts, setSimilarProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const colorScheme = useColorScheme();

  useEffect(() => {
    fetchEnhancedSimilarProducts();
  }, [product.id]);

  const fetchEnhancedSimilarProducts = async () => {
    setLoading(true);
    setSimilarProducts([]);

    try {
      const { data: currentProduct, error: productError } = await supabase
        .from('products')
        .select('category, title, description')
        .eq('id', product.id)
        .single();

      if (productError || !currentProduct) {
        setLoading(false);
        return;
      }

      const currentCategory = currentProduct.category;
      const currentTitle = currentProduct.title;
      const keywords = extractKeywords(currentTitle);

      if (!currentCategory && keywords.length === 0) {
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
        setLoading(false);
        return;
      }

      const filterString = conditions.length === 1 ? conditions[0] : `or(${conditions.join(',')})`;

      const { data: similarProductsData, error } = await supabase
        .from('products')
        .select('id, title, description, price, original_price, quantity, media_urls, seller_id, category, created_at')
        .neq('id', product.id)
        .or(filterString)
        .limit(12)
        .order('created_at', { ascending: false })
;

      if (error) throw error;

      if (!similarProductsData || similarProductsData.length === 0) {
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

      if (filteredSimilarProducts.length === 0) {
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

      const [{ data: shopsData }, { data: profilesData }] = await Promise.all([
        supabase.from('shops').select('owner_id, name, avatar_url').in('owner_id', sellerIds),
        supabase.from('user_profiles').select('id, full_name, avatar_url, university').in('id', sellerIds),
      ]);

      const shops = shopsData || [];
      const profiles = profilesData || [];

      const enriched: any[] = uniqueProducts.map((productItem) => {
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
          isFromSameSeller,
          similarityScore,
        };
      });

      enriched.sort((a, b) => b.similarityScore - a.similarityScore);
      const topProducts = enriched.slice(0, 8);
      setSimilarProducts(topProducts);
    } catch (err) {
      console.error('Error fetching enhanced similar products:', err);
      setSimilarProducts([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = async (productItem: any) => {
    const userId = await getCurrentUserId();
    if (!userId) {
      showAlert(
        'Login Required',
        'Please log in or sign up to add items to your cart.',
        [
          { text: 'Maybe later', style: 'cancel' },
          { text: 'Login / Sign up', onPress: () => onRequireAuth('add items to your cart') },
        ],
      );
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

  const isProductInCart = (productId: string) => isInCart(productId);
  const isDark = colorScheme === 'dark';
  const textColor = isDark ? DARK_TEXT : LIGHT_TEXT;
  const borderColor = isDark ? '#333' : '#e0e0e0';

  if (loading) {
    return (
      <View style={[styles.similarContainer, { borderTopColor: borderColor }]}>
        <Text style={[styles.similarTitle, { color: textColor }]}>Similar Products</Text>
        <View style={styles.similarLoadingContainer}>
          <ActivityIndicator size="small" color={PRIMARY_COLOR} />
          <Text style={{ fontSize: 14, marginTop: 10, color: isDark ? '#bbb' : '#666' }}>
            Finding similar products...
          </Text>
        </View>
      </View>
    );
  }

  if (similarProducts.length === 0) return null;

  return (
    <View style={[styles.similarContainer, { borderTopColor: borderColor }]}>
      <Text style={[styles.similarTitle, { color: textColor }]}>Other Products You Might Like</Text>
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
                  borderColor,
                  borderLeftWidth: item.isFromSameSeller ? 3 : 0,
                  borderLeftColor: item.isFromSameSeller ? PRIMARY_COLOR : 'transparent'
                }
              ]}
              onPress={() => onProductSelect(item)}
            >
                {getCardDisplayMedia(item.media_urls) ? (
                  <Image
                    source={{ uri: getCardDisplayMedia(item.media_urls) }}
                    style={styles.similarProductImage}
                    resizeMode="cover"
                  />
                ) : (
                  <View
                    style={[
                      styles.similarProductImage,
                      { justifyContent: 'center', alignItems: 'center', backgroundColor: isDark ? '#1e1e1e' : '#f5f5f5' },
                    ]}
                  >
                    <Ionicons name="image-outline" size={30} color={isDark ? '#777' : '#999'} />
                  </View>
                )}

              {item.isVideo && (
                <View style={styles.similarVideoIcon}>
                    <Ionicons name="play" size={16} color="#fff" />
                </View>
              )}

                {item.isFromSameSeller && (
                <View style={{
                  position: 'absolute',
                  top: 8,
                    left: 8,
                  backgroundColor: PRIMARY_COLOR,
                    paddingHorizontal: 6,
                    paddingVertical: 2,
                    borderRadius: 4,
                  zIndex: 10
                }}>
                    <Text style={{ color: '#fff', fontSize: 9, fontWeight: 'bold' }}>Same seller</Text>
                </View>
              )}

              <View style={styles.similarProductInfo}>
                <Text style={[styles.similarProductTitle, { color: textColor }]} numberOfLines={2}>
                  {item.title}
                </Text>

                <View style={styles.similarPriceRow}>
                    <Text style={[styles.similarPrice, { color: PRIMARY_COLOR }]}>GHS {Number(item.price).toFixed(2)}</Text>
                  {item.hasDiscount && (
                    <>
                      <Text style={[styles.similarOldPrice, { color: isDark ? '#aaa' : '#999' }]}>
                          GHS {Number(item.original_price).toFixed(2)}
                      </Text>
                      <View style={styles.similarDiscountBadge}>
                        <Text style={styles.similarDiscountText}>-{item.discountPercent}%</Text>
                      </View>
                    </>
                  )}
                </View>

                <View style={styles.similarSellerRow}>
                  <Image
                    source={{ uri: item.avatar_url || 'https://ui-avatars.com/api/?name=Seller&background=FF9900&color=fff' }}
                    style={[
                      styles.similarSellerAvatar,
                      item.isFromSameSeller
                        ? { borderColor: PRIMARY_COLOR, borderWidth: 2 }
                        : { borderColor, borderWidth: 1 }
                    ]}
                  />
                  <Text style={[styles.similarSellerName, { color: isDark ? '#aaa' : '#666' }]} numberOfLines={1}>
                    {item.display_name}
                  </Text>
                </View>

                <TouchableOpacity
                  style={[
                    styles.similarAddToCartButton,
                    { backgroundColor: isProductInCart(item.id) ? (isDark ? '#666' : '#999') : PRIMARY_COLOR },
                  ]}
                  onPress={(e) => {
                    e.stopPropagation();
                    if (!isProductInCart(item.id)) {
                      handleAddToCart(item);
                    } else {
                      showAlert('Already in Cart', 'This product is already in your cart.');
                    }
                  }}
                  disabled={isProductInCart(item.id)}
                >
                  <Ionicons
                    name={isProductInCart(item.id) ? 'checkmark-circle' : 'cart-outline'}
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

const ProductDetailModal: React.FC<{
  isVisible: boolean;
  onClose: () => void;
  product: any;
  onOpenFullViewer: (index: number) => void;
  onSelectSimilarProduct: (product: any) => void;
  onAddToCart: (product: any, selectedColor?: string, selectedSize?: string, quantity?: number) => Promise<any>;
  isInCart: (productId: string, selectedColor?: string, selectedSize?: string) => boolean;
  onPlaceOrder: (product: any, options?: { selectedColor?: string | null; selectedSize?: string | null; quantity?: number | null }) => void;
  onSellerAvatarPress?: (product: any) => void;
  showAlert: (title: string, message: string, buttons?: any[]) => void;
  isAuthenticated: boolean;
  onRequireAuth: (action?: string) => void;
  styles: any;
  getCurrentUserId: () => Promise<string | null>;
  formatDeliveryOption: (option: string) => string;
  requireAuth: (action?: string) => void;
  getCurrentUserUniversity: () => Promise<any>;
  extractKeywords: (title: string) => string[];
  getCardDisplayMedia: (mediaUrls: string[] | undefined) => string | undefined;
}> = ({
  isVisible,
  onClose,
  product,
  onOpenFullViewer,
  onSelectSimilarProduct,
  onAddToCart,
  isInCart,
  onPlaceOrder,
  onSellerAvatarPress,
  showAlert,
  isAuthenticated,
  onRequireAuth,
  styles,
  getCurrentUserId,
  formatDeliveryOption,
  requireAuth,
  getCurrentUserUniversity,
  extractKeywords,
  getCardDisplayMedia,
}) => {
  const { width } = useWindowDimensions();
  const [addingToCart, setAddingToCart] = useState(false);
  const [selectedColor, setSelectedColor] = useState<string | undefined>(undefined);
  const [selectedSize, setSelectedSize] = useState<string | undefined>(undefined);
  const [quantity, setQuantity] = useState(1);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [activeDetailsTab, setActiveDetailsTab] = useState<'description' | 'reviews'>('description');
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const colorScheme = useColorScheme();

  useEffect(() => {
    const fetchUserId = async () => {
      const userId = await getCurrentUserId();
      setCurrentUserId(userId);
    };
    if (isVisible) {
      fetchUserId();
    }
  }, [isVisible, getCurrentUserId]);

  const isLargeScreen = width >= 768;
  const modalWidth = isLargeScreen ? Math.min(width * 0.8, 800) : '100%';
  const mediaWidth = isLargeScreen ? Math.min(width * 0.6, 600) : width * 0.9;
  const mediaHeight = mediaWidth * 0.7;

  useEffect(() => {
    if (product) {
      setSelectedColor(undefined);
      setSelectedSize(undefined);
      setQuantity(1);
      setActiveDetailsTab('description');
      setIsDescriptionExpanded(false);
    }
  }, [product?.id, product]);

  const handleAddToCart = async () => {
    if (!product) return;

    if (!isAuthenticated) {
      onRequireAuth('add this product to your cart');
      return;
    }

    setAddingToCart(true);
    try {
      await onAddToCart(product, selectedColor, selectedSize, quantity);
    } catch (error: any) {
      if (error.message === 'Product is already in cart') {
        showAlert('Already in Cart', 'This product is already in your cart. You can update the quantity from the cart.');
      } else {
        showAlert('Error', 'Failed to add product to cart');
      }
    } finally {
      setAddingToCart(false);
    }
  };

  const handlePlaceOrder = () => {
    if (!product) return;
    if (!isAuthenticated) {
      onRequireAuth('place an order');
      return;
    }
    onPlaceOrder(product, { selectedColor: selectedColor || null, selectedSize: selectedSize || null, quantity });
  };

  const getAvailableStock = () => {
    if (!product) return 0;

    if (selectedColor && selectedSize && product.color_stock?.[selectedColor]) {
      const colorStock = product.color_stock[selectedColor];
      if (typeof colorStock === 'object' && colorStock !== null && selectedSize in colorStock) {
        return (colorStock as Record<string, number>)[selectedSize];
      }
    }
    if (selectedColor && product.color_stock?.[selectedColor]) {
      if (typeof product.color_stock[selectedColor] === 'number') {
        return product.color_stock[selectedColor] as number;
      }
    }
    if (selectedSize && product.size_stock?.[selectedSize]) {
      return product.size_stock[selectedSize];
    }
    return product.quantity || 0;
  };

  const availableStock = getAvailableStock();
  const isProductInCart = isInCart(product?.id || '', selectedColor, selectedSize);

  if (!product) return null;

  const descriptionText =
    (typeof product.description === 'string' && product.description.trim().length > 0
      ? product.description
      : typeof product.title === 'string' && product.title.trim().length > 0
        ? product.title
        : 'No description available');
  const showDescriptionToggle = descriptionText.trim().length > 180;

  const isDark = colorScheme === 'dark';
  const backgroundColor = isDark ? DARK_BACKGROUND : LIGHT_BACKGROUND;
  const textColor = isDark ? DARK_TEXT : LIGHT_TEXT;
  const borderColor = isDark ? '#333' : '#e0e0e0';
  const cardBackground = isDark ? '#1e1e1e' : '#ffffff';

  return (
    <Modal animationType="slide" transparent={true} visible={isVisible} onRequestClose={onClose}>
      <View style={[styles.modalCenteredView, { backgroundColor: 'rgba(0,0,0,0.85)' }]}>
        <View
          style={[
            styles.modalModalView,
            {
              backgroundColor,
              width: modalWidth,
              maxWidth: 800,
              alignSelf: 'center',
              marginHorizontal: 'auto',
              left: 0,
              right: 0,
              marginLeft: 'auto',
              marginRight: 'auto'
            }
          ]}
        >
          <TouchableOpacity style={styles.modalCloseButton} onPress={onClose}>
            <Ionicons name="close-circle" size={30} color={PRIMARY_COLOR} />
          </TouchableOpacity>
          <ScrollView contentContainerStyle={[styles.modalScrollContent, { paddingHorizontal: isLargeScreen ? 40 : 0 }]}>
            {product.media_urls?.length > 0 && (
              <ProductMediaView
                urls={product.media_urls}
                onPressMedia={onOpenFullViewer}
                color_media={product.color_media}
                colors_available={product.colors_available}
                selectedColor={selectedColor}
                onColorSelect={setSelectedColor}
                mediaWidth={mediaWidth}
                mediaHeight={mediaHeight}
              />
            )}

            {product.colors_available && product.colors_available.length > 0 && (
              <View style={styles.modalVariantSection}>
                <Text style={[styles.modalVariantTitle, { color: textColor }]}>Select Color:</Text>
                <View style={styles.colorSelectionGridModern}>
                  {product.colors_available.map((color: string) => {
                    const colorMedia = product.color_media?.[color];
                    const isSelected = selectedColor === color;

                    return (
                      <TouchableOpacity
                        key={color}
                        style={[
                          styles.colorOptionModernModal,
                          isSelected && styles.colorOptionModernSelectedModal,
                          { borderColor: isSelected ? PRIMARY_COLOR : borderColor }
                        ]}
                        onPress={() => setSelectedColor(color)}
                      >
                        <View style={styles.colorPreviewModernModal}>
                          {colorMedia && colorMedia.length > 0 ? (
                            <Image source={{ uri: colorMedia[0] || 'https://via.placeholder.com/400' }} style={styles.colorPreviewImageModal} resizeMode="cover" />
                          ) : (
                            <View style={[styles.colorCircleModernModal, { backgroundColor: color }]} />
                          )}

                          {isSelected && (
                            <View style={styles.colorSelectionCheckModal}>
                              <Ionicons name="checkmark" size={16} color="#fff" />
                            </View>
                          )}
                        </View>

                        <Text
                          style={[
                            styles.colorTextModernModal,
                            {
                              color: isSelected ? PRIMARY_COLOR : textColor,
                              fontWeight: isSelected ? '600' : '400'
                            }
                          ]}
                        >
                          {color}
                        </Text>

                        {product.color_stock?.[color] && (
                          <Text
                            style={[
                              styles.colorStockTextModal,
                              {
                                color: product.color_stock[color] > 0 ? '#4CAF50' : '#FF3B30',
                                backgroundColor: product.color_stock[color] > 0 ? '#4CAF5020' : '#FF3B3020'
                              }
                            ]}
                          >
                            {product.color_stock[color] > 0 ? `${product.color_stock[color]} left` : 'Out of stock'}
                          </Text>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}

            <View style={styles.modalDetailsContainer}>
              <Text style={[styles.modalTitle, { color: textColor }]}>{product.title}</Text>

              <View style={styles.modalPriceRow}>
                <Text style={[styles.modalPrice, { color: PRIMARY_COLOR }]}>GH₵ {Number(product.price).toFixed(2)}</Text>
                {product.hasDiscount && (
                  <>
                    <Text style={[styles.modalOldPrice, { color: isDark ? '#bbb' : '#999' }]}>GH₵ {Number(product.original_price).toFixed(2)}</Text>
                    <View style={styles.modalDiscountBadge}>
                      <Text style={styles.modalDiscountText}>-{product.discountPercent}%</Text>
                    </View>
                  </>
                )}
              </View>

              <View style={[styles.deliveryInfoContainer, { backgroundColor: cardBackground, borderColor }]}>
                <Ionicons name="car-outline" size={20} color={PRIMARY_COLOR} />
                <View style={styles.deliveryInfoContent}>
                  <Text style={[styles.deliveryInfoTitle, { color: textColor }]}>Delivery Option</Text>
                  <Text style={[styles.deliveryInfoValue, { color: PRIMARY_COLOR }]}>{formatDeliveryOption(product.delivery_option)}</Text>
                </View>
              </View>

              {product.is_pre_order ? (
                <View style={[styles.deliveryInfoContainer, { backgroundColor: cardBackground, borderColor }]}>
                  <Ionicons name="time-outline" size={20} color={PRIMARY_COLOR} />
                  <View style={styles.deliveryInfoContent}>
                    <Text style={[styles.deliveryInfoTitle, { color: textColor }]}>Pre-Order</Text>
                    <Text style={[styles.deliveryInfoValue, { color: PRIMARY_COLOR }]}>Arrives in {product.pre_order_duration} {product.pre_order_duration_unit}</Text>
                  </View>
                </View>
              ) : (
                <View style={[styles.deliveryInfoContainer, { backgroundColor: cardBackground, borderColor }]}>
                  <Ionicons name="checkmark-circle-outline" size={20} color={PRIMARY_COLOR} />
                  <View style={styles.deliveryInfoContent}>
                    <Text style={[styles.deliveryInfoTitle, { color: textColor }]}>Availability</Text>
                    <Text style={[styles.deliveryInfoValue, { color: PRIMARY_COLOR }]}>In Stock - Available Now</Text>
                  </View>
                </View>
              )}

              {product.sizes_available && product.sizes_available.length > 0 && (
                <View style={styles.modalVariantSection}>
                  <Text style={[styles.modalVariantTitle, { color: textColor }]}>Select Size:</Text>
                  <View style={styles.sizeSelectionGridModern}>
                    {product.sizes_available.map((size: string) => {
                      const getColorStockForSize = (color: string, selectedProductSize: string): number => {
                        const colorStockValue = product.color_stock?.[color];
                        if (typeof colorStockValue === 'object' && colorStockValue !== null) {
                          const sizeStock = (colorStockValue as Record<string, number>)[selectedProductSize];
                          if (sizeStock !== undefined && sizeStock !== null) {
                            return sizeStock;
                          }
                        }
                        if (typeof colorStockValue === 'number') {
                          return colorStockValue;
                        }
                        return product.quantity || 0;
                      };

                      const hasSizeStockData = product.size_stock && typeof product.size_stock === 'object' && size in product.size_stock;
                      const sizeStockValue = hasSizeStockData ? product.size_stock[size as keyof typeof product.size_stock] : null;
                      const isOutOfStock = selectedColor
                        ? getColorStockForSize(selectedColor, size) <= 0
                        : (hasSizeStockData ? (sizeStockValue as number) <= 0 : (product.quantity ?? 0) <= 0);
                      const isSelected = selectedSize === size;

                      return (
                        <TouchableOpacity
                          key={size}
                          style={[
                            styles.sizeOptionModernModal,
                            isSelected && styles.sizeOptionModernSelectedModal,
                            isOutOfStock && styles.sizeOptionModernDisabledModal,
                            {
                              borderColor: isSelected ? PRIMARY_COLOR : borderColor,
                              backgroundColor: isOutOfStock ? (isDark ? '#2a2a2a' : '#f0f0f0') : 'transparent'
                            }
                          ]}
                          onPress={() => !isOutOfStock && setSelectedSize(size)}
                          disabled={isOutOfStock}
                        >
                          <Text
                            style={[
                              styles.sizeTextModernModal,
                              {
                                color: isSelected ? PRIMARY_COLOR :
                                  isOutOfStock ? (isDark ? '#666' : '#999') : textColor,
                                fontWeight: isSelected ? '700' : '400'
                              }
                            ]}
                          >
                            {size}
                          </Text>

                          {isSelected && (
                            <View style={styles.sizeSelectionIndicatorModal}>
                              <Ionicons name="checkmark" size={14} color={PRIMARY_COLOR} />
                            </View>
                          )}

                          {isOutOfStock && (
                            <View style={styles.outOfStockBadgeModal}>
                              <Text style={styles.outOfStockTextModal}>Out of stock</Text>
                            </View>
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  <View style={[styles.sizeGuideContainerModal, { backgroundColor: isDark ? '#1a1a1a' : '#f8f8f8', borderColor }]}>
                    <Ionicons name="information-circle-outline" size={16} color={PRIMARY_COLOR} />
                    <Text style={[styles.sizeGuideTextModal, { color: isDark ? '#aaa' : '#666' }]}>Select your size carefully. Size availability depends on selected color.</Text>
                  </View>
                </View>
              )}

              <View style={[styles.modalQuantitySection, { backgroundColor: cardBackground, borderColor }]}>
                <Text style={[styles.modalQuantityLabel, { color: textColor }]}>Quantity:</Text>
                <View style={styles.modalQuantityControls}>
                  <TouchableOpacity
                    style={[styles.modalQuantityButton, { backgroundColor: isDark ? '#333' : '#f0f0f0' }]}
                    onPress={() => quantity > 1 && setQuantity(quantity - 1)}
                    disabled={quantity <= 1}
                  >
                    <Ionicons name="remove" size={20} color={quantity <= 1 ? '#ccc' : textColor} />
                  </TouchableOpacity>

                  <View style={[styles.modalQuantityDisplay, { borderColor }]}>
                    <Text style={[styles.modalQuantityValue, { color: textColor }]}>{quantity}</Text>
                  </View>

                  <TouchableOpacity
                    style={[styles.modalQuantityButton, { backgroundColor: isDark ? '#333' : '#f0f0f0' }]}
                    onPress={() => quantity < availableStock && setQuantity(quantity + 1)}
                    disabled={quantity >= availableStock}
                  >
                    <Ionicons name="add" size={20} color={quantity >= availableStock ? '#ccc' : textColor} />
                  </TouchableOpacity>

                  <View style={styles.quantityInfoModal}>
                    <Text style={[styles.stockTextModal, { color: availableStock > 0 ? '#4CAF50' : '#FF3B30' }]}>
                      {availableStock > 0 ? `${availableStock} available` : 'Out of stock'}
                    </Text>
                    <Text style={[styles.pricePerUnitModal, { color: isDark ? '#aaa' : '#666' }]}>GH₵ {product.price.toFixed(2)} each</Text>
                  </View>
                </View>
              </View>

              <View style={[styles.detailsTabContainer, { backgroundColor: cardBackground, borderColor }]}>
                <TouchableOpacity
                  style={[
                    styles.detailsTabButton,
                    activeDetailsTab === 'description' && [styles.detailsTabButtonActive, { backgroundColor: PRIMARY_COLOR }],
                  ]}
                  onPress={() => setActiveDetailsTab('description')}
                >
                  <Text
                    style={[
                      styles.detailsTabButtonText,
                      { color: isDark ? '#bbb' : '#666' },
                      activeDetailsTab === 'description' && styles.detailsTabButtonTextActive,
                    ]}
                  >
                    Description
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.detailsTabButton,
                    activeDetailsTab === 'reviews' && [styles.detailsTabButtonActive, { backgroundColor: PRIMARY_COLOR }],
                  ]}
                  onPress={() => setActiveDetailsTab('reviews')}
                >
                  <Text
                    style={[
                      styles.detailsTabButtonText,
                      { color: isDark ? '#bbb' : '#666' },
                      activeDetailsTab === 'reviews' && styles.detailsTabButtonTextActive,
                    ]}
                  >
                    Reviews
                  </Text>
                </TouchableOpacity>
              </View>

              {activeDetailsTab === 'description' ? (
                <>
                  <Text style={[styles.modalSectionTitle, { color: textColor, borderBottomColor: borderColor }]}>Product Description</Text>
                  <Text
                    style={[styles.modalDescription, { color: isDark ? '#ccc' : '#666' }]}
                    numberOfLines={isDescriptionExpanded ? undefined : 4}
                  >
                    {descriptionText}
                  </Text>
                  {(showDescriptionToggle || isDescriptionExpanded) && (
                    <TouchableOpacity
                      style={{ marginTop: 8, alignSelf: 'flex-start' }}
                      onPress={() => setIsDescriptionExpanded((prev) => !prev)}
                    >
                      <Text style={{ color: PRIMARY_COLOR, fontSize: 13, fontWeight: '700' }}>
                        {isDescriptionExpanded ? 'See less' : 'See more'}
                      </Text>
                    </TouchableOpacity>
                  )}
                </>
              ) : null}

              <View style={[styles.modalSellerInfo, { borderTopColor: borderColor }]}>
                <TouchableOpacity
                  onPress={() => onSellerAvatarPress?.(product)}
                  activeOpacity={0.7}
                >
                  <Image
                    source={{ uri: product.avatar_url || 'https://ui-avatars.com/api/?name=Seller&background=FF9900&color=fff' }}
                    style={styles.modalSellerAvatar}
                  />
                </TouchableOpacity>
                <View>
                  <Text style={[styles.modalSellerName, { color: textColor }]}>Sold by: {product.display_name}</Text>
                  <Text style={[styles.modalSellerUniversity, { color: isDark ? '#bbb' : '#666' }]}>{product.university}</Text>
                  <Text style={[styles.modalSellerCategory, { color: PRIMARY_COLOR }]}>Category: {product.category || 'Uncategorized'}</Text>
                </View>
              </View>

              {activeDetailsTab === 'reviews' && product.id ? (
                <ProductReviewsSection
                  productId={product.id}
                  currentUserId={currentUserId}
                  theme={{
                    card: cardBackground,
                    text: textColor,
                    textSecondary: isDark ? '#bbb' : '#666',
                    border: borderColor,
                  }}
                  showAlert={showAlert}
                  onRequireAuth={() => requireAuth('leave a review')}
                />
              ) : null}

              <EnhancedSimilarProductsSection
                product={product}
                onProductSelect={onSelectSimilarProduct}
                onAddToCart={onAddToCart}
                extractKeywords={extractKeywords}
                getCurrentUserUniversity={getCurrentUserUniversity}
                getCurrentUserId={getCurrentUserId}
                getCardDisplayMedia={getCardDisplayMedia}
                isInCart={isInCart}
                showAlert={showAlert}
                onRequireAuth={onRequireAuth}
                styles={styles}
              />
            </View>
          </ScrollView>
          <View style={[styles.modalActionBar, { borderTopColor: borderColor, backgroundColor }]}>
            <TouchableOpacity
              style={[styles.modalAddToCartButton, isProductInCart && styles.modalInCartButton]}
              onPress={handleAddToCart}
              disabled={addingToCart || availableStock <= 0}
            >
              {addingToCart ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Ionicons
                  name={isProductInCart ? 'checkmark-circle' : 'cart-outline'}
                  size={20}
                  color="#fff"
                />
              )}
              <Text style={styles.modalAddToCartButtonText}>
                {isProductInCart ? 'In Cart' : availableStock <= 0 ? 'Out of Stock' : 'Add to Cart'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalPlaceOrderButton, availableStock <= 0 && styles.modalButtonDisabled]}
              onPress={handlePlaceOrder}
              disabled={availableStock <= 0}
            >
              <Ionicons name="bag-check" size={20} color="#fff" />
              <Text style={styles.modalPlaceOrderButtonText}>Place Order</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default ProductDetailModal;
