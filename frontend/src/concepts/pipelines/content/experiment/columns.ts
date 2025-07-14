import { SortableData } from '#~/components/table';
import { ExperimentKF } from '#~/concepts/pipelines/kfTypes';

export const experimentSelectorColumns: SortableData<ExperimentKF>[] = [
  {
    label: 'Experiment name',
    field: 'name',
    sortable: (a, b) => a.display_name.localeCompare(b.display_name),
    width: 70,
  },
  {
    label: 'Updated',
    field: 'created_at',
    sortable: (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    width: 30,
  },
];
