import { useCallback, useEffect, useState } from 'react';
import { getSelectedCampus, setSelectedCampus } from '@/lib/campus';

export function useSelectedCampus() {
  const [campus, setCampus] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const value = await getSelectedCampus();
      setCampus(value);
    } finally {
      setLoading(false);
    }
  }, []);

  const save = useCallback(async (university: string) => {
    await setSelectedCampus(university);
    setCampus(university);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { campus, loading, refresh, save };
}
