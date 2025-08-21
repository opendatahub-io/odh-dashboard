import React from 'react';
import { Navigate, Route } from 'react-router-dom';
import useModelMetricsEnabled from '@odh-dashboard/internal/pages/modelServing/useModelMetricsEnabled';
import useIsAreaAvailable from '@odh-dashboard/internal/concepts/areas/useIsAreaAvailable';
import { SupportedArea } from '@odh-dashboard/internal/concepts/areas/index';
import ProjectsRoutes from '@odh-dashboard/internal/concepts/projects/ProjectsRoutes';
import GlobalModelsPage from './components/global/GlobalModelsPage';
import GlobalMetricsRoutes from './components/metrics/GlobalMetricsRoutes';
import ModelDeploymentWizardRoutes from './ModelDeploymentWizardRoutes';

const GlobalModelsRoutes: React.FC = () => {
  const [modelMetricsEnabled] = useModelMetricsEnabled();
  const deploymentWizardAvailable = useIsAreaAvailable(SupportedArea.DEPLOYMENT_WIZARD).status;

  return (
    <ProjectsRoutes>
      <Route index element={<GlobalModelsPage />} />
      {modelMetricsEnabled && <Route path="metrics/*" element={<GlobalMetricsRoutes />} />}
      {deploymentWizardAvailable && (
        <Route path="deploy/*" element={<ModelDeploymentWizardRoutes />} />
      )}
      <Route path="*" element={<Navigate to="." />} />
    </ProjectsRoutes>
  );
};

export default GlobalModelsRoutes;
