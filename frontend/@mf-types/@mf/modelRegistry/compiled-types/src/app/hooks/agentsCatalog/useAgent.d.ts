import { FetchState } from 'mod-arch-core';
import { Agent } from '~/app/agentsCatalogTypes';
import type { ModelCatalogAPIState } from '~/app/hooks/modelCatalog/useModelCatalogAPIState';
type State = Agent | null;
export declare const useAgentWithAPI: (apiState: ModelCatalogAPIState, agentId: string) => FetchState<State>;
export declare const useAgent: (agentId: string) => FetchState<State>;
export {};
