import type { ReactNode } from 'react';
import type { Connection } from './connection';
import type { ConnectionType } from './connection-type';

export type DchConnection = Connection;

export type DchConnectionType = ConnectionType;

/**
 * Props for the embeddable connection creation wizard exposed by the
 * data-connect-hub Module Federation remote.
 */
export type EmbeddableConnectionWizardProps = {
  /** Whether the wizard is open. */
  isOpen: boolean;
  /** Namespace in which the connection is created. */
  namespace: string;
  /** Initial connection type selected by the host. */
  initialConnectionTypeId?: string;
  /** Restricts the connection type gallery to these DCH providers, such as 's3'. */
  connectionTypeProviders?: ConnectionTypeProviders;
  /**
   * Called after the Data Connect Hub BFF successfully creates a connection.
   * This is an event callback; the wizard does not wait for returned work.
   */
  onCreated?: (connection: DchConnection, namespace: string) => void | Promise<void>;
  /** Called when the onCreated callback throws or returns a rejected promise. */
  onCreatedError?: (error: unknown) => void;
  /** Called when the wizard closes after creation or is cancelled by the user. */
  onClose?: (outcome: ConnectionWizardCloseOutcome) => void;
  /** Whether the user can select a different project. Defaults to false. */
  isNamespaceSelectable?: boolean;
  /**
   * Whether credential verification is shown for flight-ready connection
   * types. Defaults to true. Verification is disabled unless the user has
   * permission to create data connections in the selected namespace.
   */
  enableCredentialVerification?: boolean;
  /** Stacking level used when the wizard renders above other tearsheets. */
  tearsheetStackLevel?: number;
  /** Rendered instead of the wizard when DCH is unavailable. */
  unavailableFallback?: ReactNode;
  /** Receives the current wizard availability state. */
  onAvailabilityChange?: (availability: ConnectionWizardAvailability) => void;
};

export type ConnectionWizardCloseOutcome = 'created' | 'cancelled';

export type ConnectionTypeProviders = [string, ...string[]];

export type ConnectionWizardAvailability =
  | { status: 'checking' }
  | { status: 'available' }
  | {
      status: 'unavailable';
      reason: 'feature-flag' | 'remote' | 'backend' | 'permissions';
    };
