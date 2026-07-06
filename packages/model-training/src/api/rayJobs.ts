import {
  k8sDeleteResource,
  k8sPatchResource,
  K8sStatus,
  Patch,
} from '@openshift/dynamic-plugin-sdk-utils';
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
/**
 * Only lifecycled RayJobs (those with spec.rayClusterSpec) support this operation.
 * Workspace-cluster jobs (those using spec.clusterSelector) should not be edited.
 */
export const updateRayJobNumNodes = async (
  job: RayJobKind,
  updatedGroups: { groupName: string; replicas: number }[],
  opts?: K8sAPIOptions,
): Promise<RayJobKind> => {
  const workerGroupSpecs = job.spec.rayClusterSpec?.workerGroupSpecs ?? [];

  const patches: Patch[] = [];

  updatedGroups.forEach(({ groupName, replicas }) => {
    const index = workerGroupSpecs.findIndex((g) => g.groupName === groupName);
    if (index === -1) {
      return;
    }
    const existing = workerGroupSpecs[index];
    if (existing.replicas === replicas) {
      return;
    }
    const base = `/spec/rayClusterSpec/workerGroupSpecs/${index}`;

    patches.push({
      op: existing.replicas === undefined ? 'add' : 'replace',
      path: `${base}/replicas`,
      value: replicas,
    });

    if (existing.minReplicas !== undefined) {
      patches.push({ op: 'replace', path: `${base}/minReplicas`, value: replicas });
    }
    if (existing.maxReplicas !== undefined) {
      patches.push({ op: 'replace', path: `${base}/maxReplicas`, value: replicas });
    }
  });

  if (patches.length === 0) {
    return job;
  }

  return k8sPatchResource<RayJobKind>(
    applyK8sAPIOptions(
      {
        model: RayJobModel,
        queryOptions: {
          name: job.metadata.name,
          ns: job.metadata.namespace,
        },
        patches,
      },
      opts,
    ),
  );
};
