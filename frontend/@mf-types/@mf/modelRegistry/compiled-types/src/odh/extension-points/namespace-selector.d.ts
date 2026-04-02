import type { Extension } from '@openshift/dynamic-plugin-sdk';
import type { ComponentCodeRef } from '@odh-dashboard/plugin-core';
export type NamespaceSelectorFieldProps = {
  selectedNamespace: string;
  onSelect: (namespace: string) => void;
  hasAccess?: boolean | undefined;
  isLoading?: boolean;
  error?: Error | undefined;
  cannotCheck?: boolean;
  registryName?: string;
  selectorOnly?: boolean;
};
/**
 * Extension point for providing a custom namespace/project selector component.
 * This allows ODH to replace the upstream namespace selector with its own
 * project selector that uses the OpenShift Projects API (which supports
 * non-admin listing) and filters out system projects.
 */
export type NamespaceSelectorExtension = Extension<
  'model-registry.namespace/selector',
  {
    component: ComponentCodeRef<NamespaceSelectorFieldProps>;
  }
>;
export declare const isNamespaceSelectorExtension: (
  extension: Extension,
) => extension is NamespaceSelectorExtension;
