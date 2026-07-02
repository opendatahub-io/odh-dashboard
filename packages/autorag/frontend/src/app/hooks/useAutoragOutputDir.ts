import type { PipelineRun } from '~/app/types';

type AutoragOutputDir = {
  rootDir: string;
  patternGenerationDir: string;
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars -- matches automl hook signature for consistency
export function useAutoragOutputDir(_pipelineRun?: PipelineRun): AutoragOutputDir {
  const rootDir = 'documents-rag-optimization-pipeline';
  const patternGenerationDir = 'rag-templates-optimization';
  return { rootDir, patternGenerationDir };
}
