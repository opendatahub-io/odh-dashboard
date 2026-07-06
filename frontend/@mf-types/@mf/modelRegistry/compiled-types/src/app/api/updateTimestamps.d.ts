import { ModelRegistryAPIs, ModelVersion, RegisteredModel } from '~/app/types';
type MinimalModelRegistryAPI = Pick<ModelRegistryAPIs, 'patchRegisteredModel'>;
export declare const bumpModelVersionTimestamp: (api: ModelRegistryAPIs, modelVersion: ModelVersion) => Promise<void>;
export declare const bumpRegisteredModelTimestamp: (api: MinimalModelRegistryAPI, registeredModel: RegisteredModel) => Promise<void>;
export declare const bumpBothTimestamps: (api: ModelRegistryAPIs, registeredModel: RegisteredModel, modelVersion: ModelVersion) => Promise<void>;
export {};
