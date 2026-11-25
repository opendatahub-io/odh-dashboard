import React from 'react';
import { NotificationContextProvider } from 'mod-arch-core';
import { Alert, Bullseye, Spinner } from '@patternfly/react-core';
import { Tearsheet, TearsheetBody, TearsheetHeader } from '@patternfly/react-component-groups';
import { SupportedArea, useIsAreaAvailable } from '@odh-dashboard/plugin-core/areas';
import { useAccessReview } from '@odh-dashboard/plugin-core/host-api';
import { createConnection } from '~/app/api/dch';
import CreateConnectionWizard from '~/app/components/CreateConnectionWizard';
import ToastNotifications from '~/app/components/ToastNotifications';
import { EmbeddedConnectionWizardContext } from '~/app/context/EmbeddedConnectionWizardContext';
import type {
  ConnectionWizardAvailability,
  DchConnection,
  EmbeddableConnectionWizardProps,
} from '~/types';

const DATA_CONNECT_HUB_BACKEND_HEALTH = '/data-connect-hub/healthcheck/backend';

const checkBackendHealth = async (signal: AbortSignal): Promise<void> => {
  const response = await fetch(DATA_CONNECT_HUB_BACKEND_HEALTH, { signal });
  if (!response.ok) {
    throw new Error(`Connection backend health check failed with status ${response.status}`);
  }
};

/**
 * Federated public entry point for the connection wizard. The implementation
 * component is intentionally private to the DCH bundle.
 */
const EmbeddableConnectionWizardRemote: React.FC<EmbeddableConnectionWizardProps> = ({
  isOpen,
  namespace,
  initialConnectionTypeId,
  connectionTypeProviders,
  onCreated,
  onCreatedError,
  onClose,
  isNamespaceSelectable = false,
  enableCredentialVerification = true,
  unavailableFallback,
  onAvailabilityChange,
  tearsheetStackLevel,
}) => {
  const embeddedContextValue = React.useMemo(
    () => ({
      isEmbedded: true,
      isNamespaceSelectable,
      enableCredentialVerification,
      tearsheetStackLevel,
      connectionTypeProviders,
    }),
    [
      connectionTypeProviders,
      enableCredentialVerification,
      isNamespaceSelectable,
      tearsheetStackLevel,
    ],
  );
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
  const [isWizardReady, setIsWizardReady] = React.useState(false);
  const [availability, setAvailability] = React.useState<ConnectionWizardAvailability>({
    status: 'checking',
  });

  const invokeOnCreatedError = (error: unknown) => {
    try {
      void Promise.resolve(onCreatedError?.(error)).catch(() => undefined);
    } catch {
      return;
    }
  };

  const invokeOnCreated = (connection: DchConnection, selectedNamespace: string) => {
    try {
      Promise.resolve(onCreated?.(connection, selectedNamespace)).catch(invokeOnCreatedError);
    } catch (error) {
      invokeOnCreatedError(error);
    }
  };

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

    const checkAvailability = async (): Promise<'available' | 'backend'> => {
      try {
        await checkBackendHealth(abortController.signal);
      } catch {
        return 'backend';
      }

      return 'available';
    };

    void checkAvailability().then((result) => {
      if (cancelled) {
        return;
      }
      if (result === 'available') {
        setIsWizardReady(true);
        setAvailability({ status: 'available' });
      } else {
        setAvailability({ status: 'unavailable', reason: 'backend' });
      }
    });

    return () => {
      cancelled = true;
      abortController.abort();
    };
  }, [areaAvailability.status, canCreateConnection, createAccessLoaded, isOpen, namespace]);

  if (!isOpen && !isWizardReady) {
    return null;
  }

  if (isOpen && availability.status === 'checking' && !isWizardReady) {
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

  if (isOpen && availability.status === 'unavailable') {
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

  if (!isWizardReady) {
    return null;
  }

  return (
    <EmbeddedConnectionWizardContext.Provider value={embeddedContextValue}>
      <NotificationContextProvider>
        <CreateConnectionWizard
          isOpen={isOpen}
          namespace={namespace}
          onClose={(outcome) => onClose?.(outcome)}
          initialFormData={
            initialConnectionTypeId
              ? { data_connection_type_id: initialConnectionTypeId }
              : undefined
          }
          onCreate={async (data, selectedNamespace) => {
            const connection = await createConnection('')({}, selectedNamespace, data);
            invokeOnCreated(connection, selectedNamespace);
            return connection;
          }}
        />
        <ToastNotifications />
      </NotificationContextProvider>
    </EmbeddedConnectionWizardContext.Provider>
  );
};

export default EmbeddableConnectionWizardRemote;
