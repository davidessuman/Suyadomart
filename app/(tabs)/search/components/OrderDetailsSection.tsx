import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, Image, ActivityIndicator, useColorScheme } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ResponsiveVideo from '@/components/ResponsiveVideo';
import { useLocalSearchParams, useRouter } from 'expo-router';

type Product = {
  id: string;
  title: string;
  price: number;
  quantity?: number;
  media_urls: string[];
  color_media?: Record<string, string[]>;
  color_stock?: Record<string, number | Record<string, number>>;
  size_stock?: Record<string, number>;
  sizes_available?: string[];
  colors_available?: string[];
};

type CartItem = {
  product: Product;
  quantity: number;
  selectedColor?: string;
  selectedSize?: string;
};

const PRIMARY_COLOR = '#F68B1E';
const LIGHT_TEXT = '#333333';
const DARK_TEXT = '#FFFFFF';

const PaymentNotice = () => (
  <View style={{ backgroundColor: '#FFF3CD', borderColor: '#FF9900', borderWidth: 1, borderRadius: 8, padding: 12, marginBottom: 16, flexDirection: 'row', alignItems: 'center' }}>
    <Ionicons name="warning" size={22} color="#FF9900" style={{ marginRight: 8 }} />
    <Text style={{ color: '#856404', fontWeight: 'bold', flex: 1 }}>
      ⚠️ Please only make payment on delivery. Do not pay in advance to avoid scammers.
    </Text>
  </View>
);

export const OrderDetailsSection: React.FC<{
  product: Product;
  selectedColor?: string;
  selectedSize?: string;
  quantity: number;
  onColorSelect: (color: string) => void;
  onSizeSelect: (size: string) => void;
  onQuantityChange: (quantity: number) => void;
  isCartOrder?: boolean;
  cartItems?: CartItem[];
  styles: any;
  getCardDisplayMedia: (mediaUrls: string[] | undefined) => string | undefined;
}> = ({
  product,
  selectedColor,
  selectedSize,
  quantity,
  onColorSelect,
  onSizeSelect,
  onQuantityChange,
  isCartOrder = false,
  cartItems = [],
  styles,
  getCardDisplayMedia,
}) => {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const textColor = isDark ? DARK_TEXT : LIGHT_TEXT;
  const borderColor = isDark ? '#333' : '#e0e0e0';
  const cardBackground = isDark ? '#1e1e1e' : '#ffffff';

  const getMediaForColor = (color?: string) => {
    if (!color || !product.color_media?.[color]) {
      return product.media_urls;
    }
    return product.color_media[color];
  };

  const currentMedia = getMediaForColor(selectedColor);

  const getAvailableStock = () => {
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

  if (isCartOrder) {
    return (
      <View style={[styles.productDetailsSection, { borderBottomColor: borderColor }]}>
        <Text style={[styles.productDetailsTitle, { color: PRIMARY_COLOR }]}>Order Summary</Text>

        {cartItems.map((item, index) => (
          <View key={`${item.product.id}_${item.selectedColor}_${item.selectedSize}_${index}`}>
            <View style={[styles.cartItemDetail, { backgroundColor: cardBackground, borderColor }]}>
              <Image
                source={{ uri: getCardDisplayMedia(item.product.media_urls) || 'https://via.placeholder.com/400' }}
                style={styles.cartDetailImage}
              />
              <View style={styles.cartDetailInfo}>
                <Text style={[styles.cartDetailTitle, { color: textColor }]} numberOfLines={2}>
                  {item.product.title}
                </Text>

                {(item.selectedColor || item.selectedSize) && (
                  <View style={styles.variantDetails}>
                    {item.selectedColor && (
                      <View style={styles.variantTag}>
                        <Text style={[styles.variantLabel, { color: textColor }]}>Color:</Text>
                        <View style={[styles.colorPreview, { backgroundColor: item.selectedColor }]} />
                        <Text style={[styles.variantValue, { color: textColor }]}>{item.selectedColor}</Text>
                      </View>
                    )}
                    {item.selectedSize && (
                      <View style={styles.variantTag}>
                        <Text style={[styles.variantLabel, { color: textColor }]}>Size:</Text>
                        <Text style={[styles.variantValue, { color: textColor }]}>{item.selectedSize}</Text>
                      </View>
                    )}
                  </View>
                )}

                <View style={styles.quantityPriceRow}>
                  <Text style={[styles.quantityText, { color: textColor }]}>Qty: {item.quantity}</Text>
                  <Text style={[styles.priceText, { color: PRIMARY_COLOR }]}>
                    GH₵ {(item.product.price * item.quantity).toFixed(2)}
                  </Text>
                </View>
              </View>
            </View>
            {index < cartItems.length - 1 && (
              <View style={[styles.cartItemSeparator, { backgroundColor: borderColor }]} />
            )}
          </View>
        ))}
      </View>
    );
  }

  return (
    <View style={[styles.productDetailsSection, { borderBottomColor: borderColor }]}>
      <PaymentNotice />
      <Text style={[styles.productDetailsTitle, { color: PRIMARY_COLOR }]}>Product Details</Text>

      <View style={[styles.productPreviewContainer, { backgroundColor: cardBackground, borderColor }]}>
        <View style={styles.productPreviewHeader}>
          <Text style={[styles.productPreviewTitle, { color: textColor }]} numberOfLines={2}>
            {product.title}
          </Text>
          <Text style={[styles.productPreviewPrice, { color: PRIMARY_COLOR }]}>GH₵ {product.price.toFixed(2)}</Text>
        </View>

        <View style={styles.productPreviewContent}>
          {currentMedia && currentMedia.length > 0 && (
            <View style={styles.productMediaThumbnail}>
              {currentMedia[0].toLowerCase().includes('.mp4') ? (
                <ResponsiveVideo
                  uri={currentMedia[0]}
                  autoPlay={false}
                  controls={false}
                  containerStyle={[styles.productThumbnailImage, { backgroundColor: '#000', borderRadius: 12 }]}
                />
              ) : (
                <Image
                  source={{ uri: currentMedia[0] || 'https://via.placeholder.com/400' }}
                  style={styles.productThumbnailImage}
                  resizeMode="contain"
                />
              )}
            </View>
          )}

          <View style={styles.selectedOptionsContainer}>
            <View style={styles.selectedOptionsRow}>
              {(selectedColor || selectedSize) && (
                <View style={styles.selectedOptionsBadge}>
                  <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
                  <Text style={[styles.selectedOptionsTitle, { color: textColor }]}>Selected Options:</Text>
                </View>
              )}

              {selectedColor && (
                <View style={styles.selectedOptionItem}>
                  <Text style={[styles.selectedOptionLabel, { color: textColor }]}>Color:</Text>
                  <View style={styles.selectedColorOption}>
                    <View style={[styles.selectedColorCircle, { backgroundColor: selectedColor }]} />
                    <Text style={[styles.selectedColorText, { color: textColor }]}>{selectedColor}</Text>
                  </View>
                </View>
              )}

              {selectedSize && (
                <View style={styles.selectedOptionItem}>
                  <Text style={[styles.selectedOptionLabel, { color: textColor }]}>Size:</Text>
                  <View style={[styles.selectedSizeBadge, { backgroundColor: PRIMARY_COLOR + '20' }]}>
                    <Text style={[styles.selectedSizeText, { color: PRIMARY_COLOR }]}>{selectedSize}</Text>
                  </View>
                </View>
              )}

              <View style={styles.selectedOptionItem}>
                <Text style={[styles.selectedOptionLabel, { color: textColor }]}>Quantity:</Text>
                <View style={styles.quantityBadge}>
                  <Text style={[styles.quantityValue, { color: PRIMARY_COLOR }]}>{quantity}</Text>
                </View>
              </View>
            </View>

            <View style={styles.selectedOptionsFooter}>
              <Text style={[styles.totalLabel, { color: textColor }]}>Total:</Text>
              <Text style={[styles.totalPricePreview, { color: PRIMARY_COLOR }]}>GH₵ {(product.price * quantity).toFixed(2)}</Text>
            </View>
          </View>
        </View>
      </View>

      {product.colors_available && product.colors_available.length > 0 && (
        <View style={styles.variantSection}>
          <Text style={[styles.variantSectionTitle, { color: textColor }]}>Select Color:</Text>
          <View style={styles.colorSelectionGrid}>
            {product.colors_available.map((color) => {
              const colorMedia = product.color_media?.[color];
              const isSelected = selectedColor === color;

              return (
                <TouchableOpacity
                  key={color}
                  style={[
                    styles.colorOptionModern,
                    isSelected && styles.colorOptionModernSelected,
                    { borderColor: isSelected ? PRIMARY_COLOR : borderColor },
                  ]}
                  onPress={() => onColorSelect(color)}
                >
                  <View style={styles.colorPreviewModern}>
                    {colorMedia && colorMedia.length > 0 ? (
                      <Image source={{ uri: colorMedia[0] || 'https://via.placeholder.com/400' }} style={styles.colorPreviewImage} resizeMode="cover" />
                    ) : (
                      <View style={[styles.colorCircleModern, { backgroundColor: color }]} />
                    )}

                    {isSelected && (
                      <View style={styles.colorSelectionCheck}>
                        <Ionicons name="checkmark" size={16} color="#fff" />
                      </View>
                    )}
                  </View>

                  <Text
                    style={[
                      styles.colorTextModern,
                      {
                        color: isSelected ? PRIMARY_COLOR : textColor,
                        fontWeight: isSelected ? '600' : '400',
                      },
                    ]}
                  >
                    {color}
                  </Text>

                  {product.color_stock?.[color] && (
                    <Text
                      style={[
                        styles.colorStockText,
                        {
                          color: Number(product.color_stock[color]) > 0 ? '#4CAF50' : '#FF3B30',
                          backgroundColor: Number(product.color_stock[color]) > 0 ? '#4CAF5020' : '#FF3B3020',
                        },
                      ]}
                    >
                      {Number(product.color_stock[color]) > 0 ? `${product.color_stock[color]} left` : 'Out of stock'}
                    </Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      )}

      {product.sizes_available && product.sizes_available.length > 0 && (
        <View style={styles.variantSection}>
          <Text style={[styles.variantSectionTitle, { color: textColor }]}>Select Size:</Text>
          <View style={styles.sizeSelectionGrid}>
            {product.sizes_available.map((size) => {
              const getColorStock = (color: string, selectedProductSize: string): number => {
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
              const sizeStockValue = hasSizeStockData ? product.size_stock![size as keyof typeof product.size_stock] : null;
              const isOutOfStock = selectedColor
                ? getColorStock(selectedColor, size) <= 0
                : hasSizeStockData
                  ? Number(sizeStockValue) <= 0
                  : (product.quantity ?? 0) <= 0;
              const isSelected = selectedSize === size;

              return (
                <TouchableOpacity
                  key={size}
                  style={[
                    styles.sizeOptionModern,
                    isSelected && styles.sizeOptionModernSelected,
                    isOutOfStock && styles.sizeOptionModernDisabled,
                    {
                      borderColor: isSelected ? PRIMARY_COLOR : borderColor,
                      backgroundColor: isOutOfStock ? (isDark ? '#2a2a2a' : '#f0f0f0') : 'transparent',
                    },
                  ]}
                  onPress={() => !isOutOfStock && onSizeSelect(size)}
                  disabled={isOutOfStock}
                >
                  <Text
                    style={[
                      styles.sizeTextModern,
                      {
                        color: isSelected ? PRIMARY_COLOR : isOutOfStock ? (isDark ? '#666' : '#999') : textColor,
                        fontWeight: isSelected ? '700' : '400',
                      },
                    ]}
                  >
                    {size}
                  </Text>

                  {isSelected && (
                    <View style={styles.sizeSelectionIndicator}>
                      <Ionicons name="checkmark" size={14} color={PRIMARY_COLOR} />
                    </View>
                  )}

                  {isOutOfStock && (
                    <View style={styles.outOfStockBadge}>
                      <Text style={styles.outOfStockText}>Out of stock</Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={[styles.sizeGuideContainer, { backgroundColor: isDark ? '#1a1a1a' : '#f8f8f8', borderColor }]}>
            <Ionicons name="information-circle-outline" size={16} color={PRIMARY_COLOR} />
            <Text style={[styles.sizeGuideText, { color: isDark ? '#aaa' : '#666' }]}>Select your size carefully. Size availability depends on selected color.</Text>
          </View>
        </View>
      )}

      <View style={[styles.quantitySectionModern, { backgroundColor: cardBackground, borderColor }]}>
        <Text style={[styles.quantityLabelModern, { color: textColor }]}>Quantity</Text>
        <View style={styles.quantityControlsModern}>
          <TouchableOpacity
            style={[styles.quantityButtonModern, { backgroundColor: isDark ? '#333' : '#f0f0f0' }]}
            onPress={() => quantity > 1 && onQuantityChange(quantity - 1)}
            disabled={quantity <= 1}
          >
            <Ionicons name="remove" size={20} color={quantity <= 1 ? '#ccc' : textColor} />
          </TouchableOpacity>

          <View style={[styles.quantityDisplayModern, { borderColor }]}>
            <Text style={[styles.quantityValueModern, { color: textColor }]}>{quantity}</Text>
          </View>

          <TouchableOpacity
            style={[styles.quantityButtonModern, { backgroundColor: isDark ? '#333' : '#f0f0f0' }]}
            onPress={() => quantity < availableStock && onQuantityChange(quantity + 1)}
            disabled={quantity >= availableStock}
          >
            <Ionicons name="add" size={20} color={quantity >= availableStock ? '#ccc' : textColor} />
          </TouchableOpacity>

          <View style={styles.quantityInfo}>
            <Text style={[styles.stockTextModern, { color: availableStock > 0 ? '#4CAF50' : '#FF3B30' }]}>
              {availableStock > 0 ? `${availableStock} available` : 'Out of stock'}
            </Text>
            <Text style={[styles.pricePerUnit, { color: isDark ? '#aaa' : '#666' }]}>GH₵ {product.price.toFixed(2)} each</Text>
          </View>
        </View>
      </View>

      <View style={[styles.totalSummaryContainer, { backgroundColor: cardBackground, borderColor }]}>
        <View style={styles.totalSummaryRow}>
          <Text style={[styles.totalSummaryLabel, { color: textColor }]}>Subtotal</Text>
          <Text style={[styles.totalSummaryValue, { color: textColor }]}>GH₵ {(product.price * quantity).toFixed(2)}</Text>
        </View>
        <View style={[styles.totalSummaryDivider, { backgroundColor: borderColor }]} />
        <View style={styles.totalSummaryRow}>
          <Text style={[styles.finalTotalLabel, { color: textColor }]}>Total</Text>
          <Text style={[styles.finalTotalValue, { color: PRIMARY_COLOR }]}>GH₵ {(product.price * quantity).toFixed(2)}</Text>
        </View>
      </View>
    </View>
  );
};

export default function OrderDetailsSectionRoute() {
  const router = useRouter();
  const params = useLocalSearchParams<{ productId?: string | string[] }>();

  useEffect(() => {
    const productId = Array.isArray(params.productId) ? params.productId[0] : params.productId;
    if (productId) {
      router.replace({ pathname: '/(tabs)/search', params: { productId } });
      return;
    }
    router.replace('/(tabs)/search');
  }, [params.productId, router]);

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#121212' }}>
      <ActivityIndicator size="large" color={PRIMARY_COLOR} />
      <Text style={{ marginTop: 12, color: '#FFFFFF' }}>Opening product details…</Text>
    </View>
  );
}
