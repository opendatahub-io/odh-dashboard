import { ModelRegistry, ModelVersion, RegisteredModel } from '~/app/types';
import { K8sResourceCommon } from '~/shared/types';
export type ObjectStorageFields = {
    endpoint: string;
    bucket: string;
    region?: string;
    path: string;
};
export declare const objectStorageFieldsToUri: (fields: ObjectStorageFields) => string | null;
export declare const uriToObjectStorageFields: (uri: string) => ObjectStorageFields | null;
export declare const getLastCreatedItem: <T extends {
    createTimeSinceEpoch?: string;
}>(items?: T[]) => T | undefined;
export declare const filterArchiveVersions: (modelVersions: ModelVersion[]) => ModelVersion[];
export declare const filterLiveVersions: (modelVersions: ModelVersion[]) => ModelVersion[];
export declare const filterArchiveModels: (registeredModels: RegisteredModel[]) => RegisteredModel[];
export declare const filterLiveModels: (registeredModels: RegisteredModel[]) => RegisteredModel[];
export declare const convertToK8sResourceCommon: (modelRegistry: ModelRegistry) => K8sResourceCommon;
