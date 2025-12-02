import { k8sListResource } from '@openshift/dynamic-plugin-sdk-utils';
import { PodKind } from '@odh-dashboard/internal/k8sTypes';
import { PodModel } from '@odh-dashboard/internal/api/models/index';
import { TrainJobKind } from '../k8sTypes';

/**
 * Get all Pods associated with a TrainJob
 * Uses the JobSet label selector to find pods
 *
 * @param job - The TrainJob to get pods for
 * @returns Promise with array of Pods
 */
export const getPodsForTrainJob = (job: TrainJobKind): Promise<PodKind[]> =>
  k8sListResource<PodKind>({
    model: PodModel,
    queryOptions: {
      ns: job.metadata.namespace,
      queryParams: { labelSelector: `jobset.sigs.k8s.io/jobset-name=${job.metadata.name}` },
    },
  }).then((r) => r.items);
