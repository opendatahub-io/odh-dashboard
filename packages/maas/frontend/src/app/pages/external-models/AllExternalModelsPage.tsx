import React from 'react';
import { Navigate, useLocation, useParams } from 'react-router-dom';
import ApplicationsPage from '@odh-dashboard/internal/pages/ApplicationsPage';
import { PageSection } from '@patternfly/react-core';
import { useNamespaceSelector } from 'mod-arch-core';
import { useListExternalModels } from '~/app/hooks/useListExternalModels';
import { ExternalModel } from '~/app/types/external-models';
import { URL_PREFIX } from '~/app/utilities/const';
import EmptyExternalModelsPage from './EmptyExternalModelsPage';
import NoProjectsPage from './NoProjectsPage';
import {
  ExternalModelsFilterDataType,
  ExternalModelsFilterOptions,
  initialExternalModelsFilterData,
} from './const';
import DeleteExternalModelModal from './DeleteExternalModelModal';
import { ExternalModelsTable } from './ExternalModelsTable';
import ExternalModelsToolBar from './ExternalModelsToolBar';
import ExternalModelsProjectSelector from './ExternalModelsProjectSelector';

const DEPLOYMENTS_EXTERNAL_BASE = '/ai-hub/models/deployments/external';

const AllExternalModelsPage: React.FC = () => {
  const { pathname } = useLocation();
  const { namespace: urlNamespace } = useParams<{ namespace?: string }>();
  const { namespaces, namespacesLoaded, preferredNamespace, namespacesLoadError } =
    useNamespaceSelector();

  const getRedirectPath = React.useCallback(
    (namespace: string) =>
      pathname.startsWith(DEPLOYMENTS_EXTERNAL_BASE) || pathname.includes('/deployments/external')
        ? `${DEPLOYMENTS_EXTERNAL_BASE}/${namespace}`
        : `${URL_PREFIX}/external-models/${namespace}`,
    [pathname],
  );

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

  const [deleteExternalModel, setDeleteExternalModel] = React.useState<ExternalModel | undefined>(
    undefined,
  );

  const noProjects = namespacesLoaded && namespaces.length === 0;
  const validUrlNamespace =
    urlNamespace && namespaces.some((ns) => ns.name === urlNamespace) ? urlNamespace : undefined;
  const fallbackNamespace = preferredNamespace?.name ?? namespaces[0]?.name;
  const resolvedNamespace = validUrlNamespace ?? fallbackNamespace;

  const [externalModels, loaded, error, refresh] = useListExternalModels(resolvedNamespace || '');

  const filteredExternalModels = React.useMemo(() => {
    const keyword = filterData[ExternalModelsFilterOptions.keyword]?.toLowerCase();
    return keyword
      ? externalModels.filter(
          (model) =>
            model.name.toLowerCase().includes(keyword) ||
            model.displayName?.toLowerCase().includes(keyword) ||
            model.description?.toLowerCase().includes(keyword),
        )
      : externalModels;
  }, [externalModels, filterData]);

  if (namespacesLoaded && !noProjects && resolvedNamespace && resolvedNamespace !== urlNamespace) {
    return <Navigate to={getRedirectPath(resolvedNamespace)} replace />;
  }

  const toolBar = <ExternalModelsToolBar filterData={filterData} onFilterUpdate={onFilterUpdate} />;

  return (
    <ApplicationsPage
      loaded={namespacesLoaded && (noProjects || loaded || !!error)}
      loadError={namespacesLoadError || error}
      errorMessage="Error loading external models"
      empty={noProjects}
      emptyStatePage={<NoProjectsPage />}
      noHeader
      noTitle
      removeChildrenTopPadding
      data-testid="all-external-models-page"
    >
      {!noProjects && resolvedNamespace && loaded && !error && (
        <PageSection isFilled hasBodyWrapper={false} data-testid="all-endpoints-page-section">
          <ExternalModelsProjectSelector
            namespace={resolvedNamespace}
            getRedirectPath={getRedirectPath}
          />
          <ExternalModelsTable
            externalModels={filteredExternalModels}
            onClearFilters={onClearFilters}
            setDeleteExternalModel={setDeleteExternalModel}
            toolbarContent={toolBar}
            emptyTableView={
              filterData[ExternalModelsFilterOptions.keyword] ? undefined : (
                <EmptyExternalModelsPage />
              )
            }
          />
        </PageSection>
      )}
      {deleteExternalModel && (
        <DeleteExternalModelModal
          externalModel={deleteExternalModel}
          onClose={(deleted) => {
            setDeleteExternalModel(undefined);
            if (deleted) {
              refresh();
            }
          }}
        />
      )}
    </ApplicationsPage>
  );
};

export default AllExternalModelsPage;
