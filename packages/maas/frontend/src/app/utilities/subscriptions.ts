import type { K8sResourceCommon } from '@odh-dashboard/k8s-core';
import { MaaSModelRefSummary, MaaSSubscription } from '~/app/types/subscriptions';
import { DEFAULT_MODEL_KIND } from './authpolicies';

export const convertSubscriptionToK8sResource = (
  subscription: MaaSSubscription,
): K8sResourceCommon => ({
  apiVersion: 'maas.opendatahub.io/v1alpha1',
  kind: 'MaaSSubscription',
  metadata: { name: subscription.name },
});

export const hasInternalModelKind = (entries: MaaSModelRefSummary[]): boolean =>
  entries.some((m) => m.modelRef.kind === DEFAULT_MODEL_KIND);
