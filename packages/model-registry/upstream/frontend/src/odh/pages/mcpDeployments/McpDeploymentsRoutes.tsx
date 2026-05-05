import * as React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import McpDeploymentsCoreLoader from './McpDeploymentsCoreLoader';

const McpDeploymentsRoutes: React.FC = () => (
  <Routes>
    <Route path="/:namespace?" element={<McpDeploymentsCoreLoader />} />
    <Route path="*" element={<Navigate to="." />} />
  </Routes>
);

export default McpDeploymentsRoutes;
