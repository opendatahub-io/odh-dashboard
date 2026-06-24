import * as React from 'react';
import { EmptyState, EmptyStateBody, EmptyStateVariant } from '@patternfly/react-core';
import { CubesIcon } from '@patternfly/react-icons';

const AgentDeploymentsEmptyState: React.FC = () => (
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
  </EmptyState>
);

export default AgentDeploymentsEmptyState;
