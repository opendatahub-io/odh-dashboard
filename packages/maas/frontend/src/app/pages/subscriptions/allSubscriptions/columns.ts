import { SortableData } from '@odh-dashboard/ui-core';
import { MaaSSubscription } from '~/app/types/subscriptions';
import { normalizePhase } from '~/app/utilities/phaseLabelUtils';

export const subscriptionsColumns: SortableData<MaaSSubscription>[] = [
  {
    label: 'Name',
    field: 'name',
    sortable: (a: MaaSSubscription, b: MaaSSubscription): number =>
      (a.displayName ?? a.name).localeCompare(b.displayName ?? b.name),
  },
  {
    label: 'Status',
    field: 'phase',
    width: 15,
    sortable: (a: MaaSSubscription, b: MaaSSubscription): number =>
      normalizePhase(a.phase).localeCompare(normalizePhase(b.phase)),
  },
  {
    label: 'Groups',
    field: 'owner.groups',
    width: 15,
    sortable: (a: MaaSSubscription, b: MaaSSubscription): number =>
      a.owner.groups.length - b.owner.groups.length,
  },
  {
    label: 'Models',
    field: 'modelRefs',
    width: 15,
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
