export type VectorDbBackend = 'milvus' | 'pgvector';

export type MilvusSecretFields = {
  uri: string;
  token?: string;
  serverCert?: string;
};

export type PgVectorSecretFields = {
  host: string;
  port: string;
  database: string;
  user: string;
  password: string;
};

export type VectorDbSecretInput =
  | { backend: 'milvus'; fields: MilvusSecretFields }
  | { backend: 'pgvector'; fields: PgVectorSecretFields };

export const isValidHttpUrl = (url: string): boolean => {
  try {
    const parsed = new URL(url.trim());
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
};

export const isValidPostgresPort = (port: string): boolean => {
  const trimmed = port.trim();
  if (!/^\d+$/.test(trimmed)) {
    return false;
  }
  const value = Number(trimmed);
  return value >= 1 && value <= 65535;
};

export const buildVectorDbStringData = (input: VectorDbSecretInput): Record<string, string> => {
  if (input.backend === 'milvus') {
    const data: Record<string, string> = {
      MILVUS_URI: input.fields.uri.trim(),
    };
    const token = input.fields.token?.trim();
    if (token) {
      data.MILVUS_TOKEN = token;
    }
    const cert = input.fields.serverCert?.trim();
    if (cert) {
      data.MILVUS_SERVER_CERT = cert;
    }
    return data;
  }

  return {
    PGVECTOR_HOST: input.fields.host.trim(),
    PGVECTOR_PORT: input.fields.port.trim(),
    PGVECTOR_DB: input.fields.database.trim(),
    PGVECTOR_USER: input.fields.user.trim(),
    PGVECTOR_PASSWORD: input.fields.password.trim(),
  };
};

export const isVectorDbFormValid = (input: VectorDbSecretInput): boolean => {
  if (input.backend === 'milvus') {
    return isValidHttpUrl(input.fields.uri);
  }
  return (
    input.fields.host.trim() !== '' &&
    isValidPostgresPort(input.fields.port) &&
    input.fields.database.trim() !== '' &&
    input.fields.user.trim() !== '' &&
    input.fields.password.trim() !== ''
  );
};
