import * as React from 'react';
import { useParams } from 'react-router-dom';
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
import { useAgentOpsDiscoveryMode } from '~/app/hooks/useAgentOpsDiscoveryMode';
import { useAgentOpsProjectNamespaces } from '~/app/hooks/useAgentOpsProjectNamespaces';
import AgentOpsProjectSelector from '~/app/components/AgentOpsProjectSelector';
import { useNavigateToDeployAgentWizard } from '~/app/deployWizard/useNavigateToDeployAgentWizard';
import { useListAgentRuntimes } from '~/app/hooks/useListAgentRuntimes';
import { agentOpsDeploymentsRoute } from '~/app/utilities/routes';
import {
  filterAgentRuntimes,
  hasActiveAgentRuntimesFilters,
} from '~/app/utilities/filterAgentRuntimes';
import AgentDeploymentsEmptyState from './AgentDeploymentsEmptyState';
import AgentRuntimesTable from './agentRuntimes/AgentRuntimesTable';
import AgentRuntimesToolbar from './agentRuntimes/AgentRuntimesToolbar';
import {
  AgentRuntimeStatusFilterOption,
  AgentRuntimesFilterOption,
  emptyAgentRuntimesFilterData,
} from './agentRuntimes/const';

const AgentDeploymentListPage: React.FC = () => {
  const { namespace } = useParams<{ namespace: string }>();
  const navigateToDeployAgentWizard = useNavigateToDeployAgentWizard();
  const discoveryMode = useAgentOpsDiscoveryMode();
  const { projectNamespaces, isLoading: projectsLoading } = useAgentOpsProjectNamespaces();

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

  const projectDisplayNames = React.useMemo(
    () =>
      Object.fromEntries(
        projectNamespaces.map((ns) => [ns.name, ns.displayName ?? ns.name] as const),
      ),
    [projectNamespaces],
  );

  const [filterData, setFilterData] = React.useState(emptyAgentRuntimesFilterData);

  const onFilterUpdate = React.useCallback(
    (key: AgentRuntimesFilterOption, value?: string | AgentRuntimeStatusFilterOption) => {
      setFilterData((prev) => {
        if (typeof value === 'string') {
          return { ...prev, [key]: value || undefined };
        }
        if (value?.value) {
          return { ...prev, [key]: value };
        }
        return { ...prev, [key]: undefined };
      });
    },
    [],
  );

  const clearFilters = React.useCallback(() => {
    setFilterData(emptyAgentRuntimesFilterData);
  }, []);

  const filteredRuntimes = React.useMemo(
    () => filterAgentRuntimes(safeRuntimes, filterData, projectDisplayNames),
    [safeRuntimes, filterData, projectDisplayNames],
  );

  const isFiltered = hasActiveAgentRuntimesFilters(filterData);

  const noProjectSelected = !namespace;
  const isAccessDenied = !!loadError && getGenericErrorCode(loadError) === 403;
  const isEmpty = !noProjectSelected && loaded && !loadError && safeRuntimes.length === 0;

  const headerContent = (
    <Flex alignItems={{ default: 'alignItemsCenter' }} gap={{ default: 'gapSm' }}>
      <ProjectIconWithSize size={IconSize.LG} />
      <FlexItem>
        <Content component="p">Project</Content>
      </FlexItem>
      <FlexItem>
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
        isFiltered={isFiltered}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
        onClearFilters={clearFilters}
        discoveryMode={discoveryMode}
        toolbarContent={
          <AgentRuntimesToolbar
            namespace={namespace}
            filterData={filterData}
            onFilterUpdate={onFilterUpdate}
            onDeployAgent={() => navigateToDeployAgentWizard(namespace)}
            discoveryMode={discoveryMode}
          />
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
      loaded={noProjectSelected ? !projectsLoading : loaded}
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
          <AgentDeploymentsEmptyState
            namespace={namespace}
            onDeployAgent={() => navigateToDeployAgentWizard(namespace)}
            discoveryMode={discoveryMode}
          />
        )
      }
      provideChildrenPadding
    >
      {tableContent()}
    </ApplicationsPage>
  );
};

export default AgentDeploymentListPage;
