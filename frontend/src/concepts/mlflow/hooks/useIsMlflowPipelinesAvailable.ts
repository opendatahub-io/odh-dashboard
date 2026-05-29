import { SupportedArea, useIsAreaAvailable } from '#~/concepts/areas';
import useIsMlflowCRAvailable from './useIsMlflowCRAvailable';
import useIsMlflowDSPAEnabled from './useIsMlflowDSPAEnabled';

type MlflowPipelinesAvailability = {
  available: boolean;
  loaded: boolean;
};

/**
 * Pipeline-scoped MLflow availability check (requires PipelinesContext).
 *
 * Returns `{ available, loaded }`:
 * - `available` is `true` when the MLflow CR is available, the pipelines
 *   feature flag is enabled, and the current project's DSPA has MLflow
 *   integration enabled.
 * - `loaded` is `true` once both the async BFF status and the DSPA CR
 *   have been determined, allowing consumers to distinguish "still loading"
 *   from "unavailable".
 *
 * For CR-level checks that don't require PipelinesContext,
 * use `useIsMlflowCRAvailable` instead.
 */
const useIsMlflowPipelinesAvailable = (): MlflowPipelinesAvailability => {
  const { available: isCRAvailable, loaded: crLoaded } = useIsMlflowCRAvailable();
  const isPipelinesAreaAvailable = useIsAreaAvailable(SupportedArea.MLFLOW_PIPELINES).status;
  const { enabled: mlflowDSPAEnabled, loaded: dspaLoaded } = useIsMlflowDSPAEnabled();

  return {
    available: isCRAvailable && isPipelinesAreaAvailable && mlflowDSPAEnabled,
    loaded: crLoaded && dspaLoaded,
  };
};

export default useIsMlflowPipelinesAvailable;
