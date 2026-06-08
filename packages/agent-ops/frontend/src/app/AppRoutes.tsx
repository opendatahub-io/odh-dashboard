import * as React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import NotFound from './components/NotFound';
import AgentDeploymentListPage from './pages/AgentDeploymentListPage';
import AgentDeploymentDetailPage from './pages/AgentDeploymentDetailPage';
import { agentDeploymentsPath } from './utilities/routes';

const AppRoutes: React.FC = () => (
  <Routes>
    <Route path="/" element={<Navigate to={agentDeploymentsPath} replace />} />
    <Route path="/deployments" element={<AgentDeploymentListPage />} />
    <Route path="/deployments/:namespace" element={<AgentDeploymentListPage />} />
    <Route path="/deployments/:namespace/:agentId/*" element={<AgentDeploymentDetailPage />} />
    <Route path="*" element={<NotFound />} />
  </Routes>
);

export default AppRoutes;
