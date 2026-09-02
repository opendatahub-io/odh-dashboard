import React from 'react';
import { Navigate } from 'react-router-dom';
import { ApplicationsPage } from '@odh-dashboard/ui-core';
import { ExternalModel } from '~/app/types/external-models';
import { useExternalModelsContext } from '~/app/context/ExternalModelsContext';
import { useExternalModelsNamespace } from '~/app/hooks/useExternalModelsNamespace';
import EmptyExternalModelsPage from './EmptyExternalModelsPage';
import NoProjectsPage from './NoProjectsPage';
import {
  ExternalModelsFilterDataType,
  ExternalModelsFilterOptions,
  initialExternalModelsFilterData,
  deploymentsExternalPath,
} from './const';
import { ExternalModelsTable } from './ExternalModelsTable';
import ExternalModelsToolBar from './ExternalModelsToolBar';
import ExternalModelsProjectSelector from './ExternalModelsProjectSelector';
import { filterExternalModelsByKeyword } from './utils';
import DeleteExternalModelModal from './DeleteExternalModelModal';

const AllExternalModelsPage: React.FC = () => {
  const [filterData, setFilterData] = React.useState<ExternalModelsFilterDataType>(
    initialExternalModelsFilterData,
  );

  const onFilterUpdate = React.useCallback(
    (key: string, value?: string | { label: string; value: string }) =>
      setFilterData((prev) => ({ ...prev, [key]: value })),
    [],
  );

  const onClearFilters = React.useCallback(
    () => setFilterData(initialExternalModelsFilterData),
    [],
  );

  const { externalModels, externalModelsLoaded, externalModelsError, refreshExternalModels } =
    useExternalModelsContext();

  const [deleteExternalModel, setDeleteExternalModel] = React.useState<ExternalModel | undefined>(
    undefined,
  );

  const filteredExternalModels = React.useMemo(
    () =>
      filterExternalModelsByKeyword(
        externalModels,
        filterData[ExternalModelsFilterOptions.keyword],
      ),
    [externalModels, filterData],
  );

  const { resolvedNamespace, noProjects, namespacesLoaded, namespacesLoadError, shouldRedirect } =
    useExternalModelsNamespace();
  if (shouldRedirect && resolvedNamespace) {
    return <Navigate to={deploymentsExternalPath(resolvedNamespace)} replace />;
  }

  return (
    <>
      {resolvedNamespace && <ExternalModelsProjectSelector namespace={resolvedNamespace} />}
      <ApplicationsPage
        loaded={namespacesLoaded && (noProjects || externalModelsLoaded || !!externalModelsError)}
        loadError={namespacesLoadError || externalModelsError}
        errorMessage="Error loading external models"
        empty={noProjects}
        emptyStatePage={<NoProjectsPage />}
        noHeader
        noTitle
        removeChildrenTopPadding
        provideChildrenPadding
        data-testid="all-external-models-page"
      >
        {!noProjects && resolvedNamespace && externalModelsLoaded && !externalModelsError && (
          <ExternalModelsTable
            externalModels={filteredExternalModels}
            onClearFilters={onClearFilters}
            setDeleteExternalModel={setDeleteExternalModel}
            toolbarContent={
              <ExternalModelsToolBar filterData={filterData} onFilterUpdate={onFilterUpdate} />
            }
            emptyTableView={
              filterData[ExternalModelsFilterOptions.keyword] ? undefined : (
                <EmptyExternalModelsPage />
              )
            }
          />
        )}
        {deleteExternalModel && (
          <DeleteExternalModelModal
            externalModel={deleteExternalModel}
            onClose={(deleted) => {
              setDeleteExternalModel(undefined);
              if (deleted) {
                refreshExternalModels();
              }
            }}
          />
        )}
      </ApplicationsPage>
    </>
  );
};

export default AllExternalModelsPage;
