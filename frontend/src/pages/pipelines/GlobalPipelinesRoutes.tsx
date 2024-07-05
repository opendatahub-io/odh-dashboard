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
import { globNamespaceAll, pipelinesBaseRoute } from '~/routes';
import PipelineVersionContextProvider from '~/pages/pipelines/global/pipelines/PipelineVersionContext';
import { PipelineRunType } from '~/pages/pipelines/global/runs';
import PipelineVersionRunsTabs from '~/pages/pipelines/global/pipelines/PipelineVersionRunsTabs';
import PipelineVersionRuns from '~/pages/pipelines/global/pipelines/PipelineVersionRuns';
import PipelineVersionRunDetails from '~/pages/pipelines/global/pipelines/PipelineVersionRunDetails';
import PipelineAvailabilityLoader from '~/pages/pipelines/global/pipelines/PipelineAvailabilityLoader';
import {
  PipelineVersionCreateRunPage,
  PipelineVersionCreateRecurringRunPage,
} from '~/pages/pipelines/global/pipelines/PipelineVersionCreateRunPage';
import PipelineVersionCloneRunPage from '~/pages/pipelines/global/pipelines/PipelineVersionCloneRunPage';
import PipelineVersionRecurringRunDetails from '~/pages/pipelines/global/pipelines/PipelineVersionRecurringRunDetails';
import PipelineVersionCloneRecurringRunPage from '~/pages/pipelines/global/pipelines/PipelineVersionCloneRecurringRunPage';
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
        <Route path=":pipelineId/:pipelineVersionId" element={<PipelineVersionContextProvider />}>
          <Route
            element={
              <PipelineVersionCoreDetails BreadcrumbDetailsComponent={PipelineVersionRuns} />
            }
          >
            <Route path="runs" element={<PipelineVersionRunsTabs tab={PipelineRunType.ACTIVE} />} />
            <Route
              path="runs/active"
              element={<PipelineVersionRunsTabs tab={PipelineRunType.ACTIVE} />}
            />
            <Route
              path="runs/archived"
              element={<PipelineVersionRunsTabs tab={PipelineRunType.ARCHIVED} />}
            />
            <Route
              path="schedules"
              element={<PipelineVersionRunsTabs tab={PipelineRunType.SCHEDULED} />}
            />
          </Route>
          <Route path="runs">
            <Route
              path="create"
              element={
                <PipelineVersionCoreDetails
                  BreadcrumbDetailsComponent={PipelineVersionCreateRunPage}
                />
              }
            />
            <Route
              path=":runId"
              element={
                <PipelineVersionCoreDetails
                  BreadcrumbDetailsComponent={PipelineVersionRunDetails}
                />
              }
            />
            <Route
              path="clone/:runId"
              element={
                <PipelineVersionCoreDetails
                  BreadcrumbDetailsComponent={PipelineVersionCloneRunPage}
                />
              }
            />
          </Route>
          <Route path="schedules">
            <Route
              path="create"
              element={
                <PipelineVersionCoreDetails
                  BreadcrumbDetailsComponent={PipelineVersionCreateRecurringRunPage}
                />
              }
            />
            <Route
              path=":recurringRunId"
              element={
                <PipelineVersionCoreDetails
                  BreadcrumbDetailsComponent={PipelineVersionRecurringRunDetails}
                />
              }
            />
            <Route
              path="clone/:recurringRunId"
              element={
                <PipelineVersionCoreDetails
                  BreadcrumbDetailsComponent={PipelineVersionCloneRecurringRunPage}
                />
              }
            />
          </Route>
          <Route
            path="view"
            element={<PipelineVersionCoreDetails BreadcrumbDetailsComponent={PipelineDetails} />}
          />
          {/* All the other paths fall back to the pipeline version details view */}
          <Route path="*" element={<Navigate to="./view" />} />
        </Route>
      </Route>
    </Route>
    <Route path="*" element={<Navigate to="." />} />
  </ProjectsRoutes>
);

export default GlobalPipelinesRoutes;
