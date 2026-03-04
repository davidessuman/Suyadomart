import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  Modal,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Linking from 'expo-linking';
import * as Clipboard from 'expo-clipboard';
import { supabase } from '@/lib/supabase';

const SUPABASE_URL = 'https://qwujadyqebfypyhfuwfl.supabase.co';

type ContactSellerModalProps = {
  isVisible: boolean;
  onClose: () => void;
  product: any | null;
  order: any | null;
  onReopenProductModal?: () => void;
  showAlert: (title: string, message: string, buttons?: any[]) => void;
  theme: any;  getStatusText: (status: string) => string;
  formatDeliveryOption: (option?: string) => string;
};

const generateProductWebLink = (product: any): string => {
  const WEB_APP_DOMAIN = 'https://www.suyadomart.com';
  const productSlug = product.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '') || 'product';

  const params = new URLSearchParams({
    productId: product.id,
    productTitle: product.title.substring(0, 80),
    price: product.price.toString(),
    seller: product.display_name?.substring(0, 30) || 'Seller',
    university: product.university?.substring(0, 20) || 'Campus',
    slug: productSlug,
    source: 'search',
  });

  return `${WEB_APP_DOMAIN}/search?${params.toString()}`;
};

export default function ContactSellerModal({
  isVisible,
  onClose,
  product,
  order,
  onReopenProductModal,
  showAlert,
  theme, getStatusText,
  formatDeliveryOption,
}: ContactSellerModalProps) {
  const [sellerPhone, setSellerPhone] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [sellerName, setSellerName] = useState<string>('');
  const [sellerAvatar, setSellerAvatar] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [shopData, setShopData] = useState<any>(null);
  const sellerCacheRef = useRef<Map<string, any>>(new Map());
  const requestIdRef = useRef(0);

  useEffect(() => {
    if (!isVisible) return;

    const sellerId = product?.seller_id;
    if (!product || !sellerId) {
      setError('No product or seller information available');
      setLoading(false);
      return;
    }

    const requestId = ++requestIdRef.current;
    let cancelled = false;
    const isCurrent = () => !cancelled && requestId === requestIdRef.current;

    (async () => {
      setLoading(true);
      setError('');
      setShopData(null);
      setSellerPhone('');

      setSellerName(product.display_name || 'Seller');
      if (product.avatar_url) {
        setSellerAvatar(product.avatar_url);
      }

      const cached = sellerCacheRef.current.get(sellerId);
      if (cached) {
        if (isCurrent()) {
          setSellerPhone(cached.phone || '');
          setSellerName(cached.name || product.display_name || 'Seller');
          if (cached.avatar_url) {
            const url = cached.avatar_url.startsWith('http')
              ? cached.avatar_url
              : `${SUPABASE_URL}/storage/v1/object/public/avatars/${cached.avatar_url}`;
            setSellerAvatar(url);
          }
          setShopData(cached.shopData);
          setLoading(false);
        }
        return;
      }

      try {
        const [{ data: sd }, { data: ud }] = await Promise.all([
          supabase
            .from('shops')
            .select('phone, name, avatar_url, location, description')
            .eq('owner_id', sellerId)
            .maybeSingle(),
          supabase
            .from('user_profiles')
            .select('full_name, avatar_url')
            .eq('id', sellerId)
            .maybeSingle()
        ]);

        if (!isCurrent()) return;

        const currentShopData = sd;
        const userData = ud;

        if (currentShopData) {
          sellerCacheRef.current.set(sellerId, {
            ...currentShopData,
            shopData: currentShopData
          });

          setShopData(currentShopData);
          setSellerPhone(currentShopData.phone || '');
          setSellerName(currentShopData.name || product.display_name || 'Seller');

          if (currentShopData.avatar_url) {
            const url = currentShopData.avatar_url.startsWith('http')
              ? currentShopData.avatar_url
              : `${SUPABASE_URL}/storage/v1/object/public/avatars/${currentShopData.avatar_url}`;
            setSellerAvatar(url);
          } else if (userData?.avatar_url) {
            const url = userData.avatar_url.startsWith('http')
              ? userData.avatar_url
              : `${SUPABASE_URL}/storage/v1/object/public/avatars/${userData.avatar_url}`;
            setSellerAvatar(url);
          }
        } else if (userData) {
          sellerCacheRef.current.set(sellerId, {
            ...userData,
            shopData: null
          });

          setSellerName(userData.full_name || product.display_name || 'Seller');
          setSellerPhone('');
          setShopData(null);

          if (userData.avatar_url) {
            const url = userData.avatar_url.startsWith('http')
              ? userData.avatar_url
              : `${SUPABASE_URL}/storage/v1/object/public/avatars/${userData.avatar_url}`;
            setSellerAvatar(url);
          }
        }
      } catch (fetchError: any) {
        console.error('Error fetching seller info:', fetchError);
      } finally {
        if (isCurrent()) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isVisible, product?.seller_id]);

  const handleWhatsApp = () => {
    if (!sellerPhone || !product) {
      showAlert(
        'Contact Unavailable',
        'This seller has not provided a contact number in their shop profile.'
      );
      return;
    }

    const cleanPhone = sellerPhone.replace(/[^\d]/g, '');
    let whatsappPhone = cleanPhone;

    if (cleanPhone.startsWith('0')) {
      whatsappPhone = '233' + cleanPhone.slice(1);
    } else if (!cleanPhone.startsWith('233')) {
      whatsappPhone = '233' + cleanPhone;
    }

    let message = '';

    const productWebLink = generateProductWebLink(product);
    let productImageUrl = '';
    if (order && order.selected_color && product.color_media && product.color_media[order.selected_color] && product.color_media[order.selected_color].length > 0) {
      const colorMediaUrl = product.color_media[order.selected_color][0];
      productImageUrl = colorMediaUrl.startsWith('http') ? colorMediaUrl : `${SUPABASE_URL}/storage/v1/object/public/products/${colorMediaUrl}`;
    } else if (product.media_urls?.[0]) {
      productImageUrl = product.media_urls[0].startsWith('http') ? product.media_urls[0] : `${SUPABASE_URL}/storage/v1/object/public/products/${product.media_urls[0]}`;
    } else {
      productImageUrl = '';
    }

    if (order) {
      message = `Hello! I'm the buyer for order #${order.id.slice(-8)}:\n\n` +
            `📱 *Product*: ${product.title}\n` +
            `💰 *Price*: GHS ${product.price.toFixed(2)}\n` +
            (order.selected_color ? `🎨 *Colour*: ${order.selected_color}\n` : '') +
            `🔗 *Product Link*: ${productWebLink}\n` +
            `🖼️ *Product Image*: ${productImageUrl}\n\n` +
            `📦 *Order Status*: ${getStatusText(order.status)}\n` +
            `📝 *My Name*: ${order.buyer_name}\n` +
            `📞 *My Phone*: ${order.phone_number}\n` +
            `📍 *Location*: ${order.location}\n` +
            `🚚 *Delivery*: ${formatDeliveryOption(order.delivery_option)}\n\n` +
            `I'd like to discuss my order.`;
    } else {
      const productDescription = product.description || product.title || 'Check out this product';

      message = `Hello! I'm interested in your product:\n\n` +
                `📱 *Product*: ${product.title}\n` +
                `💰 *Price*: GHS ${product.price.toFixed(2)}\n` +
                `📝 *Description*: ${productDescription}\n` +
                `🔗 *Product Link*: ${productWebLink}\n` +
                `🖼️ *Product Image*: ${productImageUrl}\n\n` +
                `I found this on CampusConnect. Are you available to discuss?`;
    }

    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/${whatsappPhone}?text=${encodedMessage}`;

    Linking.openURL(whatsappUrl).catch(() => {
      Linking.openURL(`https://web.whatsapp.com/send?phone=${whatsappPhone}&text=${encodedMessage}`);
    });
  };

  const handleCall = () => {
    if (!sellerPhone) {
      showAlert('Contact Unavailable', 'No phone number available in shop profile');
      return;
    }

    const cleanPhone = sellerPhone.replace(/[^\d]/g, '');
    let phoneNumber = cleanPhone;

    if (cleanPhone.startsWith('0')) {
      phoneNumber = '+233' + cleanPhone.slice(1);
    } else if (!cleanPhone.startsWith('233')) {
      phoneNumber = '+233' + cleanPhone;
    } else {
      phoneNumber = '+' + cleanPhone;
    }

    const telUrl = `tel:${phoneNumber}`;
    Linking.openURL(telUrl).catch(() => {
      showAlert('Error', 'Could not initiate phone call');
    });
  };

  const handleCopyPhone = () => {
    if (!sellerPhone) {
      showAlert('Error', 'No phone number to copy');
      return;
    }
    Clipboard.setStringAsync(sellerPhone);
    showAlert('Copied!', 'Phone number copied to clipboard');
  };

  const handleClose = () => {
    onClose();
    if (onReopenProductModal) {
      setTimeout(() => {
        onReopenProductModal();
      }, 300);
    }
  };

  const getAvatarUrl = () => {
    if (sellerAvatar) {
      return sellerAvatar;
    }
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(sellerName)}&background=FF9900&color=fff`;
  };

  if (!isVisible) return null;

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={isVisible}
      onRequestClose={handleClose}
    >
      <View style={[styles.contactOverlay, { backgroundColor: theme.modalOverlay }]}>
        <View style={[styles.contactModal, { backgroundColor: theme.modalBackground }]}>
          <View style={[styles.contactHeader, { borderBottomColor: theme.border }]}>
            <TouchableOpacity onPress={handleClose} style={styles.contactCloseButton}>
              <Ionicons name="close" size={24} color={theme.text} />
            </TouchableOpacity>
            <Text style={[styles.contactTitle, { color: theme.text }]}>Contact Seller</Text>
            <View style={{ width: 40 }} />
          </View>

          <ScrollView style={styles.contactContent} showsVerticalScrollIndicator={false}>
            {!sellerPhone && !sellerName ? (
              <View style={styles.contactLoading}>
                <ActivityIndicator size="large" color={theme.primary} />
                <Text style={[styles.contactLoadingText, { color: theme.text }]}>Loading seller information...</Text>
              </View>
            ) : !sellerPhone ? (
              <View style={styles.contactUnavailable}>
                <Ionicons name="call-outline" size={80} color={theme.textTertiary} />
                <Text style={[styles.contactUnavailableTitle, { color: theme.text }]}>Contact Unavailable</Text>
                <Text style={[styles.contactUnavailableText, { color: theme.textSecondary }]}>
                  This seller hasn't set up their shop profile yet.
                </Text>
                <Text style={[styles.contactUnavailableSubtext, { color: theme.textTertiary }]}>
                  Phone numbers can only be found in the shops table.
                </Text>

                <View style={[styles.sellerInfoCard, { backgroundColor: theme.surface }]}>
                  <View style={[styles.productInfo, { borderBottomColor: theme.border }]}> 
                    <Text style={[styles.productName, { color: theme.text }]} numberOfLines={2}>
                      {product?.title}
                    </Text>
                    <Text style={[styles.productPrice, { color: theme.primary }]}>
                      GHS {product?.price.toFixed(2)}
                    </Text>
                  </View>

                  <View style={[styles.sellerDisplayInfo, { borderTopColor: theme.border, borderBottomColor: theme.border }]}> 
                    <View style={styles.sellerAvatarContainer}>
                      {getAvatarUrl() ? (
                        <Image
                          source={{ uri: getAvatarUrl() }}
                          style={styles.sellerContactAvatar}
                        />
                      ) : (
                        <View style={[styles.sellerContactAvatarPlaceholder, { backgroundColor: theme.surface }]}> 
                          <Ionicons name="person" size={30} color={theme.textTertiary} />
                        </View>
                      )}
                    </View>
                    <View style={styles.sellerTextInfo}>
                      <Text style={[styles.sellerNameText, { color: theme.text }]}> 
                        {sellerName}
                      </Text>
                      <Text style={[styles.sellerShopStatus, { color: theme.textTertiary }]}> 
                        {shopData ? 'Shop exists (no phone)' : 'Shop not set up'}
                      </Text>
                    </View>
                  </View>

                  {shopData && shopData.location && (
                    <View style={[styles.shopLocationInfo, { borderTopColor: theme.border }]}> 
                      <Ionicons name="location-outline" size={16} color={theme.textTertiary} />
                      <Text style={[styles.shopLocationText, { color: theme.textSecondary }]}> 
                        {shopData.location}
                      </Text>
                    </View>
                  )}
                </View>

                <TouchableOpacity
                  style={[styles.contactContinueButton, { backgroundColor: theme.primary }]}
                  onPress={handleClose}
                >
                  <Text style={[styles.contactContinueButtonText, { color: '#000' }]}>Continue Browsing</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <View style={[styles.sellerInfoCard, { backgroundColor: theme.surface }]}>
                  <View style={[styles.productInfo, { borderBottomColor: theme.border }]}> 
                    <Text style={[styles.productName, { color: theme.text }]} numberOfLines={2}>
                      {product?.title}
                    </Text>
                    <Text style={[styles.productPrice, { color: theme.primary }]}>
                      GHS {product?.price.toFixed(2)}
                    </Text>
                  </View>

                  <View style={[styles.sellerDisplayInfo, { borderTopColor: theme.border, borderBottomColor: theme.border }]}> 
                    <View style={styles.sellerAvatarContainer}>
                      {getAvatarUrl() ? (
                        <Image
                          source={{ uri: getAvatarUrl() }}
                          style={styles.sellerContactAvatar}
                        />
                      ) : (
                        <View style={[styles.sellerContactAvatarPlaceholder, { backgroundColor: theme.surface }]}> 
                          <Ionicons name="person" size={30} color={theme.textTertiary} />
                        </View>
                      )}
                    </View>
                    <View style={styles.sellerTextInfo}>
                      <Text style={[styles.sellerNameText, { color: theme.text }]}> 
                        {sellerName}
                      </Text>
                      <Text style={[styles.sellerShopVerified, { color: theme.success }]}> 
                        ✓ Shop Verified
                      </Text>
                    </View>
                  </View>

                  <View style={[styles.phoneInfo, { borderTopColor: theme.border }]}> 
                    <Ionicons name="call" size={20} color={theme.primary} />
                    <Text style={[styles.phoneNumber, { color: theme.text }]}>{sellerPhone}</Text>
                    <TouchableOpacity onPress={handleCopyPhone} style={styles.copyButton}>
                      <Ionicons name="copy-outline" size={18} color={theme.textSecondary} />
                    </TouchableOpacity>
                  </View>

                  {shopData && shopData.location && (
                    <View style={[styles.shopLocationInfo, { borderTopColor: theme.border }]}> 
                      <Ionicons name="location-outline" size={16} color={theme.textTertiary} />
                      <Text style={[styles.shopLocationText, { color: theme.textSecondary }]}> 
                        Shop Location: {shopData.location}
                      </Text>
                    </View>
                  )}

                  {shopData && shopData.description && (
                    <View style={[styles.shopDescription, { borderTopColor: theme.border }]}> 
                      <Text style={[styles.shopDescriptionText, { color: theme.textSecondary }]} numberOfLines={2}>
                        {shopData.description}
                      </Text>
                    </View>
                  )}
                </View>

                <Text style={[styles.contactOptionsTitle, { color: theme.text }]}>Choose how to contact:</Text>

                <TouchableOpacity
                  style={[styles.contactOption, styles.whatsappOption, { backgroundColor: theme.surface, borderLeftColor: '#25D366' }]}
                  onPress={handleWhatsApp}
                >
                  <View style={[styles.contactIconContainer, { backgroundColor: '#25D366' }]}>
                    <Ionicons name="logo-whatsapp" size={30} color="#fff" />
                  </View>
                  <View style={styles.contactOptionText}>
                    <Text style={[styles.contactOptionTitle, { color: theme.text }]}>Open WhatsApp</Text>
                    <Text style={[styles.contactOptionDescription, { color: theme.textSecondary }]}>
                      {order ? 'Opens WhatsApp with order details' : 'Opens WhatsApp with product details'}
                    </Text>
                    <Text style={[styles.whatsappNote, { color: '#25D366' }]}>
                      {order ? 'Includes order information and product link/image' : 'Includes product info, link, and image'}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={theme.textTertiary} />
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.contactOption, styles.callOption, { backgroundColor: theme.surface, borderLeftColor: theme.primary }]}
                  onPress={handleCall}
                >
                  <View style={[styles.contactIconContainer, { backgroundColor: theme.primary }]}>
                    <Ionicons name="call" size={30} color="#fff" />
                  </View>
                  <View style={styles.contactOptionText}>
                    <Text style={[styles.contactOptionTitle, { color: theme.text }]}>Make a Call</Text>
                    <Text style={[styles.contactOptionDescription, { color: theme.textSecondary }]}>
                      Call the seller directly
                    </Text>
                    <Text style={[styles.callNote, { color: theme.primary }]}>
                      Opens your phone dialer with the seller's number
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={theme.textTertiary} />
                </TouchableOpacity>

                <View style={[styles.contactDisclaimer, { backgroundColor: theme.background }]}>
                  <Ionicons name="information-circle-outline" size={16} color={theme.textSecondary} />
                  <Text style={[styles.contactDisclaimerText, { color: theme.textTertiary }]}>
                    Contact seller to make any enquiry. Your safety is important.
                  </Text>
                </View>
              </>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  contactOverlay: {flex: 1,justifyContent: 'flex-end',},

  contactModal: {borderTopLeftRadius: 20,borderTopRightRadius: 20,height: '85%',},

  contactHeader: {flexDirection: 'row',justifyContent: 'space-between',alignItems: 'center',padding: 15,borderBottomWidth: 1,},

  contactCloseButton: { padding: 5 },

  contactTitle: {fontSize: 18,fontWeight: 'bold',},

  contactContent: {flex: 1,},

  contactLoading: {flex: 1,justifyContent: 'center',alignItems: 'center',padding: 20,},

  contactLoadingText: {marginTop: 10,fontSize: 16,},

  contactUnavailable: {flex: 1,justifyContent: 'center',alignItems: 'center',paddingHorizontal: 30,},

  contactUnavailableTitle: {fontSize: 20,fontWeight: 'bold',marginTop: 15,marginBottom: 10,},

  contactUnavailableText: {fontSize: 16,textAlign: 'center',lineHeight: 22,marginBottom: 25,},

  contactUnavailableSubtext: {fontSize: 14,textAlign: 'center',marginBottom: 25,},

  sellerInfoCard: {borderRadius: 12,padding: 20,marginBottom: 25,width: '100%',},

  productInfo: {marginBottom: 15,paddingBottom: 15,borderBottomWidth: 1,},

  productName: { fontSize: 16,fontWeight: '600',marginBottom: 5,},

  productPrice: {fontSize: 18,fontWeight: 'bold',},

  sellerDisplayInfo: {flexDirection: 'row',alignItems: 'center',marginVertical: 15,paddingVertical: 15,borderTopWidth: 1,borderBottomWidth: 1,},

  sellerAvatarContainer: {marginRight: 15,},

  sellerContactAvatar: {width: 60,height: 60,borderRadius: 30,borderWidth: 2,},

  sellerContactAvatarPlaceholder: {width: 60,height: 60,borderRadius: 30,justifyContent: 'center',alignItems: 'center',borderWidth: 2,},

  sellerTextInfo: {flex: 1,},

  sellerNameText: {fontSize: 16,fontWeight: '600',flex: 1,},

  sellerShopStatus: {fontSize: 12,marginTop: 4,},

  shopLocationInfo: {flexDirection: 'row',alignItems: 'center',marginTop: 10,paddingTop: 10,borderTopWidth: 1,},

  shopLocationText: {fontSize: 14,marginLeft: 8,flex: 1,},

  contactContinueButton: {paddingHorizontal: 30,paddingVertical: 12,borderRadius: 25,marginTop: 20,},

  contactContinueButtonText: {fontWeight: 'bold',fontSize: 16,},

  sellerShopVerified: {fontSize: 12,marginTop: 4,},

  phoneInfo: {flexDirection: 'row',alignItems: 'center',marginTop: 10,paddingTop: 10,borderTopWidth: 1,},

  phoneNumber: {fontSize: 18,fontWeight: 'bold',marginLeft: 10,flex: 1,},

  copyButton: {padding: 8,marginLeft: 10,},

  shopDescription: {marginTop: 10,paddingTop: 10,borderTopWidth: 1,},

  shopDescriptionText: {fontSize: 14,lineHeight: 20,},

  contactOptionsTitle: {fontSize: 16,fontWeight: 'bold',marginBottom: 15,marginTop: 10,},

  contactOption: {flexDirection: 'row',alignItems: 'center',borderRadius: 12,padding: 18,marginBottom: 12,},

  whatsappOption: {borderLeftWidth: 4,},

  contactIconContainer: {width: 50,height: 50,borderRadius: 25,justifyContent: 'center',alignItems: 'center',marginRight: 15,},

  contactOptionText: {flex: 1,},

  contactOptionTitle: {fontSize: 16,fontWeight: 'bold',marginBottom: 2,},

  contactOptionDescription: { fontSize: 12, marginBottom: 2, },

  whatsappNote: {fontSize: 11,fontStyle: 'italic',},

  callOption: {borderLeftWidth: 4,},

  callNote: {fontSize: 11,fontStyle: 'italic',},

  contactDisclaimer: {flexDirection: 'row', alignItems: 'center', borderRadius: 8, padding: 15, marginTop: 20, marginBottom: 30,},

  contactDisclaimerText: {fontSize: 12,marginLeft: 10,flex: 1,lineHeight: 16,},
  // Sort and Filter Menu Styles
});
