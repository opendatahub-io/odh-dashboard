import * as React from 'react';
import { Navigate, Route } from 'react-router-dom';
import { useExtensions } from '@openshift/dynamic-plugin-sdk';
import { isProjectDetailsRoute } from '@odh-dashboard/plugin-core/extension-points';
import { LazyCodeRefComponent } from '@odh-dashboard/plugin-core';
import ProjectModelMetricsWrapper from '#~/pages/modelServing/screens/projects/ProjectModelMetricsWrapper';
import ProjectServerMetricsWrapper from '#~/pages/modelServing/screens/projects/ProjectServerMetricsWrapper';
import useModelMetricsEnabled from '#~/pages/modelServing/useModelMetricsEnabled';
import ProjectsRoutes from '#~/concepts/projects/ProjectsRoutes';
import ProjectModelMetricsConfigurationPage from '#~/pages/modelServing/screens/projects/ProjectModelMetricsConfigurationPage';
import ProjectModelMetricsPage from '#~/pages/modelServing/screens/projects/ProjectModelMetricsPage';
import ProjectInferenceExplainabilityWrapper from '#~/pages/modelServing/screens/projects/ProjectInferenceExplainabilityWrapper';
import { SupportedArea, useIsAreaAvailable } from '#~/concepts/areas';
import ApplicationsPage from '#~/pages/ApplicationsPage';
import ProjectDetails from './screens/detail/ProjectDetails';
import ProjectView from './screens/projects/ProjectView';
import ProjectDetailsContextProvider from './ProjectDetailsContext';
import SpawnerPage from './screens/spawner/SpawnerPage';
import EditSpawnerPage from './screens/spawner/EditSpawnerPage';

const ProjectViewRoutes: React.FC = () => {
  const [modelMetricsEnabled] = useModelMetricsEnabled();
  const biasMetricsAreaAvailable = useIsAreaAvailable(SupportedArea.BIAS_METRICS).status;
  const performanceMetricsAreaAvailable = useIsAreaAvailable(
    SupportedArea.PERFORMANCE_METRICS,
  ).status;
  const projectDetailsRoutes = useExtensions(isProjectDetailsRoute);

  const dynamicRoutes = React.useMemo(
    () =>
      projectDetailsRoutes.map((projectDetailsRoute) => (
        <Route
          key={projectDetailsRoute.uid}
          path={projectDetailsRoute.properties.path}
          element={
            <LazyCodeRefComponent
              key={projectDetailsRoute.uid}
              component={projectDetailsRoute.properties.component}
              fallback={<ApplicationsPage title="" description="" loaded={false} empty />}
            />
          }
        />
      )),
    [projectDetailsRoutes],
  );

  return (
    <ProjectsRoutes>
      <Route path="/" element={<ProjectView />} />
      <Route path="/:namespace/*" element={<ProjectDetailsContextProvider />}>
        <Route index element={<ProjectDetails />} />
        {dynamicRoutes}
        <Route path="spawner" element={<SpawnerPage />} />
        <Route path="spawner/:notebookName" element={<EditSpawnerPage />} />
        {modelMetricsEnabled && (
          <>
            <Route path="metrics/model" element={<ProjectInferenceExplainabilityWrapper />}>
              <Route index element={<Navigate to=".." />} />
              <Route path=":inferenceService" element={<ProjectModelMetricsWrapper />}>
                <Route path=":tab?" element={<ProjectModelMetricsPage />} />
                {biasMetricsAreaAvailable && (
                  <Route path="configure" element={<ProjectModelMetricsConfigurationPage />} />
                )}
              </Route>
              <Route path="*" element={<Navigate to="." />} />
            </Route>
            {performanceMetricsAreaAvailable && (
              <Route
                path="metrics/server/:servingRuntime"
                element={<ProjectServerMetricsWrapper />}
              />
            )}
          </>
        )}
        <Route path="*" element={<Navigate to="." />} />
      </Route>
      <Route path="*" element={<Navigate to="." />} />
    </ProjectsRoutes>
  );
};

export default ProjectViewRoutes;
