/* eslint-disable camelcase */
import { createConfigureSchema } from '~/app/schemas/configure.schema';

describe('Configure Schema', () => {
  const schema = createConfigureSchema();

  describe('Default values', () => {
    it('should set llama_stack_vector_io_provider_id to empty string by default', () => {
      const { defaults } = schema;
      expect(defaults.llama_stack_vector_io_provider_id).toBe('');
    });
  });

  describe('Validation', () => {
    it('should reject empty llama_stack_vector_io_provider_id', () => {
      const data = {
        display_name: 'Test Run',
        input_data_secret_name: 'input-secret',
        input_data_bucket_name: 'input-bucket',
        input_data_key: 'input/data.csv',
        test_data_secret_name: 'test-secret',
        test_data_bucket_name: 'test-bucket',
        test_data_key: 'test/data.csv',
        llama_stack_secret_name: 'llama-secret',
        llama_stack_vector_io_provider_id: '',
        generation_models: ['gpt-4'],
        embeddings_models: ['text-embedding-3'],
        optimization_metric: 'faithfulness' as const,
        optimization_max_rag_patterns: 10,
      };

      const result = schema.full.safeParse(data);
      expect(result.success).toBe(false);
    });
  });

  describe('Transformers', () => {
    it('should keep llama_stack_vector_io_provider_id when set to a provider', () => {
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
        llama_stack_vector_io_provider_id: 'milvus',
        generation_models: ['gpt-4'],
        embeddings_models: ['text-embedding-3'],
        optimization_metric: 'faithfulness' as const,
        optimization_max_rag_patterns: 10,
      };

      const result = schema.full.parse(data);

      expect(result.llama_stack_vector_io_provider_id).toBe('milvus');
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
        llama_stack_vector_io_provider_id: 'milvus',
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
        llama_stack_vector_io_provider_id: 'milvus',
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
