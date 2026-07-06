import axios from '#~/utilities/axios';
import { STATUS_ENDPOINT } from '#~/concepts/mlflow/const';
import { POLL_INTERVAL } from '#~/utilities/const';
import { createSharedPollingStore } from '#~/utilities/createSharedPollingStore';

export type MLflowStatus = {
  configured: boolean;
  loaded: boolean;
  /** True when the BFF status check failed before any successful response. */
  error: boolean;
};

/**
 * Returns MLflow BFF status for the current page context.
 *
 * All hook instances share a single polling loop (module-scoped cache)
 * to avoid redundant concurrent requests to the BFF status endpoint.
 * Refreshes periodically while enabled to avoid stale availability state
 * in long-lived SPA sessions.
 */
const TEARDOWN_GRACE_MS = 1000;

export const useMLflowStatus = (() => {
  let lastPollErrored = false;
  let hadSuccessfulResponse = false;

  return createSharedPollingStore<MLflowStatus>({
    fetchFn: async () => {
      const response = await axios.get<{ configured: boolean }>(STATUS_ENDPOINT);
      hadSuccessfulResponse = true;
      if (lastPollErrored) {
        lastPollErrored = false;
        // eslint-disable-next-line no-console
        console.info('MLflow BFF status check recovered');
      }
      return { configured: Boolean(response.data.configured), loaded: true, error: false };
    },
    initialValue: { configured: false, loaded: false, error: false },
    disabledValue: { configured: false, loaded: true, error: false },
    pollInterval: POLL_INTERVAL,
    teardownGracePeriod: TEARDOWN_GRACE_MS,
    onError: (e, previous) => {
      if (!lastPollErrored) {
        lastPollErrored = true;
        // eslint-disable-next-line no-console
        console.warn('MLflow BFF status check failed (will suppress until recovery)', e);
      }
      // Mark loaded so consumers (e.g. embedded Experiments page) do not spin forever on first failure.
      // Only surface error when we have no prior successful status (transient failures keep last good state).
      if (!hadSuccessfulResponse) {
        return { ...previous, loaded: true, error: true };
      }
      return { ...previous, loaded: true, error: false };
    },
    onReset: () => {
      lastPollErrored = false;
      hadSuccessfulResponse = false;
    },
  });
})();
