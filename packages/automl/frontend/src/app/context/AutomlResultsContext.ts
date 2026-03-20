import * as React from 'react';
import type { PipelineRun } from '~/app/types';
import type { ConfigureSchema } from '~/app/schemas/configure.schema';

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
    test_data: Record<string, unknown>;
  };
};

export type AutomlResultsContextProps = {
  pipelineRun?: PipelineRun;
  pipelineRunLoading?: boolean;
  models: Record<string, AutomlModel>;
  modelsLoading?: boolean;
  parameters?: Partial<ConfigureSchema>;
};

// eslint-disable-next-line @typescript-eslint/consistent-type-assertions
export const AutomlResultsContext = React.createContext({} as AutomlResultsContextProps);

export const useAutomlResultsContext = (): AutomlResultsContextProps =>
  React.useContext(AutomlResultsContext);

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
  return {
    pipelineRun,
    pipelineRunLoading,
    models,
    modelsLoading,
    parameters: {
      ...pipelineRun?.runtime_config?.parameters,
      // FYI default task_type to timeseries since it is the only task which will not have
      // this as an actual parameter passed to the pipeline
      // eslint-disable-next-line camelcase
      task_type: pipelineRun?.runtime_config?.parameters?.task_type ?? 'timeseries',
    },
  };
}
