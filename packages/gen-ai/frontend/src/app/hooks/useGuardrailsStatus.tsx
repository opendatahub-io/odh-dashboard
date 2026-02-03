import React from 'react';
import useFetch, {
  FetchStateCallbackPromise,
  FetchStateObject,
} from '@odh-dashboard/internal/utilities/useFetch.js';
import { useGenAiAPI } from '~/app/hooks/useGenAiAPI';
import useGuardrailsEnabled from '~/app/Chatbot/hooks/useGuardrailsEnabled';
import { GuardrailsStatus } from '~/app/types';

// Returns true only when guardrails feature flag is enabled AND status is 'Ready'
const useGuardrailsStatus = (): FetchStateObject<GuardrailsStatus> => {
  const guardrailsEnabled = useGuardrailsEnabled();
  const { api, apiAvailable } = useGenAiAPI();

  const call = React.useCallback<FetchStateCallbackPromise<GuardrailsStatus>>(
    (opts) => {
      if (!apiAvailable) {
        return Promise.reject(new Error('API not yet available'));
      }

      if (!guardrailsEnabled) {
        return Promise.reject(new Error('Guardrails feature is disabled'));
      }

      return api.getGuardrailsStatus(opts);
    },
    [api, apiAvailable, guardrailsEnabled],
  );

  return useFetch(call, {
    name: '',
    phase: '',
  });
};

export default useGuardrailsStatus;
