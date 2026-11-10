import type { Extension, CodeRef } from '@openshift/dynamic-plugin-sdk';
import type { ModelDeployPrefillInfo } from '@odh-dashboard/model-serving/shared/types/deploy-prefill';
import type { ModelRegistryDeploymentListItem } from '~/odh/k8sTypes';
export type ModelRegistryDeployModalExtension = Extension<'model-registry.model-version/deploy-modal', {
    useAvailablePlatformIds: CodeRef<() => string[]>;
    modalComponent: CodeRef<React.ComponentType<{
        modelDeployPrefill: {
            data: ModelDeployPrefillInfo;
            loaded: boolean;
            error: Error | undefined;
        };
        onClose: () => void;
    }>>;
}>;
export declare const isModelRegistryDeployModalExtension: import("@openshift/dynamic-plugin-sdk").ExtensionPredicate<ModelRegistryDeployModalExtension>;
export type ModelRegistryVersionDeploymentsContextExtension = Extension<'model-registry.model-version/deployments-context', {
    DeploymentsProvider: CodeRef<React.ComponentType<{
        children: ({ deployments, loaded, }: {
            deployments?: ModelRegistryDeploymentListItem[];
            loaded: boolean;
        }) => React.ReactNode;
        labelSelectors?: {
            [key: string]: string;
        };
        mrName?: string;
    }>>;
}>;
export declare const isModelRegistryVersionDeploymentsContextExtension: import("@openshift/dynamic-plugin-sdk").ExtensionPredicate<ModelRegistryVersionDeploymentsContextExtension>;
