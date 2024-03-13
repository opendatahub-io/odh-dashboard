import * as React from 'react';
import { Navigate, Route } from 'react-router-dom';
import ProjectsRoutes from '~/concepts/projects/ProjectsRoutes';
import GlobalPipelineCoreLoader from '~/pages/pipelines/global/GlobalPipelineCoreLoader';
import {
  ExperimentListTabs,
  experimentsPageDescription,
  experimentsPageTitle,
} from '~/pages/pipelines/global/experiments/const';
import GlobalExperiments from '~/pages/pipelines/global/experiments/GlobalExperiments';

const GlobalPipelineExperimentsRoutes: React.FC = () => (
  <ProjectsRoutes>
    <Route
      path="/:namespace?/*"
      element={
        <GlobalPipelineCoreLoader
          title={experimentsPageTitle}
          description={experimentsPageDescription}
          getInvalidRedirectPath={(namespace) => `/pipelineExperiments/${namespace}`}
        />
      }
    >
      <Route index element={<GlobalExperiments tab={ExperimentListTabs.ACTIVE} />} />
      <Route path="active" element={<GlobalExperiments tab={ExperimentListTabs.ACTIVE} />} />
      <Route path="archived" element={<GlobalExperiments tab={ExperimentListTabs.ARCHIVED} />} />
      <Route path="*" element={<Navigate to="." />} />
    </Route>
  </ProjectsRoutes>
);

export default GlobalPipelineExperimentsRoutes;
