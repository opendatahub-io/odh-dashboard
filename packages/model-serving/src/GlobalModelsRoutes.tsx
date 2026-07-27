import React from 'react';
import { Navigate, Route } from 'react-router-dom';
import ProjectsRoutes from '@odh-dashboard/internal/concepts/projects/ProjectsRoutes';
import { useModelMetricsEnabled } from '@odh-dashboard/model-serving/shared';
import GlobalModelsPage from './components/global/GlobalModelsPage';
import { useMetricsRoutes } from './components/metrics/GlobalMetricsRoutes';
import { deploymentsInternalPath } from './components/global/deploymentsPaths';

const GlobalModelsRoutes: React.FC = () => {
  const [modelMetricsEnabled] = useModelMetricsEnabled();
  const legacyMetricsRoutes = useMetricsRoutes(
    (namespace) => `/ai-hub/models/deployments/${namespace}`,
    ':namespace/metrics',
  );
  const subTabMetricsRoutes = useMetricsRoutes(
    (namespace) => deploymentsInternalPath(namespace),
    'internal/:namespace/metrics',
  );

  return (
    <ProjectsRoutes>
      <Route path="internal" element={<GlobalModelsPage />} />
      <Route path="internal/:namespace" element={<GlobalModelsPage />} />
      <Route path="external" element={<GlobalModelsPage />} />
      <Route path="external/:namespace" element={<GlobalModelsPage />} />
      <Route path="external-models/*" element={<Navigate to="../external" replace />} />
      <Route index element={<GlobalModelsPage />} />
      <Route path=":namespace" element={<GlobalModelsPage />} />
      {modelMetricsEnabled && (
        <>
          {legacyMetricsRoutes}
          {subTabMetricsRoutes}
        </>
      )}
      <Route path="*" element={<Navigate to="." />} />
    </ProjectsRoutes>
  );
};

export default GlobalModelsRoutes;
