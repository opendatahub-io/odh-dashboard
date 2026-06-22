import * as React from 'react';
import { useParams } from 'react-router-dom';
import ApplicationsPage from '@odh-dashboard/internal/pages/ApplicationsPage';
import { ProjectIconWithSize } from '@odh-dashboard/internal/concepts/projects/ProjectIconWithSize';
import ProjectNavigatorLink from '@odh-dashboard/internal/concepts/projects/ProjectNavigatorLink';
import { IconSize } from '@odh-dashboard/internal/types';
import {
  Bullseye,
  Content,
  EmptyState,
  EmptyStateBody,
  EmptyStateVariant,
  Flex,
  FlexItem,
  Stack,
  StackItem,
  Toolbar,
  ToolbarContent,
} from '@patternfly/react-core';
import { CubesIcon } from '@patternfly/react-icons';
import AgentOpsProjectSelector from '~/app/components/AgentOpsProjectSelector';
import { agentOpsDeploymentsRoute } from '~/app/utilities/routes';
import AgentDeploymentsEmptyState from './AgentDeploymentsEmptyState';
import AgentRuntimesToolbar from './agentRuntimes/AgentRuntimesToolbar';

const selectProjectEmptyState = (
  <EmptyState
    headingLevel="h2"
    icon={CubesIcon}
    titleText="Select a project"
    variant={EmptyStateVariant.lg}
    data-testid="agent-deployments-select-project"
  >
    <EmptyStateBody>Select a project to view agent deployments.</EmptyStateBody>
  </EmptyState>
);

const AgentDeploymentListPage: React.FC = () => {
  const { namespace } = useParams<{ namespace: string }>();
  const [filterText, setFilterText] = React.useState('');

  const noProjectSelected = !namespace;

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

  return (
    <ApplicationsPage
      noTitle
      description="View and manage agent deployments across your fleet."
      headerContent={headerContent}
      loaded
      empty={false}
      provideChildrenPadding
      removeChildrenTopPadding
    >
      {noProjectSelected ? (
        <Bullseye>{selectProjectEmptyState}</Bullseye>
      ) : (
        <Stack hasGutter>
          <StackItem>
            <Toolbar inset={{ default: 'insetNone' }}>
              <ToolbarContent>
                <AgentRuntimesToolbar filterText={filterText} onFilterChange={setFilterText} />
              </ToolbarContent>
            </Toolbar>
          </StackItem>
          <StackItem>
            <AgentDeploymentsEmptyState />
          </StackItem>
        </Stack>
      )}
    </ApplicationsPage>
  );
};

export default AgentDeploymentListPage;
