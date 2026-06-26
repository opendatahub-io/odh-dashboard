import type { PipelineRun } from '~/app/types';
import { isTabularRun } from '~/app/utilities/utils';

type AutomlOutputDir = {
  rootDir: string;
  modelGenerationDir: string;
  isTabular: boolean;
};

export function useAutomlOutputDir(pipelineRun?: PipelineRun): AutomlOutputDir {
  const isTabular = isTabularRun(pipelineRun);
  const rootDir = isTabular
    ? 'autogluon-tabular-training-pipeline'
    : 'autogluon-timeseries-training-pipeline';
  const modelGenerationDir = isTabular
    ? 'autogluon-models-training'
    : 'autogluon-timeseries-models-training';
  return { rootDir, modelGenerationDir, isTabular };
}
