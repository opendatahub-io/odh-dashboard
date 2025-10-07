import * as React from 'react';
import { Navigate, Route } from 'react-router-dom';
import ProjectsRoutes from '#~/concepts/projects/ProjectsRoutes';
import GlobalPipelineCoreLoader from '#~/pages/pipelines/global/GlobalPipelineCoreLoader';
import {
  ExperimentListTabs,
  experimentsPageDescription,
  experimentsPageTitle,
} from '#~/pages/pipelines/global/experiments/const';
import GlobalExperiments from '#~/pages/pipelines/global/experiments/GlobalExperiments';
import { experimentsBaseRoute } from '#~/routes/pipelines/experiments';
import ExperimentContextProvider from '#~/pages/pipelines/global/experiments/ExperimentContext';
import ExperimentPipelineRuns from '#~/pages/pipelines/global/experiments/ExperimentPipelineRuns';
import ExperimentPipelineRunsTabs from '#~/pages/pipelines/global/experiments/ExperimentPipelineRunsTabs';
import { PipelineRunType } from '#~/pages/pipelines/global/runs/types';
import ExperimentPipelineRunDetails from '#~/pages/pipelines/global/experiments/ExperimentPipelineRunDetails';
import ExperimentPipelineRecurringRunDetails from '#~/pages/pipelines/global/experiments/ExperimentPipelineRecurringRunDetails';
import {
  ExperimentCreateRunPage,
  ExperimentCreateSchedulePage,
} from '#~/pages/pipelines/global/experiments/ExperimentCreateRunPage';
import PipelineAvailabilityLoader from '#~/pages/pipelines/global/pipelines/PipelineAvailabilityLoader';
import ExperimentDuplicateRunPage from '#~/pages/pipelines/global/experiments/ExperimentDuplicateRunPage';
import { buildV2RedirectRoutes } from '#~/utilities/v2Redirect';
import ExperimentDuplicateRecurringRunPage from '#~/pages/pipelines/global/experiments/ExperimentDuplicateRecurringRunPage';
import { ExperimentCoreDetails } from './global/GlobalPipelineCoreDetails';
import {
  ExperimentComparePipelineRunsLoader,
  ExperimentManagePipelineRunsLoader,
} from './global/experiments/compareRuns/GlobalComparePipelineRunsLoader';
import CompareRunsPage from './global/experiments/compareRuns/CompareRunsPage';
import ManageRunsPage from './global/experiments/compareRuns/ManageRunsPage';
import { experimentsV2RedirectMap } from './v2Redirects';

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
              path="duplicate/:runId"
              element={
                <ExperimentCoreDetails BreadcrumbDetailsComponent={ExperimentDuplicateRunPage} />
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
              path="duplicate/:recurringRunId"
              element={
                <ExperimentCoreDetails
                  BreadcrumbDetailsComponent={ExperimentDuplicateRecurringRunPage}
                />
              }
            />
          </Route>
          <Route
            path="compare-runs"
            element={
              <ExperimentComparePipelineRunsLoader BreadcrumbDetailsComponent={CompareRunsPage} />
            }
          />
          <Route
            path="compare-runs/add"
            element={
              <ExperimentManagePipelineRunsLoader BreadcrumbDetailsComponent={ManageRunsPage} />
            }
          />
          {buildV2RedirectRoutes(experimentsV2RedirectMap)}
          <Route path="*" element={<Navigate to="./runs" />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="." />} />
    </Route>
  </ProjectsRoutes>
);

export default GlobalPipelineExperimentsRoutes;
