import * as React from 'react';
import { CatalogCommonData, CatalogProviderState } from '~/app/context/catalogContext/createCatalogContext';
import type { AgentsCatalogFilterOptionsList } from '~/app/pages/agentsCatalog/types/agentsCatalogFilterOptions';
import type { AgentsCatalogExtension } from './types';
export type { AgentsCatalogContextType, AgentsCatalogExtension, AgentsCatalogPaginationState, } from './types';
export type { AgentsCatalogFiltersState } from '~/app/pages/agentsCatalog/types/agentsCatalogFilterOptions';
declare const AgentsCatalogContext: React.Context<CatalogCommonData<AgentsCatalogFilterOptionsList> & CatalogProviderState & {
    clearAllFilters: () => void;
} & AgentsCatalogExtension>, AgentsCatalogContextProvider: React.FC<{
    children: React.ReactNode;
}>, useAgentsCatalogContext: () => CatalogCommonData<AgentsCatalogFilterOptionsList> & CatalogProviderState & {
    clearAllFilters: () => void;
} & AgentsCatalogExtension;
export { AgentsCatalogContext, AgentsCatalogContextProvider, useAgentsCatalogContext };
