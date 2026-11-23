import * as React from 'react';
import type { ConfigureSchema } from '~/app/schemas/configure.schema';
import { createConfigureSchema } from '~/app/schemas/configure.schema';
import type { ComponentStageMap } from '~/app/hooks/useComponentStageMap';
import type { PipelineRun } from '~/app/types';
import { DEFAULT_EVAL_METRIC_BY_TASK } from '~/app/utilities/const';
import { computeRankMap, getCompleteRankMap, getTaskType } from '~/app/utilities/utils';

const configureSchema = createConfigureSchema();

/* eslint-disable camelcase */
export type AutomlModel = {
  name: string;
  rank?: number;
  metrics_convention?: string;
  location: {
    model_directory: string;
    predictor: string;
    notebook: string;
    metrics?: string;
  };
  metrics: {
    test_data: Record<string, number>;
  };
};
/* eslint-enable camelcase */

export type AutomlResultsContextProps = {
  pipelineRun?: PipelineRun;
  pipelineRunLoading?: boolean;
  models: Record<string, AutomlModel>;
  modelsLoading?: boolean;
  modelsError?: boolean;
  modelsLoadError?: Error;
  onRetryModels?: () => Promise<void>;
  parameters?: Partial<ConfigureSchema>;
  modelsBasePath?: string;
  componentStageMap?: ComponentStageMap;
  componentStageMapLoading?: boolean;
  componentStageMapError?: boolean;
  /** Rank map keyed by the loaded model record key. */
  modelRankMap?: Record<string, number>;
  /** Record key with rank 1, when a rank exists. */
  rankOneModelKey?: string;
  /** Whether the rank map came from a complete backend artifact rank set. */
  modelRanksAuthoritative?: boolean;
};

export const AutomlResultsContext = React.createContext<AutomlResultsContextProps | undefined>(
  undefined,
);

export const useAutomlResultsContext = (): AutomlResultsContextProps => {
  const context = React.useContext(AutomlResultsContext);
  if (!context) {
    throw new Error('useAutomlResultsContext must be used within AutomlResultsContext.Provider');
  }
  return context;
};

export function getAutomlContext({
  pipelineRun,
  models = {},
  pipelineRunLoading,
  modelsLoading,
  modelsBasePath,
  modelsError,
  modelsLoadError,
  onRetryModels,
  componentStageMap,
  componentStageMapLoading,
  componentStageMapError,
}: {
  pipelineRun?: PipelineRun;
  models?: Record<string, AutomlModel>;
  pipelineRunLoading?: boolean;
  modelsLoading?: boolean;
  modelsBasePath?: string;
  modelsError?: boolean;
  modelsLoadError?: Error;
  onRetryModels?: () => Promise<void>;
  componentStageMap?: ComponentStageMap;
  componentStageMapLoading?: boolean;
  componentStageMapError?: boolean;
}): AutomlResultsContextProps {
  const inputParams = pipelineRun?.runtime_config?.parameters;

  // Validate runtime_config.parameters against ConfigureSchema to ensure type safety
  const baseSchema = configureSchema.base;
  const parseResult = baseSchema.partial().safeParse(inputParams ?? {});

  let parameters: Partial<ConfigureSchema> = {};
  if (parseResult.success) {
    parameters = parseResult.data;
    // eslint-disable-next-line camelcase
    parameters.task_type = getTaskType(pipelineRun) ?? 'timeseries';
  } else {
    // Fallback to default task_type even on parse failure
    // eslint-disable-next-line no-console, camelcase
    console.warn('Failed to parse pipeline runtime parameters:', parseResult.error);
    // eslint-disable-next-line camelcase
    parameters = { task_type: getTaskType(pipelineRun) ?? 'timeseries' };
  }

  // Populate eval_metric with the task-type default when missing from stored parameters
  // (e.g. runs created before the eval_metric feature, or when the default was used)
  if (parameters.eval_metric === undefined && parameters.task_type) {
    // eslint-disable-next-line camelcase
    parameters.eval_metric = DEFAULT_EVAL_METRIC_BY_TASK[parameters.task_type];
  }

  const modelRankMap = computeRankMap(models, parameters.task_type ?? '', parameters.eval_metric);
  const rankOneModelKey = Object.keys(modelRankMap).find((key) => modelRankMap[key] === 1);
  const modelRanksAuthoritative = getCompleteRankMap(models) !== undefined;

  return {
    pipelineRun,
    pipelineRunLoading,
    models,
    modelsLoading,
    modelsError,
    modelsLoadError,
    onRetryModels,
    parameters,
    modelsBasePath,
    componentStageMap,
    componentStageMapLoading,
    componentStageMapError,
    modelRankMap,
    rankOneModelKey,
    modelRanksAuthoritative,
  };
}
