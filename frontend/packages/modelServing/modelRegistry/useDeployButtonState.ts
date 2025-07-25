import { SupportedArea } from '@odh-dashboard/internal/concepts/areas/types';
import useIsAreaAvailable from '@odh-dashboard/internal/concepts/areas/useIsAreaAvailable';
import { DEPLOY_BUTTON_TOOLTIP } from '@odh-dashboard/internal/pages/modelServing/screens/const';
import { useAvailableClusterPlatforms } from '../src/concepts/useAvailableClusterPlatforms';

const KSERVE_ID = 'kserve';

/**
 * Returns the deploy button state (visible, enabled, tooltip) for model deploy actions.
 */
const useDeployButtonState = (): { visible: boolean; enabled?: boolean; tooltip?: string } => {
  const isModelServingEnabled = useIsAreaAvailable(SupportedArea.MODEL_SERVING).status;
  const { clusterPlatforms } = useAvailableClusterPlatforms();
  const kServe = clusterPlatforms.find((p) => p.properties.id === KSERVE_ID);

  if (!isModelServingEnabled) {
    return { visible: false };
  }

  if (clusterPlatforms.length === 0) {
    return {
      visible: true,
      enabled: false,
      tooltip: DEPLOY_BUTTON_TOOLTIP.ENABLE_MODEL_SERVING_PLATFORM,
    };
  }

  // TODO: add OCI check when OCI model serving is supported
  if (!kServe) {
    return {
      visible: true,
      enabled: false,
      tooltip: DEPLOY_BUTTON_TOOLTIP.ENABLE_SINGLE_MODEL_SERVING,
    };
  }

  return { visible: true, enabled: true };
};

export default useDeployButtonState;
