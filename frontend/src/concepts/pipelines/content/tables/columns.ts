import {
  SortableData,
  checkboxTableColumn,
  expandTableColumn,
  kebabTableColumn,
} from '#~/components/table';
import {
  PipelineVersionKF,
  PipelineKF,
  PipelineRecurringRunKF,
  PipelineRunKF,
  ExperimentKF,
} from '#~/concepts/pipelines/kfTypes';

export const pipelineColumns: SortableData<PipelineKF>[] = [
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

export const pipelineVersionColumns: SortableData<PipelineVersionKF>[] = [
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
  {
    label: '',
    sortable: false,
    field: 'view_runs',
    width: 20,
  },
  kebabTableColumn(),
];

export const experimentColumns: SortableData<ExperimentKF>[] = [
  checkboxTableColumn(),
  {
    label: 'Experiment',
    field: 'display_name',
    sortable: true,
    width: 40,
  },
  {
    label: 'Created',
    field: 'created_at',
    sortable: true,
    width: 20,
  },
  {
    label: 'Last run started',
    field: 'last_run_created_at',
    sortable: true,
    width: 20,
  },
  {
    label: 'Last 5 runs',
    field: 'last_5_runs',
    sortable: false,
    width: 20,
  },
  kebabTableColumn(),
];

export const pipelineRunColumns: SortableData<PipelineRunKF>[] = [
  checkboxTableColumn(),
  {
    label: 'Run',
    field: 'name',
    sortable: true,
  },
  {
    label: 'Pipeline version',
    field: 'pipeline_version',
    sortable: false,
    width: 15,
  },
  {
    label: 'Experiment',
    field: 'experiment',
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

export const compareRunColumns: SortableData<PipelineRunKF>[] = [
  checkboxTableColumn(),
  {
    label: 'Run',
    field: 'name',
    sortable: (a, b) => a.display_name.localeCompare(b.display_name),
  },
  {
    label: 'Pipeline version',
    field: 'pipeline_version',
    sortable: false,
    width: 15,
  },
  {
    label: 'Experiment',
    field: 'experiment',
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
    sortable: (a, b) => a.state.localeCompare(b.state),
    width: 10,
  },
];

export const getPipelineRunColumns = (
  metricsColumnNames: string[],
): SortableData<PipelineRunKF>[] => [
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
    label: 'Experiment',
    field: 'experiment',
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

export const pipelineRecurringRunColumns: SortableData<PipelineRecurringRunKF>[] = [
  checkboxTableColumn(),
  {
    label: 'Schedule',
    field: 'name',
    sortable: true,
  },
  {
    label: 'Pipeline version',
    field: 'pipeline_version',
    sortable: false,
    width: 15,
  },
  {
    label: 'Experiment',
    field: 'experiment',
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
