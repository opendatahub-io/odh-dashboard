import React from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { ApplicationsPage } from '@odh-dashboard/ui-core';
import { useNamespaceSelector } from 'mod-arch-core';
import { useListExternalModels } from '~/app/hooks/useListExternalModels';
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

const AllExternalModelsPage: React.FC = () => {
  const { namespace: urlNamespace } = useParams<{ namespace?: string }>();
  const { namespaces, namespacesLoaded, preferredNamespace, namespacesLoadError } =
    useNamespaceSelector();

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

  const noProjects = namespacesLoaded && namespaces.length === 0;
  const validUrlNamespace =
    urlNamespace && namespaces.some((ns) => ns.name === urlNamespace) ? urlNamespace : undefined;
  const fallbackNamespace = preferredNamespace?.name ?? namespaces[0]?.name;
  const resolvedNamespace = validUrlNamespace ?? fallbackNamespace;

  const [externalModels, loaded, error] = useListExternalModels(resolvedNamespace || '');

  const filteredExternalModels = React.useMemo(
    () =>
      filterExternalModelsByKeyword(
        externalModels,
        filterData[ExternalModelsFilterOptions.keyword],
      ),
    [externalModels, filterData],
  );

  if (namespacesLoaded && !noProjects && resolvedNamespace && resolvedNamespace !== urlNamespace) {
    return <Navigate to={deploymentsExternalPath(resolvedNamespace)} replace />;
  }

  return (
    <>
      {resolvedNamespace && <ExternalModelsProjectSelector namespace={resolvedNamespace} />}
      <ApplicationsPage
        loaded={namespacesLoaded && (noProjects || loaded || !!error)}
        loadError={namespacesLoadError || error}
        errorMessage="Error loading external models"
        empty={noProjects}
        emptyStatePage={<NoProjectsPage />}
        noHeader
        noTitle
        removeChildrenTopPadding
        provideChildrenPadding
        data-testid="all-external-models-page"
      >
        {!noProjects && resolvedNamespace && loaded && !error && (
          <ExternalModelsTable
            externalModels={filteredExternalModels}
            onClearFilters={onClearFilters}
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
      </ApplicationsPage>
    </>
  );
};

export default AllExternalModelsPage;
