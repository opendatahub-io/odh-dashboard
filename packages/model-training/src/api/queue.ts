import { k8sGetResource } from '@openshift/dynamic-plugin-sdk-utils';
import { LocalQueueModel, ClusterQueueModel } from '@odh-dashboard/internal/api/models/kueue';
import { LocalQueueKind, ClusterQueueKind } from '@odh-dashboard/internal/k8sTypes';

export const getLocalQueue = async (name: string, namespace: string): Promise<LocalQueueKind> =>
  k8sGetResource<LocalQueueKind>({
    model: LocalQueueModel,
    queryOptions: { name, ns: namespace },
  });

export const getClusterQueue = async (name: string): Promise<ClusterQueueKind> =>
  k8sGetResource<ClusterQueueKind>({
    model: ClusterQueueModel,
    queryOptions: { name },
  });
