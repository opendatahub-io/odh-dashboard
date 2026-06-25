import { SupportedArea, useIsAreaAvailable } from '@odh-dashboard/plugin-core/areas';

const useDistributedWorkloadsEnabled = (): boolean =>
  useIsAreaAvailable(SupportedArea.DISTRIBUTED_WORKLOADS).status;

export default useDistributedWorkloadsEnabled;
