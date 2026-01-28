import React from 'react';
import { useFetchState } from 'mod-arch-core';
import { useGenAiAPI } from '~/app/hooks/useGenAiAPI';
import { GuardrailsStatus } from '~/app/types';
import useGuardrailsEnabled from '~/app/Chatbot/hooks/useGuardrailsEnabled';

type GuardrailsStatusResponse = {
  data: GuardrailsStatus | null;
  loaded: boolean;
  error: Error | undefined;
  isReady: boolean; // Helper to check if status is 'Ready'
  isNotFound: boolean; // Helper to check if status is not found (404)
};

/**
 * Custom hook to fetch guardrails status.
 * This hook is gated behind the guardrails feature flag.
 * @param refresh - Whether to actively refresh the status
 * @returns GuardrailsStatusResponse with data, loaded state, error, and helper flags
 */
const useFetchGuardrailsStatus = (refresh = false): GuardrailsStatusResponse => {
  // Gate all guardrails status functionality behind the guardrails feature flag
  const isGuardrailsFeatureEnabled = useGuardrailsEnabled();
  const { api, apiAvailable } = useGenAiAPI();

  const [isNotFound, setIsNotFound] = React.useState<boolean>(false);

  // Only fetch if the feature flag is enabled and API is available
  const shouldFetch = isGuardrailsFeatureEnabled && apiAvailable;

  const { data, loaded, error } = useFetchState<GuardrailsStatus | null>(
    React.useCallback(() => {
      if (!shouldFetch) {
        return Promise.resolve(null);
      }

      return api
        .getGuardrailsStatus()
        .then((status) => {
          setIsNotFound(false);
          return status;
        })
        .catch((err) => {
          // Handle 404 response (no CR exists)
          if (err?.response?.status === 404) {
            setIsNotFound(true);
            return null;
          }
          // Re-throw other errors to be caught by useFetchState
          throw err;
        });
    }, [shouldFetch, api]),
    null,
    {
      initialPromisePurity: true,
      refreshRate: refresh ? 5000 : undefined, // Refresh every 5 seconds if requested
    },
  );

  const isReady = data?.phase === 'Ready';

  return {
    data,
    loaded: shouldFetch ? loaded : true, // If feature is disabled, consider it "loaded"
    error,
    isReady,
    isNotFound,
  };
};

export default useFetchGuardrailsStatus;
