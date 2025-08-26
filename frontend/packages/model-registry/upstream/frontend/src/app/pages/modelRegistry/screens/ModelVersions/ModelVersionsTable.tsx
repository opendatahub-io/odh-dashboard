import * as React from 'react';
import { DashboardEmptyTableView, Table } from 'mod-arch-shared';
import { ModelVersion, RegisteredModel } from '~/app/types';
import OdhModelVersionsTable from '~/odh/components/OdhModelVersionsTable';
import { mvColumns } from './ModelVersionsTableColumns';

type ModelVersionsTableProps = {
  clearFilters: () => void;
  modelVersions: ModelVersion[];
  isArchiveModel?: boolean;
  refresh: () => void;
  rm: RegisteredModel;
} & Partial<Pick<React.ComponentProps<typeof Table>, 'toolbarContent'>>;

const ModelVersionsTable: React.FC<ModelVersionsTableProps> = ({
  clearFilters,
  modelVersions,
  toolbarContent,
  isArchiveModel,
  refresh,
  rm,
}) => (
  <OdhModelVersionsTable
    data-testid="model-versions-table"
    data={modelVersions}
    columns={mvColumns}
    toolbarContent={toolbarContent}
    defaultSortColumn={3}
    enablePagination
    onClearFilters={clearFilters}
    emptyTableView={<DashboardEmptyTableView onClearFilters={clearFilters} />}
    isArchiveModel={isArchiveModel}
    refresh={refresh}
    rm={rm}
  />
);

export default ModelVersionsTable;
