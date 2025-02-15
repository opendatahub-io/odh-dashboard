import { ExperimentKF, PipelineRunKF } from '~/concepts/pipelines/kfTypes';
import { ExperimentStatus, PipelineResourceRestoreResult, RunStatus } from './types';

export const getGroupRunsByExperiment = (
  selectedRuns: PipelineRunKF[],
  experiments: ExperimentKF[],
): { run: PipelineRunKF[]; experiment: ExperimentKF }[] =>
  selectedRuns.reduce((acc: { run: PipelineRunKF[]; experiment: ExperimentKF }[], selectedRun) => {
    const selectedExperiment = experiments.find(
      (e) => e.experiment_id === selectedRun.experiment_id,
    );

    if (!selectedExperiment) {
      return acc;
    }

    const group = acc.find((g) => g.experiment.experiment_id === selectedExperiment.experiment_id);

    if (group) {
      group.run.push(selectedRun);
    } else {
      acc.push({ experiment: selectedExperiment, run: [selectedRun] });
    }

    return acc;
  }, []);

export const processExperimentResults = (
  experimentResults: PipelineResourceRestoreResult[],
  archivedExperiments: ExperimentKF[],
): {
  failedExperimentsResult: ExperimentKF[];
  successfulExperimentsResult: ExperimentKF[];
  experimentStatusesResult: ExperimentStatus[];
} =>
  experimentResults.reduce(
    (
      acc: {
        failedExperimentsResult: ExperimentKF[];
        successfulExperimentsResult: ExperimentKF[];
        experimentStatusesResult: ExperimentStatus[];
      },
      res,
      i,
    ) => {
      const status = res;
      const experiment = archivedExperiments[i];
      const statusEntry = { experiment, status };

      acc.experimentStatusesResult.push(statusEntry);

      if (status instanceof Error) {
        acc.failedExperimentsResult.push(experiment);
      }
      if (status === true) {
        acc.successfulExperimentsResult.push(experiment);
      }

      return acc;
    },
    { failedExperimentsResult: [], successfulExperimentsResult: [], experimentStatusesResult: [] },
  );

export const processRunResults = (
  runResults: PipelineResourceRestoreResult[],
  selectedRuns: PipelineRunKF[],
): {
  failedRunsResult: PipelineRunKF[];
  successfulRunsResult: PipelineRunKF[];
  runStatusesResult: RunStatus[];
} =>
  runResults.reduce(
    (
      acc: {
        failedRunsResult: PipelineRunKF[];
        successfulRunsResult: PipelineRunKF[];
        runStatusesResult: RunStatus[];
      },
      res,
      i,
    ) => {
      const status = res;
      const run = selectedRuns[i];
      const statusEntry = { run, status };

      acc.runStatusesResult.push(statusEntry);

      if (status instanceof Error) {
        acc.failedRunsResult.push(run);
      }

      if (status === true) {
        acc.successfulRunsResult.push(run);
      }

      return acc;
    },
    { failedRunsResult: [], successfulRunsResult: [], runStatusesResult: [] },
  );
