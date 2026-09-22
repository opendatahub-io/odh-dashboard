import type { ConnectionType } from '~/app/types';

type ConnectionTypeOverrides = Omit<Partial<ConnectionType>, 'metadata' | 'resource'> & {
  metadata?: Partial<ConnectionType['metadata']>;
  resource?: Partial<ConnectionType['resource']>;
};

export const mockConnectionType = (overrides: ConnectionTypeOverrides = {}): ConnectionType => ({
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
    capabilities: {
      flight: false,
      rest: true,
    },
  },
});
