import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Modal,
  View,
  TouchableOpacity,
  ActivityIndicator,
  Text,
  ScrollView,
  FlatList,
  Image,
  useWindowDimensions,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { ProductReviewsSection } from '@/components/ProductReviewsSection';

const SUPABASE_URL = 'https://qwujadyqebfypyhfuwfl.supabase.co';

type ProductDetailModalProps = {
  isVisible: boolean;
  onClose: () => void;
  product: any;
  onOpenFullViewer: (index: number) => void;
  onSelectSimilarProduct: (product: any) => void;
  onAddToCart: (product: any) => Promise<void>;
  isInCart: () => boolean;
  cartItems?: any[];
  onPlaceOrder: (product: any, options?: { selectedColor?: string | null; selectedSize?: string | null; quantity?: number | null }) => void;
  fromCart?: boolean;
  fromSellerProfile?: boolean;
  showAlert: (title: string, message: string, buttons?: any[]) => void;
  theme: any;
  getCurrentUserId: () => Promise<string | null>;
  getCardDisplayUrl: (urls?: string[] | null) => string;
  formatDeliveryOption: (option?: string) => string;
  onOpenSellerProfile?: (sellerId: string) => void;
  SimilarProductsSectionComponent: React.ComponentType<{
    product: any;
    onProductSelect: (product: any) => void;
    onAddToCart: (product: any) => Promise<void>;
    cartItems?: any[];
    showAlert: (title: string, message: string, buttons?: any[]) => void;
    theme: any;
  }>;
};

export default function ProductDetailModal({
  isVisible,
  onClose,
  product,
  onOpenFullViewer,
  onSelectSimilarProduct,
  onAddToCart,
  isInCart,
  cartItems = [],
  onPlaceOrder,
  fromCart = false,
  fromSellerProfile = false,
  showAlert,
  theme,
  getCurrentUserId,
  getCardDisplayUrl,
  formatDeliveryOption,
  onOpenSellerProfile,
  SimilarProductsSectionComponent, }: ProductDetailModalProps) {
  const router = useRouter();
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

  const [addingToCart, setAddingToCart] = useState(false);
  const [productWithSeller, setProductWithSeller] = useState<any>(null);
  const [loadingSeller, setLoadingSeller] = useState(false);
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0);
  const [selectedColor, setSelectedColor] = useState<string>('');
  const [selectedSize, setSelectedSize] = useState<string>('');
  const [fullProductData, setFullProductData] = useState<any>(null);
  const [loadingProductDetails, setLoadingProductDetails] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [activeDetailsTab, setActiveDetailsTab] = useState<'description' | 'reviews'>('description');
  const [quantity, setQuantity] = useState<number>(1);
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const sellerInfoRequestIdRef = useRef(0);
  const mediaFlatListRef = useRef<FlatList<string> | null>(null);
  const mediaViewabilityConfig = useRef({ itemVisiblePercentThreshold: 70 });
  const onMediaViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: any[] }) => {
    const firstVisible = viewableItems?.[0];
    if (typeof firstVisible?.index === 'number') {
      setCurrentMediaIndex(prev => (prev === firstVisible.index ? prev : firstVisible.index));
    }
  });
  const { width } = useWindowDimensions();

  const isLargeScreen = width >= 768;
  const mediaWidth = isLargeScreen ? Math.min(width * 0.6, 600) : width;
  const mediaHeight = isLargeScreen ? mediaWidth * 0.7 : mediaWidth * 0.55;

  const formatProductMediaUrl = useCallback((url: string) => (
    url.startsWith('http') ? url : `${SUPABASE_URL}/storage/v1/object/public/products/${url}`
  ), []);

  const normalizeMediaKey = useCallback((url: string) => {
    if (!url) return '';
    const withoutQuery = url.split('?')[0].split('#')[0];
    try {
      return decodeURIComponent(withoutQuery).toLowerCase();
    } catch {
      return withoutQuery.toLowerCase();
    }
  }, []);

  const navigateToColorMedia = useCallback((color: string, productData: any) => {
    const colorMedia = productData?.color_media || {};
    const mediaForColor = (colorMedia[color] || []).map((url: string) => formatProductMediaUrl(url));
    const allMedia = (productData?.media_urls || []).map((url: string) => formatProductMediaUrl(url));

    if (mediaForColor.length > 0 && allMedia.length > 0) {
      const firstColorMediaIndex = allMedia.findIndex((url: string) => mediaForColor.includes(url));
      if (firstColorMediaIndex !== -1) {
        setCurrentMediaIndex(firstColorMediaIndex);
      }
    }
  }, [formatProductMediaUrl]);

  const fetchFullProductData = useCallback(async (productId: string) => {
    try {
      setLoadingProductDetails(true);
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('id', productId)
        .single();

      if (error) throw error;
      setFullProductData(data);

      if (data?.colors_available?.length > 0) {
        setSelectedColor(data.colors_available[0]);
        navigateToColorMedia(data.colors_available[0], data);
      }
    } catch (error) {
      console.error('Error fetching product details:', error);
    } finally {
      setLoadingProductDetails(false);
    }
  }, [navigateToColorMedia]);

  useEffect(() => {
    if (!isVisible || !product) return;

    const requestId = ++sellerInfoRequestIdRef.current;
    let cancelled = false;
    const isCurrent = () => !cancelled && requestId === sellerInfoRequestIdRef.current;

    const fetchSellerInfo = async () => {
      if (!product.display_name || !product.avatar_url || !product.university) {
        setLoadingSeller(true);
        try {
          const [{ data: shopData }, { data: profileData }] = await Promise.all([
            supabase
              .from('shops')
              .select('name, avatar_url')
              .eq('owner_id', product.seller_id)
              .maybeSingle(),
            supabase
              .from('user_profiles')
              .select('full_name, avatar_url, university')
              .eq('id', product.seller_id)
              .maybeSingle()
          ]);

          if (!isCurrent()) return;

          const updatedProduct = {
            ...product,
            display_name: shopData?.name || profileData?.full_name || 'Seller',
            avatar_url: shopData?.avatar_url || profileData?.avatar_url ||
              `https://ui-avatars.com/api/?name=${encodeURIComponent(shopData?.name || profileData?.full_name || 'Seller')}&background=FF9900&color=fff`,
            university: profileData?.university || 'Campus',
          };

          setProductWithSeller(updatedProduct);
        } catch (error) {
          console.error('Error fetching seller info:', error);
          if (!isCurrent()) return;
          setProductWithSeller({
            ...product,
            display_name: product.display_name || 'Seller',
            avatar_url: product.avatar_url ||
              `https://ui-avatars.com/api/?name=${encodeURIComponent(product.title || 'Product')}&background=FF9900&color=fff`,
            university: product.university || 'Campus',
          });
        } finally {
          if (isCurrent()) {
            setLoadingSeller(false);
          }
        }
      } else {
        if (isCurrent()) {
          setProductWithSeller(product);
        }
      }
    };

    fetchSellerInfo();
    fetchFullProductData(product.id);
    setCurrentMediaIndex(0);
    setSelectedColor('');
    setSelectedSize('');
    setQuantity(1);
    setActiveDetailsTab('description');
    setIsDescriptionExpanded(false);

    const fetchUserId = async () => {
      const { data } = await supabase.auth.getUser();
      setCurrentUserId(data?.user?.id ?? null);
    };
    fetchUserId();

    return () => {
      cancelled = true;
    };
  }, [isVisible, product, fetchFullProductData]);

  const handleAddToCart = async () => {
    if (!product) return;

    const userId = await getCurrentUserId();
    if (!userId) {
      requireAuth('add items to your cart');
      return;
    }

    const isOutOfStock = checkIfOutOfStock();
    if (isOutOfStock) {
      showAlert('Out of Stock', 'This product is currently out of stock.');
      return;
    }

    if (fullProductData?.colors_available?.length > 0 && !selectedColor) {
      showAlert('Select Color', 'Please select a color before adding to cart.');
      return;
    }

    if (fullProductData?.sizes_available?.length > 0 && !selectedSize) {
      showAlert('Select Size', 'Please select a size before adding to cart.');
      return;
    }

    setAddingToCart(true);
    try {
      await onAddToCart(product);
      showAlert('Success', 'Product added to cart!');
    } catch (error: any) {
      if (error.message === 'Product is already in cart') {
        showAlert('Already in Cart', 'This product is already in your cart. You can update the quantity from the cart.');
      } else {
        showAlert('Sorry', 'Product is already in cart');
      }
    } finally {
      setAddingToCart(false);
    }
  };

  const handlePlaceOrder = () => {
    if (!product) return;

    if (!currentUserId) {
      requireAuth('place an order');
      return;
    }

    const isOutOfStock = checkIfOutOfStock();
    if (isOutOfStock) {
      showAlert('Out of Stock', 'This product is currently out of stock.');
      return;
    }

    if (fullProductData?.colors_available?.length > 0 && !selectedColor) {
      showAlert('Select Color', 'Please select a color before placing order.');
      return;
    }

    if (fullProductData?.sizes_available?.length > 0 && !selectedSize) {
      showAlert('Select Size', 'Please select a size before placing order.');
      return;
    }

    onPlaceOrder(product, { selectedColor: selectedColor || null, selectedSize: selectedSize || null, quantity: quantity || null });
  };

  const checkIfOutOfStock = () => {
    if (!fullProductData) return false;

    if (fullProductData.category === 'Services') return false;

    if (fullProductData.sizes_available?.length > 0) {
      const sizeStock = fullProductData.size_stock || {};
      if (selectedSize) {
        const qty = parseInt(sizeStock[selectedSize] || '0');
        return qty <= 0;
      }
      return !Object.values(sizeStock).some(qty => parseInt(qty as string) > 0);
    }

    if (fullProductData.colors_available?.length > 0) {
      const colorStock = fullProductData.color_stock || {};
      if (selectedColor) {
        const qty = parseInt(colorStock[selectedColor] || '0');
        return qty <= 0;
      }
      return !Object.values(colorStock).some(qty => parseInt(qty as string) > 0);
    }

    const generalStock = fullProductData.quantity || 0;
    return generalStock <= 0;
  };

  const getAvailableStock = () => {
    if (!fullProductData) return 0;

    if (fullProductData.category === 'Services') return 0;

    if (fullProductData.sizes_available?.length > 0 && selectedSize) {
      const sizeStock = fullProductData.size_stock || {};
      return parseInt(sizeStock[selectedSize] || '0');
    }

    if (fullProductData.colors_available?.length > 0 && selectedColor) {
      const colorStock = fullProductData.color_stock || {};
      return parseInt(colorStock[selectedColor] || '0');
    }

    return fullProductData.quantity || 0;
  };

  const getTotalStock = () => {
    if (!fullProductData) return 0;

    if (fullProductData.category === 'Services') return 0;

    if (fullProductData.sizes_available?.length > 0) {
      const sizeStock = fullProductData.size_stock || {};
      return Object.values(sizeStock).reduce((sum: number, qty: any) => sum + (parseInt(qty) || 0), 0);
    }

    if (fullProductData.colors_available?.length > 0) {
      const colorStock = fullProductData.color_stock || {};
      return Object.values(colorStock).reduce((sum: number, qty: any) => sum + (parseInt(qty) || 0), 0);
    }

    return fullProductData.quantity || 0;
  };

  const displayProduct = productWithSeller || product;
  if (!displayProduct) return null;

  const isService = fullProductData?.category === 'Services';
  const hasSizes = fullProductData?.sizes_available?.length > 0;
  const hasColors = fullProductData?.colors_available?.length > 0;
  const totalStock = getTotalStock();
  const availableStock = getAvailableStock();
  const isOutOfStock = checkIfOutOfStock();
  const descriptionText =
    (typeof displayProduct.description === 'string' && displayProduct.description.trim().length > 0
      ? displayProduct.description
      : typeof displayProduct.title === 'string' && displayProduct.title.trim().length > 0
        ? displayProduct.title
        : 'No description available');
  const showDescriptionToggle = descriptionText.trim().length > 180;
  const displayedMedia = useMemo(() => {
    const sourceMedia = fullProductData?.media_urls || displayProduct?.media_urls || [];

    return sourceMedia.map((url: string) => formatProductMediaUrl(url));
  }, [fullProductData?.media_urls, displayProduct?.media_urls, formatProductMediaUrl]);

  const mediaToColorMap = useMemo(() => {
    const map = new Map<string, string>();
    const colorMedia = fullProductData?.color_media || {};

    Object.entries(colorMedia).forEach(([color, urls]) => {
      if (!Array.isArray(urls)) return;
      (urls as string[]).forEach((url: string) => {
        const formatted = formatProductMediaUrl(url);
        map.set(normalizeMediaKey(formatted), color);
      });
    });

    return map;
  }, [fullProductData?.color_media, formatProductMediaUrl, normalizeMediaKey]);

  const safeMediaIndex = displayedMedia.length > 0
    ? Math.min(currentMediaIndex, displayedMedia.length - 1)
    : 0;

  useEffect(() => {
    if (!hasColors || displayedMedia.length === 0 || mediaToColorMap.size === 0) return;

    const currentMediaUrl = displayedMedia[safeMediaIndex];
    if (!currentMediaUrl) return;

    const matchedColor = mediaToColorMap.get(normalizeMediaKey(currentMediaUrl));

    if (matchedColor && matchedColor !== selectedColor) {
      setSelectedColor(matchedColor);
    }
  }, [
    hasColors,
    displayedMedia,
    safeMediaIndex,
    mediaToColorMap,
    normalizeMediaKey,
    selectedColor,
  ]);

  const goToPreviousMedia = () => {
    if (displayedMedia.length <= 1) return;
    const nextIndex = Math.max(0, safeMediaIndex - 1);
    mediaFlatListRef.current?.scrollToIndex({ index: nextIndex, animated: true });
    setCurrentMediaIndex(nextIndex);
  };

  const goToNextMedia = () => {
    if (displayedMedia.length <= 1) return;
    const nextIndex = Math.min(displayedMedia.length - 1, safeMediaIndex + 1);
    mediaFlatListRef.current?.scrollToIndex({ index: nextIndex, animated: true });
    setCurrentMediaIndex(nextIndex);
  };

  useEffect(() => {
    if (!mediaFlatListRef.current || displayedMedia.length === 0) return;

    mediaFlatListRef.current.scrollToIndex({
      index: safeMediaIndex,
      animated: true,
    });
  }, [safeMediaIndex, displayedMedia.length]);

  return (
    <Modal animationType="slide" transparent={true} visible={isVisible} onRequestClose={onClose}>
      <View style={[styles.modalCenteredView, { backgroundColor: theme.modalOverlay }]}>
        <View style={[
          styles.modalModalView,
          {
            backgroundColor: theme.modalBackground,
            width: isLargeScreen ? Math.min(width * 0.8, 800) : '100%',
            alignSelf: 'center',
            marginHorizontal: isLargeScreen ? 'auto' : 0
          }
        ]}>
          <TouchableOpacity style={styles.modalCloseButton} onPress={onClose}>
            <Ionicons name="close-circle" size={30} color={theme.primary} />
          </TouchableOpacity>

          {loadingSeller || loadingProductDetails ? (
            <View style={styles.modalLoadingContainer}>
              <ActivityIndicator size="large" color={theme.primary} />
              <Text style={[styles.modalLoadingText, { color: theme.text }]}>Loading product details...</Text>
            </View>
          ) : (
            <ScrollView contentContainerStyle={styles.modalScrollContent}>
              <View style={[styles.mediaGalleryContainer, { alignItems: 'center' }]}>
                {displayedMedia.length > 0 && (
                  <View style={{ width: mediaWidth, height: mediaHeight }}>
                    <FlatList
                      ref={mediaFlatListRef}
                      data={displayedMedia}
                      key={`media-gallery-${displayedMedia.length}`}
                      horizontal
                      pagingEnabled
                      showsHorizontalScrollIndicator={false}
                      keyExtractor={(_, i) => i.toString()}
                      getItemLayout={(_, i) => ({ length: mediaWidth, offset: mediaWidth * i, index: i })}
                      initialScrollIndex={safeMediaIndex}
                      viewabilityConfig={mediaViewabilityConfig.current}
                      onViewableItemsChanged={onMediaViewableItemsChanged.current}
                      onMomentumScrollEnd={(e) => {
                        const nextIndex = Math.round(e.nativeEvent.contentOffset.x / mediaWidth);
                        setCurrentMediaIndex(Math.max(0, Math.min(nextIndex, displayedMedia.length - 1)));
                      }}
                      onScrollToIndexFailed={() => {
                        setTimeout(() => {
                          mediaFlatListRef.current?.scrollToIndex({ index: safeMediaIndex, animated: false });
                        }, 60);
                      }}
                      renderItem={({ item: url, index }) => {
                        const isVideo = url.toLowerCase().includes('.mp4');
                        return (
                          <TouchableOpacity activeOpacity={0.95} style={{ width: mediaWidth, height: mediaHeight }} onPress={() => onOpenFullViewer(index)}>
                            {isVideo ? (
                              <View style={{ width: '100%', height: '100%' }}>
                                <Image source={{ uri: getCardDisplayUrl(displayedMedia) }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                                <View style={styles.tiktokPlayThumbnailOverlay} pointerEvents="none">
                                  <View style={styles.tiktokPlayButtonSmall}>
                                    <Ionicons name="play" size={28} color="#fff" />
                                  </View>
                                </View>
                              </View>
                            ) : (
                              <Image source={{ uri: url }} style={{ width: '100%', height: '100%' }} resizeMode="contain" />
                            )}
                          </TouchableOpacity>
                        );
                      }}
                    />

                    {displayedMedia.length > 1 && (
                      <>
                        <TouchableOpacity
                          style={[styles.mediaArrowButton, styles.mediaArrowLeft, { backgroundColor: theme.overlay }]}
                          onPress={goToPreviousMedia}
                          disabled={safeMediaIndex === 0}
                        >
                          <Ionicons name="chevron-back" size={20} color={safeMediaIndex === 0 ? 'rgba(255,255,255,0.5)' : '#fff'} />
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[styles.mediaArrowButton, styles.mediaArrowRight, { backgroundColor: theme.overlay }]}
                          onPress={goToNextMedia}
                          disabled={safeMediaIndex === displayedMedia.length - 1}
                        >
                          <Ionicons name="chevron-forward" size={20} color={safeMediaIndex === displayedMedia.length - 1 ? 'rgba(255,255,255,0.5)' : '#fff'} />
                        </TouchableOpacity>
                      </>
                    )}

                    {displayedMedia.length > 1 && (
                      <View style={styles.mediaCounterBadge}>
                        <Text style={styles.mediaCounterText}>{safeMediaIndex + 1}/{displayedMedia.length}</Text>
                      </View>
                    )}
                  </View>
                )}

                {hasColors && (
                  <View style={[styles.colorMediaNavigation, { width: mediaWidth }]}>
                    <Text style={[styles.colorNavTitle, { color: theme.text }]}>View by Color:</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.colorNavChips}>
                      {fullProductData.colors_available.map((color: string) => {
                        const colorQty = fullProductData.color_stock?.[color] || 0;
                        const isColorOutOfStock = parseInt(colorQty) === 0;
                        const isSelected = selectedColor === color;

                        return (
                          <TouchableOpacity
                            key={color}
                            style={[
                              styles.colorNavChip,
                              { backgroundColor: theme.surface },
                              isSelected && [styles.colorNavChipSelected, { borderColor: theme.primary }],
                              isColorOutOfStock && { backgroundColor: theme.errorLight }
                            ]}
                            onPress={() => {
                              setSelectedColor(color);
                              navigateToColorMedia(color, fullProductData);
                            }}
                          >
                            <Text style={[
                              styles.colorNavChipText,
                              { color: theme.text },
                              isSelected && [styles.colorNavChipTextSelected, { color: theme.primary }],
                              isColorOutOfStock && { color: theme.error }
                            ]}>
                              {color}
                            </Text>
                            {isColorOutOfStock && (
                              <Ionicons name="close-circle" size={12} color={theme.error} />
                            )}
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                  </View>
                )}

                {displayedMedia.length > 1 && (
                  <View style={styles.mediaPaginationDots}>
                    {displayedMedia.map((_: any, index: number) => (
                      <View
                        key={index}
                        style={[
                          styles.mediaDot,
                          index === safeMediaIndex
                            ? [styles.mediaActiveDot, { backgroundColor: theme.primary }]
                            : [styles.mediaInactiveDot, { backgroundColor: theme.textTertiary }]
                        ]}
                      />
                    ))}
                  </View>
                )}
              </View>

              <View style={styles.modalDetailsContainer}>
                <Text style={[styles.modalTitle, { color: theme.text }]}>{displayProduct.title}</Text>

                <View style={styles.priceStockRow}>
                  <View style={styles.priceContainer}>
                    <Text style={[styles.modalPrice, { color: theme.primary }]}>
                      <Text style={[styles.modalCurrency, { color: theme.primary }]}>GHS</Text> {Number(displayProduct.price).toFixed(2)}
                    </Text>
                    {displayProduct.hasDiscount && (
                      <>
                        <Text style={[styles.modalOldPrice, { color: theme.textTertiary }]}>GHS {Number(displayProduct.original_price).toFixed(2)}</Text>
                        <View style={styles.modalDiscountBadge}>
                          <Text style={styles.modalDiscountText}>-{displayProduct.discountPercent}%</Text>
                        </View>
                      </>
                    )}
                  </View>

                  {!isService && (
                    <View style={[
                      styles.stockStatusBadge,
                      { backgroundColor: isOutOfStock ? theme.error : theme.success }
                    ]}>
                      <Ionicons
                        name={isOutOfStock ? 'close-circle' : 'checkmark-circle'}
                        size={14}
                        color="#fff"
                      />
                      <Text style={styles.stockStatusText}>
                        {isOutOfStock ? 'Out of Stock' : `${totalStock} Available`}
                      </Text>
                    </View>
                  )}
                </View>

                {displayProduct.delivery_option && (
                  <View style={[styles.deliveryInfoContainer, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                    <Ionicons name="car-outline" size={20} color={theme.primary} />
                    <View style={styles.deliveryInfoContent}>
                      <Text style={[styles.deliveryInfoTitle, { color: theme.text }]}>Delivery Option</Text>
                      <Text style={[styles.deliveryInfoValue, { color: theme.primary }]}>
                        {formatDeliveryOption(displayProduct.delivery_option)}
                      </Text>
                    </View>
                  </View>
                )}

                {displayProduct.is_pre_order ? (
                  <View style={[styles.deliveryInfoContainer, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                    <Ionicons name="time-outline" size={20} color={theme.primary} />
                    <View style={styles.deliveryInfoContent}>
                      <Text style={[styles.deliveryInfoTitle, { color: theme.text }]}>Pre-Order</Text>
                      <Text style={[styles.deliveryInfoValue, { color: theme.primary }]}>Arrives in {displayProduct.pre_order_duration} {displayProduct.pre_order_duration_unit}</Text>
                    </View>
                  </View>
                ) : (
                  <View style={[styles.deliveryInfoContainer, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                    <Ionicons name="checkmark-circle-outline" size={20} color={theme.primary} />
                    <View style={styles.deliveryInfoContent}>
                      <Text style={[styles.deliveryInfoTitle, { color: theme.text }]}>Availability</Text>
                      <Text style={[styles.deliveryInfoValue, { color: theme.primary }]}>In Stock - Available Now</Text>
                    </View>
                  </View>
                )}

                {hasSizes && (
                  <View style={[styles.sizeSelectionSection, { backgroundColor: theme.surface }]}>
                    <View style={styles.sectionHeader}>
                      <Ionicons name="resize-outline" size={20} color={theme.text} />
                      <Text style={[styles.sectionTitle, { color: theme.text }]}>Select Size</Text>
                      <Text style={[styles.stockLabel, { color: theme.textSecondary }]}>(Stock shown per size)</Text>
                    </View>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.sizeChips}>
                      {fullProductData.sizes_available.map((size: string) => {
                        const hasSizeStockData = fullProductData.size_stock && typeof fullProductData.size_stock === 'object' && size in fullProductData.size_stock;
                        const sizeQty = hasSizeStockData ? fullProductData.size_stock[size as keyof typeof fullProductData.size_stock] : fullProductData.quantity || 0;
                        const isSizeOutOfStock = parseInt(String(sizeQty)) === 0;
                        const isSelected = selectedSize === size;

                        return (
                          <TouchableOpacity
                            key={size}
                            style={[
                              styles.sizeChip,
                              { backgroundColor: theme.card },
                              isSelected && [styles.sizeChipSelected, { borderColor: theme.primary }],
                              isSizeOutOfStock && [styles.sizeChipOutOfStock, { backgroundColor: theme.errorLight }]
                            ]}
                            onPress={() => !isSizeOutOfStock && setSelectedSize(size)}
                            disabled={isSizeOutOfStock}
                          >
                            <Text style={[
                              styles.sizeChipText,
                              { color: theme.text },
                              isSelected && [styles.sizeChipTextSelected, { color: theme.primary }],
                              isSizeOutOfStock && { color: theme.error }
                            ]}>
                              {size}
                            </Text>
                            <Text style={[
                              styles.sizeStockText,
                              { color: isSizeOutOfStock ? theme.error : theme.textSecondary }
                            ]}>
                              {isSizeOutOfStock ? 'Out of stock' : `${sizeQty} available`}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                  </View>
                )}

                {hasColors && (
                  <View style={[styles.colorSelectionSection, { backgroundColor: theme.surface }]}>
                    <View style={styles.sectionHeader}>
                      <Ionicons name="color-palette-outline" size={20} color={theme.text} />
                      <Text style={[styles.sectionTitle, { color: theme.text }]}>Select Color</Text>
                      <Text style={[styles.stockLabel, { color: theme.textSecondary }]}>(Stock shown per color)</Text>
                    </View>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.colorChips}>
                      {fullProductData.colors_available.map((color: string) => {
                        const colorQty = fullProductData.color_stock?.[color] || 0;
                        const isColorOutOfStock = parseInt(colorQty) === 0;
                        const isSelected = selectedColor === color;

                        return (
                          <TouchableOpacity
                            key={color}
                            style={[
                              styles.colorChip,
                              { backgroundColor: theme.card },
                              isSelected && [styles.colorChipSelected, { borderColor: theme.primary }],
                              isColorOutOfStock && [styles.colorChipOutOfStock, { backgroundColor: theme.errorLight }]
                            ]}
                            onPress={() => {
                              if (!isColorOutOfStock) {
                                setSelectedColor(color);
                                navigateToColorMedia(color, fullProductData);
                              }
                            }}
                            disabled={isColorOutOfStock}
                          >
                            <Text style={[
                              styles.colorChipText,
                              { color: theme.text },
                              isSelected && [styles.colorChipTextSelected, { color: theme.primary }],
                              isColorOutOfStock && { color: theme.error }
                            ]}>
                              {color}
                            </Text>
                            <Text style={[
                              styles.colorStockText,
                              { color: isColorOutOfStock ? theme.error : theme.textSecondary }
                            ]}>
                              {isColorOutOfStock ? 'Out of stock' : `${colorQty} available`}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                  </View>
                )}

                {(selectedSize || selectedColor) && !isOutOfStock && (
                  <View style={[styles.selectedOptionsSummary, { backgroundColor: theme.surface }]}>
                    <Text style={[styles.selectedOptionsTitle, { color: theme.text }]}>Selected:</Text>
                    <View style={styles.selectedOptionsRow}>
                      {selectedSize && (
                        <View style={[styles.selectedOptionChip, { backgroundColor: theme.primary }]}>
                          <Text style={styles.selectedOptionText}>Size: {selectedSize}</Text>
                        </View>
                      )}
                      {selectedColor && (
                        <View style={[styles.selectedOptionChip, { backgroundColor: theme.primary }]}>
                          <Text style={styles.selectedOptionText}>Color: {selectedColor}</Text>
                        </View>
                      )}
                      <Text style={[styles.availableStockText, { color: theme.success }]}>
                        {availableStock} available
                      </Text>
                    </View>
                  </View>
                )}

                <View style={[styles.detailsTabContainer, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                  <TouchableOpacity
                    style={[
                      styles.detailsTabButton,
                      activeDetailsTab === 'description' && [styles.detailsTabButtonActive, { backgroundColor: theme.primary }],
                    ]}
                    onPress={() => setActiveDetailsTab('description')}
                  >
                    <Text
                      style={[
                        styles.detailsTabButtonText,
                        { color: theme.textSecondary },
                        activeDetailsTab === 'description' && styles.detailsTabButtonTextActive,
                      ]}
                    >
                      Description
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.detailsTabButton,
                      activeDetailsTab === 'reviews' && [styles.detailsTabButtonActive, { backgroundColor: theme.primary }],
                    ]}
                    onPress={() => setActiveDetailsTab('reviews')}
                  >
                    <Text
                      style={[
                        styles.detailsTabButtonText,
                        { color: theme.textSecondary },
                        activeDetailsTab === 'reviews' && styles.detailsTabButtonTextActive,
                      ]}
                    >
                      Reviews
                    </Text>
                  </TouchableOpacity>
                </View>

                {activeDetailsTab === 'description' ? (
                  <>
                    <Text style={[styles.modalSectionTitle, { color: theme.text, borderBottomColor: theme.border }]}>Product Description</Text>
                    <View style={[styles.modalDescriptionCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                      <Text
                        style={[styles.modalDescription, { color: theme.textSecondary }]}
                        numberOfLines={isDescriptionExpanded ? undefined : 4}
                      >
                        {descriptionText}
                      </Text>
                      {(showDescriptionToggle || isDescriptionExpanded) && (
                        <TouchableOpacity
                          style={styles.modalDescriptionToggleButton}
                          onPress={() => setIsDescriptionExpanded(prev => !prev)}
                        >
                          <Text style={[styles.modalDescriptionToggleText, { color: theme.primary }]}>
                            {isDescriptionExpanded ? 'See less' : 'See more'}
                          </Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </>
                ) : null}

                <View style={[styles.modalSellerInfo, { borderTopColor: theme.border }]}>
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => {
                      if (displayProduct?.seller_id && onOpenSellerProfile) {
                        onClose();
                        onOpenSellerProfile(displayProduct.seller_id);
                      }
                    }}
                    disabled={!displayProduct?.seller_id || !onOpenSellerProfile}
                  >
                    <Image
                      source={{ uri: displayProduct.avatar_url }}
                      style={[styles.modalSellerAvatar, { borderColor: theme.primary }]}
                    />
                  </TouchableOpacity>
                  <View style={styles.modalSellerTextContainer}>
                    <Text style={[styles.modalSellerName, { color: theme.text }]}>Sold by: {displayProduct.display_name}</Text>
                    <Text style={[styles.modalSellerUniversity, { color: theme.textTertiary }]}>{displayProduct.university}</Text>
                  </View>
                </View>

                {activeDetailsTab === 'reviews' && displayProduct.id ? (
                  <ProductReviewsSection
                    productId={displayProduct.id}
                    currentUserId={currentUserId}
                    theme={theme}
                    showAlert={showAlert}
                    onRequireAuth={() => requireAuth('leave a review')}
                  />
                ) : null}

                <SimilarProductsSectionComponent
                  product={displayProduct}
                  onProductSelect={onSelectSimilarProduct}
                  onAddToCart={onAddToCart}
                  cartItems={cartItems}
                  showAlert={showAlert}
                  theme={theme}
                />
              </View>
            </ScrollView>
          )}

          {fromCart ? (
            <View style={[styles.modalActionBar, { borderTopColor: theme.border, backgroundColor: theme.modalBackground }]}>
              <TouchableOpacity
                style={[styles.modalPlaceOrderButton, { backgroundColor: isOutOfStock ? theme.error : '#FF4081' }]}
                onPress={handlePlaceOrder}
                disabled={isOutOfStock}
              >
                <Ionicons name="bag-check" size={20} color="#fff" />
                <Text style={styles.modalPlaceOrderButtonText}>
                  {isOutOfStock ? 'Out of Stock' : 'Place Order'}
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={[styles.modalActionBar, { borderTopColor: theme.border, backgroundColor: theme.modalBackground }]}>
              <TouchableOpacity
                style={[styles.modalAddToCartButton, {
                  backgroundColor: isOutOfStock ? theme.error : isInCart() ? theme.textTertiary : theme.primary
                }, isInCart() && styles.modalInCartButton]}
                onPress={handleAddToCart}
                disabled={addingToCart || isOutOfStock || isInCart()}
              >
                {addingToCart ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Ionicons
                    name={isInCart() ? 'checkmark-circle' : isOutOfStock ? 'close-circle' : 'cart-outline'}
                    size={20}
                    color="#fff"
                  />
                )}
                <Text style={styles.modalAddToCartButtonText}>
                  {isOutOfStock ? 'Out of Stock' : isInCart() ? 'Already in Cart' : 'Add to Cart'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalPlaceOrderButton, { backgroundColor: isOutOfStock ? theme.error : '#FF4081' }]}
                onPress={handlePlaceOrder}
                disabled={isOutOfStock}
              >
                <Ionicons name="bag-check" size={20} color="#fff" />
                <Text style={styles.modalPlaceOrderButtonText}>
                  {isOutOfStock ? 'Out of Stock' : 'Place Order'}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalCenteredView: { flex: 1, justifyContent: 'flex-end' },

  modalModalView: { borderTopLeftRadius: 20, borderTopRightRadius: 20, height: '90%', paddingTop: 15 },

  modalCloseButton: { position: 'absolute', top: 10, right: 15, zIndex: 20, borderRadius: 15, padding: 5 },

  modalLoadingContainer: {flex: 1,justifyContent: 'center',alignItems: 'center',padding: 40,},

  modalLoadingText: {fontSize: 16,marginTop: 20,},
  
  // Order Status Badge

  modalScrollContent: { paddingBottom: 100 },

  tiktokPlayThumbnailOverlay: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, justifyContent: 'center', alignItems: 'center' },

  tiktokPlayButtonSmall: { width: 56, height: 56, borderRadius: 28, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', alignItems: 'center' },

  modalDetailsContainer: { padding: 18 },

  modalTitle: { fontSize: 26, fontWeight: 'bold', marginBottom: 15 },

  modalPrice: { fontSize: 36, fontWeight: '900' },

  modalCurrency: { fontSize: 18, fontWeight: '600' },

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

  sectionTitle: {fontSize: 16,fontWeight: 'bold',marginBottom: 10,},

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

  modalSectionTitle: { fontSize: 20, fontWeight: '700', marginTop: 15, marginBottom: 10, borderBottomWidth: 1, paddingBottom: 5 },

  modalDescriptionCard: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 20,
  },

  modalDescription: { fontSize: 15, lineHeight: 24 },

  modalDescriptionToggleButton: {
    marginTop: 8,
    alignSelf: 'flex-start',
  },

  modalDescriptionToggleText: {
    fontSize: 13,
    fontWeight: '700',
  },

  modalSellerInfo: { flexDirection: 'row', alignItems: 'center', marginTop: 20, paddingTop: 20, borderTopWidth: 1 },

  modalSellerAvatar: { width: 45, height: 45, borderRadius: 27.5, marginRight: 15, borderWidth: 2 },

  modalSellerTextContainer: { flex: 1, marginLeft: 15 },

  modalSellerName: { fontWeight: '700', fontSize: 17 },

  modalSellerUniversity: { fontSize: 14 },

  modalActionBar: { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', borderTopWidth: 1, paddingHorizontal: 15, paddingVertical: 12,justifyContent: 'space-between',alignItems: 'center',},

  modalPlaceOrderButton: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 15,paddingVertical: 12,borderRadius: 10,flex: 1,marginLeft: 8,},

  modalPlaceOrderButtonText: { fontWeight: 'bold', fontSize: 14, marginLeft: 6 },
  
  // Modal Loading

  modalAddToCartButton: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 12,paddingVertical: 12,borderRadius: 10,marginHorizontal: 4,minWidth: 100,},

  modalInCartButton: { backgroundColor: '#4CAF50' },

  modalAddToCartButtonText: { fontWeight: 'bold', fontSize: 14, marginLeft: 6 },

  mediaGalleryContainer: { marginBottom: 15 },

  sizeSelectionSection: {
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
  },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },

  stockLabel: {
    fontSize: 12,
    marginLeft: 'auto',
  },

  sizeChips: {
    gap: 10,
  },

  sizeChip: {
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginRight: 8,
    borderWidth: 1,
    borderColor: 'transparent',
  },

  sizeChipSelected: {
    borderWidth: 2,
  },

  sizeChipOutOfStock: {
    opacity: 0.6,
  },

  sizeChipText: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },

  sizeChipTextSelected: {
    fontWeight: '700',
  },

  sizeStockText: {
    fontSize: 12,
  },

  colorSelectionSection: {
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
  },

  colorChips: {
    gap: 10,
  },

  colorChip: {
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginRight: 8,
    borderWidth: 1,
    borderColor: 'transparent',
  },

  colorChipSelected: {
    borderWidth: 2,
  },

  colorChipOutOfStock: {
    opacity: 0.6,
  },

  colorChipText: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },

  colorChipTextSelected: {
    fontWeight: '700',
  },

  colorStockText: {
    fontSize: 12,
  },

  selectedOptionsSummary: {
    borderRadius: 12,
    padding: 12,
    marginBottom: 15,
  },

  selectedOptionsTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },

  selectedOptionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },

  selectedOptionChip: {
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
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

  priceStockRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 15,
  },

  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },

  stockStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },

  stockStatusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },

  colorMediaNavigation: {
    marginTop: 15,
  },

  colorNavTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },

  colorNavChips: {
    gap: 8,
  },

  colorNavChip: {
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
    borderWidth: 1,
    borderColor: 'transparent',
    gap: 4,
  },

  colorNavChipSelected: {
    borderWidth: 2,
  },

  colorNavChipText: {
    fontSize: 13,
    fontWeight: '600',
  },

  colorNavChipTextSelected: {
    fontWeight: '700',
  },

  mediaPaginationDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
    gap: 7,
    minHeight: 10,
  },

  mediaDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    opacity: 0.6,
  },

  mediaActiveDot: {
    width: 22,
    height: 7,
    borderRadius: 4,
    opacity: 1,
  },

  mediaInactiveDot: {},

  mediaArrowButton: {
    position: 'absolute',
    top: '50%',
    marginTop: -18,
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 8,
  },

  mediaArrowLeft: {
    left: 10,
  },

  mediaArrowRight: {
    right: 10,
  },

  mediaCounterBadge: {
    position: 'absolute',
    right: 10,
    bottom: 10,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },

  mediaCounterText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
});
