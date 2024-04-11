import * as React from 'react';
import { Navigate, Route } from 'react-router-dom';
import ProjectsRoutes from '~/concepts/projects/ProjectsRoutes';
import ModelRegistryCoreLoader from './ModelRegistryCoreLoader';
import ModelRegistry from './screens/ModelRegistry';

const ModelServingRoutes: React.FC = () => (
  <ProjectsRoutes>
    <Route path={'/:modelRegistry?/*'} element={<ModelRegistryCoreLoader />}>
      <Route index element={<ModelRegistry />} />
      <Route path="*" element={<Navigate to="." />} />
    </Route>
  </ProjectsRoutes>
);

export default ModelServingRoutes;
