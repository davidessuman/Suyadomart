import AsyncStorage from '@react-native-async-storage/async-storage';

// Example list of campuses. Replace with your actual list if needed.
export const GHANA_UNIVERSITIES = [
  'University of Ghana',
  'Kwame Nkrumah University of Science and Technology',
  'University of Cape Coast',
  'University for Development Studies',
  'Ashesi University',
];

const CAMPUS_KEY = 'selectedCampus';

export async function getSelectedCampus(): Promise<string | null> {
  try {
    const campus = await AsyncStorage.getItem(CAMPUS_KEY);
    if (campus) return campus;
    // Fallback to first campus if none selected
    return GHANA_UNIVERSITIES[0];
  } catch {
    return GHANA_UNIVERSITIES[0];
  }
}

export async function setSelectedCampus(university: string): Promise<void> {
  try {
    await AsyncStorage.setItem(CAMPUS_KEY, university);
  } catch {}
}
