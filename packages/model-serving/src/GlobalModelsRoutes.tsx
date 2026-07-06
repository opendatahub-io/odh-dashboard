import React from 'react';
import { Navigate, Route } from 'react-router-dom';
import useModelMetricsEnabled from '@odh-dashboard/internal/pages/modelServing/useModelMetricsEnabled';
import ProjectsRoutes from '@odh-dashboard/internal/concepts/projects/ProjectsRoutes';
import GlobalModelsPage from './components/global/GlobalModelsPage';
import { useMetricsRoutes } from './components/metrics/GlobalMetricsRoutes';

const GlobalModelsRoutes: React.FC = () => {
  const [modelMetricsEnabled] = useModelMetricsEnabled();
  const metricsRoutes = useMetricsRoutes((namespace) => `/ai-hub/models/deployments/${namespace}`);

  return (
    <ProjectsRoutes>
      <Route index element={<GlobalModelsPage />} />
      <Route path=":namespace" element={<GlobalModelsPage />} />
      {modelMetricsEnabled && metricsRoutes}
      <Route path="*" element={<Navigate to="." />} />
    </ProjectsRoutes>
  );
};

export default GlobalModelsRoutes;
