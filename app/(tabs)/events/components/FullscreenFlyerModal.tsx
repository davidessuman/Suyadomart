import React from 'react';
import { Image, Modal, SafeAreaView, Text, TouchableOpacity, View } from 'react-native';

export const FullscreenFlyerModal = ({
  showFlyerFullView,
  setShowFlyerFullView,
  styles,
  isDarkMode,
  selectedEvent,
}: {
  showFlyerFullView: boolean;
  setShowFlyerFullView: (value: boolean) => void;
  styles: any;
  isDarkMode: boolean;
  selectedEvent: any;
}) => {
  return (
    <Modal visible={showFlyerFullView} animationType="fade" transparent>
      <SafeAreaView style={[styles.flyerFullScreenContainer, { backgroundColor: isDarkMode ? '#1A202C' : '#000' }]}>
        <View style={styles.flyerFullScreenHeader}>
          <TouchableOpacity
            onPress={() => setShowFlyerFullView(false)}
            style={[styles.flyerCloseBtn, { backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.15)' : 'rgba(255, 255, 255, 0.15)' }]}
          >
            <Text style={styles.flyerCloseBtnText}>✕</Text>
          </TouchableOpacity>
        </View>
        {selectedEvent?.flyer && selectedEvent.flyer.startsWith('https://') && (
          <View style={styles.flyerFullScreenContent}>
            <Image
              source={{ uri: selectedEvent.flyer }}
              style={styles.flyerFullScreenImage}
              resizeMode="contain"
            />
          </View>
        )}
      </SafeAreaView>
    </Modal>
  );
};