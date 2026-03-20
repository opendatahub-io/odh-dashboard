import { SortableData } from '#~/components/table';
import { MlflowExperiment } from './types';
import { EXPERIMENT_NAME_COLUMN_WIDTH, EXPERIMENT_UPDATED_COLUMN_WIDTH } from './const';

export const mlflowExperimentColumns: SortableData<MlflowExperiment>[] = [
  {
    label: 'Experiment name',
    field: 'name',
    sortable: (a, b) => a.name.localeCompare(b.name),
    width: EXPERIMENT_NAME_COLUMN_WIDTH,
  },
  {
    label: 'Updated',
    field: 'lastUpdateTime',
    sortable: (a, b) =>
      new Date(a.lastUpdateTime ?? 0).getTime() - new Date(b.lastUpdateTime ?? 0).getTime(),
    width: EXPERIMENT_UPDATED_COLUMN_WIDTH,
  },
];
