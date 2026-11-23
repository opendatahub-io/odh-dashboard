import * as React from 'react';
import { Table, DashboardEmptyTableView } from '@odh-dashboard/ui-core';
import { MaaSSubscription } from '~/app/types/subscriptions';
import { getSubscriptionsColumns } from './columns';
import SubscriptionTableRow from './SubscriptionTableRow';

type SubscriptionTableProps = {
  subscriptions: MaaSSubscription[];
  toolbarContent?: React.ReactElement;
  onClearFilters: () => void;
  setDeleteSubscription: (subscription: MaaSSubscription) => void;
  returnTo?: string;
  /** Read-only viewers omit the Status column. Defaults to true. */
  showStatus?: boolean;
  /** Read-only viewers omit the kebab (row actions) column. Defaults to true. */
  showActions?: boolean;
  /** Overrides the subscription name link target. Defaults to the governance view page. */
  getSubscriptionDetailUrl?: (name: string) => string;
};

export const SubscriptionsTable: React.FC<SubscriptionTableProps> = ({
  subscriptions,
  toolbarContent,
  onClearFilters,
  setDeleteSubscription,
  returnTo,
  showStatus = true,
  showActions = true,
  getSubscriptionDetailUrl,
}): React.ReactNode => (
  <Table
    data-testid="subscriptions-table"
    data={subscriptions}
    columns={getSubscriptionsColumns({ showStatus })}
    enablePagination
    disableRowRenderSupport
    isExpandable
    rowRenderer={(subscription: MaaSSubscription, rowIndex: number) => (
      <SubscriptionTableRow
        key={subscription.name}
        subscription={subscription}
        rowIndex={rowIndex}
        setDeleteSubscription={setDeleteSubscription}
        returnTo={returnTo}
        showStatus={showStatus}
        showActions={showActions}
        getSubscriptionDetailUrl={getSubscriptionDetailUrl}
      />
    )}
    emptyTableView={<DashboardEmptyTableView onClearFilters={onClearFilters} />}
    toolbarContent={toolbarContent}
    onClearFilters={onClearFilters}
  />
);
