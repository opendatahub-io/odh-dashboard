/* eslint-disable camelcase */
import type { PipelineRun } from '~/app/types';
import { normalizePipelineRun } from '~/app/utilities/pipelineRunUtils';

const makeRun = (parameters: Record<string, unknown>): PipelineRun =>
  ({
    run_id: 'r1',
    runtime_config: { parameters },
  }) as unknown as PipelineRun;

describe('normalizePipelineRun', () => {
  it('should rename llama_stack_vector_io_provider_id to vector_io_provider_id', () => {
    const run = makeRun({ llama_stack_vector_io_provider_id: 'milvus' });
    const result = normalizePipelineRun(run);
    expect(result.runtime_config?.parameters).toEqual({ vector_io_provider_id: 'milvus' });
  });

  it('should rename embeddings_models to embedding_models', () => {
    const run = makeRun({ embeddings_models: '["model-a"]' });
    const result = normalizePipelineRun(run);
    expect(result.runtime_config?.parameters).toEqual({ embedding_models: '["model-a"]' });
  });

  it('should rename llama_stack_secret_name to ogx_secret_name', () => {
    const run = makeRun({ llama_stack_secret_name: 'my-secret' });
    const result = normalizePipelineRun(run);
    expect(result.runtime_config?.parameters).toEqual({ ogx_secret_name: 'my-secret' });
  });

  it('should rename all legacy keys in a single run', () => {
    const run = makeRun({
      llama_stack_vector_io_provider_id: 'milvus',
      llama_stack_secret_name: 'my-secret',
      embeddings_models: '["m"]',
      display_name: 'test',
    });
    const result = normalizePipelineRun(run);
    expect(result.runtime_config?.parameters).toEqual({
      vector_io_provider_id: 'milvus',
      ogx_secret_name: 'my-secret',
      embedding_models: '["m"]',
      display_name: 'test',
    });
  });

  it('should return the same object when no legacy keys are present', () => {
    const run = makeRun({ vector_io_provider_id: 'milvus', ogx_secret_name: 'sec' });
    const result = normalizePipelineRun(run);
    expect(result).toBe(run);
  });

  it('should return the same object when runtime_config has no parameters', () => {
    const run = { run_id: 'r1', runtime_config: {} } as unknown as PipelineRun;
    const result = normalizePipelineRun(run);
    expect(result).toBe(run);
  });

  it('should return the same object when runtime_config is undefined', () => {
    const run = { run_id: 'r1' } as unknown as PipelineRun;
    const result = normalizePipelineRun(run);
    expect(result).toBe(run);
  });

  it('should prefer canonical key value when both old and new are present', () => {
    const run = makeRun({
      llama_stack_secret_name: 'old-secret',
      ogx_secret_name: 'new-secret',
    });
    const result = normalizePipelineRun(run);
    expect(result.runtime_config?.parameters).toEqual({ ogx_secret_name: 'new-secret' });
  });

  it('should prefer canonical key value regardless of iteration order', () => {
    const run = makeRun({
      ogx_secret_name: 'new-secret',
      llama_stack_secret_name: 'old-secret',
    });
    const result = normalizePipelineRun(run);
    expect(result.runtime_config?.parameters).toEqual({ ogx_secret_name: 'new-secret' });
  });
});
