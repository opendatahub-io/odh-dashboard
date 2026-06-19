import type { Extension, ExtensionPredicate } from '@openshift/dynamic-plugin-sdk';
import type { ComponentCodeRef } from '@odh-dashboard/plugin-core';
import type { TableColumnProperties } from '@odh-dashboard/plugin-core/extension-points';
import type { RegisteredModel } from '~/app/types';
export type ModelRegistryTableColumnExtension = Extension<'model-registry.registered-models/table-column', Omit<TableColumnProperties, 'component'> & {
    component: ComponentCodeRef<{
        registeredModel: RegisteredModel;
        preferredModelRegistryName?: string;
    }>;
}>;
export declare const isModelRegistryTableColumnExtension: ExtensionPredicate<ModelRegistryTableColumnExtension>;
