import * as React from 'react';
import {
  Card,
  CardBody,
  CardHeader,
  Content,
  PageSection,
  Sidebar,
  SidebarContent,
  SidebarPanel,
  Stack,
  StackItem,
  Title,
} from '@patternfly/react-core';
import { NO_REFRESH_INTERVAL } from '~/app/const';
import { useAgentCard } from '~/app/hooks/useAgentCard';
import { AgentRuntimeDetail } from '~/app/types/agentRuntimes';
import AgentDeploymentDetailsSidebar from './AgentDeploymentDetailsSidebar';
import AgentDeploymentCapabilitiesCard from './AgentDeploymentCapabilitiesCard';

type AgentDeploymentOverviewTabProps = {
  detail: AgentRuntimeDetail;
};

const AgentDeploymentOverviewTab: React.FC<AgentDeploymentOverviewTabProps> = ({ detail }) => {
  const [agentCard, loaded, error] = useAgentCard(detail.namespace, detail.name, NO_REFRESH_INTERVAL);

  return (
    <PageSection
      hasBodyWrapper={false}
      isFilled
      padding={{ default: 'noPadding' }}
      data-testid="agent-deployment-overview-tab"
    >
      <Sidebar hasGutter isPanelRight>
        <SidebarContent style={{ minWidth: 0, overflow: 'hidden' }}>
          <Stack hasGutter gap={{ default: 'gapXl' }}>
            <StackItem>
              <Card data-testid="agent-deployment-description-card">
                <CardHeader>
                  <Title headingLevel="h2" size="lg">
                    Description
                  </Title>
                </CardHeader>
                <CardBody>
                  <Content className="pf-v6-u-text-break-word">
                    <p data-testid="agent-deployment-description">
                      {detail.description || 'No description'}
                    </p>
                  </Content>
                </CardBody>
              </Card>
            </StackItem>
            <StackItem>
              <AgentDeploymentCapabilitiesCard agentCard={agentCard} loaded={loaded} error={error} />
            </StackItem>
          </Stack>
        </SidebarContent>
        <SidebarPanel width={{ default: 'width_33' }}>
          <AgentDeploymentDetailsSidebar detail={detail} agentCard={agentCard} />
        </SidebarPanel>
      </Sidebar>
    </PageSection>
  );
};

export default AgentDeploymentOverviewTab;
