import * as React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { ModelRegistrySelectorContextProvider } from '~/concepts/modelRegistry/context/ModelRegistrySelectorContext';
import ModelRegistryCoreLoader from './ModelRegistryCoreLoader';
import ModelRegistry from './screens/ModelRegistry';
import { ModelVersionsTabs } from './screens/const';
import ModelVersions from './screens/ModelVersions';
import ModelVersionsDetails from './screens/ModelVersionDetails/ModelVersionDetails';
import { ModelVersionDetailsTab } from './screens/ModelVersionDetails/const';

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
        <Route path="registeredModels/:registeredModelId">
          <Route index element={<Navigate to={ModelVersionsTabs.VERSIONS} />} />
          <Route
            path={ModelVersionsTabs.VERSIONS}
            element={<ModelVersions tab={ModelVersionsTabs.VERSIONS} empty={false} />}
          />
          <Route
            path={ModelVersionsTabs.DETAILS}
            element={<ModelVersions tab={ModelVersionsTabs.DETAILS} empty={false} />}
          />
          <Route path="versions/:modelVersionId">
            <Route index element={<Navigate to={ModelVersionDetailsTab.DETAILS} />} />
            <Route
              path={ModelVersionDetailsTab.DETAILS}
              element={<ModelVersionsDetails tab={ModelVersionDetailsTab.DETAILS} empty={false} />}
            />
            <Route path="*" element={<Navigate to="." />} />
          </Route>
          <Route path="*" element={<Navigate to="." />} />
        </Route>
        <Route path="*" element={<Navigate to="." />} />
      </Route>
    </Routes>
  </ModelRegistrySelectorContextProvider>
);

export default ModelRegistryRoutes;
