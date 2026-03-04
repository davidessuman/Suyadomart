import React, { useState } from 'react';
import {
  View,
  FlatList,
  TouchableOpacity,
  Image,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import { Video, ResizeMode } from 'expo-av';

type ProductMediaViewProps = {
  urls: string[];
  onPressMedia: (i: number) => void;
  theme: any;
};

const ProductMediaView = ({ urls, onPressMedia, theme }: ProductMediaViewProps) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const { width } = useWindowDimensions();

  const isLargeScreen = width >= 768;
  const mediaWidth = isLargeScreen ? Math.min(width * 0.6, 600) : width;
  const mediaHeight = isLargeScreen ? mediaWidth * 0.7 : mediaWidth * 0.55;

  if (!urls?.length) return null;

  return (
    <View style={styles.modalMediaContainer}>
      <FlatList
        data={urls}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        style={{ width: mediaWidth, alignSelf: 'center' }}
        snapToInterval={mediaWidth}
        decelerationRate="fast"
        onMomentumScrollEnd={(e) => setActiveIndex(Math.round(e.nativeEvent.contentOffset.x / mediaWidth))}
        keyExtractor={(_, i) => i.toString()}
        renderItem={({ item: url, index }) => (
          <TouchableOpacity
            style={{
              width: mediaWidth,
              height: mediaHeight,
              backgroundColor: theme.background,
              alignSelf: 'center',
            }}
            activeOpacity={0.9}
            onPress={() => onPressMedia(index)}
          >
            {url.toLowerCase().includes('.mp4') ? (
              <Video
                source={{ uri: url }}
                style={{ width: '100%', height: '100%' }}
                resizeMode={ResizeMode.CONTAIN}
                usePoster
                posterSource={{ uri: url }}
                posterStyle={{ width: '100%', height: '100%' }}
                shouldPlay={false}
              />
            ) : (
              <Image source={{ uri: url }} style={{ width: '100%', height: '100%' }} resizeMode="contain" />
            )}
          </TouchableOpacity>
        )}
      />
      {urls.length > 1 && (
        <View style={styles.modalPaginationDots}>
          {urls.map((_, i) => (
            <View
              key={i}
              style={[
                styles.modalDot,
                i === activeIndex
                  ? [styles.modalActiveDot, { backgroundColor: theme.primary }]
                  : [styles.modalInactiveDot, { backgroundColor: theme.textTertiary }],
              ]}
            />
          ))}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  modalMediaContainer: { position: 'relative', marginBottom: 15, borderBottomWidth: 1 },
  modalPaginationDots: { position: 'absolute', bottom: 10, width: '100%', flexDirection: 'row', justifyContent: 'center' },
  modalDot: { width: 8, height: 8, borderRadius: 4, marginHorizontal: 4 },
  modalActiveDot: {
  },
  modalInactiveDot: {
  },
});

export default ProductMediaView;