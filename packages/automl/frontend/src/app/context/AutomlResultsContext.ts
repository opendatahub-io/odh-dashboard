import * as React from 'react';
import type { PipelineRun } from '~/app/types';
import type { ConfigureSchema } from '~/app/schemas/configure.schema';
import { getBaseSchema } from '~/app/schemas/configure.schema';

// Based on the artifact schema from Model artitfact metadata.
// See https://github.com/LukaszCmielowski/pipelines-components/blob/rhoai_automl/pipelines/training/automl/autogluon_tabular_training_pipeline/README.md#model-artifact-metadata
export type AutomlModel = {
  display_name: string;
  model_config: {
    eval_metric: string;
    // time_limit: number;
  };
  location: {
    model_directory: string;
    predictor: string;
    notebook: string;
  };
  metrics: {
    test_data?: Record<string, unknown>;
  };
};

export type AutomlResultsContextProps = {
  pipelineRun?: PipelineRun;
  pipelineRunLoading?: boolean;
  models: Record<string, AutomlModel>;
  modelsLoading?: boolean;
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
}: {
  pipelineRun?: PipelineRun;
  models?: Record<string, AutomlModel>;
  pipelineRunLoading?: boolean;
  modelsLoading?: boolean;
}): AutomlResultsContextProps {
  const inputParams = pipelineRun?.runtime_config?.parameters;

  // Validate runtime_config.parameters against ConfigureSchema to ensure type safety
  const baseSchema = getBaseSchema();
  const parseResult = baseSchema.partial().safeParse(inputParams ?? {});

  let parameters: Partial<ConfigureSchema> = {};
  if (parseResult.success) {
    parameters = parseResult.data;
    // FYI default task_type to timeseries since it is the only task which will not have
    // this as an actual parameter passed to the pipeline
    // Check the original input, not the parsed result (which may have Zod defaults)
    const hasTaskType =
      inputParams && Object.prototype.hasOwnProperty.call(inputParams, 'task_type');
    if (!hasTaskType) {
      // eslint-disable-next-line camelcase
      parameters.task_type = 'timeseries';
    }
  } else {
    // Fallback to default task_type even on parse failure
    // eslint-disable-next-line no-console, camelcase
    console.warn('Failed to parse pipeline runtime parameters:', parseResult.error);
    // eslint-disable-next-line camelcase
    parameters = { task_type: 'timeseries' };
  }

  return {
    pipelineRun,
    pipelineRunLoading,
    models,
    modelsLoading,
    parameters,
  };
}
