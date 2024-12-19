import { SearchType } from '~/shared/components/DashboardSearchField';
import { ModelRegistryCustomProperties, ModelRegistryStringCustomProperties, ModelVersion, RegisteredModel } from '~/app/types';
import { KeyValuePair } from '~/shared/types';
export type ObjectStorageFields = {
    endpoint: string;
    bucket: string;
    region?: string;
    path: string;
};
export declare const getLabels: <T extends ModelRegistryCustomProperties>(customProperties: T) => string[];
export declare const mergeUpdatedLabels: (customProperties: ModelRegistryCustomProperties, updatedLabels: string[]) => ModelRegistryCustomProperties;
export declare const getProperties: <T extends ModelRegistryCustomProperties>(customProperties: T) => ModelRegistryStringCustomProperties;
export declare const mergeUpdatedProperty: (args: {
    customProperties: ModelRegistryCustomProperties;
} & ({
    op: "create";
    newPair: KeyValuePair;
} | {
    op: "update";
    oldKey: string;
    newPair: KeyValuePair;
} | {
    op: "delete";
    oldKey: string;
})) => ModelRegistryCustomProperties;
export declare const filterModelVersions: (unfilteredModelVersions: ModelVersion[], search: string, searchType: SearchType) => ModelVersion[];
export declare const sortModelVersionsByCreateTime: (registeredModels: ModelVersion[]) => ModelVersion[];
export declare const filterRegisteredModels: (unfilteredRegisteredModels: RegisteredModel[], search: string, searchType: SearchType) => RegisteredModel[];
export declare const objectStorageFieldsToUri: (fields: ObjectStorageFields) => string | null;
export declare const getLastCreatedItem: <T extends {
    createTimeSinceEpoch?: string;
}>(items?: T[]) => T | undefined;
export declare const filterArchiveVersions: (modelVersions: ModelVersion[]) => ModelVersion[];
export declare const filterLiveVersions: (modelVersions: ModelVersion[]) => ModelVersion[];
export declare const filterArchiveModels: (registeredModels: RegisteredModel[]) => RegisteredModel[];
export declare const filterLiveModels: (registeredModels: RegisteredModel[]) => RegisteredModel[];
export declare const uriToObjectStorageFields: (uri: string) => ObjectStorageFields | null;
