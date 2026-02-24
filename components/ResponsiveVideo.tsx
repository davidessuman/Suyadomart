import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, StyleProp, ViewStyle, ActivityIndicator } from 'react-native';
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
  const [isBuffering, setIsBuffering] = useState(false);

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

  const handlePlaybackStatusUpdate = (status: AVPlaybackStatus) => {
    if (status.isLoaded) {
      setIsBuffering(status.isBuffering || false);
    }
    onStatus?.(status);
  };

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
        onPlaybackStatusUpdate={handlePlaybackStatusUpdate}
      />
      {isBuffering && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#FF9900" />
        </View>
      )}
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
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
});

export default ResponsiveVideo;
