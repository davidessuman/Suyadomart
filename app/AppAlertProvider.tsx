import React from 'react';
import { AlertProvider } from './alert/AlertProvider';

export function AppAlertProvider({ children }: { children: React.ReactNode }) {
  return <AlertProvider>{children}</AlertProvider>;
}
