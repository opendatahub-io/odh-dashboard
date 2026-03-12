import * as React from 'react';
import { k8sGetResource } from '@openshift/dynamic-plugin-sdk-utils';
import { RayClusterModel } from '@odh-dashboard/internal/api/models/kubeflow';
import { RayJobKind, RayClusterKind } from '../k8sTypes';

export const useRayVersion = (
  job: RayJobKind,
): { rayVersion: string | undefined; loaded: boolean } => {
  const inlineVersion = job.spec.rayClusterSpec?.rayVersion;
  const workspaceClusterName = job.spec.clusterSelector?.['ray.io/cluster'];

  const [fetchedVersion, setFetchedVersion] = React.useState<string | undefined>(undefined);
  const [loaded, setLoaded] = React.useState(!!inlineVersion || !workspaceClusterName);

  React.useEffect(() => {
    if (inlineVersion || !workspaceClusterName) {
      return;
    }

    let cancelled = false;
    setLoaded(false);

    k8sGetResource<RayClusterKind>({
      model: RayClusterModel,
      queryOptions: { name: workspaceClusterName, ns: job.metadata.namespace },
    })
      .then((cluster) => {
        if (!cancelled) {
          setFetchedVersion(cluster.spec.rayVersion);
          setLoaded(true);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setLoaded(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [inlineVersion, workspaceClusterName, job.metadata.namespace]);

  return {
    rayVersion: inlineVersion ?? fetchedVersion,
    loaded,
  };
};
