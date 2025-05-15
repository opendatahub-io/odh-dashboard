import * as React from 'react';
import { Link } from 'react-router-dom';
import { PipelineRunKF, ExperimentKF } from '~/concepts/pipelines/kfTypes';
import useNotification from '~/utilities/useNotification';
import { experimentRoute } from '~/routes/pipelines/experiments';
import { usePipelinesAPI } from '~/concepts/pipelines/context';
import { PipelineResourceRestoreResult, StatusEntry } from '~/pages/pipelines/global/runs/types';
import { processExperimentResults, processRunResults } from '~/pages/pipelines/global/runs/utils';

type RestoreStatusesProps = {
  onClose: (restored: boolean) => void;
  selectedRuns: PipelineRunKF[];
  isSingleRestoring: boolean;
  archivedExperiments: ExperimentKF[];
};

const useRestoreStatuses = ({
  onClose,
  selectedRuns,
  isSingleRestoring,
  archivedExperiments,
}: RestoreStatusesProps): {
  onBeforeClose: (
    v: boolean,
    experimentResults?: PipelineResourceRestoreResult[],
    runResults?: PipelineResourceRestoreResult[],
  ) => void;
  failedRuns: PipelineRunKF[];
  isSubmitting: boolean;
  setIsSubmitting: React.Dispatch<React.SetStateAction<boolean>>;
  setRunStatuses: React.Dispatch<React.SetStateAction<StatusEntry<PipelineRunKF>[]>>;
  setExperimentStatuses: React.Dispatch<React.SetStateAction<StatusEntry<ExperimentKF>[]>>;
  failedExperiments: ExperimentKF[];
  error: React.ReactNode | undefined;
  setError: React.Dispatch<React.SetStateAction<React.ReactNode | undefined>>;
  runStatuses: StatusEntry<PipelineRunKF>[];
  experimentStatuses: StatusEntry<ExperimentKF>[];
  abortSignal: AbortSignal;
} => {
  const notification = useNotification();
  const [failedRuns, setFailedRuns] = React.useState<PipelineRunKF[]>([]);
  const [failedExperiments, setFailedExperiments] = React.useState<ExperimentKF[]>([]);
  const { namespace } = usePipelinesAPI();
  const [error, setError] = React.useState<React.ReactNode>();
  const [runStatuses, setRunStatuses] = React.useState<StatusEntry<PipelineRunKF>[]>([]);
  const [experimentStatuses, setExperimentStatuses] = React.useState<StatusEntry<ExperimentKF>[]>(
    [],
  );
  const [isSubmitting, setIsSubmitting] = React.useState<boolean>(false);
  const abortControllerRef = React.useRef(new AbortController());

  const onBeforeCloseRef = React.useRef<
    (
      v: boolean,
      experimentResults?: PipelineResourceRestoreResult[],
      runResults?: PipelineResourceRestoreResult[],
    ) => void
  >(() => undefined);

  onBeforeCloseRef.current = (
    restoreComplete: boolean,
    experimentResults: PipelineResourceRestoreResult[] = [],
    runResults: PipelineResourceRestoreResult[] = [],
  ) => {
    const experimentProcessedResults = processExperimentResults(
      experimentResults,
      archivedExperiments,
    );

    const runProcessedResults = processRunResults(runResults, selectedRuns);

    setExperimentStatuses(experimentProcessedResults.itemStatusesResult);
    setRunStatuses(runProcessedResults.itemStatusesResult);

    setFailedExperiments(experimentProcessedResults.failedItemsResult);
    setFailedRuns(runProcessedResults.failedItemsResult);

    if (!restoreComplete || runProcessedResults.failedItemsResult.length === 0) {
      abortControllerRef.current.abort();
      if (experimentProcessedResults.successfulItemsResult.length > 0) {
        const link = isSingleRestoring ? (
          <Link
            to={experimentRoute(
              namespace,
              experimentProcessedResults.successfulItemsResult[0].experiment_id,
            )}
          >
            View experiment details
          </Link>
        ) : (
          <Link to={experimentRoute(namespace, undefined)}>View experiments table list</Link>
        );
        notification.success(
          `${
            isSingleRestoring
              ? `${experimentProcessedResults.successfulItemsResult[0].display_name} experiment restored`
              : `${experimentProcessedResults.successfulItemsResult.length} associated experiments restored`
          }`,
          link,
        );
      }

      //handle failed runs alerts
      if (runProcessedResults.failedItemsResult.length > 0) {
        notification.error(
          isSingleRestoring
            ? `Failed to restore the ${runProcessedResults.failedItemsResult[0].display_name} run.`
            : `Failed to restore runs: ${runProcessedResults.failedItemsResult
                .map((run) => run.display_name)
                .join(',')} could not be restored.`,
        );
      }

      if (runProcessedResults.successfulItemsResult.length > 0) {
        notification.success(
          isSingleRestoring
            ? `${runProcessedResults.successfulItemsResult[0].display_name} run restored`
            : `${runProcessedResults.successfulItemsResult.length} runs restored`,
        );
      }

      onClose(runProcessedResults.successfulItemsResult.length > 0 ? true : restoreComplete);
      setIsSubmitting(false);
      setError(undefined);
      setExperimentStatuses([]);
      setRunStatuses([]);
      abortControllerRef.current = new AbortController();
    } else {
      const firstFailedRun = runProcessedResults.failedItemsResult[0];
      const firstArchivedExperiment = archivedExperiments[0];

      let errorMessage;
      if (isSingleRestoring) {
        if (experimentProcessedResults.failedItemsResult.length === 0) {
          errorMessage = (
            <>
              The <strong>{firstFailedRun.display_name}</strong> run could not be restored, but its
              associated <strong>{firstArchivedExperiment.display_name}</strong> experiment was
              restored. Try again.
            </>
          );
        } else {
          errorMessage = (
            <>
              The <strong>{firstFailedRun.display_name}</strong> run could not be restored. Try
              again.
            </>
          );
        }
      } else {
        errorMessage = (
          <>
            Failed to restore runs:{' '}
            <strong>
              {runProcessedResults.failedItemsResult.map((run) => run.display_name).join(', ')}
            </strong>{' '}
            cannot be restored. Try again.
          </>
        );
      }
      setError(errorMessage);
      setIsSubmitting(false);
    }
  };

  return {
    onBeforeClose: onBeforeCloseRef.current,
    failedRuns,
    failedExperiments,
    error,
    isSubmitting,
    setExperimentStatuses,
    setRunStatuses,
    setIsSubmitting,
    setError,
    runStatuses,
    experimentStatuses,
    abortSignal: abortControllerRef.current.signal,
  };
};

export default useRestoreStatuses;
