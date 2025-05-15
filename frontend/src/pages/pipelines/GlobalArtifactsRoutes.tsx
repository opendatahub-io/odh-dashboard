import React from 'react';
import { Navigate, Route } from 'react-router-dom';

import ProjectsRoutes from '~/concepts/projects/ProjectsRoutes';
import GlobalPipelineCoreLoader from '~/pages/pipelines/global/GlobalPipelineCoreLoader';
import { artifactsBaseRoute } from '~/routes/pipelines/artifacts';
import { GlobalArtifactsPage } from './global/experiments/artifacts/GlobalArtifactsPage';
import GlobalPipelineCoreDetails from './global/GlobalPipelineCoreDetails';
import { ArtifactDetails } from './global/experiments/artifacts/ArtifactDetails/ArtifactDetails';

const GlobalArtifactsRoutes: React.FC = () => (
  <ProjectsRoutes>
    <Route
      path="/:namespace?/*"
      element={<GlobalPipelineCoreLoader getInvalidRedirectPath={artifactsBaseRoute} />}
    >
      <Route index element={<GlobalArtifactsPage />} />
      <Route
        path=":artifactId"
        element={
          <GlobalPipelineCoreDetails
            pageName="Artifacts"
            redirectPath={artifactsBaseRoute}
            BreadcrumbDetailsComponent={ArtifactDetails}
          />
        }
      />
      <Route path="*" element={<Navigate to="." />} />
    </Route>
  </ProjectsRoutes>
);

export default GlobalArtifactsRoutes;
