import * as React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import NotFound from './components/NotFound';
import AgentDeploymentDetailGate from './components/AgentDeploymentDetailGate';
import AgentDeployWizardPage from './deployWizard/AgentDeployWizardPage';
import AgentDeploymentsCoreLoader from './pages/AgentDeploymentsCoreLoader';
import AgentDeploymentDetailPage from './pages/AgentDeploymentDetailPage';
import GatewaysPage from './pages/GatewaysPage';
import GatewayDetailPage from './pages/GatewayDetailPage';
import { agentDeploymentsPath } from './utilities/routes';

const AppRoutes: React.FC = () => (
  <Routes>
    <Route path="/" element={<Navigate to={agentDeploymentsPath} replace />} />
    <Route path="/deployments" element={<AgentDeploymentsCoreLoader />} />
    <Route
      path="/deployments/deploy"
      element={
        <AgentDeploymentDetailGate>
          <AgentDeployWizardPage />
        </AgentDeploymentDetailGate>
      }
    />
    <Route path="/deployments/:namespace" element={<AgentDeploymentsCoreLoader />} />
    <Route
      path="/deployments/:namespace/:agentId/*"
      element={
        <AgentDeploymentDetailGate>
          <AgentDeploymentDetailPage />
        </AgentDeploymentDetailGate>
      }
    />
    <Route path="/gateways" element={<GatewaysPage />} />
    <Route path="/gateways/:gwName" element={<GatewayDetailPage />} />
    <Route path="*" element={<NotFound />} />
  </Routes>
);

export default AppRoutes;
