import * as React from 'react';
import { Content, ContentVariants } from '@patternfly/react-core';
import { SortableData } from '@odh-dashboard/internal/components/table/index';
import { getUnifiedJobStatusSync } from './utils';
import { UnifiedJobKind, isRayJob } from '../../types';
import { KUEUE_QUEUE_LABEL } from '../../const';

export const getColumns = (nodeCountMap: Map<string, number>): SortableData<UnifiedJobKind>[] => [
  {
    field: 'name',
    label: 'Name',
    width: 15,
    sortable: (a: UnifiedJobKind, b: UnifiedJobKind): number =>
      (a.metadata.annotations?.['opendatahub.io/display-name'] || a.metadata.name).localeCompare(
        b.metadata.annotations?.['opendatahub.io/display-name'] || b.metadata.name,
      ),
  },
  {
    field: 'project',
    label: 'Project',
    width: 10,
    sortable: (a: UnifiedJobKind, b: UnifiedJobKind): number =>
      a.metadata.namespace.localeCompare(b.metadata.namespace),
  },
  {
    field: 'nodes',
    label: 'Nodes',
    width: 10,
    sortable: (a: UnifiedJobKind, b: UnifiedJobKind): number => {
      const aId = a.metadata.uid || a.metadata.name;
      const bId = b.metadata.uid || b.metadata.name;
      return (nodeCountMap.get(aId) ?? 0) - (nodeCountMap.get(bId) ?? 0);
    },
    info: {
      popoverProps: { hasAutoWidth: true },
      popover: 'The total number of nodes assigned to a job.',
    },
  },
  {
    field: 'clusterQueue',
    label: 'Cluster queue',
    width: 10,
    sortable: (a: UnifiedJobKind, b: UnifiedJobKind): number => {
      const aQueue = a.metadata.labels?.[KUEUE_QUEUE_LABEL] || '';
      const bQueue = b.metadata.labels?.[KUEUE_QUEUE_LABEL] || '';
      return aQueue.localeCompare(bQueue);
    },
  },
  {
    field: 'rayCluster',
    label: 'Ray cluster',
    width: 10,
    sortable: (a: UnifiedJobKind, b: UnifiedJobKind): number => {
      const aCluster = isRayJob(a)
        ? a.status?.rayClusterName || a.spec.clusterSelector?.['ray.io/cluster'] || ''
        : '';
      const bCluster = isRayJob(b)
        ? b.status?.rayClusterName || b.spec.clusterSelector?.['ray.io/cluster'] || ''
        : '';
      return aCluster.localeCompare(bCluster);
    },
  },
  {
    field: 'type',
    label: 'Type',
    width: 10,
    sortable: (a: UnifiedJobKind, b: UnifiedJobKind): number =>
      (a.kind || '').localeCompare(b.kind || ''),
    info: {
      popoverProps: { hasAutoWidth: true },
      popover: (
        <Content component={ContentVariants.ul}>
          <Content component={ContentVariants.li}>
            <b>TrainJobs</b> are training workloads managed by the Trainer component.
          </Content>
          <Content component={ContentVariants.li}>
            <b>RayJobs</b> are computing workloads that use the Ray framework.
          </Content>
        </Content>
      ),
    },
  },
  {
    field: 'created',
    label: 'Created',
    width: 10,
    sortable: (a: UnifiedJobKind, b: UnifiedJobKind): number => {
      const first = a.metadata.creationTimestamp;
      const second = b.metadata.creationTimestamp;
      return new Date(first ?? 0).getTime() - new Date(second ?? 0).getTime();
    },
  },
  {
    field: 'status',
    label: 'Status',
    width: 10,
    sortable: (a: UnifiedJobKind, b: UnifiedJobKind): number => {
      const aState = getUnifiedJobStatusSync(a);
      const bState = getUnifiedJobStatusSync(b);
      return aState.localeCompare(bState);
    },
  },
  {
    field: 'pauseResume',
    label: '',
    sortable: false,
  },
  {
    field: 'kebab',
    label: '',
    sortable: false,
  },
];

export enum JobsToolbarFilterOptions {
  name = 'Name',
  clusterQueue = 'Cluster queue',
  status = 'Status',
}

export const JobsFilterOptions = {
  [JobsToolbarFilterOptions.name]: 'Name',
  [JobsToolbarFilterOptions.clusterQueue]: 'Cluster queue',
  [JobsToolbarFilterOptions.status]: 'Status',
};

export type JobsFilterDataType = Record<JobsToolbarFilterOptions, string | undefined>;

export const initialJobsFilterData: JobsFilterDataType = {
  [JobsToolbarFilterOptions.name]: '',
  [JobsToolbarFilterOptions.clusterQueue]: '',
  [JobsToolbarFilterOptions.status]: '',
};
