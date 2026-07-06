import * as React from 'react';
import { WorkloadKind } from '#~/k8sTypes';
import { listWorkloads } from '#~/api';
import useFetch, { NotReadyError } from '#~/utilities/useFetch';
import { getAssignedFlavorFromWorkload } from '#~/utilities/clusterQueueUtils';

/**
 * Resolves the Kueue-assigned flavor for a workload in a queue.
 * Used by workbench Resources tab and model deployment UIs to show consumed/quota for the flavor this resource is using.
 *
 * @param namespace - Project/namespace to list workloads in (when undefined, no fetch)
 * @param localQueueName - Queue name from the resource (e.g. notebook label, deployment queue)
 * @param resourceName - Optional workload name to match (e.g. notebook name, deployment name). When provided, prefers a workload with this name; otherwise uses the first workload in the queue.
 * @returns The assigned flavor name from the matching workload's admission, or undefined
 */
const useAssignedFlavor = (
  namespace: string | undefined,
  localQueueName: string | undefined,
  resourceName?: string | undefined,
): string | undefined => {
  const { data: workloads } = useFetch<WorkloadKind[]>(
    React.useCallback(() => {
      if (!namespace) {
        return Promise.reject(new NotReadyError('No namespace'));
      }
      return listWorkloads(namespace);
    }, [namespace]),
    [],
    { initialPromisePurity: true },
  );

  return React.useMemo(() => {
    if (!localQueueName || !workloads.length) return undefined;
    const byQueue = workloads.filter((w) => w.spec.queueName === localQueueName);
    const workload = resourceName
      ? byQueue.find((w) => w.metadata?.name === resourceName) ?? byQueue[0]
      : byQueue[0];
    return getAssignedFlavorFromWorkload(workload);
  }, [workloads, localQueueName, resourceName]);
};

export default useAssignedFlavor;
