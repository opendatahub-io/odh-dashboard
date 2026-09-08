import * as React from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import {
  BrowserStorageContextProvider,
  DeploymentMode,
  ModularArchConfig,
  ModularArchContextProvider,
  NotificationContextProvider,
} from 'mod-arch-core';
import { createWorkspacesQueryClient } from '~/app/hooks/queryClient';
import { BFF_API_VERSION, URL_PREFIX } from '~/app/utilities/const';
import WorkspacesUpstreamProviders from './WorkspacesUpstreamProviders';

const modularArchConfig: ModularArchConfig = {
  deploymentMode: DeploymentMode.Federated,
  URL_PREFIX,
  BFF_API_VERSION,
};

type WorkspacesFederatedProvidersProps = {
  children: React.ReactNode;
};

const WorkspacesFederatedProviders: React.FC<WorkspacesFederatedProvidersProps> = ({
  children,
}) => {
  const [queryClient] = React.useState(createWorkspacesQueryClient);

  return (
    <ModularArchContextProvider config={modularArchConfig}>
      <BrowserStorageContextProvider>
        <NotificationContextProvider>
          <QueryClientProvider client={queryClient}>
            <WorkspacesUpstreamProviders>{children}</WorkspacesUpstreamProviders>
          </QueryClientProvider>
        </NotificationContextProvider>
      </BrowserStorageContextProvider>
    </ModularArchContextProvider>
  );
};

export default WorkspacesFederatedProviders;
