import { RegistryExperimentRun } from '#~/concepts/modelRegistry/types';
import { checkboxTableColumn, SortableData } from '#~/components/table';

export const experimentRunsColumns: SortableData<RegistryExperimentRun>[] = [
  checkboxTableColumn(),
  {
    field: 'name',
    label: 'Run name',
    sortable: true,
  },
  {
    field: 'owner',
    label: 'Owner',
    sortable: true,
  },
  {
    field: 'status',
    label: 'Status',
    sortable: true,
  },
  {
    field: 'state',
    label: 'State',
    sortable: true,
  },
  {
    field: 'startTimeSinceEpoch',
    label: 'Started',
    sortable: true,
  },
  {
    field: 'endTimeSinceEpoch',
    label: 'Ended',
    sortable: true,
  },
  {
    field: 'kebab',
    label: '',
    sortable: false,
  },
];
