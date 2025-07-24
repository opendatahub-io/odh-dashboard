import { SupportedArea } from '@odh-dashboard/internal/concepts/areas/types';
import useIsAreaAvailable from '@odh-dashboard/internal/concepts/areas/useIsAreaAvailable';
import useServingPlatformStatuses from '@odh-dashboard/internal/pages/modelServing/useServingPlatformStatuses';
import { getDeployButtonState } from '@odh-dashboard/internal/pages/modelCatalog/utils';

/**
 * Returns the deploy button state (visible, enabled, tooltip) for model deploy actions.
 */
const useDeployButtonState = (): { visible: boolean; enabled?: boolean; tooltip?: string } => {
  const isModelServingEnabled = useIsAreaAvailable(SupportedArea.MODEL_SERVING).status;
  const { platformEnabledCount, kServe } = useServingPlatformStatuses();

  return getDeployButtonState({
    isModelServingEnabled,
    platformEnabledCount,
    isKServeEnabled: kServe.enabled,
    // TODO: add OCI model support
    isOciModel: false,
  });
};

export default useDeployButtonState;
