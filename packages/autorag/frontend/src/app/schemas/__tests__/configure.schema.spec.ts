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
    it('should accept display_name at max length (250 Unicode characters)', () => {
      const data = {
        display_name: 'a'.repeat(250),
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

      const result = schema.full.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should reject display_name exceeding max length (251 Unicode characters)', () => {
      const data = {
        display_name: 'a'.repeat(251),
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

      const result = schema.full.safeParse(data);
      expect(result.success).toBe(false);
      if (!result.success) {
        const paths = result.error.issues.map((i) => i.path.join('.'));
        expect(paths).toContain('display_name');
      }
    });

    it('should accept display_name with 250 emoji characters (proper Unicode counting)', () => {
      // 250 emojis = 250 Unicode code points
      // JavaScript .length would count this as 500 (each emoji is 2 UTF-16 code units)
      // Array.from().length correctly counts as 250 Unicode characters
      const data = {
        display_name: '😀'.repeat(250),
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

      const result = schema.full.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should reject display_name with 251 emoji characters', () => {
      const data = {
        display_name: '😀'.repeat(251),
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

      const result = schema.full.safeParse(data);
      expect(result.success).toBe(false);
      if (!result.success) {
        const paths = result.error.issues.map((i) => i.path.join('.'));
        expect(paths).toContain('display_name');
      }
    });

    it('should accept display_name with 250 multi-byte characters', () => {
      // The limit is character-based (MySQL varchar(256) counts characters, not bytes).
      // 250 × 'é' (U+00E9) = 250 characters but 500 bytes in UTF-8.
      const data = {
        display_name: '\u00e9'.repeat(250),
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

      const result = schema.full.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should reject display_name with 251 multi-byte characters', () => {
      const data = {
        display_name: '\u00e9'.repeat(251),
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

      const result = schema.full.safeParse(data);
      expect(result.success).toBe(false);
      if (!result.success) {
        const paths = result.error.issues.map((i) => i.path.join('.'));
        expect(paths).toContain('display_name');
      }
    });

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
