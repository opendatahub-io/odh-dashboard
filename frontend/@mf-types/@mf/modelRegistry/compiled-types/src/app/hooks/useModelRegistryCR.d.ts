import { ModelRegistryKind, FetchState } from 'mod-arch-shared';
declare const useModelRegistryCR: (name: string, queryParams: Record<string, unknown>) => FetchState<ModelRegistryKind | null>;
export { useModelRegistryCR };
