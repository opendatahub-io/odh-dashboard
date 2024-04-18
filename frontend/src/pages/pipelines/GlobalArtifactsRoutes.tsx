import React from 'react';
import { Navigate, Route } from 'react-router-dom';

import ProjectsRoutes from '~/concepts/projects/ProjectsRoutes';
import GlobalPipelineCoreLoader from '~/pages/pipelines/global/GlobalPipelineCoreLoader';
import { artifactsBaseRoute } from '~/routes';
import { GlobalArtifactsPage } from './global/experiments/artifacts';

const GlobalArtifactsRoutes: React.FC = () => (
  <ProjectsRoutes>
    <Route
      path="/:namespace?/*"
      element={<GlobalPipelineCoreLoader getInvalidRedirectPath={artifactsBaseRoute} />}
    >
      <Route index element={<GlobalArtifactsPage />} />
      <Route path="*" element={<Navigate to="." />} />
    </Route>
  </ProjectsRoutes>
);

export default GlobalArtifactsRoutes;
