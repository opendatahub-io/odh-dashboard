import { APIState } from 'mod-arch-core';
import { ModelCatalogSettingsAPIs } from '~/app/modelCatalogTypes';
export type ModelCatalogSettingsAPIState = APIState<ModelCatalogSettingsAPIs>;
declare const useModelCatalogSettingsAPIState: (hostPath: string | null, queryParameters?: Record<string, unknown>) => [apiState: ModelCatalogSettingsAPIState, refreshAPIState: () => void];
export default useModelCatalogSettingsAPIState;
