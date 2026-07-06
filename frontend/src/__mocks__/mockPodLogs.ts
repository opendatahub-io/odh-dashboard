type MockLogConfigType = {
  namespace: string;
  podName: string;
  containerName: string;
};
export const mockPodLogs = ({
  namespace = 'test-project',
  podName = 'test-pod',
  containerName = 'test-step',
}: MockLogConfigType): string =>
  `sample log for namespace ${namespace}, pod name ${podName} and for step ${containerName} \n sample text`;
