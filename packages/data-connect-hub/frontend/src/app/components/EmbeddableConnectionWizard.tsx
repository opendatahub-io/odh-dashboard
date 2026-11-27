import React from 'react';
import { getInstance, init, loadRemote, registerRemotes } from '@module-federation/runtime';
import { Alert, Bullseye, Spinner } from '@patternfly/react-core';
import { Tearsheet, TearsheetBody, TearsheetHeader } from '@patternfly/react-component-groups';
import { SupportedArea, useIsAreaAvailable } from '@odh-dashboard/plugin-core/areas';
import type { EmbeddableConnectionWizardProps } from '@odh-dashboard/data-connect-hub/types';

const DATA_CONNECT_HUB_ENTRY = '/_mf/dataConnectHub/remoteEntry.js';
const REMOTE_MODULE = 'dataConnectHub/EmbeddableConnectionWizard';

let hasRegisteredRemote = false;

const ConnectionWizardUnavailableFallback: React.FC = () => (
  <Alert
    variant="danger"
    isInline
    title="Connection wizard unavailable"
    data-testid="connection-wizard-unavailable"
  >
    The connection wizard is not available in this environment.
  </Alert>
);

type RemoteConnectionWizardErrorBoundaryProps = {
  isOpen: boolean;
  resetSession: number;
  unavailableFallback?: React.ReactNode;
  onAvailabilityChange?: EmbeddableConnectionWizardProps['onAvailabilityChange'];
  children: React.ReactNode;
};

class RemoteConnectionWizardErrorBoundary extends React.Component<
  RemoteConnectionWizardErrorBoundaryProps,
  { hasError: boolean; resetSession: number }
> {
  state = { hasError: false, resetSession: 0 };

  static getDerivedStateFromProps(
    props: RemoteConnectionWizardErrorBoundaryProps,
    state: { hasError: boolean; resetSession: number },
  ) {
    if (props.resetSession !== state.resetSession) {
      return { hasError: false, resetSession: props.resetSession };
    }
    return null;
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch() {
    this.props.onAvailabilityChange?.({ status: 'unavailable', reason: 'remote' });
  }

  render() {
    if (this.state.hasError && !this.props.isOpen) {
      return null;
    }
    if (this.state.hasError) {
      return this.props.unavailableFallback ?? <ConnectionWizardUnavailableFallback />;
    }
    return this.props.children;
  }
}

const registerDataConnectHubRemote = (): void => {
  if (hasRegisteredRemote) {
    return;
  }

  const remote = {
    name: 'dataConnectHub',
    entry: DATA_CONNECT_HUB_ENTRY,
  };

  if (getInstance()) {
    registerRemotes([remote], { force: true });
  } else {
    init({
      name: 'connectionWizardConsumer',
      remotes: [remote],
    });
  }
  hasRegisteredRemote = true;
};

/**
 * Consumer-facing loader for the federated connection wizard. Only the
 * availability-aware public facade is exposed by the DCH remote.
 */
const EmbeddableConnectionWizard: React.FC<EmbeddableConnectionWizardProps> = ({
  isOpen,
  namespace,
  unavailableFallback,
  onAvailabilityChange,
  onClose,
  tearsheetStackLevel,
  ...wizardProps
}) => {
  const areaAvailability = useIsAreaAvailable(SupportedArea.PLUGIN_DATA_CONNECT_HUB);
  const [remoteComponent, setRemoteComponent] =
    React.useState<React.ComponentType<EmbeddableConnectionWizardProps> | null>(null);
  const [isRemoteLoading, setIsRemoteLoading] = React.useState(true);
  const [isRemoteUnavailable, setIsRemoteUnavailable] = React.useState(false);
  const [isFeatureUnavailable, setIsFeatureUnavailable] = React.useState(false);
  const [remoteRenderSession, setRemoteRenderSession] = React.useState(0);
  const onAvailabilityChangeRef = React.useRef(onAvailabilityChange);

  React.useEffect(() => {
    onAvailabilityChangeRef.current = onAvailabilityChange;
  }, [onAvailabilityChange]);

  React.useEffect(() => {
    if (!isOpen) {
      setIsRemoteLoading(true);
      setIsRemoteUnavailable(false);
      setIsFeatureUnavailable(false);
      return undefined;
    }

    let cancelled = false;
    onAvailabilityChangeRef.current?.({ status: 'checking' });
    setIsRemoteLoading(true);
    setIsRemoteUnavailable(false);
    setIsFeatureUnavailable(false);

    if (!areaAvailability.status) {
      setIsRemoteLoading(false);
      setIsFeatureUnavailable(true);
      onAvailabilityChangeRef.current?.({ status: 'unavailable', reason: 'feature-flag' });
      return undefined;
    }

    try {
      registerDataConnectHubRemote();
    } catch {
      setIsRemoteLoading(false);
      setIsRemoteUnavailable(true);
      onAvailabilityChangeRef.current?.({ status: 'unavailable', reason: 'remote' });
      return undefined;
    }

    loadRemote<{
      default: React.ComponentType<EmbeddableConnectionWizardProps>;
    }>(REMOTE_MODULE)
      .then((module) => {
        if (cancelled) {
          return;
        }
        const component = module?.default ?? null;
        setRemoteComponent(() => component);
        if (component) {
          setRemoteRenderSession((session) => session + 1);
        }
        setIsRemoteLoading(false);
        setIsRemoteUnavailable(!component);
        if (!component) {
          onAvailabilityChangeRef.current?.({ status: 'unavailable', reason: 'remote' });
        }
      })
      .catch(() => {
        if (cancelled) {
          return;
        }
        setIsRemoteLoading(false);
        setIsRemoteUnavailable(true);
        onAvailabilityChangeRef.current?.({ status: 'unavailable', reason: 'remote' });
      });

    return () => {
      cancelled = true;
    };
  }, [areaAvailability.status, isOpen]);

  if (!isOpen && !remoteComponent) {
    return null;
  }

  if (isOpen && isRemoteLoading && !remoteComponent) {
    return (
      <Tearsheet
        isOpen
        stackLevel={tearsheetStackLevel}
        onClose={() => onClose?.('cancelled')}
        onEscapePress={() => onClose?.('cancelled')}
        data-testid="connection-wizard-loading-tearsheet"
        modalProps={{ disableFocusTrap: true }}
      >
        <TearsheetHeader title="Create connection" />
        <TearsheetBody>
          <Bullseye>
            <Spinner
              aria-label="Loading connection wizard"
              data-testid="connection-wizard-loading"
            />
          </Bullseye>
        </TearsheetBody>
      </Tearsheet>
    );
  }

  if (isOpen && (isFeatureUnavailable || isRemoteUnavailable || !remoteComponent)) {
    return unavailableFallback ?? <ConnectionWizardUnavailableFallback />;
  }

  if (!remoteComponent) {
    return null;
  }

  const Wizard = remoteComponent;
  return (
    <RemoteConnectionWizardErrorBoundary
      isOpen={isOpen}
      resetSession={remoteRenderSession}
      unavailableFallback={unavailableFallback}
      onAvailabilityChange={onAvailabilityChange}
    >
      <Wizard
        isOpen={isOpen}
        namespace={namespace}
        tearsheetStackLevel={tearsheetStackLevel}
        unavailableFallback={unavailableFallback}
        onAvailabilityChange={onAvailabilityChange}
        onClose={onClose}
        {...wizardProps}
      />
    </RemoteConnectionWizardErrorBoundary>
  );
};

export default EmbeddableConnectionWizard;
