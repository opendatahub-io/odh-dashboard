import * as React from 'react';
import { PodContainerStatuses, PodStepState } from '~/types';
import { usePipelinesAPI } from '~/concepts/pipelines/context';
import { useDeepCompareMemoize } from '~/utilities/useDeepCompareMemoize';
import { getPodStepsStates } from '~/concepts/k8s/pods/utils';

const usePodStepsStates = (
  sortedpodContainerStatuses: PodContainerStatuses,
  podName: string,
): PodStepState[] => {
  const { namespace } = usePipelinesAPI();
  const podContainerStatuses: PodContainerStatuses = useDeepCompareMemoize(
    sortedpodContainerStatuses,
  );
  const [allpodStepsState, setAllPodStepsState] = React.useState<PodStepState[]>([]);

  React.useEffect(() => {
    if (podContainerStatuses) {
      getPodStepsStates(podContainerStatuses, namespace, podName).then((result) => {
        setAllPodStepsState(result);
      });
    }
  }, [podContainerStatuses, namespace, podName]);
  return allpodStepsState;
};

export default usePodStepsStates;
