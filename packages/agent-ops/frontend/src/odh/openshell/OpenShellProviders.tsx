import * as React from 'react';
import { Link } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Flex, FlexItem, PageSection } from '@patternfly/react-core';
import { ExternalLinkAltIcon } from '@patternfly/react-icons';
import { AlertProvider } from 'openshell-dashboard/components';
import { SlotProvider } from 'openshell-dashboard/slots';
import { setApiBasePath, setSessionExpiredHandler } from 'openshell-dashboard/api';
import { OPENSHELL_SESSION_EXPIRED_EVENT, NATIVE_SANDBOXES_PATH } from './openShellAuth';
import {
  OpenShellConnectionProvider,
  OpenShellConnectionChip,
  OpenShellConnectGate,
} from './OpenShellConnection';
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
  // Rendered at the start (left) of the top bar — e.g. the workspace selector on
  // the landing page. Detail pages omit it.
  toolbarStart?: React.ReactNode;
};

const OpenShellProviders: React.FC<OpenShellProvidersProps> = ({ children, toolbarStart }) => (
  <QueryClientProvider client={queryClient}>
    <OpenShellConnectionProvider>
      <SlotProvider slots={{}}>
        <AlertProvider>
          <SelectedWorkspaceProvider>
            {/* Top bar in a PageSection so its horizontal padding matches the
                rest of the dashboard (the page content below uses its own
                PageSections). stickyTop keeps the connection controls in view. */}
            <PageSection hasBodyWrapper={false} className="pf-v6-u-py-md">
              <Flex
                justifyContent={{ default: 'justifyContentSpaceBetween' }}
                alignItems={{ default: 'alignItemsCenter' }}
              >
                <FlexItem>{toolbarStart}</FlexItem>
                <FlexItem>
                  <Flex gap={{ default: 'gapMd' }} alignItems={{ default: 'alignItemsCenter' }}>
                    {/* Native agent-sandbox CRs (Token A) — intentionally demoted
                        to a discreet top-right link, not a first-class tab. */}
                    <FlexItem>
                      <Link to={NATIVE_SANDBOXES_PATH} data-testid="native-projects-link">
                        In your projects <ExternalLinkAltIcon />
                      </Link>
                    </FlexItem>
                    <FlexItem>
                      <OpenShellConnectionChip />
                    </FlexItem>
                  </Flex>
                </FlexItem>
              </Flex>
            </PageSection>
            <OpenShellConnectGate>{children}</OpenShellConnectGate>
          </SelectedWorkspaceProvider>
        </AlertProvider>
      </SlotProvider>
    </OpenShellConnectionProvider>
  </QueryClientProvider>
);

export default OpenShellProviders;
