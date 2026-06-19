/* eslint-disable camelcase */
import {
  createConfigureSchema,
  SUPPORTED_VECTOR_STORE_PROVIDER_TYPES,
} from '~/app/schemas/configure.schema';

describe('Configure Schema', () => {
  const schema = createConfigureSchema();

  describe('Supported vector store providers', () => {
    it('should allow remote Milvus and PGVector provider types', () => {
      expect(SUPPORTED_VECTOR_STORE_PROVIDER_TYPES).toEqual(['remote::milvus', 'remote::pgvector']);
    });

    it('should include remote::pgvector and exclude unsupported types', () => {
      expect(SUPPORTED_VECTOR_STORE_PROVIDER_TYPES).toContain('remote::pgvector');
      expect(SUPPORTED_VECTOR_STORE_PROVIDER_TYPES).toContain('remote::milvus');
      expect(SUPPORTED_VECTOR_STORE_PROVIDER_TYPES).not.toContain('inline::bm25');
      expect(SUPPORTED_VECTOR_STORE_PROVIDER_TYPES).not.toContain('remote::unsupported');
    });
  });

  describe('Default values', () => {
    it('should set vector_io_provider_id to empty string by default', () => {
      const { defaults } = schema;
      expect(defaults.vector_io_provider_id).toBe('');
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
        ogx_secret_name: 'ogx-secret',
        vector_io_provider_id: 'milvus',
        generation_models: ['gpt-4'],
        embedding_models: ['text-embedding-3'],
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
        ogx_secret_name: 'ogx-secret',
        vector_io_provider_id: 'milvus',
        generation_models: ['gpt-4'],
        embedding_models: ['text-embedding-3'],
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
        ogx_secret_name: 'ogx-secret',
        vector_io_provider_id: 'milvus',
        generation_models: ['gpt-4'],
        embedding_models: ['text-embedding-3'],
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
        ogx_secret_name: 'ogx-secret',
        vector_io_provider_id: 'milvus',
        generation_models: ['gpt-4'],
        embedding_models: ['text-embedding-3'],
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
        ogx_secret_name: 'ogx-secret',
        vector_io_provider_id: 'milvus',
        generation_models: ['gpt-4'],
        embedding_models: ['text-embedding-3'],
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
        ogx_secret_name: 'ogx-secret',
        vector_io_provider_id: 'milvus',
        generation_models: ['gpt-4'],
        embedding_models: ['text-embedding-3'],
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

    it('should accept description at max length (255 Unicode characters)', () => {
      const data = {
        display_name: 'Test Run',
        description: 'a'.repeat(255),
        input_data_secret_name: 'input-secret',
        input_data_bucket_name: 'input-bucket',
        input_data_key: 'input/data.csv',
        test_data_secret_name: 'test-secret',
        test_data_bucket_name: 'test-bucket',
        test_data_key: 'test/data.csv',
        ogx_secret_name: 'ogx-secret',
        vector_io_provider_id: 'milvus',
        generation_models: ['gpt-4'],
        embedding_models: ['text-embedding-3'],
        optimization_metric: 'faithfulness' as const,
        optimization_max_rag_patterns: 10,
      };

      const result = schema.full.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should reject description exceeding max length (256 Unicode characters)', () => {
      const data = {
        display_name: 'Test Run',
        description: 'a'.repeat(256),
        input_data_secret_name: 'input-secret',
        input_data_bucket_name: 'input-bucket',
        input_data_key: 'input/data.csv',
        test_data_secret_name: 'test-secret',
        test_data_bucket_name: 'test-bucket',
        test_data_key: 'test/data.csv',
        ogx_secret_name: 'ogx-secret',
        vector_io_provider_id: 'milvus',
        generation_models: ['gpt-4'],
        embedding_models: ['text-embedding-3'],
        optimization_metric: 'faithfulness' as const,
        optimization_max_rag_patterns: 10,
      };

      const result = schema.full.safeParse(data);
      expect(result.success).toBe(false);
      if (!result.success) {
        const paths = result.error.issues.map((i) => i.path.join('.'));
        expect(paths).toContain('description');
      }
    });

    it('should accept description with 255 emoji characters (proper Unicode counting)', () => {
      const data = {
        display_name: 'Test Run',
        description: '😀'.repeat(255),
        input_data_secret_name: 'input-secret',
        input_data_bucket_name: 'input-bucket',
        input_data_key: 'input/data.csv',
        test_data_secret_name: 'test-secret',
        test_data_bucket_name: 'test-bucket',
        test_data_key: 'test/data.csv',
        ogx_secret_name: 'ogx-secret',
        vector_io_provider_id: 'milvus',
        generation_models: ['gpt-4'],
        embedding_models: ['text-embedding-3'],
        optimization_metric: 'faithfulness' as const,
        optimization_max_rag_patterns: 10,
      };

      const result = schema.full.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should reject description with 256 emoji characters', () => {
      const data = {
        display_name: 'Test Run',
        description: '😀'.repeat(256),
        input_data_secret_name: 'input-secret',
        input_data_bucket_name: 'input-bucket',
        input_data_key: 'input/data.csv',
        test_data_secret_name: 'test-secret',
        test_data_bucket_name: 'test-bucket',
        test_data_key: 'test/data.csv',
        ogx_secret_name: 'ogx-secret',
        vector_io_provider_id: 'milvus',
        generation_models: ['gpt-4'],
        embedding_models: ['text-embedding-3'],
        optimization_metric: 'faithfulness' as const,
        optimization_max_rag_patterns: 10,
      };

      const result = schema.full.safeParse(data);
      expect(result.success).toBe(false);
      if (!result.success) {
        const paths = result.error.issues.map((i) => i.path.join('.'));
        expect(paths).toContain('description');
      }
    });

    it('should reject empty vector_io_provider_id', () => {
      const data = {
        display_name: 'Test Run',
        input_data_secret_name: 'input-secret',
        input_data_bucket_name: 'input-bucket',
        input_data_key: 'input/data.csv',
        test_data_secret_name: 'test-secret',
        test_data_bucket_name: 'test-bucket',
        test_data_key: 'test/data.csv',
        ogx_secret_name: 'ogx-secret',
        vector_io_provider_id: '',
        generation_models: ['gpt-4'],
        embedding_models: ['text-embedding-3'],
        optimization_metric: 'faithfulness' as const,
        optimization_max_rag_patterns: 10,
      };

      const result = schema.full.safeParse(data);
      expect(result.success).toBe(false);
    });
  });

  describe('Transformers', () => {
    it('should keep vector_io_provider_id when set to a provider', () => {
      const data = {
        display_name: 'Test Run',
        description: 'Test description',
        input_data_secret_name: 'input-secret',
        input_data_bucket_name: 'input-bucket',
        input_data_key: 'input/data.csv',
        test_data_secret_name: 'test-secret',
        test_data_bucket_name: 'test-bucket',
        test_data_key: 'test/data.csv',
        ogx_secret_name: 'ogx-secret',
        vector_io_provider_id: 'milvus',
        generation_models: ['gpt-4'],
        embedding_models: ['text-embedding-3'],
        optimization_metric: 'faithfulness' as const,
        optimization_max_rag_patterns: 10,
      };

      const result = schema.full.parse(data);

      expect(result.vector_io_provider_id).toBe('milvus');
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
        ogx_secret_name: 'ogx-secret',
        vector_io_provider_id: 'milvus',
        generation_models: ['gpt-4'],
        embedding_models: ['text-embedding-3'],
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
        ogx_secret_name: 'ogx-secret',
        vector_io_provider_id: 'milvus',
        generation_models: ['gpt-4'],
        embedding_models: ['text-embedding-3'],
        optimization_metric: 'faithfulness' as const,
        optimization_max_rag_patterns: 10,
      };

      const result = schema.full.parse(data);

      expect(result.description).toBe('Test description');
    });
  });
});
