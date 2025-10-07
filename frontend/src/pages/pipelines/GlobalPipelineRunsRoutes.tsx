import * as React from 'react';
import { Navigate, Route } from 'react-router-dom';
import ProjectsRoutes from '#~/concepts/projects/ProjectsRoutes';
import GlobalPipelineCoreLoader from '#~/pages/pipelines/global/GlobalPipelineCoreLoader';
import { PipelineRunCoreDetails } from '#~/pages/pipelines/global/GlobalPipelineCoreDetails';
import { globNamespaceAll } from '#~/routes/pipelines/global';
import { pipelineRunsBaseRoute } from '#~/routes/pipelines/runs';
import { PipelineRunType } from '#~/pages/pipelines/global/runs/types';
import PipelineAvailabilityLoader from '#~/pages/pipelines/global/pipelines/PipelineAvailabilityLoader';
import GlobalPipelineRuns from '#~/pages/pipelines/global/runs/GlobalPipelineRuns';
import {
  pipelineRunsPageDescription,
  pipelineRunsPageTitle,
} from '#~/pages/pipelines/global/runs/const';
import {
  GlobalComparePipelineRunsLoader,
  GlobalManagePipelineRunsLoader,
} from '#~/pages/pipelines/global/experiments/compareRuns/GlobalComparePipelineRunsLoader';
import CompareRunsPage from '#~/pages/pipelines/global/experiments/compareRuns/CompareRunsPage';
import ManageRunsPage from '#~/pages/pipelines/global/experiments/compareRuns/ManageRunsPage';
import GlobalPipelineRunDetails from '#~/pages/pipelines/global/runs/GlobalPipelineRunDetails';
import GlobalPipelineRecurringRunDetails from '#~/pages/pipelines/global/runs/GlobalPipelineRecurringRunDetails';
import {
  GlobalPipelineCreateRecurringRunPagePage,
  GlobalPipelineCreateRunPage,
} from '#~/pages/pipelines/global/runs/GlobalPipelineCreateRunPage';
import GlobalPipelineDuplicateRunPage from '#~/pages/pipelines/global/runs/GlobalPipelineDuplicateRunPage';
import GlobalPipelineDuplicateRecurringRunPage from '#~/pages/pipelines/global/runs/GlobalPipelineDuplicateRecurringRunPage';
import { buildV2RedirectRoutes } from '#~/utilities/v2Redirect';
import { pipelineRunsV2RedirectMap } from './v2Redirects';

const GlobalPipelineRunsRoutes: React.FC = () => (
  <ProjectsRoutes>
    <Route
      path={globNamespaceAll}
      element={
        <GlobalPipelineCoreLoader
          title={pipelineRunsPageTitle}
          description={pipelineRunsPageDescription}
          getInvalidRedirectPath={pipelineRunsBaseRoute}
        />
      }
    >
      <Route index element={<GlobalPipelineRuns tab={PipelineRunType.ACTIVE} />} />
      <Route path="runs" element={<GlobalPipelineRuns tab={PipelineRunType.ACTIVE} />} />
      <Route path="runs/active" element={<GlobalPipelineRuns tab={PipelineRunType.ACTIVE} />} />
      <Route path="runs/archived" element={<GlobalPipelineRuns tab={PipelineRunType.ARCHIVED} />} />
      <Route path="schedules" element={<GlobalPipelineRuns tab={PipelineRunType.SCHEDULED} />} />
      <Route element={<PipelineAvailabilityLoader />}>
        <Route path="runs">
          <Route
            path="create"
            element={
              <PipelineRunCoreDetails BreadcrumbDetailsComponent={GlobalPipelineCreateRunPage} />
            }
          />
          <Route
            path=":runId"
            element={
              <PipelineRunCoreDetails BreadcrumbDetailsComponent={GlobalPipelineRunDetails} />
            }
          />
          <Route
            path="duplicate/:runId"
            element={
              <PipelineRunCoreDetails BreadcrumbDetailsComponent={GlobalPipelineDuplicateRunPage} />
            }
          />
        </Route>
        <Route path="schedules">
          <Route
            path="create"
            element={
              <PipelineRunCoreDetails
                BreadcrumbDetailsComponent={GlobalPipelineCreateRecurringRunPagePage}
              />
            }
          />
          <Route
            path=":recurringRunId"
            element={
              <PipelineRunCoreDetails
                BreadcrumbDetailsComponent={GlobalPipelineRecurringRunDetails}
              />
            }
          />
          <Route
            path="duplicate/:recurringRunId"
            element={
              <PipelineRunCoreDetails
                BreadcrumbDetailsComponent={GlobalPipelineDuplicateRecurringRunPage}
              />
            }
          />
        </Route>
        <Route
          path="compare-runs"
          element={<GlobalComparePipelineRunsLoader BreadcrumbDetailsComponent={CompareRunsPage} />}
        />
        <Route
          path="compare-runs/add"
          element={<GlobalManagePipelineRunsLoader BreadcrumbDetailsComponent={ManageRunsPage} />}
        />
        {buildV2RedirectRoutes(pipelineRunsV2RedirectMap)}
        <Route path="*" element={<Navigate to="." />} />
      </Route>
      <Route path="*" element={<Navigate to="." />} />
    </Route>
    <Route path="*" element={<Navigate to="." />} />
  </ProjectsRoutes>
);

export default GlobalPipelineRunsRoutes;
