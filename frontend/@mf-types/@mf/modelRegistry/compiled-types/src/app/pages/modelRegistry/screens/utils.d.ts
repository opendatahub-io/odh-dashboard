import { KeyValuePair } from 'mod-arch-core';
import { ModelRegistry, ModelRegistryCustomProperties, ModelRegistryCustomProperty, ModelRegistryCustomPropertyDouble, ModelRegistryCustomPropertyInt, ModelRegistryCustomPropertyString, ModelVersion, RegisteredModel } from '~/app/types';
import { ModelRegistryFilterDataType, ModelRegistryVersionsFilterDataType } from '~/app/pages/modelRegistry/screens/const';
export type ObjectStorageFields = {
    endpoint: string;
    bucket: string;
    region?: string;
    path: string;
};
export type ModelRegistryEditableCustomProperties = Record<string, ModelRegistryCustomPropertyString | ModelRegistryCustomPropertyInt | ModelRegistryCustomPropertyDouble>;
export declare const getLabels: <T extends ModelRegistryCustomProperties>(customProperties: T) => string[];
export declare const mergeUpdatedLabels: (customProperties: ModelRegistryCustomProperties, updatedLabels: string[]) => ModelRegistryCustomProperties;
export declare const getPropertyValue: (prop: ModelRegistryCustomPropertyString | ModelRegistryCustomPropertyInt | ModelRegistryCustomPropertyDouble) => string;
export declare const getProperties: <T extends ModelRegistryCustomProperties>(customProperties: T) => ModelRegistryEditableCustomProperties;
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
export declare const getCustomPropString: <T extends Record<string, ModelRegistryCustomProperty | undefined>>(customProperties: T, key: string) => string;
export declare const filterModelVersions: (unfilteredModelVersions: ModelVersion[], filterData: ModelRegistryVersionsFilterDataType) => ModelVersion[];
export declare const sortModelVersionsByCreateTime: (registeredModels: ModelVersion[]) => ModelVersion[];
export declare const filterRegisteredModels: (unfilteredRegisteredModels: RegisteredModel[], unfilteredModelVersions: ModelVersion[], filterData: ModelRegistryFilterDataType) => RegisteredModel[];
export declare const getServerAddress: (resource: ModelRegistry) => string;
export declare const isValidHttpUrl: (value: string) => boolean;
export declare const isCompanyUri: (uri: string) => boolean;
export declare const getLatestVersionForRegisteredModel: (modelVersions: ModelVersion[], rmId: string) => ModelVersion | undefined;
export declare const getValidatedOnPlatforms: <T extends ModelRegistryCustomProperties>(customProperties: T | undefined) => string[];
