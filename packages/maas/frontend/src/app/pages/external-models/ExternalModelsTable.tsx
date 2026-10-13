import * as React from 'react';
import { Alert } from '@patternfly/react-core';
import { Table, DashboardEmptyTableView } from '@odh-dashboard/ui-core';
import { ExternalModel } from '~/app/types/external-models';
import ExternalModelsTableRow from './ExternalModelsTableRow';
import { externalModelsColumns } from './columns';
import { isProviderRefMissing } from './utils';

type ExternalModelsTableProps = {
  externalModels: ExternalModel[];
  onClearFilters: () => void;
  toolbarContent: React.ReactElement;
  emptyTableView: React.ReactNode;
  setDeleteExternalModel: (externalModel: ExternalModel) => void;
};

export const ExternalModelsTable: React.FC<ExternalModelsTableProps> = ({
  externalModels,
  onClearFilters,
  toolbarContent,
  emptyTableView,
  setDeleteExternalModel,
}): React.ReactNode => {
  const hasDeletedProviderRefs = externalModels.some((model) =>
    model.providerRefs.some(isProviderRefMissing),
  );

  return (
    <Table
      data-testid="external-models-table"
      data={externalModels}
      columns={externalModelsColumns}
      enablePagination
      disableRowRenderSupport
      isExpandable
      toolbarContent={toolbarContent}
      alertContent={
        hasDeletedProviderRefs ? (
          <Alert
            isInline
            variant="danger"
            title="Referenced providers deleted"
            data-testid="deleted-provider-refs-alert"
          >
            <p>
              One or more providers referenced by models in this project have been deleted. Impacted
              models are indicated with a red alert icon. View a model&apos;s details to remove
              broken references.
            </p>
          </Alert>
        ) : undefined
      }
      rowRenderer={(externalModel: ExternalModel, rowIndex: number) => (
        <ExternalModelsTableRow
          key={externalModel.name}
          externalModel={externalModel}
          rowIndex={rowIndex}
          setDeleteExternalModel={setDeleteExternalModel}
        />
      )}
      emptyTableView={emptyTableView ?? <DashboardEmptyTableView onClearFilters={onClearFilters} />}
      onClearFilters={onClearFilters}
    />
  );
};
