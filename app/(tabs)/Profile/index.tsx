import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';

export default function ProfileIndex() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const redirectByRole = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session?.user?.id) {
          router.replace('/(tabs)/Profile/buyers');
          return;
        }

        const { data } = await supabase
          .from('user_profiles')
          .select('is_seller')
          .eq('id', session.user.id)
          .maybeSingle();

        // Always land on the buyers view first so sellers can see the seller section
        // and explicitly tap "Open Seller Dashboard" to navigate to the seller page.
        router.replace('/(tabs)/Profile/buyers');
      } catch {
        router.replace('/(tabs)/Profile/buyers');
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    redirectByRole();

    return () => {
      isMounted = false;
    };
  }, [router]);

  if (!loading) {
    return null;
  }

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator size="large" />
    </View>
  );
}
