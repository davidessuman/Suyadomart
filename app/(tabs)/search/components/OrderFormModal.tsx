import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  ScrollView,
  useColorScheme,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { OrderDetailsSection } from './OrderDetailsSection';

type AlertButton = {
  text: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive';
};

type Product = {
  id: string;
  title: string;
  description?: string;
  price: number;
  quantity?: number;
  media_urls: string[];
  colors_available?: string[];
  sizes_available?: string[];
  color_media?: Record<string, string[]>;
  color_stock?: Record<string, number | Record<string, number>>;
  size_stock?: Record<string, number>;
};

type CartItem = {
  product: Product;
  quantity: number;
  added_at?: string;
  selectedColor?: string;
  selectedSize?: string;
};

type OrderFormData = {
  fullName: string;
  phoneNumber: string;
  location: string;
  deliveryOption: 'Meetup / Pickup' | 'Campus Delivery';
  additionalNotes?: string;
  selectedColor?: string;
  selectedSize?: string;
};

const PRIMARY_COLOR = '#F68B1E';
const LIGHT_BACKGROUND = '#FFFFFF';
const DARK_BACKGROUND = '#121212';
const LIGHT_TEXT = '#333333';
const DARK_TEXT = '#FFFFFF';

const OrderFormModal: React.FC<{
  isVisible: boolean;
  onClose: () => void;
  product: Product | null;
  onSubmitOrder: (orderData: OrderFormData) => Promise<void>;
  isCartOrder?: boolean;
  cartTotal?: number;
  showAlert: (title: string, message: string, buttons?: AlertButton[]) => void;
  cartItems?: CartItem[];
  initialSelectedColor?: string | null;
  initialSelectedSize?: string | null;
  styles: any;
  getCardDisplayMedia: (mediaUrls: string[] | undefined) => string | undefined;
}> = ({
  isVisible,
  onClose,
  product,
  onSubmitOrder,
  isCartOrder = false,
  cartTotal = 0,
  showAlert,
  cartItems = [],
  initialSelectedColor = null,
  initialSelectedSize = null,
  styles,
  getCardDisplayMedia,
}) => {
  const [orderData, setOrderData] = useState<OrderFormData>({
    fullName: '',
    phoneNumber: '',
    location: '',
    deliveryOption: 'Meetup / Pickup',
    additionalNotes: '',
    selectedColor: undefined,
    selectedSize: undefined,
  });
  const [quantity, setQuantity] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [phoneError, setPhoneError] = useState('');
  const colorScheme = useColorScheme();
  const { width } = useWindowDimensions();
  const isLargeScreen = width >= 768;
  const modalWidth = isLargeScreen ? Math.min(width * 0.8, 800) : '100%';

  useEffect(() => {
    if (!isVisible) {
      // Reset form when modal closes
      setOrderData({
        fullName: '',
        phoneNumber: '',
        location: '',
        deliveryOption: 'Meetup / Pickup',
        additionalNotes: '',
        selectedColor: undefined,
        selectedSize: undefined,
      });
      setQuantity(1);
      setPhoneError('');
      setOrderData(prev => ({ ...prev, selectedColor: undefined, selectedSize: undefined }));
    }
  }, [isVisible]);

  useEffect(() => {
    // When modal opens for a specific product, populate initial selections if provided
    if (isVisible && product) {
      setOrderData(prev => ({ ...prev, selectedColor: initialSelectedColor ?? prev.selectedColor, selectedSize: initialSelectedSize ?? prev.selectedSize }));
    }
  }, [isVisible, product, initialSelectedColor, initialSelectedSize]);

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
    setOrderData(prev => ({ ...prev, phoneNumber: cleanText }));

    if (cleanText) {
      validatePhoneNumber(cleanText);
    } else {
      setPhoneError('');
    }
  };

  const handleSubmit = async () => {
    // Validate product details for single product order
    if (!isCartOrder && product) {
      // Check if color is required and selected
      if (product.colors_available && product.colors_available.length > 0 && !orderData.selectedColor) {
        showAlert('Selection Required', 'Please select a color for this product');
        return;
      }

      // Check if size is required and selected
      if (product.sizes_available && product.sizes_available.length > 0 && !orderData.selectedSize) {
        showAlert('Selection Required', 'Please select a size for this product');
        return;
      }
    }

    // Validate contact information
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

    setSubmitting(true);
    try {
      await onSubmitOrder({
        ...orderData,
        ...(!isCartOrder && product ? { quantity } : {}),
      });
    } catch (error: any) {
      showAlert('Order Failed', error.message || 'Failed to submit order. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isVisible) return null;

  const isDark = colorScheme === 'dark';
  const backgroundColor = isDark ? DARK_BACKGROUND : LIGHT_BACKGROUND;
  const textColor = isDark ? DARK_TEXT : LIGHT_TEXT;
  const cardBackground = isDark ? '#1e1e1e' : '#ffffff';
  const borderColor = isDark ? '#333' : '#e0e0e0';
  const inputBackground = isDark ? '#252525' : '#f8f8f8';

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={isVisible}
      onRequestClose={onClose}
    >
      <View
        style={[
          styles.orderFormOverlay,
          {
            backgroundColor: 'rgba(0,0,0,0.9)',
            justifyContent: isLargeScreen ? 'center' : 'flex-end',
            alignItems: isLargeScreen ? 'center' : 'stretch',
          },
        ]}
      >
        <View
          style={[
            styles.orderFormContainer,
            {
              backgroundColor,
              width: modalWidth,
              maxWidth: 800,
              height: isLargeScreen ? '90%' : '85%',
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              borderBottomLeftRadius: isLargeScreen ? 20 : 0,
              borderBottomRightRadius: isLargeScreen ? 20 : 0,
            },
          ]}
        >
          <View style={[styles.orderFormHeader, { borderBottomColor: borderColor }]}>
            <TouchableOpacity onPress={onClose} style={styles.orderFormCloseButton}>
              <Ionicons name="close" size={24} color={textColor} />
            </TouchableOpacity>
            <Text style={[styles.orderFormTitle, { color: textColor }]}>
              {isCartOrder ? 'Place Order' : `Order: ${product?.title}`}
            </Text>
            <View style={{ width: 40 }} />
          </View>

          <ScrollView style={styles.orderFormContent}>

            {/* Product Details Section - Shows above contact info */}
            {!isCartOrder && product && (
              <OrderDetailsSection
                product={product}
                selectedColor={orderData.selectedColor}
                selectedSize={orderData.selectedSize}
                quantity={quantity}
                onColorSelect={(color) => setOrderData(prev => ({ ...prev, selectedColor: color }))}
                onSizeSelect={(size) => setOrderData(prev => ({ ...prev, selectedSize: size }))}
                onQuantityChange={setQuantity}
                styles={styles}
                getCardDisplayMedia={getCardDisplayMedia}
              />
            )}

            {/* Cart Order Summary */}
            {isCartOrder && cartItems.length > 0 && (
              <OrderDetailsSection
                product={cartItems[0].product} // Pass first product for type, but render all cart items
                isCartOrder={true}
                cartItems={cartItems}
                selectedColor={undefined}
                selectedSize={undefined}
                quantity={0}
                onColorSelect={() => {}}
                onSizeSelect={() => {}}
                onQuantityChange={() => {}}
                styles={styles}
                getCardDisplayMedia={getCardDisplayMedia}
              />
            )}



            <View style={styles.orderFormSection}>
              <Text style={[styles.orderFormSectionTitle, { color: PRIMARY_COLOR }]}>Contact Information</Text>

              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { color: textColor }]}>Full Name *</Text>
                <TextInput
                  style={[styles.formInput, {
                    backgroundColor: inputBackground,
                    borderColor,
                    color: textColor
                  }]}
                  placeholder="Enter your full name"
                  placeholderTextColor={isDark ? '#888' : '#999'}
                  value={orderData.fullName}
                  onChangeText={(text) => setOrderData(prev => ({ ...prev, fullName: text }))}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { color: textColor }]}>Phone Number *</Text>
                <View style={styles.phoneInputContainer}>
                  <View style={[styles.countryCodeContainer, {
                    backgroundColor: inputBackground,
                    borderColor
                  }]}>
                    <Text style={[styles.countryCodeText, { color: textColor }]}>+233</Text>
                  </View>
                  <TextInput
                    style={[styles.formInput, styles.phoneInput, {
                      backgroundColor: inputBackground,
                      borderColor,
                      color: textColor
                    }]}
                    placeholder="Enter your phone number"
                    placeholderTextColor={isDark ? '#888' : '#999'}
                    keyboardType="phone-pad"
                    value={orderData.phoneNumber}
                    onChangeText={handlePhoneChange}
                    maxLength={9}
                  />
                </View>
                {phoneError ? <Text style={styles.errorText}>{phoneError}</Text> : null}
                <Text style={[styles.helperText, { color: isDark ? '#888' : '#666' }]}>
                  Enter 9-digit number (without leading 0).
                </Text>
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { color: textColor }]}>Location *</Text>
                <TextInput
                  style={[styles.formInput, {
                    backgroundColor: inputBackground,
                    borderColor,
                    color: textColor
                  }]}
                  placeholder="Enter your delivery location"
                  placeholderTextColor={isDark ? '#888' : '#999'}
                  value={orderData.location}
                  onChangeText={(text) => setOrderData(prev => ({ ...prev, location: text }))}
                />
              </View>
            </View>

            <View style={styles.orderFormSection}>
              <Text style={[styles.orderFormSectionTitle, { color: PRIMARY_COLOR }]}>Delivery Options</Text>

              <TouchableOpacity
                style={[
                  styles.deliveryOption,
                  orderData.deliveryOption === 'Campus Delivery' && styles.deliveryOptionSelected,
                  {
                    backgroundColor: cardBackground,
                    borderColor: orderData.deliveryOption === 'Campus Delivery' ? PRIMARY_COLOR : borderColor
                  }
                ]}
                onPress={() => setOrderData(prev => ({ ...prev, deliveryOption: 'Campus Delivery' }))}
              >
                <View style={styles.deliveryOptionRadio}>
                  {orderData.deliveryOption === 'Campus Delivery' && (
                    <View style={styles.deliveryOptionRadioSelected} />
                  )}
                </View>
                <View style={styles.deliveryOptionContent}>
                  <Ionicons name="car" size={24} color={PRIMARY_COLOR} />
                  <View style={styles.deliveryOptionText}>
                    <Text style={[styles.deliveryOptionTitle, { color: textColor }]}>Campus Delivery</Text>
                    <Text style={[styles.deliveryOptionDescription, { color: isDark ? '#aaa' : '#666' }]}>
                      Product will be delivered to your location
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.deliveryOption,
                  orderData.deliveryOption === 'Meetup / Pickup' && styles.deliveryOptionSelected,
                  {
                    backgroundColor: cardBackground,
                    borderColor: orderData.deliveryOption === 'Meetup / Pickup' ? PRIMARY_COLOR : borderColor
                  }
                ]}
                onPress={() => setOrderData(prev => ({ ...prev, deliveryOption: 'Meetup / Pickup' }))}
              >
                <View style={styles.deliveryOptionRadio}>
                  {orderData.deliveryOption === 'Meetup / Pickup' && (
                    <View style={styles.deliveryOptionRadioSelected} />
                  )}
                </View>
                <View style={styles.deliveryOptionContent}>
                  <Ionicons name="storefront" size={24} color={PRIMARY_COLOR} />
                  <View style={styles.deliveryOptionText}>
                    <Text style={[styles.deliveryOptionTitle, { color: textColor }]}>Meetup / Pickup</Text>
                    <Text style={[styles.deliveryOptionDescription, { color: isDark ? '#aaa' : '#666' }]}>
                      Pick up product from seller&apos;s location
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            </View>

            <View style={styles.orderFormSection}>
              <Text style={[styles.orderFormSectionTitle, { color: PRIMARY_COLOR }]}>Additional Notes (Optional)</Text>
              <TextInput
                style={[styles.formInput, styles.textArea, {
                  backgroundColor: inputBackground,
                  borderColor,
                  color: textColor
                }]}
                placeholder="Any special instructions or notes for the seller..."
                placeholderTextColor={isDark ? '#888' : '#999'}
                value={orderData.additionalNotes}
                onChangeText={(text) => setOrderData(prev => ({ ...prev, additionalNotes: text }))}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>

            {isCartOrder && (
              <View style={[styles.orderTotalSection, { backgroundColor: cardBackground, borderColor }]}>
                <Text style={[styles.orderTotalText, { color: PRIMARY_COLOR }]}>
                  Total Amount: GH₵ {cartTotal.toFixed(2)}
                </Text>
              </View>
            )}
          </ScrollView>

          <View style={[styles.orderFormFooter, { borderTopColor: borderColor }]}>
            <TouchableOpacity
              style={[styles.submitOrderButton, submitting && styles.submitOrderButtonDisabled]}
              onPress={handleSubmit}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={22} color="#fff" />
                  <Text style={styles.submitOrderButtonText}>
                    {isCartOrder ? 'Place Order' : 'Confirm Order'}
                  </Text>
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
