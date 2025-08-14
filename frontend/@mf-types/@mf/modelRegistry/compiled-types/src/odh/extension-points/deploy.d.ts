import { ProjectKind } from '@odh-dashboard/internal/k8sTypes.js';
import type { Extension, CodeRef } from '@openshift/dynamic-plugin-sdk';
import type { ModelDeployPrefillInfo } from '~/odh/hooks/useRegisteredModelDeployPrefillInfo';
export type ModelRegistryDeployModalExtension = Extension<'model-registry.model-version/deploy-modal', {
    useAvailablePlatformIds: CodeRef<() => string[]>;
    modalComponent: CodeRef<React.ComponentType<{
        modelDeployPrefill: {
            data: ModelDeployPrefillInfo;
            loaded: boolean;
            error: Error | undefined;
        };
        onSubmit: () => void;
        onClose: () => void;
    }>>;
}>;
export declare const isModelRegistryDeployModalExtension: (extension: Extension) => extension is ModelRegistryDeployModalExtension;
export type ModelRegistryVersionDeploymentsContextExtension = Extension<'model-registry.model-version/deployments-context', {
    DeploymentsProvider: CodeRef<React.ComponentType<{
        children: ({ deployments, loaded, errors, projects, }: {
            deployments?: any[];
            loaded: boolean;
            errors?: Error[];
            projects?: ProjectKind[];
        }) => React.ReactNode;
        labelSelectors?: {
            [key: string]: string;
        };
    }>>;
}>;
export declare const isModelRegistryVersionDeploymentsContextExtension: (extension: Extension) => extension is ModelRegistryVersionDeploymentsContextExtension;
