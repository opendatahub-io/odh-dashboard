import { SortableData } from '@odh-dashboard/internal/components/table/types';
import { MaaSAuthPolicy, MaaSSubscription } from '~/app/types/subscriptions';

export type ModelOverviewRow = {
  name: string;
  namespace: string;
  displayName?: string;
  description?: string;
  subscriptions: MaaSSubscription[];
  policies: MaaSAuthPolicy[];
};

export const overviewColumns: SortableData<ModelOverviewRow>[] = [
  {
    label: '',
    field: 'expand',
    sortable: false,
  },
  {
    label: 'Model name',
    field: 'name',
    sortable: (a, b) => (a.displayName ?? a.name).localeCompare(b.displayName ?? b.name),
  },
  {
    label: 'Subscriptions',
    field: 'subscriptions',
    width: 15,
    sortable: (a, b) => a.subscriptions.length - b.subscriptions.length,
  },
  {
    label: 'Authorization policies',
    field: 'policies',
    width: 15,
    sortable: (a, b) => a.policies.length - b.policies.length,
  },
  {
    label: '',
    field: 'kebab',
    sortable: false,
  },
];
