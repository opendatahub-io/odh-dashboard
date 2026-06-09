import * as React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import AgentDeploymentDetailPage from '~/app/pages/AgentDeploymentDetailPage';
import AgentDeploymentListPage from '~/app/pages/AgentDeploymentListPage';

const AgentDeploymentsRoutes: React.FC = () => (
  <Routes>
    <Route index element={<AgentDeploymentListPage />} />
    <Route path=":namespace" element={<AgentDeploymentListPage />} />
    <Route path=":namespace/:agentId/*" element={<AgentDeploymentDetailPage />} />
    <Route path="*" element={<Navigate to="." replace />} />
  </Routes>
);

export default AgentDeploymentsRoutes;
