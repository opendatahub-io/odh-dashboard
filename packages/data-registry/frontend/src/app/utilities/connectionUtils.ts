import { ConnectionModel, ConnectionRef } from '~/app/types';

export const getConnectionName = (
  connectionRef?: ConnectionRef | string | null,
): string | undefined => {
  if (!connectionRef) {
    return undefined;
  }

  if (typeof connectionRef === 'string') {
    return connectionRef;
  }

  return connectionRef.type === 'rhai' ? connectionRef.secret_name : connectionRef.id;
};

export const getConnectionDisplayName = (
  connectionRef: ConnectionRef | string | null | undefined,
  connections: ConnectionModel[] = [],
): string => {
  const connectionName = getConnectionName(connectionRef);
  if (!connectionName) {
    return '';
  }

  const connection = connections.find(({ name }) => name === connectionName);
  return connection?.displayName || connection?.name || connectionName;
};
