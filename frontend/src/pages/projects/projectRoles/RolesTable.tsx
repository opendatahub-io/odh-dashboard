import * as React from 'react';
import {
  Button,
  EmptyState,
  EmptyStateActions,
  EmptyStateBody,
  EmptyStateFooter,
  SearchInput,
  ToolbarItem,
} from '@patternfly/react-core';
import { PlusCircleIcon } from '@patternfly/react-icons';
import { Link } from 'react-router-dom';
import { Table, DashboardEmptyTableView } from '@odh-dashboard/ui-core';
import type { RoleRef } from '#~/concepts/permissions/types';
import RoleDetailsModal from '#~/pages/projects/projectPermissions/roleDetails/RoleDetailsModal';
import type { RoleListRow } from './types';
import { columns } from './columns';
import RolesTableRow from './RolesTableRow';
import PreviewYAMLModal from './PreviewYAMLModal';

type RolesTableProps = {
  rows: RoleListRow[];
  namespace: string;
  searchFilter: string;
  onSearchChange: (value: string) => void;
};

const RolesTable: React.FC<RolesTableProps> = ({
  rows,
  namespace,
  searchFilter,
  onSearchChange,
}) => {
  const [detailsRoleRef, setDetailsRoleRef] = React.useState<RoleRef>();
  const [previewRow, setPreviewRow] = React.useState<RoleListRow>();

  const hasFilters = searchFilter.trim().length > 0;

  const handleClearFilters = () => {
    onSearchChange('');
  };

  const emptyTableView = hasFilters ? (
    <DashboardEmptyTableView onClearFilters={handleClearFilters} />
  ) : undefined;

  const toolbarContent = (
    <>
      <ToolbarItem>
        <SearchInput
          placeholder="Search by name or description"
          value={searchFilter}
          onChange={(_e, value) => onSearchChange(value)}
          onClear={() => onSearchChange('')}
          data-testid="roles-table-search"
          aria-label="Search roles"
        />
      </ToolbarItem>
      <ToolbarItem>
        <Button
          variant="primary"
          component={(props) => <Link {...props} to={`/projects/${namespace}/roles/create`} />}
          data-testid="create-role-button"
        >
          Create custom role
        </Button>
      </ToolbarItem>
    </>
  );

  if (rows.length === 0 && !hasFilters) {
    return (
      <EmptyState
        headingLevel="h2"
        icon={PlusCircleIcon}
        titleText="No custom roles"
        data-testid="no-roles-empty-state"
      >
        <EmptyStateBody>
          Custom roles allow you to define fine-grained permissions for project members.
        </EmptyStateBody>
        <EmptyStateFooter>
          <EmptyStateActions>
            <Button
              variant="primary"
              component={(props) => <Link {...props} to={`/projects/${namespace}/roles/create`} />}
              data-testid="create-role-button"
            >
              Create custom role
            </Button>
          </EmptyStateActions>
        </EmptyStateFooter>
      </EmptyState>
    );
  }

  return (
    <>
      <Table
        aria-label="Roles table"
        data-testid="roles-table"
        variant="compact"
        data={rows}
        columns={columns}
        enablePagination="compact"
        toolbarContent={toolbarContent}
        onClearFilters={hasFilters ? handleClearFilters : undefined}
        emptyTableView={emptyTableView}
        rowRenderer={(row) => (
          <RolesTableRow
            key={row.key}
            row={row}
            onViewDetails={() => setDetailsRoleRef(row.roleRef)}
            onPreviewYAML={() => setPreviewRow(row)}
            onEdit={() => undefined}
            onDuplicate={() => undefined}
          />
        )}
      />
      {detailsRoleRef && (
        <RoleDetailsModal roleRef={detailsRoleRef} onClose={() => setDetailsRoleRef(undefined)} />
      )}
      {previewRow && (
        <PreviewYAMLModal
          roleRef={previewRow.roleRef}
          role={previewRow.role}
          onClose={() => setPreviewRow(undefined)}
        />
      )}
    </>
  );
};

export default RolesTable;
