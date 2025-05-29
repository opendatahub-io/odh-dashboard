import { ExperimentKF, PipelineRunKF } from '#~/concepts/pipelines/kfTypes';
import { PipelineResourceRestoreResult, StatusEntry } from './types';

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

const processResults = <T>(
  results: PipelineResourceRestoreResult[],
  items: T[],
): {
  failedItemsResult: T[];
  successfulItemsResult: T[];
  itemStatusesResult: StatusEntry<T>[];
} =>
  results.reduce(
    (
      acc: {
        failedItemsResult: T[];
        successfulItemsResult: T[];
        itemStatusesResult: StatusEntry<T>[];
      },
      res,
      i,
    ) => {
      const item = items[i];
      const statusEntry: StatusEntry<T> = { item, status: res };

      acc.itemStatusesResult.push(statusEntry);

      if (res instanceof Error) {
        acc.failedItemsResult.push(item);
      } else if (res === true) {
        acc.successfulItemsResult.push(item);
      }

      return acc;
    },
    { failedItemsResult: [], successfulItemsResult: [], itemStatusesResult: [] },
  );

// Use the generic processResults for experiments and runs
export const processExperimentResults = (
  experimentResults: PipelineResourceRestoreResult[],
  archivedExperiments: ExperimentKF[],
): {
  failedItemsResult: ExperimentKF[];
  successfulItemsResult: ExperimentKF[];
  itemStatusesResult: StatusEntry<ExperimentKF>[];
} => processResults(experimentResults, archivedExperiments);

export const processRunResults = (
  runResults: PipelineResourceRestoreResult[],
  selectedRuns: PipelineRunKF[],
): {
  failedItemsResult: PipelineRunKF[];
  successfulItemsResult: PipelineRunKF[];
  itemStatusesResult: StatusEntry<PipelineRunKF>[];
} => processResults(runResults, selectedRuns);
