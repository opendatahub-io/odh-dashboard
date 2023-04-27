import * as React from 'react';
import { Navigate, Routes, Route } from 'react-router-dom';
import DetailsPageMetricsWrapper from '~/pages/modelServing/screens/projects/DetailsPageMetricsWrapper';
import useModelMetricsEnabled from '~/pages/modelServing/useModelMetricsEnabled';
import { featureFlagEnabled } from '~/utilities/utils';
import { AppContext } from '~/app/AppContext';
import ModelServingProjectDetailsContextAdditions from '~/pages/projects/ModelServingProjectDetailsContextAdditions';
import ProjectDetails from './screens/detail/ProjectDetails';
import ProjectView from './screens/projects/ProjectView';
import ProjectDetailsContextProvider from './ProjectDetailsContext';
import SpawnerPage from './screens/spawner/SpawnerPage';
import EditSpawnerPage from './screens/spawner/EditSpawnerPage';

const ProjectViewRoutes: React.FC = () => {
  const [modelMetricsEnabled] = useModelMetricsEnabled();
  const { dashboardConfig } = React.useContext(AppContext);

  return (
    <Routes>
      <Route path="/" element={<ProjectView />} />
      <Route
        path="/:namespace/*"
        element={
          featureFlagEnabled(dashboardConfig.spec.dashboardConfig.disableModelServing) ? (
            <ModelServingProjectDetailsContextAdditions />
          ) : (
            <ProjectDetailsContextProvider />
          )
        }
      >
        <Route index element={<ProjectDetails />} />
        <Route path="spawner" element={<SpawnerPage />} />
        <Route path="spawner/:notebookName" element={<EditSpawnerPage />} />
        <Route
          path="metrics/model/:inferenceService"
          element={
            modelMetricsEnabled ? <DetailsPageMetricsWrapper /> : <Navigate replace to="/" />
          }
        />
        <Route path="*" element={<Navigate to="." />} />
      </Route>
      <Route path="*" element={<Navigate to="." />} />
    </Routes>
  );
};

export default ProjectViewRoutes;
