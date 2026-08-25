import * as React from 'react';
import { Link } from 'react-router-dom';
import {
  Button,
  Bullseye,
  EmptyState,
  EmptyStateBody,
  EmptyStateActions,
  EmptyStateFooter,
  Flex,
  FlexItem,
  Label,
  Spinner,
} from '@patternfly/react-core';
import {
  ConnectedIcon,
  DisconnectedIcon,
  ExclamationCircleIcon,
} from '@patternfly/react-icons';
import { setAuthTokenGetter } from 'openshell-dashboard/api';
import {
  connectOpenShell,
  disconnectOpenShell,
  getOpenShellToken,
  subscribeOpenShellConnection,
  OPENSHELL_SESSION_EXPIRED_EVENT,
  type OpenShellConnectionState,
} from './openShellAuth';

// Sibling page for native agent-sandbox CRs (Token A only) — reachable without
// the OpenShell second auth. Kept in sync with the nav registration.
const NATIVE_SANDBOXES_PATH = '/ai-hub/agent-sandboxes';

type OpenShellConnectionContextValue = {
  state: OpenShellConnectionState;
  connect: () => void;
  disconnect: () => void;
};

const OpenShellConnectionContext = React.createContext<OpenShellConnectionContextValue>({
  state: { status: 'idle', username: null, error: null },
  connect: () => undefined,
  disconnect: () => undefined,
});

export const useOpenShellConnection = (): OpenShellConnectionContextValue =>
  React.useContext(OpenShellConnectionContext);

export const OpenShellConnectionProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [state, setState] = React.useState<OpenShellConnectionState>({
    status: 'idle',
    username: null,
    error: null,
  });

  React.useEffect(() => {
    // Supply Token B to the OpenShell package on every request (silent-first).
    setAuthTokenGetter(getOpenShellToken);
    const unsubscribe = subscribeOpenShellConnection(setState);
    // Kick a silent connect attempt on mount (zero-click when SSO is live).
    void getOpenShellToken();

    // A second-service session expiry must not tear down the RHOAI context;
    // reflect it inline and attempt a silent reconnect.
    const onExpired = () => {
      void getOpenShellToken();
    };
    window.addEventListener(OPENSHELL_SESSION_EXPIRED_EVENT, onExpired);
    return () => {
      unsubscribe();
      window.removeEventListener(OPENSHELL_SESSION_EXPIRED_EVENT, onExpired);
      setAuthTokenGetter(null);
    };
  }, []);

  const value = React.useMemo<OpenShellConnectionContextValue>(
    () => ({
      state,
      connect: () => void connectOpenShell(),
      disconnect: () => void disconnectOpenShell(),
    }),
    [state],
  );

  return (
    <OpenShellConnectionContext.Provider value={value}>
      {children}
    </OpenShellConnectionContext.Provider>
  );
};

/** Compact connection status shown in the OpenShell area (never the global masthead). */
export const OpenShellConnectionChip: React.FC = () => {
  const { state, connect, disconnect } = useOpenShellConnection();

  if (state.status === 'unconfigured') {
    return null;
  }

  if (state.status === 'connecting') {
    return (
      <Label color="blue" icon={<Spinner size="sm" />} data-testid="openshell-connection-chip">
        Connecting to OpenShell…
      </Label>
    );
  }

  if (state.status === 'connected') {
    return (
      <Flex
        gap={{ default: 'gapSm' }}
        alignItems={{ default: 'alignItemsCenter' }}
        data-testid="openshell-connection-chip"
      >
        <FlexItem>
          <Label color="green" icon={<ConnectedIcon />}>
            OpenShell{state.username ? ` · ${state.username}` : ''}
          </Label>
        </FlexItem>
        <FlexItem>
          <Button variant="link" isInline onClick={disconnect}>
            Disconnect
          </Button>
        </FlexItem>
      </Flex>
    );
  }

  return (
    <Flex
      gap={{ default: 'gapSm' }}
      alignItems={{ default: 'alignItemsCenter' }}
      data-testid="openshell-connection-chip"
    >
      <FlexItem>
        <Label
          color={state.status === 'error' ? 'red' : 'grey'}
          icon={state.status === 'error' ? <ExclamationCircleIcon /> : <DisconnectedIcon />}
        >
          OpenShell disconnected
        </Label>
      </FlexItem>
      <FlexItem>
        <Button variant="link" isInline onClick={connect}>
          Reconnect
        </Button>
      </FlexItem>
    </Flex>
  );
};

/**
 * Renders children only when connected to OpenShell. Otherwise shows a
 * non-blocking connect CTA plus a link to the native (Token A) sandboxes page,
 * so a user who only wants their own sandboxes is never wall-blocked.
 */
export const OpenShellConnectGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { state, connect } = useOpenShellConnection();

  if (state.status === 'connected') {
    return <>{children}</>;
  }

  if (state.status === 'idle' || state.status === 'connecting') {
    return (
      <Bullseye>
        <Spinner aria-label="Connecting to OpenShell" />
      </Bullseye>
    );
  }

  const unconfigured = state.status === 'unconfigured';
  return (
    <Bullseye>
      <EmptyState
        titleText={unconfigured ? 'OpenShell is not configured' : 'Connect to OpenShell'}
        icon={ConnectedIcon}
        data-testid="openshell-connect-gate"
      >
        <EmptyStateBody>
          {unconfigured
            ? 'This deployment has no OpenShell service configured. You can still manage the agent sandboxes in your own projects.'
            : 'OpenShell is a separate service. Connect to view its workspaces, sandboxes, and providers. If single sign-on is available this is instant.'}
        </EmptyStateBody>
        <EmptyStateFooter>
          <EmptyStateActions>
            {!unconfigured && (
              <Button variant="primary" icon={<ConnectedIcon />} onClick={connect} data-testid="openshell-connect-button">
                Connect to OpenShell
              </Button>
            )}
          </EmptyStateActions>
          <EmptyStateActions>
            <Flex>
              <FlexItem>
                <Link to={NATIVE_SANDBOXES_PATH}>Go to sandboxes in your projects</Link>
              </FlexItem>
            </Flex>
          </EmptyStateActions>
          {state.error && (
            <EmptyStateBody data-testid="openshell-connect-error">{state.error}</EmptyStateBody>
          )}
        </EmptyStateFooter>
      </EmptyState>
    </Bullseye>
  );
};
