import * as React from 'react';
import { Navigate, Routes, Route } from 'react-router-dom';
import ProjectDetails from './screens/detail/ProjectDetails';
import ProjectView from './screens/projects/ProjectView';
import ProjectDetailsContextProvider from './ProjectDetailsContext';
import SpawnerPage from './screens/spawner/SpawnerPage';
import EditSpawnerPage from './screens/spawner/EditSpawnerPage';
import DetailsPageMetricsWrapper from '../modelServing/screens/projects/DetailsPageMetricsWrapper';

const ProjectViewRoutes: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<ProjectView />} />
      <Route path="/:namespace/*" element={<ProjectDetailsContextProvider />}>
        <Route index element={<ProjectDetails />} />
        <Route path="spawner" element={<SpawnerPage />} />
        <Route path="spawner/:notebookName" element={<EditSpawnerPage />} />
        <Route path="metrics/model/:inferenceService" element={<DetailsPageMetricsWrapper />} />
        <Route path="*" element={<Navigate to="." />} />
      </Route>
      <Route path="*" element={<Navigate to="." />} />
    </Routes>
  );
};

export default ProjectViewRoutes;
