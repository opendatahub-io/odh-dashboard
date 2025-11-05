import * as React from 'react';
import { DataScienceStackComponent, SupportedArea, useIsAreaAvailable } from '#~/concepts/areas';
import { ServingPlatformStatuses } from '#~/pages/modelServing/screens/types';
import { useIsNIMAvailable } from '#~/pages/modelServing/screens/projects/useIsNIMAvailable';

const useServingPlatformStatuses = (
  shouldRefreshNimAvailability = false,
): ServingPlatformStatuses => {
  const kServeStatus = useIsAreaAvailable(SupportedArea.K_SERVE);
  const kServeEnabled = kServeStatus.status;
  const kServeInstalled = !!kServeStatus.requiredComponents?.[DataScienceStackComponent.K_SERVE];
  const [isNIMAvailable, , , refreshNIMAvailability] = useIsNIMAvailable();

  React.useEffect(() => {
    if (shouldRefreshNimAvailability) {
      // eslint-disable-next-line no-console
      refreshNIMAvailability().catch((error) =>
        console.error('Failed to refresh NIM availability:', error),
      );
    }
  }, [shouldRefreshNimAvailability, refreshNIMAvailability]);

  return {
    kServe: {
      enabled: kServeEnabled,
      installed: kServeInstalled,
    },
    kServeNIM: {
      enabled: isNIMAvailable,
      installed: kServeInstalled,
    },
    platformEnabledCount: [kServeEnabled, isNIMAvailable].filter(Boolean).length,
    refreshNIMAvailability,
  };
};

export default useServingPlatformStatuses;
