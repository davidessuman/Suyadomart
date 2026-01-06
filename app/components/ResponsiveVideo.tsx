import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';

export type ResponsiveVideoProps = {
  uri: string;
  autoPlay?: boolean;
  controls?: boolean;
  muted?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
  onRef?: (ref: Video | null) => void;
  onStatus?: (status: AVPlaybackStatus) => void;
};

const ResponsiveVideo: React.FC<ResponsiveVideoProps> = ({
  uri,
  autoPlay = false,
  controls = false,
  muted = false,
  containerStyle,
  onRef,
  onStatus,
}) => {
  const videoRef = useRef<Video | null>(null);

  useEffect(() => {
    onRef?.(videoRef.current);
  }, [onRef]);

  useEffect(() => {
    const ref = videoRef.current;
    if (!ref) return;
    if (autoPlay) {
      ref.playAsync().catch(() => {});
    } else {
      ref.pauseAsync().catch(() => {});
    }
  }, [autoPlay]);

  return (
    <View style={[styles.container, containerStyle]}>
      <Video
        ref={(ref) => {
          videoRef.current = ref;
        }}
        source={{ uri }}
        style={styles.video}
        resizeMode={ResizeMode.CONTAIN}
        shouldPlay={autoPlay}
        useNativeControls={controls}
        isMuted={muted}
        isLooping
        onPlaybackStatusUpdate={onStatus}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: '100%',
    overflow: 'hidden',
  },
  video: {
    width: '100%',
    height: '100%',
  },
});

export default ResponsiveVideo;
