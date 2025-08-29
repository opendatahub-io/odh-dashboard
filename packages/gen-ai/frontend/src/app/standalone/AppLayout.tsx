import * as React from 'react';
import { Page } from '@patternfly/react-core';
import { DeploymentMode, logout, useModularArchContext, useSettings } from 'mod-arch-core';
import NavBar from '~/app/standalone/NavBar';
import AppNavSidebar from '~/app/standalone/AppNavSidebar';

interface IAppLayout {
  children: React.ReactNode;
}

const AppLayout: React.FunctionComponent<IAppLayout> = ({ children }) => {
  const { config } = useModularArchContext();
  const { deploymentMode } = config;
  const isStandalone = deploymentMode === DeploymentMode.Standalone;

  const { userSettings } = useSettings();
  const username = userSettings?.userId;

  return (
    <Page
      mainContainerId="primary-app-container"
      masthead={
        isStandalone ? (
          <NavBar
            username={username}
            onLogout={() => {
              logout().then(() => window.location.reload());
            }}
          />
        ) : undefined
      }
      isManagedSidebar={isStandalone}
      sidebar={isStandalone ? <AppNavSidebar /> : undefined}
      isContentFilled
    >
      {children}
    </Page>
  );
};

export { AppLayout };
