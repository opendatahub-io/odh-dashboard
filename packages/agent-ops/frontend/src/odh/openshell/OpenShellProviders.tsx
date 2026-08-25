import * as React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AlertProvider } from 'openshell-dashboard/components';
import { SlotProvider } from 'openshell-dashboard/slots';
import { setApiBasePath, setSessionExpiredHandler } from 'openshell-dashboard/api';

setApiBasePath('/openshell');
// When embedded in RHOAI, the OpenShell (Token B) session is independent of the
// RHOAI (Token A) session. A hard redirect to '/' would tear down the whole
// dashboard context for a *second-service* session expiry, so instead emit a
// non-destructive event the OpenShell area listens for to show inline reconnect.
export const OPENSHELL_SESSION_EXPIRED_EVENT = 'openshell:session-expired';
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
};

const OpenShellProviders: React.FC<OpenShellProvidersProps> = ({ children }) => (
  <QueryClientProvider client={queryClient}>
    <SlotProvider slots={{}}>
      <AlertProvider>{children}</AlertProvider>
    </SlotProvider>
  </QueryClientProvider>
);

export default OpenShellProviders;
