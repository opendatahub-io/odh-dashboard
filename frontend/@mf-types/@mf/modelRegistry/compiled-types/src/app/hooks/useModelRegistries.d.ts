import { FetchState } from 'mod-arch-core';
import { ModelRegistry } from '~/app/types';
declare const useModelRegistries: (queryParams: Record<string, unknown>) => FetchState<ModelRegistry[]>;
export default useModelRegistries;
