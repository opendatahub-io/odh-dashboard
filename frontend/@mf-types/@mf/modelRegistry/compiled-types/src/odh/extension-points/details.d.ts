import type { Extension, ExtensionPredicate } from '@openshift/dynamic-plugin-sdk';
import type { ComponentCodeRef } from '@odh-dashboard/plugin-core';
import type { DetailTabProperties } from '@odh-dashboard/plugin-core/extension-points';
export type ModelRegistryVersionDetailsTabExtension = Extension<'model-registry.version-details/tab', Omit<DetailTabProperties, 'component'> & {
    component: ComponentCodeRef<{
        rmId?: string;
        mvId?: string;
        mrName?: string;
    }>;
}>;
export declare const isModelRegistryVersionDetailsTabExtension: ExtensionPredicate<ModelRegistryVersionDetailsTabExtension>;
export type ModelRegistryDetailsTabExtension = Extension<'model-registry.details/tab', Omit<DetailTabProperties, 'component'> & {
    component: ComponentCodeRef<{
        rmId?: string;
        mrName?: string;
    }>;
}>;
export declare const isModelRegistryDetailsTabExtension: ExtensionPredicate<ModelRegistryDetailsTabExtension>;
