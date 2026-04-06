import { SortableData } from '@odh-dashboard/internal/components/table/types';
import { MaaSSubscription } from '~/app/types/subscriptions';

export const subscriptionsColumns: SortableData<MaaSSubscription>[] = [
  {
    label: 'Name',
    field: 'name',
    sortable: (a: MaaSSubscription, b: MaaSSubscription): number => a.name.localeCompare(b.name),
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
];
