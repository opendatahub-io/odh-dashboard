import { SupportedArea, useIsAreaAvailable } from '#~/concepts/areas';
import { useMLflowStatus } from './useMLflowStatus';

type MlflowCRAvailability = {
  available: boolean;
  loaded: boolean;
};

/**
 * MLflow CR-level availability check.
 *
 * Returns `{ available, loaded }`:
 * - `available` is `true` when the feature flag is enabled AND the BFF
 *   has discovered a running MLflow CR in the cluster.
 * - `loaded` is `true` once the BFF status has been fetched at least once,
 *   allowing consumers to distinguish "still loading" from "unavailable".
 *
 * Does NOT require PipelinesContext.
 * For pipeline-scoped checks that also verify DSPA integration,
 * use `useIsMlflowPipelinesAvailable` instead.
 */
const useIsMlflowCRAvailable = (): MlflowCRAvailability => {
  const isAreaAvailable = useIsAreaAvailable(SupportedArea.MLFLOW).status;
  const { configured, loaded } = useMLflowStatus(isAreaAvailable);

  return {
    available: isAreaAvailable && loaded && configured,
    loaded: !isAreaAvailable || loaded,
  };
};

export default useIsMlflowCRAvailable;
