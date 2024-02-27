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
import CreateRunPage from '~/concepts/pipelines/content/createRun/CreateRunPage';
import CloneRunPage from '~/concepts/pipelines/content/createRun/CloneRunPage';
import PipelineRunJobDetails from '~/concepts/pipelines/content/pipelinesDetails/pipelineRunJob/PipelineRunJobDetails';
import {
  globNamespaceAll,
  globPipelineDetails,
  globPipelineRunClone,
  globPipelineRunCreate,
  globPipelineRunDetails,
  globPipelineRunJobClone,
  globPipelineRunJobDetails,
  routePipelineRunsNamespace,
} from '~/routes';
import GlobalPipelineRuns from './global/runs/GlobalPipelineRuns';

const GlobalPipelineRunsRoutes: React.FC = () => (
  <ProjectsRoutes>
    <Route
      path={globNamespaceAll}
      element={
        <GlobalPipelineCoreLoader
          title={pipelineRunsPageTitle}
          description={pipelineRunsPageDescription}
          getInvalidRedirectPath={routePipelineRunsNamespace}
        />
      }
    >
      <Route index element={<GlobalPipelineRuns />} />
      <Route
        path={globPipelineDetails}
        element={
          <GlobalPipelineCoreDetails
            BreadcrumbDetailsComponent={PipelineDetails}
            pageName="Runs"
            redirectPath={routePipelineRunsNamespace}
          />
        }
      />
      <Route
        path={globPipelineRunDetails}
        element={
          <GlobalPipelineCoreDetails
            BreadcrumbDetailsComponent={PipelineRunDetails}
            pageName="Runs"
            redirectPath={routePipelineRunsNamespace}
          />
        }
      />
      <Route
        path={globPipelineRunJobDetails}
        element={
          <GlobalPipelineCoreDetails
            BreadcrumbDetailsComponent={PipelineRunJobDetails}
            pageName="Runs"
            redirectPath={routePipelineRunsNamespace}
          />
        }
      />
      <Route
        path={globPipelineRunCreate}
        element={
          <GlobalPipelineCoreDetails
            BreadcrumbDetailsComponent={CreateRunPage}
            pageName="Runs"
            redirectPath={routePipelineRunsNamespace}
          />
        }
      />
      <Route
        path={globPipelineRunClone}
        element={
          <GlobalPipelineCoreDetails
            BreadcrumbDetailsComponent={CloneRunPage}
            pageName="Runs"
            redirectPath={routePipelineRunsNamespace}
          />
        }
      />
      <Route
        path={globPipelineRunJobClone}
        element={
          <GlobalPipelineCoreDetails
            BreadcrumbDetailsComponent={CloneRunPage}
            pageName="Runs"
            redirectPath={routePipelineRunsNamespace}
          />
        }
      />

      <Route path="*" element={<Navigate to="." />} />
    </Route>

    <Route path="*" element={<Navigate to="." />} />
  </ProjectsRoutes>
);

export default GlobalPipelineRunsRoutes;
