import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  Image,
  TextInput,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';

const SUPABASE_URL = 'https://qwujadyqebfypyhfuwfl.supabase.co';

interface Product {
  id: string;
  title: string;
  price: number;
  quantity?: number;
  media_urls: string[];
  category?: string;
  colors_available?: string[];
  sizes_available?: string[];
}

interface CartItem {
  product: Product;
  quantity: number;
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

interface OrderFormModalProps {
  isVisible: boolean;
  onClose: () => void;
  product: Product | null;
  onSubmitOrder: (orderData: OrderFormData) => Promise<void>;
  isCartOrder?: boolean;
  cartTotal?: number;
  cartItems?: CartItem[];
  showAlert: (title: string, message: string, buttons?: any[]) => void;
  initialSelectedColor?: string | null;
  initialSelectedSize?: string | null;
  initialQuantity?: number | null;
  theme: any;
  styles: any;
}

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

const OrderFormModal: React.FC<OrderFormModalProps> = ({
  isVisible,
  onClose,
  product,
  onSubmitOrder,
  isCartOrder = false,
  cartTotal = 0,
  cartItems = [],
  showAlert,
  initialSelectedColor,
  initialSelectedSize,
  initialQuantity,
  theme,
  styles,
}) => {
  const { width, height } = useWindowDimensions();
  const isLargeScreen = width >= 768;
  const modalWidth = isLargeScreen ? Math.min(width * 0.8, 800) : '100%';
  const modalHeight = isLargeScreen ? Math.min(height * 0.9, 900) : '97%';

  const [orderData, setOrderData] = useState<OrderFormData>({
    fullName: '',
    phoneNumber: '',
    location: '',
    deliveryOption: 'Campus Delivery',
    additionalNotes: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [phoneError, setPhoneError] = useState('');
  const [selectedColor, setSelectedColor] = useState<string>('');
  const [selectedSize, setSelectedSize] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(1);
  const [fullProductData, setFullProductData] = useState<any>(null);
  const [availableStock, setAvailableStock] = useState<number>(0);
  const [colorSpecificMedia, setColorSpecificMedia] = useState<string[]>([]);
  const [currentPreviewImageIndex, setCurrentPreviewImageIndex] = useState(0);

  const loadColorSpecificMedia = useCallback((productData: any, color: string) => {
    if (!productData || !color) {
      const generalMedia = productData?.media_urls || product?.media_urls || [];
      const formattedMedia = generalMedia.map((url: string) => {
        if (url.startsWith('http')) {
          return url;
        }
        return `${SUPABASE_URL}/storage/v1/object/public/products/${url}`;
      });
      setColorSpecificMedia(formattedMedia);
      return;
    }

    const colorMedia = productData.color_media || {};
    const mediaForColor = colorMedia[color];

    if (mediaForColor?.length > 0) {
      const formattedMedia = mediaForColor.map((url: string) => {
        if (url.startsWith('http')) {
          return url;
        }
        return `${SUPABASE_URL}/storage/v1/object/public/products/${url}`;
      });
      const firstNonVideoIndex = formattedMedia.findIndex((u: string) => !isVideoUrl(u));
      if (firstNonVideoIndex > 0) {
        const reordered = [...formattedMedia];
        const [img] = reordered.splice(firstNonVideoIndex, 1);
        reordered.unshift(img);
        setColorSpecificMedia(reordered);
      } else {
        setColorSpecificMedia(formattedMedia);
      }
    } else {
      const generalMedia = productData.media_urls || product?.media_urls || [];
      const formattedMedia = generalMedia.map((url: string) => {
        if (url.startsWith('http')) {
          return url;
        }
        return `${SUPABASE_URL}/storage/v1/object/public/products/${url}`;
      });
      const firstNonVideoIndex = formattedMedia.findIndex((u: string) => !isVideoUrl(u));
      if (firstNonVideoIndex > 0) {
        const reordered = [...formattedMedia];
        const [img] = reordered.splice(firstNonVideoIndex, 1);
        reordered.unshift(img);
        setColorSpecificMedia(reordered);
      } else {
        setColorSpecificMedia(formattedMedia);
      }
    }
    setCurrentPreviewImageIndex(0);
  }, [product]);

  const fetchFullProductData = useCallback(async (productId: string) => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('id', productId)
        .single();

      if (error) throw error;
      setFullProductData(data);

      if (data?.colors_available?.length > 0) {
        const initialColor =
          typeof initialSelectedColor !== 'undefined' && initialSelectedColor !== null
            ? initialSelectedColor
            : data.colors_available[0];
        setSelectedColor(initialColor);
        loadColorSpecificMedia(data, initialColor);
      } else if (initialSelectedColor) {
        setSelectedColor(initialSelectedColor);
      }

      if (data?.sizes_available?.length > 0) {
        const initialSize =
          typeof initialSelectedSize !== 'undefined' && initialSelectedSize !== null
            ? initialSelectedSize
            : data.sizes_available[0];
        setSelectedSize(initialSize);
      } else if (initialSelectedSize) {
        setSelectedSize(initialSelectedSize);
      }

      if (typeof initialQuantity !== 'undefined' && initialQuantity !== null) {
        setQuantity(initialQuantity);
      }

      calculateAvailableStock(data, data.colors_available?.[0], data.sizes_available?.[0]);
    } catch (error) {
      console.error('Error fetching product details:', error);
    }
  }, [initialSelectedColor, initialSelectedSize, initialQuantity, loadColorSpecificMedia]);

  const handleLoadColorSpecificMedia = (productData: any, color: string) => {
    if (!productData || !color) {
      const generalMedia = productData?.media_urls || product?.media_urls || [];
      const formattedMedia = generalMedia.map((url: string) => {
        if (url.startsWith('http')) {
          return url;
        }
        return `${SUPABASE_URL}/storage/v1/object/public/products/${url}`;
      });
      setColorSpecificMedia(formattedMedia);
      return;
    }

    const colorMedia = productData.color_media || {};
    const mediaForColor = colorMedia[color];

    if (mediaForColor?.length > 0) {
      const formattedMedia = mediaForColor.map((url: string) => {
        if (url.startsWith('http')) {
          return url;
        }
        return `${SUPABASE_URL}/storage/v1/object/public/products/${url}`;
      });
      const firstNonVideoIndex = formattedMedia.findIndex((u: string) => !isVideoUrl(u));
      if (firstNonVideoIndex > 0) {
        const reordered = [...formattedMedia];
        const [img] = reordered.splice(firstNonVideoIndex, 1);
        reordered.unshift(img);
        setColorSpecificMedia(reordered);
      } else {
        setColorSpecificMedia(formattedMedia);
      }
    } else {
      const generalMedia = productData.media_urls || product?.media_urls || [];
      const formattedMedia = generalMedia.map((url: string) => {
        if (url.startsWith('http')) {
          return url;
        }
        return `${SUPABASE_URL}/storage/v1/object/public/products/${url}`;
      });
      const firstNonVideoIndex = formattedMedia.findIndex((u: string) => !isVideoUrl(u));
      if (firstNonVideoIndex > 0) {
        const reordered = [...formattedMedia];
        const [img] = reordered.splice(firstNonVideoIndex, 1);
        reordered.unshift(img);
        setColorSpecificMedia(reordered);
      } else {
        setColorSpecificMedia(formattedMedia);
      }
    }
    setCurrentPreviewImageIndex(0);
  };

  const calculateAvailableStock = (productData: any, color: string = '', size: string = '') => {
    if (!productData) {
      setAvailableStock(0);
      return;
    }

    if (productData.category === 'Services') {
      setAvailableStock(0);
      return;
    }

    if (productData.sizes_available?.length > 0 && size) {
      const sizeStock = productData.size_stock || {};
      const qty = parseInt(sizeStock[size] || '0');
      setAvailableStock(qty);
      return;
    }

    if (productData.colors_available?.length > 0 && color) {
      const colorStock = productData.color_stock || {};
      const qty = parseInt(colorStock[color] || '0');
      setAvailableStock(qty);
      return;
    }

    setAvailableStock(productData.quantity || 0);
  };

  const validatePhoneNumber = (phone: string) => {
    const cleanPhone = phone.replace(/[\s-]/g, '');

    if (cleanPhone.startsWith('0')) {
      setPhoneError('Phone number cannot start with 0');
      return false;
    }

    if (!/^\d+$/.test(cleanPhone)) {
      setPhoneError('Phone number must contain only digits');
      return false;
    }

    if (cleanPhone.length !== 9) {
      setPhoneError('Phone number must be 9 digits (excluding country code)');
      return false;
    }

    setPhoneError('');
    return true;
  };

  const handlePhoneChange = (text: string) => {
    const cleanText = text.replace(/[^\d]/g, '');
    setOrderData((prev) => ({ ...prev, phoneNumber: cleanText }));

    if (cleanText) {
      validatePhoneNumber(cleanText);
    } else {
      setPhoneError('');
    }
  };

  const handleQuantityChange = (change: number) => {
    const newQuantity = Math.max(1, quantity + change);

    if (fullProductData?.category !== 'Services' && newQuantity > availableStock) {
      showAlert('Insufficient Stock', `Only ${availableStock} units available`);
      return;
    }

    setQuantity(newQuantity);
  };

  const handleSizeChange = (size: string) => {
    setSelectedSize(size);
    calculateAvailableStock(fullProductData, selectedColor, size);
  };

  const handleColorChange = (color: string) => {
    setSelectedColor(color);
    handleLoadColorSpecificMedia(fullProductData, color);
    calculateAvailableStock(fullProductData, color, selectedSize);
  };

  const handleSubmit = async () => {
    if (!orderData.fullName.trim()) {
      showAlert('Error', 'Please enter your full name');
      return;
    }

    if (!orderData.phoneNumber.trim()) {
      showAlert('Error', 'Please enter your phone number');
      return;
    }

    if (!validatePhoneNumber(orderData.phoneNumber)) {
      return;
    }

    if (!orderData.location.trim()) {
      showAlert('Error', 'Please enter your location');
      return;
    }

    if (!orderData.deliveryOption) {
      showAlert('Error', 'Please choose a delivery option');
      return;
    }

    if (!isCartOrder && product) {
      if (fullProductData?.colors_available?.length > 0 && !selectedColor) {
        showAlert('Select Color', 'Please select a color before placing order.');
        return;
      }

      if (fullProductData?.sizes_available?.length > 0 && !selectedSize) {
        showAlert('Select Size', 'Please select a size before placing order.');
        return;
      }

      if (fullProductData?.category !== 'Services') {
        if (quantity > availableStock) {
          showAlert('Insufficient Stock', `Only ${availableStock} units available`);
          return;
        }
        if (availableStock <= 0) {
          showAlert('Out of Stock', 'This product is currently out of stock.');
          return;
        }
      }
    }

    if (isCartOrder && cartItems.length > 0) {
      for (const item of cartItems) {
        if (item.quantity <= 0) {
          showAlert('Error', `Invalid quantity for ${item.product.title}`);
          return;
        }
      }
    }

    setSubmitting(true);

    try {
      const orderDataWithSelections = {
        ...orderData,
        selectedColor: isCartOrder ? null : selectedColor,
        selectedSize: isCartOrder ? null : selectedSize,
        quantity: isCartOrder ? null : quantity,
      };

      await onSubmitOrder(orderDataWithSelections);
      setOrderData({
        fullName: '',
        phoneNumber: '',
        location: '',
        deliveryOption: 'Campus Delivery',
        additionalNotes: '',
      });
      setPhoneError('');
      setSelectedColor('');
      setSelectedSize('');
      setQuantity(1);
      onClose();
    } catch (error: any) {
      console.log('Order submission caught error:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const getPreviewImageUrl = () => {
    if (colorSpecificMedia.length > 0) {
      return colorSpecificMedia[currentPreviewImageIndex];
    }
    if (product?.media_urls?.[0]) {
      const url = product.media_urls[0];
      if (url.startsWith('http')) {
        return url;
      }
      return `${SUPABASE_URL}/storage/v1/object/public/products/${url}`;
    }
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(product?.title || 'Product')}&background=FF9900&color=fff`;
  };

  const handleNextImage = () => {
    if (colorSpecificMedia.length > 1) {
      setCurrentPreviewImageIndex((prev) => (prev + 1) % colorSpecificMedia.length);
    }
  };

  const handlePrevImage = () => {
    if (colorSpecificMedia.length > 1) {
      setCurrentPreviewImageIndex((prev) =>
        prev === 0 ? colorSpecificMedia.length - 1 : prev - 1,
      );
    }
  };

  useEffect(() => {
    if (isVisible && product && !isCartOrder) {
      fetchFullProductData(product.id);
      setQuantity(1);
      setCurrentPreviewImageIndex(0);
    }

    if (!isVisible) {
      setOrderData({
        fullName: '',
        phoneNumber: '',
        location: '',
        deliveryOption: 'Campus Delivery',
        additionalNotes: '',
      });
      setPhoneError('');
      setSubmitting(false);
      setSelectedColor('');
      setSelectedSize('');
      setQuantity(1);
      setFullProductData(null);
      setColorSpecificMedia([]);
      setCurrentPreviewImageIndex(0);
    }
  }, [isVisible, product, isCartOrder, fetchFullProductData]);

  if (!isVisible) return null;

  return (
    <Modal animationType="slide" transparent={true} visible={isVisible} onRequestClose={onClose}>
      <View
        style={[
          styles.orderFormOverlay,
          {
            backgroundColor: theme.modalOverlay,
            justifyContent: isLargeScreen ? 'center' : 'flex-end',
            alignItems: 'center',
          },
        ]}
      >
        <View
          style={[
            styles.orderFormContainer,
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
            },
          ]}
        >
          <View style={[styles.orderFormHeader, { borderBottomColor: theme.border }]}>
            <TouchableOpacity onPress={onClose} style={styles.orderFormCloseButton}>
              <Ionicons name="close" size={24} color={theme.text} />
            </TouchableOpacity>
            <Text style={[styles.orderFormTitle, { color: theme.text }]}>
              {isCartOrder ? 'Place Order' : `Order: ${product?.title}`}
            </Text>
            <View style={{ width: 40 }} />
          </View>
          <ScrollView style={styles.orderFormContent} showsVerticalScrollIndicator={false}>
            {!isCartOrder && product && (
              <View style={styles.orderFormSection}>
                <Text style={[styles.orderFormSectionTitle, { color: theme.primary }]}>Product Selection</Text>

                <View style={[styles.productPreview, { backgroundColor: theme.surface }]}>
                  <View style={styles.productImageContainer}>
                    <Image source={{ uri: getPreviewImageUrl() }} style={styles.productPreviewImage} resizeMode="cover" />

                    {colorSpecificMedia.length > 1 && (
                      <>
                        <TouchableOpacity
                          style={[styles.imageNavButton, styles.prevImageButton, { backgroundColor: theme.overlay }]}
                          onPress={handlePrevImage}
                        >
                          <Ionicons name="chevron-back" size={24} color="#fff" />
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.imageNavButton, styles.nextImageButton, { backgroundColor: theme.overlay }]}
                          onPress={handleNextImage}
                        >
                          <Ionicons name="chevron-forward" size={24} color="#fff" />
                        </TouchableOpacity>

                        <View style={[styles.imageCounter, { backgroundColor: theme.overlay }]}>
                          <Text style={styles.imageCounterText}>
                            {currentPreviewImageIndex + 1} / {colorSpecificMedia.length}
                          </Text>
                        </View>
                      </>
                    )}
                  </View>
                  <View style={styles.productPreviewInfo}>
                    <Text style={[styles.productPreviewTitle, { color: theme.text }]} numberOfLines={2}>
                      {product.title}
                    </Text>
                    <Text style={[styles.productPreviewPrice, { color: theme.primary }]}>GHS {product.price.toFixed(2)}</Text>

                    {selectedColor && (
                      <View style={styles.colorIndicatorContainer}>
                        <Text style={[styles.colorIndicatorLabel, { color: theme.textSecondary }]}>Selected Color:</Text>
                        <View style={[styles.colorIndicatorChip, { backgroundColor: theme.primaryLight }]}>
                          <Text style={[styles.colorIndicatorText, { color: theme.text }]}> 
                            {selectedColor}
                            {colorSpecificMedia.length > 0 && <Text style={{ fontSize: 12, color: theme.success }}> ✓</Text>}
                          </Text>
                        </View>
                        {colorSpecificMedia.length > 0 && (
                          <Text style={[styles.colorMediaCount, { color: theme.textTertiary }]}>
                            ({colorSpecificMedia.length} images available)
                          </Text>
                        )}
                      </View>
                    )}
                  </View>
                </View>

                {fullProductData?.sizes_available?.length > 0 && (
                  <View style={styles.selectionGroup}>
                    <Text style={[styles.selectionLabel, { color: theme.text }]}>Select Size</Text>
                    <View style={styles.selectionOptions}>
                      {fullProductData.sizes_available.map((size: string) => {
                        const hasSizeStockData =
                          fullProductData.size_stock &&
                          typeof fullProductData.size_stock === 'object' &&
                          size in fullProductData.size_stock;
                        const sizeQty = hasSizeStockData
                          ? fullProductData.size_stock[size as keyof typeof fullProductData.size_stock]
                          : fullProductData.quantity || 0;
                        const isOutOfStock = parseInt(String(sizeQty)) === 0;
                        const isSelected = selectedSize === size;

                        return (
                          <TouchableOpacity
                            key={size}
                            style={[
                              styles.selectionOption,
                              { backgroundColor: theme.card, borderColor: theme.border },
                              isSelected && [styles.selectionOptionSelected, { borderColor: theme.primary }],
                              isOutOfStock && styles.selectionOptionDisabled,
                            ]}
                            onPress={() => !isOutOfStock && handleSizeChange(size)}
                            disabled={isOutOfStock}
                          >
                            <Text
                              style={[
                                styles.selectionOptionText,
                                { color: theme.text },
                                isSelected && [styles.selectionOptionTextSelected, { color: theme.primary }],
                                isOutOfStock && { color: theme.textTertiary },
                              ]}
                            >
                              {size}
                            </Text>
                            {isOutOfStock && (
                              <Text style={[styles.stockLabelSmall, { color: theme.error }]}>Out of stock</Text>
                            )}
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                )}

                {fullProductData?.colors_available?.length > 0 && (
                  <View style={styles.selectionGroup}>
                    <Text style={[styles.selectionLabel, { color: theme.text }]}>Select Color</Text>
                    <View style={styles.selectionOptions}>
                      {fullProductData.colors_available.map((color: string) => {
                        const colorQty = fullProductData.color_stock?.[color] || 0;
                        const isOutOfStock = parseInt(colorQty) === 0;
                        const isSelected = selectedColor === color;
                        const hasColorMedia = fullProductData?.color_media?.[color]?.length > 0;

                        return (
                          <TouchableOpacity
                            key={color}
                            style={[
                              styles.selectionOption,
                              { backgroundColor: theme.card, borderColor: theme.border },
                              isSelected && [styles.selectionOptionSelected, { borderColor: theme.primary }],
                              isOutOfStock && styles.selectionOptionDisabled,
                            ]}
                            onPress={() => !isOutOfStock && handleColorChange(color)}
                            disabled={isOutOfStock}
                          >
                            <View style={styles.colorOptionContent}>
                              <Text
                                style={[
                                  styles.selectionOptionText,
                                  { color: theme.text },
                                  isSelected && [styles.selectionOptionTextSelected, { color: theme.primary }],
                                  isOutOfStock && { color: theme.textTertiary },
                                ]}
                              >
                                {color}
                              </Text>
                              {hasColorMedia && (
                                <Ionicons
                                  name="images"
                                  size={14}
                                  color={isSelected ? theme.primary : theme.textSecondary}
                                  style={styles.colorMediaIcon}
                                />
                              )}
                            </View>
                            {isOutOfStock && (
                              <Text style={[styles.stockLabelSmall, { color: theme.error }]}>Out of stock</Text>
                            )}
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                )}

                <View style={styles.selectionGroup}>
                  <Text style={[styles.selectionLabel, { color: theme.text }]}>Quantity</Text>
                  <View style={styles.quantitySelector}>
                    <TouchableOpacity
                      style={[styles.quantityButton, { backgroundColor: theme.surface, borderColor: theme.border }]}
                      onPress={() => handleQuantityChange(-1)}
                      disabled={quantity <= 1}
                    >
                      <Ionicons name="remove" size={20} color={theme.text} />
                    </TouchableOpacity>

                    <View style={[styles.quantityDisplay, { backgroundColor: theme.surface }]}>
                      <Text style={[styles.quantityText, { color: theme.text }]}>{quantity}</Text>
                    </View>

                    <TouchableOpacity
                      style={[styles.quantityButton, { backgroundColor: theme.surface, borderColor: theme.border }]}
                      onPress={() => handleQuantityChange(1)}
                      disabled={fullProductData?.category !== 'Services' && quantity >= availableStock}
                    >
                      <Ionicons name="add" size={20} color={theme.text} />
                    </TouchableOpacity>

                    <Text style={[styles.stockText, { color: theme.textSecondary }]}>
                      {fullProductData?.category === 'Services' ? 'Service' : `${availableStock} available`}
                    </Text>
                  </View>
                </View>

                {(selectedSize || selectedColor) && (
                  <View style={[styles.selectedOptionsSummary, { backgroundColor: theme.surface }]}>
                    <Text style={[styles.selectedOptionsTitle, { color: theme.text }]}>Selected Options:</Text>
                    <View style={styles.selectedOptionsRow}>
                      {selectedSize && (
                        <View style={[styles.selectedOptionChip, { backgroundColor: theme.primaryLight }]}>
                          <Text style={[styles.selectedOptionText, { color: theme.text }]}>Size: {selectedSize}</Text>
                        </View>
                      )}
                      {selectedColor && (
                        <View style={[styles.selectedOptionChip, { backgroundColor: theme.primaryLight }]}>
                          <Text style={[styles.selectedOptionText, { color: theme.text }]}>Color: {selectedColor}</Text>
                        </View>
                      )}
                      <View style={[styles.selectedOptionChip, { backgroundColor: theme.primaryLight }]}>
                        <Text style={[styles.selectedOptionText, { color: theme.text }]}>Qty: {quantity}</Text>
                      </View>
                    </View>
                  </View>
                )}
              </View>
            )}

            {isCartOrder && cartItems.length > 0 && (
              <View style={styles.orderFormSection}>
                <Text style={[styles.orderFormSectionTitle, { color: theme.primary }]}>Cart Summary</Text>
                <View style={[styles.cartSummary, { backgroundColor: theme.surface }]}>
                  {cartItems.map((item, index) => (
                    <View
                      key={index}
                      style={[
                        styles.cartSummaryItem,
                        {
                          borderBottomColor: theme.border,
                          borderBottomWidth: index < cartItems.length - 1 ? 1 : 0,
                        },
                      ]}
                    >
                      <View style={styles.cartSummaryItemInfo}>
                        <Text style={[styles.cartSummaryItemTitle, { color: theme.text }]} numberOfLines={1}>
                          {item.product.title}
                        </Text>
                        <Text style={[styles.cartSummaryItemQty, { color: theme.textSecondary }]}>Qty: {item.quantity}</Text>
                      </View>
                      <Text style={[styles.cartSummaryItemPrice, { color: theme.primary }]}>
                        GHS {(item.product.price * item.quantity).toFixed(2)}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            <View style={styles.orderFormSection}>
              <Text style={[styles.orderFormSectionTitle, { color: theme.primary }]}>Contact Information</Text>

              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { color: theme.text }]}>Full Name *</Text>
                <TextInput
                  style={[
                    styles.formInput,
                    {
                      backgroundColor: theme.surface,
                      color: theme.text,
                      borderColor: theme.border,
                    },
                  ]}
                  placeholder="Enter your full name"
                  placeholderTextColor={theme.textTertiary}
                  value={orderData.fullName}
                  onChangeText={(text) => setOrderData((prev) => ({ ...prev, fullName: text }))}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { color: theme.text }]}>Phone Number *</Text>
                <View style={styles.phoneInputContainer}>
                  <View
                    style={[
                      styles.countryCodeContainer,
                      {
                        backgroundColor: theme.surface,
                        borderColor: theme.border,
                      },
                    ]}
                  >
                    <Text style={[styles.countryCodeText, { color: theme.text }]}>+233</Text>
                  </View>
                  <TextInput
                    style={[
                      styles.formInput,
                      styles.phoneInput,
                      {
                        backgroundColor: theme.surface,
                        color: theme.text,
                        borderColor: theme.border,
                      },
                    ]}
                    placeholder="Enter your phone number"
                    placeholderTextColor={theme.textTertiary}
                    keyboardType="phone-pad"
                    value={orderData.phoneNumber}
                    onChangeText={handlePhoneChange}
                    maxLength={9}
                  />
                </View>
                {phoneError ? <Text style={[styles.errorText, { color: theme.error }]}>{phoneError}</Text> : null}
                <Text style={[styles.helperText, { color: theme.textTertiary }]}>Enter 9-digit number (without leading 0).</Text>
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { color: theme.text }]}>Location *</Text>
                <TextInput
                  style={[
                    styles.formInput,
                    {
                      backgroundColor: theme.surface,
                      color: theme.text,
                      borderColor: theme.border,
                    },
                  ]}
                  placeholder="Enter your delivery location"
                  placeholderTextColor={theme.textTertiary}
                  value={orderData.location}
                  onChangeText={(text) => setOrderData((prev) => ({ ...prev, location: text }))}
                />
              </View>
            </View>

            <View style={styles.orderFormSection}>
              <Text style={[styles.orderFormSectionTitle, { color: theme.primary }]}>Delivery Options</Text>

              <TouchableOpacity
                style={[
                  styles.deliveryOption,
                  { backgroundColor: theme.surface, borderColor: theme.border },
                  orderData.deliveryOption === 'Campus Delivery' && [styles.deliveryOptionSelected, { borderColor: theme.primary }],
                ]}
                onPress={() => setOrderData((prev) => ({ ...prev, deliveryOption: 'Campus Delivery' }))}
              >
                <View style={[styles.deliveryOptionRadio, { borderColor: theme.primary }]}>
                  {orderData.deliveryOption === 'Campus Delivery' && (
                    <View style={[styles.deliveryOptionRadioSelected, { backgroundColor: theme.primary }]} />
                  )}
                </View>
                <View style={styles.deliveryOptionContent}>
                  <Ionicons name="car" size={24} color={theme.primary} />
                  <View style={styles.deliveryOptionText}>
                    <Text style={[styles.deliveryOptionTitle, { color: theme.text }]}>Campus Delivery</Text>
                    <Text style={[styles.deliveryOptionDescription, { color: theme.textSecondary }]}>Product will be delivered to your location</Text>
                  </View>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.deliveryOption,
                  { backgroundColor: theme.surface, borderColor: theme.border },
                  orderData.deliveryOption === 'Meetup / Pickup' && [styles.deliveryOptionSelected, { borderColor: theme.primary }],
                ]}
                onPress={() => setOrderData((prev) => ({ ...prev, deliveryOption: 'Meetup / Pickup' }))}
              >
                <View style={[styles.deliveryOptionRadio, { borderColor: theme.primary }]}>
                  {orderData.deliveryOption === 'Meetup / Pickup' && (
                    <View style={[styles.deliveryOptionRadioSelected, { backgroundColor: theme.primary }]} />
                  )}
                </View>
                <View style={styles.deliveryOptionContent}>
                  <Ionicons name="storefront" size={24} color={theme.primary} />
                  <View style={styles.deliveryOptionText}>
                    <Text style={[styles.deliveryOptionTitle, { color: theme.text }]}>Meetup / Pickup</Text>
                    <Text style={[styles.deliveryOptionDescription, { color: theme.textSecondary }]}>Pick up product from seller&apos;s location</Text>
                  </View>
                </View>
              </TouchableOpacity>
            </View>

            <View style={styles.orderFormSection}>
              <Text style={[styles.orderFormSectionTitle, { color: theme.primary }]}>Additional Notes (Optional)</Text>
              <TextInput
                style={[
                  styles.formInput,
                  styles.textArea,
                  {
                    backgroundColor: theme.surface,
                    color: theme.text,
                    borderColor: theme.border,
                  },
                ]}
                placeholder="Any special instructions or notes for the seller..."
                placeholderTextColor={theme.textTertiary}
                value={orderData.additionalNotes}
                onChangeText={(text) => setOrderData((prev) => ({ ...prev, additionalNotes: text }))}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>

            {isCartOrder && (
              <View style={[styles.orderTotalSection, { backgroundColor: theme.surface }]}>
                <Text style={[styles.orderTotalText, { color: theme.primary }]}>Total Amount: GHS {cartTotal.toFixed(2)}</Text>
              </View>
            )}

            {!isCartOrder && product && (
              <View style={[styles.orderTotalSection, { backgroundColor: theme.surface }]}>
                <Text style={[styles.orderTotalText, { color: theme.primary }]}>Subtotal: GHS {(product.price * quantity).toFixed(2)}</Text>
                <Text style={[styles.orderSummaryText, { color: theme.textSecondary }]}>
                  {quantity} × GHS {product.price.toFixed(2)} each
                </Text>
              </View>
            )}
          </ScrollView>

          <View style={[styles.orderFormFooter, { borderTopColor: theme.border }]}>
            <TouchableOpacity
              style={[styles.submitOrderButton, { backgroundColor: theme.primary }, submitting && styles.submitOrderButtonDisabled]}
              onPress={handleSubmit}
              disabled={submitting}
            >
              {submitting ? (
                <View style={styles.submitOrderLoading}>
                  <ActivityIndicator size="small" color="#fff" />
                  <Text style={styles.submitOrderButtonText}>Processing...</Text>
                </View>
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={22} color="#fff" />
                  <Text style={styles.submitOrderButtonText}>{isCartOrder ? 'Place Order' : 'Confirm Order'}</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default OrderFormModal;