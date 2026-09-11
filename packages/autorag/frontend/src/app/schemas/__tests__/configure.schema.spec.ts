/* eslint-disable camelcase */
import { createConfigureSchema } from '~/app/schemas/configure.schema';

describe('Configure Schema', () => {
  const schema = createConfigureSchema();

  const validData = {
    display_name: 'Test Run',
    input_data_secret_name: 'input-secret',
    input_data_bucket_name: 'input-bucket',
    input_data_keys: ['input/data.csv'],
    test_data_secret_name: 'test-secret',
    test_data_bucket_name: 'test-bucket',
    test_data_key: 'test/data.csv',
    maas_secret_name: 'maas-secret',
    vector_db_secret_name: 'vector-db-secret',
    generation_models: ['gpt-4'],
    embedding_models: ['text-embedding-3'],
    optimization_metric: 'faithfulness' as const,
    optimization_max_rag_patterns: 10,
  };

  it('should use canonical defaults', () => {
    expect(schema.defaults.input_data_keys).toEqual([]);
    expect(schema.defaults.maas_secret_name).toBe('');
    expect(schema.defaults.vector_db_secret_name).toBe('');
    expect(schema.defaults).not.toHaveProperty('input_data_key');
    expect(schema.defaults).not.toHaveProperty('ogx_secret_name');
    expect(schema.defaults).not.toHaveProperty('vector_io_provider_id');
  });

  it('should accept canonical connection and corpus fields', () => {
    expect(schema.full.safeParse(validData).success).toBe(true);
  });

  it('should reject missing canonical connection fields', () => {
    const result = schema.full.safeParse({
      ...validData,
      maas_secret_name: '',
      vector_db_secret_name: '',
    });
    expect(result.success).toBe(false);
  });

  it('should retain multiple canonical corpus locations for restored runs', () => {
    const result = schema.full.safeParse({
      ...validData,
      input_data_keys: ['input/a.pdf', 'input/b.pdf'],
    });
    expect(result.success).toBe(true);
  });
});
