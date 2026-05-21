import type { K8sResourceCommon } from '@odh-dashboard/internal/k8sTypes';
import { MaaSSubscription } from '~/app/types/subscriptions';

export const convertSubscriptionToK8sResource = (
  subscription: MaaSSubscription,
): K8sResourceCommon => ({
  apiVersion: 'maas.opendatahub.io/v1alpha1',
  kind: 'MaaSSubscription',
  metadata: { name: subscription.name },
});
