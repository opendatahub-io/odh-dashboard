import * as React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import ApplicationsPage from '@odh-dashboard/internal/pages/ApplicationsPage';
import { getGenericErrorCode } from '@odh-dashboard/internal/api/errorUtils';
import { ProjectIconWithSize } from '@odh-dashboard/internal/concepts/projects/ProjectIconWithSize';
import ProjectNavigatorLink from '@odh-dashboard/internal/concepts/projects/ProjectNavigatorLink';
import { IconSize } from '@odh-dashboard/internal/types';
import {
  Content,
  EmptyState,
  EmptyStateBody,
  EmptyStateVariant,
  Flex,
  FlexItem,
  Spinner,
} from '@patternfly/react-core';
import { BanIcon, CubesIcon } from '@patternfly/react-icons';
import { useNamespaceSelector } from 'mod-arch-core';
import AgentOpsProjectSelector from '~/app/components/AgentOpsProjectSelector';
import { useListAgentRuntimes } from '~/app/hooks/useListAgentRuntimes';
import { agentOpsDeploymentsRoute } from '~/app/utilities/routes';
import AgentDeploymentsEmptyState from './AgentDeploymentsEmptyState';
import AgentRuntimesTable from './agentRuntimes/AgentRuntimesTable';
import AgentRuntimesToolbar from './agentRuntimes/AgentRuntimesToolbar';

const AgentDeploymentListPage: React.FC = () => {
  const { namespace } = useParams<{ namespace: string }>();
  const navigate = useNavigate();
  const { namespaces, namespacesLoaded, preferredNamespace } = useNamespaceSelector();

  const {
    runtimes,
    continueToken,
    page,
    pageSize,
    setPage,
    setPageSize,
    loaded,
    error: loadError,
  } = useListAgentRuntimes(namespace);

  const safeRuntimes = React.useMemo(
    () =>
      runtimes.filter(
        (runtime) =>
          typeof runtime.name === 'string' &&
          runtime.name !== '' &&
          typeof runtime.namespace === 'string' &&
          runtime.namespace !== '' &&
          typeof runtime.status === 'string',
      ),
    [runtimes],
  );

  const safeNamespaces = React.useMemo(
    () =>
      namespaces.filter(
        (ns): ns is { name: string } => typeof ns.name === 'string' && ns.name.length > 0,
      ),
    [namespaces],
  );

  // When landing on /deployments with no namespace selected, redirect to the dashboard's
  // active project (preferred namespace) or the first accessible project.
  React.useEffect(() => {
    if (!namespace && namespacesLoaded && safeNamespaces.length > 0) {
      const validPreferredNamespace = preferredNamespace
        ? safeNamespaces.find((n) => n.name === preferredNamespace.name)
        : undefined;
      const redirectNamespace = validPreferredNamespace ?? safeNamespaces[0];
      navigate(agentOpsDeploymentsRoute(redirectNamespace.name), { replace: true });
    }
  }, [namespace, namespacesLoaded, safeNamespaces, preferredNamespace, navigate]);

  const [filterText, setFilterText] = React.useState('');
  const clearFilters = React.useCallback(() => setFilterText(''), []);

  const filteredRuntimes = React.useMemo(() => {
    if (!filterText) {
      return safeRuntimes;
    }
    const lower = filterText.toLowerCase();
    return safeRuntimes.filter((runtime) => runtime.name.toLowerCase().includes(lower));
  }, [safeRuntimes, filterText]);

  const noProjectSelected = !namespace;
  const isAccessDenied = !!loadError && getGenericErrorCode(loadError) === 403;
  const isEmpty = !noProjectSelected && loaded && !loadError && safeRuntimes.length === 0;

  const headerContent = (
    <Flex alignItems={{ default: 'alignItemsCenter' }} gap={{ default: 'gapSm' }}>
      <ProjectIconWithSize size={IconSize.LG} />
      <FlexItem>
        <Content component="p">Project</Content>
      </FlexItem>
      <FlexItem data-testid="agent-ops-project-selector">
        <AgentOpsProjectSelector namespace={namespace} getRedirectPath={agentOpsDeploymentsRoute} />
      </FlexItem>
      {namespace && (
        <FlexItem>
          <ProjectNavigatorLink namespace={{ name: namespace, displayName: namespace }} />
        </FlexItem>
      )}
    </Flex>
  );

  const accessDeniedState = (
    <EmptyState
      headingLevel="h2"
      icon={BanIcon}
      titleText="Access permissions needed"
      variant={EmptyStateVariant.lg}
      data-testid="agent-deployments-access-denied"
    >
      <EmptyStateBody>You do not have permission to view agent deployments.</EmptyStateBody>
    </EmptyState>
  );

  const tableContent = () => {
    if (!loaded) {
      return <Spinner aria-label="Loading agent deployments" />;
    }

    if (isAccessDenied) {
      return accessDeniedState;
    }

    return (
      <AgentRuntimesTable
        runtimes={filteredRuntimes}
        loaded={loaded}
        continueToken={continueToken}
        page={page}
        pageSize={pageSize}
        isFiltered={!!filterText}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
        onClearFilters={clearFilters}
        toolbarContent={
          <AgentRuntimesToolbar filterText={filterText} onFilterChange={setFilterText} />
        }
      />
    );
  };

  return (
    <ApplicationsPage
      noTitle // rendered inside a TabRoutePage which provides the title and tabs
      description="View and manage agent deployments across your fleet."
      headerContent={headerContent}
      loadError={noProjectSelected || isAccessDenied ? undefined : loadError}
      loaded={noProjectSelected ? namespacesLoaded : loaded}
      empty={noProjectSelected || (isEmpty && !isAccessDenied)}
      emptyStatePage={
        noProjectSelected ? (
          <EmptyState
            headingLevel="h2"
            icon={CubesIcon}
            titleText="Select a project"
            variant={EmptyStateVariant.lg}
            data-testid="agent-deployments-select-project"
          >
            <EmptyStateBody>Select a project to view agent deployments.</EmptyStateBody>
          </EmptyState>
        ) : (
          <AgentDeploymentsEmptyState />
        )
      }
      provideChildrenPadding
    >
      {tableContent()}
    </ApplicationsPage>
  );
};

export default AgentDeploymentListPage;
