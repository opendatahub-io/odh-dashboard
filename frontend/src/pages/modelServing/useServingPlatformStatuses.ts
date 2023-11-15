import { StackComponent, SupportedArea, useIsAreaAvailable } from '~/concepts/areas';
import { ServingPlatformStatuses } from '~/pages/modelServing/screens/types';

const useServingPlatformStatuses = (): ServingPlatformStatuses => {
  const kServeStatus = useIsAreaAvailable(SupportedArea.K_SERVE);
  const modelMeshStatus = useIsAreaAvailable(SupportedArea.MODEL_MESH);
  const kServeEnabled = kServeStatus.status;
  const modelMeshEnabled = modelMeshStatus.status;
  const kServeInstalled = !!kServeStatus.requiredComponents?.[StackComponent.K_SERVE];
  const modelMeshInstalled = !!modelMeshStatus.requiredComponents?.[StackComponent.MODEL_MESH];

  return {
    kServe: {
      enabled: kServeEnabled,
      installed: kServeInstalled,
    },
    modelMesh: {
      enabled: modelMeshEnabled,
      installed: modelMeshInstalled,
    },
  };
};

export default useServingPlatformStatuses;
