import type { ConnectionType } from '~/types/connection-type';

export type Connection = {
  metadata: {
    id: string;
    tenant_id?: string;
    created_at?: string;
    updated_at?: string;
  };
  resource: {
    name: string;
    description?: string | null;
    data_connection_type_id: string;
    data_connection_type?: ConnectionType;
    format: 'tabular' | 'binary';
    credentials_ref: { secret: string };
    properties?: Record<string, string>;
  };
  status: {
    state: 'ready' | 'ingestion_not_ready' | 'not_ready';
    message?: string;
    updated_at?: string;
  };
};
