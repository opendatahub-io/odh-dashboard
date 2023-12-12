import * as React from 'react';
import { BreadcrumbItem } from '@patternfly/react-core';
import { Link, Route } from 'react-router-dom';
import EdgePipelineDetails from '~/pages/edge/screens/pipelines/EdgePipelineDetails';
import ProjectsRoutes from '~/concepts/projects/ProjectsRoutes';
import EdgeContextProvider from '~/concepts/edge/content/EdgeContext';
import EdgePipelinesPage from '~/pages/edge/screens/pipelines/EdgePipelinesPage';
import EdgePipelineRunDetails from '~/pages/edge/screens/pipelines/EdgePipelineRunDetails';

const EdgePipelinesRoutes: React.FC = () => (
  <ProjectsRoutes>
    <Route path="/" element={<EdgeContextProvider />}>
      <Route index element={<EdgePipelinesPage />} />
      <Route
        path="/pipeline/view/:pipelineName"
        element={
          <EdgePipelineDetails
            breadcrumbPath={[
              <BreadcrumbItem
                key="edge-pipelines-home"
                render={() => <Link to="/edgePipelines">Edge Pipelines</Link>}
              />,
            ]}
          />
        }
      />
      <Route
        path="/pipelineRun/view/:pipelineRunName"
        element={
          <EdgePipelineRunDetails
            breadcrumbPath={[
              <BreadcrumbItem
                key="edge-pipelines-home"
                render={() => <Link to="/edgePipelines">Edge Pipelines</Link>}
              />,
            ]}
          />
        }
      />
    </Route>
  </ProjectsRoutes>
);

export default EdgePipelinesRoutes;
