import type { Extension, ExtensionPredicate } from '@openshift/dynamic-plugin-sdk';
import type { TableColumnProperties } from '@odh-dashboard/plugin-core/extension-points';
export type ModelRegistryTableColumnExtension = Extension<'model-registry.registered-models/table-column', TableColumnProperties>;
export declare const isModelRegistryTableColumnExtension: ExtensionPredicate<ModelRegistryTableColumnExtension>;
