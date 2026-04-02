import { SortableData } from '@odh-dashboard/internal/components/table/types';
import { MaaSAuthPolicy } from '~/app/types/subscriptions';

export const authPoliciesColumns: SortableData<MaaSAuthPolicy>[] = [
  {
    label: 'Name',
    field: 'name',
    sortable: (a: MaaSAuthPolicy, b: MaaSAuthPolicy): number => a.name.localeCompare(b.name),
  },
  {
    label: 'Groups',
    field: 'subjects.groups',
    sortable: (a: MaaSAuthPolicy, b: MaaSAuthPolicy): number =>
      a.subjects.groups.length - b.subjects.groups.length,
  },
  {
    label: 'Models',
    field: 'modelRefs',
    sortable: (a: MaaSAuthPolicy, b: MaaSAuthPolicy): number =>
      a.modelRefs.length - b.modelRefs.length,
  },
];
