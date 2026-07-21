import { SupportedArea, useIsAreaAvailable } from '@odh-dashboard/plugin-core/areas';
import { useMLflowStatus } from './useMLflowStatus';

type MlflowCRAvailability = {
  available: boolean;
  loaded: boolean;
  /** True when the BFF status endpoint could not be reached (network/5xx), not when MLflow is unconfigured. */
  error: boolean;
};

/**
 * MLflow CR-level availability check.
 *
 * Returns `{ available, loaded, error }`:
 * - `available` is `true` when the feature flag is enabled AND the BFF
 *   has discovered a running MLflow CR in the cluster.
 * - `loaded` is `true` once the BFF status has been fetched at least once,
 *   allowing consumers to distinguish "still loading" from "unavailable".
 * - `error` is `true` when the BFF status check failed before any successful
 *   response (service unreachable), distinct from "not configured".
 *
 * Does NOT require PipelinesContext.
 * For pipeline-scoped checks that also verify DSPA integration,
 * use `useIsMlflowPipelinesAvailable` instead.
 */
const useIsMlflowCRAvailable = (): MlflowCRAvailability => {
  const isAreaAvailable = useIsAreaAvailable(SupportedArea.MLFLOW).status;
  const { configured, loaded, error } = useMLflowStatus(isAreaAvailable);

  return {
    available: isAreaAvailable && loaded && configured && !error,
    loaded: !isAreaAvailable || loaded,
    error: isAreaAvailable && error,
  };
};

export default useIsMlflowCRAvailable;
