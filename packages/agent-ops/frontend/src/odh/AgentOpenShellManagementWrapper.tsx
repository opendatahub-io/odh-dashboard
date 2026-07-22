import * as React from 'react';
import { GatewayContextProvider } from '~/app/context/GatewayContext';
import AgentOpsFederatedProviders from './AgentOpsFederatedProviders';
import OpenShellManagementPage from '~/app/pages/OpenShellManagementPage';

const AgentOpenShellManagementWrapper: React.FC = () => (
  <AgentOpsFederatedProviders>
    <GatewayContextProvider>
      <OpenShellManagementPage />
    </GatewayContextProvider>
  </AgentOpsFederatedProviders>
);

export default AgentOpenShellManagementWrapper;
