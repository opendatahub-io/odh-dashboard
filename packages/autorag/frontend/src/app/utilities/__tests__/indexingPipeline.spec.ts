/* eslint-disable camelcase -- BFF indexing pipeline request uses snake_case field names */
import {
  buildIndexingPipelineRunRequest,
  defaultIndexingRunName,
  patternHasIndexingPipelineSpec,
} from '~/app/utilities/indexingPipeline';
import type { AutoragPattern } from '~/app/types/autoragPattern';

const basePattern = {
  name: 'Pattern_1',
  iteration: 1,
  max_combinations: 10,
  duration_seconds: 1,
  settings: {
    chunking: {
      method: 'recursive',
      chunk_size: 512,
      chunk_overlap: 50,
    },
    embedding: {
      model_id: 'embedding-model',
      embedding_params: {
        embedding_dimension: 768,
      },
    },
    retrieval: {
      method: 'dense',
      number_of_chunks: 5,
    },
    generation: {
      model_id: 'generation-model',
    },
  },
  evaluation: {
    metrics: [],
  },
} as unknown as AutoragPattern;

const patternWithSpec: AutoragPattern = {
  ...basePattern,
  indexing: {
    pipeline_spec: {
      pipeline_name: 'documents-indexing-pipeline',
      parameters: {
        embedding_model_id: 'embedding-model',
        input_data_secret_name: 'data-connection',
        input_data_bucket_name: 'bucket',
        input_data_key: 'docs/',
        ogx_secret_name: 'ogx',
        vector_io_provider_id: 'milvus',
        chunk_size: 512,
        chunk_overlap: 50,
        chunking_method: 'recursive',
      },
      overrides_allowed: ['chunk_size'],
    },
  },
};

describe('indexingPipeline utilities', () => {
  it('builds a default run name from the pattern and source AutoRAG run', () => {
    expect(defaultIndexingRunName('Pattern1', 'My AutoRAG Run')).toBe(
      'Index build - My AutoRAG Run - Pattern\u00a01',
    );
  });

  it('falls back to pattern-only default when source run name is missing', () => {
    expect(defaultIndexingRunName('Pattern1')).toBe('Index build - Pattern\u00a01');
    expect(defaultIndexingRunName('Pattern1', '   ')).toBe('Index build - Pattern\u00a01');
  });

  it('truncates default run names that exceed the API max length', () => {
    const longRunName = 'r'.repeat(300);
    const name = defaultIndexingRunName('Pattern1', longRunName);
    expect(Array.from(name).length).toBe(250);
    expect(name.startsWith('Index build - ')).toBe(true);
  });

  it('rejects run names longer than the display name limit', () => {
    const result = buildIndexingPipelineRunRequest(patternWithSpec, 'x'.repeat(251));
    expect(result).toEqual({
      error: 'Run name must be at most 250 characters.',
    });
  });

  it('rejects descriptions longer than the description limit', () => {
    const result = buildIndexingPipelineRunRequest(
      patternWithSpec,
      'My indexing run',
      'd'.repeat(256),
    );
    expect(result).toEqual({
      error: 'Description must be at most 255 characters.',
    });
  });

  it('detects patterns with indexing.pipeline_spec parameters', () => {
    expect(patternHasIndexingPipelineSpec(patternWithSpec)).toBe(true);
    expect(patternHasIndexingPipelineSpec(basePattern)).toBe(false);
  });

  it('maps indexing.pipeline_spec.parameters into the create request', () => {
    const result = buildIndexingPipelineRunRequest(patternWithSpec, 'My indexing run');

    expect(result).toEqual({
      display_name: 'My indexing run',
      parameters: patternWithSpec.indexing?.pipeline_spec?.parameters,
    });
  });

  it('includes an optional description when provided', () => {
    const result = buildIndexingPipelineRunRequest(
      patternWithSpec,
      'My indexing run',
      '  Build index for production  ',
    );

    expect(result).toEqual({
      display_name: 'My indexing run',
      description: 'Build index for production',
      parameters: patternWithSpec.indexing?.pipeline_spec?.parameters,
    });
  });

  it('returns an error when indexing.pipeline_spec is missing', () => {
    const result = buildIndexingPipelineRunRequest(basePattern, 'My indexing run');
    expect(result).toEqual({
      error:
        'This pattern does not include indexing.pipeline_spec parameters needed to run the indexing pipeline.',
    });
  });
});
