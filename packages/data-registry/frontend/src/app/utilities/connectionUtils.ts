import { ConnectionRef } from '~/app/types';

export const getConnectionIdentifier = (ref: ConnectionRef): string =>
  ref.type === 'dch' ? ref.id : ref.secret_name;

export const getConnectionKey = (ref: ConnectionRef): string =>
  `${ref.type}:${getConnectionIdentifier(ref)}`;

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
