import * as React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import NotFound from './components/NotFound';
import AgentListPage from './pages/AgentListPage';
import AgentDetailPage from './pages/AgentDetailPage';
import { agentDeploymentsPath } from './utilities/routes';

const AppRoutes: React.FC = () => (
  <Routes>
    <Route path="/" element={<Navigate to={agentDeploymentsPath} replace />} />
    <Route path="/deployments" element={<AgentListPage />} />
    <Route path="/deployments/:namespace" element={<AgentListPage />} />
    <Route path="/deployments/:namespace/:agentId/*" element={<AgentDetailPage />} />
    <Route path="*" element={<NotFound />} />
  </Routes>
);

export default AppRoutes;
