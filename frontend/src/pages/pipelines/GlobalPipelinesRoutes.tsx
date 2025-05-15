import * as React from 'react';
import { Navigate, Route } from 'react-router-dom';
import ProjectsRoutes from '~/concepts/projects/ProjectsRoutes';
import GlobalPipelineCoreLoader from '~/pages/pipelines/global/GlobalPipelineCoreLoader';
import {
  pipelinesPageDescription,
  pipelinesPageTitle,
} from '~/pages/pipelines/global/pipelines/const';
import { PipelineVersionCoreDetails } from '~/pages/pipelines/global/GlobalPipelineCoreDetails';
import PipelineDetails from '~/concepts/pipelines/content/pipelinesDetails/pipeline/PipelineDetails';
import { globNamespaceAll, pipelinesBaseRoute } from '~/routes/pipelines/global';
import PipelineAvailabilityLoader from '~/pages/pipelines/global/pipelines/PipelineAvailabilityLoader';
import GlobalPipelines from './global/pipelines/GlobalPipelines';

const GlobalPipelinesRoutes: React.FC = () => (
  <ProjectsRoutes>
    <Route
      path={globNamespaceAll}
      element={
        <GlobalPipelineCoreLoader
          title={pipelinesPageTitle}
          description={pipelinesPageDescription}
          getInvalidRedirectPath={pipelinesBaseRoute}
        />
      }
    >
      <Route index element={<GlobalPipelines />} />
      <Route element={<PipelineAvailabilityLoader />}>
        <Route
          path=":pipelineId/:pipelineVersionId/view"
          element={<PipelineVersionCoreDetails BreadcrumbDetailsComponent={PipelineDetails} />}
        />
        <Route path="*" element={<Navigate to="." />} />
      </Route>
    </Route>
    <Route path="*" element={<Navigate to="." />} />
  </ProjectsRoutes>
);

export default GlobalPipelinesRoutes;
