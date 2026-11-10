import * as React from 'react';
import { useTrackEvent } from '@odh-dashboard/plugin-core/host-api';
import { DataRegistryEvent, toDataRegistryTrackEvent } from '~/app/utilities/tracking';

export const useDataRegistryTrackEvent = (): ((event: DataRegistryEvent) => void) => {
  const trackEvent = useTrackEvent();

  return React.useCallback(
    (event: DataRegistryEvent) => {
      toDataRegistryTrackEvent(trackEvent, event);
    },
    [trackEvent],
  );
};
