import AsyncStorage from '@react-native-async-storage/async-storage';

export const SELECTED_CAMPUS_KEY = 'selectedCampus';
export const HAS_SEEN_ONBOARDING_KEY = 'hasSeenOnboarding';

export async function getSelectedCampus(): Promise<string | null> {
  const value = await AsyncStorage.getItem(SELECTED_CAMPUS_KEY);
  return value && value.trim().length > 0 ? value : null;
}

export async function setSelectedCampus(university: string): Promise<void> {
  const trimmed = university.trim();
  await AsyncStorage.setItem(SELECTED_CAMPUS_KEY, trimmed);
  await AsyncStorage.setItem(HAS_SEEN_ONBOARDING_KEY, 'true');
}

export async function clearSelectedCampus(): Promise<void> {
  await AsyncStorage.removeItem(SELECTED_CAMPUS_KEY);
}
