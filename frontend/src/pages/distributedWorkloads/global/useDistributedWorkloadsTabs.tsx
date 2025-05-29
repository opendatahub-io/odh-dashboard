import * as React from 'react';
import useDistributedWorkloadsEnabled from '#~/concepts/distributedWorkloads/useDistributedWorkloadsEnabled';
import GlobalDistributedWorkloadsProjectMetricsTab from './projectMetrics/GlobalDistributedWorkloadsProjectMetricsTab';
import GlobalDistributedWorkloadsWorkloadStatusTab from './workloadStatus/GlobalDistributedWorkloadsWorkloadStatusTab';

export enum DistributedWorkloadsTabId {
  PROJECT_METRICS = 'project-metrics',
  WORKLOAD_STATUS = 'workload-status',
}

export type DistributedWorkloadsTabConfig = {
  id: DistributedWorkloadsTabId;
  title: string;
  path: string;
  isAvailable: boolean;
  ContentComponent: React.FC;
};

export const useDistributedWorkloadsTabs = (): DistributedWorkloadsTabConfig[] => {
  const dwAreaIsAvailable = useDistributedWorkloadsEnabled();
  return [
    {
      id: DistributedWorkloadsTabId.WORKLOAD_STATUS,
      title: 'Distributed workload status',
      path: 'workloadStatus',
      isAvailable: dwAreaIsAvailable,
      ContentComponent: GlobalDistributedWorkloadsWorkloadStatusTab,
    },
    {
      id: DistributedWorkloadsTabId.PROJECT_METRICS,
      title: 'Project metrics',
      path: 'projectMetrics',
      isAvailable: dwAreaIsAvailable,
      ContentComponent: GlobalDistributedWorkloadsProjectMetricsTab,
    },
  ];
};
