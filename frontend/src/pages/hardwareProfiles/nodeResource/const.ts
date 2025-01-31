import { SortableData } from '~/components/table';
import { Identifier } from '~/types';

export const nodeResourceColumns: SortableData<Identifier>[] = [
  {
    field: 'resourceLabel',
    label: 'Resource label',
    sortable: false,
  },
  {
    field: 'identifier',
    label: 'Resource identifier',
    sortable: false,
  },
  {
    field: 'resourceType',
    label: 'Resource type',
    sortable: false,
  },
  {
    field: 'defaultCount',
    label: 'Default',
    sortable: false,
  },
  {
    field: 'minCount',
    label: 'Minimum allowed',
    sortable: false,
  },
  {
    field: 'minCount',
    label: 'Maximum allowed',
    sortable: false,
  },
  {
    field: 'kebab',
    label: '',
    sortable: false,
  },
];

export const EMPTY_IDENTIFIER: Identifier = {
  displayName: '',
  identifier: '',
  minCount: 1,
  maxCount: 1,
  defaultCount: 1,
};

export const DEFAULT_CPU_SIZE = {
  minCount: 1,
  maxCount: 4,
  defaultCount: 2,
};

export const DEFAULT_MEMORY_SIZE = {
  minCount: '2Gi',
  maxCount: '8Gi',
  defaultCount: '4Gi',
};

export const DEFAULT_CPU_IDENTIFIER = 'cpu';
export const DEFAULT_MEMORY_IDENTIFIER = 'memory';
export const HARDWARE_PROFILES_DEFAULT_WARNING_MESSAGE =
  'Select the restore button to restore the Default profile to its initial state.';
export const HARDWARE_PROFILES_MISSING_CPU_MEMORY_MESSAGE =
  'Omitting CPU or Memory resources is not recommended.';
