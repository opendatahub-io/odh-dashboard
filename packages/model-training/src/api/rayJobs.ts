import { k8sDeleteResource, K8sStatus } from '@openshift/dynamic-plugin-sdk-utils';
import { applyK8sAPIOptions } from '@odh-dashboard/internal/api/apiMergeUtils';
import { K8sAPIOptions } from '@odh-dashboard/internal/k8sTypes';
import { groupVersionKind } from '@odh-dashboard/internal/api/k8sUtils';
import { RayJobModel } from '@odh-dashboard/internal/api/models/kubeflow';
import { CustomWatchK8sResult } from '@odh-dashboard/internal/types';
import useK8sWatchResourceList from '@odh-dashboard/internal/utilities/useK8sWatchResourceList';

import { RayJobKind } from '../k8sTypes';

export const useRayJobs = (namespace: string | null): CustomWatchK8sResult<RayJobKind[]> =>
  useK8sWatchResourceList(
    namespace !== null
      ? {
          isList: true,
          groupVersionKind: groupVersionKind(RayJobModel),
          namespace,
        }
      : null,
    RayJobModel,
  );

export const deleteRayJob = (
  name: string,
  namespace: string,
  opts?: K8sAPIOptions,
): Promise<K8sStatus> =>
  k8sDeleteResource<RayJobKind, K8sStatus>(
    applyK8sAPIOptions(
      {
        model: RayJobModel,
        queryOptions: { name, ns: namespace },
      },
      opts,
    ),
  );
