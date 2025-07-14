import * as React from 'react';
import { Table } from '#~/components/table';
import { ModelVersion, RegisteredModel } from '#~/concepts/modelRegistry/types';
import DashboardEmptyTableView from '#~/concepts/dashboard/DashboardEmptyTableView';
import ModelVersionsTableRow from '#~/pages/modelRegistry/screens/ModelVersions/ModelVersionsTableRow';
import { mvColumns } from '#~/pages/modelRegistry/screens/ModelVersions/ModelVersionsTableColumns';

type ModelVersionsArchiveTableProps = {
  clearFilters: () => void;
  modelVersions: ModelVersion[];
  registeredModel: RegisteredModel;
  refresh: () => void;
} & Partial<Pick<React.ComponentProps<typeof Table>, 'toolbarContent'>>;

const ModelVersionsArchiveTable: React.FC<ModelVersionsArchiveTableProps> = ({
  clearFilters,
  modelVersions,
  registeredModel,
  toolbarContent,
  refresh,
}) => (
  <Table
    data-testid="model-versions-archive-table"
    data={modelVersions}
    columns={mvColumns}
    toolbarContent={toolbarContent}
    enablePagination
    onClearFilters={clearFilters}
    emptyTableView={<DashboardEmptyTableView onClearFilters={clearFilters} />}
    defaultSortColumn={1}
    rowRenderer={(mv) => (
      <ModelVersionsTableRow
        key={mv.name}
        modelVersion={mv}
        registeredModel={registeredModel}
        isArchiveRow
        refresh={refresh}
      />
    )}
  />
);

export default ModelVersionsArchiveTable;
