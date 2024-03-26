import * as React from 'react';
import { Outlet } from 'react-router';
import { MODEL_REGISTRY_DEFAULT_NAMESPACE } from '~/concepts/modelRegistry/const';
import { ModelRegistryContextProvider } from '~/concepts/modelRegistry/context/ModelRegistryContext';

const ModelRegistryCoreLoader: React.FC = () => (
  <ModelRegistryContextProvider namespace={MODEL_REGISTRY_DEFAULT_NAMESPACE}>
    <Outlet />
  </ModelRegistryContextProvider>
);
export default ModelRegistryCoreLoader;
