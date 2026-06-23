import * as React from 'react';
import { Table, DashboardEmptyTableView } from '@odh-dashboard/ui-core';
import { MaaSSubscription } from '~/app/types/subscriptions';
import { subscriptionsColumns } from './columns';
import SubscriptionTableRow from './SubscriptionTableRow';

type SubscriptionTableProps = {
  subscriptions: MaaSSubscription[];
  toolbarContent?: React.ReactElement;
  onClearFilters: () => void;
  setDeleteSubscription: (subscription: MaaSSubscription) => void;
  returnTo?: string;
};

export const SubscriptionsTable: React.FC<SubscriptionTableProps> = ({
  subscriptions,
  toolbarContent,
  onClearFilters,
  setDeleteSubscription,
  returnTo,
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
        returnTo={returnTo}
      />
    )}
    emptyTableView={<DashboardEmptyTableView onClearFilters={onClearFilters} />}
    toolbarContent={toolbarContent}
    onClearFilters={onClearFilters}
  />
);
