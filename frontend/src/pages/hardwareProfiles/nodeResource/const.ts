import { SortableData } from '#~/components/table';
import { Identifier } from '#~/types';

export const HARDWARE_PROFILE_COLUMN_HELP_TOOLTIP = {
  minCount: 'The minimum number of resources that users can define for requests.',
  maxCount: 'The maximum resources that users can request.',
  defaultCount: 'The default request and limit presented to the user.',
};

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
    info: {
      popover: HARDWARE_PROFILE_COLUMN_HELP_TOOLTIP.defaultCount,
    },
  },
  {
    field: 'minCount',
    label: 'Minimum allowed',
    sortable: false,
    info: {
      popover: HARDWARE_PROFILE_COLUMN_HELP_TOOLTIP.minCount,
      popoverProps: {
        showClose: false,
      },
    },
  },
  {
    field: 'maxCount',
    label: 'Maximum allowed',
    sortable: false,
    info: {
      popover: HARDWARE_PROFILE_COLUMN_HELP_TOOLTIP.maxCount,
      popoverProps: {
        showClose: false,
      },
    },
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

export const DEFAULT_ACCELERATOR_SIZE = {
  minCount: 1,
  maxCount: 2,
  defaultCount: 1,
};

export const DEFAULT_MEMORY_SIZE = {
  minCount: '2Gi',
  maxCount: '8Gi',
  defaultCount: '4Gi',
};

export const DEFAULT_CPU_IDENTIFIER = 'cpu';
export const DEFAULT_MEMORY_IDENTIFIER = 'memory';
