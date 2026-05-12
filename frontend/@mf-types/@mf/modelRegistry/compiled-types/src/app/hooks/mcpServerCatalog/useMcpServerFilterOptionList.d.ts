import { FetchState } from 'mod-arch-core';
import { CatalogFilterOptionsList } from '~/app/modelCatalogTypes';
import type { ModelCatalogAPIState } from '~/app/hooks/modelCatalog/useModelCatalogAPIState';
import type { McpCatalogFilterOptionsList } from '~/app/pages/mcpCatalog/types/mcpCatalogFilterOptions';
export declare function mapBackendFilterOptions(raw: CatalogFilterOptionsList): McpCatalogFilterOptionsList;
type State = McpCatalogFilterOptionsList | null;
export declare const useMcpServerFilterOptionListWithAPI: (apiState: ModelCatalogAPIState) => FetchState<State>;
export declare const useMcpServerFilterOptionList: () => FetchState<State>;
export {};
