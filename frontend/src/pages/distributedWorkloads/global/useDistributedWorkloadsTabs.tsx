import * as React from 'react';
import useDistributedWorkloadsEnabled from '~/concepts/distributedWorkloads/useDistributedWorkloadsEnabled';
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
  // TODO mturley remove this now that all our tabs here are single project only, or leave in case we add future tabs?
  projectSelectorMode: 'singleProjectOnly' | 'projectOrAll' | null;
  ContentComponent: React.FC;
};

export const useDistributedWorkloadsTabs = (): DistributedWorkloadsTabConfig[] => {
  const dwAreaIsAvailable = useDistributedWorkloadsEnabled();
  return [
    {
      id: DistributedWorkloadsTabId.PROJECT_METRICS,
      title: 'Project metrics',
      path: 'projectMetrics',
      isAvailable: dwAreaIsAvailable,
      projectSelectorMode: 'singleProjectOnly',
      ContentComponent: GlobalDistributedWorkloadsProjectMetricsTab,
    },
    {
      id: DistributedWorkloadsTabId.WORKLOAD_STATUS,
      title: 'Workload status',
      path: 'workloadStatus',
      isAvailable: dwAreaIsAvailable,
      projectSelectorMode: 'singleProjectOnly',
      ContentComponent: GlobalDistributedWorkloadsWorkloadStatusTab,
    },
  ];
};
