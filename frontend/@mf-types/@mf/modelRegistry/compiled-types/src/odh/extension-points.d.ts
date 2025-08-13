import type { CodeRef, Extension, ResolvedExtension } from '@openshift/dynamic-plugin-sdk';
import type { ComponentCodeRef } from '@odh-dashboard/plugin-core/extension-points';
import { ModelVersion } from '~/app/types';
import { DisplayNameAnnotations, K8sAPIOptions, ProjectKind } from '@odh-dashboard/internal/k8sTypes.js';
import { K8sResourceCommon } from '@openshift/dynamic-plugin-sdk-utils';
import { InferenceServiceModelState } from '@odh-dashboard/internal/pages/modelServing/screens/types.js';
import { EitherNotBoth, ProjectObjectType } from 'mod-arch-shared';
import { NamespaceApplicationCase } from '@odh-dashboard/internal/pages/projects/types.js';
export type DeploymentStatus = {
    state: InferenceServiceModelState;
    message?: string;
};
export type DeploymentEndpoint = {
    type: 'internal' | 'external';
    name?: string;
    url: string;
    error?: string;
};
export type ServerResourceType = K8sResourceCommon & {
    metadata: {
        name: string;
        annotations?: DisplayNameAnnotations & Partial<{
            'opendatahub.io/apiProtocol': string;
        }>;
    };
};
export type ModelResourceType = K8sResourceCommon & {
    metadata: {
        name: string;
        annotations?: DisplayNameAnnotations;
    };
};
export type Deployment<ModelResource extends ModelResourceType = ModelResourceType, ServerResource extends ServerResourceType = ServerResourceType> = {
    modelServingPlatformId: string;
    model: ModelResource;
    server?: ServerResource;
    status?: DeploymentStatus;
    endpoints?: DeploymentEndpoint[];
};
export type ModelRegistryDeploymentsTabExtension = Extension<'model-registry.version-details/tab', {
    id: string;
    title: string;
    component: ComponentCodeRef<{
        mv: ModelVersion;
        mrName?: string;
        refresh: () => void;
    }>;
}>;
export declare const isModelRegistryDeploymentsTabExtension: (extension: Extension) => extension is ModelRegistryDeploymentsTabExtension;
export type ModelServingPlatformExtension<D extends Deployment = Deployment> = Extension<'model-serving.platform', {
    id: D['modelServingPlatformId'];
    manage: {
        namespaceApplicationCase: NamespaceApplicationCase;
        enabledLabel: string;
        enabledLabelValue: string;
    };
    enableCardText: {
        title: string;
        description: string;
        selectText: string;
        enabledText: string;
        objectType: ProjectObjectType;
    };
    deployedModelsView: {
        startHintTitle: string;
        startHintDescription: string;
        deployButtonText: string;
    };
}>;
export declare const isModelServingPlatformExtension: <D extends Deployment = Deployment>(extension: Extension) => extension is ModelServingPlatformExtension<D>;
export type ModelServingPlatformWatchDeployments = ResolvedExtension<ModelServingPlatformWatchDeploymentsExtension>;
export type ModelServingPlatformWatchDeploymentsExtension<D extends Deployment = Deployment> = Extension<'model-serving.platform/watch-deployments', {
    platform: D['modelServingPlatformId'];
    watch: CodeRef<(watchParams: EitherNotBoth<{
        project: ProjectKind;
    }, {
        registeredModelId: string;
        modelVersionId: string;
        mrName?: string;
    }>, opts?: K8sAPIOptions) => [D[] | undefined, boolean, Error | undefined]>;
}>;
export declare const isModelServingPlatformWatchDeployments: <D extends Deployment = Deployment>(extension: Extension) => extension is ModelServingPlatformWatchDeploymentsExtension<D>;
