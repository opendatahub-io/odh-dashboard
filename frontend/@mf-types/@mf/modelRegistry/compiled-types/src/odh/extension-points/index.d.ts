import type { ModelVersion } from '~/app/types';
import type { Extension, CodeRef, ResolvedExtension } from '@openshift/dynamic-plugin-sdk';
import type { IAction } from '@patternfly/react-table';
export type ModelRegistryDeployButtonExtension = Extension<'model-registry.model-version/deploy-button', {
    component: CodeRef<React.ComponentType<{
        modelVersion: ModelVersion;
    }>>;
}>;
export declare const isModelRegistryDeployButtonExtension: (extension: Extension) => extension is ModelRegistryDeployButtonExtension;
export type ModelRegistryRowActionColumn = ResolvedExtension<ModelRegistryRowActionColumnExtension>;
export type ModelRegistryRowActionColumnExtension = Extension<'model-registry.model-version/row-action-column', {
    component: CodeRef<React.ComponentType<{
        modelVersion: ModelVersion;
        actions: IAction[];
    }>>;
}>;
export declare const isModelRegistryRowActionColumnExtension: (extension: Extension) => extension is ModelRegistryRowActionColumnExtension;
