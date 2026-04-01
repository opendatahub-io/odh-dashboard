/* eslint-disable camelcase */
import { createConfigureSchema, DEFAULT_IN_MEMORY_PROVIDER } from '~/app/schemas/configure.schema';

describe('Configure Schema', () => {
  const schema = createConfigureSchema();

  describe('Default values', () => {
    it('should set llama_stack_vector_database_id to default in-memory provider', () => {
      const { defaults } = schema;
      expect(defaults.llama_stack_vector_database_id).toBe(
        `ls_${DEFAULT_IN_MEMORY_PROVIDER.provider_id}`,
      );
    });
  });

  describe('Transformers', () => {
    it('should remove llama_stack_vector_database_id when set to default in-memory provider', () => {
      const data = {
        display_name: 'Test Run',
        description: 'Test description',
        input_data_secret_name: 'input-secret',
        input_data_bucket_name: 'input-bucket',
        input_data_key: 'input/data.csv',
        test_data_secret_name: 'test-secret',
        test_data_bucket_name: 'test-bucket',
        test_data_key: 'test/data.csv',
        llama_stack_secret_name: 'llama-secret',
        llama_stack_vector_database_id: `ls_${DEFAULT_IN_MEMORY_PROVIDER.provider_id}`,
        generation_models: ['gpt-4'],
        embeddings_models: ['text-embedding-3'],
        optimization_metric: 'faithfulness' as const,
        optimization_max_rag_patterns: 10,
      };

      const result = schema.full.parse(data);

      expect(result).not.toHaveProperty('llama_stack_vector_database_id');
    });

    it('should remove llama_stack_vector_database_id when empty', () => {
      const data = {
        display_name: 'Test Run',
        description: 'Test description',
        input_data_secret_name: 'input-secret',
        input_data_bucket_name: 'input-bucket',
        input_data_key: 'input/data.csv',
        test_data_secret_name: 'test-secret',
        test_data_bucket_name: 'test-bucket',
        test_data_key: 'test/data.csv',
        llama_stack_secret_name: 'llama-secret',
        llama_stack_vector_database_id: '',
        generation_models: ['gpt-4'],
        embeddings_models: ['text-embedding-3'],
        optimization_metric: 'faithfulness' as const,
        optimization_max_rag_patterns: 10,
      };

      const result = schema.full.parse(data);

      expect(result).not.toHaveProperty('llama_stack_vector_database_id');
    });

    it('should keep llama_stack_vector_database_id when set to non-default provider', () => {
      const data = {
        display_name: 'Test Run',
        description: 'Test description',
        input_data_secret_name: 'input-secret',
        input_data_bucket_name: 'input-bucket',
        input_data_key: 'input/data.csv',
        test_data_secret_name: 'test-secret',
        test_data_bucket_name: 'test-bucket',
        test_data_key: 'test/data.csv',
        llama_stack_secret_name: 'llama-secret',
        llama_stack_vector_database_id: 'ls_milvus',
        generation_models: ['gpt-4'],
        embeddings_models: ['text-embedding-3'],
        optimization_metric: 'faithfulness' as const,
        optimization_max_rag_patterns: 10,
      };

      const result = schema.full.parse(data);

      expect(result.llama_stack_vector_database_id).toBe('ls_milvus');
    });

    it('should remove empty description', () => {
      const data = {
        display_name: 'Test Run',
        description: '',
        input_data_secret_name: 'input-secret',
        input_data_bucket_name: 'input-bucket',
        input_data_key: 'input/data.csv',
        test_data_secret_name: 'test-secret',
        test_data_bucket_name: 'test-bucket',
        test_data_key: 'test/data.csv',
        llama_stack_secret_name: 'llama-secret',
        llama_stack_vector_database_id: 'ls_milvus',
        generation_models: ['gpt-4'],
        embeddings_models: ['text-embedding-3'],
        optimization_metric: 'faithfulness' as const,
        optimization_max_rag_patterns: 10,
      };

      const result = schema.full.parse(data);

      expect(result).not.toHaveProperty('description');
    });

    it('should keep non-empty description', () => {
      const data = {
        display_name: 'Test Run',
        description: 'Test description',
        input_data_secret_name: 'input-secret',
        input_data_bucket_name: 'input-bucket',
        input_data_key: 'input/data.csv',
        test_data_secret_name: 'test-secret',
        test_data_bucket_name: 'test-bucket',
        test_data_key: 'test/data.csv',
        llama_stack_secret_name: 'llama-secret',
        llama_stack_vector_database_id: 'ls_milvus',
        generation_models: ['gpt-4'],
        embeddings_models: ['text-embedding-3'],
        optimization_metric: 'faithfulness' as const,
        optimization_max_rag_patterns: 10,
      };

      const result = schema.full.parse(data);

      expect(result.description).toBe('Test description');
    });
  });
});
