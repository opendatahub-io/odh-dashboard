import { FetchState } from 'mod-arch-core';
import { CatalogFilterOptionsList } from '~/app/modelCatalogTypes';
import type { ModelCatalogAPIState } from '~/app/hooks/modelCatalog/useModelCatalogAPIState';
import type { AgentsCatalogFilterOptionsList } from '~/app/pages/agentsCatalog/types/agentsCatalogFilterOptions';
export declare function mapBackendFilterOptions(raw: CatalogFilterOptionsList): AgentsCatalogFilterOptionsList;
type State = AgentsCatalogFilterOptionsList | null;
export declare const useAgentFilterOptionListWithAPI: (apiState: ModelCatalogAPIState) => FetchState<State>;
export {};
