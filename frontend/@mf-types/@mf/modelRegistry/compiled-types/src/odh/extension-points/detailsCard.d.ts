import type { Extension, ExtensionPredicate } from '@openshift/dynamic-plugin-sdk';
import type { DetailCardProperties } from '@odh-dashboard/plugin-core/extension-points';
export type ModelDetailsDeploymentCardExtension = Extension<'model-registry.model-details/details-card', DetailCardProperties>;
export declare const isModelDetailsDeploymentCardExtension: ExtensionPredicate<ModelDetailsDeploymentCardExtension>;
