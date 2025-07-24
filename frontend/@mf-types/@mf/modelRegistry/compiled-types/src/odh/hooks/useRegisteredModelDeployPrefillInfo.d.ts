import { ModelVersion, RegisteredModel } from '~/app/types';
export type ModelDeployPrefillInfo = {
    modelName: string;
    modelFormat?: string;
    modelArtifactUri?: string;
    connectionTypeName?: string;
    initialConnectionName?: string;
    modelRegistryInfo?: {
        modelVersionId?: string;
        registeredModelId?: string;
        mrName?: string;
    };
};
declare const useRegisteredModelDeployPrefillInfo: (modelVersion: ModelVersion, mrName?: string) => {
    modelDeployPrefillInfo: ModelDeployPrefillInfo;
    registeredModel: RegisteredModel | null;
    loaded: boolean;
    error: Error | undefined;
};
export default useRegisteredModelDeployPrefillInfo;
