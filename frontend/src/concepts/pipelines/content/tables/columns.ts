import { SortableData } from '~/components/table/useTableColumnSort';
import {
  PipelineKF,
  PipelineRunJobKF,
  PipelineRunKF,
  PipelineRunLikeKF,
} from '~/concepts/pipelines/kfTypes';
import {
  getPipelineRunJobStartTime,
  getPipelineRunLikeExperimentName,
  getPipelineRunLikePipelineName,
} from '~/concepts/pipelines/content/tables/utils';
import { checkboxTableColumn } from '~/components/table/const';

export const pipelineColumns: SortableData<PipelineKF>[] = [
  {
    field: 'expand',
    label: '',
    sortable: false,
  },
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
    sortable: (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  },
  {
    label: '',
    field: 'actions',
    sortable: false,
  },
];

const sharedPipelineRunLikeColumns: SortableData<PipelineRunLikeKF>[] = [
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
      getPipelineRunLikeExperimentName(a).localeCompare(getPipelineRunLikeExperimentName(b)),
    width: 10,
  },
  {
    label: 'Pipeline',
    field: 'pipeline',
    sortable: (a, b) =>
      getPipelineRunLikePipelineName(a)?.localeCompare(getPipelineRunLikePipelineName(b)),
    width: 15,
  },
];

export const pipelineRunColumns: SortableData<PipelineRunKF>[] = [
  ...sharedPipelineRunLikeColumns,
  {
    label: 'Started',
    field: 'started',
    sortable: (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  },
  {
    label: 'Duration',
    field: 'duration',
    sortable: false,
  },
  {
    label: 'Status',
    field: 'status',
    sortable: false,
  },
  {
    label: '',
    field: 'kebab',
    sortable: false,
  },
];

export const pipelineRunJobColumns: SortableData<PipelineRunJobKF>[] = [
  ...sharedPipelineRunLikeColumns,
  {
    label: 'Trigger',
    field: 'trigger',
    sortable: (a, b) => {
      if (a.trigger.periodic_schedule && b.trigger.periodic_schedule) {
        return (
          parseInt(b.trigger.periodic_schedule.interval_second) -
          parseInt(a.trigger.periodic_schedule.interval_second)
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
    sortable: (a, b) => {
      const aTime = getPipelineRunJobStartTime(a)?.getTime() || 0;
      const bTime = getPipelineRunJobStartTime(b)?.getTime() || 0;

      return bTime - aTime;
    },
    width: 15,
  },
  {
    label: 'Status',
    field: 'status',
    sortable: (a, b) => Number(b.enabled ?? false) - Number(a.enabled ?? false),
    width: 10,
  },
  {
    label: '',
    field: 'kebab',
    sortable: false,
  },
];
