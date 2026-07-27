import { commonFetchJSON, getK8sResourceURL } from '@openshift/dynamic-plugin-sdk-utils';
import { PendingWorkloadsSummary } from '#~/k8sTypes';
import { VisibilityLocalQueueModel } from '#~/api/models/kueue';

/**
 * Fetches the list of pending workloads for a LocalQueue from the Kueue Visibility API.
 * Endpoint: GET /apis/visibility.kueue.x-k8s.io/v1beta2/namespaces/{ns}/localqueues/{name}/pendingworkloads
 */
export const getPendingWorkloads = (
  namespace: string,
  localQueueName: string,
): Promise<PendingWorkloadsSummary> =>
  commonFetchJSON<PendingWorkloadsSummary>(
    getK8sResourceURL(VisibilityLocalQueueModel, undefined, {
      name: localQueueName,
      ns: namespace,
      path: 'pendingworkloads',
    }),
  );
