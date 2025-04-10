import * as React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { ModelRegistrySelectorContext } from '~/concepts/modelRegistry/context/ModelRegistrySelectorContext';
import { ModelRegistryContextProvider } from '~/concepts/modelRegistry/context/ModelRegistryContext';
import ModelCatalogCoreLoader from './ModelCatalogCoreLoader';
import ModelDetailsPage from './screens/ModelDetailsPage';
import ModelCatalog from './screens/ModelCatalog';
import RegisterCatalogModel from './screens/RegisterCatalogModel';

const ModelCatalogRoutes: React.FC = () => {
  const { preferredModelRegistry } = React.useContext(ModelRegistrySelectorContext);
  return (
    <Routes>
      <Route path="/" element={<ModelCatalogCoreLoader />}>
        <Route index element={<ModelCatalog />} />
        <Route path=":sourceName/:repositoryName/:modelName/:tag">
          <Route index element={<ModelDetailsPage />} />
          <Route
            path="register"
            element={
              <ModelRegistryContextProvider
                modelRegistryName={preferredModelRegistry?.metadata.name || null}
              >
                <RegisterCatalogModel />
              </ModelRegistryContextProvider>
            }
          />

          <Route path="*" element={<Navigate to="." />} />
        </Route>
        <Route path="*" element={<Navigate to="." />} />
      </Route>
    </Routes>
  );
};

export default ModelCatalogRoutes;
