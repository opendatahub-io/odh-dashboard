import { SortableData } from '@odh-dashboard/ui-core';
import { MaaSSubscription } from '~/app/types/subscriptions';
import { normalizePhase } from '~/app/utilities/phaseLabelUtils';

export const subscriptionsColumns: SortableData<MaaSSubscription>[] = [
  {
    label: 'Subscription',
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
];

export const GROUP_COLUMN_FIELD = 'owner.groups';
export const MODEL_COLUMN_FIELD = 'modelRefs';

type SubscriptionsColumnsOptions = {
  /** Read-only viewers hide the Status column. Defaults to true. */
  showStatus?: boolean;
};

/**
 * Subscriptions columns for the governance table.
 *
 * Read-only consumers (e.g. the MaaS Portal model access page) omit the Status column.
 */
export const getSubscriptionsColumns = ({
  showStatus = true,
}: SubscriptionsColumnsOptions = {}): SortableData<MaaSSubscription>[] =>
  showStatus ? subscriptionsColumns : subscriptionsColumns.filter((col) => col.field !== 'phase');
