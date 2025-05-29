import { SupportedArea, useIsAreaAvailable } from '#~/concepts/areas';

const useDistributedWorkloadsEnabled = (): boolean =>
  useIsAreaAvailable(SupportedArea.DISTRIBUTED_WORKLOADS).status;

export default useDistributedWorkloadsEnabled;
