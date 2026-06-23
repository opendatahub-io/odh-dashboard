import type { PipelineRun } from '~/app/types';
import { useAutoragOutputDir } from '~/app/hooks/useAutoragOutputDir';

/* eslint-disable camelcase */
describe('useAutoragOutputDir', () => {
  it('should return fixed rootDir and patternGenerationDir', () => {
    const result = useAutoragOutputDir();

    expect(result).toEqual({
      rootDir: 'documents-rag-optimization-pipeline',
      patternGenerationDir: 'rag-templates-optimization',
    });
  });

  it('should return the same dirs regardless of pipelineRun', () => {
    const pipelineRun = {
      run_id: 'run-123',
      display_name: 'Test Run',
      state: 'SUCCEEDED',
      created_at: '2025-01-17T00:00:00Z',
    } as PipelineRun;

    const result = useAutoragOutputDir(pipelineRun);

    expect(result).toEqual({
      rootDir: 'documents-rag-optimization-pipeline',
      patternGenerationDir: 'rag-templates-optimization',
    });
  });
});
