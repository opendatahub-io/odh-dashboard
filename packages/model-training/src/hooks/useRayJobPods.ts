import * as React from 'react';
import { PodKind } from '@odh-dashboard/internal/k8sTypes';
import { PodModel } from '@odh-dashboard/internal/api/models/k8s';
import { groupVersionKind } from '@odh-dashboard/internal/api/k8sUtils';
import useK8sWatchResourceList from '@odh-dashboard/internal/utilities/useK8sWatchResourceList';
import { RayJobKind } from '../k8sTypes';

type UseRayJobPodsResult = {
  submitterPods: PodKind[];
  headPods: PodKind[];
  workerPods: PodKind[];
  loaded: boolean;
  error: Error | undefined;
};

const useRayJobPods = (job: RayJobKind | undefined): UseRayJobPodsResult => {
  const jobName = job?.metadata.name;
  const namespace = job?.metadata.namespace;
  const rayClusterName =
    job?.status?.rayClusterName || job?.spec.clusterSelector?.['ray.io/cluster'];

  const submitterSelector = React.useMemo(
    () => (jobName ? { matchLabels: { 'batch.kubernetes.io/job-name': jobName } } : undefined),
    [jobName],
  );

  const clusterSelector = React.useMemo(
    () => (rayClusterName ? { matchLabels: { 'ray.io/cluster': rayClusterName } } : undefined),
    [rayClusterName],
  );

  const [submitterPodsList, submitterLoaded, submitterError] = useK8sWatchResourceList<PodKind[]>(
    job && jobName
      ? {
          isList: true,
          groupVersionKind: groupVersionKind(PodModel),
          namespace,
          selector: submitterSelector,
        }
      : null,
    PodModel,
  );

  const [clusterPodsList, clusterLoaded, clusterError] = useK8sWatchResourceList<PodKind[]>(
    job && rayClusterName
      ? {
          isList: true,
          groupVersionKind: groupVersionKind(PodModel),
          namespace,
          selector: clusterSelector,
        }
      : null,
    PodModel,
  );

  const { headPods, workerPods } = React.useMemo(() => {
    const heads: PodKind[] = [];
    const workers: PodKind[] = [];

    clusterPodsList.forEach((pod) => {
      const nodeType = pod.metadata.labels?.['ray.io/node-type'];
      if (nodeType === 'head') {
        heads.push(pod);
      } else {
        workers.push(pod);
      }
    });

    return { headPods: heads, workerPods: workers };
  }, [clusterPodsList]);

  return {
    submitterPods: submitterPodsList,
    headPods,
    workerPods,
    loaded: submitterLoaded && clusterLoaded,
    error: submitterError || clusterError,
  };
};

export default useRayJobPods;
