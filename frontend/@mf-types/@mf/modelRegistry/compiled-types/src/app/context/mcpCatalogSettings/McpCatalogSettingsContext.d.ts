import * as React from 'react';
import { McpCatalogSettingsAPIState } from '~/app/hooks/mcpCatalogSettings/useMcpCatalogSettingsAPIState';
import type { McpCatalogSourceConfigList } from '~/app/mcpServerCatalogTypes';
import type { CatalogSourceList } from '~/app/shared/types/catalogTypes';
export type McpCatalogSettingsContextType = {
    apiState: McpCatalogSettingsAPIState;
    refreshAPIState: () => void;
    mcpCatalogSourceConfigs: McpCatalogSourceConfigList | null;
    mcpCatalogSourceConfigsLoaded: boolean;
    mcpCatalogSourceConfigsLoadError?: Error;
    refreshMcpCatalogSourceConfigs: () => void;
    mcpCatalogSources: CatalogSourceList | null;
    mcpCatalogSourcesLoaded: boolean;
    mcpCatalogSourcesLoadError?: Error;
    refreshMcpCatalogSources: () => void;
};
type McpCatalogSettingsContextProviderProps = {
    children: React.ReactNode;
};
export declare const McpCatalogSettingsContext: React.Context<McpCatalogSettingsContextType>;
export declare const McpCatalogSettingsContextProvider: React.FC<McpCatalogSettingsContextProviderProps>;
export {};
