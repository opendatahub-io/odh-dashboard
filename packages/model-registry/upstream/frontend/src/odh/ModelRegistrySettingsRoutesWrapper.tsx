import React from 'react';
import { BrowserStorageContextProvider, NotificationContextProvider } from 'mod-arch-core';
import { ThemeProvider, Theme } from 'mod-arch-kubeflow';
import { ModelRegistrySelectorContextProvider } from '~/app/context/ModelRegistrySelectorContext';
import ModelRegistrySettingsRoutes from '~/app/pages/settings/ModelRegistrySettingsRoutes';
import UserInteractionProviderWrapper from '~/odh/components/UserInteractionProviderWrapper';
import OdhWrapper from '~/odh/OdhWrapper';

const ModelRegistryWrapper: React.FC = () => (
  <OdhWrapper>
    <ThemeProvider theme={Theme.Patternfly}>
      <BrowserStorageContextProvider>
        <NotificationContextProvider>
          <UserInteractionProviderWrapper>
            <ModelRegistrySelectorContextProvider>
              <ModelRegistrySettingsRoutes />
            </ModelRegistrySelectorContextProvider>
          </UserInteractionProviderWrapper>
        </NotificationContextProvider>
      </BrowserStorageContextProvider>
    </ThemeProvider>
  </OdhWrapper>
);

export default ModelRegistryWrapper;
