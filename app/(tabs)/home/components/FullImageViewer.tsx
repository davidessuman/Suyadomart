import React, { useEffect, useRef, useState } from 'react';
import {
  Modal,
  StatusBar,
  View,
  TouchableOpacity,
  FlatList,
  Text,
  Image,
  useWindowDimensions,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Video, ResizeMode } from 'expo-av';

type FullImageViewerProps = {
  isVisible: boolean;
  onClose: () => void;
  mediaUrls: string[];
  initialIndex: number;
  theme: any;
  screenWidth: number;
};

const FullImageViewer: React.FC<FullImageViewerProps> = ({
  isVisible,
  onClose,
  mediaUrls,
  initialIndex,
  theme, screenWidth,
}) => {
  const [currentIndex, setCurrentIndex] = useState(Math.max(0, initialIndex || 0));
  const listRef = useRef<FlatList<any> | null>(null);
  const videoRefs = useRef<Record<number, any>>({});
  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 70 });
  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: any[] }) => {
    const firstVisible = viewableItems?.[0];
    if (typeof firstVisible?.index === 'number') {
      setCurrentIndex(prev => (prev === firstVisible.index ? prev : firstVisible.index));
    }
  });
  const { width: winWidth, height: winHeight } = useWindowDimensions();

  const styles = StyleSheet.create({
    fullViewerContainer: { flex: 1 },
    fullViewerCloseButton: {
      position: 'absolute',
      top: 42,
      right: 18,
      zIndex: 10,
      paddingHorizontal: 10,
      paddingVertical: 7,
      backgroundColor: 'rgba(0,0,0,0.45)',
      borderRadius: 16,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.22)',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
    },
    fullViewerCloseText: { color: '#fff', fontSize: 12, fontWeight: '600' },
    fullViewerMediaSlide: { width: winWidth, height: winHeight, justifyContent: 'center', alignItems: 'center' },
    fullViewerArrowButton: {
      position: 'absolute',
      top: '50%',
      marginTop: -20,
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: 'rgba(0,0,0,0.45)',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.22)',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 12,
    },
    fullViewerArrowLeft: { left: 14 },
    fullViewerArrowRight: { right: 14 },
    fullViewerPaginationText: { position: 'absolute', bottom: 30, color: '#fff', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 10, fontSize: 16, fontWeight: 'bold' },
  });

  const goToPreviousMedia = () => {
    if (mediaUrls.length <= 1) return;
    const nextIndex = Math.max(0, currentIndex - 1);
    listRef.current?.scrollToIndex({ index: nextIndex, animated: true });
    setCurrentIndex(nextIndex);
  };

  const goToNextMedia = () => {
    if (mediaUrls.length <= 1) return;
    const nextIndex = Math.min(mediaUrls.length - 1, currentIndex + 1);
    listRef.current?.scrollToIndex({ index: nextIndex, animated: true });
    setCurrentIndex(nextIndex);
  };

  useEffect(() => {
    if (isVisible && initialIndex >= 0 && initialIndex < mediaUrls.length) {
      setCurrentIndex(initialIndex);
      setTimeout(() => listRef.current?.scrollToIndex({ index: initialIndex, animated: false }), 50);
    }
  }, [isVisible, initialIndex, mediaUrls.length]);

  useEffect(() => {
    Object.keys(videoRefs.current).forEach((key) => {
      const index = parseInt(key);
      const videoRef = videoRefs.current[index];
      if (videoRef && index !== currentIndex) {
        videoRef.pauseAsync?.().catch(() => {});
      }
    });
  }, [currentIndex]);

  if (!isVisible || !mediaUrls?.length) return null;

  return (
    <Modal animationType="fade" transparent={true} visible={isVisible} onRequestClose={onClose}>
      <StatusBar hidden />
      <View style={[styles.fullViewerContainer, { backgroundColor: theme.background }]}>
        <TouchableOpacity style={styles.fullViewerCloseButton} onPress={onClose}>
          <Ionicons name="close" size={16} color="#fff" />
          <Text style={styles.fullViewerCloseText}>Cancel</Text>
        </TouchableOpacity>
        <FlatList
          ref={listRef}
          data={mediaUrls}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          keyExtractor={(_, i) => i.toString()}
          viewabilityConfig={viewabilityConfig.current}
          onViewableItemsChanged={onViewableItemsChanged.current}
          getItemLayout={(_, i) => ({ length: winWidth, offset: winWidth * i, index: i })}
          onMomentumScrollEnd={(e) => {
            const nextIndex = Math.round(e.nativeEvent.contentOffset.x / winWidth);
            setCurrentIndex(Math.max(0, Math.min(nextIndex, mediaUrls.length - 1)));
          }}
          onScrollToIndexFailed={() => {
            const safeIndex = Math.max(0, Math.min(initialIndex, mediaUrls.length - 1));
            setTimeout(() => listRef.current?.scrollToIndex({ index: safeIndex, animated: false }), 50);
          }}
          renderItem={({ item: url, index }) => {
            const isVideo = url.toLowerCase().includes('.mp4');
            const containerMaxWidth = Math.min(winWidth * 0.9, 1000);
            const containerMaxHeight = Math.min(winHeight * 0.9, 1000);
            return (
              <View style={[styles.fullViewerMediaSlide, { backgroundColor: theme.background, justifyContent: 'center', alignItems: 'center' }]}>
                <View style={{ width: containerMaxWidth, height: containerMaxHeight, justifyContent: 'center', alignItems: 'center' }}>
                  {isVideo ? (
                    <Video
                      ref={(ref) => {
                        if (ref) videoRefs.current[index] = ref;
                        else delete videoRefs.current[index];
                      }}
                      source={{ uri: url }}
                      style={{ width: '100%', height: '100%' }}
                      resizeMode={ResizeMode.CONTAIN}
                      isLooping
                      shouldPlay={currentIndex === index}
                      useNativeControls
                    />
                  ) : (
                    <Image source={{ uri: url }} style={{ width: '100%', height: '100%' }} resizeMode="contain" />
                  )}
                </View>
              </View>
            );
          }}
        />
        {mediaUrls.length > 1 && (
          <>
            <TouchableOpacity
              style={[styles.fullViewerArrowButton, styles.fullViewerArrowLeft]}
              onPress={goToPreviousMedia}
              disabled={currentIndex === 0}
            >
              <Ionicons name="chevron-back" size={20} color={currentIndex === 0 ? 'rgba(255,255,255,0.5)' : '#fff'} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.fullViewerArrowButton, styles.fullViewerArrowRight]}
              onPress={goToNextMedia}
              disabled={currentIndex === mediaUrls.length - 1}
            >
              <Ionicons name="chevron-forward" size={20} color={currentIndex === mediaUrls.length - 1 ? 'rgba(255,255,255,0.5)' : '#fff'} />
            </TouchableOpacity>
          </>
        )}
        {mediaUrls.length > 1 && (
          <Text style={[styles.fullViewerPaginationText, { backgroundColor: theme.overlay }]}>
            {currentIndex + 1} / {mediaUrls.length}
          </Text>
        )}
      </View>
    </Modal>
  );
};

export default FullImageViewer;
