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
import PipelinesDeprecatedBanner from '~/concepts/pipelines/PipelinesDeprecatedBanner';
import GlobalPipelines from './global/pipelines/GlobalPipelines';

const GlobalPipelinesRoutes: React.FC = () => (
  <ProjectsRoutes>
    <Route
      path="/:namespace?/*"
      element={
        <>
          <PipelinesDeprecatedBanner />
          <GlobalPipelineCoreLoader
            title={pipelinesPageTitle}
            description={pipelinesPageDescription}
            getInvalidRedirectPath={(namespace) => `/pipelines/${namespace}`}
          />
        </>
      }
    >
      <Route index element={<GlobalPipelines />} />
      <Route
        path="pipeline/view/:pipelineId/:pipelineVersionId"
        element={
          <GlobalPipelineCoreDetails
            BreadcrumbDetailsComponent={PipelineDetails}
            pageName="Pipelines"
            redirectPath={(namespace) => `/pipelines/${namespace}`}
          />
        }
      />
      <Route
        path="pipelineRun/view/:pipelineRunId"
        element={
          <GlobalPipelineCoreDetails
            BreadcrumbDetailsComponent={PipelineRunDetails}
            pageName="Pipelines"
            redirectPath={(namespace) => `/pipelines/${namespace}`}
          />
        }
      />
      <Route
        path="pipelineRunJob/view/:pipelineRunJobId"
        element={
          <GlobalPipelineCoreDetails
            BreadcrumbDetailsComponent={PipelineRunJobDetails}
            pageName="Pipelines"
            redirectPath={(namespace) => `/pipelines/${namespace}`}
          />
        }
      />
      <Route
        path="pipelineRun/create"
        element={
          <GlobalPipelineCoreDetails
            BreadcrumbDetailsComponent={CreateRunPage}
            pageName="Pipelines"
            redirectPath={(namespace) => `/pipelines/${namespace}`}
          />
        }
      />
      <Route
        path="pipelineRun/clone/:pipelineRunId"
        element={
          <GlobalPipelineCoreDetails
            BreadcrumbDetailsComponent={CloneRunPage}
            pageName="Pipelines"
            redirectPath={(namespace) => `/pipelines/${namespace}`}
          />
        }
      />

      <Route path="*" element={<Navigate to="." />} />
    </Route>

    <Route path="*" element={<Navigate to="." />} />
  </ProjectsRoutes>
);

export default GlobalPipelinesRoutes;
