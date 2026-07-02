import * as React from 'react';
import {
  EmptyState,
  EmptyStateBody,
  EmptyStateFooter,
  EmptyStateVariant,
} from '@patternfly/react-core';
import { CubesIcon } from '@patternfly/react-icons';
import DeployAgentButton from '~/app/components/DeployAgentButton';

type AgentDeploymentsEmptyStateProps = {
  namespace?: string;
  onDeployAgent: () => void;
};

const AgentDeploymentsEmptyState: React.FC<AgentDeploymentsEmptyStateProps> = ({
  namespace,
  onDeployAgent,
}) => (
  <EmptyState
    headingLevel="h2"
    icon={CubesIcon}
    titleText="No agent deployments"
    variant={EmptyStateVariant.lg}
    data-testid="agent-deployments-empty-state"
  >
    <EmptyStateBody>
      No agents have been deployed yet. Deploy an agent to get started.
    </EmptyStateBody>
    <EmptyStateFooter>
      <DeployAgentButton namespace={namespace} onDeployAgent={onDeployAgent} />
    </EmptyStateFooter>
  </EmptyState>
);

export default AgentDeploymentsEmptyState;
