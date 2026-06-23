import * as React from 'react';
import { Table, DashboardEmptyTableView } from '@odh-dashboard/ui-core';
import { DashboardConfigContext } from '@odh-dashboard/plugin-core';
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
}): React.ReactNode => {
  const dashboardConfig = React.useContext(DashboardConfigContext);
  const isIARedesign = !!dashboardConfig?.dashboardConfig.maasSettingsIaRedesign;

  return (
    <Table
      data-testid="subscriptions-table"
      data={subscriptions}
      columns={subscriptionsColumns}
      enablePagination
      disableRowRenderSupport
      isExpandable={isIARedesign}
      rowRenderer={(subscription: MaaSSubscription, rowIndex: number) => (
        <SubscriptionTableRow
          key={subscription.name}
          subscription={subscription}
          rowIndex={rowIndex}
          setDeleteSubscription={setDeleteSubscription}
          returnTo={returnTo}
        />
      )}
      emptyTableView={<DashboardEmptyTableView onClearFilters={onClearFilters} />}
      toolbarContent={toolbarContent}
      onClearFilters={onClearFilters}
    />
  );
};
