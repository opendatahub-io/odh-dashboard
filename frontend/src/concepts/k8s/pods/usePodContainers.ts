import usePod from '~/concepts/k8s/pods/usePod';
import { PodContainer } from '~/types';

const usePodContainers = (namespace: string, podName: string): PodContainer[] =>
  usePod(namespace, podName)[0]?.spec.containers ?? [];

export default usePodContainers;
