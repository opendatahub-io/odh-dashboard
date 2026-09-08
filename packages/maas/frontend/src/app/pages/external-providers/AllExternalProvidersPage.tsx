import React from 'react';
import { Link, Navigate } from 'react-router-dom';
import { ApplicationsPage } from '@odh-dashboard/ui-core';
import { Breadcrumb, BreadcrumbItem, Stack, StackItem } from '@patternfly/react-core';
import { useExternalModelsContext } from '~/app/context/ExternalModelsContext';
import { useExternalModelsNamespace } from '~/app/hooks/useExternalModelsNamespace';
import NoProjectsPage from '~/app/pages/external-models/NoProjectsPage';
import { deploymentsExternalPath } from '~/app/pages/external-models/const';
import { ExternalProvider } from '~/app/types/external-models';
import MaaSExternalResourcesProjectSelector from '~/app/pages/external-models/MaaSExternalResourcesProjectSelector';
import {
  externalProvidersManagementPath,
  ExternalProvidersFilterDataType,
  ExternalProvidersFilterOptions,
  ExternalProvidersMultiSelectFilterKey,
  initialExternalProvidersFilterData,
} from './const';
import EmptyExternalProvidersPage from './EmptyExternalProvidersPage';
import DeleteExternalProviderModal from './DeleteExternalProviderModal';
import { ExternalProvidersTable } from './ExternalProvidersTable';
import ExternalProvidersToolBar from './ExternalProvidersToolbar';
import { filterExternalProviders, hasActiveExternalProvidersFilters } from './utils';

const AllExternalProvidersPage: React.FC = () => {
  const {
    externalProviders,
    externalProvidersLoaded,
    externalProvidersError,
    refreshExternalProviders,
  } = useExternalModelsContext();

  const [deleteExternalProvider, setDeleteExternalProvider] = React.useState<
    ExternalProvider | undefined
  >(undefined);

  const [filterData, setFilterData] = React.useState<ExternalProvidersFilterDataType>(
    initialExternalProvidersFilterData,
  );

  const onNameChange = React.useCallback(
    (value: string) =>
      setFilterData((prev) => ({ ...prev, [ExternalProvidersFilterOptions.name]: value })),
    [],
  );

  const onMultiSelectToggle = React.useCallback(
    (key: ExternalProvidersMultiSelectFilterKey, value: string) =>
      setFilterData((prev) => ({
        ...prev,
        [key]: prev[key].includes(value)
          ? prev[key].filter((item) => item !== value)
          : [...prev[key], value],
      })),
    [],
  );

  const onMultiSelectClear = React.useCallback(
    (key: ExternalProvidersMultiSelectFilterKey, value: string) =>
      setFilterData((prev) => ({
        ...prev,
        [key]: prev[key].filter((item) => item !== value),
      })),
    [],
  );

  const onClearFilters = React.useCallback(
    () => setFilterData(initialExternalProvidersFilterData),
    [],
  );

  const filteredExternalProviders = React.useMemo(
    () => filterExternalProviders(externalProviders, filterData),
    [externalProviders, filterData],
  );

  const hasActiveFilters = React.useMemo(
    () => hasActiveExternalProvidersFilters(filterData),
    [filterData],
  );

  const { resolvedNamespace, noProjects, namespacesLoaded, namespacesLoadError, shouldRedirect } =
    useExternalModelsNamespace();

  if (shouldRedirect && resolvedNamespace) {
    return <Navigate to={externalProvidersManagementPath(resolvedNamespace)} replace />;
  }

  const pageDescription = (
    <>
      <p>
        An external provider defines the connection details (endpoint, credentials, and
        authentication) for an external LLM service.
      </p>
      <p>
        Manage providers here or create them inline when adding an external model. External models
        reference a provider to route inference requests to the correct endpoint.
      </p>
    </>
  );

  const breadcrumb = (
    <Breadcrumb>
      <BreadcrumbItem>
        <Link to={deploymentsExternalPath(resolvedNamespace || '')}>External models</Link>
      </BreadcrumbItem>
      <BreadcrumbItem isActive>External providers</BreadcrumbItem>
    </Breadcrumb>
  );

  return (
    <>
      <ApplicationsPage
        title="External providers"
        description={pageDescription}
        loaded={
          namespacesLoaded && (noProjects || externalProvidersLoaded || !!externalProvidersError)
        }
        loadError={namespacesLoadError || externalProvidersError}
        errorMessage="Error loading external providers"
        empty={noProjects}
        emptyStatePage={<NoProjectsPage />}
        data-testid="all-external-providers-page"
        breadcrumb={breadcrumb}
        provideChildrenPadding
        removeChildrenTopPadding
      >
        <Stack hasGutter>
          <StackItem>
            <MaaSExternalResourcesProjectSelector
              namespace={resolvedNamespace || ''}
              pathFunction={externalProvidersManagementPath}
            />
          </StackItem>
          <StackItem>
            {!noProjects &&
              resolvedNamespace &&
              externalProvidersLoaded &&
              !externalProvidersError &&
              (externalProviders.length === 0 && !hasActiveFilters ? (
                <EmptyExternalProvidersPage />
              ) : (
                <ExternalProvidersTable
                  externalProviders={filteredExternalProviders}
                  onClearFilters={onClearFilters}
                  toolbarContent={
                    <ExternalProvidersToolBar
                      namespace={resolvedNamespace}
                      filterData={filterData}
                      onNameChange={onNameChange}
                      onMultiSelectToggle={onMultiSelectToggle}
                      onMultiSelectClear={onMultiSelectClear}
                    />
                  }
                  emptyTableView={hasActiveFilters ? undefined : <></>}
                  setDeleteExternalProvider={setDeleteExternalProvider}
                />
              ))}
          </StackItem>
        </Stack>
        {deleteExternalProvider && (
          <DeleteExternalProviderModal
            externalProvider={deleteExternalProvider}
            onClose={(deleted) => {
              setDeleteExternalProvider(undefined);
              if (deleted) {
                refreshExternalProviders();
              }
            }}
          />
        )}
      </ApplicationsPage>
    </>
  );
};

export default AllExternalProvidersPage;
