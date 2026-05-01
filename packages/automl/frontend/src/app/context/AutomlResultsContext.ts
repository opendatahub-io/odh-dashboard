import * as React from 'react';
import type { ConfigureSchema } from '~/app/schemas/configure.schema';
import { createConfigureSchema } from '~/app/schemas/configure.schema';
import type { PipelineRun } from '~/app/types';
import { getTaskType } from '~/app/utilities/utils';

const configureSchema = createConfigureSchema();

/* eslint-disable camelcase */
export type AutomlModel = {
  name: string;
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
  onRetryModels?: () => void;
  parameters?: Partial<ConfigureSchema>;
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
  modelsError,
  modelsLoadError,
  onRetryModels,
}: {
  pipelineRun?: PipelineRun;
  models?: Record<string, AutomlModel>;
  pipelineRunLoading?: boolean;
  modelsLoading?: boolean;
  modelsError?: boolean;
  modelsLoadError?: Error;
  onRetryModels?: () => void;
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

  return {
    pipelineRun,
    pipelineRunLoading,
    models,
    modelsLoading,
    modelsError,
    modelsLoadError,
    onRetryModels,
    parameters,
  };
}
