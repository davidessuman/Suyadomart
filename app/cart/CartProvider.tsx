import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { getCurrentUserId } from '@/lib/supabase';

export interface CartItem {
  id?: string;
  product: any;
  quantity: number;
  added_at?: string;
  selectedColor?: string;
  selectedSize?: string;
}

interface CartContextType {
  cartItems: CartItem[];
  cartVisible: boolean;
  setCartVisible: (visible: boolean) => void;
  addToCart: (product: any, selectedColor?: string, selectedSize?: string, quantity?: number) => Promise<CartItem[]>;
  removeFromCart: (productId: string, selectedColor?: string, selectedSize?: string) => Promise<CartItem[]>;
  updateQuantity: (productId: string, quantity: number, selectedColor?: string, selectedSize?: string) => Promise<CartItem[]>;
  clearCart: () => Promise<void>;
  getCartCount: () => number;
  getCartTotal: () => number;
  loadCart: () => Promise<void>;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [cartVisible, setCartVisible] = useState(false);

  const loadCart = useCallback(async () => {
    try {
      const userId = await getCurrentUserId();
      if (!userId) return;

      // Load cart items from database
      const { data, error } = await supabase
        .from('cart_items')
        .select('id, quantity, added_at, selected_color, selected_size, products(*)')
        .eq('user_id', userId);

      if (error) {
        console.error('Error loading cart:', error);
        return;
      }

      // Transform database rows to CartItem format
      const items: CartItem[] = (data || []).map((row: any) => ({
        id: row.id,
        product: row.products,
        quantity: row.quantity,
        added_at: row.added_at,
        selectedColor: row.selected_color,
        selectedSize: row.selected_size,
      }));

      setCartItems(items);
    } catch (error) {
      console.error('Error loading cart:', error);
    }
  }, []);

  useEffect(() => {
    loadCart();
  }, [loadCart]);

  const addToCart = useCallback(async (product: any, selectedColor?: string, selectedSize?: string, quantity: number = 1) => {
    try {
      const userId = await getCurrentUserId();
      if (!userId) throw new Error('User not authenticated');

      // Check if product already exists in cart (by product_id only)
      const existingItem = cartItems.find(item => item.product.id === product.id);

      if (existingItem) {
        throw new Error('Product is already in cart');
      }

      // Insert into database
      const { error } = await supabase
        .from('cart_items')
        .insert({
          user_id: userId,
          product_id: product.id,
          quantity,
          selected_color: selectedColor,
          selected_size: selectedSize,
        });

      if (error) throw error;

      // Reload cart from database to ensure consistency
      await loadCart();

      const updatedCart = cartItems.concat([{
        product,
        quantity,
        selectedColor,
        selectedSize,
        added_at: new Date().toISOString(),
      }]);

      return updatedCart;
    } catch (error) {
      throw error;
    }
  }, [cartItems, loadCart]);

  const removeFromCart = useCallback(async (productId: string, selectedColor?: string, selectedSize?: string) => {
    try {
      const userId = await getCurrentUserId();
      if (!userId) throw new Error('User not authenticated');

      // Delete from database - only by product_id (since there's only one per product per user)
      const { error } = await supabase
        .from('cart_items')
        .delete()
        .eq('user_id', userId)
        .eq('product_id', productId);

      if (error) throw error;

      // Update local state
      const newCartItems = cartItems.filter(item => item.product.id !== productId);

      setCartItems(newCartItems);
      return newCartItems;
    } catch (error) {
      console.error('Error removing from cart:', error);
      throw error;
    }
  }, [cartItems]);

  const updateQuantity = useCallback(async (productId: string, quantity: number, selectedColor?: string, selectedSize?: string) => {
    if (quantity < 1) {
      return removeFromCart(productId, selectedColor, selectedSize);
    }

    try {
      const userId = await getCurrentUserId();
      if (!userId) throw new Error('User not authenticated');

      // Update in database - only by product_id
      const { error } = await supabase
        .from('cart_items')
        .update({ quantity })
        .eq('user_id', userId)
        .eq('product_id', productId);

      if (error) throw error;

      // Update local state
      const newCartItems = cartItems.map(item =>
        item.product.id === productId 
          ? { ...item, quantity } 
          : item
      );

      setCartItems(newCartItems);
      return newCartItems;
    } catch (error) {
      console.error('Error updating quantity:', error);
      throw error;
    }
  }, [cartItems, removeFromCart]);

  const clearCart = useCallback(async () => {
    try {
      const userId = await getCurrentUserId();
      if (!userId) throw new Error('User not authenticated');

      // Delete all cart items for user
      const { error } = await supabase
        .from('cart_items')
        .delete()
        .eq('user_id', userId);

      if (error) throw error;

      setCartItems([]);
    } catch (error) {
      console.error('Error clearing cart:', error);
      throw error;
    }
  }, []);

  const getCartCount = useCallback(() => {
    return cartItems.reduce((total, item) => total + item.quantity, 0);
  }, [cartItems]);

  const getCartTotal = useCallback(() => {
    return cartItems.reduce((total, item) => total + (item.product.price * item.quantity), 0);
  }, [cartItems]);

  const value: CartContextType = {
    cartItems,
    cartVisible,
    setCartVisible,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    getCartCount,
    getCartTotal,
    loadCart,
  };

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
};
