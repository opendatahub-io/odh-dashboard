import * as React from 'react';
import { StackComponent, SupportedArea, useIsAreaAvailable } from '#~/concepts/areas';
import { ServingPlatformStatuses } from '#~/pages/modelServing/screens/types';
import { useIsNIMAvailable } from './screens/projects/useIsNIMAvailable';

const useServingPlatformStatuses = (
  shouldRefreshNimAvailability = false,
): ServingPlatformStatuses => {
  const kServeStatus = useIsAreaAvailable(SupportedArea.K_SERVE);
  const modelMeshStatus = useIsAreaAvailable(SupportedArea.MODEL_MESH);
  const kServeEnabled = kServeStatus.status;
  const modelMeshEnabled = modelMeshStatus.status;
  const kServeInstalled = !!kServeStatus.requiredComponents?.[StackComponent.K_SERVE];
  const modelMeshInstalled = !!modelMeshStatus.requiredComponents?.[StackComponent.MODEL_MESH];
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
    modelMesh: {
      enabled: modelMeshEnabled,
      installed: modelMeshInstalled,
    },
    platformEnabledCount: [kServeEnabled, isNIMAvailable, modelMeshEnabled].filter(Boolean).length,
    refreshNIMAvailability,
  };
};

export default useServingPlatformStatuses;
