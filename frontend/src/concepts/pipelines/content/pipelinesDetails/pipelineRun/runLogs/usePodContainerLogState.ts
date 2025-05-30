import * as React from 'react';
import { PodContainer } from '#~/types';
import { usePipelinesAPI } from '#~/concepts/pipelines/context';
import usePod from '#~/concepts/k8s/pods/usePod';
import { getPodContainers } from '#~/concepts/k8s/pods/utils';
import { PodContainerStatus, PodKind } from '#~/k8sTypes';
import {
  checkPodContainersStatus,
  PodStatus,
} from '#~/concepts/pipelines/content/pipelinesDetails/pipelineRun/utils';

const usePodContainerLogState = (
  podName: string,
): {
  pod: PodKind | null;
  podLoaded: boolean;
  podError: Error | undefined;
  podStatus: PodStatus | null;
  podContainers: PodContainer[];
  podContainerStatuses: PodContainerStatus[];
  selectedContainer: PodContainer | null;
  defaultContainerName: string | undefined;
  setSelectedContainer: (podContainer: PodContainer | null) => void;
} => {
  const { namespace } = usePipelinesAPI();
  const [pod, podLoaded, podError] = usePod(namespace, podName);
  const { containers: podContainers, containerStatuses: podContainerStatuses } =
    getPodContainers(pod);
  const [selectedContainer, setSelectedContainer] = React.useState<PodContainer | null>(null);
  const defaultContainerName =
    pod?.metadata.annotations?.['kubectl.kubernetes.io/default-container'];

  React.useEffect(() => {
    // Pod name changed value -- our selected container isn't part of this pod
    setSelectedContainer(null);
  }, [podName]);

  const firstPodContainer =
    podContainers.length > 0
      ? podContainers.find((podContainer) => podContainer.name === defaultContainerName) ??
        podContainers[0]
      : undefined;
  React.useEffect(() => {
    if (!selectedContainer && firstPodContainer) {
      setSelectedContainer(firstPodContainer);
    }
  }, [firstPodContainer, selectedContainer]);
  const podStatus = checkPodContainersStatus(pod, selectedContainer);

  return {
    pod,
    podLoaded,
    podStatus,
    podError,
    podContainers,
    podContainerStatuses,
    selectedContainer,
    defaultContainerName,
    setSelectedContainer,
  };
};

export default usePodContainerLogState;
