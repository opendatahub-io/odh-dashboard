import * as React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Flex, FlexItem, Stack, StackItem } from '@patternfly/react-core';
import { AlertProvider } from 'openshell-dashboard/components';
import { SlotProvider } from 'openshell-dashboard/slots';
import { setApiBasePath, setSessionExpiredHandler } from 'openshell-dashboard/api';
import { OPENSHELL_SESSION_EXPIRED_EVENT } from './openShellAuth';
import {
  OpenShellConnectionProvider,
  OpenShellConnectionChip,
  OpenShellConnectGate,
} from './OpenShellConnection';

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
};

const OpenShellProviders: React.FC<OpenShellProvidersProps> = ({ children }) => (
  <QueryClientProvider client={queryClient}>
    <OpenShellConnectionProvider>
      <SlotProvider slots={{}}>
        <AlertProvider>
          <Stack hasGutter>
            <StackItem>
              <Flex justifyContent={{ default: 'justifyContentFlexEnd' }}>
                <FlexItem>
                  <OpenShellConnectionChip />
                </FlexItem>
              </Flex>
            </StackItem>
            <StackItem isFilled>
              <OpenShellConnectGate>{children}</OpenShellConnectGate>
            </StackItem>
          </Stack>
        </AlertProvider>
      </SlotProvider>
    </OpenShellConnectionProvider>
  </QueryClientProvider>
);

export default OpenShellProviders;
