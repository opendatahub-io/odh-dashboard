import {
  SortableData,
  checkboxTableColumn,
  expandTableColumn,
  kebabTableColumn,
} from '~/components/table';
import {
  PipelineVersionKFv2,
  PipelineKFv2,
  PipelineRecurringRunKFv2,
  PipelineRunKFv2,
  ExperimentKFv2,
} from '~/concepts/pipelines/kfTypes';

export const pipelineColumns: SortableData<PipelineKFv2>[] = [
  expandTableColumn(),
  checkboxTableColumn(),
  {
    label: 'Pipeline',
    field: 'name',
    sortable: (a, b) => a.display_name.localeCompare(b.display_name),
    width: 40,
  },
  {
    label: 'Total versions',
    field: 'versions',
    sortable: false,
    width: 20,
  },
  {
    label: 'Created',
    field: 'created_at',
    sortable: (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    width: 20,
  },
  {
    label: 'Updated',
    field: 'updated',
    sortable: false,
    width: 20,
  },
  kebabTableColumn(),
];

export const pipelineVersionColumns: SortableData<PipelineVersionKFv2>[] = [
  checkboxTableColumn(),
  {
    label: 'Pipeline version',
    field: 'name',
    sortable: (a, b) => a.display_name.localeCompare(b.display_name),
    width: 60,
  },
  {
    label: 'Created',
    field: 'created_at',
    sortable: (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    width: 20,
  },
  kebabTableColumn(),
];

export const experimentColumns: SortableData<ExperimentKFv2>[] = [
  checkboxTableColumn(),
  {
    label: 'Experiment',
    field: 'display_name',
    sortable: true,
  },
  {
    label: 'Description',
    field: 'description',
    sortable: true,
  },
  {
    label: 'Created',
    field: 'created_at',
    sortable: true,
  },
  {
    label: 'Last run started',
    field: 'last_run_created_at',
    sortable: true,
  },
  {
    label: 'Last 5 runs',
    field: 'last_5_runs',
    sortable: false,
  },
  kebabTableColumn(),
];

export const pipelineRunColumns: SortableData<PipelineRunKFv2>[] = [
  checkboxTableColumn(),
  {
    label: 'Run',
    field: 'name',
    sortable: true,
  },
  {
    label: 'Experiment',
    field: 'experiment',
    sortable: false,
    width: 15,
  },
  {
    label: 'Pipeline version',
    field: 'pipeline_version',
    sortable: false,
    width: 15,
  },
  {
    label: 'Started',
    field: 'created_at',
    sortable: true,
    width: 15,
  },
  {
    label: 'Duration',
    field: 'duration',
    sortable: false,
    width: 15,
  },
  {
    label: 'Status',
    field: 'status',
    sortable: true,
    width: 10,
  },
  kebabTableColumn(),
];

export function getExperimentRunColumns(
  metricsColumnNames: string[],
): SortableData<PipelineRunKFv2>[] {
  return [
    { ...checkboxTableColumn(), isStickyColumn: true, stickyMinWidth: '45px' },
    {
      label: 'Run',
      field: 'name',
      sortable: true,
      isStickyColumn: true,
      hasRightBorder: true,
      stickyMinWidth: '200px',
      stickyLeftOffset: '45px',
      width: 20,
    },
    {
      label: 'Pipeline version',
      field: 'pipeline_version',
      sortable: false,
      width: 15,
    },
    {
      label: 'Started',
      field: 'created_at',
      sortable: true,
      width: 15,
    },
    {
      label: 'Duration',
      field: 'duration',
      sortable: false,
      width: 15,
    },
    {
      label: 'Status',
      field: 'status',
      sortable: true,
      width: 10,
    },
    ...metricsColumnNames.map((metricName: string) => ({
      label: metricName,
      field: metricName,
      sortable: false,
    })),
    kebabTableColumn(),
  ];
}

export const pipelineRecurringRunColumns: SortableData<PipelineRecurringRunKFv2>[] = [
  checkboxTableColumn(),
  {
    label: 'Schedule',
    field: 'name',
    sortable: true,
  },
  {
    label: 'Experiment',
    field: 'experiment',
    sortable: false,
    width: 15,
  },
  {
    label: 'Pipeline version',
    field: 'pipeline_version',
    sortable: false,
    width: 15,
  },
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
  {
    label: 'Created',
    field: 'created_at',
    sortable: true,
    width: 10,
  },
  kebabTableColumn(),
];
