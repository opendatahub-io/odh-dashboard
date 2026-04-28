import type { Extension } from '@openshift/dynamic-plugin-sdk';
import type { ComponentCodeRef } from '@odh-dashboard/plugin-core';
import type { NamespaceSelectorFieldProps } from '~/concepts/k8s/NamespaceSelectorField/NamespaceSelectorField';
export type { NamespaceSelectorFieldProps };
/**
 * Extension point for providing a custom namespace/project selector component.
 * This allows ODH to replace the upstream namespace selector with its own
 * project selector that uses the OpenShift Projects API (which supports
 * non-admin listing) and filters out system projects.
 */
export type NamespaceSelectorExtension = Extension<'model-registry.namespace/selector', {
    component: ComponentCodeRef<NamespaceSelectorFieldProps>;
}>;
export declare const isNamespaceSelectorExtension: (extension: Extension) => extension is NamespaceSelectorExtension;
