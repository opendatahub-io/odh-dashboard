import * as React from 'react';
import { PodKind } from '@odh-dashboard/internal/k8sTypes';
import { PodModel } from '@odh-dashboard/internal/api/models/k8s';
import { groupVersionKind } from '@odh-dashboard/internal/api/k8sUtils';
import useK8sWatchResourceList from '@odh-dashboard/internal/utilities/useK8sWatchResourceList';
import { TrainJobKind } from '../k8sTypes';

type UseTrainJobPodsResult = {
  pods: PodKind[];
  initializers: PodKind[];
  training: PodKind[];
  loaded: boolean;
  error: Error | undefined;
};

const groupPodsByType = (pods: PodKind[]): { initializers: PodKind[]; training: PodKind[] } => {
  const initializers: PodKind[] = [];
  const training: PodKind[] = [];

  pods.forEach((pod) => {
    const podName = pod.metadata.name.toLowerCase();
    if (podName.includes('initializer')) {
      initializers.push(pod);
    } else {
      training.push(pod);
    }
  });

  return { initializers, training };
};

/**
 * Hook to watch pods for a training job with real-time updates via WebSocket
 * Separates pods into initializers and training pods
 * @param job - The TrainJob resource
 * @returns Object containing pods data (all, initializers, training), loading state, and error
 */
const useTrainJobPods = (job: TrainJobKind | undefined): UseTrainJobPodsResult => {
  const selector = React.useMemo(() => {
    if (!job) {
      return undefined;
    }

    return {
      matchLabels: {
        'jobset.sigs.k8s.io/jobset-name': job.metadata.name,
      },
    };
  }, [job]);

  const [pods, podsLoaded, podsError] = useK8sWatchResourceList<PodKind[]>(
    job
      ? {
          isList: true,
          groupVersionKind: groupVersionKind(PodModel),
          namespace: job.metadata.namespace,
          selector,
        }
      : null,
    PodModel,
  );

  const { initializers, training } = React.useMemo(() => groupPodsByType(pods), [pods]);

  return {
    pods,
    initializers,
    training,
    loaded: podsLoaded,
    error: podsError,
  };
};

export default useTrainJobPods;
