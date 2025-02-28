import { GenericObjectState } from '~/shared/utilities/useGenericObjectState';
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
};
export type RegisterModelFormData = RegistrationCommonFormData & {
    modelName: string;
    modelDescription: string;
};
export type RegisterVersionFormData = RegistrationCommonFormData & {
    registeredModelId: string;
};
export declare const useRegisterModelData: () => GenericObjectState<RegisterModelFormData>;
export declare const useRegisterVersionData: (registeredModelId?: string) => GenericObjectState<RegisterVersionFormData>;
