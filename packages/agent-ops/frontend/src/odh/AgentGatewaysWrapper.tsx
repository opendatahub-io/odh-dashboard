import * as React from 'react';
import AgentOpsFederatedProviders from './AgentOpsFederatedProviders';
import GatewaysPage from '~/app/pages/GatewaysPage';
import { GatewayContextProvider } from '~/app/context/GatewayContext';

const AgentGatewaysWrapper: React.FC = () => (
  <AgentOpsFederatedProviders>
    <GatewayContextProvider>
      <GatewaysPage />
    </GatewayContextProvider>
  </AgentOpsFederatedProviders>
);

export default AgentGatewaysWrapper;
