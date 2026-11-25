import React from 'react';
import { NotificationContextProvider } from 'mod-arch-core';
import { createConnection } from '~/app/api/dch';
import CreateConnectionWizard from '~/app/components/CreateConnectionWizard';
import ToastNotifications from '~/app/components/ToastNotifications';
import { EmbeddedConnectionWizardContext } from '~/app/context/EmbeddedConnectionWizardContext';
import type {
  DchConnection,
  EmbeddableCreateConnectionWizardProps,
} from '~/types/embeddable-create-connection-wizard';

/**
 * Self-contained connection creation wizard for Module Federation consumers.
 * The wrapper owns creation, notifications, and embedded-mode behavior so the
 * host does not need the Data Connect Hub application shell.
 */
const EmbeddableCreateConnectionWizard: React.FC<EmbeddableCreateConnectionWizardProps> = ({
  isOpen,
  namespace,
  initialConnectionTypeId,
  connectionTypeProviders,
  onCreated,
  onCreatedError,
  onClose,
  isNamespaceSelectable = false,
  enableCredentialVerification = true,
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

export default EmbeddableCreateConnectionWizard;
