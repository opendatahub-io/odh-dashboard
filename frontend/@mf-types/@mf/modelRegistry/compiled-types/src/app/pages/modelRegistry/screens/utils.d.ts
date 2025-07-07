import { KeyValuePair } from 'mod-arch-shared';
import { SearchType } from 'mod-arch-shared/dist/components/DashboardSearchField';
import { ModelRegistry, ModelRegistryCustomProperties, ModelRegistryStringCustomProperties, ModelVersion, RegisteredModel } from '~/app/types';
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
export declare const filterRegisteredModels: (unfilteredRegisteredModels: RegisteredModel[], unfilteredModelVersions: ModelVersion[], search: string, searchType: SearchType) => RegisteredModel[];
export declare const getServerAddress: (resource: ModelRegistry) => string;
export declare const isValidHttpUrl: (value: string) => boolean;
export declare const filterCustomProperties: (customProperties: ModelRegistryCustomProperties, keys: string[]) => ModelRegistryCustomProperties;
export declare const isPipelineRunExist: (customProperties: ModelRegistryCustomProperties, keys: string[]) => boolean;
export declare const isRedHatRegistryUri: (uri: string) => boolean;
