import React from 'react';
import {
  View,
  Text,
  Image,
  Modal,
  TouchableOpacity,
  Share,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FontAwesome } from '@expo/vector-icons';
import * as Linking from 'expo-linking';
import * as Clipboard from 'expo-clipboard';

const SUPABASE_URL = 'https://qwujadyqebfypyhfuwfl.supabase.co';

type ShareModalProduct = {
  id: string;
  title: string;
  price: number;
  display_name: string;
  university: string;
  media_urls: string[];
  hasDiscount?: boolean;
  discountPercent?: number | null;
  color_media?: Record<string, string[]>;
};

type ShareModalProps = {
  isVisible: boolean;
  onClose: () => void;
  product: ShareModalProduct;
  order?: any;
  onShare: (platform: string) => Promise<void>;
  showAlert: (title: string, message: string, buttons?: any[]) => void;
  theme: any;};

const generateProductWebLink = (product: ShareModalProduct): string => {
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

export default function ShareModal({ isVisible, onClose, product, order, onShare, showAlert, theme, styles }: ShareModalProps) {
  const shareOptions = [
    { id: 'whatsapp', name: 'WhatsApp', icon: 'logo-whatsapp', iconType: 'ionicons', color: '#25D366', scheme: 'whatsapp://send?text=' },
    { id: 'facebook', name: 'Facebook', icon: 'logo-facebook', iconType: 'ionicons', color: '#1877F2', scheme: 'fb://share?text=' },
    { id: 'x', name: 'X', icon: 'twitter', iconType: 'fontawesome', color: '#000000', scheme: 'twitter://post?message=' },
    { id: 'instagram', name: 'Instagram', icon: 'logo-instagram', iconType: 'ionicons', color: '#E4405F', scheme: 'instagram://share?text=' },
    { id: 'telegram', name: 'Telegram', icon: 'paper-plane', iconType: 'ionicons', color: '#0088cc', scheme: 'tg://msg?text=' },
    { id: 'copy', name: 'Copy Link', icon: 'copy', iconType: 'ionicons', color: theme.textSecondary },
  ];

  const generateImageUrl = (productData: ShareModalProduct) => {
    if (order && order.selected_color && productData.color_media && productData.color_media[order.selected_color] && productData.color_media[order.selected_color].length > 0) {
      const colorMediaUrl = productData.color_media[order.selected_color][0];
      return colorMediaUrl.startsWith('http') ? colorMediaUrl : `${SUPABASE_URL}/storage/v1/object/public/products/${colorMediaUrl}`;
    }
    if (productData.media_urls?.[0]) {
      if (productData.media_urls[0].startsWith('http')) {
        return productData.media_urls[0];
      }
      return `${SUPABASE_URL}/storage/v1/object/public/products/${productData.media_urls[0]}`;
    }
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(productData.title)}&background=FF9900&color=fff`;
  };

  const productWebLink = generateProductWebLink(product);

  const createShareMessage = () => {
    const productImageUrl = generateImageUrl(product);
    const price = product.price.toFixed(2);

    return `🔥 Check out "${product.title}" for GHS ${price} on Suyado Mart!\n\n` +
           `📱 *Product Details*\n` +
           `• Title: ${product.title}\n` +
           `• Price: GHS ${price}\n` +
           `• Seller: ${product.display_name}\n` +
           `• Campus: ${product.university}\n\n` +
           `🔗 *View Full Product Details*:\n${productWebLink}\n\n` +
           `🖼️ *Product Image*: ${productImageUrl}\n\n` +
           `📲 Visit Suyado Mart for the best campus Trading experience!\n` +
           `#SuyadoMart `;
  };

  const createShortShareMessage = () => {
    const price = product.price.toFixed(2);

    return `Check out "${product.title}" for GHS ${price} on Suyado Mart!\n\n` +
           `View product: ${productWebLink}\n\n` +
           `Seller: ${product.display_name}\n` +
           `#SuyadoMart `;
  };

  const handleShare = async (platformId: string) => {
    const fullShareMessage = createShareMessage();
    const shortShareMessage = createShortShareMessage();
    const productImageUrl = generateImageUrl(product);

    await onShare(platformId);

    if (platformId === 'copy') {
      await Clipboard.setStringAsync(productWebLink);
      showAlert('Copied!', 'Product link copied to clipboard');
      onClose();
      return;
    }

    if (platformId === 'more') {
      Share.share({
        message: fullShareMessage,
        title: product.title,
        url: productWebLink,
      });
      onClose();
      return;
    }

    const platform = shareOptions.find(p => p.id === platformId);

    if (platform?.scheme) {
      try {
        const messageToShare = platformId === 'x' ? shortShareMessage : fullShareMessage;

        await Linking.openURL(`${platform.scheme}${encodeURIComponent(messageToShare)}`);
      } catch (error) {
        if (platformId === 'whatsapp') {
          await Linking.openURL(`https://api.whatsapp.com/send?text=${encodeURIComponent(fullShareMessage)}`);
        } else if (platformId === 'facebook') {
          await Linking.openURL(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(productWebLink)}&quote=${encodeURIComponent(product.title)}`);
        } else if (platformId === 'x') {
          await Linking.openURL(`https://x.com/intent/tweet?text=${encodeURIComponent(shortShareMessage)}&url=${encodeURIComponent(productWebLink)}`);
        } else if (platformId === 'instagram') {
          if (product.media_urls?.[0]) {
            const instagramUrl = `instagram://library?AssetPath=${encodeURIComponent(productImageUrl)}`;
            await Linking.openURL(instagramUrl);
          } else {
            await Linking.openURL('instagram://app');
          }
        } else {
          Share.share({
            message: fullShareMessage,
            title: product.title,
            url: productWebLink,
          });
        }
      }
    }

    onClose();
  };

  if (!isVisible) return null;

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={isVisible}
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={[styles.shareOverlay, { backgroundColor: theme.modalOverlay }]}
        activeOpacity={1}
        onPress={onClose}
      >
        <View style={[styles.shareContainer, { backgroundColor: theme.modalBackground }]}>
          <View style={styles.shareHeader}>
            <Text style={[styles.shareTitle, { color: theme.text }]}>Share Product</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={theme.text} />
            </TouchableOpacity>
          </View>

          <View style={[styles.shareProductPreview, { backgroundColor: theme.surface }]}>
            {product.media_urls?.[0] ? (
              <Image
                source={{ uri: generateImageUrl(product) }}
                style={styles.sharePreviewImage}
                resizeMode="cover"
              />
            ) : (
              <View style={[styles.sharePreviewImage, styles.sharePreviewPlaceholder, { backgroundColor: theme.card }]}>
                <Ionicons name="image-outline" size={30} color={theme.textTertiary} />
              </View>
            )}
            <View style={styles.sharePreviewInfo}>
              <Text style={[styles.shareProductTitle, { color: theme.text }]} numberOfLines={2}>
                {product.title}
              </Text>
              <Text style={[styles.shareProductPrice, { color: theme.primary }]}>
                GHS {product.price.toFixed(2)}
              </Text>
              {product.hasDiscount && (
                <View style={styles.modalDiscountBadge}>
                  <Text style={styles.modalDiscountText}>-{product.discountPercent}%</Text>
                </View>
              )}
              <Text style={[styles.shareSourceText, { color: theme.textTertiary }]}>
                Shared from Suyado Mart
              </Text>
            </View>
          </View>

          <View style={[styles.productLinkContainer, {
            backgroundColor: theme.background,
            borderColor: theme.border
          }]}>
            <Text style={[styles.productLinkLabel, { color: theme.primary }]}>Product Web Link:</Text>
            <Text style={[styles.productLinkExample, { color: theme.textTertiary }]}>
              https://www.suyadomart.com/?productId={product.id.substring(0, 8)}...
            </Text>
            <TouchableOpacity
              style={[styles.productLinkButton, { backgroundColor: theme.surface }]}
              onPress={() => {
                Clipboard.setStringAsync(productWebLink);
                showAlert('Copied!', 'Product link copied to clipboard');
              }}
            >
              <Text style={[styles.productLinkText, { color: theme.text }]} numberOfLines={1}>
                {productWebLink}
              </Text>
              <Ionicons name="copy-outline" size={18} color={theme.primary} />
            </TouchableOpacity>
          </View>

          <Text style={[styles.shareInstructions, { color: theme.textSecondary }]}>
            Share includes product image + web link
          </Text>

          <View style={styles.shareGrid}>
            {shareOptions.map((option) => (
              <TouchableOpacity
                key={option.id}
                style={styles.shareOption}
                onPress={() => handleShare(option.id)}
              >
                <View style={[styles.shareIconContainer, { backgroundColor: option.color }]}>
                  {option.id === 'x' ? (
                    <Text style={{ fontSize: 30, fontWeight: 'bold', color: '#fff' }}>X</Text>
                  ) : option.iconType === 'fontawesome' ? (
                    <FontAwesome name={option.icon as any} size={30} color="#fff" />
                  ) : (
                    <Ionicons name={option.icon as any} size={30} color="#fff" />
                  )}
                </View>
                <Text style={[styles.shareOptionText, { color: theme.text }]}>{option.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity
            style={[styles.moreOptionsButton, { backgroundColor: theme.primary }]}
            onPress={() => handleShare('more')}
          >
            <Ionicons name="share-social" size={24} color="#fff" />
            <Text style={styles.moreOptionsText}>More Options</Text>
          </TouchableOpacity>

          <Text style={[styles.shareNote, { color: theme.textTertiary }]}>
            Product web link will open product details in browser
          </Text>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  shareOverlay: {flex: 1,justifyContent: 'flex-end',},

  shareContainer: {borderTopLeftRadius: 20,borderTopRightRadius: 20,padding: 20,paddingBottom: 30, },

  shareHeader: {flexDirection: 'row',justifyContent: 'space-between',alignItems: 'center',marginBottom: 20,},

  shareTitle: {fontSize: 18,fontWeight: 'bold',},

  shareProductPreview: {flexDirection: 'row',borderRadius: 12,padding: 12,marginBottom: 15,alignItems: 'center',},

  sharePreviewImage: {width: 60,height: 60,borderRadius: 8,marginRight: 12,},

  sharePreviewPlaceholder: {justifyContent: 'center',alignItems: 'center',},

  sharePreviewInfo: {flex: 1,},

  shareProductTitle: {fontSize: 16,fontWeight: '600',marginBottom: 5,},

  shareProductPrice: {fontSize: 18,fontWeight: 'bold',marginBottom: 5,},

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

  shareSourceText: {fontSize: 10,marginTop: 2,},

  productLinkContainer: {borderRadius: 12,padding: 15,marginBottom: 15,borderWidth: 1},

  productLinkLabel: {fontSize: 14,fontWeight: 'bold',marginBottom: 8,},

  productLinkExample: {fontSize: 11,marginBottom: 5,fontFamily: 'monospace',},

  productLinkButton: {flexDirection: 'row',alignItems: 'center',padding: 12,borderRadius: 8,marginBottom: 8,},

  productLinkText: {fontSize: 13,flex: 1,},

  shareInstructions: {fontSize: 12,textAlign: 'center',marginBottom: 20,fontStyle: 'italic',paddingHorizontal: 20,},

  shareGrid: {flexDirection: 'row',flexWrap: 'wrap',justifyContent: 'space-between',marginBottom: 20,},

  shareOption: {alignItems: 'center',width: '30%',marginBottom: 20,},

  shareIconContainer: {width: 60,height: 60,borderRadius: 30,justifyContent: 'center',alignItems: 'center',marginBottom: 8,},

  shareOptionText: {fontSize: 12,textAlign: 'center',},

  moreOptionsButton: {flexDirection: 'row',alignItems: 'center',justifyContent: 'center',padding: 15,borderRadius: 10,},

  moreOptionsText: {color: '#fff',fontSize: 16,fontWeight: 'bold',marginLeft: 10,},
  // Order Form Modal

  shareNote: {fontSize: 10,textAlign: 'center',marginTop: 10,paddingHorizontal: 20,},
});
