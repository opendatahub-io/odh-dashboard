import { SortableData } from '@odh-dashboard/internal/components/table/types';
import { MaaSSubscription } from '~/app/types/subscriptions';

export const subscriptionsColumns: SortableData<MaaSSubscription>[] = [
  {
    label: 'Name',
    field: 'name',
    sortable: (a: MaaSSubscription, b: MaaSSubscription): number => a.name.localeCompare(b.name),
  },
  {
    label: 'Phase',
    field: 'phase',
    width: 10,
    sortable: (a: MaaSSubscription, b: MaaSSubscription): number =>
      (a.phase ?? '').localeCompare(b.phase ?? ''),
  },
  {
    label: 'Groups',
    field: 'owner.groups',
    sortable: (a: MaaSSubscription, b: MaaSSubscription): number =>
      a.owner.groups.length - b.owner.groups.length,
  },
  {
    label: 'Models',
    field: 'modelRefs',
    sortable: (a: MaaSSubscription, b: MaaSSubscription): number =>
      a.modelRefs.length - b.modelRefs.length,
  },
  {
    label: 'Priority',
    field: 'priority',
    width: 10,
    sortable: (a: MaaSSubscription, b: MaaSSubscription): number =>
      (a.priority ?? 0) - (b.priority ?? 0),
  },
];
