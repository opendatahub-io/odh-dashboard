import * as React from 'react';
import type { McpCatalogContextType } from '~/app/pages/mcpCatalog/types/mcpCatalogContext';
export type { McpCatalogContextType, McpCatalogPaginationState, } from '~/app/pages/mcpCatalog/types/mcpCatalogContext';
export type { McpCatalogFiltersState } from '~/app/pages/mcpCatalog/types/mcpCatalogFilterOptions';
type McpCatalogContextProviderProps = {
    children: React.ReactNode;
};
export declare const McpCatalogContext: React.Context<McpCatalogContextType>;
export declare const McpCatalogContextProvider: React.FC<McpCatalogContextProviderProps>;
