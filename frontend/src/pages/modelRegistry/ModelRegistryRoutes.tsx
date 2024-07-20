import * as React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import ModelRegistryCoreLoader from './ModelRegistryCoreLoader';
import ModelRegistry from './screens/ModelRegistry';
import { ModelVersionsTab } from './screens/ModelVersions/const';
import ModelVersions from './screens/ModelVersions/ModelVersions';
import ModelVersionsDetails from './screens/ModelVersionDetails/ModelVersionDetails';
import { ModelVersionDetailsTab } from './screens/ModelVersionDetails/const';
import ModelVersionsArchive from './screens/ModelVersionsArchive/ModelVersionsArchive';
import ModelVersionsArchiveDetails from './screens/ModelVersionsArchive/ModelVersionArchiveDetails';
import RegisteredModelsArchive from './screens/RegisteredModelsArchive/RegisteredModelsArchive';
import RegisteredModelsArchiveDetails from './screens/RegisteredModelsArchive/RegisteredModelArchiveDetails';
import RegisterModel from './screens/RegisterModel/RegisterModel';

const ModelRegistryRoutes: React.FC = () => (
  <Routes>
    <Route
      path={'/:modelRegistry?/*'}
      element={
        <ModelRegistryCoreLoader
          getInvalidRedirectPath={(modelRegistry) => `/modelRegistry/${modelRegistry}`}
        />
      }
    >
      <Route index element={<ModelRegistry empty={false} />} />
      <Route path="registeredModels/:registeredModelId">
        <Route index element={<Navigate to={ModelVersionsTab.VERSIONS} />} />
        <Route
          path={ModelVersionsTab.VERSIONS}
          element={<ModelVersions tab={ModelVersionsTab.VERSIONS} empty={false} />}
        />
        <Route
          path={ModelVersionsTab.DETAILS}
          element={<ModelVersions tab={ModelVersionsTab.DETAILS} empty={false} />}
        />
        <Route path="versions/:modelVersionId">
          <Route index element={<Navigate to={ModelVersionDetailsTab.DETAILS} />} />
          <Route
            path={ModelVersionDetailsTab.DETAILS}
            element={<ModelVersionsDetails tab={ModelVersionDetailsTab.DETAILS} empty={false} />}
          />
          <Route
            path={ModelVersionDetailsTab.REGISTERED_DEPLOYMENTS}
            element={
              <ModelVersionsDetails
                tab={ModelVersionDetailsTab.REGISTERED_DEPLOYMENTS}
                empty={false}
              />
            }
          />
          <Route path="*" element={<Navigate to="." />} />
        </Route>
        <Route path="versions/archive">
          <Route index element={<ModelVersionsArchive empty={false} />} />
          <Route path=":modelVersionId">
            <Route index element={<Navigate to={ModelVersionDetailsTab.DETAILS} />} />
            <Route
              path={ModelVersionDetailsTab.DETAILS}
              element={
                <ModelVersionsArchiveDetails tab={ModelVersionDetailsTab.DETAILS} empty={false} />
              }
            />
            <Route
              path={ModelVersionDetailsTab.REGISTERED_DEPLOYMENTS}
              element={
                <ModelVersionsArchiveDetails
                  tab={ModelVersionDetailsTab.REGISTERED_DEPLOYMENTS}
                  empty={false}
                />
              }
            />
            <Route path="*" element={<Navigate to="." />} />
          </Route>
          <Route path="*" element={<Navigate to="." />} />
        </Route>
        <Route path="*" element={<Navigate to="." />} />
      </Route>
      <Route path="registeredModels/archive">
        <Route index element={<RegisteredModelsArchive empty={false} />} />
        <Route path=":registeredModelId">
          <Route index element={<Navigate to={ModelVersionsTab.VERSIONS} />} />
          <Route
            path={ModelVersionsTab.DETAILS}
            element={
              <RegisteredModelsArchiveDetails tab={ModelVersionsTab.DETAILS} empty={false} />
            }
          />
          <Route
            path={ModelVersionsTab.VERSIONS}
            element={
              <RegisteredModelsArchiveDetails tab={ModelVersionsTab.VERSIONS} empty={false} />
            }
          />
          <Route path="*" element={<Navigate to="." />} />
        </Route>
        <Route path="*" element={<Navigate to="." />} />
      </Route>
      <Route path="registerModel" element={<RegisterModel />} />
      <Route path="*" element={<Navigate to="." />} />
    </Route>
  </Routes>
);

export default ModelRegistryRoutes;
