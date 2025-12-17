import { k8sDeleteResource, K8sStatus } from '@openshift/dynamic-plugin-sdk-utils';
import { applyK8sAPIOptions } from '@odh-dashboard/internal/api/apiMergeUtils';
import { K8sAPIOptions } from '@odh-dashboard/internal/k8sTypes';
import { groupVersionKind } from '@odh-dashboard/internal/api/k8sUtils';
import { TrainJobModel } from '@odh-dashboard/internal/api/models/kubeflow';
import { CustomWatchK8sResult } from '@odh-dashboard/internal/types';
import useK8sWatchResourceList from '@odh-dashboard/internal/utilities/useK8sWatchResourceList';

import { TrainJobKind } from '../k8sTypes';

/**
 * Watch TrainJobs in a namespace
 * @param namespace - The namespace to watch
 * @returns Custom watch result with TrainJob list
 */
export const useTrainJobs = (namespace: string): CustomWatchK8sResult<TrainJobKind[]> =>
  useK8sWatchResourceList(
    {
      isList: true,
      groupVersionKind: groupVersionKind(TrainJobModel),
      namespace,
    },
    TrainJobModel,
  );

/**
 * Delete a TrainJob
 * @param name - The name of the TrainJob
 * @param namespace - The namespace of the TrainJob
 * @param opts - Optional K8s API options
 * @returns Promise with K8s status
 */
export const deleteTrainJob = (
  name: string,
  namespace: string,
  opts?: K8sAPIOptions,
): Promise<K8sStatus> =>
  k8sDeleteResource<TrainJobKind, K8sStatus>(
    applyK8sAPIOptions(
      {
        model: TrainJobModel,
        queryOptions: { name, ns: namespace },
      },
      opts,
    ),
  );
