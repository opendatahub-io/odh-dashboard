import { FetchState, ModelRegistryKind } from 'mod-arch-shared';
declare const useModelRegistriesSettings: (queryParams: Record<string, unknown>) => FetchState<ModelRegistryKind[]>;
export default useModelRegistriesSettings;
