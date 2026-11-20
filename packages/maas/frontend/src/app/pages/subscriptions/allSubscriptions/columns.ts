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
  {
    label: 'Priority',
    field: 'inferencePriority',
    width: 10,
    sortable: (a: MaaSSubscription, b: MaaSSubscription): number =>
      (a.inferencePriority ?? 0) - (b.inferencePriority ?? 0),
  },
];

export const GROUP_COLUMN_FIELD = 'owner.groups';
export const MODEL_COLUMN_FIELD = 'modelRefs';

type SubscriptionsColumnsOptions = {
  /** Read-only viewers hide the Status column. Defaults to true. */
  showStatus?: boolean;
  /** Viewers without the inference priority feature flag hide the Priority column. Defaults to false. */
  showPriority?: boolean;
};

/**
 * Subscriptions columns for the governance table.
 *
 * Read-only consumers (e.g. the MaaS Portal model access page) omit the Status column.
 * The Priority column is omitted when the inference priority feature flag is off.
 */
export const getSubscriptionsColumns = ({
  showStatus = true,
  showPriority = false,
}: SubscriptionsColumnsOptions = {}): SortableData<MaaSSubscription>[] => {
  let columns = subscriptionsColumns;
  if (!showStatus) {
    columns = columns.filter((col) => col.field !== 'phase');
  }
  if (!showPriority) {
    columns = columns.filter((col) => col.field !== 'inferencePriority');
  }
  return columns;
};
