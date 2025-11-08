import React from 'react';
import { Route, Routes } from 'react-router-dom';
import { ModelDeploymentWizardPage } from './components/deploymentWizard/ModelDeploymentWizardPage';

const ModelDeploymentWizardRoutes: React.FC = () => (
  <Routes>
    <Route path="*" element={<ModelDeploymentWizardPage />} />
  </Routes>
);

export default ModelDeploymentWizardRoutes;
