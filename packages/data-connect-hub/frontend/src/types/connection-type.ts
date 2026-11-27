export type ConnectionTypeEnumValue = {
  label: string;
  value: string;
};

export type ConnectionTypeCredentialField = {
  name: string;
  label: string;
  description?: string | null;
  required: boolean;
  type: string;
  enum_values?: ConnectionTypeEnumValue[] | null;
  default_value?: string | null;
};

export type ConnectionType = {
  metadata: {
    id: string;
    tenant_id?: string;
    created_at: string;
    updated_at: string;
  };
  resource: {
    name: string;
    provider: string;
    description?: string | null;
    credentials_fields: ConnectionTypeCredentialField[];
    tags?: string[] | null;
  };
  status?: {
    flight_ready: boolean;
    flight_url?: string;
    message?: string;
    updated_at?: string;
  };
};
