import * as React from 'react';
import { PodContainer } from '~/types';
import { usePipelinesAPI } from '~/concepts/pipelines/context';
import usePodContainers from './usePodContainers';

const usePodContainerState = (
  podName: string,
): {
  podContainers: PodContainer[];
  selectedContainer: PodContainer | null;
  setSelectedContainer: (podContainer: PodContainer | null) => void;
} => {
  const { namespace } = usePipelinesAPI();
  const podContainers = usePodContainers(namespace, podName);
  const [selectedContainer, setSelectedContainer] = React.useState<PodContainer | null>(null);

  const firstPodContainer = podContainers[0];
  React.useEffect(() => {
    if (!selectedContainer && firstPodContainer) {
      setSelectedContainer(firstPodContainer);
    }
  }, [firstPodContainer, selectedContainer]);

  return { podContainers, selectedContainer, setSelectedContainer };
};

export default usePodContainerState;
