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
import { experimentsBaseRoute } from '~/routes';
import ExperimentContextProvider from '~/pages/pipelines/global/experiments/ExperimentContext';
import ExperimentPipelineRuns from '~/pages/pipelines/global/experiments/ExperimentPipelineRuns';
import ExperimentPipelineRunsTabs from '~/pages/pipelines/global/experiments/ExperimentPipelineRunsTabs';
import { PipelineRunType } from '~/pages/pipelines/global/runs';
import ExperimentPipelineRunDetails from '~/pages/pipelines/global/experiments/ExperimentPipelineRunDetails';
import ExperimentPipelineRecurringRunDetails from '~/pages/pipelines/global/experiments/ExperimentPipelineRecurringRunDetails';
import {
  ExperimentCreateRunPage,
  ExperimentCreateSchedulePage,
} from '~/pages/pipelines/global/experiments/ExperimentCreateRunPage';
import PipelineAvailabilityLoader from '~/pages/pipelines/global/pipelines/PipelineAvailabilityLoader';
import ExperimentCloneRunPage from '~/pages/pipelines/global/experiments/ExperimentCloneRunPage';
import ExperimentCloneRecurringRunPage from '~/pages/pipelines/global/experiments/ExperimentCloneRecurringRunPage';
import { ExperimentCoreDetails } from './global/GlobalPipelineCoreDetails';
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
      <Route element={<PipelineAvailabilityLoader />}>
        <Route path=":experimentId" element={<ExperimentContextProvider />}>
          <Route
            element={<ExperimentCoreDetails BreadcrumbDetailsComponent={ExperimentPipelineRuns} />}
          >
            <Route
              path="runs"
              element={<ExperimentPipelineRunsTabs tab={PipelineRunType.ACTIVE} />}
            />
            <Route
              path="runs/active"
              element={<ExperimentPipelineRunsTabs tab={PipelineRunType.ACTIVE} />}
            />
            <Route
              path="runs/archived"
              element={<ExperimentPipelineRunsTabs tab={PipelineRunType.ARCHIVED} />}
            />
            <Route
              path="schedules"
              element={<ExperimentPipelineRunsTabs tab={PipelineRunType.SCHEDULED} />}
            />
          </Route>
          <Route path="runs">
            <Route
              path=":runId"
              element={
                <ExperimentCoreDetails BreadcrumbDetailsComponent={ExperimentPipelineRunDetails} />
              }
            />
            <Route
              path="create"
              element={
                <ExperimentCoreDetails BreadcrumbDetailsComponent={ExperimentCreateRunPage} />
              }
            />
            <Route
              path="clone/:runId"
              element={
                <ExperimentCoreDetails BreadcrumbDetailsComponent={ExperimentCloneRunPage} />
              }
            />
          </Route>
          <Route path="schedules">
            <Route
              path=":recurringRunId"
              element={
                <ExperimentCoreDetails
                  BreadcrumbDetailsComponent={ExperimentPipelineRecurringRunDetails}
                />
              }
            />
            <Route
              path="create"
              element={
                <ExperimentCoreDetails BreadcrumbDetailsComponent={ExperimentCreateSchedulePage} />
              }
            />
            <Route
              path="clone/:recurringRunId"
              element={
                <ExperimentCoreDetails
                  BreadcrumbDetailsComponent={ExperimentCloneRecurringRunPage}
                />
              }
            />
          </Route>
          <Route path="compareRuns" element={<GlobalComparePipelineRunsLoader />}>
            <Route
              index
              element={<ExperimentCoreDetails BreadcrumbDetailsComponent={CompareRunsPage} />}
            />
          </Route>
          <Route
            path="compareRuns/add"
            element={<ExperimentCoreDetails BreadcrumbDetailsComponent={ManageRunsPage} />}
          />
          <Route path="*" element={<Navigate to="./runs" />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="." />} />
    </Route>
  </ProjectsRoutes>
);

export default GlobalPipelineExperimentsRoutes;
