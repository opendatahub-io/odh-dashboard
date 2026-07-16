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
  discoveryMode?: boolean;
};

const AgentDeploymentsEmptyState: React.FC<AgentDeploymentsEmptyStateProps> = ({
  namespace,
  onDeployAgent,
  discoveryMode = false,
}) => (
  <EmptyState
    headingLevel="h2"
    icon={CubesIcon}
    titleText="No agent deployments"
    variant={EmptyStateVariant.lg}
    data-testid="agent-deployments-empty-state"
  >
    <EmptyStateBody>
      {discoveryMode
        ? 'No agent sandboxes were found in this project.'
        : 'No agents have been deployed yet. Deploy an agent to get started.'}
    </EmptyStateBody>
    {!discoveryMode && (
      <EmptyStateFooter>
        <DeployAgentButton namespace={namespace} onDeployAgent={onDeployAgent} />
      </EmptyStateFooter>
    )}
  </EmptyState>
);

export default AgentDeploymentsEmptyState;
