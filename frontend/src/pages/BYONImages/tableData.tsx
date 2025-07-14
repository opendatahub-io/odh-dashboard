import { SortableData } from '#~/components/table';
import { BYONImage } from '#~/types';
import { getEnabledStatus } from './utils';

export const columns: SortableData<BYONImage>[] = [
  {
    field: 'expand',
    label: '',
    sortable: false,
  },
  {
    field: 'name',
    label: 'Name',
    sortable: (a, b) => a.name.localeCompare(b.name),
  },
  {
    field: 'enable',
    label: 'Enable',
    sortable: (a, b) => getEnabledStatus(a) - getEnabledStatus(b),
    info: {
      popover: 'Enabled images are selectable when creating workbenches.',
    },
  },
  {
    field: 'recommendedAccelerators',
    label: 'Recommended accelerators',
    sortable: (a, b) =>
      a.recommendedAcceleratorIdentifiers.length - b.recommendedAcceleratorIdentifiers.length,
    info: {
      popover: 'Accelerators are used to speed up the execution of workbenches.',
    },
    width: 30,
  },
  {
    field: 'recommendedHardwareProfiles',
    label: 'Recommended hardware profiles',
    sortable: (a, b) =>
      a.recommendedAcceleratorIdentifiers.length - b.recommendedAcceleratorIdentifiers.length,
    info: {
      popover: 'Hardware profiles are used to speed up the execution of workbenches.',
    },
    width: 30,
  },
  {
    field: 'provider',
    label: 'Provider',
    sortable: (a, b) => a.provider.localeCompare(b.provider),
  },
  {
    field: 'imported',
    label: 'Imported',
    sortable: (a, b) => new Date(a.imported_time).getTime() - new Date(b.imported_time).getTime(),
  },
  {
    field: 'kebab',
    label: '',
    sortable: false,
  },
];
