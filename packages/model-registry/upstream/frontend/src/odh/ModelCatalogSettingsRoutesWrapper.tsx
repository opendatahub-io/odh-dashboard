import React from 'react';
import { BrowserStorageContextProvider, NotificationContextProvider } from 'mod-arch-core';
import { ThemeProvider, Theme } from 'mod-arch-kubeflow';
import ModelCatalogSettingsRoutes from '~/app/pages/modelCatalogSettings/ModelCatalogSettingsRoutes';

const ModelCatalogSettingsRoutesWrapper: React.FC = () => {
  return (
    <ThemeProvider theme={Theme.Patternfly}>
      <BrowserStorageContextProvider>
        <NotificationContextProvider>
          <ModelCatalogSettingsRoutes />
        </NotificationContextProvider>
      </BrowserStorageContextProvider>
    </ThemeProvider>
  );
};

export default ModelCatalogSettingsRoutesWrapper;
