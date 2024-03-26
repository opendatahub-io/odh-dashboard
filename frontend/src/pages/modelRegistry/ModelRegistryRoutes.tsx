import * as React from 'react';
import { Navigate, Route } from 'react-router-dom';
import ProjectsRoutes from '~/concepts/projects/ProjectsRoutes';
import ModelRegistryEmpty from './ModelRegistryEmpty';
import ModelRegistryCoreLoader from './ModelRegistryCoreLoader';

const ModelServingRoutes: React.FC = () => (
  <ProjectsRoutes>
    <Route path={'/:modelRegistry?/*'} element={<ModelRegistryCoreLoader />}>
      <Route index element={<ModelRegistryEmpty />} />
      <Route path="*" element={<Navigate to="." />} />
    </Route>
  </ProjectsRoutes>
);

export default ModelServingRoutes;
