import * as React from 'react';
import { Link, Navigate, Route, Routes, useParams } from 'react-router-dom';
import ApplicationsPage from '@odh-dashboard/internal/pages/ApplicationsPage';
import HeaderIcon from '@odh-dashboard/internal/concepts/design/HeaderIcon';
import { ProjectObjectType } from '@odh-dashboard/internal/concepts/design/utils';
import {
  Breadcrumb,
  BreadcrumbItem,
  Button,
  EmptyState,
  EmptyStateBody,
  EmptyStateFooter,
  Flex,
  FlexItem,
  Title,
} from '@patternfly/react-core';
import { SearchIcon } from '@patternfly/react-icons';
import AgentRuntimeStatusLabel from '~/app/components/AgentRuntimeStatusLabel';
import { useAgentRuntimeDetail } from '~/app/hooks/useAgentRuntimeDetail';
import AgentDeploymentOverviewTab from '~/app/pages/agentDeploymentDetail/AgentDeploymentOverviewTab';
import { isNotFoundError } from '~/app/utilities/apiErrors';
import { agentOpsDeploymentsRoute } from '~/app/utilities/routes';

// TODO: Re-enable when chat with agent is available.
// headerAction={
//   <Tooltip content="Coming soon">
//     <Button variant="primary" isAriaDisabled data-testid="agent-chat-button">
//       Chat with agent
//     </Button>
//   </Tooltip>
// }

const AgentDeploymentDetailPage: React.FC = () => {
  const { namespace = '', agentId = '' } = useParams<{ namespace: string; agentId: string }>();
  const [detail, loaded, loadError] = useAgentRuntimeDetail(namespace, agentId);
  const agentsListPath = agentOpsDeploymentsRoute(namespace);

  const isNotFound = loaded && !detail && (!loadError || isNotFoundError(loadError));

  const notFoundState = (
    <EmptyState
      icon={SearchIcon}
      titleText="Agent deployment not found"
      data-testid="agent-deployment-not-found"
    >
      <EmptyStateBody>
        The requested agent deployment could not be found in project &quot;{namespace}&quot;.
      </EmptyStateBody>
      <EmptyStateFooter>
        <Button
          variant="primary"
          component={(props) => (
            <Link {...props} to={agentsListPath} />
          )}
        >
          Return to Agents
        </Button>
      </EmptyStateFooter>
    </EmptyState>
  );

  const deploymentHeader = detail ? (
    <Flex
      spaceItems={{ default: 'spaceItemsMd' }}
      alignItems={{ default: 'alignItemsCenter' }}
      flexWrap={{ default: 'wrap' }}
    >
      <FlexItem>
        <HeaderIcon type={ProjectObjectType.agentOps} size={56} padding={8} />
      </FlexItem>
      <FlexItem>
        <Flex gap={{ default: 'gapSm' }} alignItems={{ default: 'alignItemsCenter' }}>
          <FlexItem>
            <Title headingLevel="h1" size="2xl" data-testid="agent-deployment-title">
              {detail.name}
            </Title>
          </FlexItem>
          <FlexItem>
            <AgentRuntimeStatusLabel status={detail.runtime.status} />
          </FlexItem>
        </Flex>
      </FlexItem>
    </Flex>
  ) : (
    agentId || 'Loading...'
  );

  return (
    <ApplicationsPage
      noTitle
      breadcrumb={
        <Breadcrumb>
          <BreadcrumbItem>
            <Link to={agentsListPath}>Agents</Link>
          </BreadcrumbItem>
          <BreadcrumbItem isActive data-testid="agent-deployment-breadcrumb-name">
            {detail?.name || agentId || 'Loading...'}
          </BreadcrumbItem>
        </Breadcrumb>
      }
      headerContent={deploymentHeader}
      loaded={isNotFound || loaded}
      empty={isNotFound}
      emptyStatePage={isNotFound ? notFoundState : undefined}
      loadError={isNotFound ? undefined : loadError}
      errorMessage="Unable to load agent deployment details"
      provideChildrenPadding
    >
      {detail && (
        <Routes>
          <Route index element={<Navigate to="overview" replace />} />
          <Route path="overview" element={<AgentDeploymentOverviewTab detail={detail} />} />
          <Route path="*" element={<Navigate to="overview" replace />} />
        </Routes>
      )}
    </ApplicationsPage>
  );
};

export default AgentDeploymentDetailPage;
