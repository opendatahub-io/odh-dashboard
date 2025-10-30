/**
 * Creates label selectors for deployment filtering based on model registry entities
 */
export declare const createModelRegistryLabelSelectors: {
    forRegisteredModel: (rmId: string) => {
        "modelregistry.opendatahub.io/registered-model-id": string;
    };
    forModelVersion: (mvId: string) => {
        "modelregistry.opendatahub.io/model-version-id": string;
    };
    forModelRegistry: (mrName?: string) => {
        'modelregistry.opendatahub.io/name': string;
    } | undefined;
};
/**
 * Hook that provides common model registry deployment context setup
 */
export declare const useModelRegistryDeploymentContext: () => {
    preferredModelRegistry: import("../../app/types").ModelRegistry | undefined;
    mrName: string | undefined;
};
