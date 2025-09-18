import { GenericObjectState } from 'mod-arch-core';
import { ModelRegistryCustomProperties, ModelArtifact } from '~/app/types';
export declare enum ModelLocationType {
    ObjectStorage = "Object storage",
    URI = "URI"
}
export type RegistrationCommonFormData = {
    versionName: string;
    versionDescription: string;
    sourceModelFormat: string;
    sourceModelFormatVersion: string;
    modelLocationType: ModelLocationType;
    modelLocationEndpoint: string;
    modelLocationBucket: string;
    modelLocationRegion: string;
    modelLocationPath: string;
    modelLocationURI: string;
    versionCustomProperties?: ModelRegistryCustomProperties;
    modelCustomProperties?: ModelRegistryCustomProperties;
    additionalArtifactProperties?: Partial<ModelArtifact>;
};
export type RegisterModelFormData = RegistrationCommonFormData & {
    modelName: string;
    modelDescription: string;
};
export type RegisterVersionFormData = RegistrationCommonFormData & {
    registeredModelId: string;
};
export type RegisterCatalogModelFormData = RegisterModelFormData & {
    modelRegistry: string;
};
export declare const useRegisterModelData: () => GenericObjectState<RegisterModelFormData>;
export declare const useRegisterVersionData: (registeredModelId?: string) => GenericObjectState<RegisterVersionFormData>;
export declare const useRegisterCatalogModelData: (initialData?: Partial<RegisterCatalogModelFormData>) => GenericObjectState<RegisterCatalogModelFormData>;
