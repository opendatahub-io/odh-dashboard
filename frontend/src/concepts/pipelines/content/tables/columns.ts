import { SortableData } from '~/components/table/useTableColumnSort';
import {
  PipelineKF,
  PipelineRunJobKF,
  PipelineRunKF,
  PipelineCoreResourceKF,
} from '~/concepts/pipelines/kfTypes';
import {
  getPipelineCoreResourceExperimentName,
  getPipelineCoreResourcePipelineName,
  getRunDuration,
  getScheduledStateWeight,
  getStatusWeight,
} from '~/concepts/pipelines/content/tables/utils';
import { checkboxTableColumn, expandTableColumn, kebabTableColumn } from '~/components/table/const';

export const pipelineColumns: SortableData<PipelineKF>[] = [
  expandTableColumn(),
  {
    label: 'Pipeline name',
    field: 'pipeline',
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
    field: 'created',
    sortable: (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  },
  kebabTableColumn(),
];

/* Shared Run Columns */
const nameColumn: SortableData<PipelineCoreResourceKF> = {
  label: 'Name',
  field: 'runName',
  sortable: (a, b) => a.name.localeCompare(b.name),
  width: 20,
};
const experimentColumn: SortableData<PipelineCoreResourceKF> = {
  label: 'Experiment',
  field: 'experiment',
  sortable: (a, b) =>
    getPipelineCoreResourceExperimentName(a).localeCompare(
      getPipelineCoreResourceExperimentName(b),
    ),
  width: 10,
};
const pipelineColumn: SortableData<PipelineCoreResourceKF> = {
  label: 'Pipeline',
  field: 'pipeline',
  sortable: (a, b) =>
    getPipelineCoreResourcePipelineName(a)?.localeCompare(getPipelineCoreResourcePipelineName(b)),
  width: 15,
};

/* Run Columns */
const startedRunColumn: SortableData<PipelineRunKF> = {
  label: 'Started',
  field: 'started',
  sortable: (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
};
const durationRunColumn: SortableData<PipelineRunKF> = {
  label: 'Duration',
  field: 'duration',
  sortable: (a, b) => getRunDuration(a) - getRunDuration(b),
};
const statusRunColumn: SortableData<PipelineRunKF> = {
  label: 'Status',
  field: 'status',
  sortable: (a, b) => getStatusWeight(a) - getStatusWeight(b),
};

/* Run Job Columns */
const triggerRunJobColumn: SortableData<PipelineRunJobKF> = {
  label: 'Trigger',
  field: 'trigger',
  sortable: (a, b) => {
    if (a.trigger.periodic_schedule && b.trigger.periodic_schedule) {
      return (
        parseInt(a.trigger.periodic_schedule.interval_second) -
        parseInt(b.trigger.periodic_schedule.interval_second)
      );
    }
    if (a.trigger.cron_schedule && b.trigger.cron_schedule) {
      return 0;
    }

    // Different types, arbitrarily sort one above the other
    return a.trigger.periodic_schedule ? -1 : 1;
  },
  width: 15,
};
const scheduledRunJobColumn: SortableData<PipelineRunJobKF> = {
  label: 'Scheduled',
  field: 'scheduled',
  sortable: (a, b) => getScheduledStateWeight(a) - getScheduledStateWeight(b),
  width: 15,
};
const statusRunJobColumn: SortableData<PipelineRunJobKF> = {
  label: 'Status',
  field: 'status',
  sortable: (a, b) => Number(a.enabled ?? false) - Number(b.enabled ?? false),
  width: 10,
};

export const pipelineRunColumns: SortableData<PipelineRunKF>[] = [
  checkboxTableColumn(),
  nameColumn,
  experimentColumn,
  pipelineColumn,
  startedRunColumn,
  durationRunColumn,
  statusRunColumn,
  kebabTableColumn(),
];

export const pipelineRunExperimentColumns: SortableData<PipelineRunKF>[] = [
  expandTableColumn(),
  nameColumn,
  pipelineColumn,
  startedRunColumn,
  durationRunColumn,
  statusRunColumn,
  kebabTableColumn(),
];

export const pipelineRunJobColumns: SortableData<PipelineRunJobKF>[] = [
  checkboxTableColumn(),
  nameColumn,
  experimentColumn,
  pipelineColumn,
  triggerRunJobColumn,
  scheduledRunJobColumn,
  statusRunJobColumn,
  kebabTableColumn(),
];
