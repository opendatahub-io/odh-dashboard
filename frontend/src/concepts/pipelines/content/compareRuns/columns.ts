import { checkboxTableColumn, SortableData } from '~/components/table';
import { PipelineRunKFv2 } from '~/concepts/pipelines/kfTypes';

export const compareRunColumns: SortableData<PipelineRunKFv2>[] = [
  checkboxTableColumn(),
  {
    label: 'Run',
    field: 'name',
    sortable: (a, b) => a.display_name.localeCompare(b.display_name),
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
    sortable: (a, b) => a.state.localeCompare(b.state),
    width: 10,
  },
];
