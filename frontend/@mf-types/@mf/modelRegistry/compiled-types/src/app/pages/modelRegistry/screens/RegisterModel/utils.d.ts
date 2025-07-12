import { ModelArtifact, ModelVersion, RegisteredModel, RegisteredModelList } from '~/app/types';
import { ModelRegistryAPIState } from '~/app/hooks/useModelRegistryAPIState';
import { RegisterCatalogModelFormData, RegisterModelFormData, RegisterVersionFormData } from './useRegisterModelData';
export type RegisterModelCreatedResources = RegisterVersionCreatedResources & {
    registeredModel?: RegisteredModel;
};
export type RegisterVersionCreatedResources = {
    modelVersion?: ModelVersion;
    modelArtifact?: ModelArtifact;
};
export declare const registerModel: (apiState: ModelRegistryAPIState, formData: RegisterModelFormData, author: string) => Promise<{
    data: RegisterModelCreatedResources;
    errors: {
        [key: string]: Error | undefined;
    };
}>;
export declare const registerVersion: (apiState: ModelRegistryAPIState, registeredModel: RegisteredModel, formData: Omit<RegisterVersionFormData, "registeredModelId">, author: string, isFirstVersion?: boolean) => Promise<{
    data: RegisterVersionCreatedResources;
    errors: {
        [key: string]: Error | undefined;
    };
}>;
export declare const isRegisterModelSubmitDisabled: (formData: RegisterModelFormData, registeredModels: RegisteredModelList) => boolean;
export declare const isRegisterVersionSubmitDisabled: (formData: RegisterVersionFormData) => boolean;
export declare const isRegisterCatalogModelSubmitDisabled: (formData: RegisterCatalogModelFormData, registeredModels: RegisteredModelList) => boolean;
export declare const isNameValid: (name: string) => boolean;
export declare const isModelNameExisting: (name: string, registeredModels: RegisteredModelList) => boolean;
