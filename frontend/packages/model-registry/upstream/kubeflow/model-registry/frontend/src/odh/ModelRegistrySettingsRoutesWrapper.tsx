import React from 'react';
import { ModelRegistrySelectorContextProvider } from '~/app/context/ModelRegistrySelectorContext';
import ModelRegistrySettingsRoutes from '~/app/pages/settings/ModelRegistrySettingsRoutes';

const ModelRegistryWrapper: React.FC = () => {
  return (
    <ModelRegistrySelectorContextProvider>
      <ModelRegistrySettingsRoutes />
    </ModelRegistrySelectorContextProvider>
  );
};

export default ModelRegistryWrapper;
