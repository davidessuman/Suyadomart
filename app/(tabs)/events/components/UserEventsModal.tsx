import React from 'react';
import { FlatList, Modal, SafeAreaView, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { createStyles, LIGHT_COLORS } from '../index';

export const UserEventsModal = ({
  showUserEvents,
  setShowUserEvents,
  colors,
  userEvents,
  renderUserEvent,
}: {
  showUserEvents: boolean;
  setShowUserEvents: (value: boolean) => void;
  colors: typeof LIGHT_COLORS;
  userEvents: any[];
  renderUserEvent: ({ item }: { item: any }) => React.ReactElement;
}) => {
  const styles = createStyles(colors);
  const { width } = useWindowDimensions();
  const isLargeScreen = width >= 768;

  return (
    <Modal visible={showUserEvents} animationType="slide" transparent>
      <View
        style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.6)',
          justifyContent: isLargeScreen ? 'center' : 'flex-start',
        }}
      >
      <SafeAreaView
        style={[
          styles.container,
          {
            backgroundColor: colors.background,
            width: isLargeScreen ? Math.min(width * 0.8, 800) : '100%',
            alignSelf: 'center',
            borderRadius: isLargeScreen ? 24 : 0,
            maxHeight: isLargeScreen ? '92%' : '100%',
            overflow: 'hidden',
          },
        ]}
      >
        <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
          <Text style={[styles.modalTitle, { color: colors.text }]}>My Events</Text>
          <TouchableOpacity onPress={() => setShowUserEvents(false)} style={[styles.closeBtn, { backgroundColor: colors.surface }]}>
            <Text style={[styles.closeBtnText, { color: colors.textSecondary }]}>✕</Text>
          </TouchableOpacity>
        </View>

        {userEvents.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyText, { color: colors.text }]}>No events published yet</Text>
            <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>Create your first event to get started</Text>
          </View>
        ) : (
          <FlatList
            data={userEvents}
            keyExtractor={item => item.id}
            renderItem={renderUserEvent}
            contentContainerStyle={styles.userEventsList}
          />
        )}
      </SafeAreaView>
      </View>
    </Modal>
  );
};