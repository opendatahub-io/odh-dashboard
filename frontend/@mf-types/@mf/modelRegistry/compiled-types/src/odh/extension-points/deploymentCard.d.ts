import type { CodeRef, Extension } from '@openshift/dynamic-plugin-sdk';
export type ModelDetailsDeploymentCardExtension = Extension<'model-registry.model-details/deployment-card', {
    component: CodeRef<React.ComponentType<{
        rmId?: string;
        mrName?: string;
    }>>;
}>;
export declare const isModelDetailsDeploymentCardExtension: (extension: Extension) => extension is ModelDetailsDeploymentCardExtension;
