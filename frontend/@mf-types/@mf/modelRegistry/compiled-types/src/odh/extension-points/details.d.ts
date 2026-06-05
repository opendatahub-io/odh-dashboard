import type { Extension, ExtensionPredicate } from '@openshift/dynamic-plugin-sdk';
import type { DetailTabProperties } from '@odh-dashboard/plugin-core/extension-points';
export type ModelRegistryVersionDetailsTabExtension = Extension<'model-registry.version-details/tab', DetailTabProperties>;
export declare const isModelRegistryVersionDetailsTabExtension: ExtensionPredicate<ModelRegistryVersionDetailsTabExtension>;
export type ModelRegistryDetailsTabExtension = Extension<'model-registry.details/tab', DetailTabProperties>;
export declare const isModelRegistryDetailsTabExtension: ExtensionPredicate<ModelRegistryDetailsTabExtension>;
