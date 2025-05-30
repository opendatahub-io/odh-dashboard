import { SortableData } from '#~/components/table';
import { PipelineKF, PipelineVersionKF } from '#~/concepts/pipelines/kfTypes';

export const pipelineSelectorColumns: SortableData<PipelineKF>[] = [
  {
    label: 'Pipeline name',
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

export const pipelineVersionSelectorColumns: SortableData<PipelineVersionKF>[] = [
  {
    label: 'Pipeline version',
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
