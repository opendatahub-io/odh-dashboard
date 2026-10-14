import { ConnectionModel, ConnectionRef, ConnectionWarning } from '~/app/types';

export const CONNECTION_UNAVAILABLE_LABEL = 'Connection unavailable';
export const CONNECTION_LOADING_LABEL = 'Loading connection...';

export const getConnectionIdentifier = (ref: ConnectionRef): string =>
  ref.type === 'dch' ? ref.id : ref.secret_name;

export const getConnectionKey = (ref: ConnectionRef): string =>
  `${ref.type}:${getConnectionIdentifier(ref)}`;

export const getConnectionName = (
  connectionRef?: ConnectionRef | string | null,
): string | undefined => {
  if (!connectionRef) {
    return undefined;
  }
  if (typeof connectionRef === 'string') {
    return connectionRef;
  }
  return getConnectionIdentifier(connectionRef);
};

const isConnectionRef = (value: ConnectionRef | string): value is ConnectionRef =>
  typeof value !== 'string';

export const getConnectionDisplayName = (
  connectionRef: ConnectionRef | string | null | undefined,
  connections: ConnectionModel[] = [],
  connectionsLoaded = true,
  connectionsError?: Error,
): string => {
  if (!connectionRef) {
    return '';
  }

  const connection = isConnectionRef(connectionRef)
    ? connections.find(
        (candidate) => getConnectionKey(candidate) === getConnectionKey(connectionRef),
      )
    : connections.find(
        (candidate) =>
          getConnectionKey(candidate) === connectionRef ||
          getConnectionIdentifier(candidate) === connectionRef,
      );

  if (connection?.name) {
    return connection.name;
  }
  return connectionsLoaded || connectionsError
    ? CONNECTION_UNAVAILABLE_LABEL
    : CONNECTION_LOADING_LABEL;
};

export const getConnectionDisplayNameForIdentifier = (
  identifier: string,
  connections: ConnectionModel[],
  connectionsLoaded: boolean,
  connectionsError?: Error,
): string => getConnectionDisplayName(identifier, connections, connectionsLoaded, connectionsError);

export const shouldDisplayConnectionWarning = (
  warning: ConnectionWarning,
  hasSavedDchReference: boolean,
  hasSavedRhaiReference: boolean,
): boolean => {
  if (warning.code === 'DCH_FALLBACK') {
    return hasSavedDchReference;
  }
  if (warning.code === 'RHAI_LOOKUP_FAILED') {
    return hasSavedRhaiReference;
  }
  return true;
};

export const getAssetDetailConnectionWarnings = (
  warnings: ConnectionWarning[],
  connectionRef?: ConnectionRef | null,
): ConnectionWarning[] =>
  warnings
    .filter((warning) =>
      shouldDisplayConnectionWarning(
        warning,
        connectionRef?.type === 'dch',
        connectionRef?.type === 'rhai',
      ),
    )
    .map((warning) =>
      warning.code === 'DCH_FALLBACK'
        ? { ...warning, message: "Couldn't load connections from Data Connect Hub." }
        : warning,
    );

// Explicitly allowlist persistent fields. Never spread a lookup result into an asset write.
export const toConnectionRef = (ref: ConnectionRef): ConnectionRef =>
  ref.type === 'dch'
    ? { type: 'dch', id: ref.id }
    : // eslint-disable-next-line camelcase
      { type: 'rhai', secret_name: ref.secret_name };

export const confirmConnection = async (
  key: string,
  refresh: () => Promise<ConnectionRef[]>,
): Promise<ConnectionRef> => {
  const connections = await refresh();
  const selected = connections.find((connection) => getConnectionKey(connection) === key);
  if (!selected) {
    throw new Error(
      'The selected connection could not be confirmed. Select an available connection and try again.',
    );
  }
  return toConnectionRef(selected);
};
