import React from 'react';
import { Navigate, Route } from 'react-router-dom';

import ProjectsRoutes from '#~/concepts/projects/ProjectsRoutes';
import GlobalPipelineCoreLoader from '#~/pages/pipelines/global/GlobalPipelineCoreLoader';
import { artifactsBaseRoute } from '#~/routes/pipelines/artifacts';
import TitleWithIcon from '#~/concepts/design/TitleWithIcon';
import { ProjectObjectType } from '#~/concepts/design/utils';
import { GlobalArtifactsPage } from './global/experiments/artifacts/GlobalArtifactsPage';
import GlobalPipelineCoreDetails from './global/GlobalPipelineCoreDetails';
import { ArtifactDetails } from './global/experiments/artifacts/ArtifactDetails/ArtifactDetails';
import {
  artifactsPageDescription,
  artifactsPageTitle,
} from './global/experiments/artifacts/constants';

const GlobalArtifactsRoutes: React.FC = () => (
  <ProjectsRoutes>
    <Route
      path="/:namespace?/*"
      element={
        <GlobalPipelineCoreLoader
          title={
            <TitleWithIcon
              title={artifactsPageTitle}
              objectType={ProjectObjectType.pipelineArtifact}
            />
          }
          description={artifactsPageDescription}
          getInvalidRedirectPath={artifactsBaseRoute}
        />
      }
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
