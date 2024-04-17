import * as React from 'react';
import { Outlet } from 'react-router';

import { ModelRegistryContextProvider } from '~/concepts/modelRegistry/context/ModelRegistryContext';

// TODO: Parametrize this to make the route dynamic
const ModelRegistryCoreLoader: React.FC = () => (
  <ModelRegistryContextProvider modelRegistryName="modelregistry-sample">
    <Outlet />
  </ModelRegistryContextProvider>
);
export default ModelRegistryCoreLoader;
