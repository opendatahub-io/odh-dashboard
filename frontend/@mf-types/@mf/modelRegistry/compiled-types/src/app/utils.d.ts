import { ModelRegistryCustomProperties, ModelVersion, RegisteredModel } from '~/app/types';
export type ObjectStorageFields = {
    endpoint: string;
    bucket: string;
    region?: string;
    path: string;
};
export type RegisteredModelLocation = {
    s3Fields: ObjectStorageFields | null;
    uri: string | null;
    ociUri: string | null;
} | null;
export declare const objectStorageFieldsToUri: (fields: ObjectStorageFields) => string | null;
export declare const uriToStorageFields: (uri: string) => RegisteredModelLocation;
export declare const getLastCreatedItem: <T extends {
    createTimeSinceEpoch?: string;
}>(items?: T[]) => T | undefined;
export declare const filterArchiveVersions: (modelVersions: ModelVersion[]) => ModelVersion[];
export declare const filterLiveVersions: (modelVersions: ModelVersion[]) => ModelVersion[];
export declare const filterArchiveModels: (registeredModels: RegisteredModel[]) => RegisteredModel[];
export declare const filterLiveModels: (registeredModels: RegisteredModel[]) => RegisteredModel[];
export declare const getStringValue: <T extends ModelRegistryCustomProperties>(customProperties: T | undefined, key: keyof T) => string;
export declare const getIntValue: <T extends ModelRegistryCustomProperties>(customProperties: T | undefined, key: keyof T) => number;
export declare const getDoubleValue: <T extends ModelRegistryCustomProperties>(customProperties: T | undefined, key: keyof T) => number;
