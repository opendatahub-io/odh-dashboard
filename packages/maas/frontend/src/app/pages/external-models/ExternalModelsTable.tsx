import * as React from 'react';
import { Table, DashboardEmptyTableView } from '@odh-dashboard/ui-core';
import { ExternalModel } from '~/app/types/external-models';
import ExternalModelsTableRow from './ExternalModelsTableRow';
import { externalModelsColumns } from './columns';

type ExternalModelsTableProps = {
  externalModels: ExternalModel[];
  onClearFilters: () => void;
  setDeleteExternalModel: (externalModel: ExternalModel) => void;
  toolbarContent: React.ReactElement;
  emptyTableView: React.ReactNode;
};

export const ExternalModelsTable: React.FC<ExternalModelsTableProps> = ({
  externalModels,
  onClearFilters,
  setDeleteExternalModel,
  toolbarContent,
  emptyTableView,
}): React.ReactNode => (
  <Table
    data-testid="external-models-table"
    data={externalModels}
    columns={externalModelsColumns}
    enablePagination
    disableRowRenderSupport
    isExpandable
    toolbarContent={toolbarContent}
    rowRenderer={(externalModel: ExternalModel) => (
      <ExternalModelsTableRow
        key={externalModel.name}
        externalModel={externalModel}
        setDeleteExternalModel={setDeleteExternalModel}
      />
    )}
    emptyTableView={emptyTableView ?? <DashboardEmptyTableView onClearFilters={onClearFilters} />}
    onClearFilters={onClearFilters}
  />
);
