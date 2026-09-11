import {
  buildVectorDbStringData,
  isValidHttpUrl,
  isValidPostgresPort,
  isVectorDbFormValid,
} from '~/app/utilities/vectorDbSecret';

describe('isValidHttpUrl', () => {
  it('should accept http and https URLs', () => {
    expect(isValidHttpUrl('http://milvus:19530')).toBe(true);
    expect(isValidHttpUrl('https://milvus.example.com')).toBe(true);
  });

  it('should reject empty, non-http, and invalid values', () => {
    expect(isValidHttpUrl('')).toBe(false);
    expect(isValidHttpUrl('ftp://milvus')).toBe(false);
    expect(isValidHttpUrl('not-a-url')).toBe(false);
  });
});

describe('isValidPostgresPort', () => {
  it('should accept ports from 1 to 65535', () => {
    expect(isValidPostgresPort('1')).toBe(true);
    expect(isValidPostgresPort('5432')).toBe(true);
    expect(isValidPostgresPort('65535')).toBe(true);
  });

  it('should reject empty, non-numeric, and out-of-range values', () => {
    expect(isValidPostgresPort('')).toBe(false);
    expect(isValidPostgresPort('0')).toBe(false);
    expect(isValidPostgresPort('65536')).toBe(false);
    expect(isValidPostgresPort('54.32')).toBe(false);
    expect(isValidPostgresPort('abc')).toBe(false);
  });
});

describe('buildVectorDbStringData', () => {
  it('should include required Milvus URI and omit empty optional keys', () => {
    expect(
      buildVectorDbStringData({
        backend: 'milvus',
        fields: { uri: ' http://milvus:19530 ', token: '  ', serverCert: '' },
      }),
    ).toEqual({ MILVUS_URI: 'http://milvus:19530' });
  });

  it('should include optional Milvus token and certificate when set', () => {
    expect(
      buildVectorDbStringData({
        backend: 'milvus',
        fields: {
          uri: 'https://milvus.example.com',
          token: 'secret-token',
          serverCert: '-----BEGIN CERTIFICATE-----',
        },
      }),
    ).toEqual({
      MILVUS_URI: 'https://milvus.example.com',
      MILVUS_TOKEN: 'secret-token',
      MILVUS_SERVER_CERT: '-----BEGIN CERTIFICATE-----',
    });
  });

  it('should include all PGVector keys', () => {
    expect(
      buildVectorDbStringData({
        backend: 'pgvector',
        fields: {
          host: ' pg.example.com ',
          port: '5432',
          database: 'testdb',
          user: 'testuser',
          password: 'testpassword',
        },
      }),
    ).toEqual({
      PGVECTOR_HOST: 'pg.example.com',
      PGVECTOR_PORT: '5432',
      PGVECTOR_DB: 'testdb',
      PGVECTOR_USER: 'testuser',
      PGVECTOR_PASSWORD: 'testpassword',
    });
  });
});

describe('isVectorDbFormValid', () => {
  it('should require a valid Milvus URI', () => {
    expect(isVectorDbFormValid({ backend: 'milvus', fields: { uri: 'http://milvus:19530' } })).toBe(
      true,
    );
    expect(isVectorDbFormValid({ backend: 'milvus', fields: { uri: 'bad' } })).toBe(false);
  });

  it('should require all PGVector fields and a valid port', () => {
    const fields = {
      host: 'pg',
      port: '5432',
      database: 'db',
      user: 'user',
      password: 'pass',
    };
    expect(isVectorDbFormValid({ backend: 'pgvector', fields })).toBe(true);
    expect(isVectorDbFormValid({ backend: 'pgvector', fields: { ...fields, host: '' } })).toBe(
      false,
    );
    expect(isVectorDbFormValid({ backend: 'pgvector', fields: { ...fields, port: '0' } })).toBe(
      false,
    );
    expect(isVectorDbFormValid({ backend: 'pgvector', fields: { ...fields, password: '' } })).toBe(
      false,
    );
  });
});
