import * as React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { ModelRegistrySelectorContextProvider } from '~/concepts/modelRegistry/context/ModelRegistrySelectorContext';
import ModelRegistryCoreLoader from './ModelRegistryCoreLoader';
import ModelRegistry from './screens/ModelRegistry';
import { ModelVersionsTabs } from './screens/const';
import ModelVersions from './screens/ModelVersions';

const ModelRegistryRoutes: React.FC = () => (
  <ModelRegistrySelectorContextProvider>
    <Routes>
      <Route
        path={'/:modelRegistry?/*'}
        element={
          <ModelRegistryCoreLoader
            getInvalidRedirectPath={(modelRegistry) => `/modelRegistry/${modelRegistry}`}
          />
        }
      >
        <Route index element={<ModelRegistry />} />
        <Route
          path="registeredModels/:registeredModelId"
          element={<ModelVersions tab={ModelVersionsTabs.VERSIONS} empty={false} />}
        />
        <Route path="*" element={<Navigate to="." />} />
      </Route>
    </Routes>
  </ModelRegistrySelectorContextProvider>
);

export default ModelRegistryRoutes;
