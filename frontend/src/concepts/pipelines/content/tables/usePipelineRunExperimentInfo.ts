import * as React from 'react';
import { ExperimentKF, PipelineRecurringRunKF, PipelineRunKF } from '#~/concepts/pipelines/kfTypes';
import { PipelineRunExperimentsContext } from '#~/pages/pipelines/global/runs/PipelineRunExperimentsContext';

const usePipelineRunExperimentInfo = (
  run: PipelineRunKF | PipelineRecurringRunKF | null,
): {
  experiment: ExperimentKF | undefined;
  loaded: boolean;
  error: Error | undefined;
} => {
  const { experiments, loaded, error } = React.useContext(PipelineRunExperimentsContext);
  const experiment = experiments.find((e) => e.experiment_id === run?.experiment_id);

  return { experiment, loaded, error };
};

export default usePipelineRunExperimentInfo;
