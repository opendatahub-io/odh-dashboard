import * as React from 'react';
import { GatewayContextProvider } from '~/app/context/GatewayContext';
import AgentOpsFederatedProviders from './AgentOpsFederatedProviders';
import AgentDeploymentsRoutes from './AgentDeploymentsRoutes';
import ProjectsBridgeProviderWrapper from './components/ProjectsBridgeProviderWrapper';

const AgentDeploymentsWrapper: React.FC = () => (
  <AgentOpsFederatedProviders>
    <ProjectsBridgeProviderWrapper>
      <GatewayContextProvider>
        <AgentDeploymentsRoutes />
      </GatewayContextProvider>
    </ProjectsBridgeProviderWrapper>
  </AgentOpsFederatedProviders>
);

export default AgentDeploymentsWrapper;
