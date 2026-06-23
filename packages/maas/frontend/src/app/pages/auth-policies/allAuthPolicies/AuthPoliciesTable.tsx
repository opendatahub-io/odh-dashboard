import * as React from 'react';
import { Table, DashboardEmptyTableView } from '@odh-dashboard/ui-core';
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
}) => (
  <Table
    data-testid="auth-policies-table"
    enablePagination
    data={authPolicies}
    columns={authPoliciesColumns}
    rowRenderer={(authPolicy: MaaSAuthPolicy) => (
      <AuthPoliciesTableRow
        authPolicy={authPolicy}
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

export default AuthPoliciesTable;
