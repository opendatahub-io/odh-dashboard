import type { Extension } from '@openshift/dynamic-plugin-sdk';
import type { AccessReviewResourceAttributes } from '@odh-dashboard/k8s-core';
import type { K8sResourceIdentifier } from '@odh-dashboard/k8s-core/api/discovery';

export type ResourceCapability = {
  id: string;
  resource: K8sResourceIdentifier;
  /** Exact caller permissions required by this plugin, including namespace when scoped. */
  permissions: AccessReviewResourceAttributes[];
  /** Also accept these permissions within any host-supplied namespace, not just cluster-wide. */
  namespaceScope?: 'any';
};

/** All declared capabilities must be available before a plugin's extensions are enabled. */
export type ResourceCapabilityExtension = Extension<'app.resource-capability', ResourceCapability>;

export const isResourceCapabilityExtension = (e: Extension): e is ResourceCapabilityExtension =>
  e.type === 'app.resource-capability';

export type CapabilityState = 'loading' | 'available' | 'missing' | 'forbidden' | 'error';
