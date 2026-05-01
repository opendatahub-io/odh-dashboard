import { FetchState } from 'mod-arch-core';
import { McpServer } from '~/app/mcpServerCatalogTypes';
import type { ModelCatalogAPIState } from '~/app/hooks/modelCatalog/useModelCatalogAPIState';
type State = McpServer | null;
export declare const useMcpServerWithAPI: (apiState: ModelCatalogAPIState, serverId: string) => FetchState<State>;
export declare const useMcpServer: (serverId: string) => FetchState<State>;
export {};
