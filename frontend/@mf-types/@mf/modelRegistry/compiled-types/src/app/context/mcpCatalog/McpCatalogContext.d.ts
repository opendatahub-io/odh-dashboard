import * as React from 'react';
import { CatalogCommonData, CatalogProviderState } from '~/app/context/catalogContext/createCatalogContext';
import type { McpCatalogExtension } from '~/app/pages/mcpCatalog/types/mcpCatalogContext';
import type { McpCatalogFilterOptionsList } from '~/app/pages/mcpCatalog/types/mcpCatalogFilterOptions';
export type { McpCatalogContextType, McpCatalogExtension, McpCatalogPaginationState, } from '~/app/pages/mcpCatalog/types/mcpCatalogContext';
export type { McpCatalogFiltersState } from '~/app/pages/mcpCatalog/types/mcpCatalogFilterOptions';
declare const McpCatalogContext: React.Context<CatalogCommonData<McpCatalogFilterOptionsList> & CatalogProviderState & {
    clearAllFilters: () => void;
} & McpCatalogExtension>, McpCatalogContextProvider: React.FC<{
    children: React.ReactNode;
}>, useMcpCatalogContext: () => CatalogCommonData<McpCatalogFilterOptionsList> & CatalogProviderState & {
    clearAllFilters: () => void;
} & McpCatalogExtension;
export { McpCatalogContext, McpCatalogContextProvider, useMcpCatalogContext };
