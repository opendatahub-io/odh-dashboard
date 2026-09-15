import * as React from 'react';
import { Table, DashboardEmptyTableView } from '@odh-dashboard/ui-core';
import { ExternalModel, ExternalProvider } from '~/app/types/external-models';
import ExternalModelsTableRow from './ExternalModelsTableRow';
import { externalModelsColumns } from './columns';

type ExternalModelsTableProps = {
  externalModels: ExternalModel[];
  onClearFilters: () => void;
  toolbarContent: React.ReactElement;
  emptyTableView: React.ReactNode;
  setDeleteExternalModel: (externalModel: ExternalModel) => void;
  setDeleteExternalProvider: (externalProvider: ExternalProvider) => void;
};

export const ExternalModelsTable: React.FC<ExternalModelsTableProps> = ({
  externalModels,
  onClearFilters,
  toolbarContent,
  emptyTableView,
  setDeleteExternalModel,
  setDeleteExternalProvider,
}): React.ReactNode => (
  <Table
    data-testid="external-models-table"
    data={externalModels}
    columns={externalModelsColumns}
    enablePagination
    disableRowRenderSupport
    isExpandable
    toolbarContent={toolbarContent}
    rowRenderer={(externalModel: ExternalModel, rowIndex: number) => (
      <ExternalModelsTableRow
        key={externalModel.name}
        externalModel={externalModel}
        rowIndex={rowIndex}
        setDeleteExternalModel={setDeleteExternalModel}
        setDeleteExternalProvider={setDeleteExternalProvider}
      />
    )}
    emptyTableView={emptyTableView ?? <DashboardEmptyTableView onClearFilters={onClearFilters} />}
    onClearFilters={onClearFilters}
  />
);
