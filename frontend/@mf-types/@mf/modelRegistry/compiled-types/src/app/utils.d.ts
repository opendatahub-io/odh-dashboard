import { ModelRegistryCustomProperties, ModelVersion, ModelTransferJob, ModelTransferJobSourceType, ModelTransferJobDestinationType, RegisteredModel } from '~/app/types';
export type StorageType = ModelTransferJobSourceType | ModelTransferJobDestinationType;
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
export declare const getStorageTypeLabel: (type: StorageType) => string;
export declare const getModelUriPopoverContent: (destType: ModelTransferJobDestinationType) => string;
export declare const getModelUriLabel: (destType: ModelTransferJobDestinationType) => string;
export declare const getSourceLabel: (sourceType: ModelTransferJobSourceType) => string;
export declare const getDestinationUri: (job: ModelTransferJob) => string;
export declare const getSourcePath: (job: ModelTransferJob) => string;
