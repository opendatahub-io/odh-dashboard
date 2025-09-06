import { FetchState } from 'mod-arch-core';
import { ModelRegistryKind } from 'mod-arch-shared';
declare const useModelRegistryCR: (name: string, queryParams: Record<string, unknown>) => FetchState<ModelRegistryKind | null>;
export { useModelRegistryCR };
