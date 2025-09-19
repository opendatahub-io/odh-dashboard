import * as React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { modelRegistryRoute } from '#~/routes/modelRegistry/registryBase';
import { buildV2RedirectRoutes } from '#~/utilities/v2Redirect';
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
import RegisterVersion from './screens/RegisterModel/RegisterVersion';
import ArchiveModelVersionDetails from './screens/ModelVersionsArchive/ArchiveModelVersionDetails';
import { v2RedirectMap } from './v2Redirects';

const ModelRegistryRoutes: React.FC = () => (
  <Routes>
    <Route
      path={'/:modelRegistry?/*'}
      element={
        <ModelRegistryCoreLoader
          getInvalidRedirectPath={(modelRegistry) => modelRegistryRoute(modelRegistry)}
        />
      }
    >
      <Route index element={<ModelRegistry empty={false} />} />
      <Route path="registered-models/:registeredModelId">
        <Route index element={<Navigate to={ModelVersionsTab.VERSIONS} replace />} />
        <Route
          path={ModelVersionsTab.VERSIONS}
          element={<ModelVersions tab={ModelVersionsTab.VERSIONS} empty={false} />}
        />
        <Route
          path={ModelVersionsTab.DETAILS}
          element={<ModelVersions tab={ModelVersionsTab.DETAILS} empty={false} />}
        />
        <Route path="register/version" element={<RegisterVersion />} />
        <Route path="versions/:modelVersionId">
          <Route index element={<Navigate to={ModelVersionDetailsTab.DETAILS} replace />} />
          <Route
            path={ModelVersionDetailsTab.DETAILS}
            element={<ModelVersionsDetails tab={ModelVersionDetailsTab.DETAILS} empty={false} />}
          />
          <Route
            path={ModelVersionDetailsTab.DEPLOYMENTS}
            element={
              <ModelVersionsDetails tab={ModelVersionDetailsTab.DEPLOYMENTS} empty={false} />
            }
          />
          <Route path="*" element={<Navigate to="." />} />
        </Route>
        <Route path="versions/archive">
          <Route index element={<ModelVersionsArchive empty={false} />} />
          <Route path=":modelVersionId">
            <Route index element={<Navigate to={ModelVersionDetailsTab.DETAILS} replace />} />
            <Route
              path={ModelVersionDetailsTab.DETAILS}
              element={
                <ModelVersionsArchiveDetails tab={ModelVersionDetailsTab.DETAILS} empty={false} />
              }
            />
            <Route
              path={ModelVersionDetailsTab.DEPLOYMENTS}
              element={
                <ModelVersionsArchiveDetails
                  tab={ModelVersionDetailsTab.DEPLOYMENTS}
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
      <Route path="registered-models/archive">
        <Route index element={<RegisteredModelsArchive empty={false} />} />
        <Route path=":registeredModelId">
          <Route index element={<Navigate to={ModelVersionsTab.VERSIONS} replace />} />
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
          <Route path="versions/:modelVersionId">
            <Route index element={<Navigate to={ModelVersionDetailsTab.DETAILS} replace />} />
            <Route
              path={ModelVersionDetailsTab.DETAILS}
              element={
                <ArchiveModelVersionDetails tab={ModelVersionDetailsTab.DETAILS} empty={false} />
              }
            />
            <Route
              path={ModelVersionDetailsTab.DEPLOYMENTS}
              element={
                <ArchiveModelVersionDetails
                  tab={ModelVersionDetailsTab.DEPLOYMENTS}
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
      <Route path="register/model" element={<RegisterModel />} />
      <Route path="register/version" element={<RegisterVersion />} />
      {buildV2RedirectRoutes(v2RedirectMap)}
      <Route path="*" element={<Navigate to="." />} />
    </Route>
  </Routes>
);

export default ModelRegistryRoutes;
