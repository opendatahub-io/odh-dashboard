import * as React from 'react';
import { Navigate, Route } from 'react-router-dom';
import ProjectsRoutes from '~/concepts/projects/ProjectsRoutes';
import ModelRegistryEmpty from './ModelRegistryEmpty';

const ModelServingRoutes: React.FC = () => (
  <ProjectsRoutes>
    <Route index element={<ModelRegistryEmpty />} />
    <Route path="*" element={<Navigate to="." />} />
  </ProjectsRoutes>
);

export default ModelServingRoutes;
