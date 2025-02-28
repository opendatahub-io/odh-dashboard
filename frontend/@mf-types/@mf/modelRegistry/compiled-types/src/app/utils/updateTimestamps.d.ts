import { ModelRegistryAPIs } from '~/app/types';
type MinimalModelRegistryAPI = Pick<ModelRegistryAPIs, 'patchRegisteredModel'>;
export declare const bumpModelVersionTimestamp: (api: ModelRegistryAPIs, modelVersionId: string) => Promise<void>;
export declare const bumpRegisteredModelTimestamp: (api: MinimalModelRegistryAPI, registeredModelId: string) => Promise<void>;
export declare const bumpBothTimestamps: (api: ModelRegistryAPIs, modelVersionId: string, registeredModelId: string) => Promise<void>;
export {};
