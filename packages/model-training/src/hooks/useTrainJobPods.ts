import * as React from 'react';
import { PodKind } from '@odh-dashboard/internal/k8sTypes';
import { NotReadyError } from '@odh-dashboard/internal/utilities/useFetchState';
import useFetch from '@odh-dashboard/internal/utilities/useFetch';
import { getPodsForTrainJob } from '../api';
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
 * Hook to fetch pods for a training job and separate them into initializers and training pods
 * @param job - The TrainJob resource
 * @returns Object containing pods data (all, initializers, training), loading state, and error
 */
const useTrainJobPods = (job: TrainJobKind | undefined): UseTrainJobPodsResult => {
  const {
    data: pods,
    loaded: podsLoaded,
    error: podsError,
  } = useFetch<PodKind[]>(
    React.useCallback(() => {
      if (!job) {
        return Promise.reject(new NotReadyError('Missing TrainJob'));
      }
      return getPodsForTrainJob(job);
    }, [job]),
    [],
    { initialPromisePurity: true },
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
