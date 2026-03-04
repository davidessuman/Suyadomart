import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';

const SUPABASE_URL = 'https://qwujadyqebfypyhfuwfl.supabase.co';

export const PaymentNotice = () => (
  <View style={{ backgroundColor: '#FFF3CD', borderColor: '#FF9900', borderWidth: 1, borderRadius: 8, padding: 12, marginBottom: 16, flexDirection: 'row', alignItems: 'center' }}>
    <Ionicons name="warning" size={22} color="#FF9900" style={{ marginRight: 8 }} />
    <Text style={{ color: '#856404', fontWeight: 'bold', flex: 1 }}>
      ⚠️ Please only make payment on delivery. Do not pay in advance to avoid scammers.
    </Text>
  </View>
);

type OrderProductDetailModalProps = {
  isVisible: boolean;
  onClose: () => void;
  product: any | null;
  order: any | null;
  onOpenFullViewer: (mediaUrls: string[], index: number) => void;
  onContactSeller: () => void;
  onCancelOrder: (orderId: string) => Promise<void>;
  showAlert: (title: string, message: string, buttons?: any[]) => void;
  theme: any;  getStatusColor: (status: string, theme: any) => string;
  getStatusText: (status: string) => string;
  formatDeliveryOption: (option?: string) => string;
  ProductMediaViewComponent: React.ComponentType<{
    urls: string[];
    onPressMedia: (index: number) => void;
    theme: any;
  }>;
};

export default function OrderProductDetailModal({
  isVisible,
  onClose,
  product,
  order,
  onOpenFullViewer,
  onContactSeller,
  onCancelOrder,
  showAlert,
  theme, getStatusColor,
  getStatusText,
  formatDeliveryOption,
  ProductMediaViewComponent,
}: OrderProductDetailModalProps) {
  const [cancelling, setCancelling] = useState(false);
  const [orderItems, setOrderItems] = useState<any[]>([]);
  const [fullProductData, setFullProductData] = useState<any>(null);
  const [colorSpecificMedia, setColorSpecificMedia] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const { width } = useWindowDimensions();

  const isLargeScreen = width >= 768;
  const modalWidth = isLargeScreen ? Math.min(width * 0.8, 800) : '100%';

  useEffect(() => {
    const fetchFullProductData = async () => {
      if (!product || !order) return;

      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('products')
          .select('*')
          .eq('id', product.id)
          .single();

        if (error) throw error;
        setFullProductData(data);

        if (order.selected_color && data?.color_media) {
          const colorMedia = data.color_media || {};
          const mediaForColor = colorMedia[order.selected_color];

          if (mediaForColor?.length > 0) {
            const formattedMedia = mediaForColor.map((url: string) => {
              if (url.startsWith('http')) {
                return url;
              } else {
                return `${SUPABASE_URL}/storage/v1/object/public/products/${url}`;
              }
            });
            setColorSpecificMedia(formattedMedia);
          } else {
            const generalMedia = data.media_urls || [];
            const formattedMedia = generalMedia.map((url: string) => {
              if (url.startsWith('http')) {
                return url;
              } else {
                return `${SUPABASE_URL}/storage/v1/object/public/products/${url}`;
              }
            });
            setColorSpecificMedia(formattedMedia);
          }
        } else {
          const generalMedia = data?.media_urls || product.media_urls || [];
          const formattedMedia = generalMedia.map((url: string) => {
            if (url.startsWith('http')) {
              return url;
            } else {
              return `${SUPABASE_URL}/storage/v1/object/public/products/${url}`;
            }
          });
          setColorSpecificMedia(formattedMedia);
        }
      } catch (error) {
        console.error('Error fetching product details:', error);
        const generalMedia = product.media_urls || [];
        const formattedMedia = generalMedia.map((url: string) => {
          if (url.startsWith('http')) {
            return url;
          } else {
            return `${SUPABASE_URL}/storage/v1/object/public/products/${url}`;
          }
        });
        setColorSpecificMedia(formattedMedia);
      } finally {
        setLoading(false);
      }
    };

    if (isVisible && product && order) {
      fetchFullProductData();
    } else {
      setColorSpecificMedia([]);
      setFullProductData(null);
    }
  }, [isVisible, product, order]);

  useEffect(() => {
    const fetchOrderItems = async () => {
      if (!order) return;

      try {
        const { data, error } = await supabase
          .from('order_items')
          .select('*')
          .eq('order_id', order.id);

        if (error) throw error;
        setOrderItems(data || []);
      } catch (error) {
        console.error('Error fetching order items:', error);
      }
    };

    if (isVisible && order) {
      fetchOrderItems();
    } else {
      setOrderItems([]);
    }
  }, [isVisible, order]);

  const handleCancelOrder = async () => {
    if (!order) return;

    setCancelling(true);
    try {
      await onCancelOrder(order.id);
    } catch (error) {
      console.error('Error cancelling order:', error);
    } finally {
      setCancelling(false);
    }
  };

  if (!product || !order) return null;

  const displayMedia = colorSpecificMedia.length > 0 ? colorSpecificMedia : (product.media_urls || []).map((url: string) =>
    url.startsWith('http') ? url : `${SUPABASE_URL}/storage/v1/object/public/products/${url}`
  );

  const hasColorSpecificMedia = colorSpecificMedia.length > 0 &&
    order.selected_color &&
    fullProductData?.color_media?.[order.selected_color]?.length > 0;

  return (
    <Modal animationType="slide" transparent={true} visible={isVisible} onRequestClose={onClose}>
      <View style={[styles.modalCenteredView, { backgroundColor: theme.modalOverlay }]}>
        <View
          style={[
            styles.modalModalView,
            {
              backgroundColor: theme.modalBackground,
              width: modalWidth,
              maxWidth: 800,
              alignSelf: 'center',
              marginHorizontal: 'auto',
              left: 0,
              right: 0,
              marginLeft: 'auto',
              marginRight: 'auto',
            },
          ]}
        >
          <TouchableOpacity style={styles.modalCloseButton} onPress={onClose}>
            <Ionicons name="close-circle" size={30} color={theme.primary} />
          </TouchableOpacity>

          {loading ? (
            <View style={styles.modalLoadingContainer}>
              <ActivityIndicator size="large" color={theme.primary} />
              <Text style={[styles.modalLoadingText, { color: theme.text }]}>Loading product details...</Text>
            </View>
          ) : (
            <ScrollView contentContainerStyle={styles.modalScrollContent}>
              {displayMedia?.length > 0 && (
                <View style={[styles.mediaGalleryContainer, { alignItems: 'center' }]}>
                  <View style={styles.colorMediaSection}>
                    {hasColorSpecificMedia && order.selected_color && (
                      <View style={styles.colorMediaHeader}>
                        <Ionicons name="color-palette" size={18} color={theme.primary} />
                        <Text style={[styles.colorMediaTitle, { color: theme.text }]}>Viewing: {order.selected_color} color media ({colorSpecificMedia.length} images)</Text>
                        <View style={[styles.colorIndicator, { backgroundColor: theme.primary }]}>
                          <Text style={styles.colorIndicatorText}>Color Specific</Text>
                        </View>
                      </View>
                    )}
                    {!hasColorSpecificMedia && order.selected_color && (
                      <View style={styles.colorMediaHeader}>
                        <Ionicons name="color-palette-outline" size={18} color={theme.textTertiary} />
                        <Text style={[styles.colorMediaTitle, { color: theme.textSecondary }]}>No specific media found for {order.selected_color}, showing all product images</Text>
                      </View>
                    )}
                    <ProductMediaViewComponent urls={displayMedia} onPressMedia={(index) => onOpenFullViewer(displayMedia, index)} theme={theme} />

                    {hasColorSpecificMedia && displayMedia[0] && (
                      <View style={[styles.colorMediaBadge, { backgroundColor: theme.primary }]}>
                        <Text style={styles.colorMediaBadgeText}>{order.selected_color} • {colorSpecificMedia.length} images</Text>
                      </View>
                    )}
                  </View>
                </View>
              )}

              <View style={styles.modalDetailsContainer}>
                <View style={[styles.orderStatusBadge, { backgroundColor: getStatusColor(order.status, theme) }]}>
                  <Text style={styles.orderStatusText}>{getStatusText(order.status)}</Text>
                </View>

                <Text style={[styles.modalTitle, { color: theme.text }]}>{product.title}</Text>
                <View style={styles.modalPriceRow}>
                  <Text style={[styles.modalPrice, { color: theme.primary }]}>
                    <Text style={[styles.modalCurrency, { color: theme.primary }]}>GHS</Text> {Number(product.price).toFixed(2)}
                  </Text>
                  {product.hasDiscount && (
                    <>
                      <Text style={[styles.modalOldPrice, { color: theme.textTertiary }]}>GHS {Number(product.original_price).toFixed(2)}</Text>
                      <View style={styles.modalDiscountBadge}>
                        <Text style={styles.modalDiscountText}>-{product.discountPercent}%</Text>
                      </View>
                    </>
                  )}
                </View>

                {(order.selected_size || order.selected_color || order.quantity) && (
                  <View style={[styles.selectedOptionsContainer, { backgroundColor: theme.surface }]}>
                    <Text style={[styles.selectedOptionsTitle, { color: theme.text }]}>Order Details:</Text>
                    <View style={styles.selectedOptionsGrid}>
                      {order.selected_size && (
                        <View style={styles.selectedOptionItem}>
                          <Ionicons name="resize-outline" size={16} color={theme.textTertiary} />
                          <Text style={[styles.selectedOptionLabel, { color: theme.textSecondary }]}>Size:</Text>
                          <Text style={[styles.selectedOptionValue, { color: theme.text }]}>{order.selected_size}</Text>
                        </View>
                      )}
                      {order.selected_color && (
                        <View style={styles.selectedOptionItem}>
                          <Ionicons
                            name={hasColorSpecificMedia ? 'color-palette' : 'color-palette-outline'}
                            size={16}
                            color={hasColorSpecificMedia ? theme.primary : theme.textTertiary}
                          />
                          <Text style={[styles.selectedOptionLabel, { color: theme.textSecondary }]}>Color:</Text>
                          <Text
                            style={[
                              styles.selectedOptionValue,
                              { color: hasColorSpecificMedia ? theme.primary : theme.text },
                            ]}
                          >
                            {order.selected_color}
                            {hasColorSpecificMedia && <Text style={{ fontSize: 10, color: theme.success }}> ✓</Text>}
                          </Text>
                        </View>
                      )}
                      {order.quantity && (
                        <View style={styles.selectedOptionItem}>
                          <Ionicons name="cart-outline" size={16} color={theme.textTertiary} />
                          <Text style={[styles.selectedOptionLabel, { color: theme.textSecondary }]}>Quantity:</Text>
                          <Text style={[styles.selectedOptionValue, { color: theme.text }]}>{order.quantity}</Text>
                        </View>
                      )}
                    </View>
                  </View>
                )}

                <Text style={[styles.modalSectionTitle, { color: theme.text, borderBottomColor: theme.border }]}>Product Description</Text>
                <Text style={[styles.modalDescription, { color: theme.textSecondary }]}>{product.description || product.title}</Text>

                <View style={[styles.modalSellerInfo, { borderTopColor: theme.border }]}> 
                  <Image source={{ uri: product.avatar_url }} style={[styles.modalSellerAvatar, { borderColor: theme.primary }]} />
                  <View>
                    <Text style={[styles.modalSellerName, { color: theme.text }]}>Sold by: {product.display_name}</Text>
                    <Text style={[styles.modalSellerUniversity, { color: theme.textTertiary }]}>{product.university}</Text>
                  </View>
                </View>

                <PaymentNotice />

                <View style={[styles.orderInfoSection, { borderTopColor: theme.border }]}>
                  <Text style={[styles.modalSectionTitle, { color: theme.text, borderBottomColor: theme.border }]}>Order Information</Text>

                  <View style={styles.orderInfoRow}>
                    <Ionicons name="person-outline" size={16} color={theme.textTertiary} />
                    <Text style={[styles.orderInfoLabel, { color: theme.textSecondary }]}>Buyer: </Text>
                    <Text style={[styles.orderInfoValue, { color: theme.text }]}>{order.buyer_name}</Text>
                  </View>

                  <View style={styles.orderInfoRow}>
                    <Ionicons name="call-outline" size={16} color={theme.textTertiary} />
                    <Text style={[styles.orderInfoLabel, { color: theme.textSecondary }]}>Phone: </Text>
                    <Text style={[styles.orderInfoValue, { color: theme.text }]}>{order.phone_number}</Text>
                  </View>

                  <View style={styles.orderInfoRow}>
                    <Ionicons name="location-outline" size={16} color={theme.textTertiary} />
                    <Text style={[styles.orderInfoLabel, { color: theme.textSecondary }]}>Location: </Text>
                    <Text style={[styles.orderInfoValue, { color: theme.text }]}>{order.location}</Text>
                  </View>

                  <View style={styles.orderInfoRow}>
                    <Ionicons
                      name={formatDeliveryOption(order.delivery_option) === 'Campus Delivery' ? 'car-outline' : 'storefront-outline'}
                      size={16}
                      color={theme.textTertiary}
                    />
                    <Text style={[styles.orderInfoLabel, { color: theme.textSecondary }]}>Delivery: </Text>
                    <Text style={[styles.orderInfoValue, { color: theme.text }]}>{formatDeliveryOption(order.delivery_option)}</Text>
                  </View>

                  <View style={styles.orderInfoRow}>
                    <Ionicons name="pricetag-outline" size={15} color={theme.textTertiary} />
                    <Text style={[styles.orderInfoLabel, { color: theme.textSecondary }]}>Total Amount: </Text>
                    <Text style={[styles.orderInfoValue, { color: theme.primary }]}>GHS {order.total_amount?.toFixed(2) || '0.00'}</Text>
                  </View>

                  {order.additional_notes && (
                    <View style={styles.orderInfoRow}>
                      <Ionicons name="document-text-outline" size={16} color={theme.textTertiary} />
                      <Text style={[styles.orderInfoLabel, { color: theme.textSecondary }]}>Notes: </Text>
                      <Text style={[styles.orderInfoValue, { color: theme.text }]}>{order.additional_notes}</Text>
                    </View>
                  )}

                  <View style={styles.orderInfoRow}>
                    <Ionicons name="calendar-outline" size={16} color={theme.textTertiary} />
                    <Text style={[styles.orderInfoLabel, { color: theme.textSecondary }]}>Order Date: </Text>
                    <Text style={[styles.orderInfoValue, { color: theme.text }]}>{new Date(order.created_at).toLocaleDateString()}</Text>
                  </View>
                </View>

                {order.is_cart_order && orderItems.length > 0 && (
                  <View style={[styles.orderItemsSection, { borderTopColor: theme.border }]}>
                    <Text style={[styles.modalSectionTitle, { color: theme.text, borderBottomColor: theme.border }]}>Order Items ({orderItems.length})</Text>
                    {orderItems.map((item, index) => (
                      <View key={index} style={[styles.orderItemCard, { backgroundColor: theme.surface }]}>
                        <View style={styles.orderItemHeader}>
                          <Text style={[styles.orderItemTitle, { color: theme.text }]} numberOfLines={1}>{item.product_name}</Text>
                          <Text style={[styles.orderItemPrice, { color: theme.primary }]}>GHS {item.total_price?.toFixed(2) || '0.00'}</Text>
                        </View>
                        <View style={styles.orderItemDetails}>
                          <Text style={[styles.orderItemDetail, { color: theme.textSecondary }]}>Price: GHS {item.product_price?.toFixed(2)} × {item.quantity} units</Text>
                          {item.size && <Text style={[styles.orderItemDetail, { color: theme.textSecondary }]}>Size: {item.size}</Text>}
                          {item.color && <Text style={[styles.orderItemDetail, { color: theme.textSecondary }]}>Color: {item.color}</Text>}
                        </View>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            </ScrollView>
          )}

          <View style={[styles.modalActionBar, { borderTopColor: theme.border, backgroundColor: theme.modalBackground }]}>
            {(order.status === 'pending' || order.status === 'processing') && (
              <TouchableOpacity style={[styles.modalContactButton, { backgroundColor: theme.surface }]} onPress={onContactSeller}>
                <Ionicons name="chatbubble-outline" size={20} color={theme.text} />
                <Text style={[styles.modalContactButtonText, { color: theme.text }]}>Chat Seller</Text>
              </TouchableOpacity>
            )}

            {(order.status === 'pending' || order.status === 'processing') && (
              <TouchableOpacity
                style={[styles.modalCancelOrderButton, { backgroundColor: theme.error }]}
                onPress={handleCancelOrder}
                disabled={cancelling}
              >
                {cancelling ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Ionicons name="close-circle" size={20} color="#fff" />
                )}
                <Text style={styles.modalCancelOrderButtonText}>{cancelling ? 'Cancelling...' : 'Cancel Order'}</Text>
              </TouchableOpacity>
            )}
          </View>
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

  modalDetailsContainer: { padding: 18 },

  orderStatusBadge: {alignSelf: 'flex-start',paddingHorizontal: 12,paddingVertical: 6,borderRadius: 6,marginBottom: 15,},

  orderStatusText: {color: '#fff',fontSize: 12,fontWeight: '600',},
  // Order Information Section

  modalTitle: { fontSize: 26, fontWeight: 'bold', marginBottom: 15 },

  modalPriceRow: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 20 },

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

  selectedOptionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },

  selectedOptionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  selectedOptionLabel: {
    fontSize: 12,
    marginRight: 4,
  },

  selectedOptionValue: {
    fontSize: 14,
    fontWeight: '600',
  },

  modalSectionTitle: { fontSize: 20, fontWeight: '700', marginTop: 15, marginBottom: 10, borderBottomWidth: 1, paddingBottom: 5 },

  modalDescription: { fontSize: 16, lineHeight: 26, marginBottom: 20 },

  modalSellerInfo: { flexDirection: 'row', alignItems: 'center', marginTop: 20, paddingTop: 20, borderTopWidth: 1 },

  modalSellerAvatar: { width: 45, height: 45, borderRadius: 27.5, marginRight: 15, borderWidth: 2 },

  modalSellerName: { fontWeight: '700', fontSize: 17 },

  modalSellerUniversity: { fontSize: 14 },

  orderInfoSection: {marginTop: 20,paddingTop: 20,borderTopWidth: 1,},

  orderInfoRow: {flexDirection: 'row',alignItems: 'center',marginBottom: 12,flexWrap: 'wrap',},

  orderInfoLabel: {fontSize: 14,marginLeft: 8,marginRight: 4,width: 70,},

  orderInfoValue: {fontSize: 14,flex: 1,flexWrap: 'wrap',},
  // Cancel Order Button

  orderItemsSection: {
    marginTop: 20,
    paddingTop: 20,
  },

  orderItemCard: {
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },

  orderItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },

  orderItemTitle: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
    marginRight: 12,
  },

  orderItemPrice: {
    fontSize: 14,
    fontWeight: 'bold',
  },

  orderItemDetails: {
    gap: 4,
  },

  orderItemDetail: {
    fontSize: 12,
  },
  // Add these styles to your styles object:
colorMediaHeader: {
  flexDirection: 'row',
  alignItems: 'center',
  marginBottom: 12,
  paddingHorizontal: 16,
  flexWrap: 'wrap',
  gap: 8,
},
colorIndicator: {
  paddingHorizontal: 8,
  paddingVertical: 4,
  borderRadius: 4,
  marginLeft: 'auto',
},
colorIndicatorText: {
  color: '#fff',
  fontSize: 10,
  fontWeight: 'bold',
},
colorMediaBadge: {
  position: 'absolute',
  top: 16,
  left: 16,
  paddingHorizontal: 10,
  paddingVertical: 6,
  borderRadius: 6,
  zIndex: 10,
},
colorMediaBadgeText: {
  color: '#fff',
  fontSize: 12,
  fontWeight: 'bold',
},
// Add these to your styles object
productImageContainer: {
  position: 'relative',
  marginRight: 12,
},
imageNavButton: {
  position: 'absolute',
  top: '50%',
  transform: [{ translateY: -12 }],
  padding: 8,
  borderRadius: 20,
  zIndex: 10,
},
prevImageButton: {
  left: 8,
},
nextImageButton: {
  right: 8,
},
imageCounter: {
  position: 'absolute',
  bottom: 8,
  right: 8,
  paddingHorizontal: 8,
  paddingVertical: 4,
  borderRadius: 12,
  zIndex: 10,
},
imageCounterText: {
  color: '#fff',
  fontSize: 12,
  fontWeight: '600',
},
colorIndicatorContainer: {
  marginTop: 8,
},
colorIndicatorLabel: {
  fontSize: 12,
  marginBottom: 4,
},
colorIndicatorChip: {
  paddingHorizontal: 8,
  paddingVertical: 4,
  borderRadius: 12,
  alignSelf: 'flex-start',
},

colorMediaCount: {
  fontSize: 10,
  marginTop: 2,
},
colorOptionContent: {
  flexDirection: 'row',
  alignItems: 'center',
},
colorMediaIcon: {
  marginLeft: 6,
},
profilePhotoOverlay: {
  flex: 1,
  justifyContent: 'center',
  alignItems: 'center',
},

  modalActionBar: { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', borderTopWidth: 1, paddingHorizontal: 15, paddingVertical: 12,justifyContent: 'space-between',alignItems: 'center',},

  modalContactButton: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 15,paddingVertical: 12,borderRadius: 10,flex: 1,marginRight: 8,},

  modalContactButtonText: { fontWeight: 'bold', fontSize: 14, marginLeft: 6 },

  modalCancelOrderButton: {flexDirection: 'row',justifyContent: 'center',alignItems: 'center',paddingHorizontal: 15,paddingVertical: 12,borderRadius: 10,flex: 1,marginLeft: 8,},

  modalCancelOrderButtonText: {color: '#fff',fontWeight: 'bold',fontSize: 14,marginLeft: 6,},
  // Full Image/Video Viewer
});
