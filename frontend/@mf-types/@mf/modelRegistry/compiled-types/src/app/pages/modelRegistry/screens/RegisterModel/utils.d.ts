import { ModelArtifact, ModelVersion, RegisteredModel, RegisteredModelList, ModelTransferJob, CreateModelTransferJobData, ModelTransferJobUploadIntent } from '~/app/types';
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
export declare const isRegisterModelSubmitDisabled: (formData: RegisterModelFormData, registeredModels: RegisteredModelList, namespaceHasAccess?: boolean, isNamespaceAccessLoading?: boolean) => boolean;
export declare const isRegisterVersionSubmitDisabled: (formData: RegisterVersionFormData, namespaceHasAccess?: boolean, isNamespaceAccessLoading?: boolean) => boolean;
export declare const isRegisterCatalogModelSubmitDisabled: (formData: RegisterCatalogModelFormData, registeredModels: RegisteredModelList, namespaceHasAccess?: boolean, isNamespaceAccessLoading?: boolean) => boolean;
export declare const isNameValid: (name: string) => boolean;
export declare const isModelNameExisting: (name: string, registeredModels: RegisteredModelList) => boolean;
export declare const isOciUri: (uri: string) => boolean;
export declare const buildModelTransferJobPayload: (formData: RegisterModelFormData | RegisterVersionFormData, author: string, uploadIntent: ModelTransferJobUploadIntent, registeredModelId?: string, registeredModelName?: string) => CreateModelTransferJobData;
export type RegisterViaTransferJobResult = {
    transferJob?: ModelTransferJob;
    error?: Error;
};
type RegisterViaTransferJobOptions = {
    intent: typeof ModelTransferJobUploadIntent.CREATE_MODEL;
    formData: RegisterModelFormData;
} | {
    intent: typeof ModelTransferJobUploadIntent.CREATE_VERSION;
    formData: RegisterVersionFormData;
    registeredModel: RegisteredModel;
};
export declare const registerViaTransferJob: (apiState: ModelRegistryAPIState, author: string, options: RegisterViaTransferJobOptions) => Promise<RegisterViaTransferJobResult>;
export {};
