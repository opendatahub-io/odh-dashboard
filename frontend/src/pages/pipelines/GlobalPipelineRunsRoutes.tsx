import * as React from 'react';
import { Navigate, Route } from 'react-router-dom';
import ProjectsRoutes from '~/concepts/projects/ProjectsRoutes';
import GlobalPipelineCoreLoader from '~/pages/pipelines/global/GlobalPipelineCoreLoader';
import {
  pipelineRunsPageDescription,
  pipelineRunsPageTitle,
} from '~/pages/pipelines/global/runs/const';
import GlobalPipelineCoreDetails from '~/pages/pipelines/global/GlobalPipelineCoreDetails';
import PipelineDetails from '~/concepts/pipelines/content/pipelinesDetails/pipeline/PipelineDetails';
import PipelineRunDetails from '~/concepts/pipelines/content/pipelinesDetails/pipelineRun/PipelineRunDetails';
import GlobalPipelineRuns from './global/runs/GlobalPipelineRuns';

const GlobalPipelineRunRoutes: React.FC = () => (
  <ProjectsRoutes>
    <Route
      path="/:namespace?/*"
      element={
        <GlobalPipelineCoreLoader
          title={pipelineRunsPageTitle}
          description={pipelineRunsPageDescription}
          getInvalidRedirectPath={(namespace) => `/pipelineRuns/${namespace}`}
        />
      }
    >
      <Route index element={<GlobalPipelineRuns />} />
      <Route
        path="pipeline/:pipelineId"
        element={
          <GlobalPipelineCoreDetails
            BreadcrumbDetailsComponent={PipelineDetails}
            pageName="Runs"
            redirectPath={(namespace) => `/pipelineRuns/${namespace}`}
          />
        }
      />
      <Route
        path="pipelineRun/:pipelineRunId"
        element={
          <GlobalPipelineCoreDetails
            BreadcrumbDetailsComponent={PipelineRunDetails}
            pageName="Runs"
            redirectPath={(namespace) => `/pipelineRuns/${namespace}`}
          />
        }
      />

      <Route path="*" element={<Navigate to="." />} />
    </Route>

    <Route path="*" element={<Navigate to="." />} />
  </ProjectsRoutes>
);

export default GlobalPipelineRunRoutes;
