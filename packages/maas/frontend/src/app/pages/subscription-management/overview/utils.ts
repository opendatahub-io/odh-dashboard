import { SortableData } from '@odh-dashboard/ui-core';
import { ModelOverviewItem } from '~/app/types/subscriptions';

export const overviewColumns: SortableData<ModelOverviewItem>[] = [
  {
    label: '',
    field: 'expand',
    sortable: false,
  },
  {
    label: 'Model name',
    field: 'name',
    sortable: (a, b) =>
      (a.modelDetails.displayName ?? a.id).localeCompare(b.modelDetails.displayName ?? b.id),
  },
  {
    label: 'Subscriptions',
    field: 'subscriptions',
    width: 15,
    sortable: (a, b) => a.subscriptions.length - b.subscriptions.length,
  },
  {
    label: 'Authorization policies',
    field: 'authPolicies',
    width: 15,
    sortable: (a, b) => a.authPolicies.length - b.authPolicies.length,
  },
  {
    label: '',
    field: 'kebab',
    sortable: false,
  },
];
