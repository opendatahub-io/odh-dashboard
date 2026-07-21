import * as React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import AgentDeploymentsCoreLoader from '~/app/pages/AgentDeploymentsCoreLoader';

const AgentDeploymentsRoutes: React.FC = () => (
  <Routes>
    <Route index element={<AgentDeploymentsCoreLoader />} />
    <Route path=":namespace" element={<AgentDeploymentsCoreLoader />} />
    <Route path="*" element={<Navigate to="." replace />} />
  </Routes>
);

export default AgentDeploymentsRoutes;
