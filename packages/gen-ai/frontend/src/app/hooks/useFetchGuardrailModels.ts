import * as React from 'react';
import { FetchStateCallbackPromise, NotReadyError, useFetchState } from 'mod-arch-core';
import { GuardrailModelConfig } from '~/app/types';
import { useGenAiAPI } from './useGenAiAPI';

type UseFetchGuardrailModelsReturn = {
  /** Full guardrail model configs with shield IDs */
  data: GuardrailModelConfig[];
  /** Model names only (for dropdowns) */
  modelNames: string[];
  /** Whether the data has been loaded */
  loaded: boolean;
  /** Error if fetch failed */
  error: Error | undefined;
};

const useFetchGuardrailModels = (): UseFetchGuardrailModelsReturn => {
  const { api, apiAvailable } = useGenAiAPI();

  const fetchGuardrailModels = React.useCallback<
    FetchStateCallbackPromise<GuardrailModelConfig[]>
  >(async () => {
    if (!apiAvailable) {
      return Promise.reject(new NotReadyError('API not yet available'));
    }
    const response = await api.getSafetyConfig();
    return response.guardrail_models;
  }, [api, apiAvailable]);

  const [data, loaded, error] = useFetchState(fetchGuardrailModels, [], {
    initialPromisePurity: true,
  });

  // Derive model names for dropdowns
  const modelNames = React.useMemo(() => data.map((config) => config.model_name), [data]);

  return { data, modelNames, loaded, error };
};

export default useFetchGuardrailModels;
