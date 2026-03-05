import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  FlatList,
  Image,
  useColorScheme,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type AlertButton = {
  text: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive';
};

type CartItem = {
  product: any;
  quantity: number;
  selectedColor?: string;
  selectedSize?: string;
};

const PRIMARY_COLOR = '#F68B1E';
const LIGHT_BACKGROUND = '#FFFFFF';
const DARK_BACKGROUND = '#121212';
const LIGHT_TEXT = '#333333';
const DARK_TEXT = '#FFFFFF';

const CartModal: React.FC<{
  isVisible: boolean;
  onClose: () => void;
  cartItems: CartItem[];
  onUpdateQuantity: (productId: string, quantity: number, selectedColor?: string, selectedSize?: string) => Promise<any>;
  onRemoveItem: (productId: string, selectedColor?: string, selectedSize?: string) => Promise<any>;
  onClearCart: () => Promise<any>;
  onViewProduct: (product: any) => void;
  onPlaceOrder: () => void;
  showAlert: (title: string, message: string, buttons?: AlertButton[]) => void;
  styles: any;
  getCardDisplayMedia: (mediaUrls: string[] | undefined) => string | undefined;
}> = ({
  isVisible,
  onClose,
  cartItems,
  onUpdateQuantity,
  onRemoveItem,
  onClearCart,
  onViewProduct,
  onPlaceOrder,
  showAlert,
  styles,
  getCardDisplayMedia,
}) => {
  const [updating, setUpdating] = useState<string | null>(null);
  const colorScheme = useColorScheme();
  const { width } = useWindowDimensions();
  const isLargeScreen = width >= 768;
  const modalWidth = isLargeScreen ? Math.min(width * 0.8, 800) : '100%';

  const handleUpdateQuantity = async (productId: string, quantity: number, selectedColor?: string, selectedSize?: string) => {
    setUpdating(`${productId}_${selectedColor}_${selectedSize}`);
    try {
      await onUpdateQuantity(productId, quantity, selectedColor, selectedSize);
    } finally {
      setUpdating(null);
    }
  };

  const getTotal = () => {
    return cartItems.reduce((total, item) => total + (item.product.price * item.quantity), 0);
  };

  const handleRemoveItem = async (productId: string, selectedColor?: string, selectedSize?: string) => {
    showAlert(
      'Remove Item',
      'Are you sure you want to remove this item from your cart?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: () => onRemoveItem(productId, selectedColor, selectedSize) }
      ]
    );
  };

  const handleClearCartConfirmation = () => {
    if (cartItems.length === 0) return;

    showAlert(
      'Clear Cart',
      'Are you sure you want to clear your entire cart?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Clear All', style: 'destructive', onPress: () => onClearCart() }
      ]
    );
  };

  if (!isVisible) return null;

  const isDark = colorScheme === 'dark';
  const backgroundColor = isDark ? DARK_BACKGROUND : LIGHT_BACKGROUND;
  const textColor = isDark ? DARK_TEXT : LIGHT_TEXT;
  const cardBackground = isDark ? '#1e1e1e' : '#ffffff';
  const borderColor = isDark ? '#333' : '#e0e0e0';

  return (
    <Modal animationType="slide" transparent={true} visible={isVisible} onRequestClose={onClose}>
      <View
        style={[
          styles.cartOverlay,
          {
            backgroundColor: 'rgba(0,0,0,0.95)',
            justifyContent: isLargeScreen ? 'center' : 'flex-end',
            alignItems: isLargeScreen ? 'center' : 'stretch',
          },
        ]}
      >
        <View
          style={[
            styles.cartModal,
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
          ]
        }>
          <View style={[styles.cartHeader, { borderBottomColor: borderColor }]}>
            <TouchableOpacity onPress={onClose} style={styles.cartCloseButton}>
              <Ionicons name="close" size={28} color={textColor} />
            </TouchableOpacity>
            <Text style={[styles.cartTitle, { color: textColor }]}>Your Cart ({cartItems.length})</Text>
            {cartItems.length > 0 && (
              <TouchableOpacity onPress={handleClearCartConfirmation} style={styles.cartClearButton}>
                <Text style={styles.cartClearText}>Clear All</Text>
              </TouchableOpacity>
            )}
          </View>

          {cartItems.length === 0 ? (
            <View style={styles.cartEmptyContainer}>
              <Ionicons name="cart-outline" size={80} color={PRIMARY_COLOR} />
              <Text style={[styles.cartEmptyTitle, { color: textColor }]}>Your cart is empty</Text>
              <Text style={[styles.cartEmptyText, { color: textColor }]}>Add some products to get started</Text>
              <TouchableOpacity style={styles.cartContinueButton} onPress={onClose}>
                <Text style={styles.cartContinueButtonText}>Continue Shopping</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <FlatList
                data={cartItems}
                keyExtractor={(item, index) => `${item.product.id}_${item.selectedColor}_${item.selectedSize}_${index}`}
                contentContainerStyle={styles.cartListContent}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[styles.cartItem, { backgroundColor: cardBackground, borderColor }]}
                    onPress={() => onViewProduct(item.product)}
                    activeOpacity={0.7}
                  >
                    <Image
                      source={{ uri: getCardDisplayMedia(item.product.media_urls) || 'https://via.placeholder.com/400' }}
                      style={styles.cartItemImage}
                    />
                    <View style={styles.cartItemInfo}>
                      <Text style={[styles.cartItemTitle, { color: textColor }]} numberOfLines={2}>{item.product.title}</Text>
                      <Text style={[styles.cartItemSeller, { color: isDark ? '#aaa' : '#666' }]}>{item.product.display_name}</Text>

                      {(item.selectedColor || item.selectedSize) && (
                        <View style={styles.cartItemVariants}>
                          {item.selectedColor && (
                            <View style={styles.cartVariantTag}>
                              <Text style={[styles.cartVariantLabel, { color: textColor }]}>Color:</Text>
                              <View style={[styles.cartColorPreview, { backgroundColor: item.selectedColor }]} />
                              <Text style={[styles.cartVariantValue, { color: textColor }]}>{item.selectedColor}</Text>
                            </View>
                          )}
                          {item.selectedSize && (
                            <View style={styles.cartVariantTag}>
                              <Text style={[styles.cartVariantLabel, { color: textColor }]}>Size:</Text>
                              <Text style={[styles.cartVariantValue, { color: textColor }]}>{item.selectedSize}</Text>
                            </View>
                          )}
                        </View>
                      )}

                      <Text style={[styles.cartItemPrice, { color: PRIMARY_COLOR }]}>GH₵ {item.product.price.toFixed(2)}</Text>

                      <View style={styles.cartQuantityContainer}>
                        <TouchableOpacity
                          style={[styles.cartQuantityButton, { backgroundColor: isDark ? '#333' : '#e0e0e0' }]}
                          onPress={(e) => {
                            e.stopPropagation();
                            handleUpdateQuantity(item.product.id, item.quantity - 1, item.selectedColor, item.selectedSize);
                          }}
                          disabled={updating === `${item.product.id}_${item.selectedColor}_${item.selectedSize}`}
                        >
                          <Ionicons name="remove" size={18} color={textColor} />
                        </TouchableOpacity>

                        <View style={styles.cartQuantityDisplay}>
                          {updating === `${item.product.id}_${item.selectedColor}_${item.selectedSize}` ? (
                            <ActivityIndicator size="small" color={PRIMARY_COLOR} />
                          ) : (
                            <Text style={[styles.cartQuantityText, { color: textColor }]}>{item.quantity}</Text>
                          )}
                        </View>

                        <TouchableOpacity
                          style={[styles.cartQuantityButton, { backgroundColor: isDark ? '#333' : '#e0e0e0' }]}
                          onPress={(e) => {
                            e.stopPropagation();
                            handleUpdateQuantity(item.product.id, item.quantity + 1, item.selectedColor, item.selectedSize);
                          }}
                          disabled={updating === `${item.product.id}_${item.selectedColor}_${item.selectedSize}`}
                        >
                          <Ionicons name="add" size={18} color={textColor} />
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.cartRemoveButton}
                          onPress={(e) => {
                            e.stopPropagation();
                            handleRemoveItem(item.product.id, item.selectedColor, item.selectedSize);
                          }}
                        >
                          <Ionicons name="trash-outline" size={18} color="#FF3B30" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </TouchableOpacity>
                )}
              />

              <View style={[styles.cartFooter, { borderTopColor: borderColor }]}>
                <View style={styles.cartTotalRow}>
                  <Text style={[styles.cartTotalLabel, { color: textColor }]}>Total:</Text>
                  <Text style={[styles.cartTotalAmount, { color: PRIMARY_COLOR }]}>GH₵ {getTotal().toFixed(2)}</Text>
                </View>
                <TouchableOpacity style={styles.cartPlaceOrderButton} onPress={onPlaceOrder}>
                  <Ionicons name="bag-check" size={20} color="#fff" />
                  <Text style={styles.cartPlaceOrderButtonText}>Place Order</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
};

export default CartModal;
