import { SortableData } from '~/components/table';
import { PipelineKind } from '~/k8sTypes';
import { EdgeModelRun } from '~/concepts/edge/types';

export const edgePipelineColumns: SortableData<PipelineKind>[] = [
  {
    field: 'expand',
    label: '',
    sortable: false,
  },
  {
    field: 'name',
    label: 'Pipeline Name',
    sortable: false,
  },
  {
    field: 'lastRunTime',
    label: 'Last run time',
    sortable: false,
  },
  {
    field: 'lastRunStatus',
    label: 'Last run status',
    sortable: false,
  },
  {
    field: 'runs',
    label: 'Runs',
    sortable: false,
  },
  {
    field: 'createRun',
    label: '',
    sortable: false,
  },
];

export const edgeModelRunColumns: SortableData<EdgeModelRun>[] = [
  {
    field: 'run',
    label: 'Run',
    sortable: false,
  },
  {
    field: 'model',
    label: 'Model',
    sortable: false,
  },
  {
    field: 'status',
    label: 'Status',
    sortable: false,
  },
  {
    field: 'created',
    label: 'Created',
    sortable: false,
  },
  {
    field: 'containerImageUrl',
    label: 'Container image URL',
    sortable: false,
  },
];
