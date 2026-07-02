import * as React from 'react';
import AgentOpsFederatedProviders from './AgentOpsFederatedProviders';
import AgentDeploymentsRoutes from './AgentDeploymentsRoutes';
import ProjectsBridgeProviderWrapper from './components/ProjectsBridgeProviderWrapper';

const AgentDeploymentsWrapper: React.FC = () => (
  <AgentOpsFederatedProviders>
    <ProjectsBridgeProviderWrapper>
      <AgentDeploymentsRoutes />
    </ProjectsBridgeProviderWrapper>
  </AgentOpsFederatedProviders>
);

export default AgentDeploymentsWrapper;
