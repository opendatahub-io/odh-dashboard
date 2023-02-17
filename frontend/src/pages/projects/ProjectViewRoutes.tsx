import * as React from 'react';
import { Navigate, Routes, Route } from 'react-router-dom';
import ProjectDetails from './screens/detail/ProjectDetails';
import ProjectView from './screens/projects/ProjectView';
import ProjectDetailsContextProvider from './ProjectDetailsContext';
import SpawnerPage from './screens/spawner/SpawnerPage';
import EditSpawnerPage from './screens/spawner/EditSpawnerPage';
import DetailsPageMetricsWrapper from '../modelServing/screens/projects/DetailsPageMetricsWrapper';
import { isModelMetricsEnabled } from 'pages/modelServing/screens/metrics/utils';
import { useDashboardNamespace } from 'redux/selectors';
import { useAppContext } from 'app/AppContext';

const ProjectViewRoutes: React.FC = () => {
  const { dashboardNamespace } = useDashboardNamespace();
  const { dashboardConfig } = useAppContext();

  return (
    <Routes>
      <Route path="/" element={<ProjectView />} />
      <Route path="/:namespace/*" element={<ProjectDetailsContextProvider />}>
        <Route index element={<ProjectDetails />} />
        <Route path="spawner" element={<SpawnerPage />} />
        <Route path="spawner/:notebookName" element={<EditSpawnerPage />} />
        <Route
          path="metrics/model/:inferenceService"
          element={
            isModelMetricsEnabled(dashboardNamespace, dashboardConfig) ? (
              <DetailsPageMetricsWrapper />
            ) : (
              <Navigate replace to="/" />
            )
          }
        />
        <Route path="*" element={<Navigate to="." />} />
      </Route>
      <Route path="*" element={<Navigate to="." />} />
    </Routes>
  );
};

export default ProjectViewRoutes;
