import * as React from 'react';
import { Navigate, Route } from 'react-router-dom';
import ProjectsRoutes from '~/concepts/projects/ProjectsRoutes';
import GlobalPipelineCoreLoader from '~/pages/pipelines/global/GlobalPipelineCoreLoader';
import {
  pipelinesPageDescription,
  pipelinesPageTitle,
} from '~/pages/pipelines/global/pipelines/const';
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
  globPipelineVersionRuns,
  routePipelinesNamespace,
} from '~/routes';
import GlobalPipelines from './global/pipelines/GlobalPipelines';
import GlobalPipelineVersionRuns from './global/runs/GlobalPipelineVersionRuns';

const GlobalPipelinesRoutes: React.FC = () => (
  <ProjectsRoutes>
    <Route
      path={globNamespaceAll}
      element={
        <GlobalPipelineCoreLoader
          title={pipelinesPageTitle}
          description={pipelinesPageDescription}
          getInvalidRedirectPath={routePipelinesNamespace}
        />
      }
    >
      <Route index element={<GlobalPipelines />} />
      <Route
        path={globPipelineVersionRuns}
        element={
          <GlobalPipelineCoreDetails
            BreadcrumbDetailsComponent={GlobalPipelineVersionRuns}
            pageName="Pipelines"
            redirectPath={routePipelinesNamespace}
          />
        }
      />
      <Route
        path={globPipelineDetails}
        element={
          <GlobalPipelineCoreDetails
            BreadcrumbDetailsComponent={PipelineDetails}
            pageName="Pipelines"
            redirectPath={routePipelinesNamespace}
          />
        }
      />
      <Route
        path={globPipelineRunDetails}
        element={
          <GlobalPipelineCoreDetails
            BreadcrumbDetailsComponent={PipelineRunDetails}
            pageName="Pipelines"
            redirectPath={routePipelinesNamespace}
          />
        }
      />
      <Route
        path={globPipelineRunJobDetails}
        element={
          <GlobalPipelineCoreDetails
            BreadcrumbDetailsComponent={PipelineRunJobDetails}
            pageName="Pipelines"
            redirectPath={routePipelinesNamespace}
          />
        }
      />
      <Route
        path={globPipelineRunCreate}
        element={
          <GlobalPipelineCoreDetails
            BreadcrumbDetailsComponent={CreateRunPage}
            pageName="Pipelines"
            redirectPath={routePipelinesNamespace}
          />
        }
      />
      <Route
        path={globPipelineRunClone}
        element={
          <GlobalPipelineCoreDetails
            BreadcrumbDetailsComponent={CloneRunPage}
            pageName="Pipelines"
            redirectPath={routePipelinesNamespace}
          />
        }
      />
      <Route
        path={globPipelineRunJobClone}
        element={
          <GlobalPipelineCoreDetails
            BreadcrumbDetailsComponent={CloneRunPage}
            pageName="Pipelines"
            redirectPath={routePipelinesNamespace}
          />
        }
      />

      <Route path="*" element={<Navigate to="." />} />
    </Route>

    <Route path="*" element={<Navigate to="." />} />
  </ProjectsRoutes>
);

export default GlobalPipelinesRoutes;
