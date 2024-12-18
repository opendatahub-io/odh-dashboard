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
