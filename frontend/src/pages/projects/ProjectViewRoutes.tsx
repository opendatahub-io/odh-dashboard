import * as React from 'react';
import { Navigate, Routes, Route } from 'react-router-dom';
import ProjectInferenceMetricsWrapper from '~/pages/modelServing/screens/projects/ProjectInferenceMetricsWrapper';
import useModelMetricsEnabled from '~/pages/modelServing/useModelMetricsEnabled';
import ProjectRuntimeMetricsWrapper from '~/pages/modelServing/screens/projects/ProjectRuntimeMetricsWrapper';
import ProjectDetails from './screens/detail/ProjectDetails';
import ProjectView from './screens/projects/ProjectView';
import ProjectDetailsContextProvider from './ProjectDetailsContext';
import SpawnerPage from './screens/spawner/SpawnerPage';
import EditSpawnerPage from './screens/spawner/EditSpawnerPage';

const ProjectViewRoutes: React.FC = () => {
  const [modelMetricsEnabled] = useModelMetricsEnabled();

  return (
    <Routes>
      <Route path="/" element={<ProjectView />} />
      <Route path="/:namespace/*" element={<ProjectDetailsContextProvider />}>
        <Route index element={<ProjectDetails />} />
        <Route path="spawner" element={<SpawnerPage />} />
        <Route path="spawner/:notebookName" element={<EditSpawnerPage />} />
        {modelMetricsEnabled && (
          <>
            <Route
              path="metrics/model/:inferenceService/:tab?"
              element={<ProjectInferenceMetricsWrapper />}
            />
            <Route path="metrics/runtime" element={<ProjectRuntimeMetricsWrapper />} />
          </>
        )}
        <Route path="*" element={<Navigate to="." />} />
      </Route>
      <Route path="*" element={<Navigate to="." />} />
    </Routes>
  );
};

export default ProjectViewRoutes;
