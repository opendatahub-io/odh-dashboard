import * as React from 'react';
import Table from '@odh-dashboard/internal/components/table/Table';
import DashboardEmptyTableView from '@odh-dashboard/internal/concepts/dashboard/DashboardEmptyTableView';
import { MaaSAuthPolicy } from '~/app/types/subscriptions';
import { authPoliciesColumns } from './columns';
import AuthPoliciesTableRow from './AuthPoliciesTableRow';

type AuthPoliciesTableProps = {
  authPolicies: MaaSAuthPolicy[];
  setDeleteAuthPolicy: (authPolicy: MaaSAuthPolicy) => void;
  toolbarContent?: React.ReactElement;
  onClearFilters: () => void;
};

const AuthPoliciesTable: React.FC<AuthPoliciesTableProps> = ({
  authPolicies,
  setDeleteAuthPolicy,
  toolbarContent,
  onClearFilters,
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
      />
    )}
    emptyTableView={<DashboardEmptyTableView onClearFilters={onClearFilters} />}
    toolbarContent={toolbarContent}
    onClearFilters={onClearFilters}
  />
);

export default AuthPoliciesTable;
