import * as React from 'react';
import { PodContainer } from '~/types';
import { usePipelinesAPI } from '~/concepts/pipelines/context';
import usePod from '~/concepts/k8s/pods/usePod';
import { getPodContainers } from '~/concepts/k8s/pods/utils';
import { PodKind } from '~/k8sTypes';

const usePodContainerLogState = (
  podName: string,
): {
  pod: PodKind | null;
  podLoaded: boolean;
  podError: Error | undefined;
  podContainers: PodContainer[];
  selectedContainer: PodContainer | null;
  setSelectedContainer: (podContainer: PodContainer | null) => void;
} => {
  const { namespace } = usePipelinesAPI();
  const [pod, podLoaded, podError] = usePod(namespace, podName);
  const { containers: podContainers } = getPodContainers(pod);
  const [selectedContainer, setSelectedContainer] = React.useState<PodContainer | null>(null);

  React.useEffect(() => {
    // Pod name changed value -- our selected container isn't part of this pod
    setSelectedContainer(null);
  }, [podName]);

  const firstPodContainer = podContainers[0];
  React.useEffect(() => {
    if (!selectedContainer && firstPodContainer) {
      setSelectedContainer(firstPodContainer);
    }
  }, [firstPodContainer, selectedContainer]);

  return { pod, podLoaded, podError, podContainers, selectedContainer, setSelectedContainer };
};

export default usePodContainerLogState;
