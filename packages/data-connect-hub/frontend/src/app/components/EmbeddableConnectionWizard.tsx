import React from 'react';
import { getInstance, init, loadRemote, registerRemotes } from '@module-federation/runtime';
import { Alert, Bullseye, Spinner } from '@patternfly/react-core';
import { Tearsheet, TearsheetBody, TearsheetHeader } from '@patternfly/react-component-groups';
import { SupportedArea, useIsAreaAvailable } from '@odh-dashboard/plugin-core/areas';
import { useAccessReview } from '@odh-dashboard/plugin-core/host-api';
import type {
  ConnectionWizardAvailability,
  EmbeddableConnectionWizardProps,
  EmbeddableCreateConnectionWizardProps,
} from '@odh-dashboard/data-connect-hub/types';

const DATA_CONNECT_HUB_ENTRY = '/_mf/dataConnectHub/remoteEntry.js';
const DATA_CONNECT_HUB_BACKEND_HEALTH = '/data-connect-hub/api/v1/backend-health';
const REMOTE_MODULE = 'dataConnectHub/EmbeddableCreateConnectionWizard';

let hasRegisteredRemote = false;

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

const checkBackendHealth = async (signal: AbortSignal): Promise<void> => {
  const response = await fetch(DATA_CONNECT_HUB_BACKEND_HEALTH, { signal });
  if (!response.ok) {
    throw new Error(`Connection backend health check failed with status ${response.status}`);
  }
};

const EmbeddableConnectionWizard: React.FC<EmbeddableConnectionWizardProps> = ({
  isOpen,
  namespace,
  unavailableFallback,
  onAvailabilityChange,
  tearsheetStackLevel,
  ...wizardProps
}) => {
  const areaAvailability = useIsAreaAvailable(SupportedArea.PLUGIN_DATA_CONNECT_HUB);
  const [canCreateConnection, createAccessLoaded] = useAccessReview(
    {
      group: 'dataconnecthub.opendatahub.io',
      resource: 'data-connections',
      verb: 'create',
      namespace,
    },
    Boolean(namespace && isOpen),
  );
  const [remoteComponent, setRemoteComponent] =
    React.useState<React.ComponentType<EmbeddableCreateConnectionWizardProps> | null>(null);
  const [availability, setAvailability] = React.useState<ConnectionWizardAvailability>({
    status: 'checking',
  });

  React.useEffect(() => {
    if (isOpen) {
      onAvailabilityChange?.(availability);
    }
  }, [availability, isOpen, onAvailabilityChange]);

  React.useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    let cancelled = false;
    const abortController = new AbortController();
    setAvailability({ status: 'checking' });

    if (!areaAvailability.status) {
      setAvailability({ status: 'unavailable', reason: 'feature-flag' });
      return undefined;
    }

    if (!createAccessLoaded) {
      return undefined;
    }
    if (!canCreateConnection) {
      setAvailability({ status: 'unavailable', reason: 'permissions' });
      return undefined;
    }

    try {
      registerDataConnectHubRemote();
    } catch {
      setAvailability({ status: 'unavailable', reason: 'remote' });
      return undefined;
    }

    const loadWizard = async (): Promise<'available' | 'remote' | 'backend'> => {
      const [remoteResult, healthResult] = await Promise.allSettled([
        loadRemote<{
          default: React.ComponentType<EmbeddableCreateConnectionWizardProps>;
        }>(REMOTE_MODULE),
        checkBackendHealth(abortController.signal),
      ]);

      if (cancelled) {
        return 'available';
      }
      if (remoteResult.status === 'rejected') {
        return 'remote';
      }
      if (healthResult.status === 'rejected') {
        return 'backend';
      }

      const component = remoteResult.value?.default;
      if (!component) {
        return 'remote';
      }
      setRemoteComponent(() => component);
      return 'available';
    };

    void loadWizard().then((result) => {
      if (cancelled) {
        return;
      }
      if (result === 'available') {
        setAvailability({ status: 'available' });
      } else {
        setRemoteComponent(null);
        setAvailability({ status: 'unavailable', reason: result });
      }
    });

    return () => {
      cancelled = true;
      abortController.abort();
    };
  }, [areaAvailability.status, canCreateConnection, createAccessLoaded, isOpen, namespace]);

  if (!isOpen && !remoteComponent) {
    return null;
  }

  if (isOpen && availability.status === 'checking') {
    return (
      <Tearsheet
        isOpen
        stackLevel={tearsheetStackLevel}
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

  if (isOpen && (availability.status === 'unavailable' || !remoteComponent)) {
    return (
      unavailableFallback ?? (
        <Alert
          variant="danger"
          isInline
          title="Connection wizard unavailable"
          data-testid="connection-wizard-unavailable"
        >
          The connection wizard is not available in this environment.
        </Alert>
      )
    );
  }

  if (!remoteComponent) {
    return null;
  }

  const Wizard = remoteComponent;
  return (
    <Wizard
      isOpen={isOpen}
      namespace={namespace}
      tearsheetStackLevel={tearsheetStackLevel}
      {...wizardProps}
    />
  );
};

export default EmbeddableConnectionWizard;
