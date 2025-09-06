import { APIState } from 'mod-arch-core';
import { ModelRegistryAPIs } from '~/app/types';
export type ModelRegistryAPIState = APIState<ModelRegistryAPIs>;
declare const useModelRegistryAPIState: (hostPath: string | null, queryParameters?: Record<string, unknown>) => [apiState: ModelRegistryAPIState, refreshAPIState: () => void];
export default useModelRegistryAPIState;
