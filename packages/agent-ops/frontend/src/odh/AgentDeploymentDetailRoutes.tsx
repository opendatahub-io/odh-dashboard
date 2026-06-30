import * as React from 'react';
import { Route, Routes } from 'react-router-dom';
import AgentDeploymentDetailPage from '~/app/pages/AgentDeploymentDetailPage';
import AgentOpsFederatedProviders from './AgentOpsFederatedProviders';

const AgentDeploymentDetailRoutes: React.FC = () => (
  <AgentOpsFederatedProviders>
    <Routes>
      <Route path="*" element={<AgentDeploymentDetailPage />} />
    </Routes>
  </AgentOpsFederatedProviders>
);

export default AgentDeploymentDetailRoutes;
