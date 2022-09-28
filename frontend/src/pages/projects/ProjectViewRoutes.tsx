import * as React from 'react';
import { Navigate, Routes, Route } from 'react-router-dom';
import ProjectDetails from './screens/detail/ProjectDetails';
import ProjectView from './screens/projects/ProjectView';
import ProjectDetailsContextProvider from './ProjectDetailsContext';

const ProjectViewRoutes: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<ProjectView />} />
      <Route
        path="/:namespace/*"
        element={
          <ProjectDetailsContextProvider>
            <ProjectDetails />
          </ProjectDetailsContextProvider>
        }
      />
      <Route path="*" element={<Navigate to="." />} />
    </Routes>
  );
};

export default ProjectViewRoutes;
