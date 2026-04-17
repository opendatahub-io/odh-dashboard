import { SortableData } from '@odh-dashboard/internal/components/table/types';
import { MaaSAuthPolicy } from '~/app/types/subscriptions';

export const authPoliciesColumns: SortableData<MaaSAuthPolicy>[] = [
  {
    label: 'Name',
    field: 'name',
    sortable: (a: MaaSAuthPolicy, b: MaaSAuthPolicy): number => a.name.localeCompare(b.name),
  },
  {
    label: 'Phase',
    field: 'phase',
    width: 10,
    sortable: (a: MaaSAuthPolicy, b: MaaSAuthPolicy): number =>
      (a.phase ?? '').localeCompare(b.phase ?? ''),
  },
  {
    label: 'Groups',
    field: 'subjects.groups',
    sortable: (a: MaaSAuthPolicy, b: MaaSAuthPolicy): number =>
      (a.subjects.groups?.length ?? 0) - (b.subjects.groups?.length ?? 0),
  },
  {
    label: 'Models',
    field: 'modelRefs',
    sortable: (a: MaaSAuthPolicy, b: MaaSAuthPolicy): number =>
      a.modelRefs.length - b.modelRefs.length,
  },
];
