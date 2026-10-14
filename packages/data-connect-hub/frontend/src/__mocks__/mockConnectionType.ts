import type { ConnectionType } from '~/app/types';
import { ConnectionTypeInstance } from '~/app/components/ConnectionType';

type ConnectionTypeOverrides = Omit<Partial<ConnectionType>, 'metadata' | 'resource'> & {
  metadata?: Partial<ConnectionType['metadata']>;
  resource?: Partial<ConnectionType['resource']>;
};

export const mockConnectionType = (
  overrides: ConnectionTypeOverrides = {},
): ConnectionTypeInstance =>
  new ConnectionTypeInstance({
    metadata: {
      id: 'postgresql',
      tenant_id: 'test-project',
      created_at: '2026-09-08T16:00:00Z',
      updated_at: '2026-09-09T16:00:00Z',
      ...overrides.metadata,
    },
    resource: {
      name: 'PostgreSQL',
      provider: 'postgresql',
      description: 'Connect to a PostgreSQL database.',
      credentials_fields: [],
      ...overrides.resource,
    },
    status: overrides.status ?? {
      flight_ready: true,
      flight_url: 'https://dch-default-dataconnectservice-flight.redhat-ods-applications.svc:8443',
      updated_at: '2026-09-08T16:00:00Z',
    },
  });
