import React, { useEffect, useMemo, useState } from 'react';
import { Image, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { AVPlaybackStatus, Video } from 'expo-av';
import ResponsiveVideo from '@/components/ResponsiveVideo';

const SUPABASE_URL = 'https://qwujadyqebfypyhfuwfl.supabase.co';

export type AdminDashboardProduct = {
  id: string;
  seller_id?: string;
  title: string;
  description: string | null;
  price: number;
  original_price: number | null;
  media_urls: string[];
  color_media?: Record<string, string[]> | null;
  color_stock?: Record<string, string> | null;
  category: string;
  sub_category: string | null;
  gender: string | null;
  brand: string | null;
  delivery_option: string;
  quantity: number | null;
  sizes_available: string[] | null;
  colors_available: string[] | null;
  is_pre_order: boolean;
  pre_order_duration: number | null;
  pre_order_duration_unit: string | null;
  is_service: boolean;
  created_at: string;
  university?: string | null;
  display_name?: string;
  avatar_url?: string;
  shop_name?: string | null;
};

type ProductDetailsMenuProps = {
  visible: boolean;
  product: AdminDashboardProduct | null;
  onClose: () => void;
  onEdit?: (product: AdminDashboardProduct) => void;
  onViewShop?: (product: AdminDashboardProduct) => void;
};

const getPublicMediaUrl = (url?: string) => {
  if (!url) return 'https://via.placeholder.com/600x600?text=No+Image';
  if (url.startsWith('http')) return url;
  return `${SUPABASE_URL}/storage/v1/object/public/products/${url}`;
};

const getPublicAvatarUrl = (url?: string) => {
  if (!url) return 'https://ui-avatars.com/api/?name=Seller&background=3B82F6&color=fff';
  if (url.startsWith('http')) return url;
  return `${SUPABASE_URL}/storage/v1/object/public/avatars/${url}`;
};

const formatDate = (value: string) => {
  const date = new Date(value);
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
};

const hasTextValue = (value?: string | null) => Boolean(value && value.trim().length > 0);

const isVideoUrl = (url?: string) => {
  const value = (url || '').toLowerCase();
  return value.includes('.mp4') || value.includes('.mov') || value.includes('.avi') || value.includes('.webm') || value.includes('.mkv');
};

const ProductDetailsMenu = ({ visible, product, onClose, onEdit, onViewShop }: ProductDetailsMenuProps) => {
  const { width } = useWindowDimensions();
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [activeInfoTab, setActiveInfoTab] = useState<'description' | 'productInfo'>('description');
  const [mainVideoRef, setMainVideoRef] = useState<Video | null>(null);
  const [isMainVideoPlaying, setIsMainVideoPlaying] = useState(false);

  const isLargeScreen = width >= 768;
  const mediaWidth = isLargeScreen ? Math.min(width * 0.6, 600) : width * 0.9;
  const mediaHeight = mediaWidth * 0.7;

  const media = useMemo(() => {
    if (!product?.media_urls?.length) return [];
    return product.media_urls;
  }, [product]);

  const currentImage = media[activeImageIndex] || media[0];
  const currentMediaUrl = getPublicMediaUrl(currentImage);
  const currentMediaIsVideo = isVideoUrl(currentImage);

  useEffect(() => {
    setIsMainVideoPlaying(false);
  }, [activeImageIndex, product?.id, visible]);

  useEffect(() => {
    if (!visible) {
      mainVideoRef?.pauseAsync().catch(() => {});
      setIsMainVideoPlaying(false);
    }
  }, [visible, mainVideoRef]);

  if (!product) return null;

  const productInfoItems: {
    key: string;
    label: string;
    value: string;
    icon: keyof typeof Ionicons.glyphMap;
  }[] = [];

  if (hasTextValue(product.brand)) {
    productInfoItems.push({
      key: 'brand',
      label: 'Brand',
      value: product.brand!.trim(),
      icon: 'pricetag-outline',
    });
  }

  if (hasTextValue(product.shop_name)) {
    productInfoItems.push({
      key: 'shop',
      label: 'Shop',
      value: product.shop_name!.trim(),
      icon: 'storefront-outline',
    });
  }

  if (hasTextValue(product.university)) {
    productInfoItems.push({
      key: 'university',
      label: 'University',
      value: product.university!.trim(),
      icon: 'school-outline',
    });
  }

  if (hasTextValue(product.delivery_option)) {
    productInfoItems.push({
      key: 'delivery',
      label: 'Delivery',
      value: product.delivery_option.trim(),
      icon: 'car-outline',
    });
  }

  if (product.quantity !== null && product.quantity !== undefined) {
    productInfoItems.push({
      key: 'stock',
      label: 'Stock',
      value: String(product.quantity),
      icon: 'archive-outline',
    });
  }

  if (hasTextValue(product.gender)) {
    productInfoItems.push({
      key: 'gender',
      label: 'Gender',
      value: product.gender!.trim(),
      icon: 'people-outline',
    });
  }

  if (hasTextValue(product.created_at)) {
    productInfoItems.push({
      key: 'created',
      label: 'Created',
      value: formatDate(product.created_at),
      icon: 'calendar-outline',
    });
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.menuCard}>
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.headerIconWrap}>
                <Ionicons name="cube-outline" size={15} color="#2563EB" />
              </View>
              <View style={styles.headerTextWrap}>
                <Text numberOfLines={1} style={styles.headerTitle}>Product Details</Text>
                <Text numberOfLines={1} style={styles.headerSubtitle}>Admin Product Overview</Text>
              </View>
            </View>
            <View style={styles.headerActions}>
              <TouchableOpacity
                style={styles.editButton}
                onPress={() => {
                  if (onEdit && product) {
                    onEdit(product);
                  }
                }}
              >
                <Ionicons name="create-outline" size={16} color="#FFFFFF" />
                <Text style={styles.editButtonText}>Edit</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                <Ionicons name="close" size={20} color="#334155" />
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
            <View style={[styles.imageWrap, { width: mediaWidth, height: mediaHeight }]}>
              {currentMediaIsVideo ? (
                <View style={styles.mainVideoWrap}>
                  <ResponsiveVideo
                    uri={currentMediaUrl}
                    autoPlay={false}
                    controls
                    containerStyle={styles.mainImage}
                    onRef={setMainVideoRef}
                    onStatus={(status: AVPlaybackStatus) => {
                      if (!status.isLoaded) {
                        setIsMainVideoPlaying(false);
                        return;
                      }
                      setIsMainVideoPlaying(status.isPlaying);
                    }}
                  />
                  {!isMainVideoPlaying ? (
                    <TouchableOpacity
                      style={styles.mainVideoPlayButton}
                      onPress={() => {
                        mainVideoRef?.playAsync().catch(() => {});
                      }}
                    >
                      <Ionicons name="play" size={26} color="#FFFFFF" />
                    </TouchableOpacity>
                  ) : null}
                  <View style={styles.mainVideoBadge}>
                    <Ionicons name="videocam" size={14} color="#FFFFFF" />
                    <Text style={styles.mainVideoBadgeText}>VIDEO</Text>
                  </View>
                </View>
              ) : (
                <Image source={{ uri: currentMediaUrl }} style={styles.mainImage} resizeMode="cover" />
              )}
            </View>

            {media.length > 1 ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={[styles.thumbnailRow, styles.thumbnailRowRtl, { width: mediaWidth }]}
              >
                {media.map((url, index) => {
                  const isActive = index === activeImageIndex;
                  const isVideo = isVideoUrl(url);
                  return (
                    <TouchableOpacity
                      key={`${url}-${index}`}
                      onPress={() => setActiveImageIndex(index)}
                      style={[styles.thumbnailWrap, isActive && styles.thumbnailWrapActive]}
                    >
                      {isVideo ? (
                        <View style={styles.thumbnailVideoWrap}>
                          <ResponsiveVideo
                            uri={getPublicMediaUrl(url)}
                            autoPlay={false}
                            controls={false}
                            containerStyle={styles.thumbnail}
                          />
                          <View style={styles.thumbnailVideoOverlay}>
                            <Ionicons name="play" size={14} color="#FFFFFF" />
                          </View>
                        </View>
                      ) : (
                        <Image source={{ uri: getPublicMediaUrl(url) }} style={styles.thumbnail} resizeMode="cover" />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            ) : null}

            <View style={[styles.section, styles.heroSection]}>
              <Text style={styles.productTitle}>{product.title}</Text>

              <View style={styles.priceRow}>
                <Text style={styles.price}>GH₵ {Number(product.price).toFixed(2)}</Text>
                {product.original_price && Number(product.original_price) > Number(product.price) ? (
                  <Text style={styles.originalPrice}>GH₵ {Number(product.original_price).toFixed(2)}</Text>
                ) : null}
              </View>

              <View style={styles.badgesRow}>
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{product.category}</Text>
                </View>
                {product.sub_category ? (
                  <View style={styles.badgeMuted}>
                    <Text style={styles.badgeMutedText}>{product.sub_category}</Text>
                  </View>
                ) : null}
                {product.is_service ? (
                  <View style={styles.badgeService}>
                    <Text style={styles.badgeServiceText}>Service</Text>
                  </View>
                ) : null}
                {product.is_pre_order ? (
                  <View style={styles.badgePreOrder}>
                    <Text style={styles.badgePreOrderText}>Pre-order</Text>
                  </View>
                ) : null}
              </View>
            </View>

            <View style={[styles.section, styles.sellerSection]}>
              <View style={styles.sellerHeaderRow}>
                <Image source={{ uri: getPublicAvatarUrl(product.avatar_url) }} style={styles.sellerAvatar} />
                <View style={styles.sellerTextWrap}>
                  <Text numberOfLines={1} style={styles.sellerName}>{product.display_name || 'Seller'}</Text>
                  <Text numberOfLines={1} style={styles.sellerSubText}>{product.shop_name || 'No shop name'}</Text>
                </View>
                {product.university ? (
                  <View style={styles.universityPill}>
                    <Ionicons name="school-outline" size={12} color="#1D4ED8" />
                    <Text numberOfLines={1} style={styles.universityPillText}>{product.university}</Text>
                  </View>
                ) : null}
              </View>
            </View>

            <View style={styles.infoTabsWrap}>
              <TouchableOpacity
                style={[styles.infoTabButton, activeInfoTab === 'description' && styles.infoTabButtonActive]}
                onPress={() => setActiveInfoTab('description')}
              >
                <Text style={[styles.infoTabButtonText, activeInfoTab === 'description' && styles.infoTabButtonTextActive]}>
                  Description
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.infoTabButton, activeInfoTab === 'productInfo' && styles.infoTabButtonActive]}
                onPress={() => setActiveInfoTab('productInfo')}
              >
                <Text style={[styles.infoTabButtonText, activeInfoTab === 'productInfo' && styles.infoTabButtonTextActive]}>
                  Product Info
                </Text>
              </TouchableOpacity>
            </View>

            {activeInfoTab === 'description' ? (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Description</Text>
                <Text style={styles.sectionText}>{product.description?.trim() || 'No description provided.'}</Text>
              </View>
            ) : null}

            {activeInfoTab === 'productInfo' && productInfoItems.length ? (
              <View style={[styles.section, styles.productInfoSection]}>
                <View style={styles.productInfoHeader}>
                  <View style={styles.productInfoHeaderIcon}>
                    <Ionicons name="information-circle-outline" size={14} color="#1D4ED8" />
                  </View>
                  <Text style={styles.sectionTitle}>Product Info</Text>
                </View>

                <View style={styles.infoCardsWrap}>
                  {productInfoItems.map((item) => (
                    <View key={item.key} style={styles.infoCard}>
                      <View style={styles.infoCardLeft}>
                        <View style={styles.infoIconWrap}>
                          <Ionicons name={item.icon} size={14} color="#1D4ED8" />
                        </View>
                        <Text style={styles.infoLabel}>{item.label}</Text>
                      </View>
                      <Text style={styles.infoValue} numberOfLines={2}>{item.value}</Text>
                    </View>
                  ))}
                </View>
              </View>
            ) : null}

            {product.is_pre_order ? (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Pre-order</Text>
                <Text style={styles.sectionText}>
                  {product.pre_order_duration
                    ? `${product.pre_order_duration} ${product.pre_order_duration_unit || 'days'}`
                    : 'Pre-order enabled'}
                </Text>
              </View>
            ) : null}

            {product.sizes_available?.length ? (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Sizes Available</Text>
                <View style={styles.chipsRow}>
                  {product.sizes_available.map((size) => (
                    <View key={size} style={styles.chip}>
                      <Text style={styles.chipText}>{size}</Text>
                    </View>
                  ))}
                </View>
              </View>
            ) : null}

            {product.colors_available?.length ? (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Colors Available</Text>
                <View style={styles.chipsRow}>
                  {product.colors_available.map((color) => (
                    <View key={color} style={styles.chipMuted}>
                      <Text style={styles.chipMutedText}>{color}</Text>
                    </View>
                  ))}
                </View>
              </View>
            ) : null}
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.viewShopButton, !product.seller_id && styles.viewShopButtonDisabled]}
              activeOpacity={0.88}
              disabled={!product.seller_id}
              onPress={() => {
                if (!product.seller_id) return;
                onClose();
                onViewShop?.(product);
              }}
            >
              <Ionicons name="storefront-outline" size={18} color="#FFFFFF" />
              <Text style={styles.viewShopButtonText}>View Shop</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.58)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  menuCard: {
    width: '100%',
    maxWidth: 840,
    maxHeight: '92%',
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 16,
    elevation: 12,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
  },
  headerLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginRight: 12,
  },
  headerIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#DBEAFE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTextWrap: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  headerSubtitle: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  closeButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E2E8F0',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 34,
    borderRadius: 17,
    paddingHorizontal: 12,
    backgroundColor: '#2563EB',
  },
  editButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    gap: 14,
  },
  imageWrap: {
    alignSelf: 'center',
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#E2E8F0',
  },
  mainImage: {
    width: '100%',
    height: '100%',
  },
  mainVideoWrap: {
    width: '100%',
    height: '100%',
    backgroundColor: '#000000',
    position: 'relative',
  },
  mainVideoPlayButton: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: 60,
    height: 60,
    marginTop: -30,
    marginLeft: -30,
    borderRadius: 30,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.45)',
  },
  mainVideoBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    borderRadius: 7,
    backgroundColor: 'rgba(15, 23, 42, 0.78)',
    paddingHorizontal: 8,
    paddingVertical: 5,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  mainVideoBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  thumbnailRow: {
    flexDirection: 'row',
    gap: 8,
    alignSelf: 'center',
  },
  thumbnailRowRtl: {
    flexDirection: 'row-reverse',
  },
  thumbnailWrap: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
  },
  thumbnailWrapActive: {
    borderColor: '#2563EB',
    borderWidth: 2,
  },
  thumbnail: {
    width: 72,
    height: 72,
  },
  thumbnailVideoWrap: {
    width: 72,
    height: 72,
    backgroundColor: '#000000',
    position: 'relative',
  },
  thumbnailVideoOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  section: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    padding: 14,
  },
  heroSection: {
    backgroundColor: '#F8FAFC',
    borderColor: '#DBEAFE',
  },
  sellerSection: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
  },
  sellerHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  sellerAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 2,
    borderColor: '#DBEAFE',
  },
  sellerTextWrap: {
    flex: 1,
  },
  sellerName: {
    fontSize: 14,
    color: '#0F172A',
    fontWeight: '700',
  },
  sellerSubText: {
    marginTop: 2,
    fontSize: 12,
    color: '#64748B',
  },
  universityPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#DBEAFE',
    maxWidth: 210,
  },
  universityPillText: {
    fontSize: 11,
    color: '#1D4ED8',
    fontWeight: '600',
  },
  productTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 8,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  price: {
    fontSize: 22,
    fontWeight: '700',
    color: '#F68B1E',
  },
  originalPrice: {
    fontSize: 14,
    color: '#94A3B8',
    textDecorationLine: 'line-through',
  },
  badgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  badge: {
    backgroundColor: '#DBEAFE',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  badgeText: {
    color: '#1D4ED8',
    fontSize: 12,
    fontWeight: '600',
  },
  badgeMuted: {
    backgroundColor: '#E2E8F0',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  badgeMutedText: {
    color: '#334155',
    fontSize: 12,
    fontWeight: '600',
  },
  badgeService: {
    backgroundColor: '#DCFCE7',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  badgeServiceText: {
    color: '#166534',
    fontSize: 12,
    fontWeight: '600',
  },
  badgePreOrder: {
    backgroundColor: '#EDE9FE',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  badgePreOrderText: {
    color: '#6D28D9',
    fontSize: 12,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  sectionText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#334155',
  },
  infoTabsWrap: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  infoTabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 9,
    minHeight: 36,
    paddingHorizontal: 10,
    backgroundColor: 'transparent',
  },
  infoTabButtonActive: {
    backgroundColor: '#DBEAFE',
  },
  infoTabButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  infoTabButtonTextActive: {
    color: '#1D4ED8',
  },
  productInfoSection: {
    backgroundColor: '#F8FAFC',
    borderColor: '#DBEAFE',
  },
  productInfoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  productInfoHeaderIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#DBEAFE',
  },
  infoCardsWrap: {
    gap: 8,
  },
  infoCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingVertical: 9,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  infoCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 1,
    minWidth: 0,
  },
  infoIconWrap: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  infoLabel: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '600',
  },
  infoValue: {
    fontSize: 13,
    color: '#0F172A',
    fontWeight: '600',
    maxWidth: '65%',
    textAlign: 'right',
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    borderRadius: 999,
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  chipText: {
    color: '#065F46',
    fontSize: 12,
    fontWeight: '600',
  },
  chipMuted: {
    borderRadius: 999,
    backgroundColor: '#E2E8F0',
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  chipMutedText: {
    color: '#334155',
    fontSize: 12,
    fontWeight: '600',
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  viewShopButton: {
    flex: 1,
    maxWidth: 220,
    minHeight: 46,
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    alignSelf: 'center',
    backgroundColor: '#0F766E',
    borderWidth: 1,
    borderColor: '#0D5F59',
    shadowColor: '#0D5F59',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 3,
  },
  viewShopButtonDisabled: {
    opacity: 0.5,
  },
  viewShopButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
});

export default ProductDetailsMenu;
