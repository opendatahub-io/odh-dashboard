import { SortableData } from 'mod-arch-shared';
import { RegistryExperiment } from '#~/concepts/modelRegistry/types.ts';

export const experimentsColumns: SortableData<RegistryExperiment>[] = [
  {
    label: 'Experiment name',
    field: 'name',
    sortable: true,
    width: 25,
  },
  {
    label: 'Description',
    field: 'description',
    sortable: false,
    width: 30,
  },
  {
    label: 'Owner',
    field: 'owner',
    sortable: true,
    width: 15,
  },
  {
    label: 'State',
    field: 'state',
    sortable: true,
    width: 10,
  },
  {
    label: 'Created',
    field: 'createTimeSinceEpoch',
    sortable: true,
    width: 15,
  },
  {
    label: 'Kebab',
    field: 'kebab',
    sortable: false,
    width: 10,
  },
];
