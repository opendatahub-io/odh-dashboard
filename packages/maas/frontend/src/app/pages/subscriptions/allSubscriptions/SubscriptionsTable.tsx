import * as React from 'react';
import Table from '@odh-dashboard/internal/components/table/Table';
import DashboardEmptyTableView from '@odh-dashboard/internal/concepts/dashboard/DashboardEmptyTableView';
import { MaaSSubscription } from '~/app/types/subscriptions';
import { subscriptionsColumns } from './columns';
import SubscriptionTableRow from './SubscriptionTableRow';

type SubscriptionTableProps = {
  subscriptions: MaaSSubscription[];
  toolbarContent?: React.ReactElement;
  onClearFilters: () => void;
  setDeleteSubscription: (subscription: MaaSSubscription) => void;
};

export const SubscriptionsTable: React.FC<SubscriptionTableProps> = ({
  subscriptions,
  toolbarContent,
  onClearFilters,
  setDeleteSubscription,
}): React.ReactNode => (
  <Table
    data-testid="subscriptions-table"
    data={subscriptions}
    columns={subscriptionsColumns}
    enablePagination
    rowRenderer={(subscription: MaaSSubscription) => (
      <SubscriptionTableRow
        key={subscription.name}
        subscription={subscription}
        setDeleteSubscription={setDeleteSubscription}
      />
    )}
    emptyTableView={<DashboardEmptyTableView onClearFilters={onClearFilters} />}
    toolbarContent={toolbarContent}
    onClearFilters={onClearFilters}
  />
);
