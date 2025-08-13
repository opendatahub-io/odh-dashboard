import React from 'react';
import { Route, Routes } from 'react-router-dom';
import CreateModelDeploymentPage from './components/deploymentWizard/CreateModelDeploymentPage';
import EditModelDeploymentPage from './components/deploymentWizard/EditModelDeploymentPage';

const ModelDeploymentWizardRoutes: React.FC = () => (
  <Routes>
    <Route path="/create" element={<CreateModelDeploymentPage />} />
    <Route path="/edit/:name?" element={<EditModelDeploymentPage />} />
  </Routes>
);

export default ModelDeploymentWizardRoutes;
