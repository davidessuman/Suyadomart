import React, { useState } from 'react';
import {
  Modal,
  View,
  TouchableOpacity,
  Text,
  FlatList,
  Image,
  ActivityIndicator,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type Product = any;

interface CartItem {
  product: any;
  quantity: number;
}

type CartModalProps = {
  isVisible: boolean;
  onClose: () => void;
  cartItems: CartItem[];
  onUpdateQuantity: (productId: string, quantity: number) => Promise<void>;
  onRemoveItem: (productId: string) => Promise<void>;
  onClearCart: () => Promise<void>;
  onViewProduct: (product: any, fromCart: boolean) => void;
  onPlaceOrder: () => void;
  showAlert: (title: string, message: string, buttons?: any[]) => void;
  theme: any;
  getCardDisplayUrl: (urls?: string[] | null) => string;
};

const CartModal: React.FC<CartModalProps> = ({
  isVisible,
  onClose,
  cartItems,
  onUpdateQuantity,
  onRemoveItem,
  onClearCart,
  onViewProduct,
  onPlaceOrder,
  showAlert,
  theme, getCardDisplayUrl,
}) => {
  const { width, height } = useWindowDimensions();
  const isLargeScreen = width >= 768;
  const modalWidth = isLargeScreen ? Math.min(width * 0.8, 800) : '100%';
  const modalHeight = '90%';

  const [updating, setUpdating] = useState<string | null>(null);

  const handleUpdateQuantity = async (productId: string, quantity: number) => {
    setUpdating(productId);
    try {
      await onUpdateQuantity(productId, quantity);
    } finally {
      setUpdating(null);
    }
  };

  const getTotal = () => {
    return cartItems.reduce((total, item) => total + item.product.price * item.quantity, 0);
  };

  const handleViewProduct = (product: Product) => {
    onClose();
    setTimeout(() => {
      const enhancedProduct = {
        ...product,
        display_name: product.display_name || 'Seller',
        avatar_url:
          product.avatar_url ||
          `https://ui-avatars.com/api/?name=${encodeURIComponent(product.title || 'Product')}&background=FF9900&color=fff`,
        university: product.university || 'Campus',
      };
      onViewProduct(enhancedProduct, true);
    }, 50);
  };

  const handleClearCart = async () => {
    showAlert('Clear Cart', 'Are you sure you want to clear your entire cart?', [
      { text: 'Cancel', style: 'cancel', onPress: () => {} },
      {
        text: 'Clear All',
        style: 'destructive',
        onPress: async () => {
          await onClearCart();
          showAlert('Cart Cleared', 'Your cart has been cleared');
        },
      },
    ]);
  };

  if (!isVisible) return null;

  return (
    <Modal animationType="slide" transparent={true} visible={isVisible} onRequestClose={onClose}>
      <View
        style={[
          styles.cartOverlay,
          {
            backgroundColor: theme.modalOverlay,
            justifyContent: isLargeScreen ? 'center' : 'flex-end',
            alignItems: 'center',
          },
        ]}
      >
        <View
          style={[
            styles.cartModal,
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
              left: 0,
              right: 0,
              marginLeft: 'auto',
              marginRight: 'auto',
            },
          ]}
        >
          <View style={[styles.cartHeader, { borderBottomColor: theme.border }]}>
            <TouchableOpacity onPress={onClose} style={styles.cartCloseButton}>
              <Ionicons name="close" size={28} color={theme.text} />
            </TouchableOpacity>
            <Text style={[styles.cartTitle, { color: theme.text }]}>Your Cart ({cartItems.length})</Text>
            {cartItems.length > 0 && (
              <TouchableOpacity onPress={handleClearCart} style={styles.cartClearButton}>
                <Text style={[styles.cartClearText, { color: theme.error }]}>Clear All</Text>
              </TouchableOpacity>
            )}
          </View>
          {cartItems.length === 0 ? (
            <View style={styles.cartEmptyContainer}>
              <Ionicons name="cart-outline" size={80} color={theme.textTertiary} />
              <Text style={[styles.cartEmptyTitle, { color: theme.text }]}>Your cart is empty</Text>
              <Text style={[styles.cartEmptyText, { color: theme.textSecondary }]}>Add some products to get started</Text>
              <TouchableOpacity style={[styles.cartContinueButton, { backgroundColor: theme.primary }]} onPress={onClose}>
                <Text style={styles.cartContinueButtonText}>Continue Shopping</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <FlatList
                data={cartItems}
                keyExtractor={(item) => item.product.id}
                contentContainerStyle={styles.cartListContent}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[styles.cartItem, { backgroundColor: theme.surface }]}
                    onPress={() => handleViewProduct(item.product)}
                    activeOpacity={0.7}
                  >
                    <Image source={{ uri: getCardDisplayUrl(item.product.media_urls) }} style={styles.cartItemImage} />
                    <View style={styles.cartItemInfo}>
                      <Text style={[styles.cartItemTitle, { color: theme.text }]} numberOfLines={2}>
                        {item.product.title}
                      </Text>
                      <Text style={[styles.cartItemSeller, { color: theme.textSecondary }]}>
                        {item.product.display_name || 'Seller'}
                      </Text>
                      <Text style={[styles.cartItemPrice, { color: theme.primary }]}>GHS {item.product.price.toFixed(2)}</Text>

                      <View style={styles.cartQuantityContainer}>
                        <TouchableOpacity
                          style={[styles.cartQuantityButton, { backgroundColor: theme.card }]}
                          onPress={(e) => {
                            e.stopPropagation();
                            handleUpdateQuantity(item.product.id, item.quantity - 1);
                          }}
                          disabled={updating === item.product.id}
                        >
                          <Ionicons name="remove" size={18} color={theme.text} />
                        </TouchableOpacity>

                        <View style={styles.cartQuantityDisplay}>
                          {updating === item.product.id ? (
                            <ActivityIndicator size="small" color={theme.primary} />
                          ) : (
                            <Text style={[styles.cartQuantityText, { color: theme.text }]}>{item.quantity}</Text>
                          )}
                        </View>

                        <TouchableOpacity
                          style={[styles.cartQuantityButton, { backgroundColor: theme.card }]}
                          onPress={(e) => {
                            e.stopPropagation();
                            handleUpdateQuantity(item.product.id, item.quantity + 1);
                          }}
                          disabled={updating === item.product.id}
                        >
                          <Ionicons name="add" size={18} color={theme.text} />
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.cartRemoveButton}
                          onPress={(e) => {
                            e.stopPropagation();
                            onRemoveItem(item.product.id);
                          }}
                        >
                          <Ionicons name="trash-outline" size={18} color={theme.error} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </TouchableOpacity>
                )}
              />

              <View style={[styles.cartFooter, { borderTopColor: theme.border }]}>
                <View style={styles.cartTotalRow}>
                  <Text style={[styles.cartTotalLabel, { color: theme.text }]}>Total:</Text>
                  <Text style={[styles.cartTotalAmount, { color: theme.primary }]}>GHS {getTotal().toFixed(2)}</Text>
                </View>
                <TouchableOpacity style={[styles.cartPlaceOrderButton, { backgroundColor: '#FF4081' }]} onPress={onPlaceOrder}>
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

const styles = StyleSheet.create({
  cartOverlay: { flex: 1, justifyContent: 'flex-end' },

  cartModal: { borderTopLeftRadius: 20, borderTopRightRadius: 20, height: '90%' },

  cartHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 15, borderBottomWidth: 1 },

  cartCloseButton: { padding: 5 },

  cartTitle: { fontSize: 18, fontWeight: 'bold', flex: 1, textAlign: 'center' },

  cartClearButton: { padding: 5 },

  cartClearText: { fontSize: 14 },

  cartEmptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20 },

  cartEmptyTitle: { fontSize: 24, fontWeight: 'bold', marginTop: 20, marginBottom: 10 },

  cartEmptyText: { fontSize: 16, textAlign: 'center', marginBottom: 30 },

  cartContinueButton: { paddingHorizontal: 30, paddingVertical: 12, borderRadius: 25 },

  cartContinueButtonText: { fontWeight: 'bold', fontSize: 16 },

  cartListContent: { padding: 15 },

  cartItem: { flexDirection: 'row', borderRadius: 12, marginBottom: 12, padding: 10 },

  cartItemImage: { width: 80, height: 80, borderRadius: 8 },

  cartItemInfo: { flex: 1, marginLeft: 15, justifyContent: 'space-between' },

  cartItemTitle: { fontSize: 14, fontWeight: '600' },

  cartItemSeller: { fontSize: 12, marginTop: 2 },

  cartItemPrice: { fontSize: 16, fontWeight: 'bold', marginTop: 4 },

  cartQuantityContainer: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },

  cartQuantityButton: { width: 30, height: 30, borderRadius: 15, justifyContent: 'center', alignItems: 'center' },

  cartQuantityDisplay: { width: 40, alignItems: 'center' },

  cartQuantityText: { fontSize: 16, fontWeight: 'bold' },

  cartRemoveButton: { marginLeft: 15, padding: 6 },

  cartFooter: { borderTopWidth: 1, padding: 15 },

  cartTotalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },

  cartTotalLabel: { fontSize: 18, fontWeight: 'bold' },

  cartTotalAmount: { fontSize: 22, fontWeight: 'bold' },

  cartPlaceOrderButton: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', padding: 16, borderRadius: 12 },

  cartPlaceOrderButtonText: { fontWeight: 'bold', fontSize: 16, marginLeft: 8 },
  
  // Share Modal
});
