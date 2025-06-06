import React from 'react';
import { ModelRegistrySelectorContextProvider } from '~/app/context/ModelRegistrySelectorContext';
import ModelRegistryRoutes from '~/app/pages/modelRegistry/ModelRegistryRoutes';

const ModelRegistryWrapper: React.FC = () => {
  return (
    <ModelRegistrySelectorContextProvider>
      <ModelRegistryRoutes />
    </ModelRegistrySelectorContextProvider>
  );
};

export default ModelRegistryWrapper;
