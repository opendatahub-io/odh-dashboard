import { FetchState } from 'mod-arch-core';
import { McpCatalogSourceConfigList } from '~/app/mcpServerCatalogTypes';
import { McpCatalogSettingsAPIState } from './useMcpCatalogSettingsAPIState';
export declare const useMcpCatalogSourceConfigs: (apiState: McpCatalogSettingsAPIState) => FetchState<McpCatalogSourceConfigList>;
