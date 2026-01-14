
import { useCallback, useEffect, useState } from 'react';
import { getSelectedCampus, setSelectedCampus } from '@/lib/campus';
import { supabase } from '@/lib/supabase';

export function useSelectedCampus(session?: { user: { id: string } } | null = null) {
  const [campus, setCampus] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Refresh campus from backend if authenticated, else from AsyncStorage
  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      let value: string | null = null;
      if (session?.user?.id) {
        // Fetch from backend profile
        const { data } = await supabase
          .from('user_profiles')
          .select('university')
          .eq('id', session.user.id)
          .single();
        value = data?.university || null;
        if (value) {
          await setSelectedCampus(value);
        } else {
          value = await getSelectedCampus();
        }
      } else {
        value = await getSelectedCampus();
      }
      setCampus(value);
    } finally {
      setLoading(false);
    }
  }, [session]);

  // Save campus to both AsyncStorage and backend if authenticated
  const save = useCallback(async (university: string) => {
    await setSelectedCampus(university);
    setCampus(university);
    if (session?.user?.id) {
      await supabase
        .from('user_profiles')
        .update({ university })
        .eq('id', session.user.id);
    }
  }, [session]);


  useEffect(() => {
    refresh();
  }, [refresh]);

  return { campus, loading, refresh, save };
}
