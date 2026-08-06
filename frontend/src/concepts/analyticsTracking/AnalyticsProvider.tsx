import React from 'react';
import {
  AnalyticsContext,
  type AnalyticsAPI,
} from '@odh-dashboard/ui-core/contexts/AnalyticsContext';
import { fireFormTrackingEvent } from './segmentIOUtils';

export const AnalyticsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const value = React.useMemo<AnalyticsAPI>(
    () => ({
      fireFormTrackingEvent,
    }),
    [],
  );

  return <AnalyticsContext.Provider value={value}>{children}</AnalyticsContext.Provider>;
};
