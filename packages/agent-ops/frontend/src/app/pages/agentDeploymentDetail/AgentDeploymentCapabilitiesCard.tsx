import * as React from 'react';
import { Card, CardBody, CardHeader, Title } from '@patternfly/react-core';
import { AgentRuntimeDetail } from '~/app/types/agentRuntimes';

type AgentDeploymentCapabilitiesCardProps = {
  detail: AgentRuntimeDetail;
};

// TODO(RHOAIENG-62708): Add capabilities card content from the agent card API.
// https://redhat.atlassian.net/browse/RHOAIENG-62708
const AgentDeploymentCapabilitiesCard: React.FC<AgentDeploymentCapabilitiesCardProps> = ({
  detail: _detail,
}) => (
  <Card data-testid="agent-deployment-capabilities-card">
    <CardHeader>
      <Title headingLevel="h2" size="lg">
        Capabilities
      </Title>
    </CardHeader>
    <CardBody>{/* TODO: Add capabilities card content */}</CardBody>
  </Card>
);

export default AgentDeploymentCapabilitiesCard;
