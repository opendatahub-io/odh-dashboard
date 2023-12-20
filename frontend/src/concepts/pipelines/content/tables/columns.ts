import {
  SortableData,
  checkboxTableColumn,
  expandTableColumn,
  kebabTableColumn,
} from '~/components/table';
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

const sharedRunLikeColumns: SortableData<PipelineCoreResourceKF>[] = [
  checkboxTableColumn(),
  {
    label: 'Name',
    field: 'runName',
    sortable: (a, b) => a.name.localeCompare(b.name),
    width: 20,
  },
  {
    label: 'Experiment',
    field: 'experiment',
    sortable: (a, b) =>
      getPipelineCoreResourceExperimentName(a).localeCompare(
        getPipelineCoreResourceExperimentName(b),
      ),
    width: 10,
  },
  {
    label: 'Pipeline',
    field: 'pipeline',
    sortable: (a, b) =>
      getPipelineCoreResourcePipelineName(a).localeCompare(getPipelineCoreResourcePipelineName(b)),
    width: 15,
  },
];

export const pipelineRunColumns: SortableData<PipelineRunKF>[] = [
  ...sharedRunLikeColumns,
  {
    label: 'Started',
    field: 'started',
    sortable: (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  },
  {
    label: 'Duration',
    field: 'duration',
    sortable: (a, b) => getRunDuration(a) - getRunDuration(b),
  },
  {
    label: 'Status',
    field: 'status',
    sortable: (a, b) => getStatusWeight(a) - getStatusWeight(b),
  },
  kebabTableColumn(),
];

export const pipelineRunJobColumns: SortableData<PipelineRunJobKF>[] = [
  ...sharedRunLikeColumns,
  {
    label: 'Trigger',
    field: 'trigger',
    sortable: (a: PipelineRunJobKF, b: PipelineRunJobKF): number => {
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
  },
  {
    label: 'Scheduled',
    field: 'scheduled',
    sortable: (a, b) => getScheduledStateWeight(a) - getScheduledStateWeight(b),
    width: 15,
  },
  {
    label: 'Status',
    field: 'status',
    sortable: (a, b) => Number(a.enabled ?? false) - Number(b.enabled ?? false),
    width: 10,
  },
  kebabTableColumn(),
];
