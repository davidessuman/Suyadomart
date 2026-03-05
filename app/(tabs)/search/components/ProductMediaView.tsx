import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  useWindowDimensions,
  useColorScheme,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ResponsiveVideo from '@/components/ResponsiveVideo';

const PRIMARY_COLOR = '#F68B1E';

const isVideoUrl = (url: string): boolean => {
  if (!url) return false;
  const lowerUrl = url.toLowerCase();
  return lowerUrl.includes('.mp4') ||
         lowerUrl.includes('.mov') ||
         lowerUrl.includes('.avi') ||
         lowerUrl.includes('.webm') ||
         lowerUrl.includes('.wmv');
};

const ProductMediaView = ({
  urls,
  onPressMedia,
  color_media,
  colors_available,
  selectedColor,
  onColorSelect,
  mediaWidth,
  mediaHeight
}: {
  urls: string[];
  onPressMedia: (i: number) => void;
  color_media?: Record<string, string[]>;
  colors_available?: string[];
  selectedColor?: string;
  onColorSelect?: (color: string) => void;
  mediaWidth?: number;
  mediaHeight?: number;
}) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const { width } = useWindowDimensions();
  const flatListRef = useRef<FlatList>(null);
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const borderColor = isDark ? '#333' : '#e0e0e0';
  const backgroundColor = isDark ? '#1a1a1a' : '#f5f5f5';

  const containerWidth = mediaWidth || width * 0.9;
  const containerHeight = mediaHeight || containerWidth * 0.7;

  const normalizeMediaKey = (url: string) => {
    if (!url) return '';
    const withoutQuery = url.split('?')[0].split('#')[0];
    try {
      return decodeURIComponent(withoutQuery).toLowerCase();
    } catch {
      return withoutQuery.toLowerCase();
    }
  };

  const getMediaFileName = (url: string) => {
    const normalized = normalizeMediaKey(url);
    const parts = normalized.split('/');
    return parts[parts.length - 1] || normalized;
  };

  const mediaToColorMap = useMemo(() => {
    const map = new Map<string, string>();
    if (!color_media) return map;

    Object.entries(color_media).forEach(([color, mediaList]) => {
      if (!Array.isArray(mediaList)) return;

      mediaList.forEach((mediaUrl) => {
        const normalized = normalizeMediaKey(mediaUrl);
        const fileName = getMediaFileName(mediaUrl);

        map.set(normalized, color);
        map.set(fileName, color);
      });
    });

    return map;
  }, [color_media]);

  const syncColorFromMedia = (mediaUrl?: string) => {
    if (!mediaUrl || !onColorSelect || mediaToColorMap.size === 0) return;

    const normalized = normalizeMediaKey(mediaUrl);
    const fileName = getMediaFileName(mediaUrl);
    const matchedColor = mediaToColorMap.get(normalized) || mediaToColorMap.get(fileName);

    if (matchedColor && matchedColor !== selectedColor) {
      onColorSelect(matchedColor);
    }
  };

  const currentMedia = urls || [];

  useEffect(() => {
    if (!selectedColor || !color_media?.[selectedColor]?.length || currentMedia.length === 0) return;

    const currentUrl = currentMedia[activeIndex];
    const currentMatchedColor = currentUrl
      ? (mediaToColorMap.get(normalizeMediaKey(currentUrl)) || mediaToColorMap.get(getMediaFileName(currentUrl)))
      : undefined;

    if (currentMatchedColor === selectedColor) return;

    const selectedColorMedia = color_media[selectedColor] || [];
    const selectedColorMediaKeys = new Set<string>();

    selectedColorMedia.forEach((url) => {
      selectedColorMediaKeys.add(normalizeMediaKey(url));
      selectedColorMediaKeys.add(getMediaFileName(url));
    });

    const firstMatchingIndex = currentMedia.findIndex((url) => (
      selectedColorMediaKeys.has(normalizeMediaKey(url)) ||
      selectedColorMediaKeys.has(getMediaFileName(url))
    ));

    if (firstMatchingIndex === -1 || firstMatchingIndex === activeIndex) return;

    setActiveIndex(firstMatchingIndex);
    flatListRef.current?.scrollToOffset({
      offset: firstMatchingIndex * containerWidth,
      animated: true,
    });
  }, [selectedColor, color_media, currentMedia, activeIndex, containerWidth, mediaToColorMap]);

  if (!currentMedia?.length) return null;

  const handlePrevMedia = () => {
    const newIndex = activeIndex === 0 ? currentMedia.length - 1 : activeIndex - 1;
    setActiveIndex(newIndex);
    flatListRef.current?.scrollToOffset({ offset: newIndex * containerWidth, animated: true });
    syncColorFromMedia(currentMedia[newIndex]);
  };

  const handleNextMedia = () => {
    const newIndex = (activeIndex + 1) % currentMedia.length;
    setActiveIndex(newIndex);
    flatListRef.current?.scrollToOffset({ offset: newIndex * containerWidth, animated: true });
    syncColorFromMedia(currentMedia[newIndex]);
  };

  const handleMomentumScrollEnd = (e: any) => {
    if (e?.nativeEvent?.contentOffset?.x !== undefined) {
      const newIndex = Math.round(e.nativeEvent.contentOffset.x / containerWidth);
      if (newIndex !== activeIndex && newIndex < currentMedia.length) {
        setActiveIndex(newIndex);
        syncColorFromMedia(currentMedia[newIndex]);
      }
    }
  };

  return (
    <View style={{ alignItems: 'center', marginBottom: 20 }}>
      <View
        style={{
          width: containerWidth,
          height: containerHeight,
          backgroundColor: backgroundColor,
          borderRadius: 12,
          overflow: 'hidden',
          position: 'relative',
          borderWidth: 1,
          borderColor: borderColor
        }}
      >
        <FlatList
          ref={flatListRef}
          data={currentMedia}
          horizontal
          pagingEnabled
          scrollEnabled={currentMedia.length > 1}
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={handleMomentumScrollEnd}
          scrollEventThrottle={16}
          keyExtractor={(_, i) => i.toString()}
          style={{ width: containerWidth, alignSelf: 'center' }}
          renderItem={({ item: url, index }) => {
            const isVideo = isVideoUrl(url);

            if (isVideo) {
              return (
                <TouchableOpacity
                  style={{
                    width: containerWidth,
                    height: containerHeight,
                    backgroundColor: '#000',
                    justifyContent: 'center',
                    alignItems: 'center'
                  }}
                  activeOpacity={0.9}
                  onPress={() => onPressMedia(index)}
                >
                  <ResponsiveVideo
                    uri={url}
                    autoPlay={false}
                    controls={false}
                    containerStyle={{ width: '100%', height: '100%', borderRadius: 16 }}
                  />

                  <View
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      justifyContent: 'center',
                      alignItems: 'center',
                      backgroundColor: 'rgba(0,0,0,0.3)'
                    }}
                  >
                    <View style={{
                      backgroundColor: 'rgba(255,255,255,0.95)',
                      width: 70,
                      height: 70,
                      borderRadius: 35,
                      justifyContent: 'center',
                      alignItems: 'center',
                      shadowColor: '#000',
                      shadowOffset: { width: 0, height: 4 },
                      shadowOpacity: 0.4,
                      shadowRadius: 6,
                      elevation: 8
                    }}>
                      <Ionicons name="play" size={32} color={PRIMARY_COLOR} />
                    </View>
                  </View>

                  <View style={{
                    position: 'absolute',
                    top: 12,
                    right: 12,
                    backgroundColor: 'rgba(0,0,0,0.75)',
                    paddingHorizontal: 10,
                    paddingVertical: 6,
                    borderRadius: 6,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6
                  }}>
                    <Ionicons name="videocam" size={14} color="#fff" />
                    <Text style={{ color: '#fff', fontSize: 11, fontWeight: '600' }}>VIDEO</Text>
                  </View>
                </TouchableOpacity>
              );
            } else {
              return (
                <TouchableOpacity
                  style={{
                    width: containerWidth,
                    height: containerHeight,
                    backgroundColor: backgroundColor,
                    justifyContent: 'center',
                    alignItems: 'center'
                  }}
                  activeOpacity={0.9}
                  onPress={() => onPressMedia(index)}
                >
                  <Image
                    source={{ uri: url || 'https://via.placeholder.com/400' }}
                    style={{ width: '100%', height: '100%' }}
                    resizeMode="contain"
                  />
                </TouchableOpacity>
              );
            }
          }}
        />

        {currentMedia.length > 1 && (
          <>
            <TouchableOpacity
              style={{
                position: 'absolute',
                left: 12,
                top: '50%',
                marginTop: -20,
                backgroundColor: 'rgba(0,0,0,0.5)',
                width: 40,
                height: 40,
                borderRadius: 20,
                justifyContent: 'center',
                alignItems: 'center',
                zIndex: 10
              }}
              onPress={handlePrevMedia}
            >
              <Ionicons name="chevron-back" size={24} color="#fff" />
            </TouchableOpacity>

            <TouchableOpacity
              style={{
                position: 'absolute',
                right: 12,
                top: '50%',
                marginTop: -20,
                backgroundColor: 'rgba(0,0,0,0.5)',
                width: 40,
                height: 40,
                borderRadius: 20,
                justifyContent: 'center',
                alignItems: 'center',
                zIndex: 10
              }}
              onPress={handleNextMedia}
            >
              <Ionicons name="chevron-forward" size={24} color="#fff" />
            </TouchableOpacity>
          </>
        )}

        {currentMedia.length > 1 && (
          <View style={{
            position: 'absolute',
            bottom: 12,
            right: 12,
            backgroundColor: 'rgba(0,0,0,0.6)',
            paddingHorizontal: 12,
            paddingVertical: 6,
            borderRadius: 6,
            zIndex: 10
          }}>
            <Text style={{ color: '#fff', fontSize: 12, fontWeight: '600' }}>
              {activeIndex + 1} / {currentMedia.length}
            </Text>
          </View>
        )}
      </View>

      {currentMedia.length > 1 && (
        <View style={{
          flexDirection: 'row',
          gap: 8,
          marginTop: 16,
          justifyContent: 'center'
        }}>
          {currentMedia.map((_, i) => (
            <TouchableOpacity
              key={i}
              style={{
                width: i === activeIndex ? 24 : 8,
                height: 8,
                borderRadius: 4,
                backgroundColor: i === activeIndex ? PRIMARY_COLOR : borderColor
              }}
              onPress={() => {
                setActiveIndex(i);
                flatListRef.current?.scrollToOffset({ offset: i * containerWidth, animated: true });
                    syncColorFromMedia(currentMedia[i]);
              }}
            />
          ))}
        </View>
      )}
    </View>
  );
};

export default ProductMediaView;
