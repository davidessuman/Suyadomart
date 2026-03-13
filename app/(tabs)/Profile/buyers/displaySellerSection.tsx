import React from 'react';
import { ImageBackground, View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

type Props = {
  styles: any;
  colors: any;
  profile: any;
  shopData: any;
  SELLER_BACKGROUND_URL: string;
  router: any;
};

export default function DisplaySellerSection({ styles, colors, profile, shopData, SELLER_BACKGROUND_URL, router }: Props) {
  return (
    <ImageBackground
      source={{ uri: SELLER_BACKGROUND_URL }}
      style={[styles.sellerBackground, { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }]}
      resizeMode="cover"
    >
      <View style={[styles.sellerOverlay, { backgroundColor: 'rgba(0, 0, 0, 0.7)' }]} />
      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.sellerContent} showsVerticalScrollIndicator={false}>
        <View style={styles.sellerHeader}>
          <View style={[styles.sellerBadge, { backgroundColor: colors.primary }]}> 
            <MaterialCommunityIcons name="store-check" size={24} color="white" />
          </View>
          <Text style={[styles.sellerTitle, { color: 'green' }]}>Storefront Live</Text>
        </View>
        <Text style={[styles.sellerWelcome, { color: 'white' }]}>WELCOME 🥳🥳</Text>
        <Text style={[styles.sellerName, { color: colors.primary }]}> {profile?.full_name || 'seller'} </Text>
        <View style={styles.sellerInfo}>
          <View style={styles.infoCard}>
            <MaterialCommunityIcons name="store" size={20} color="white" />
            <Text style={[styles.infoText, { color: 'white' }]}>{shopData?.name || 'Shop Name'}</Text>
          </View>
          <View style={styles.infoCard}>
            <Ionicons name="school" size={20} color="white" />
            <Text style={[styles.infoText, { color: 'white' }]}>{profile?.university}</Text>
          </View>
        </View>
        <TouchableOpacity
          style={[styles.dashboardButton, { backgroundColor: colors.primary }]}
          onPress={() => router.navigate('/(tabs)/Profile/seller')}
        >
          <MaterialCommunityIcons name="view-dashboard" size={24} color="white" />
          <Text style={styles.dashboardButtonText}>Open Seller Dashboard</Text>
        </TouchableOpacity>
      </ScrollView>
    </ImageBackground>
  );
}