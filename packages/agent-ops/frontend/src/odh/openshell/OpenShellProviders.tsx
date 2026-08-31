import * as React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AlertProvider } from 'openshell-dashboard/components';
import { SlotProvider } from 'openshell-dashboard/slots';
import { setApiBasePath, setSessionExpiredHandler } from 'openshell-dashboard/api';
import { OPENSHELL_SESSION_EXPIRED_EVENT } from './openShellAuth';
import { OpenShellConnectionProvider, OpenShellConnectGate } from './OpenShellConnection';
import { SelectedWorkspaceProvider } from './WorkspaceContext';

setApiBasePath('/openshell');
// When embedded in RHOAI, the OpenShell (Token B) session is independent of the
// RHOAI (Token A) session. A hard redirect to '/' would tear down the whole
// dashboard context for a *second-service* session expiry, so instead emit a
// non-destructive event the OpenShell area listens for to show inline reconnect.
setSessionExpiredHandler(() => {
  window.dispatchEvent(new CustomEvent(OPENSHELL_SESSION_EXPIRED_EVENT));
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, refetchOnWindowFocus: false },
  },
});

type OpenShellProvidersProps = {
  children: React.ReactNode;
  requireConnection?: boolean;
};

const OpenShellProviders: React.FC<OpenShellProvidersProps> = ({
  children,
  requireConnection = true,
}) => (
  <QueryClientProvider client={queryClient}>
    <OpenShellConnectionProvider>
      <SlotProvider slots={{}}>
        <AlertProvider>
          <SelectedWorkspaceProvider>
            {requireConnection ? <OpenShellConnectGate>{children}</OpenShellConnectGate> : children}
          </SelectedWorkspaceProvider>
        </AlertProvider>
      </SlotProvider>
    </OpenShellConnectionProvider>
  </QueryClientProvider>
);

export default OpenShellProviders;
