import { SortableData } from '@odh-dashboard/internal/components/table/types';
import { Tier } from '~/app/types/tier';

export const tierColumns: SortableData<Tier>[] = [
  {
    field: 'name',
    label: 'Name',
    width: 30,
    sortable: (a: Tier, b: Tier): number => a.displayName?.localeCompare(b.displayName ?? '') ?? 0,
  },
  {
    field: 'level',
    label: 'Level',
    width: 10,
    sortable: (a: Tier, b: Tier): number => (a.level ?? 0) - (b.level ?? 0),
  },
  {
    field: 'groups',
    label: 'Groups',
    width: 15,
    sortable: false,
  },
  {
    field: 'limits',
    label: 'Limits',
    width: 20,
    sortable: false,
  },
  {
    field: 'kebab',
    label: '',
    sortable: false,
  },
];
