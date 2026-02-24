import { useCallback } from 'react';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAlert } from '@/app/alert/AlertProvider';

export function useRequireAuth() {
  const router = useRouter();
  const { showConfirmation } = useAlert();

  return useCallback(
    async (actionLabel: string = 'continue'): Promise<boolean> => {
      const { data } = await supabase.auth.getUser();
      const user = data?.user;
      if (user) return true;

      showConfirmation({
        title: 'Sign up required',
        message: `Please sign up or log in to ${actionLabel}.`,
        confirmText: 'Sign up / Log in',
        cancelText: 'Not now',
        onConfirm: () => router.push('/auth'),
      });
      return false;
    },
    [router, showConfirmation],
  );
}
