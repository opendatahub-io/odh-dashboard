import { StackComponent, SupportedArea, useIsAreaAvailable } from '~/concepts/areas';
import { ServingPlatformStatuses } from '~/pages/modelServing/screens/types';
import { useIsNIMAvailable } from '~/pages/modelServing/screens/projects/useIsNIMAvailable';

const useServingPlatformStatuses = (): ServingPlatformStatuses => {
  const kServeStatus = useIsAreaAvailable(SupportedArea.K_SERVE);
  const modelMeshStatus = useIsAreaAvailable(SupportedArea.MODEL_MESH);
  const kServeEnabled = kServeStatus.status;
  const modelMeshEnabled = modelMeshStatus.status;
  const kServeInstalled = !!kServeStatus.requiredComponents?.[StackComponent.K_SERVE];
  const modelMeshInstalled = !!modelMeshStatus.requiredComponents?.[StackComponent.MODEL_MESH];

  const isNIMAvailable = useIsNIMAvailable();

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
  };
};

export default useServingPlatformStatuses;
