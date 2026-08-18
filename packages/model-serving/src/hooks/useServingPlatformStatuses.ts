import * as React from 'react';
import {
  DataScienceStackComponent,
  SupportedArea,
  useIsAreaAvailable,
} from '@odh-dashboard/plugin-core/areas';
// eslint-disable-next-line @odh-dashboard/no-restricted-imports -- interim host coupling; NIM availability + serving-platform types not yet extracted from frontend (RHOAIENG-79894)
import { ServingPlatformStatuses } from '@odh-dashboard/internal/pages/modelServing/screens/types';
// eslint-disable-next-line @odh-dashboard/no-restricted-imports -- interim host coupling; NIM availability + serving-platform types not yet extracted from frontend (RHOAIENG-79894)
import { useIsNIMAvailable } from '@odh-dashboard/internal/pages/modelServing/screens/projects/nim/useIsNIMAvailable';

// eslint-disable-next-line @odh-dashboard/no-restricted-imports -- interim host coupling; NIM availability + serving-platform types not yet extracted from frontend (RHOAIENG-79894)
export type { ServingPlatformStatuses } from '@odh-dashboard/internal/pages/modelServing/screens/types';

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
