import * as React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import ModelRegistry from './screens/ModelRegistry';
import ModelRegistryCoreLoader from './ModelRegistryCoreLoader';
import { modelRegistryUrl } from './screens/routeUtils';
import RegisteredModelsArchive from './screens/RegisteredModelsArchive/RegisteredModelsArchive';
import { ModelVersionsTab } from './screens/ModelVersions/const';
import ModelVersions from '~/odh/components/OdhModelVersions';
import { ModelVersionDetailsTab } from './screens/ModelVersionDetails/const';
import ModelVersionsDetails from '~/odh/components/OdhModelVersionDetails';
import ModelVersionsArchive from './screens/ModelVersionsArchive/ModelVersionsArchive';
import ModelVersionsArchiveDetails from './screens/ModelVersionsArchive/ModelVersionArchiveDetails';
import ArchiveModelVersionDetails from './screens/ModelVersionsArchive/ArchiveModelVersionDetails';
import RegisteredModelsArchiveDetails from './screens/RegisteredModelsArchive/RegisteredModelArchiveDetails';
import RegisterModel from './screens/RegisterModel/RegisterModel';
import RegisterVersion from './screens/RegisterModel/RegisterVersion';
import { generateVersionDetailsTabExtensionRoutes } from '~/odh/VersionDetailsTabExtensionRoutes';
import { useExtensions } from '@odh-dashboard/plugin-core';
import { isModelRegistryVersionDetailsTabExtension } from '~/odh/extension-points';

const ModelRegistryRoutes: React.FC = () => {
  const tabExtensions = useExtensions(isModelRegistryVersionDetailsTabExtension);
  return(
    <Routes>
      <Route
        path={'/:modelRegistry?/*'}
        element={
          <ModelRegistryCoreLoader
            getInvalidRedirectPath={(modelRegistry) => modelRegistryUrl(modelRegistry)}
          />
        }
      >
        <Route index element={<ModelRegistry empty={false} />} />
        <Route path="registeredModels/:registeredModelId">
          <Route index element={<Navigate to={ModelVersionsTab.OVERVIEW} replace />} />
          <Route
            path={ModelVersionsTab.VERSIONS}
            element={<ModelVersions tab={ModelVersionsTab.VERSIONS} empty={false} />}
          />
          <Route
            path={ModelVersionsTab.OVERVIEW}
            element={<ModelVersions tab={ModelVersionsTab.OVERVIEW} empty={false} />}
          />
          <Route path="registerVersion" element={<RegisterVersion />} />
          <Route path="versions/:modelVersionId">
            <Route index element={<Navigate to={ModelVersionDetailsTab.DETAILS} replace />} />
            <Route
              path={ModelVersionDetailsTab.DETAILS}
              element={<ModelVersionsDetails tab={ModelVersionDetailsTab.DETAILS} empty={false} />}
            />
            {generateVersionDetailsTabExtensionRoutes({ tabExtensions })}
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
              {generateVersionDetailsTabExtensionRoutes({ tabExtensions, isModelVersionsArchiveDetails: true })}

              <Route path="*" element={<Navigate to="." />} />
            </Route>
            <Route path="*" element={<Navigate to="." />} />
          </Route>
          <Route path="*" element={<Navigate to="." />} />
        </Route>
        <Route path="registeredModels/archive">
          <Route index element={<RegisteredModelsArchive empty={false} />} />
          <Route path=":registeredModelId">
            <Route index element={<Navigate to={ModelVersionsTab.OVERVIEW} replace />} />
            <Route
              path={ModelVersionsTab.OVERVIEW}
              element={
                <RegisteredModelsArchiveDetails tab={ModelVersionsTab.OVERVIEW} empty={false} />
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
              {generateVersionDetailsTabExtensionRoutes({ tabExtensions, isArchiveModelVersionDetails: true })}

              <Route path="*" element={<Navigate to="." />} />
            </Route>
            <Route path="*" element={<Navigate to="." />} />
          </Route>
          <Route path="*" element={<Navigate to="." />} />
        </Route>
        <Route path="registerModel" element={<RegisterModel />} />
        <Route path="registerVersion" element={<RegisterVersion />} />
        <Route path="*" element={<Navigate to="." />} />
      </Route>
    </Routes>
  );
}

export default ModelRegistryRoutes;
