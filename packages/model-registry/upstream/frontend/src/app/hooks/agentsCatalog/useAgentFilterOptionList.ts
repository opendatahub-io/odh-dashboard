import { FetchState, FetchStateCallbackPromise, useFetchState } from 'mod-arch-core';
import React from 'react';
import { CatalogFilterOptionsList } from '~/app/modelCatalogTypes';
import type { ModelCatalogAPIState } from '~/app/hooks/modelCatalog/useModelCatalogAPIState';
import {
  BACKEND_TO_FRONTEND_AGENT_FILTER_KEY,
  AGENT_FILTER_KEYS,
} from '~/app/pages/agentsCatalog/const';
import type { CatalogFilterStringOption } from '~/app/shared/components/catalog';
import type {
  AgentsCatalogFilterOptionsList,
  AgentFilterCategoryKey,
} from '~/app/pages/agentsCatalog/types/agentsCatalogFilterOptions';

function isAgentFilterCategoryKey(s: string): s is AgentFilterCategoryKey {
  return AGENT_FILTER_KEYS.some((k) => k === s);
}

function isFilterStringOption(v: unknown): v is CatalogFilterStringOption {
  if (typeof v !== 'object' || v === null || !('type' in v)) {
    return false;
  }
  const typeVal = Object.getOwnPropertyDescriptor(v, 'type')?.value;
  return typeVal === 'string';
}

export function mapBackendFilterOptions(
  raw: CatalogFilterOptionsList,
): AgentsCatalogFilterOptionsList {
  if (!raw.filters) {
    return { filters: undefined };
  }
  const mapped: AgentsCatalogFilterOptionsList['filters'] = {};
  for (const [key, value] of Object.entries(raw.filters)) {
    const frontendKey = BACKEND_TO_FRONTEND_AGENT_FILTER_KEY[key] ?? key;
    if (isAgentFilterCategoryKey(frontendKey) && isFilterStringOption(value)) {
      mapped[frontendKey] = value;
    }
  }
  return { filters: mapped };
}

type State = AgentsCatalogFilterOptionsList | null;

export const useAgentFilterOptionListWithAPI = (
  apiState: ModelCatalogAPIState,
): FetchState<State> => {
  const { api, apiAvailable } = apiState;
  const call = React.useCallback<FetchStateCallbackPromise<State>>(
    (opts) => {
      if (!apiAvailable) {
        return Promise.reject(new Error('API not yet available'));
      }
      return api.getAgentFilterOptionList(opts).then(mapBackendFilterOptions);
    },
    [api, apiAvailable],
  );
  return useFetchState(call, null, { initialPromisePurity: true });
};
