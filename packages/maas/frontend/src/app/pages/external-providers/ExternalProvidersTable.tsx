import * as React from 'react';
import { Table, DashboardEmptyTableView } from '@odh-dashboard/ui-core';
import { ExternalProvider } from '~/app/types/external-models';
import ExternalProvidersTableRow from './ExternalProvidersTableRow';
import { externalProvidersColumns } from './columns';

type ExternalProvidersTableProps = {
  externalProviders: ExternalProvider[];
  onClearFilters: () => void;
  toolbarContent: React.ReactElement;
  emptyTableView: React.ReactNode;
  setEditExternalProvider: (externalProvider: ExternalProvider) => void;
  setDeleteExternalProvider: (externalProvider: ExternalProvider) => void;
};

export const ExternalProvidersTable: React.FC<ExternalProvidersTableProps> = ({
  externalProviders,
  onClearFilters,
  toolbarContent,
  emptyTableView,
  setEditExternalProvider,
  setDeleteExternalProvider,
}): React.ReactNode => (
  <Table
    data-testid="external-providers-table"
    data={externalProviders}
    columns={externalProvidersColumns}
    enablePagination
    disableRowRenderSupport
    toolbarContent={toolbarContent}
    rowRenderer={(externalProvider: ExternalProvider) => (
      <ExternalProvidersTableRow
        key={externalProvider.name}
        externalProvider={externalProvider}
        setEditExternalProvider={setEditExternalProvider}
        setDeleteExternalProvider={setDeleteExternalProvider}
      />
    )}
    emptyTableView={emptyTableView ?? <DashboardEmptyTableView onClearFilters={onClearFilters} />}
    onClearFilters={onClearFilters}
  />
);
