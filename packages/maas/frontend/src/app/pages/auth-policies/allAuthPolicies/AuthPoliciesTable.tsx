import * as React from 'react';
import { Table, DashboardEmptyTableView } from '@odh-dashboard/ui-core';
import { DashboardConfigContext } from '@odh-dashboard/plugin-core';
import { MaaSAuthPolicy } from '~/app/types/subscriptions';
import { authPoliciesColumns } from './columns';
import AuthPoliciesTableRow from './AuthPoliciesTableRow';

type AuthPoliciesTableProps = {
  authPolicies: MaaSAuthPolicy[];
  setDeleteAuthPolicy: (authPolicy: MaaSAuthPolicy) => void;
  toolbarContent?: React.ReactElement;
  onClearFilters: () => void;
  returnTo?: string;
};

const AuthPoliciesTable: React.FC<AuthPoliciesTableProps> = ({
  authPolicies,
  setDeleteAuthPolicy,
  toolbarContent,
  onClearFilters,
  returnTo,
}) => {
  const dashboardConfig = React.useContext(DashboardConfigContext);
  const isIARedesign = !!dashboardConfig?.dashboardConfig.maasSettingsIaRedesign;

  return (
    <Table
      data-testid="auth-policies-table"
      enablePagination
      disableRowRenderSupport
      isExpandable={isIARedesign}
      data={authPolicies}
      columns={authPoliciesColumns}
      rowRenderer={(authPolicy: MaaSAuthPolicy, rowIndex: number) => (
        <AuthPoliciesTableRow
          key={authPolicy.name}
          authPolicy={authPolicy}
          rowIndex={rowIndex}
          columns={authPoliciesColumns}
          setDeleteAuthPolicy={setDeleteAuthPolicy}
          returnTo={returnTo}
        />
      )}
      emptyTableView={<DashboardEmptyTableView onClearFilters={onClearFilters} />}
      toolbarContent={toolbarContent}
      onClearFilters={onClearFilters}
    />
  );
};

export default AuthPoliciesTable;
