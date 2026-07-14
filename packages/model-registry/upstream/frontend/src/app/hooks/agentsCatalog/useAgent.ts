import { FetchState, FetchStateCallbackPromise, NotReadyError, useFetchState } from 'mod-arch-core';
import React from 'react';
import { Agent } from '~/app/agentsCatalogTypes';
import { AgentsCatalogContext } from '~/app/context/agentsCatalog/AgentsCatalogContext';
import type { ModelCatalogAPIState } from '~/app/hooks/modelCatalog/useModelCatalogAPIState';

type State = Agent | null;

export const useAgentWithAPI = (
  apiState: ModelCatalogAPIState,
  agentId: string,
): FetchState<State> => {
  const { api, apiAvailable } = apiState;

  const call = React.useCallback<FetchStateCallbackPromise<State>>(
    (opts) => {
      if (!apiAvailable) {
        return Promise.reject(new Error('API not yet available'));
      }
      if (!agentId) {
        return Promise.reject(new NotReadyError('No agent id'));
      }
      return api.getAgent(opts, agentId);
    },
    [api, apiAvailable, agentId],
  );
  return useFetchState(call, null, {
    initialPromisePurity: true,
  });
};

export const useAgent = (agentId: string): FetchState<State> => {
  const { agentApiState } = React.useContext(AgentsCatalogContext);
  return useAgentWithAPI(agentApiState, agentId);
};
