import { SortableData } from '~/components/table/useTableColumnSort';
import {
  PipelineKF,
  PipelineRunJobKF,
  PipelineRunKF,
  PipelineCoreResourceKF,
} from '~/concepts/pipelines/kfTypes';
import { checkboxTableColumn, expandTableColumn, kebabTableColumn } from '~/components/table/const';

export const pipelineColumns: SortableData<PipelineKF>[] = [
  expandTableColumn(),
  {
    label: 'Pipeline name',
    field: 'name',
    sortable: (a, b) => a.name.localeCompare(b.name),
    width: 25,
  },
  {
    label: 'Last run',
    field: 'lastRun',
    sortable: false,
  },
  {
    label: 'Last run status',
    field: 'lastRunStatus',
    sortable: false,
  },
  {
    label: 'Last run time',
    field: 'lastRunTime',
    sortable: false,
  },
  {
    label: 'Created',
    field: 'created_at',
    sortable: (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  },
  kebabTableColumn(),
];

const sharedRunLikeColumns: SortableData<PipelineCoreResourceKF>[] = [
  checkboxTableColumn(),
  {
    label: 'Name',
    field: 'name',
    sortable: true,
    width: 20,
  },
  {
    label: 'Experiment',
    field: 'experiment',
    sortable: false,
    width: 10,
  },
  {
    label: 'Pipeline',
    field: 'pipeline',
    sortable: false,
    width: 15,
  },
];

export const pipelineRunColumns: SortableData<PipelineRunKF>[] = [
  ...sharedRunLikeColumns,
  {
    label: 'Started',
    field: 'created_at',
    sortable: true,
  },
  {
    label: 'Duration',
    field: 'duration',
    sortable: false,
  },
  {
    label: 'Status',
    field: 'status',
    sortable: true,
  },
  kebabTableColumn(),
];

export const pipelineRunJobColumns: SortableData<PipelineRunJobKF>[] = [
  ...sharedRunLikeColumns,
  {
    label: 'Trigger',
    field: 'trigger',
    sortable: false,
    width: 15,
  },
  {
    label: 'Scheduled',
    field: 'scheduled',
    sortable: false,
    width: 15,
  },
  {
    label: 'Status',
    field: 'status',
    sortable: false,
    width: 10,
  },
  kebabTableColumn(),
];
