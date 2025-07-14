import { useIsAreaAvailable, SupportedArea } from '#~/concepts/areas';
import useServingPlatformStatuses from '#~/pages/modelServing/useServingPlatformStatuses';
import { getDeployButtonState } from '#~/pages/modelCatalog/utils';

/**
 * Returns the deploy button state (visible, enabled, tooltip) for model deploy actions.
 * @param isOciModel - Whether the model is an OCI model (use isOciModelUri or similar).
 */
const useDeployButtonState = (
  isOciModel: boolean,
): { visible: boolean; enabled?: boolean; tooltip?: string } => {
  const isModelServingEnabled = useIsAreaAvailable(SupportedArea.MODEL_SERVING).status;
  const { platformEnabledCount, kServe } = useServingPlatformStatuses();

  return getDeployButtonState({
    isModelServingEnabled,
    platformEnabledCount,
    isKServeEnabled: kServe.enabled,
    isOciModel,
  });
};

export default useDeployButtonState;
