import * as React from 'react';
import useFetch, { NotReadyError } from '@odh-dashboard/internal/utilities/useFetch';
import { RayJobKind, RayClusterKind, RayClusterSpec } from '../k8sTypes';
import { getRayCluster } from '../api/rayClusters';

/**
 * Returns the RayClusterSpec for a RayJob.
 * For lifecycled jobs, uses the inline spec from `job.spec.rayClusterSpec`.
 * For workspace jobs, fetches the external RayCluster via `clusterSelector['ray.io/cluster']`.
 */
export const useRayClusterSpec = (
  job: RayJobKind,
): { clusterSpec: RayClusterSpec | undefined; loaded: boolean; error: Error | undefined } => {
  const inlineSpec = job.spec.rayClusterSpec;
  const workspaceClusterName = job.spec.clusterSelector?.['ray.io/cluster'];

  const {
    data: fetchedCluster,
    loaded: fetchLoaded,
    error,
  } = useFetch<RayClusterKind | null>(
    React.useCallback(() => {
      if (inlineSpec || !workspaceClusterName) {
        return Promise.reject(new NotReadyError('Inline spec available or no workspace cluster'));
      }
      return getRayCluster(workspaceClusterName, job.metadata.namespace);
    }, [inlineSpec, workspaceClusterName, job.metadata.namespace]),
    null,
    { initialPromisePurity: true },
  );

  return {
    clusterSpec: inlineSpec ?? fetchedCluster?.spec,
    loaded: !!inlineSpec || !workspaceClusterName || fetchLoaded,
    error,
  };
};
