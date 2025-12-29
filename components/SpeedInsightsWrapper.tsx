import React from 'react';
import { Platform } from 'react-native';

// Speed Insights is only available for web platforms
// This component safely handles the integration across different platforms
const SpeedInsightsWrapper = () => {
  // Only load SpeedInsights on web platform
  if (Platform.OS !== 'web') {
    return null;
  }

  // Dynamically import SpeedInsights for web only
  const SpeedInsights = React.lazy(
    () => import('@vercel/speed-insights/react').then(module => ({
      default: module.SpeedInsights
    }))
  );

  return (
    <React.Suspense fallback={null}>
      <SpeedInsights />
    </React.Suspense>
  );
};

export default SpeedInsightsWrapper;
