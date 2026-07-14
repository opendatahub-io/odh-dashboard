import * as React from 'react';
import { Route, Routes } from 'react-router-dom';
import AgentDeploymentDetailGate from '~/app/components/AgentDeploymentDetailGate';
import AgentDeploymentDetailPage from '~/app/pages/AgentDeploymentDetailPage';
import AgentOpsFederatedProviders from './AgentOpsFederatedProviders';

const AgentDeploymentDetailRoutes: React.FC = () => (
  <AgentOpsFederatedProviders>
    <AgentDeploymentDetailGate>
      <Routes>
        <Route path="*" element={<AgentDeploymentDetailPage />} />
      </Routes>
    </AgentDeploymentDetailGate>
  </AgentOpsFederatedProviders>
);

export default AgentDeploymentDetailRoutes;
