import { createElement } from 'react';
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
import { runGroupTablePopoverText } from '#~/pages/pipelines/global/runs/const';

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
    label: 'Run group',
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

const mlflowExperimentColumn = <T>(): SortableData<T> => ({
  label: 'MLflow experiment',
  field: 'mlflow_experiment',
  sortable: false,
  width: 15,
});

// PF wraps string header labels in TableText, which adds a truncation tooltip.
// But this tooltip shows up on hover regardless of whether it's truncated or not. This is a workaround.
// TODO: remove when PF fixes TableText tooltip behaviour
// eslint-disable-next-line @typescript-eslint/consistent-type-assertions
const RUN_GROUP_LABEL = createElement('span', undefined, 'Run group') as unknown as string;

const runGroupColumn = <T>(): SortableData<T> => ({
  label: RUN_GROUP_LABEL,
  field: 'run_group',
  sortable: false,
  width: 15,
  info: {
    popover: runGroupTablePopoverText,
    popoverProps: {
      showClose: false,
    },
  },
});

export const pipelineRunColumns = (isMlflowAvailable?: boolean): SortableData<PipelineRunKF>[] => [
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
  ...(isMlflowAvailable ? [mlflowExperimentColumn<PipelineRunKF>()] : []),
  runGroupColumn<PipelineRunKF>(),
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

export const compareRunColumns = (isMlflowAvailable?: boolean): SortableData<PipelineRunKF>[] => [
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
  ...(isMlflowAvailable ? [mlflowExperimentColumn<PipelineRunKF>()] : []),
  runGroupColumn<PipelineRunKF>(),
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
  metricsColumns: SortableData<PipelineRunKF>[],
  isMlflowAvailable?: boolean,
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
  ...(isMlflowAvailable ? [mlflowExperimentColumn<PipelineRunKF>()] : []),
  runGroupColumn<PipelineRunKF>(),
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
  ...metricsColumns,
  kebabTableColumn(),
];

export const pipelineRecurringRunColumns = (
  isMlflowAvailable?: boolean,
): SortableData<PipelineRecurringRunKF>[] => [
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
  ...(isMlflowAvailable ? [mlflowExperimentColumn<PipelineRecurringRunKF>()] : []),
  runGroupColumn<PipelineRecurringRunKF>(),
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
