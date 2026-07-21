import * as React from 'react';
import AppRoutes from '~/app/AppRoutes';
import AgentOpsFederatedProviders from './AgentOpsFederatedProviders';

const AgentOpsWrapper: React.FC = () => (
  <AgentOpsFederatedProviders>
    <AppRoutes />
  </AgentOpsFederatedProviders>
);

export default AgentOpsWrapper;
