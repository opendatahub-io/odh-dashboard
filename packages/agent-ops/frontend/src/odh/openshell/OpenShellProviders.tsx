import * as React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AlertProvider } from 'openshell-dashboard/components';
import { SlotProvider } from 'openshell-dashboard/slots';
import { setApiBasePath, setSessionExpiredHandler } from 'openshell-dashboard/api';

setApiBasePath('/openshell');
setSessionExpiredHandler(() => {
  window.location.assign('/');
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
