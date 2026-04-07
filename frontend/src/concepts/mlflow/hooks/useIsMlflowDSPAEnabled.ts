import { DSPAMlflowIntegrationMode } from '#~/k8sTypes';
import { usePipelinesAPI } from '#~/concepts/pipelines/context';

type MlflowDSPAState = {
  enabled: boolean;
  loaded: boolean;
};

/**
 * Returns whether MLflow integration is enabled for the current project's DSPA.
 *
 * `enabled` checks `spec.mlflow.integrationMode`:
 * - `undefined` (omitted) or `AUTODETECT` → true
 * - Any other value (including `DISABLED` or unknown future values) → false
 * - No DSPA installed → false
 *
 * `loaded` is `false` while the DSPA CR is still being fetched, allowing
 * consumers to distinguish "still loading" from "DSPA not installed".
 */
const useIsMlflowDSPAEnabled = (): MlflowDSPAState => {
  const { pipelinesServer, mlflowIntegrationMode } = usePipelinesAPI();

  if (pipelinesServer.initializing) {
    return { enabled: false, loaded: false };
  }

  if (!pipelinesServer.installed) {
    return { enabled: false, loaded: true };
  }

  return {
    enabled:
      mlflowIntegrationMode === undefined ||
      mlflowIntegrationMode === DSPAMlflowIntegrationMode.AUTODETECT,
    loaded: true,
  };
};

export default useIsMlflowDSPAEnabled;
