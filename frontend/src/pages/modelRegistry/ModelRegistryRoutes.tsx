import * as React from 'react';
import { Navigate, Route } from 'react-router-dom';
import ProjectsRoutes from '~/concepts/projects/ProjectsRoutes';
import ModelRegistryCoreLoader from './ModelRegistryCoreLoader';
import ModelRegistry from './screens/ModelRegistry';
import { ModelVersionsTabs } from './screens/const';
import ModelVersions from './screens/ModelVersions';

const ModelRegistryRoutes: React.FC = () => (
  <ProjectsRoutes>
    <Route path={'/:modelRegistry?/*'} element={<ModelRegistryCoreLoader />}>
      <Route index element={<ModelRegistry />} />
      <Route path={`${process.env.MODEL_REGISTRY_NAME}`} element={<ModelRegistry />} />
      <Route
        path={`${process.env.MODEL_REGISTRY_NAME}/registered_models/:registeredModelId`}
        element={<ModelVersions tab={ModelVersionsTabs.VERSIONS} empty={false} />}
      />
      <Route path="*" element={<Navigate to="." />} />
    </Route>
  </ProjectsRoutes>
);

export default ModelRegistryRoutes;
