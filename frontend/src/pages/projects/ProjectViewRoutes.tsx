import * as React from 'react';
import { Navigate, Route } from 'react-router-dom';
import { SupportedArea, useIsAreaAvailable } from '@odh-dashboard/plugin-core/areas';
import ProjectModelMetricsWrapper from '#~/pages/modelServing/screens/projects/ProjectModelMetricsWrapper';
import useModelMetricsEnabled from '#~/pages/modelServing/useModelMetricsEnabled';
import ProjectsRoutes from '#~/concepts/projects/ProjectsRoutes';
import ProjectModelMetricsConfigurationPage from '#~/pages/modelServing/screens/projects/ProjectModelMetricsConfigurationPage';
import ProjectModelMetricsPage from '#~/pages/modelServing/screens/projects/ProjectModelMetricsPage';
import ProjectInferenceExplainabilityWrapper from '#~/pages/modelServing/screens/projects/ProjectInferenceExplainabilityWrapper';
import ProjectDetails from './screens/detail/ProjectDetails';
import ProjectView from './screens/projects/ProjectView';
import ProjectDetailsContextProvider from './ProjectDetailsContext';
import SpawnerPage from './screens/spawner/SpawnerPage';
import EditSpawnerPage from './screens/spawner/EditSpawnerPage';
import ProjectPermissionsAssignRoles from './projectPermissions/ProjectPermissionsAssignRoles';
import CreateRolePage from './projectRoles/CreateRolePage';

const ProjectViewRoutes: React.FC = () => {
  const [modelMetricsEnabled] = useModelMetricsEnabled();
  const biasMetricsAreaAvailable = useIsAreaAvailable(SupportedArea.BIAS_METRICS).status;
  const roleManagementEnabled = useIsAreaAvailable(SupportedArea.ROLE_MANAGEMENT).status;

  return (
    <ProjectsRoutes>
      <Route path="/" element={<ProjectView />} />
      <Route path="/:namespace/*" element={<ProjectDetailsContextProvider />}>
        <Route index element={<ProjectDetails />} />
        <Route path="spawner" element={<SpawnerPage />} />
        <Route path="spawner/:notebookName" element={<EditSpawnerPage />} />
        <Route path="permissions" element={<Navigate to="..?section=permissions" replace />} />
        <Route path="permissions/assign" element={<ProjectPermissionsAssignRoles />} />
        {roleManagementEnabled ? (
          <Route path="roles/create" element={<CreateRolePage />} />
        ) : (
          <Route path="roles/*" element={<Navigate to=".." replace />} />
        )}
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
          </>
        )}
        <Route path="*" element={<Navigate to="." />} />
      </Route>
      <Route path="*" element={<Navigate to="." />} />
    </ProjectsRoutes>
  );
};

export default ProjectViewRoutes;
