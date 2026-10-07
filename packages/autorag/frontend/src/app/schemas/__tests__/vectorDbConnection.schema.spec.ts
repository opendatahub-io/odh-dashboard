import {
  parseVectorDbConnection,
  type VectorDbConnectionFields,
} from '~/app/schemas/vectorDbConnection.schema';

const validFields: Record<'milvus' | 'pgvector' | 'neo4j', VectorDbConnectionFields> = {
  milvus: { MILVUS_URI: ' https://milvus.example.com ' },
  pgvector: {
    PGVECTOR_HOST: ' host ',
    PGVECTOR_PORT: ' 5432 ',
    PGVECTOR_DB: ' db ',
    PGVECTOR_USER: ' user ',
    PGVECTOR_PASSWORD: ' password ',
  },
  neo4j: {
    NEO4J_URI: ' neo4j+s://neo4j.example.com:7687 ',
    NEO4J_PASSWORD: ' password ',
  },
};

describe('vector database connection schemas', () => {
  it('should accept and trim valid provider fields', () => {
    expect(parseVectorDbConnection('milvus', validFields.milvus)).toMatchObject({
      success: true,
      data: { MILVUS_URI: 'https://milvus.example.com' },
    });
    expect(parseVectorDbConnection('pgvector', validFields.pgvector)).toMatchObject({
      success: true,
      data: expect.objectContaining({ PGVECTOR_PORT: '5432' }),
    });
    expect(parseVectorDbConnection('neo4j', validFields.neo4j)).toMatchObject({
      success: true,
      data: { NEO4J_PASSWORD: 'password' },
    });
  });

  it.each([
    'neo4j://neo4j.example.com:7687',
    'neo4j+s://neo4j.example.com:7687',
    'bolt://neo4j.example.com:7687',
    'bolt+s://neo4j.example.com:7687',
  ])('should accept Neo4j URI %s', (uri) => {
    expect(
      parseVectorDbConnection('neo4j', { NEO4J_URI: uri, NEO4J_PASSWORD: 'password' }).success,
    ).toBe(true);
  });

  it('should require Neo4j password and reject invalid URI shapes', () => {
    expect(parseVectorDbConnection('neo4j', { NEO4J_URI: 'neo4j:///db' }).success).toBe(false);
    expect(
      parseVectorDbConnection('neo4j', {
        NEO4J_URI: 'neo4j://db.example.com',
        NEO4J_PASSWORD: 'password',
      }).success,
    ).toBe(true);
  });

  it.each(['http://milvus.example.com', 'https://milvus.example.com'])(
    'should accept Milvus URI %s with a hostname',
    (uri) => {
      expect(parseVectorDbConnection('milvus', { MILVUS_URI: uri }).success).toBe(true);
    },
  );

  it.each(['https:///', 'ftp://milvus.example.com', 'https://'])(
    'should reject Milvus URI %s',
    (uri) => {
      expect(parseVectorDbConnection('milvus', { MILVUS_URI: uri }).success).toBe(false);
    },
  );

  it.each(['0', '65536', '5432.5', ''])('should reject PGVector port %s', (port) => {
    expect(
      parseVectorDbConnection('pgvector', { ...validFields.pgvector, PGVECTOR_PORT: port }).success,
    ).toBe(false);
  });

  it('should omit empty optional fields and trim arbitrary CA text', () => {
    const result = parseVectorDbConnection('neo4j', {
      ...validFields.neo4j,
      NEO4J_USERNAME: '',
      NEO4J_DATABASE: '',
      NEO4J_CA_CERT: '  not PEM, but accepted  ',
    });
    expect(result).toMatchObject({
      success: true,
      data: { NEO4J_CA_CERT: 'not PEM, but accepted' },
    });
    if (result.success) {
      expect((result.data as VectorDbConnectionFields).NEO4J_USERNAME).toBeUndefined();
      expect((result.data as VectorDbConnectionFields).NEO4J_DATABASE).toBeUndefined();
    }
  });

  it.each([
    ['milvus', { ...validFields.milvus, MILVUS_CA_CERT: '   ' }],
    ['pgvector', { ...validFields.pgvector, PGVECTOR_CA_CERT: '\t' }],
    ['neo4j', { ...validFields.neo4j, NEO4J_CA_CERT: ' \n ' }],
  ] as const)('should reject whitespace-only %s CA values', (provider, fields) => {
    expect(parseVectorDbConnection(provider, fields).success).toBe(false);
  });
});
