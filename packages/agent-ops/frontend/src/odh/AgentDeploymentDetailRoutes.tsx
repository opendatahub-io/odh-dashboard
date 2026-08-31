import * as React from 'react';
import AgentDeploymentDetailGate from '~/app/components/AgentDeploymentDetailGate';
import AgentDeploymentDetailPage from '~/app/pages/AgentDeploymentDetailPage';
import AgentOpsFederatedProviders from './AgentOpsFederatedProviders';

const AgentDeploymentDetailRoutes: React.FC = () => (
  <AgentOpsFederatedProviders>
    <AgentDeploymentDetailGate>
      <AgentDeploymentDetailPage />
    </AgentDeploymentDetailGate>
  </AgentOpsFederatedProviders>
);

export default AgentDeploymentDetailRoutes;
