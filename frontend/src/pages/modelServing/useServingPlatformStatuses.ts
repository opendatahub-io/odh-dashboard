import { StackComponent, SupportedArea, useIsAreaAvailable } from '~/concepts/areas';
import { ServingPlatformStatuses } from '~/pages/modelServing/screens/types';
import { useDashboardNamespace } from '~/redux/selectors';
import { useIsNIMAvailable } from '~/pages/modelServing/screens/projects/useIsNIMAvailable';

const useServingPlatformStatuses = (): ServingPlatformStatuses => {
  const { dashboardNamespace } = useDashboardNamespace();

  const kServeStatus = useIsAreaAvailable(SupportedArea.K_SERVE);
  const modelMeshStatus = useIsAreaAvailable(SupportedArea.MODEL_MESH);
  const kServeEnabled = kServeStatus.status;
  const modelMeshEnabled = modelMeshStatus.status;
  const kServeInstalled = !!kServeStatus.requiredComponents?.[StackComponent.K_SERVE];
  const modelMeshInstalled = !!modelMeshStatus.requiredComponents?.[StackComponent.MODEL_MESH];
  const isNIMAvailable = useIsNIMAvailable(dashboardNamespace); // TODO lift this to context?

  return {
    kServe: {
      enabled: kServeEnabled,
      installed: kServeInstalled,
    },
    modelMesh: {
      enabled: modelMeshEnabled,
      installed: modelMeshInstalled,
    },
    nim: {
      available: isNIMAvailable,
    },
    numServingPlatformsAvailable: [kServeEnabled, modelMeshEnabled, isNIMAvailable].filter(Boolean)
      .length,
  };
};

export default useServingPlatformStatuses;
