import { APIState } from 'mod-arch-core';
import { ModelCatalogAPIs } from '~/app/modelCatalogTypes';
export type ModelCatalogAPIState = APIState<ModelCatalogAPIs>;
declare const useModelCatalogAPIState: (hostPath: string | null, queryParameters?: Record<string, unknown>) => [apiState: ModelCatalogAPIState, refreshAPIState: () => void];
export default useModelCatalogAPIState;
