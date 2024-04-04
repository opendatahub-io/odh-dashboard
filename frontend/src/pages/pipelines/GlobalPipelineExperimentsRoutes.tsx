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
import PipelineRunDetails from '~/concepts/pipelines/content/pipelinesDetails/pipelineRun/PipelineRunDetails';
import PipelineRunJobDetails from '~/concepts/pipelines/content/pipelinesDetails/pipelineRunJob/PipelineRunJobDetails';
import { experimentsBaseRoute } from '~/routes';
import CreateRunPage from '~/concepts/pipelines/content/createRun/CreateRunPage';
import CloneRunPage from '~/concepts/pipelines/content/createRun/CloneRunPage';
import { GlobalExperimentDetails } from './global/GlobalPipelineCoreDetails';
import GlobalPipelineRuns from './global/runs/GlobalPipelineRuns';
import { ExperimentRunsListBreadcrumb } from './global/experiments/ExperimentRunsListBreadcrumb';
import GlobalComparePipelineRunsLoader from './global/experiments/compareRuns/GlobalComparePipelineRunsLoader';
import CompareRunsPage from './global/experiments/compareRuns/CompareRunsPage';
import { ManageRunsPage } from './global/experiments/compareRuns/ManageRunsPage';

const GlobalPipelineExperimentsRoutes: React.FC = () => (
  <ProjectsRoutes>
    <Route
      path="/:namespace?/*"
      element={
        <GlobalPipelineCoreLoader
          title={experimentsPageTitle}
          description={experimentsPageDescription}
          getInvalidRedirectPath={experimentsBaseRoute}
        />
      }
    >
      <Route index element={<GlobalExperiments tab={ExperimentListTabs.ACTIVE} />} />
      <Route path="active" element={<GlobalExperiments tab={ExperimentListTabs.ACTIVE} />} />
      <Route path="archived" element={<GlobalExperiments tab={ExperimentListTabs.ARCHIVED} />} />
      <Route
        path=":experimentId/runs"
        element={
          <GlobalPipelineRuns
            breadcrumb={<ExperimentRunsListBreadcrumb />}
            description="Manage and view your experiment and runs."
            getRedirectPath={experimentsBaseRoute}
          />
        }
      />
      <Route
        path=":experimentId/runs/:runId"
        element={<GlobalExperimentDetails BreadcrumbDetailsComponent={PipelineRunDetails} />}
      />
      <Route
        path=":experimentId/schedules/:recurringRunId"
        element={
          <GlobalExperimentDetails BreadcrumbDetailsComponent={PipelineRunJobDetails} isSchedule />
        }
      />
      <Route
        path=":experimentId/runs/create"
        element={<GlobalExperimentDetails BreadcrumbDetailsComponent={CreateRunPage} />}
      />
      <Route
        path=":experimentId/schedules/create"
        element={<GlobalExperimentDetails BreadcrumbDetailsComponent={CreateRunPage} isSchedule />}
      />
      <Route
        path=":experimentId/runs/clone/:runId"
        element={<GlobalExperimentDetails BreadcrumbDetailsComponent={CloneRunPage} />}
      />
      <Route
        path=":experimentId/schedules/clone/:recurringRunId"
        element={<GlobalExperimentDetails BreadcrumbDetailsComponent={CloneRunPage} isSchedule />}
      />
      <Route path=":experimentId/compareRuns" element={<GlobalComparePipelineRunsLoader />}>
        <Route
          index
          element={<GlobalExperimentDetails BreadcrumbDetailsComponent={CompareRunsPage} />}
        />
      </Route>
      <Route
        path=":experimentId/compareRuns/add"
        element={<GlobalExperimentDetails BreadcrumbDetailsComponent={ManageRunsPage} />}
      />
      <Route path="*" element={<Navigate to="." />} />
    </Route>
  </ProjectsRoutes>
);

export default GlobalPipelineExperimentsRoutes;
