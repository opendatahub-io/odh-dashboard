import * as React from 'react';
import { PodContainer, PodStepState } from '~/types';
import { usePipelinesAPI } from '~/concepts/pipelines/context';
import { useDeepCompareMemoize } from '~/utilities/useDeepCompareMemoize';
import { getPodStepsStates } from '~/concepts/k8s/pods/utils';

const usePodStepsStates = (podContainers: PodContainer[], podName: string): PodStepState[] => {
  const { namespace } = usePipelinesAPI();
  const podSteps = useDeepCompareMemoize(podContainers);
  const [allpodStepsState, setAllPodStepsState] = React.useState<PodStepState[]>([]);

  React.useEffect(() => {
    getPodStepsStates(podSteps, namespace, podName).then((result) => {
      setAllPodStepsState(result);
    });
  }, [podSteps, namespace, podName]);
  return allpodStepsState;
};

export default usePodStepsStates;
