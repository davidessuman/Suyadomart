import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';

const SUPABASE_URL = 'https://qwujadyqebfypyhfuwfl.supabase.co';

type Product = any;

interface ProductFeedCardProps {
  item: Product;
  ITEM_HEIGHT: number;
  width: number;
  insets: any;
  openModal: (p: any, fromCart: boolean) => void;
  openComments: (p: any) => void;
  openSellerProfile: (id: string) => void;
  videoRef: (ref: any) => void;
  setProducts: React.Dispatch<React.SetStateAction<any[]>>;
  onAddToCart: (product: any) => Promise<void>;
  onPlaceOrder: (product: any, options?: { selectedColor?: string | null; selectedSize?: string | null; quantity?: number | null }) => void;
  onShare: (product: any, platform: string) => Promise<void>;
  showAlert: (title: string, message: string, buttons?: any[]) => void;
  theme: any;
  styles: any;
  getCurrentUserId: () => Promise<string | null>;
  getCardDisplayUrl: (urls?: string[] | null) => string;
  ShareModalComponent: React.ComponentType<any>;
}

const ProductFeedCard: React.FC<ProductFeedCardProps> = ({
  item,
  ITEM_HEIGHT,
  width,
  insets,
  openModal,
  openComments,
  openSellerProfile,
  videoRef,
  setProducts,
  onAddToCart,
  onPlaceOrder,
  onShare,
  showAlert,
  theme,
  styles,
  getCurrentUserId,
  getCardDisplayUrl,
  ShareModalComponent,
}) => {
  const { width: windowWidth } = useWindowDimensions();
  const isLargeScreenCard = windowWidth >= 768;
  const router = useRouter();

  const requireAuth = (action: string = 'continue') => {
    showAlert('Login Required', `Please log in or sign up to ${action}.`, [
      { text: 'Maybe later', style: 'cancel' },
      { text: 'Login / Sign up', onPress: () => router.push('/auth') },
    ]);
  };

  const [showHeart, setShowHeart] = useState(false);
  const [addingToCart, setAddingToCart] = useState(false);
  const [shareMenuVisible, setShareMenuVisible] = useState(false);
  const [likeLoading, setLikeLoading] = useState(false);
  const doubleTapRef = useRef<number | null>(null);
  const tapTimeoutRef = useRef<any>(null);
  const localVideoRef = useRef<any>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isBuffering, setIsBuffering] = useState(false);

  const handleTap = async () => {
    const now = Date.now();
    if (doubleTapRef.current && now - doubleTapRef.current < 300) {
      doubleTapRef.current = null;
      if (likeLoading) return;
      if (item.isLiked) return;

      setShowHeart(true);
      setTimeout(() => setShowHeart(false), 800);
      setLikeLoading(true);
      const userId = await getCurrentUserId();
      if (!userId) {
        requireAuth('like');
        setLikeLoading(false);
        return;
      }

      const { data: existingLike, error: checkError } = await supabase
        .from('product_likes')
        .select('id')
        .eq('product_id', item.id)
        .eq('user_id', userId)
        .maybeSingle();
      if (checkError) {
        showAlert('Error', 'Failed to check like status');
        setLikeLoading(false);
        return;
      }
      if (existingLike) {
        setProducts((prev) =>
          prev.map((p) => (p.id === item.id ? { ...p, isLiked: true, likeCount: p.likeCount || 1 } : p)),
        );
        setLikeLoading(false);
        return;
      }

      const previousLikeCount = item.likeCount || 0;
      setProducts((prev) =>
        prev.map((p) => (p.id === item.id ? { ...p, isLiked: true, likeCount: previousLikeCount + 1 } : p)),
      );
      try {
        const { error } = await supabase.from('product_likes').insert({ product_id: item.id, user_id: userId });
        if (error) throw error;
      } catch (error) {
        showAlert('Error', 'Failed to like');
        setProducts((prev) =>
          prev.map((p) =>
            p.id === item.id ? { ...p, isLiked: false, likeCount: Math.max((p.likeCount || 1) - 1, 0) } : p,
          ),
        );
      } finally {
        setLikeLoading(false);
      }

      if (tapTimeoutRef.current) {
        clearTimeout(tapTimeoutRef.current);
        tapTimeoutRef.current = null;
      }
      return;
    }

    doubleTapRef.current = now;
    if (tapTimeoutRef.current) clearTimeout(tapTimeoutRef.current);
    tapTimeoutRef.current = setTimeout(async () => {
      try {
        if (localVideoRef.current && typeof localVideoRef.current.getStatusAsync === 'function') {
          const status: any = await localVideoRef.current.getStatusAsync();
          if (status.isPlaying) {
            await localVideoRef.current.pauseAsync();
            setIsPlaying(false);
          } else {
            await localVideoRef.current.playAsync();
            setIsPlaying(true);
          }
        } else {
          setIsPlaying((prev) => !prev);
        }
      } catch (e) {
      }
      tapTimeoutRef.current = null;
    }, 300);
  };

  useEffect(() => {
    return () => {
      if (tapTimeoutRef.current) clearTimeout(tapTimeoutRef.current);
    };
  }, []);

  const handleSharePress = () => {
    setShareMenuVisible(true);
  };

  const handleShareToPlatform = async (platform: string) => {
    try {
      const userId = await getCurrentUserId();

      if (!userId) {
        requireAuth('share');
        return;
      }

      setProducts((prev) =>
        prev.map((p) =>
          p.id === item.id
            ? {
                ...p,
                shareCount: (p.shareCount || 0) + 1,
                isShared: true,
              }
            : p,
        ),
      );

      let imageUrl = '';
      if (item.media_urls?.[0]) {
        if (item.media_urls[0].startsWith('http')) {
          imageUrl = item.media_urls[0];
        } else {
          imageUrl = `${SUPABASE_URL}/storage/v1/object/public/products/${item.media_urls[0]}`;
        }
      }

      const { error } = await supabase.from('product_shares').insert({
        product_id: item.id,
        user_id: userId,
        platform: platform,
        shared_at: new Date().toISOString(),
      });

      if (error) {
        setProducts((prev) =>
          prev.map((p) =>
            p.id === item.id
              ? {
                  ...p,
                  shareCount: Math.max((p.shareCount || 1) - 1, 0),
                  isShared: false,
                }
              : p,
          ),
        );

        return;
      }

      await onShare(item, platform);
    } catch (error) {
      showAlert('Error', 'Failed to share product');
    }
  };

  const handleFollowToggle = async () => {
    const userId = await getCurrentUserId();
    if (!userId) {
      requireAuth('follow');
      return;
    }
    const newFollowed = !item.isFollowed;
    setProducts((prev) =>
      prev.map((p) =>
        p.seller_id === item.seller_id
          ? {
              ...p,
              isFollowed: newFollowed,
              followerCount: (p.followerCount || 0) + (newFollowed ? 1 : -1),
            }
          : p,
      ),
    );
    try {
      if (newFollowed) {
        const { error } = await supabase.from('shop_follows').insert({ shop_owner_id: item.seller_id, follower_id: userId });
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('shop_follows')
          .delete()
          .eq('shop_owner_id', item.seller_id)
          .eq('follower_id', userId);
        if (error) throw error;
      }
    } catch (error) {
      showAlert('Error', 'Failed to follow/unfollow');
      setProducts((prev) =>
        prev.map((p) =>
          p.seller_id === item.seller_id
            ? {
                ...p,
                isFollowed: !newFollowed,
                followerCount: (p.followerCount || 0) + (newFollowed ? -1 : 1),
              }
            : p,
        ),
      );
    }
  };

  const handleLikeToggle = async () => {
    if (likeLoading) return;

    const userId = await getCurrentUserId();
    if (!userId) {
      requireAuth('like');
      return;
    }

    setLikeLoading(true);
    const previousLikeCount = item.likeCount || 0;

    try {
      if (item.isLiked) {
        setProducts((prev) =>
          prev.map((p) =>
            p.id === item.id ? { ...p, isLiked: false, likeCount: Math.max(previousLikeCount - 1, 0) } : p,
          ),
        );
        const { error } = await supabase.from('product_likes').delete().eq('product_id', item.id).eq('user_id', userId);
        if (error) throw error;
      } else {
        const { data: existingLike, error: checkError } = await supabase
          .from('product_likes')
          .select('id')
          .eq('product_id', item.id)
          .eq('user_id', userId)
          .maybeSingle();
        if (checkError) throw checkError;

        if (existingLike) {
          setProducts((prev) =>
            prev.map((p) => (p.id === item.id ? { ...p, isLiked: true, likeCount: previousLikeCount } : p)),
          );
          return;
        }

        setProducts((prev) =>
          prev.map((p) => (p.id === item.id ? { ...p, isLiked: true, likeCount: previousLikeCount + 1 } : p)),
        );

        const { error } = await supabase.from('product_likes').insert({ product_id: item.id, user_id: userId });
        if (error) throw error;
      }
    } catch (error) {
      showAlert('Error', 'Failed to update like');
      setProducts((prev) =>
        prev.map((p) => (p.id === item.id ? { ...p, isLiked: !item.isLiked, likeCount: previousLikeCount } : p)),
      );
    } finally {
      setLikeLoading(false);
    }
  };

  const handleAddToCart = async () => {
    const userId = await getCurrentUserId();
    if (!userId) {
      requireAuth('add items to your cart');
      return;
    }

    setAddingToCart(true);
    try {
      await onAddToCart(item);
      showAlert('Success', 'Product added to cart!');
    } catch (error) {
      showAlert('Sorry', 'Product is already in cart');
    } finally {
      setAddingToCart(false);
    }
  };

  const handlePlaceOrder = () => {
    getCurrentUserId().then((userId) => {
      if (!userId) {
        requireAuth('place an order');
        return;
      }
      onPlaceOrder(item);
    });
  };

  return (
    <View style={{ height: ITEM_HEIGHT, width, backgroundColor: theme.background }}>
      <View
        style={[
          styles.productSeparator,
          {
            backgroundColor: theme.primary,
            shadowColor: theme.primary,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.6,
            shadowRadius: 8,
            elevation: 10,
          },
        ]}
      />

      <LinearGradient colors={[theme.background, 'transparent']} style={styles.topGradientFade} />

      <View style={{ ...StyleSheet.absoluteFillObject, backgroundColor: theme.overlay }} />
      <TouchableOpacity
        activeOpacity={1}
        style={[styles.mediaContainer, { alignItems: 'center', justifyContent: 'center' }]}
        onPress={handleTap}
      >
        {item.isVideo ? (
          <View
            style={[
              { flex: 1, backgroundColor: theme.background, width: '100%' },
              isLargeScreenCard && { width: Math.min(width * 0.7, 500), alignSelf: 'center' },
            ]}
          >
            <View style={{ width: '100%', flex: 1, justifyContent: 'center', alignItems: 'center' }}>
              {item.media_urls?.[0] && (
                <Video
                  source={{
                    uri: item.media_urls[0].startsWith('http')
                      ? item.media_urls[0]
                      : `${SUPABASE_URL}/storage/v1/object/public/products/${item.media_urls[0]}`,
                  }}
                  style={{ width: '100%', height: '100%' }}
                  resizeMode={isLargeScreenCard ? ResizeMode.COVER : ResizeMode.CONTAIN}
                  isLooping
                  shouldPlay={isPlaying}
                  useNativeControls={false}
                  ref={(ref: any) => {
                    localVideoRef.current = ref;
                    if (videoRef) videoRef(ref);
                  }}
                  onPlaybackStatusUpdate={(status: any) => {
                    setIsBuffering(!!status.isBuffering);
                    setIsPlaying(!!status.isPlaying);
                  }}
                  progressUpdateIntervalMillis={500}
                />
              )}

              {!isPlaying && !isBuffering && (
                <View
                  style={{
                    position: 'absolute',
                    left: 0,
                    right: 0,
                    top: 0,
                    bottom: 0,
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
                  pointerEvents="none"
                >
                  <View style={styles.tiktokPlayButton}>
                    <Ionicons name="play" size={34} color="#fff" />
                  </View>
                </View>
              )}
            </View>
          </View>
        ) : (
          <Image
            source={{ uri: getCardDisplayUrl(item.media_urls) }}
            style={[
              styles.mainMediaImage,
              isLargeScreenCard ? { maxWidth: Math.min(windowWidth * 0.9, 900), alignSelf: 'center' } : {},
            ]}
            resizeMode="contain"
          />
        )}
        {showHeart && (
          <View style={styles.doubleTapHeart}>
            <Ionicons name="heart" size={100} color="#f21313ff" />
          </View>
        )}
      </TouchableOpacity>
      <LinearGradient colors={['transparent', theme.gradientStart, theme.gradientEnd]} style={[styles.gradientOverlay, { height: ITEM_HEIGHT * 0.4 }]} />

      <View
        style={[
          styles.bottomProductMarker,
          {
            backgroundColor: theme.surface,
            borderTopColor: theme.primary,
            borderTopWidth: 3,
          },
        ]}
      >
        <View style={[styles.swipeIndicator, { backgroundColor: theme.textTertiary }]} />
        <Text style={[styles.swipeText, { color: theme.textSecondary }]}>Swipe up for next product</Text>
      </View>

      <View style={[styles.leftSidebar, { top: insets.top + 80 }]}> 
        <View
          style={[
            styles.availabilityBadge,
            { position: 'relative', alignSelf: 'center', marginBottom: 10, backgroundColor: item.is_pre_order ? theme.primary : theme.success },
          ]}
        >
          <Ionicons name={item.is_pre_order ? 'time-outline' : 'checkmark-circle'} size={14} color="#fff" />
          <Text style={styles.availabilityBadgeText}>{item.is_pre_order ? 'Pre-Order' : 'In Stock'}</Text>
        </View>
        <TouchableOpacity style={styles.leftSidebarItem} onPress={handleAddToCart} disabled={addingToCart}>
          {addingToCart ? (
            <ActivityIndicator size="small" color={theme.primary} />
          ) : (
            <Ionicons name={item.inCart ? 'cart' : 'cart-outline'} size={26} color={item.inCart ? theme.primary : '#0d20f2ff'} style={styles.shadowIcon} />
          )}
          <Text style={[styles.leftSidebarText, { color: '#fff' }]}>Cart</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.leftSidebarItem} onPress={handlePlaceOrder}>
          <Ionicons name="bag-check-outline" size={26} color="#0726efff" style={styles.shadowIcon} />
          <Text style={[styles.leftSidebarText, { color: '#fff' }]}>Order</Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.rightSidebar, { bottom: insets.bottom + 90 }]}>
        <View style={styles.sidebarItem}>
          <TouchableOpacity style={[styles.avatarBorder, { borderColor: theme.primary }]} onPress={() => openSellerProfile(item.seller_id)}>
            <Image source={{ uri: item.avatar_url }} style={styles.sidebarAvatar} />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.followButton, { backgroundColor: theme.background, borderColor: theme.primary }]} onPress={handleFollowToggle}>
            <Text style={item.isFollowed ? [styles.followingText, { color: '#fda306ff' }] : [styles.followText, { color: theme.primary }]}>
              {item.isFollowed ? 'Following' : 'Follow'}
            </Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity style={styles.sidebarItem} onPress={handleLikeToggle} disabled={likeLoading}>
          {likeLoading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Ionicons name={item.isLiked ? 'heart' : 'heart-outline'} size={28} color={item.isLiked ? '#FF3B30' : '#fff'} style={styles.shadowIcon} />
          )}
          <Text style={[styles.sidebarText, { color: '#fff' }]}>{item.likeCount || 0}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.sidebarItem} onPress={() => openComments(item)}>
          <Ionicons name="chatbubble-outline" size={26} color="#fff" style={styles.shadowIcon} />
          <Text style={[styles.sidebarText, { color: '#fff' }]}>{item.commentCount || 0}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.sidebarItem} onPress={handleSharePress}>
          <Ionicons name="share-social" size={25} color="#fff" style={styles.shadowIcon} />
          <Text style={[styles.sidebarText, { color: '#fff' }]}>{item.shareCount || 0}</Text>
        </TouchableOpacity>
      </View>

      <View
        style={[
          styles.bottomInfoContainer,
          {
            width: isLargeScreenCard ? Math.min(width * 0.35, 420) : width - 80,
            bottom: insets.bottom + (isLargeScreenCard ? 60 : 50),
            ...(isLargeScreenCard ? { left: undefined, right: 18 } : { left: 18 }),
          },
        ]}
      >
        <View
          style={[
            styles.productInfoCard,
            {
              backgroundColor: `${theme.background}E6`,
              borderColor: theme.border,
              shadowColor: theme.shadow,
            },
          ]}
        >
          <View style={[styles.productCardHeader, { borderBottomColor: theme.border }]}>
            <Ionicons name="pricetag" size={16} color={theme.primary} style={{ marginRight: 6 }} />
            <Text style={[styles.productLabel, { color: theme.textSecondary }]}>PRODUCT</Text>
          </View>
          <Text style={[styles.titleTeaser, { color: theme.text }]} numberOfLines={2}>
            {item.title}
          </Text>
          <View style={styles.userInfoColumn}>
            <Text style={[styles.username, { color: theme.primary }]}>@{(item.display_name || '').toLowerCase()}</Text>
          </View>
          <TouchableOpacity
            style={[
              styles.viewProductButton,
              {
                backgroundColor: theme.primary,
                shadowColor: theme.primary,
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 8,
                elevation: 5,
              },
            ]}
            onPress={() => openModal(item, false)}
          >
            <Ionicons name="eye" size={16} color={theme.background} style={{ marginRight: 6 }} />
            <Text style={[styles.viewProductButtonText, { color: theme.background }]}>View Details</Text>
          </TouchableOpacity>
        </View>
      </View>
      <ShareModalComponent
        isVisible={shareMenuVisible}
        onClose={() => setShareMenuVisible(false)}
        product={item}
        order={null}
        onShare={handleShareToPlatform}
        showAlert={showAlert}
        theme={theme}
        styles={styles}
      />
    </View>
  );
};

export default ProductFeedCard;