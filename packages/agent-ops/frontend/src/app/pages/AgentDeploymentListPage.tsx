import * as React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import ApplicationsPage from '@odh-dashboard/internal/pages/ApplicationsPage';
import { ProjectIconWithSize } from '@odh-dashboard/internal/concepts/projects/ProjectIconWithSize';
import ProjectNavigatorLink from '@odh-dashboard/internal/concepts/projects/ProjectNavigatorLink';
import { IconSize } from '@odh-dashboard/internal/types';
import {
  Alert,
  Bullseye,
  Content,
  EmptyState,
  EmptyStateBody,
  EmptyStateVariant,
  Flex,
  FlexItem,
  Spinner,
} from '@patternfly/react-core';
import { CubesIcon } from '@patternfly/react-icons';
import AgentOpsProjectSelector from '~/app/components/AgentOpsProjectSelector';
import { useListAgentRuntimes } from '~/app/hooks/useListAgentRuntimes';
import { agentOpsDeploymentsRoute } from '~/app/utilities/routes';
import AgentDeploymentsEmptyState from './AgentDeploymentsEmptyState';
import AgentRuntimesTable from './agentRuntimes/AgentRuntimesTable';
import AgentRuntimesToolbar from './agentRuntimes/AgentRuntimesToolbar';

const AgentDeploymentListPage: React.FC = () => {
  const { namespace } = useParams<{ namespace: string }>();
  const navigate = useNavigate();

  const [runtimes, loaded, loadError] = useListAgentRuntimes(namespace);

  // When landing on /deployments with no namespace selected, auto-redirect to the first
  // namespace found in the agent runtimes list.  This way the URL always reflects the
  // active project and the project selector shows a meaningful selection on first load.
  React.useEffect(() => {
    if (!namespace && loaded && !loadError && runtimes.length > 0) {
      navigate(agentOpsDeploymentsRoute(runtimes[0].namespace), { replace: true });
    }
  }, [namespace, loaded, loadError, runtimes, navigate]);

  const [filterText, setFilterText] = React.useState('');
  const clearFilters = React.useCallback(() => setFilterText(''), []);

  const filteredRuntimes = React.useMemo(() => {
    if (!filterText) {
      return runtimes;
    }
    const lower = filterText.toLowerCase();
    return runtimes.filter((r) => r.name.toLowerCase().includes(lower));
  }, [runtimes, filterText]);

  const noProjectSelected = !namespace;
  const isEmpty = !noProjectSelected && loaded && !loadError && runtimes.length === 0;

  const headerContent = (
    <Flex alignItems={{ default: 'alignItemsCenter' }} gap={{ default: 'gapSm' }}>
      <ProjectIconWithSize size={IconSize.LG} />
      <FlexItem>
        <Content component="p">Project</Content>
      </FlexItem>
      <FlexItem>
        <AgentOpsProjectSelector
          namespace={namespace}
          getRedirectPath={agentOpsDeploymentsRoute}
        />
      </FlexItem>
      {namespace && (
        <FlexItem>
          <ProjectNavigatorLink namespace={{ name: namespace, displayName: namespace }} />
        </FlexItem>
      )}
    </Flex>
  );

  const tableContent = () => {
    if (noProjectSelected) {
      if (!loaded) {
        return <Spinner aria-label="Loading agent deployments" />;
      }
      return (
        <EmptyState
          icon={CubesIcon}
          titleText="Select a project"
          variant={EmptyStateVariant.lg}
          data-testid="agent-deployments-select-project"
        >
          <EmptyStateBody>Select a project to view agent deployments.</EmptyStateBody>
        </EmptyState>
      );
    }

    if (!loaded) {
      return <Spinner aria-label="Loading agent deployments" />;
    }

    if (loadError) {
      return (
        <Alert variant="danger" isInline title="Error loading agent deployments">
          {loadError.message}
        </Alert>
      );
    }

    if (isEmpty) {
      return <AgentDeploymentsEmptyState />;
    }

    return (
      <AgentRuntimesTable
        runtimes={filteredRuntimes}
        onClearFilters={clearFilters}
        toolbarContent={
          <AgentRuntimesToolbar filterText={filterText} onFilterChange={setFilterText} />
        }
      />
    );
  };

  return (
    <ApplicationsPage
      noTitle
      description="View and manage agent deployments across your fleet."
      headerContent={headerContent}
      loadError={noProjectSelected ? undefined : loadError}
      loaded={noProjectSelected ? true : loaded}
      empty={noProjectSelected || isEmpty}
      emptyStatePage={
        noProjectSelected ? (
          <EmptyState
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
      {noProjectSelected || isEmpty ? (
        <Bullseye>{tableContent()}</Bullseye>
      ) : (
        tableContent()
      )}
    </ApplicationsPage>
  );
};

export default AgentDeploymentListPage;
