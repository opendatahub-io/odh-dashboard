import { SupportedArea, useIsAreaAvailable } from '#~/concepts/areas';

// Hook to check if distributed workloads feature is enabled
const useDistributedWorkloadsEnabled = (): boolean =>
  useIsAreaAvailable(SupportedArea.DISTRIBUTED_WORKLOADS).status;

export default useDistributedWorkloadsEnabled;
