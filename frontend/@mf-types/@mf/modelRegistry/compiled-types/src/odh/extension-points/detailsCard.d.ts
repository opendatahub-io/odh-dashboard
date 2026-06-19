import type { Extension, ExtensionPredicate } from '@openshift/dynamic-plugin-sdk';
import type { ComponentCodeRef } from '@odh-dashboard/plugin-core';
import type { DetailCardProperties } from '@odh-dashboard/plugin-core/extension-points';
export type ModelDetailsDeploymentCardExtension = Extension<'model-registry.model-details/details-card', Omit<DetailCardProperties, 'component'> & {
    component: ComponentCodeRef<{
        rmId?: string;
        mrName?: string;
    }>;
}>;
export declare const isModelDetailsDeploymentCardExtension: ExtensionPredicate<ModelDetailsDeploymentCardExtension>;
