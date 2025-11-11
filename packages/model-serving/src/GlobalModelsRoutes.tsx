import React from 'react';
import { Navigate, Route } from 'react-router-dom';
import useModelMetricsEnabled from '@odh-dashboard/internal/pages/modelServing/useModelMetricsEnabled';
import ProjectsRoutes from '@odh-dashboard/internal/concepts/projects/ProjectsRoutes';
import GlobalModelsPage from './components/global/GlobalModelsPage';
import GlobalMetricsRoutes from './components/metrics/GlobalMetricsRoutes';

const GlobalModelsRoutes: React.FC = () => {
  const [modelMetricsEnabled] = useModelMetricsEnabled();

  return (
    <ProjectsRoutes>
      <Route index element={<GlobalModelsPage />} />
      {modelMetricsEnabled && <Route path="metrics/*" element={<GlobalMetricsRoutes />} />}
      <Route path="*" element={<Navigate to="." />} />
    </ProjectsRoutes>
  );
};

export default GlobalModelsRoutes;
