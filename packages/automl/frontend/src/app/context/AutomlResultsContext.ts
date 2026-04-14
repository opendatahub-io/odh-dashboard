import * as React from 'react';
import type { ConfigureSchema } from '~/app/schemas/configure.schema';
import { createConfigureSchema } from '~/app/schemas/configure.schema';
import type { PipelineRun } from '~/app/types';

const configureSchema = createConfigureSchema();

// Normalized model types after rewriting relative S3 paths to absolute paths.
// Tabular and timeseries models have different shapes; downstream code should
// use the `AutomlModel` union and narrow via `isTimeseriesModel()` when needed.

export type AutomlTabularModel = {
  name: string;
  location: {
    model_directory: string;
    predictor: string;
    notebook: string;
  };
  metrics: {
    test_data: Record<string, number>;
  };
};

export type AutomlTimeseriesModel = {
  name: string;
  base_model: string;
  location: {
    model_directory: string;
    predictor: string;
    notebook: string;
    metrics: string;
  };
  metrics: {
    test_data: Record<string, number>;
  };
};

export type AutomlModel = AutomlTabularModel | AutomlTimeseriesModel;

export const isTimeseriesModel = (model: AutomlModel): model is AutomlTimeseriesModel =>
  'base_model' in model;

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
  const baseSchema = configureSchema.base;
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
