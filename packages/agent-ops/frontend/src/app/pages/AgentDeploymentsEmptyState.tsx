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
  deployMode?: boolean;
};

const AgentDeploymentsEmptyState: React.FC<AgentDeploymentsEmptyStateProps> = ({
  namespace,
  onDeployAgent,
  deployMode = false,
}) => (
  <EmptyState
    headingLevel="h2"
    icon={CubesIcon}
    titleText="No agent deployments"
    variant={EmptyStateVariant.lg}
    data-testid="agent-deployments-empty-state"
  >
    <EmptyStateBody>
      {!deployMode
        ? 'No agent sandboxes were found in this project.'
        : 'No agents have been deployed yet. Deploy an agent to get started.'}
    </EmptyStateBody>
    {deployMode && (
      <EmptyStateFooter>
        <DeployAgentButton namespace={namespace} onDeployAgent={onDeployAgent} />
      </EmptyStateFooter>
    )}
  </EmptyState>
);

export default AgentDeploymentsEmptyState;
